using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Core.Constants;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

// K4 phien 4 (2026-05-30): tach Section 2.8 Examination Conclusion (~482 dong) khoi
// ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.8 Examination Conclusion

    public async Task<ExaminationConclusionDto?> GetConclusionAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null || !examination.ConclusionType.HasValue) return null;

        return new ExaminationConclusionDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ConclusionType = examination.ConclusionType.Value,
            ConclusionNotes = examination.ConclusionNote,
            NextAppointmentDate = examination.FollowUpDate,
            ConcludedAt = examination.EndTime ?? DateTime.Now
        };
    }

    public async Task<ExaminationConclusionDto> CompleteExaminationAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");
        // InvalidOperationException → DomainExceptionFilter trả 400 INVALID_STATE message rõ (không 500 mask)
        if (examination.Status == 4) throw new InvalidOperationException("Đã hoàn thành, cần mở khóa trước");

        examination.ConclusionType = dto.ConclusionType;
        examination.ConclusionNote = dto.ConclusionNotes;
        examination.FollowUpDate = dto.NextAppointmentDate;

        if (!string.IsNullOrEmpty(dto.FinalDiagnosisCode))
        {
            examination.MainIcdCode = dto.FinalDiagnosisCode;
            examination.MainDiagnosis = dto.FinalDiagnosisName;
        }

        // Validate before completing
        var validation = await ValidateExaminationForCompletionAsync(examinationId);
        if (!validation.IsValid)
            throw new InvalidOperationException($"Không thể hoàn thành: {string.Join(", ", validation.Errors)}");

        examination.Status = 4; // Completed
        examination.EndTime = DateTime.Now;

        // Update medical record
        examination.MedicalRecord.MainIcdCode = examination.MainIcdCode;
        examination.MedicalRecord.MainDiagnosis = examination.MainDiagnosis;
        examination.MedicalRecord.Status = 3; // Completed

        await _unitOfWork.SaveChangesAsync();

        return new ExaminationConclusionDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ConclusionType = dto.ConclusionType,
            ConclusionNotes = dto.ConclusionNotes,
            NextAppointmentDate = dto.NextAppointmentDate,
            SickLeaveDays = dto.SickLeaveDays,
            ConcludedAt = DateTime.Now
        };
    }

    public async Task<ExaminationConclusionDto> UpdateConclusionAsync(Guid examinationId, CompleteExaminationDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");
        if (examination.MedicalRecord?.EmrFinalizedAt != null)
            throw new InvalidOperationException(EmrLockGuard.LockedMessage); // TT46
        if (examination.Status == 5) throw new InvalidOperationException("Phiếu khám đã hủy, không thể sửa kết luận");
        if (examination.Status < 4) throw new InvalidOperationException("Phiếu khám chưa hoàn thành, vui lòng dùng CompleteExamination");

        examination.ConclusionType = dto.ConclusionType;
        examination.ConclusionNote = dto.ConclusionNotes;
        examination.FollowUpDate = dto.NextAppointmentDate;

        if (!string.IsNullOrEmpty(dto.FinalDiagnosisCode))
        {
            examination.MainIcdCode = dto.FinalDiagnosisCode;
            examination.MainDiagnosis = dto.FinalDiagnosisName;
        }

        examination.MedicalRecord.MainIcdCode = examination.MainIcdCode;
        examination.MedicalRecord.MainDiagnosis = examination.MainDiagnosis;

        await _unitOfWork.SaveChangesAsync();

        return new ExaminationConclusionDto
        {
            Id = Guid.NewGuid(),
            ExaminationId = examinationId,
            ConclusionType = dto.ConclusionType,
            ConclusionNotes = dto.ConclusionNotes,
            NextAppointmentDate = dto.NextAppointmentDate,
            SickLeaveDays = dto.SickLeaveDays,
            ConcludedAt = DateTime.Now
        };
    }

    public async Task<Application.DTOs.ExaminationDto> RequestHospitalizationAsync(Guid examinationId, HospitalizationRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        examination.ConclusionType = 3; // Hospitalization
        examination.ConclusionNote = dto.Reason;
        examination.Status = 4;
        examination.EndTime = DateTime.Now;

        // Persist thông tin yêu cầu nhập viện đầy đủ
        examination.HospitalizationDepartmentId = dto.DepartmentId == Guid.Empty ? null : dto.DepartmentId;
        examination.HospitalizationIsEmergency = dto.IsEmergency;
        examination.HospitalizationDiagnosisCode = dto.DiagnosisCode;
        examination.HospitalizationDiagnosisName = dto.DiagnosisName;

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<Application.DTOs.ExaminationDto> RequestTransferAsync(Guid examinationId, TransferRequestDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        examination.ConclusionType = 4; // Transfer
        // Persist từng trường riêng thay vì gộp chuỗi vào ConclusionNote
        examination.TransferToHospital = dto.FacilityName;
        examination.TransferReason = dto.Reason;
        examination.TransferTransportMethod = dto.TransportMethod;
        examination.TransferDiagnosisCode = dto.DiagnosisCode;
        examination.TransferDiagnosisName = dto.DiagnosisName;
        // Giữ ConclusionNote dạng tóm tắt ngắn cho backward-compat (hiển thị ở màn danh sách)
        examination.ConclusionNote = $"Chuyển viện: {dto.FacilityName}";
        examination.Status = 4;
        examination.EndTime = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    public async Task<AppointmentDto> CreateAppointmentAsync(Guid examinationId, CreateAppointmentDto dto)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = $"HK{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = examination.MedicalRecord.PatientId,
            AppointmentDate = dto.AppointmentDate,
            RoomId = dto.RoomId ?? examination.RoomId,
            DoctorId = dto.DoctorId,
            Notes = dto.Notes,
            Status = 1 // Scheduled
        };

        await _context.Appointments.AddAsync(appointment);

        // Update examination follow-up date
        examination.FollowUpDate = dto.AppointmentDate;

        await _unitOfWork.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            AppointmentDate = appointment.AppointmentDate,
            RoomId = appointment.RoomId,
            DoctorId = appointment.DoctorId,
            Notes = appointment.Notes,
            Status = appointment.Status
        };
    }

    public async Task<PagedResultDto<AppointmentListDto>> SearchAppointmentsAsync(AppointmentSearchDto search)
    {
        var query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Room)
            .Include(a => a.Doctor)
            .Include(a => a.PreviousMedicalRecord)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        if (search.FromDate.HasValue)
            query = query.Where(a => a.AppointmentDate >= search.FromDate.Value);
        if (search.ToDate.HasValue)
            query = query.Where(a => a.AppointmentDate <= search.ToDate.Value.AddDays(1));
        if (search.Status.HasValue)
            query = query.Where(a => a.Status == search.Status.Value);
        if (search.AppointmentType.HasValue)
            query = query.Where(a => a.AppointmentType == search.AppointmentType.Value);
        if (search.DepartmentId.HasValue)
            query = query.Where(a => a.DepartmentId == search.DepartmentId.Value);
        if (search.DoctorId.HasValue)
            query = query.Where(a => a.DoctorId == search.DoctorId.Value);
        var page = Math.Max(1, search.Page);
        var pageSize = Math.Clamp(search.PageSize, 1, 200);
        List<Appointment> items;
        int total;
        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim();

            // Patient.PhoneNumber is randomized encrypted PII. SQL LIKE over that
            // property encrypts the LIKE escape parameter and raises SQL error 506.
            // Apply safe structural filters in SQL, then search decrypted values.
            var candidates = await query.AsNoTracking().ToListAsync();
            var matched = candidates
                .Where(a =>
                    (a.Patient?.FullName?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                    || (a.Patient?.PatientCode?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                    || a.AppointmentCode.Contains(kw, StringComparison.OrdinalIgnoreCase)
                    || (a.Patient?.PhoneNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false))
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .ToList();

            total = matched.Count;
            items = matched
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();
        }
        else
        {
            total = await query.CountAsync();
            items = await query
                .AsNoTracking()
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        var today = DateTime.Today;
        return new PagedResultDto<AppointmentListDto>
        {
            TotalCount = total,
            Items = items.Select(a => MapToAppointmentListDto(a, today)).ToList()
        };
    }

    public async Task<AppointmentDto> UpdateAppointmentStatusAsync(Guid appointmentId, int status)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Room)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null) throw new KeyNotFoundException("Appointment not found");

        appointment.Status = status;
        appointment.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            AppointmentDate = appointment.AppointmentDate,
            RoomId = appointment.RoomId,
            RoomName = appointment.Room?.RoomName,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor?.FullName,
            Notes = appointment.Notes,
            Status = appointment.Status
        };
    }

    public async Task<List<AppointmentListDto>> GetOverdueFollowUpsAsync(int daysOverdue = 7)
    {
        var cutoffDate = DateTime.Today.AddDays(-daysOverdue);
        var today = DateTime.Today;

        var overdue = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .Include(a => a.Room)
            .Include(a => a.Doctor)
            .Include(a => a.PreviousMedicalRecord)
            .Where(a => !a.IsDeleted
                && a.AppointmentDate < today
                && a.AppointmentDate >= cutoffDate
                && (a.Status == 0 || a.Status == 1)) // Pending or confirmed but not attended
            .OrderBy(a => a.AppointmentDate)
            .Take(100)
            .ToListAsync();

        return overdue.Select(a => MapToAppointmentListDto(a, today)).ToList();
    }

    private static AppointmentListDto MapToAppointmentListDto(Appointment a, DateTime today)
    {
        var daysOver = a.AppointmentDate.Date < today ? (today - a.AppointmentDate.Date).Days : 0;
        return new AppointmentListDto
        {
            Id = a.Id,
            AppointmentCode = a.AppointmentCode,
            AppointmentDate = a.AppointmentDate,
            AppointmentTime = a.AppointmentTime,
            PatientId = a.PatientId,
            PatientCode = a.Patient?.PatientCode ?? "",
            PatientName = a.Patient?.FullName ?? "",
            PhoneNumber = a.Patient?.PhoneNumber,
            Gender = a.Patient?.Gender,
            DateOfBirth = a.Patient?.DateOfBirth,
            AppointmentType = a.AppointmentType,
            AppointmentTypeName = a.AppointmentType switch
            {
                1 => "Tái khám",
                2 => "Khám mới",
                3 => "Khám sức khỏe",
                _ => "Khác"
            },
            Reason = a.Reason,
            Notes = a.Notes ?? a.Note,
            DepartmentId = a.DepartmentId,
            DepartmentName = a.Department?.DepartmentName,
            RoomId = a.RoomId,
            RoomName = a.Room?.RoomName,
            DoctorId = a.DoctorId,
            DoctorName = a.Doctor?.FullName,
            Status = a.Status,
            StatusName = a.Status switch
            {
                0 => "Chờ xác nhận",
                1 => "Đã xác nhận",
                2 => "Đã đến khám",
                3 => "Không đến",
                4 => "Đã hủy",
                _ => "Không rõ"
            },
            IsReminderSent = a.IsReminderSent,
            ReminderSentAt = a.ReminderSentAt,
            DaysOverdue = daysOver,
            PreviousDiagnosis = a.PreviousMedicalRecord?.MainDiagnosis
        };
    }

    /// <summary>
    /// Cấp giấy chứng nhận nghỉ việc hưởng BHXH — nghỉ ốm (mẫu C65-HD, TT 56/2017).
    ///
    /// <para>#218/T3 (migration 177): trước đây hàm này chỉ dựng một DTO với Id = Guid.NewGuid()
    /// rồi trả về — không ghi dòng nào. Bệnh viện cấp giấy cho người bệnh mà không giữ lại bản ghi:
    /// không tra cứu lại được đã cấp cho ai, bao nhiêu ngày, và không đối chiếu được khi cơ quan
    /// BHXH hỏi. Đo được ở evidence/cross/t3/t3_leave_certificates.json.</para>
    /// </summary>
    public async Task<SickLeaveDto> CreateSickLeaveAsync(Guid examinationId, CreateSickLeaveDto dto)
    {
        var r = await IssueLeaveCertificateAsync(examinationId, dto.Days, dto.FromDate, dto.ToDate,
                                                 dto.Reason, gestationalWeeks: null, isMaternity: false);
        return new SickLeaveDto
        {
            Id = r.Id,
            ExaminationId = r.ExaminationId,
            Days = r.Days,
            FromDate = r.FromDate,
            ToDate = r.ToDate,
            Reason = r.Reason,
            DoctorName = r.DoctorName,
            IssuedAt = r.IssuedAt,
        };
    }

    /// <summary>Cấp giấy nghỉ thai sản. Dùng chung đường ghi với nghỉ ốm, thêm số tuần thai.</summary>
    public async Task<MaternityLeaveDto> CreateMaternityLeaveAsync(Guid examinationId, CreateMaternityLeaveDto dto)
    {
        var r = await IssueLeaveCertificateAsync(examinationId, dto.Days, dto.FromDate, dto.ToDate,
                                                 dto.Reason, dto.GestationalWeeks, isMaternity: true);
        return new MaternityLeaveDto
        {
            Id = r.Id,
            ExaminationId = r.ExaminationId,
            Days = r.Days,
            FromDate = r.FromDate,
            ToDate = r.ToDate,
            GestationalWeeks = r.GestationalWeeks,
            Reason = r.Reason,
            DoctorName = r.DoctorName,
            IssuedAt = r.IssuedAt,
        };
    }

    private sealed record IssuedLeave(Guid Id, Guid ExaminationId, int Days, DateTime FromDate,
                                      DateTime ToDate, int? GestationalWeeks, string? Reason,
                                      string? DoctorName, DateTime IssuedAt);

    /// <summary>
    /// Đường ghi chung của hai loại giấy nghỉ. Gom về một chỗ để hai cửa không lệch nhau — đúng cái
    /// hình dạng "một luật thi hành ở một cửa, bỏ trống ở cửa bên cạnh" mà cả đợt #218 đang gỡ.
    /// </summary>
    private async Task<IssuedLeave> IssueLeaveCertificateAsync(
        Guid examinationId, int days, DateTime fromDate, DateTime toDate,
        string? reason, int? gestationalWeeks, bool isMaternity)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(e => e.Doctor)
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lượt khám");

        if (examination.Status == ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Lượt khám đã hủy, không cấp giấy nghỉ được.");

        // Kiểm khoảng ngày ngay từ đầu vào — bài học §32 (truyền dịch kết thúc trước khi bắt đầu):
        // chặn nguyên nhân chứ đừng kẹp triệu chứng.
        if (toDate.Date < fromDate.Date)
            throw new InvalidOperationException(
                $"Ngày kết thúc ({toDate:dd/MM/yyyy}) sớm hơn ngày bắt đầu ({fromDate:dd/MM/yyyy}).");
        var span = (toDate.Date - fromDate.Date).Days + 1;
        if (days <= 0) days = span;
        if (days != span)
            throw new InvalidOperationException(
                $"Số ngày nghỉ ({days}) không khớp khoảng {fromDate:dd/MM/yyyy}-{toDate:dd/MM/yyyy} ({span} ngày).");

        var loai = isMaternity ? "thai sản" : "ốm";
        var daCap = isMaternity
            ? await _context.MaternityLeaves.AnyAsync(x => x.ExaminationId == examinationId && !x.IsDeleted)
            : await _context.SickLeaves.AnyAsync(x => x.ExaminationId == examinationId && !x.IsDeleted);
        if (daCap)
            throw new InvalidOperationException(
                $"Lượt khám này đã cấp giấy nghỉ {loai} rồi. Muốn cấp lại thì phải hủy giấy cũ.");

        var patient = examination.MedicalRecord?.Patient;
        var now = DateTime.UtcNow;
        var prefix = (isMaternity ? "TS" : "NO") + now.ToString("yyyyMM");
        var soDaCap = isMaternity
            ? await _context.MaternityLeaves.CountAsync(x => x.CertificateNumber.StartsWith(prefix))
            : await _context.SickLeaves.CountAsync(x => x.CertificateNumber.StartsWith(prefix));
        var certificateNumber = $"{prefix}-{soDaCap + 1:D5}";

        var id = Guid.NewGuid();
        if (isMaternity)
        {
            await _context.MaternityLeaves.AddAsync(new MaternityLeave
            {
                Id = id,
                CertificateNumber = certificateNumber,
                ExaminationId = examinationId,
                MedicalRecordId = examination.MedicalRecordId,
                PatientId = patient?.Id ?? Guid.Empty,
                Days = days,
                FromDate = fromDate,
                ToDate = toDate,
                GestationalWeeks = gestationalWeeks,
                Reason = reason,
                DiagnosisCode = examination.MainIcdCode,
                DiagnosisName = examination.MainDiagnosis,
                InsuranceNumber = patient?.InsuranceNumber,
                Workplace = patient?.Workplace,
                IssuedByDoctorId = examination.DoctorId,
                IssuedAt = now,
                CreatedAt = now,
            });
        }
        else
        {
            await _context.SickLeaves.AddAsync(new SickLeave
            {
                Id = id,
                CertificateNumber = certificateNumber,
                ExaminationId = examinationId,
                MedicalRecordId = examination.MedicalRecordId,
                PatientId = patient?.Id ?? Guid.Empty,
                Days = days,
                FromDate = fromDate,
                ToDate = toDate,
                Reason = reason,
                DiagnosisCode = examination.MainIcdCode,
                DiagnosisName = examination.MainDiagnosis,
                InsuranceNumber = patient?.InsuranceNumber,
                Workplace = patient?.Workplace,
                IssuedByDoctorId = examination.DoctorId,
                IssuedAt = now,
                CreatedAt = now,
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return new IssuedLeave(id, examinationId, days, fromDate, toDate, gestationalWeeks,
                               reason, examination.Doctor?.FullName, now);
    }

    public async Task<byte[]> PrintSickLeaveAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;
            var conclusionTypeText = examination.ConclusionType switch
            {
                1 => "Cho ve",
                2 => "Ke don",
                3 => "Nhap vien",
                4 => "Chuyen vien",
                5 => "Hen kham lai",
                _ => ""
            };

            var labels = new[]
            {
                "Ho va ten", "Ngay sinh", "Gioi tinh", "Dia chi",
                "Don vi cong tac", "So BHXH",
                "Chan doan", "Ma ICD",
                "So ngay nghi", "Tu ngay", "Den ngay",
                "Ket luan"
            };
            var values = new[]
            {
                patient.FullName,
                patient.DateOfBirth?.ToString("dd/MM/yyyy") ?? "",
                patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nu" : "Khac",
                patient.Address ?? "",
                patient.Workplace ?? "",
                patient.InsuranceNumber ?? "",
                $"{examination.MainDiagnosis} ({examination.MainIcdCode})",
                examination.MainIcdCode ?? "",
                examination.FollowUpDate.HasValue
                    ? ((examination.FollowUpDate.Value - DateTime.Now).Days).ToString()
                    : "...",
                DateTime.Now.ToString("dd/MM/yyyy"),
                examination.FollowUpDate?.ToString("dd/MM/yyyy") ?? ".../.../......",
                conclusionTypeText
            };

            var html = BuildVoucherReport(
                "GIAY CHUNG NHAN NGHI OM",
                $"GNO{DateTime.Now:yyyyMMdd}-{examinationId.ToString()[..8].ToUpper()}",
                DateTime.Now, labels, values, examination.Doctor?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintMaternityLeaveAsync(Guid examinationId, CreateMaternityLeaveDto dto)
    {
        try
        {
            var examination = await _context.Examinations
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;

            var labels = new[]
            {
                "Ho va ten", "Ngay sinh", "Gioi tinh", "Dia chi",
                "Don vi cong tac", "So BHXH",
                "Chan doan", "Ma ICD",
                "Tuan thai", "Ly do nghi duong thai",
                "So ngay nghi", "Tu ngay", "Den ngay"
            };
            var values = new[]
            {
                patient.FullName,
                patient.DateOfBirth?.ToString("dd/MM/yyyy") ?? "",
                patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nu" : "Khac",
                patient.Address ?? "",
                patient.Workplace ?? "",
                patient.InsuranceNumber ?? "",
                $"{examination.MainDiagnosis} ({examination.MainIcdCode})",
                examination.MainIcdCode ?? "",
                dto.GestationalWeeks.HasValue ? $"{dto.GestationalWeeks} tuan" : "...",
                dto.Reason ?? "...",
                dto.Days.ToString(),
                dto.FromDate.ToString("dd/MM/yyyy"),
                dto.ToDate.ToString("dd/MM/yyyy")
            };

            var html = BuildVoucherReport(
                "GIAY NGHI DUONG THAI",
                $"GDT{DateTime.Now:yyyyMMdd}-{examinationId.ToString()[..8].ToUpper()}",
                DateTime.Now, labels, values, examination.Doctor?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<bool> LockExaminationAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // Lock by setting status to completed (4)
        if (examination.Status < 4)
        {
            examination.Status = 4;
            await _examinationRepo.UpdateAsync(examination);
            await _unitOfWork.SaveChangesAsync();
        }
        return true;
    }

    public async Task<bool> UnlockExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // Unlock by reverting to previous state (3 = Chờ kết luận)
        if (examination.Status == 4)
        {
            examination.Status = 3;
            await _examinationRepo.UpdateAsync(examination);
            await _unitOfWork.SaveChangesAsync();
        }
        return true;
    }

    public async Task<ExaminationValidationResult> ValidateExaminationForCompletionAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null)
            return new ExaminationValidationResult { IsValid = false, Errors = new List<string> { "Examination not found" } };

        var errors = new List<string>();
        var warnings = new List<string>();

        if (string.IsNullOrEmpty(examination.MainIcdCode))
            errors.Add("Chua co chan doan chinh");

        if (!examination.ConclusionType.HasValue)
            errors.Add("Chua co ket luan");

        // Siết 2026-06-12 (prod-livetest): TT46 đòi nội dung kết luận — trước đây FE hardcode
        // ConclusionType=1 + note rỗng vẫn hoàn tất được. Suite/caller hợp lệ đều gửi notes.
        if (string.IsNullOrWhiteSpace(examination.ConclusionNote))
            errors.Add("Chua nhap noi dung ket luan kham");

        return new ExaminationValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        };
    }

    public async Task<bool> CancelExaminationAsync(Guid examinationId, string reason)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return false;

        // #218/T3: hồ sơ đã khóa TT46 thì không hủy lượt khám được — sửa kết luận của chính lượt đó
        // đã bị EmrLockGuard chặn, mà hủy cả lượt lại lọt thì lớp khóa chẳng còn nghĩa gì.
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId);

        if (examination.Status == ExaminationStatus.Cancelled)
            throw new InvalidOperationException("Lượt khám đã hủy trước đó rồi.");
        if (examination.Status == ExaminationStatus.Completed)
            throw new InvalidOperationException(
                "Lượt khám đã hoàn thành, không hủy thẳng được. "
                + "Nếu cần hủy thì mở lại kết luận (bỏ hoàn thành) trước, rồi mới hủy.");

        examination.Status = ExaminationStatus.Cancelled;
        // #218/T3: lý do hủy đi vào ô riêng `CancelReason` (migration 174), KHÔNG ghi đè
        // `ConclusionNote` — đó là kết luận khám của bác sĩ, và CdaDocumentService lấy đúng ô ấy
        // làm phần diễn biến lâm sàng cho tài liệu CDA gửi hồ sơ sức khỏe quốc gia.
        examination.CancelReason = reason;

        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<Application.DTOs.ExaminationDto> RevertCompletionAsync(Guid examinationId, string reason)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null) throw new KeyNotFoundException("Examination not found");

        // #218/T3: trước đây gán `Status = 1` bất kể đang ở đâu, nên "mở lại kết luận" dùng được cả
        // trên lượt ĐÃ HỦY — biến một lượt khám đã hủy thành đang khám. Và hồ sơ đã khóa TT46 cũng
        // mở lại được, trong khi sửa kết luận của chính lượt đó thì bị chặn.
        await EmrLockGuard.EnsureEditableByExaminationAsync(_context, examinationId);

        if (examination.Status == ExaminationStatus.Cancelled)
            throw new InvalidOperationException(
                "Lượt khám đã hủy, không mở lại kết luận được.");
        if (examination.Status != ExaminationStatus.Completed)
            throw new InvalidOperationException(
                $"Lượt khám đang ở trạng thái \"{ExaminationStatus.GetName(examination.Status)}\" — "
                + "chưa hoàn thành nên không có kết luận nào để mở lại.");

        examination.Status = ExaminationStatus.InProgress;
        examination.EndTime = null;
        examination.ConclusionType = null;
        // Lý do mở lại: giữ vào cùng ô với lý do hủy thay vì nhận rồi vứt như trước.
        examination.CancelReason = $"Mở lại kết luận: {reason}";

        await _unitOfWork.SaveChangesAsync();

        return MapToExaminationDto(examination);
    }

    #endregion
}
