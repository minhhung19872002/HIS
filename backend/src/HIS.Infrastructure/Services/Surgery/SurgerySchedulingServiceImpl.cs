using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Core.Constants;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 Step 2b (2026-05-30, Plan B): Implementation ISurgerySchedulingService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.1 + 6.1.1 (22 method, ~570 dong).
/// </summary>
public class SurgerySchedulingServiceImpl : ISurgerySchedulingService
{
    private readonly HISDbContext _context;

    public SurgerySchedulingServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    #region 6.1 Quản lý PTTT

    public async Task<SurgeryDto> CreateSurgeryRequestAsync(CreateSurgeryRequestDto dto, Guid userId)
    {
        try
        {
            // 🔴 PATIENT-SAFETY (sweep prod 2026-06-12): trước đây lấy BN ĐẦU TIÊN trong DB
            // (FirstOrDefault / tự tạo "Bệnh nhân Test") khi thiếu context → body rỗng vẫn tạo
            // ca mổ gắn NHẦM bệnh nhân. Resolve BẮT BUỘC từ HSBA/lần khám; thiếu → 400.
            Patient? patient = null;
            Guid? resolvedMedicalRecordId = dto.MedicalRecordId != Guid.Empty ? dto.MedicalRecordId : null;
            if (dto.MedicalRecordId != Guid.Empty)
            {
                patient = await _context.Set<MedicalRecord>()
                    .Where(m => m.Id == dto.MedicalRecordId)
                    .Select(m => m.Patient)
                    .FirstOrDefaultAsync();
                if (patient == null)
                    throw new InvalidOperationException("Khong tim thay ho so benh an (medicalRecordId khong ton tai)");
            }
            else if (dto.ExaminationId.HasValue && dto.ExaminationId.Value != Guid.Empty)
            {
                patient = await _context.Set<Examination>()
                    .Where(e => e.Id == dto.ExaminationId.Value)
                    .Select(e => e.MedicalRecord.Patient)
                    .FirstOrDefaultAsync();
                if (patient == null)
                    throw new InvalidOperationException("Khong tim thay lan kham (examinationId khong ton tai)");
                // QA-R6: the v2 request modal only sends examinationId — the request was saved with a NULL
                // MedicalRecordId, so record-scoped reads (treatment summary, per-record lookups) never saw it.
                resolvedMedicalRecordId = await _context.Set<Examination>()
                    .Where(e => e.Id == dto.ExaminationId.Value)
                    .Select(e => (Guid?)e.MedicalRecordId)
                    .FirstOrDefaultAsync();
            }
            else
            {
                throw new InvalidOperationException(
                    "Thieu medicalRecordId hoac examinationId — khong the tao yeu cau PTTT khong gan benh nhan");
            }

            // QA-R4: a new surgery request is EMR content — a finalized (TT46) record accepted it before.
            if (dto.MedicalRecordId != Guid.Empty)
                await EmrLockGuard.EnsureEditableByRecordAsync(_context, dto.MedicalRecordId);
            else
                await EmrLockGuard.EnsureEditableByExaminationAsync(_context, dto.ExaminationId!.Value);

            // Tìm User để làm RequestingDoctor (dùng user đầu tiên nếu userId không tồn tại)
            var doctor = await _context.Set<User>().FindAsync(userId);
            if (doctor == null)
            {
                doctor = await _context.Set<User>().FirstOrDefaultAsync();
            }
            var doctorId = doctor?.Id ?? userId;

            var requestId = Guid.NewGuid();
            // QA-R6: second precision gave two requests created in the same second the same code
            // (59 duplicated codes in dev data); add milliseconds + 2 random digits (21 chars, column is 50).
            var requestCode = $"PT{DateTime.Now:yyyyMMddHHmmssfff}{Random.Shared.Next(100):D2}";

            var request = new SurgeryRequest
            {
                Id = requestId,
                RequestCode = requestCode,
                PatientId = patient.Id,
                MedicalRecordId = resolvedMedicalRecordId,
                // Link examination (OPD/CĐHA workflow) when provided
                ExaminationId = dto.ExaminationId != Guid.Empty ? dto.ExaminationId : null,
                RequestDate = DateTime.Now,
                SurgeryType = GetSurgeryTypeName(dto.SurgeryType),
                RequestingDoctorId = doctorId,
                Priority = dto.SurgeryNature,
                Status = 0, // Chờ lên lịch
                PreOpDiagnosis = dto.PreOperativeDiagnosis,
                PreOpIcdCode = dto.PreOperativeIcdCode,
                PlannedProcedure = dto.SurgeryMethod,
                EstimatedDuration = 60, // Default 60 phút
                AnesthesiaType = dto.AnesthesiaType,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            // Tường trình PTTT → cột riêng (migration 78). Ưu tiên field tường minh (FE mới);
            // fallback parse sentinel trong Notes cho FE cũ / row legacy. Notes giữ nguyên.
            request.SurgeryReport = dto.SurgeryReport;
            request.Conclusion = dto.Conclusion;
            request.AttachedImageUrls = dto.AttachedImageUrls;
            if (request.SurgeryReport is null && request.Conclusion is null && request.AttachedImageUrls is null)
                ApplyNarrativeFromNotes(request, dto.Notes);

            _context.Set<SurgeryRequest>().Add(request);
            await _context.SaveChangesAsync();

            // Return DTO
            return new SurgeryDto
            {
                Id = request.Id,
                SurgeryCode = request.RequestCode,
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                PatientName = patient.FullName,
                MedicalRecordId = request.MedicalRecordId ?? Guid.Empty,
                ExaminationId = request.ExaminationId,
                SurgeryType = dto.SurgeryType,
                SurgeryTypeName = request.SurgeryType,
                SurgeryClass = dto.SurgeryClass,
                SurgeryClassName = GetSurgeryClassName(dto.SurgeryClass),
                SurgeryNature = dto.SurgeryNature,
                SurgeryNatureName = dto.SurgeryNature == 3 ? "Cấp cứu" : "Chương trình", // same scale as the list (3 = emergency)
                PreOperativeDiagnosis = dto.PreOperativeDiagnosis,
                PreOperativeIcdCode = dto.PreOperativeIcdCode,
                SurgeryServiceId = dto.SurgeryServiceId,
                SurgeryServiceName = dto.SurgeryMethod ?? "Phẫu thuật",
                AnesthesiaType = dto.AnesthesiaType,
                AnesthesiaTypeName = GetAnesthesiaTypeName(dto.AnesthesiaType),
                Status = 0,
                StatusName = "Chờ lên lịch",
                CreatedAt = DateTime.Now
            };
        }
        catch (InvalidOperationException)
        {
            throw; // lỗi nghiệp vụ → DomainExceptionFilter trả 400 message rõ, không bọc thành 500
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"CreateSurgeryRequestAsync Error: {ex.Message}");
            throw new Exception($"Lỗi tạo yêu cầu phẫu thuật: {ex.Message}", ex);
        }
    }

    // Tách narrative PTTT từ chuỗi Notes pack sentinel ([TUONGTRINH]/[KETLUAN]/[HINHCHINH]/[HINHPHU])
    // mà SurgeryReportModal FE đang gửi, đổ vào cột riêng. Best-effort, từng dòng; không đụng Notes gốc.
    private static void ApplyNarrativeFromNotes(SurgeryRequest request, string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes)) return;
        var images = new List<string>();
        foreach (var raw in notes.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimStart();
            if (line.StartsWith("[TUONGTRINH]"))
                request.SurgeryReport = line.Substring("[TUONGTRINH]".Length).Trim();
            else if (line.StartsWith("[KETLUAN]"))
                request.Conclusion = line.Substring("[KETLUAN]".Length).Trim();
            else if (line.StartsWith("[HINHCHINH]") || line.StartsWith("[HINHPHU]"))
                images.Add(line);
        }
        if (images.Count > 0)
            request.AttachedImageUrls = string.Join("\n", images);
    }

    private static string GetSurgeryTypeName(int surgeryType) => surgeryType switch
    {
        1 => "Phẫu thuật lớn",
        2 => "Phẫu thuật nhỏ",
        3 => "Thủ thuật",
        _ => "Phẫu thuật"
    };

    private static string GetSurgeryClassName(int surgeryClass) => surgeryClass switch
    {
        1 => "Đặc biệt",
        2 => "Loại 1",
        3 => "Loại 2",
        4 => "Loại 3",
        _ => "Không xác định"
    };

    private static string GetAnesthesiaTypeName(int anesthesiaType) => anesthesiaType switch
    {
        1 => "Gây tê",
        2 => "Gây mê toàn thân",
        3 => "Gây mê nội khí quản",
        4 => "Gây tê tủy sống",
        5 => "Gây tê ngoài màng cứng",
        _ => "Không xác định"
    };

    public async Task<SurgeryDto> ApproveSurgeryAsync(ApproveSurgeryDto dto, Guid userId)
    {
        try
        {
            var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
            if (request == null) throw new KeyNotFoundException("Surgery request not found");

            // QA0915: approve/reject wrote the status blindly — "reject" flipped a COMPLETED surgery to
            // cancelled and "approve" revived a cancelled one (bypassing the #218/T3 cancel guard).
            if (dto.IsApproved)
            {
                if (request.Status == SurgeryStatus.RequestCancelled)
                    throw new InvalidOperationException("Ca mổ đã hủy, không duyệt lại được. Hãy tạo yêu cầu mới.");
                if (request.Status == SurgeryStatus.RequestInProgress || request.Status == SurgeryStatus.RequestCompleted)
                    throw new InvalidOperationException($"Ca mổ đang ở trạng thái \"{SurgeryStatus.RequestLabel(request.Status)}\", không duyệt lại được.");
            }
            else
            {
                SurgeryStatus.EnsureCanCancelRequest(request.Status, "từ chối duyệt");
            }

            request.Status = dto.IsApproved ? 1 : 4;
            request.UpdatedAt = DateTime.Now;
            request.UpdatedBy = userId.ToString();

            await _context.SaveChangesAsync();
            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException)
        {
            throw; // QA0915: not-found / business guard → 404/400, was swallowed into a 200 empty DTO
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"ApproveSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId, Status = dto.IsApproved ? 1 : 4 };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ApproveSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<SurgeryDto> RejectSurgeryAsync(Guid surgeryId, string reason, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (request == null) throw new KeyNotFoundException("Surgery request not found");

        // #218/T3: không từ chối duyệt một ca đã mổ hoặc đang mổ — việc đã xảy ra trên người bệnh.
        SurgeryStatus.EnsureCanCancelRequest(request.Status, "từ chối duyệt");

        request.Status = SurgeryStatus.RequestCancelled;
        // Lý do vào ô riêng (migration 176), KHÔNG ghi đè `Notes` — đó là ghi chú lâm sàng của phiếu.
        request.CancelReason = reason;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> ScheduleSurgeryAsync(ScheduleSurgeryDto dto, Guid userId)
    {
        try
        {
            // Sweep 2026-06-12: body rỗng từng tạo schedule zero-GUID (success giả) — validate yêu cầu mổ tồn tại.
            if (dto.SurgeryId == Guid.Empty
                || !await _context.Set<SurgeryRequest>().AnyAsync(r => r.Id == dto.SurgeryId))
                throw new InvalidOperationException("Khong tim thay yeu cau PTTT (surgeryId khong hop le)");

            var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);

            // QA0915: scheduling reset ANY status to 1 — a cancelled surgery came back to life and a
            // completed one lost its "completed" status. Only not-yet-started requests are schedulable.
            if (request != null)
            {
                if (request.Status == SurgeryStatus.RequestCancelled)
                    throw new InvalidOperationException("Ca mổ đã hủy, không lên lịch được. Hãy tạo yêu cầu mới.");
                if (request.Status == SurgeryStatus.RequestInProgress || request.Status == SurgeryStatus.RequestCompleted)
                    throw new InvalidOperationException($"Ca mổ đang ở trạng thái \"{SurgeryStatus.RequestLabel(request.Status)}\", không lên lịch lại được.");
            }

            // QA-R4 (2026-09-16): the scheduler accepted a date in the past, a zero/unknown operating room
            // (FK failure swallowed → 200 with an empty DTO), a negative duration, a second surgery in the
            // same room at the same time, and a surgery on a TT46-finalized record.
            await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, dto.SurgeryId);
            if (dto.EstimatedDurationMinutes <= 0)
                throw new ArgumentException("Thời lượng dự kiến của ca mổ phải lớn hơn 0 phút.", nameof(dto.EstimatedDurationMinutes));
            if (dto.ScheduledDate.Date < HIS.Core.Common.VnTime.TodayVn)
                throw new InvalidOperationException($"Không lên lịch mổ vào ngày đã qua ({dto.ScheduledDate:dd/MM/yyyy}).");
            if (dto.OperatingRoomId == Guid.Empty
                || !await _context.Set<OperatingRoom>().AnyAsync(r => r.Id == dto.OperatingRoomId && !r.IsDeleted))
                throw new KeyNotFoundException("Không tìm thấy phòng mổ (operatingRoomId không hợp lệ).");
            // QA-R6 (double-submit): the clash checks below read then write — two schedulers booking the same
            // room/patient at the same time both passed. One lock for all scheduling (low volume, no lock ordering).
            await using var scheduleTx = await HIS.Infrastructure.Data.SqlAppLock.BeginAsync(_context);
            await HIS.Infrastructure.Data.SqlAppLock.AcquireAsync(_context, "HIS.Surgery.Schedule",
                "Đang có người khác xếp lịch mổ, vui lòng thử lại.");
            var newStart = dto.ScheduledDate;
            var newEnd = newStart.AddMinutes(dto.EstimatedDurationMinutes);
            // QA-R6: the window was the same calendar day only, so a 23:30 case running past midnight never
            // clashed with a 00:30 case the next day. Also check the PATIENT: one person was booked into two
            // operating rooms at overlapping times (different requests).
            var patientId = request?.PatientId;
            var windowFrom = dto.ScheduledDate.Date.AddDays(-1);
            var windowTo = newEnd.Date.AddDays(1);
            var nearby = await _context.Set<SurgerySchedule>()
                .Where(s => (s.OperatingRoomId == dto.OperatingRoomId || s.SurgeryRequest.PatientId == patientId)
                    && s.SurgeryRequestId != dto.SurgeryId
                    && s.ScheduledDate >= windowFrom && s.ScheduledDate <= windowTo && !s.IsDeleted
                    && s.Status != SurgeryStatus.ScheduleCompleted
                    && s.SurgeryRequest.Status != SurgeryStatus.RequestCancelled)
                .Select(s => new { s.OperatingRoomId, s.ScheduledDateTime, s.EstimatedDuration, Code = s.SurgeryRequest.RequestCode, s.SurgeryRequest.PatientId })
                .ToListAsync();
            var overlapping = nearby.Where(s =>
                s.ScheduledDateTime < newEnd && s.ScheduledDateTime.AddMinutes(s.EstimatedDuration ?? 60) > newStart).ToList();
            var clash = overlapping.FirstOrDefault(s => s.OperatingRoomId == dto.OperatingRoomId);
            if (clash != null)
                throw new InvalidOperationException(
                    $"Phòng mổ đã có ca {clash.Code} lúc {clash.ScheduledDateTime:HH:mm dd/MM} ({clash.EstimatedDuration ?? 60} phút) trùng khung giờ này. Chọn giờ hoặc phòng khác.");
            var patientClash = overlapping.FirstOrDefault(s => patientId.HasValue && s.PatientId == patientId);
            if (patientClash != null)
                throw new InvalidOperationException(
                    $"Người bệnh đã có ca {patientClash.Code} lúc {patientClash.ScheduledDateTime:HH:mm dd/MM} ({patientClash.EstimatedDuration ?? 60} phút) trùng khung giờ này ở phòng mổ khác.");

            // QA0915: scheduling twice created a second schedule row; start/complete then picked an
            // arbitrary row (FirstOrDefault without order). Re-scheduling now moves the existing row.
            var schedule = await _context.Set<SurgerySchedule>()
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);
            if (schedule != null)
            {
                schedule.OperatingRoomId = dto.OperatingRoomId;
                schedule.ScheduledDate = dto.ScheduledDate.Date;
                schedule.ScheduledTime = dto.ScheduledDate.TimeOfDay;
                schedule.ScheduledDateTime = dto.ScheduledDate;
                schedule.EstimatedDuration = dto.EstimatedDurationMinutes;
                schedule.UpdatedAt = DateTime.Now;
                schedule.UpdatedBy = userId.ToString();
            }
            else
            {
                schedule = new SurgerySchedule
                {
                    Id = Guid.NewGuid(),
                    SurgeryRequestId = dto.SurgeryId,
                    OperatingRoomId = dto.OperatingRoomId,
                    ScheduledDate = dto.ScheduledDate.Date,
                    ScheduledTime = dto.ScheduledDate.TimeOfDay,
                    ScheduledDateTime = dto.ScheduledDate,
                    EstimatedDuration = dto.EstimatedDurationMinutes,
                    SurgeonId = userId,
                    Status = 0,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.Set<SurgerySchedule>().Add(schedule);
            }

            if (request != null)
            {
                request.Status = 1; // Đã lên lịch
            }

            await _context.SaveChangesAsync();
            if (scheduleTx != null) await scheduleTx.CommitAsync();
            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException or ArgumentException)
        {
            throw; // sweep 2026-06-12: lỗi nghiệp vụ KHÔNG nuốt — filter trả 400/404 (trước trả DTO rỗng 200 = success giả)
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"ScheduleSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ScheduleSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<List<SurgeryScheduleDto>> GetSurgeryScheduleAsync(DateTime date, Guid? operatingRoomId)
    {
        try
        {
            var query = _context.Set<SurgerySchedule>()
                .Include(s => s.SurgeryRequest)
                .ThenInclude(r => r.Patient)
                .Include(s => s.OperatingRoom)
                .Include(s => s.Surgeon)
                .Where(s => s.ScheduledDate.Date == date.Date && !s.IsDeleted);

            if (operatingRoomId.HasValue)
                query = query.Where(s => s.OperatingRoomId == operatingRoomId.Value);

            var schedules = await query.ToListAsync();

            var result = schedules
                .GroupBy(s => s.OperatingRoomId)
                .Select(g => new SurgeryScheduleDto
                {
                    Date = date,
                    OperatingRoomId = g.Key,
                    OperatingRoomName = g.First().OperatingRoom?.RoomName ?? "",
                    Surgeries = g.Select(s => new SurgeryScheduleItemDto
                    {
                        SurgeryId = s.SurgeryRequestId,
                        SurgeryCode = s.SurgeryRequest?.RequestCode ?? "",
                        PatientName = s.SurgeryRequest?.Patient?.FullName ?? "",
                        PatientCode = s.SurgeryRequest?.Patient?.PatientCode ?? "",
                        SurgeryServiceName = s.SurgeryRequest?.PlannedProcedure ?? "",
                        SurgeryType = int.TryParse(s.SurgeryRequest?.SurgeryType, out var st) ? st : 1,
                        SurgeryNature = s.SurgeryRequest?.Priority ?? 1,
                        ScheduledTime = s.ScheduledDateTime,
                        EstimatedDuration = s.EstimatedDuration ?? 60,
                        Status = s.Status,
                        StatusName = GetStatusName(s.Status),
                        SurgeonName = s.Surgeon?.FullName ?? ""
                    }).ToList()
                }).ToList();

            return result;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryScheduleAsync: missing table/column - {ex.Message}");
            return new List<SurgeryScheduleDto>();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryScheduleAsync error: {ex.Message}");
            return new List<SurgeryScheduleDto>();
        }
    }

    public async Task<SurgeryDto> CheckInPatientAsync(SurgeryCheckInDto dto, Guid userId)
    {
        try
        {
            var schedule = await _context.Set<SurgerySchedule>()
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

            // QA0915: unknown / unscheduled id returned 200 with an empty DTO.
            if (schedule == null)
                throw new InvalidOperationException("Khong tim thay lich mo cua ca nay (surgeryId khong hop le hoac chua len lich)");

            // QA0915 (P1): check-in wrote 2 over an IN-PROGRESS schedule (3), which re-opened
            // EnsureCanStart → a second "start" created a second surgery record for the same case.
            var checkInRequest = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
            SurgeryStatus.EnsureCanStart(checkInRequest?.Status ?? SurgeryStatus.RequestScheduled, schedule.Status);

            if (schedule != null)
            {
                schedule.Status = 2; // Đang chuẩn bị
                schedule.UpdatedAt = DateTime.Now;
                schedule.UpdatedBy = userId.ToString();
                await _context.SaveChangesAsync();
            }

            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (InvalidOperationException)
        {
            throw; // QA0915: business guard → 400 (was swallowed into 200)
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"CheckInPatientAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"CheckInPatientAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<PagedResultDto<SurgeryDto>> GetSurgeriesAsync(SurgerySearchDto dto)
    {
        try
        {
            var query = _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .Where(r => !r.IsDeleted);

            if (!string.IsNullOrEmpty(dto.Keyword))
            {
                query = query.Where(r =>
                    r.RequestCode.Contains(dto.Keyword) ||
                    r.Patient.FullName.Contains(dto.Keyword) ||
                    r.Patient.PatientCode.Contains(dto.Keyword));
            }

            if (dto.Status.HasValue)
                query = query.Where(r => r.Status == dto.Status.Value);

            if (dto.FromDate.HasValue)
                query = query.Where(r => r.RequestDate >= dto.FromDate.Value);

            if (dto.ToDate.HasValue)
                query = query.Where(r => r.RequestDate <= dto.ToDate.Value);

            // Filter by examination (OPD/CĐHA workflow)
            if (dto.ExaminationId.HasValue)
                query = query.Where(r => r.ExaminationId == dto.ExaminationId.Value);

            // Filter by medical record (inpatient workflow)
            if (dto.MedicalRecordId.HasValue)
                query = query.Where(r => r.MedicalRecordId == dto.MedicalRecordId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(Math.Max(0, dto.Page - 1) * dto.PageSize)
                .Take(dto.PageSize)
                .ToListAsync();

            return new PagedResultDto<SurgeryDto>
            {
                Items = items.Select(r => new SurgeryDto
                {
                    Id = r.Id,
                    SurgeryCode = r.RequestCode,
                    PatientId = r.PatientId,
                    PatientCode = r.Patient?.PatientCode ?? "",
                    PatientName = r.Patient?.FullName ?? "",
                    DateOfBirth = r.Patient?.DateOfBirth,
                    Gender = r.Patient?.Gender == 1 ? "Nam" : "Nữ",
                    MedicalRecordId = r.MedicalRecordId ?? Guid.Empty,
                    ExaminationId = r.ExaminationId,
                    SurgeryType = int.TryParse(r.SurgeryType, out var st) ? st : 1,
                    SurgeryTypeName = r.SurgeryType,
                    SurgeryNature = r.Priority,
                    SurgeryNatureName = r.Priority == 3 ? "Cấp cứu" : "Chương trình",
                    PreOperativeDiagnosis = r.PreOpDiagnosis,
                    PreOperativeIcdCode = r.PreOpIcdCode,
                    SurgeryServiceName = r.PlannedProcedure ?? "",
                    AnesthesiaType = r.AnesthesiaType ?? 1,
                    Status = r.Status,
                    StatusName = GetStatusName(r.Status),
                    CreatedAt = r.CreatedAt
                }).ToList(),
                TotalCount = totalCount,
                Page = dto.Page,
                PageSize = dto.PageSize
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeriesAsync: missing table/column - {ex.Message}");
            return new PagedResultDto<SurgeryDto> { Items = new List<SurgeryDto>(), TotalCount = 0, Page = dto.Page, PageSize = dto.PageSize };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeriesAsync error: {ex.Message}");
            return new PagedResultDto<SurgeryDto> { Items = new List<SurgeryDto>(), TotalCount = 0, Page = dto.Page, PageSize = dto.PageSize };
        }
    }

    public async Task<SurgeryDto?> GetSurgeryByIdAsync(Guid id)
    {
        try
        {
            var request = await _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return null;

            return new SurgeryDto
            {
                Id = request.Id,
                SurgeryCode = request.RequestCode,
                PatientId = request.PatientId,
                PatientCode = request.Patient?.PatientCode ?? "",
                PatientName = request.Patient?.FullName ?? "",
                DateOfBirth = request.Patient?.DateOfBirth,
                Gender = request.Patient?.Gender == 1 ? "Nam" : "Nữ",
                MedicalRecordId = request.MedicalRecordId ?? Guid.Empty,
                SurgeryType = int.TryParse(request.SurgeryType, out var st) ? st : 1,
                SurgeryTypeName = request.SurgeryType,
                SurgeryNature = request.Priority,
                SurgeryNatureName = request.Priority == 3 ? "Cấp cứu" : "Chương trình",
                PreOperativeDiagnosis = request.PreOpDiagnosis,
                PreOperativeIcdCode = request.PreOpIcdCode,
                SurgeryServiceName = request.PlannedProcedure ?? "",
                SurgeryMethod = request.PlannedProcedure,
                AnesthesiaType = request.AnesthesiaType ?? 1,
                Status = request.Status,
                StatusName = GetStatusName(request.Status),
                Description = request.Notes,
                CreatedAt = request.CreatedAt
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryByIdAsync: missing table/column - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryByIdAsync error: {ex.Message}");
            return null;
        }
    }

    public async Task<SurgeryDto> UpdateSurgeryStatusAsync(Guid surgeryId, int status, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (request != null)
        {
            request.Status = status;
            request.UpdatedAt = DateTime.Now;
            request.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }
        return await GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<bool> CancelSurgeryAsync(Guid surgeryId, string reason, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        // QA-R4: unknown id answered 200 + false (silent no-op) → 404.
        if (request == null) throw new KeyNotFoundException("Không tìm thấy yêu cầu phẫu thuật.");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, surgeryId); // TT46

        // #218/T3: hủy một ca ĐÃ MỔ XONG thì biên bản mổ vẫn nằm đó còn phiếu lại khai là đã hủy —
        // hai thứ nói ngược nhau về một việc đã thật sự xảy ra trên người bệnh.
        SurgeryStatus.EnsureCanCancelRequest(request.Status, "hủy");

        request.Status = SurgeryStatus.RequestCancelled;
        request.CancelReason = reason;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<SurgeryDto> SetTeamFeesAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> teamMembers, Guid userId)
        => throw NotImplementedYet("Chia tiền công ekip mổ");

    public Task<SurgeryFeeCalculationDto> CalculateTeamFeesAsync(Guid surgeryId)
        => throw NotImplementedYet("Tính tiền công ekip mổ");

    public Task<SurgeryProfitDto> CalculateProfitAsync(Guid surgeryId)
        => throw NotImplementedYet("Tính lãi/lỗ ca mổ");

    public Task<SurgeryCostCalculationDto> CalculateCostTT37Async(Guid surgeryId, bool hasTeamChange)
        => throw NotImplementedYet("Tính chi phí ca mổ theo TT37");

    public Task<SurgeryStatisticsDto> GetStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId)
        => throw NotImplementedYet("Thống kê phẫu thuật");

    #endregion

    /// <summary>
    /// QA-R6: team-fee / profit / TT37 cost / statistics / package endpoints were stubs answering 200 with
    /// invented staff names and money figures ("BS. Nguyễn Văn A", 150 surgeries, 8.500.000đ) or pretending
    /// to save. Refuse clearly instead (same policy as TT50 in SurgeryOperationServiceImpl.Execution).
    /// </summary>
    private static InvalidOperationException NotImplementedYet(string feature) =>
        new($"{feature} chưa được cài đặt trên máy chủ nên chưa có số liệu thật. Vui lòng báo quản trị.");

    #region 6.1.1 Gói PTTT & Định mức

    public Task<List<SurgeryPackageDto>> GetSurgeryPackagesAsync(Guid? surgeryServiceId)
        => Task.FromResult(new List<SurgeryPackageDto>()); // QA-R6: was 3 invented packages with random ids

    public Task<SurgeryPackageDto?> GetSurgeryPackageByIdAsync(Guid id)
        => Task.FromResult<SurgeryPackageDto?>(null); // QA-R6: echoed any id as "Gói cắt ruột thừa"

    public Task<SurgeryPackageDto> SaveSurgeryPackageAsync(SurgeryPackageDto dto, Guid userId)
        => throw NotImplementedYet("Lưu gói PTTT");

    public Task<bool> DeleteSurgeryPackageAsync(Guid id, Guid userId)
        => throw NotImplementedYet("Xóa gói PTTT");

    public Task<List<PackageMedicineNormDto>> GetPackageMedicineNormsAsync(Guid packageId)
        => Task.FromResult(new List<PackageMedicineNormDto>());

    public Task<List<PackageSupplyNormDto>> GetPackageSupplyNormsAsync(Guid packageId)
        => Task.FromResult(new List<PackageSupplyNormDto>());

    #endregion

    // Helper copy từ SurgeryCompleteService cũ
    private static string GetStatusName(int status) => status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đang thực hiện",
        3 => "Hoàn thành",
        4 => "Đã hủy",
        5 => "Hoãn",
        _ => "Không xác định"
    };
}
