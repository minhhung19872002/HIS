using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 8 (2026-05-30): tach 9 region RIS catalog admin (DICOM Viewer + Room & Schedule +
// Print Label + Diagnosis Templates + Abbreviations + QR Code + Duty Schedule + Room Assignment
// + Tags, ~1126 dong) khoi RISCompleteService.cs. ZERO runtime change — partial class.
public partial class RISCompleteService
{
    #region QR Code

    public async Task<QRCodeResultDto> GenerateQRCodeAsync(GenerateQRCodeRequestDto request)
    {
        var order = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == request.OrderId);

        if (order == null) return null;

        var qrData = request.QRType switch
        {
            "PATIENT_INFO" => $"PATIENT|{order.Patient.PatientCode}|{order.Patient.FullName}",
            "ORDER_INFO" => $"ORDER|{order.RequestCode}|{order.Patient.PatientCode}",
            "RESULT_SHARE" => $"SHARE|{order.Id}|{Guid.NewGuid():N}",
            "DICOM_LINK" => $"DICOM|{order.Id}",
            _ => $"HIS|{order.RequestCode}"
        };

        // Generate QR Code (simplified - in production use QRCoder library)
        var qrCodeBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(qrData));

        return new QRCodeResultDto
        {
            OrderId = request.OrderId,
            QRType = request.QRType,
            QRCodeBase64 = qrCodeBase64,
            QRCodeUrl = $"/api/RISComplete/qrcode/{request.OrderId}",
            EncodedData = qrData,
            GeneratedAt = DateTime.Now,
            ExpiresAt = request.ValidityHours.HasValue ? DateTime.Now.AddHours(request.ValidityHours.Value) : null
        };
    }

    public async Task<ScanQRCodeResultDto> ScanQRCodeAsync(string qrData)
    {
        var result = new ScanQRCodeResultDto { Success = false };

        var parts = qrData.Split('|');
        if (parts.Length < 2)
        {
            result.ErrorMessage = "Invalid QR code format";
            return result;
        }

        switch (parts[0])
        {
            case "PATIENT":
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == parts[1]);
                if (patient != null)
                {
                    result.Success = true;
                    result.QRType = "PATIENT_INFO";
                    result.PatientId = patient.Id;
                    result.PatientCode = patient.PatientCode;
                    result.PatientName = patient.FullName;
                }
                break;
            case "ORDER":
                var order = await _context.RadiologyRequests
                    .Include(r => r.Patient)
                    .FirstOrDefaultAsync(r => r.RequestCode == parts[1]);
                if (order != null)
                {
                    result.Success = true;
                    result.QRType = "ORDER_INFO";
                    result.OrderId = order.Id;
                    result.OrderCode = order.RequestCode;
                    result.PatientId = order.PatientId;
                    result.PatientCode = order.Patient.PatientCode;
                    result.PatientName = order.Patient.FullName;
                }
                break;
            case "SHARE":
                if (Guid.TryParse(parts[1], out var shareOrderId))
                {
                    result.Success = true;
                    result.QRType = "RESULT_SHARE";
                    result.OrderId = shareOrderId;
                    result.ResultShareUrl = $"/api/RISComplete/shared-result/{parts[2]}";
                }
                break;
        }

        return result;
    }

    /// <summary>Số lần nhập sai mã truy cập trước khi khoá link, và thời gian khoá.</summary>
    private const int ShareMaxFailedAttempts = 5;
    private static readonly TimeSpan ShareLockDuration = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Băm mã truy cập kèm muối là chính mã chia sẻ, để hai link cùng mã truy cập không ra cùng băm.
    /// </summary>
    private static string HashAccessCode(string accessCode, string shareCode)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes($"{accessCode}|{shareCode}"));
        return Convert.ToHexString(bytes);
    }

    /// <summary>
    /// Tạo link chia sẻ một kết quả CĐHA cho người bệnh (QR + mã truy cập).
    ///
    /// <para>#218/T3 — trước đây hàm này sinh mã chia sẻ và mã truy cập rồi **không lưu cái nào**.
    /// Người bệnh cầm mã QR về, quét lên, và nó không mở được gì; ở đầu kia
    /// <see cref="GetSharedResultAsync"/> cũng không có gì để đối chiếu nên bỏ qua luôn cả hai tham
    /// số. Nay ghi xuống `RadiologyResultShares` (migration 180).</para>
    ///
    /// <para>Ba điểm khác bản cũ: mã chia sẻ dài 32 ký tự sinh bằng <c>RandomNumberGenerator</c> thay
    /// vì 8 ký tự đầu của một Guid; mã truy cập sinh bằng nguồn ngẫu nhiên mật mã thay vì
    /// <c>new Random()</c>; và mã truy cập **chỉ lưu dạng băm** — ai đọc được bảng thì cũng mở được
    /// mọi kết quả đang chia sẻ.</para>
    /// </summary>
    public async Task<ShareResultQRDto> CreateShareResultQRAsync(Guid resultId, int? validityHours = 24)
    {
        var report = await _context.RadiologyReports
            .FirstOrDefaultAsync(r => r.Id == resultId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy kết quả chẩn đoán hình ảnh để chia sẻ");

        var gio = validityHours ?? 24;
        if (gio < 1 || gio > 24 * 30)
            throw new InvalidOperationException("Hạn chia sẻ phải từ 1 giờ đến 30 ngày.");

        var shareCode = Convert.ToHexString(
            System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));
        var accessCode = System.Security.Cryptography.RandomNumberGenerator
            .GetInt32(0, 1_000_000).ToString("D6");

        var now = DateTime.Now;
        var share = new RadiologyResultShare
        {
            Id = Guid.NewGuid(),
            ShareCode = shareCode,
            AccessCodeHash = HashAccessCode(accessCode, shareCode),
            RadiologyReportId = report.Id,
            ExpiresAt = now.AddHours(gio),
            IsRevoked = false,
            CreatedAt = now,
        };
        _context.RadiologyResultShares.Add(share);
        await _context.SaveChangesAsync();

        return new ShareResultQRDto
        {
            ResultId = resultId,
            ShareUrl = $"/api/RISComplete/shared-result/{shareCode}",
            QRCodeBase64 = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($"SHARE|{resultId}|{shareCode}")),
            ExpiresAt = share.ExpiresAt,
            // Bản rõ chỉ xuất hiện đúng một lần, ở đây, để đưa cho người bệnh. DB chỉ giữ băm.
            AccessCode = accessCode,
        };
    }

    /// <summary>
    /// Người bệnh mở link chia sẻ. Endpoint gọi hàm này là **`[AllowAnonymous]`**.
    ///
    /// <para>#218/T3 — bản cũ **bỏ qua cả `shareCode` lẫn `accessCode`** và trả một DTO dựng sẵn
    /// (<c>Description = "Shared result - implement validation"</c>). Nói cho công bằng thì nó chưa
    /// rò rỉ dữ liệu nào, vì DTO ấy rỗng. Cái nguy là chỗ này để sẵn **một cửa không cần đăng nhập,
    /// đứng đúng nơi kết quả người bệnh sẽ chảy qua, với phần kiểm tra chưa cài** — người nối nó vào
    /// dữ liệu thật mà quên cài kiểm tra sẽ mở kết quả của mọi người bệnh cho bất kỳ ai gọi.</para>
    ///
    /// <para>Thông báo lỗi cố ý **giống hệt nhau** cho mọi lý do từ chối (không có mã, sai mã, hết
    /// hạn, đã thu hồi): đây là cửa ẩn danh, phân biệt được lý do là phân biệt được mã nào có thật.</para>
    /// </summary>
    public async Task<RadiologyResultDto> GetSharedResultAsync(string shareCode, string accessCode)
    {
        const string tuChoi = "Link chia sẻ không hợp lệ, đã hết hạn hoặc mã truy cập không đúng.";

        if (string.IsNullOrWhiteSpace(shareCode) || string.IsNullOrWhiteSpace(accessCode))
            throw new KeyNotFoundException(tuChoi);

        var ma = shareCode.Trim();
        var share = await _context.RadiologyResultShares
            .FirstOrDefaultAsync(s => s.ShareCode == ma && !s.IsDeleted);
        if (share == null)
            throw new KeyNotFoundException(tuChoi);

        var now = DateTime.Now;
        if (share.IsRevoked || share.ExpiresAt < now)
            throw new KeyNotFoundException(tuChoi);
        if (share.LockedUntil.HasValue && share.LockedUntil.Value > now)
            throw new KeyNotFoundException(tuChoi);

        // So sánh theo thời gian cố định: so chuỗi thường rò rỉ độ dài tiền tố khớp.
        var dung = System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(share.AccessCodeHash),
            System.Text.Encoding.UTF8.GetBytes(HashAccessCode(accessCode.Trim(), share.ShareCode)));

        if (!dung)
        {
            share.FailedAttempts++;
            if (share.FailedAttempts >= ShareMaxFailedAttempts)
                share.LockedUntil = now.Add(ShareLockDuration);
            share.UpdatedAt = now;
            await _context.SaveChangesAsync();
            throw new KeyNotFoundException(tuChoi);
        }

        var report = await _context.RadiologyReports
            .Include(r => r.Radiologist)
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Patient)
            .Include(r => r.RadiologyExam).ThenInclude(e => e.RadiologyRequest).ThenInclude(q => q.Service)
            .FirstOrDefaultAsync(r => r.Id == share.RadiologyReportId && !r.IsDeleted);
        if (report == null)
            throw new KeyNotFoundException(tuChoi);

        // Mở được thì xoá bộ đếm sai và ghi lại dấu vết truy cập.
        share.FailedAttempts = 0;
        share.LockedUntil = null;
        share.AccessCount++;
        share.LastAccessedAt = now;
        share.UpdatedAt = now;
        await _context.SaveChangesAsync();

        var req = report.RadiologyExam?.RadiologyRequest;
        return new RadiologyResultDto
        {
            Id = report.Id,
            OrderItemId = report.RadiologyExamId,
            OrderCode = req?.RequestCode ?? string.Empty,
            PatientId = req?.PatientId ?? Guid.Empty,
            PatientCode = req?.Patient?.PatientCode ?? string.Empty,
            PatientName = req?.Patient?.FullName ?? string.Empty,
            ServiceCode = req?.Service?.ServiceCode ?? string.Empty,
            ServiceName = req?.Service?.ServiceName ?? string.Empty,
            ResultDate = report.ReportDate ?? report.CreatedAt,
            Description = report.Findings ?? string.Empty,
            Conclusion = report.Impression ?? string.Empty,
            DoctorName = report.Radiologist?.FullName ?? string.Empty,
        };
    }

    #endregion

    #region Duty Schedule - Lịch phân công trực

    public async Task<List<DutyScheduleDto>> GetDutySchedulesAsync(
        Guid departmentId,
        DateTime fromDate,
        DateTime toDate,
        Guid? roomId = null)
    {
        var query = _context.Set<RadiologyDutySchedule>()
            .Include(s => s.Department)
            .Include(s => s.Room)
            .Include(s => s.Doctor)
            .Include(s => s.Technician)
            .Include(s => s.AssistantTechnician)
            .Where(s => s.DepartmentId == departmentId && s.DutyDate >= fromDate && s.DutyDate <= toDate);

        if (roomId.HasValue)
            query = query.Where(s => s.RoomId == roomId);

        var schedules = await query.OrderBy(s => s.DutyDate).ThenBy(s => s.ShiftType).ToBoundedListAsync("RIS.GetDutySchedules");

        return schedules.Select(s => new DutyScheduleDto
        {
            Id = s.Id,
            DepartmentId = s.DepartmentId,
            DepartmentName = s.Department.DepartmentName,
            RoomId = s.RoomId,
            RoomName = s.Room?.RoomName,
            DutyDate = s.DutyDate,
            ShiftType = s.ShiftType,
            ShiftTypeName = GetShiftTypeName(s.ShiftType),
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            DoctorId = s.DoctorId,
            DoctorName = s.Doctor?.FullName,
            TechnicianId = s.TechnicianId,
            TechnicianName = s.Technician?.FullName,
            AssistantTechnicianId = s.AssistantTechnicianId,
            AssistantTechnicianName = s.AssistantTechnician?.FullName,
            Notes = s.Notes,
            Status = s.Status,
            StatusName = s.Status == 1 ? "Da duyet" : s.Status == 2 ? "Da huy" : "Chua duyet"
        }).ToList();
    }

    public async Task<DutyScheduleDto> SaveDutyScheduleAsync(SaveDutyScheduleDto dto)
    {
        RadiologyDutySchedule schedule;
        if (dto.Id.HasValue)
        {
            schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(dto.Id.Value);
            if (schedule == null) return null;
        }
        else
        {
            schedule = new RadiologyDutySchedule { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDutySchedule>().AddAsync(schedule);
        }

        schedule.DepartmentId = dto.DepartmentId;
        schedule.RoomId = dto.RoomId;
        schedule.DutyDate = dto.DutyDate;
        schedule.ShiftType = dto.ShiftType;
        schedule.StartTime = dto.StartTime;
        schedule.EndTime = dto.EndTime;
        schedule.DoctorId = dto.DoctorId;
        schedule.TechnicianId = dto.TechnicianId;
        schedule.AssistantTechnicianId = dto.AssistantTechnicianId;
        schedule.Notes = dto.Notes;
        schedule.Status = 0; // Draft
        schedule.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DutyScheduleDto
        {
            Id = schedule.Id,
            DepartmentId = schedule.DepartmentId,
            RoomId = schedule.RoomId,
            DutyDate = schedule.DutyDate,
            ShiftType = schedule.ShiftType,
            ShiftTypeName = GetShiftTypeName(schedule.ShiftType),
            StartTime = schedule.StartTime,
            EndTime = schedule.EndTime,
            Status = schedule.Status
        };
    }

    public async Task<List<DutyScheduleDto>> BatchCreateDutySchedulesAsync(BatchCreateDutyScheduleDto dto)
    {
        var schedules = new List<DutyScheduleDto>();
        for (var date = dto.FromDate; date <= dto.ToDate; date = date.AddDays(1))
        {
            foreach (var shiftType in dto.ShiftTypes)
            {
                var staff = dto.Staff.FirstOrDefault(s => s.DayOfWeek == (int)date.DayOfWeek && s.ShiftType == shiftType);
                var schedule = await SaveDutyScheduleAsync(new SaveDutyScheduleDto
                {
                    DepartmentId = dto.DepartmentId,
                    RoomId = dto.RoomId,
                    DutyDate = date,
                    ShiftType = shiftType,
                    StartTime = GetShiftStartTime(shiftType),
                    EndTime = GetShiftEndTime(shiftType),
                    DoctorId = staff?.DoctorId,
                    TechnicianId = staff?.TechnicianId,
                    AssistantTechnicianId = staff?.AssistantTechnicianId
                });
                schedules.Add(schedule);
            }
        }
        return schedules;
    }

    public async Task<bool> DeleteDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 2; // Cancelled
        schedule.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 1; // Confirmed
        schedule.ApprovedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private string GetShiftTypeName(int shiftType) => shiftType switch
    {
        1 => "Ca sang",
        2 => "Ca chieu",
        3 => "Ca dem",
        4 => "Ca 24h",
        _ => "Khac"
    };

    private TimeSpan GetShiftStartTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(7, 0, 0),
        2 => new TimeSpan(13, 0, 0),
        3 => new TimeSpan(19, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(7, 0, 0)
    };

    private TimeSpan GetShiftEndTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(12, 0, 0),
        2 => new TimeSpan(18, 0, 0),
        3 => new TimeSpan(7, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(17, 0, 0)
    };

    #endregion

    #region Room Assignment - Phân phòng thực hiện

    public async Task<RoomAssignmentDto> AssignRoomAsync(AssignRoomRequestDto request)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (asgnFromUtc, asgnToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var queueNumber = await _context.Set<RadiologyRoomAssignment>()
            .Where(a => a.RoomId == request.RoomId && a.AssignedAt >= asgnFromUtc && a.AssignedAt < asgnToUtc)
            .CountAsync() + 1;

        var assignment = new RadiologyRoomAssignment
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            ModalityId = request.ModalityId,
            QueueNumber = queueNumber,
            Status = 0, // Waiting
            AssignedAt = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc (:924/:988/:1063)
            Notes = request.Notes,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyRoomAssignment>().AddAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            QueueNumber = queueNumber,
            Status = 0,
            StatusName = "Cho",
            AssignedAt = assignment.AssignedAt
        };
    }

    public async Task<RoomAssignmentDto> UpdateRoomAssignmentAsync(Guid assignmentId, AssignRoomRequestDto request)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return null;

        assignment.RoomId = request.RoomId;
        assignment.ModalityId = request.ModalityId;
        assignment.Notes = request.Notes;
        assignment.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = assignment.RadiologyRequestId,
            RoomId = assignment.RoomId,
            QueueNumber = assignment.QueueNumber,
            Status = assignment.Status
        };
    }

    public async Task<List<RoomAssignmentDto>> GetRoomQueueAsync(Guid roomId, DateTime date)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (rqFromUtc, rqToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var assignments = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(a => a.Room)
            .Include(a => a.Modality)
            .Where(a => a.RoomId == roomId && a.AssignedAt >= rqFromUtc && a.AssignedAt < rqToUtc && a.Status < 3)
            .OrderBy(a => a.QueueNumber)
            .ToBoundedListAsync("RIS.GetRoomQueue");

        return assignments.Select(a => new RoomAssignmentDto
        {
            Id = a.Id,
            RadiologyRequestId = a.RadiologyRequestId,
            OrderCode = a.RadiologyRequest.RequestCode,
            PatientCode = a.RadiologyRequest.Patient.PatientCode,
            PatientName = a.RadiologyRequest.Patient.FullName,
            ServiceName = a.RadiologyRequest.Service?.ServiceName ?? "",
            RoomId = a.RoomId,
            RoomName = a.Room.RoomName,
            ModalityId = a.ModalityId,
            ModalityName = a.Modality?.ModalityName,
            QueueNumber = a.QueueNumber,
            Status = a.Status,
            StatusName = GetAssignmentStatusName(a.Status),
            AssignedAt = a.AssignedAt,
            CalledAt = a.CalledAt,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt
        }).ToList();
    }

    public async Task<RoomAssignmentDto> CallNextPatientAsync(Guid roomId)
    {
        var nextAssignment = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Where(a => a.RoomId == roomId && a.Status == 0)
            .OrderBy(a => a.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextAssignment == null) return null;

        nextAssignment.Status = 1; // Called
        nextAssignment.CalledAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = nextAssignment.Id,
            RadiologyRequestId = nextAssignment.RadiologyRequestId,
            PatientCode = nextAssignment.RadiologyRequest.Patient.PatientCode,
            PatientName = nextAssignment.RadiologyRequest.Patient.FullName,
            QueueNumber = nextAssignment.QueueNumber,
            Status = nextAssignment.Status,
            StatusName = "Da goi",
            CalledAt = nextAssignment.CalledAt
        };
    }

    public async Task<bool> SkipPatientAsync(Guid assignmentId, string reason)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return false;

        assignment.Status = 4; // Skipped
        assignment.Notes = reason;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<RoomStatisticsDto>> GetRoomStatisticsAsync(DateTime date)
    {
        // AssignedAt ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (rsFromUtc, rsToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var rooms = await _context.Rooms.Where(r => r.RoomType >= 10 && r.RoomType < 20 && r.IsActive).ToListAsync();
        var result = new List<RoomStatisticsDto>();

        // #195: 1 query cho mọi phòng thay vì 1 query/phòng trong vòng lặp.
        var roomIds = rooms.Select(r => r.Id).ToList();
        var assignmentsByRoom = (await _context.Set<RadiologyRoomAssignment>()
                .Where(a => roomIds.Contains(a.RoomId) && a.AssignedAt >= rsFromUtc && a.AssignedAt < rsToUtc)
                .ToListAsync())
            .GroupBy(a => a.RoomId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var room in rooms)
        {
            var assignments = assignmentsByRoom.TryGetValue(room.Id, out var roomAssignments)
                ? roomAssignments
                : new List<RadiologyRoomAssignment>();

            result.Add(new RoomStatisticsDto
            {
                RoomId = room.Id,
                RoomName = room.RoomName,
                WaitingCount = assignments.Count(a => a.Status == 0),
                CalledCount = assignments.Count(a => a.Status == 1),
                InProgressCount = assignments.Count(a => a.Status == 2),
                CompletedCount = assignments.Count(a => a.Status == 3),
                SkippedCount = assignments.Count(a => a.Status == 4),
                TotalCount = assignments.Count
            });
        }

        return result;
    }

    private string GetAssignmentStatusName(int status) => status switch
    {
        0 => "Cho",
        1 => "Da goi",
        2 => "Dang thuc hien",
        3 => "Hoan thanh",
        4 => "Bo qua",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Tags - Quản lý Tag

    public async Task<List<RadiologyTagDto>> GetTagsAsync(string keyword = null, bool includeInactive = false)
    {
        var query = _context.Set<RadiologyTag>()
            .Include(t => t.Children)
            .Include(t => t.RequestTags)
            .Where(t => includeInactive || t.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));

        var tags = await query.Where(t => t.ParentId == null).OrderBy(t => t.SortOrder).ToListAsync();

        return tags.Select(MapTagToDto).ToList();
    }

    private RadiologyTagDto MapTagToDto(RadiologyTag tag)
    {
        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive,
            RequestCount = tag.RequestTags?.Count ?? 0,
            Children = tag.Children?.Select(MapTagToDto).ToList() ?? new List<RadiologyTagDto>()
        };
    }

    public async Task<RadiologyTagDto> SaveTagAsync(SaveRadiologyTagDto dto)
    {
        RadiologyTag tag;
        if (dto.Id.HasValue)
        {
            tag = await _context.Set<RadiologyTag>().FindAsync(dto.Id.Value);
            if (tag == null) return null;
        }
        else
        {
            tag = new RadiologyTag { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyTag>().AddAsync(tag);
        }

        tag.Code = dto.Code;
        tag.Name = dto.Name;
        tag.Description = dto.Description;
        tag.Color = dto.Color;
        tag.ParentId = dto.ParentId;
        tag.SortOrder = dto.SortOrder;
        tag.IsActive = dto.IsActive;
        tag.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive
        };
    }

    public async Task<bool> DeleteTagAsync(Guid tagId)
    {
        var tag = await _context.Set<RadiologyTag>().FindAsync(tagId);
        if (tag == null) return false;
        tag.IsActive = false;
        tag.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AssignTagsToRequestAsync(AssignTagRequestDto request)
    {
        // #195: nạp 1 lần các nhãn đã gắn thay vì 1 query/nhãn. Set này cũng chặn luôn
        // trường hợp TagIds gửi lên trùng nhau — trước đây mỗi vòng lặp query DB nên bản
        // ghi vừa Add (chưa SaveChanges) không thấy được ⇒ chèn trùng.
        var existingTagIds = (await _context.Set<RadiologyRequestTag>()
                .Where(rt => rt.RadiologyRequestId == request.RadiologyRequestId)
                .Select(rt => rt.TagId)
                .ToListAsync())
            .ToHashSet();

        foreach (var tagId in request.TagIds)
        {
            if (existingTagIds.Add(tagId))
            {
                var requestTag = new RadiologyRequestTag
                {
                    Id = Guid.NewGuid(),
                    RadiologyRequestId = request.RadiologyRequestId,
                    TagId = tagId,
                    Note = request.Note,
                    CreatedAt = DateTime.Now
                };
                await _context.Set<RadiologyRequestTag>().AddAsync(requestTag);
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveTagFromRequestAsync(Guid requestId, Guid tagId)
    {
        var requestTag = await _context.Set<RadiologyRequestTag>()
            .FirstOrDefaultAsync(rt => rt.RadiologyRequestId == requestId && rt.TagId == tagId);

        if (requestTag == null) return false;

        _context.Set<RadiologyRequestTag>().Remove(requestTag);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaggedRequestDto>> GetRequestsByTagAsync(Guid tagId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(rt => rt.Tag)
            .Include(rt => rt.AddedByUser)
            .Where(rt => rt.TagId == tagId);

        if (fromDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate >= fromDate);
        if (toDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate <= toDate);

        var requestTags = await query.OrderByDescending(rt => rt.CreatedAt).ToBoundedListAsync("RIS.GetRequestsByTag");

        return requestTags.Select(rt => new TaggedRequestDto
        {
            Id = rt.Id,
            RadiologyRequestId = rt.RadiologyRequestId,
            OrderCode = rt.RadiologyRequest.RequestCode,
            PatientCode = rt.RadiologyRequest.Patient.PatientCode,
            PatientName = rt.RadiologyRequest.Patient.FullName,
            ServiceName = rt.RadiologyRequest.Service?.ServiceName ?? "",
            OrderDate = rt.RadiologyRequest.RequestDate,
            TagId = rt.TagId,
            TagName = rt.Tag.Name,
            TagColor = rt.Tag.Color,
            Note = rt.Note,
            AddedByUserName = rt.AddedByUser?.FullName,
            CreatedAt = rt.CreatedAt
        }).ToList();
    }

    public async Task<List<RadiologyTagDto>> GetTagsOfRequestAsync(Guid requestId)
    {
        var requestTags = await _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.Tag)
            .Where(rt => rt.RadiologyRequestId == requestId)
            .ToListAsync();

        return requestTags.Select(rt => new RadiologyTagDto
        {
            Id = rt.Tag.Id,
            Code = rt.Tag.Code,
            Name = rt.Tag.Name,
            Color = rt.Tag.Color
        }).ToList();
    }

    #endregion
}
