using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;


namespace HIS.Infrastructure.Services;

// K9 phien 1 (2026-05-30): tach 1.1 Room Overview + 1.2 Queue System (~566 dong) khoi ReceptionCompleteService.
public partial class ReceptionCompleteService {
    #region 1.1 Room Overview

    public async Task<List<RoomOverviewDto>> GetRoomOverviewAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive);

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        var rooms = await query.ToListAsync();
        var result = new List<RoomOverviewDto>();

        foreach (var room in rooms)
        {
            var stats = await GetRoomStatsAsync(room.Id, date);
            result.Add(new RoomOverviewDto
            {
                RoomId = room.Id,
                RoomCode = room.RoomCode,
                RoomName = room.RoomName,
                RoomType = room.RoomType,
                DepartmentId = room.DepartmentId,
                DepartmentName = room.Department?.DepartmentName ?? "",
                TotalPatientsToday = stats.Total,
                WaitingCount = stats.Waiting,
                InProgressCount = stats.InProgress,
                WaitingResultCount = stats.WaitingResult,
                CompletedCount = stats.Completed,
                DoingLabCount = stats.DoingLab,
                MaxPatientsPerDay = room.MaxPatients,
                MaxInsurancePatientsPerDay = room.MaxInsurancePatients,
                InsurancePatientsToday = stats.InsuranceCount,
                RoomStatus = 1 // Active
            });
        }

        return result;
    }

    public async Task<RoomOverviewDto?> GetRoomDetailAsync(Guid roomId, DateTime date)
    {
        var room = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return null;

        var stats = await GetRoomStatsAsync(roomId, date);

        return new RoomOverviewDto
        {
            RoomId = room.Id,
            RoomCode = room.RoomCode,
            RoomName = room.RoomName,
            RoomType = room.RoomType,
            DepartmentId = room.DepartmentId,
            DepartmentName = room.Department?.DepartmentName ?? "",
            TotalPatientsToday = stats.Total,
            WaitingCount = stats.Waiting,
            InProgressCount = stats.InProgress,
            WaitingResultCount = stats.WaitingResult,
            CompletedCount = stats.Completed,
            DoingLabCount = stats.DoingLab,
            MaxPatientsPerDay = room.MaxPatients,
            MaxInsurancePatientsPerDay = room.MaxInsurancePatients,
            InsurancePatientsToday = stats.InsuranceCount,
            RoomStatus = 1
        };
    }

    public async Task<List<DoctorScheduleDto>> GetWorkingDoctorsAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Users
            .Where(u => u.IsActive && u.UserType == 1); // Type 1 = Bác sĩ (User.cs); type 2 là ĐIỀU DƯỠNG

        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        var doctors = await query.ToListAsync();

        return doctors.Select(d => new DoctorScheduleDto
        {
            DoctorId = d.Id,
            DoctorCode = d.UserCode,
            DoctorName = d.FullName,
            Specialty = d.Specialty,
            ScheduleDate = date,
            StartTime = new TimeSpan(7, 0, 0),
            EndTime = new TimeSpan(17, 0, 0),
            MaxPatients = 50,
            CurrentPatients = 0,
            IsAvailable = true
        }).ToList();
    }

    public async Task<List<DoctorScheduleDto>> GetDoctorScheduleAsync(Guid roomId, DateTime date)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        if (room == null) return new List<DoctorScheduleDto>();

        return await GetWorkingDoctorsAsync(room.DepartmentId, date);
    }

    public async Task<List<RoomOverviewDto>> GetAvailableRoomsAsync(Guid departmentId, int patientType, DateTime date)
    {
        var allRooms = await GetRoomOverviewAsync(departmentId, date);

        return allRooms.Where(r =>
            r.RoomStatus == 1 &&
            r.WaitingCount < r.MaxPatientsPerDay &&
            (patientType != 1 || r.InsurancePatientsToday < r.MaxInsurancePatientsPerDay))
            .ToList();
    }

    public async Task<List<AdmissionDto>> GetTodayAdmissionsAsync(Guid? roomId, DateTime date)
    {
        // CreatedAt lưu UTC; date là ngày local VN từ FE → so theo khoảng UTC của trọn ngày VN.
        // (Fix bug bảng tiếp đón rỗng khung 00h–07h sáng — xem HIS.Core.Common.VnTime.)
        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var query = _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .ThenInclude(r => r!.Department)
            .Where(m => m.CreatedAt >= fromUtc && m.CreatedAt < toUtc);

        if (roomId.HasValue)
        {
            query = query.Where(m => m.RoomId == roomId.Value);
        }

        var records = await query.OrderByDescending(m => m.CreatedAt).ToBoundedListAsync("Reception.GetTodayAdmissions");

        // Load today's queue tickets to map actual queue numbers
        // IssueDate chuẩn hóa UTC — dùng DayRangeUtc để so sánh đúng ngày VN.
        var (qtFromUtc164, qtToUtc164) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var patientIds = records.Where(r => r.PatientId != Guid.Empty).Select(r => r.PatientId).Distinct().ToList();
        var todayTickets = await _context.QueueTickets
            .Where(t => t.IssueDate >= qtFromUtc164 && t.IssueDate < qtToUtc164 && t.PatientId.HasValue && patientIds.Contains(t.PatientId.Value))
            .ToListAsync();

        // Build lookup: PatientId+RoomId → latest ticket
        var ticketLookup = todayTickets
            .GroupBy(t => new { t.PatientId, t.RoomId })
            .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.IssueDate).First());

        // Load latest Examination per MedicalRecord — cần examinationId để in phiếu khám (OPD).
        var medicalRecordIds = records.Select(r => r.Id).ToList();
        var examinations = await _context.Examinations
            .Include(e => e.Doctor)
            .Where(e => medicalRecordIds.Contains(e.MedicalRecordId))
            .Select(e => new { e.MedicalRecordId, e.Id, e.CreatedAt, e.Status, e.StartTime, e.EndTime, DoctorName = e.Doctor != null ? e.Doctor.FullName : null })
            .ToListAsync();
        var examLookup = examinations
            .GroupBy(e => e.MedicalRecordId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedAt).First());

        var result = records.Select(m => {
            var ticket = ticketLookup.GetValueOrDefault(new { PatientId = (Guid?)m.PatientId, RoomId = m.RoomId });
            var dto = BuildAdmissionDto(m, ticket);
            if (examLookup.TryGetValue(m.Id, out var exam))
            {
                dto.ExaminationId = exam.Id;
                dto.Status = exam.Status switch
                {
                    HIS.Core.Constants.ExaminationStatus.InProgress => "InProgress",
                    HIS.Core.Constants.ExaminationStatus.PendingCLS => "PendingCLS",
                    HIS.Core.Constants.ExaminationStatus.WaitingConclusion => "WaitingConclusion",
                    HIS.Core.Constants.ExaminationStatus.Completed => "Completed",
                    HIS.Core.Constants.ExaminationStatus.Cancelled => "Cancelled",
                    _ => "Waiting",
                };
                dto.StatusName = HIS.Core.Constants.ExaminationStatus.GetName(exam.Status);
                dto.DoctorName = exam.DoctorName;
                dto.StartedAt = exam.StartTime;
                dto.CompletedAt = exam.EndTime;
            }
            return dto;
        }).ToList();
        return result;
    }

    private static AdmissionDto BuildAdmissionDto(MedicalRecord m, QueueTicket? ticket)
    {
        var dob = m.Patient?.DateOfBirth;
        var yob = m.Patient?.YearOfBirth;
        int? age = null;
        if (dob.HasValue)
        {
            var today = DateTime.Today;
            var a = today.Year - dob.Value.Year;
            if (dob.Value.Date > today.AddYears(-a)) a--;
            age = a;
        }
        else if (yob.HasValue && yob.Value > 1900 && yob.Value <= DateTime.Today.Year)
        {
            age = DateTime.Today.Year - yob.Value;
        }

        var hasValidInsurance = !string.IsNullOrWhiteSpace(m.Patient?.InsuranceNumber);
        var statusLabel = m.Status switch { 0 => "Waiting", 1 => "InProgress", 2 => "WaitingResult", _ => "Completed" };
        var statusVi    = m.Status switch { 0 => "Chờ tiếp đón", 1 => "Đang khám", 2 => "Chờ kết quả", _ => "Hoàn thành" };
        var treatmentVi = m.TreatmentType switch
        {
            1 => "Khám BHYT",
            2 => "Khám dịch vụ",
            3 => "Cấp cứu",
            4 => "Khám theo yêu cầu",
            _ => "Khám thường",
        };
        var patientTypeVi = m.PatientType switch
        {
            1 => "BHYT",
            2 => "Viện phí",
            3 => "Dịch vụ",
            _ => "Khác",
        };
        var priority = m.TreatmentType == 3 ? 1 : (ticket?.Priority ?? 0);
        var priorityVi = priority switch { 1 => "Cấp cứu", 2 => "Ưu tiên", _ => "Thường" };

        return new AdmissionDto
        {
            Id = m.Id,
            AdmissionCode = m.MedicalRecordCode,
            PatientId = m.PatientId,
            PatientCode = m.Patient?.PatientCode ?? "",
            PatientName = m.Patient?.FullName ?? "",
            DateOfBirth = dob,
            YearOfBirth = yob,
            Age = age ?? 0,
            Gender = m.Patient?.Gender == 1 ? "Nam" : m.Patient?.Gender == 2 ? "Nữ" : "Khác",
            GenderName = m.Patient?.Gender == 1 ? "Nam" : m.Patient?.Gender == 2 ? "Nữ" : "Khác",
            Address = m.Patient?.Address,
            PhoneNumber = m.Patient?.PhoneNumber,
            IdentityNumber = m.Patient?.IdentityNumber,
            InsuranceNumber = m.Patient?.InsuranceNumber,
            InsuranceFacilityName = m.Patient?.InsuranceFacilityName,
            IsInsuranceValid = hasValidInsurance,
            AdmissionDate = m.AdmissionDate != default ? m.AdmissionDate : m.CreatedAt,
            DepartmentId = m.DepartmentId ?? m.Room?.DepartmentId ?? Guid.Empty,
            DepartmentName = m.Room?.Department?.DepartmentName,
            RoomId = m.RoomId,
            RoomName = m.Room?.RoomName,
            Status = statusLabel,
            StatusName = statusVi,
            PatientType = m.PatientType,
            PatientTypeName = patientTypeVi,
            TreatmentType = m.TreatmentType,
            TreatmentTypeName = treatmentVi,
            ChiefComplaint = m.InitialDiagnosis,
            DoctorName = null,
            IsEmergency = m.TreatmentType == 3,
            IsPriority = m.TreatmentType == 3 || priority == 2,
            QueueNumber = ticket?.QueueNumber ?? 0,
            QueueCode = ticket?.TicketNumber ?? "",
            TicketId = ticket?.Id,
            TicketStatus = ticket?.Status,
            Priority = priority,
            PriorityName = priorityVi,
            Notes = m.DischargeNote ?? ""
        };
    }

    public async Task<List<AdmissionDto>> SearchPatientsAsync(string keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword)) return new List<AdmissionDto>();

        var kw = keyword.Trim();
        var today = HIS.Core.Common.VnTime.TodayVn;
        var (todayFromUtc, todayToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(today);

        // Search across all recent medical records (not just today) so the
        // reception search bar can find historical patients. The
        // "today's reception queue" use case is served by
        // GetTodayAdmissionsAsync; this one is a free-text patient lookup.
        // Patient PII fields use randomized encryption and cannot participate in
        // SQL LIKE. Load a bounded recent candidate set, let EF decrypt it, then
        // apply the combined code/name/CCCD/BHYT/phone search in memory.
        var candidates = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .ThenInclude(r => r!.Department)
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Take(5000)
            .ToListAsync();
        var records = candidates
            .Where(m =>
                m.MedicalRecordCode.Contains(kw, StringComparison.OrdinalIgnoreCase)
                || (m.Patient?.PatientCode?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Patient?.FullName?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Patient?.IdentityNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Patient?.InsuranceNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Patient?.PhoneNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false))
            .Take(50)
            .ToList();

        // BUG-017: Load queue tickets to map actual queue numbers (same as GetTodayAdmissionsAsync)
        // IssueDate chuẩn hóa UTC — dùng DayRangeUtc để so sánh đúng ngày VN.
        var patientIds = records.Where(r => r.PatientId != Guid.Empty).Select(r => r.PatientId).Distinct().ToList();
        var todayTickets = await _context.QueueTickets
            .Where(t => t.IssueDate >= todayFromUtc && t.IssueDate < todayToUtc && t.PatientId.HasValue && patientIds.Contains(t.PatientId.Value))
            .ToListAsync();
        var ticketLookup = todayTickets
            .GroupBy(t => new { t.PatientId, t.RoomId })
            .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.IssueDate).First());

        return records.Select(m => {
            var ticket = ticketLookup.GetValueOrDefault(new { PatientId = (Guid?)m.PatientId, RoomId = m.RoomId });
            return BuildAdmissionDto(m, ticket);
        }).ToList();
    }

    #endregion

    #region 1.2 Queue System

    public async Task<QueueTicketDto> IssueQueueTicketAsync(IssueQueueTicketDto dto)
    {
        var today = HIS.Core.Common.VnTime.TodayVn; // Local VN date — dùng cho reset daily
        var (iqFromUtc, iqToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(today);

        // Quầy kéo một vé đang cầm vào đăng ký: cùng phòng + cùng loại hàng đợi thì DÙNG LẠI chính
        // vé đó, người bệnh giữ nguyên con số. Khác loại (vé quầy tiếp đón → đăng ký vào phòng
        // khám) thì đóng vé cũ lại và cấp vé mới, vì hai hàng đợi đó gọi số độc lập nhau.
        if (dto.SourceQueueTicketId.HasValue)
        {
            var source = await _context.QueueTickets.FirstOrDefaultAsync(
                t => t.Id == dto.SourceQueueTicketId.Value && !t.IsDeleted);

            if (source != null)
            {
                if (source.RoomId == dto.RoomId && source.QueueType == dto.QueueType)
                {
                    source.PatientId ??= dto.PatientId;
                    source.MedicalRecordId = dto.MedicalRecordId;
                    source.Status = 0; // về hàng chờ của phòng, chờ gọi khám
                    await _unitOfWork.SaveChangesAsync();
                    return (await GetQueueTicketByIdAsync(source.Id))!;
                }

                source.Status = 3; // Hoàn thành — đã xong việc ở hàng đợi cũ
                source.CompletedTime = DateTime.UtcNow;
                source.PatientId ??= dto.PatientId;
            }
        }

        // Vé phát ra từ một lịch hẹn: dùng lại số đã GIỮ SẴN khi đặt lịch (migration 187).
        //
        // Không làm thế thì người bệnh xem số "B007" trên app từ hôm trước, đến quầy tiếp đón lại
        // được phát "B031" — con số họ nhớ trở thành vô nghĩa, và số cũ vẫn nằm chiếm chỗ trong dãy.
        Appointment? sourceAppointment = null;
        if (dto.AppointmentId.HasValue)
        {
            sourceAppointment = await _context.Appointments.FirstOrDefaultAsync(
                a => a.Id == dto.AppointmentId.Value && !a.IsDeleted);

            // Worker đã phát vé đầu ngày rồi: trả về chính vé đó, không phát vé thứ hai (và cũng
            // không vấp vào luật chống trùng vé bên dưới).
            if (sourceAppointment?.QueueTicketId is Guid existingTicketId)
            {
                var existing = await GetQueueTicketByIdAsync(existingTicketId);
                if (existing != null)
                {
                    // Phải lưu trước khi trả về sớm. Bên gọi (tiếp đón) vừa Add hồ sơ khám + phiên
                    // khám và TRÔNG CHỜ hàm này lưu — mọi nhánh khác đều lưu. Trả về mà không lưu
                    // thì ngay sau đó phiên khám chưa từng nằm trong CSDL bị đánh dấu Modified, EF
                    // phát một câu UPDATE vào dòng không tồn tại và ném
                    // DbUpdateConcurrencyException: lượt khám không được tạo, người bệnh "đã đến"
                    // mà không có tên trong danh sách nào.
                    await _unitOfWork.SaveChangesAsync();
                    return existing;
                }
            }
        }

        // Get or create queue config
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == dto.RoomId && c.QueueType == dto.QueueType);

        if (config == null)
        {
            config = new QueueConfiguration
            {
                Id = Guid.NewGuid(),
                RoomId = dto.RoomId,
                QueueType = dto.QueueType,
                Prefix = dto.QueueType == 1 ? "A" : dto.QueueType == 2 ? "B" : "C",
                StartNumber = 1,
                CurrentNumber = 1,
                ResetDaily = true,
                LastResetDate = today,
                MaxPatients = 200,
                MaxInsurancePatients = 100,
                IsActive = true,
                CreatedAt = DateTime.Now,
                IsDeleted = false
            };
            await _context.QueueConfigurations.AddAsync(config);
        }
        else if (config.ResetDaily && config.LastResetDate < today)
        {
            config.LastResetDate = today;
        }

        // Số kế tiếp lấy từ dãy DÙNG CHUNG của (phòng, ngày) — migration 187.
        //
        // Trước đây số lấy từ bộ đếm `config.CurrentNumber`, vốn không biết gì về các số đã GIỮ SẴN
        // cho lịch hẹn trong ngày. Giữ nguyên thì khách bốc số tại quầy sẽ nhận trúng số mà một
        // người đặt lịch trên app đang cầm, và hai người cùng cầm "B007" đến trước một cửa phòng.
        // Bộ đếm vẫn được cập nhật cho các màn hình đang đọc nó.
        var nextNumber = await AppointmentQueueAllocator.NextNumberAsync(
            _context, dto.RoomId, today, dto.QueueType);
        config.CurrentNumber = nextNumber + 1;

        // Số đã giữ cho lịch hẹn thì lấy đúng số đó, không lấy số kế tiếp.
        var reservedNumber = sourceAppointment?.QueueNumber;
        var reservedCode = sourceAppointment?.QueueCode;
        if (reservedNumber.HasValue) nextNumber = reservedNumber.Value;

        var room = await _roomRepo.GetByIdAsync(dto.RoomId);

        // R3 đa cơ sở: chi nhánh phiếu theo phòng (Room.BranchId, fallback khoa của phòng) — best-effort
        Guid? ticketBranchId = room?.BranchId;
        if (ticketBranchId == null && room != null)
            ticketBranchId = await _context.Departments.AsNoTracking()
                .Where(d => d.Id == room.DepartmentId)
                .Select(d => d.BranchId)
                .FirstOrDefaultAsync();

        // Check duplicate ticket: same patient, same room, same day
        // IssueDate chuẩn hóa UTC — dùng DayRangeUtc để so sánh đúng ngày VN.
        //
        // CHỈ chặn khi biết đích danh bệnh nhân. Trước đây điều kiện là `t.PatientId == dto.PatientId`
        // với cả hai vế null: EF dịch thành `PatientId IS NULL AND @p IS NULL`, nên MỘT vé vô danh
        // bất kỳ trong phòng đã chặn mọi khách vãng lai tiếp theo của cả ngày. Không có định danh thì
        // không có cơ sở nào để nói hai người là một.
        if (dto.PatientId.HasValue && sourceAppointment == null)
        {
            var existingTicket = await _context.QueueTickets
                .FirstOrDefaultAsync(t => t.PatientId == dto.PatientId
                    && t.RoomId == dto.RoomId
                    && t.IssueDate >= iqFromUtc && t.IssueDate < iqToUtc
                    && t.Status < 2); // Waiting or InProgress
            if (existingTicket != null)
                throw new InvalidOperationException($"Bệnh nhân đã có số thứ tự {existingTicket.TicketNumber} tại phòng này hôm nay");
        }

        var ticket = new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = reservedCode ?? $"{config.Prefix}{nextNumber:D3}",
            QueueNumber = nextNumber,
            IssueDate = DateTime.UtcNow, // Chuẩn hóa UTC — query dùng DayRangeUtc để so sánh đúng ngày VN
            QueueType = dto.QueueType,
            Priority = dto.Priority,
            PriorityReason = dto.PriorityReason,
            PriorityVerified = dto.Priority > 0 && dto.PriorityVerified,
            Status = 0, // Waiting
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            RoomId = dto.RoomId,
            BranchId = ticketBranchId, // R3 đa cơ sở
            Notes = dto.Source,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _context.QueueTickets.AddAsync(ticket);

        if (sourceAppointment != null)
        {
            sourceAppointment.QueueTicketId = ticket.Id;
            // Lịch hẹn cũ chưa có số giữ sẵn (đặt trước migration 187): ghi lại số vừa cấp để màn
            // quản lý đặt lịch và app cùng thấy một con số.
            sourceAppointment.QueueNumber ??= ticket.QueueNumber;
            sourceAppointment.QueueCode ??= ticket.TicketNumber;
            sourceAppointment.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            QueueDate = ticket.IssueDate,
            PatientId = ticket.PatientId,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = room?.RoomName ?? "",
            QueueType = ticket.QueueType,
            Priority = ticket.Priority,
            PriorityReason = ticket.PriorityReason,
            PriorityVerified = ticket.PriorityVerified,
            Status = ticket.Status,
            EstimatedWaitMinutes = await CalculateEstimatedWaitAsync(dto.RoomId, dto.QueueType)
        };
    }

    public async Task<QueueTicketDto> IssueQueueTicketMobileAsync(MobileQueueTicketDto dto)
    {
        // Find patient by phone
        var patient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByPhoneNumberDecryptedAsync(dto.PatientPhone);

        var (priority, reason, verified) = ResolveMobilePriority(dto.PriorityReason, patient);

        return await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient?.Id,
            PatientName = dto.PatientName ?? patient?.FullName,
            RoomId = dto.RoomId,
            QueueType = dto.QueueType,
            Priority = priority,
            PriorityReason = reason,
            PriorityVerified = verified,
            Source = "Mobile"
        });
    }

    /// <summary>
    /// Quyết định mức ưu tiên cho số thứ tự xin qua app (HSMT app mobile I.2 #3, migration 184).
    ///
    /// Nguyên tắc: <b>không tin thẳng lời khai</b>.
    /// <list type="bullet">
    /// <item>Tuổi suy ra được từ ngày sinh trong hồ sơ, nên tự đối chiếu và đánh dấu đã xác minh.
    ///       Người bệnh khai "cao tuổi" mà hồ sơ ghi 30 tuổi thì không được ưu tiên.</item>
    /// <item>Người đủ điều kiện theo tuổi thì <b>được ưu tiên kể cả khi không khai</b> — người cao
    ///       tuổi thường là nhóm ít rành thao tác trên app nhất.</item>
    /// <item>Lý do không kiểm được (có thai, khuyết tật nặng, người có công) vẫn được cấp số ưu tiên
    ///       — chặn thì tính năng thành vô nghĩa — nhưng đánh dấu <c>PriorityVerified = false</c> để
    ///       quầy lễ tân xác minh khi gọi. Nếu ai khai gì cũng được ưu tiên mà không ai biết, người
    ///       ưu tiên THẬT sẽ là người bị thiệt.</item>
    /// <item>Không có hồ sơ trong HIS thì không tự đối chiếu được gì: cho ưu tiên theo lời khai
    ///       nhưng chưa xác minh.</item>
    /// </list>
    /// Cấp cứu (mức 2) cố ý KHÔNG cấp qua app: người cấp cứu vào thẳng khoa cấp cứu, không ngồi
    /// bấm điện thoại xin số.
    /// </summary>
    private static (int Priority, int? Reason, bool Verified) ResolveMobilePriority(
        int? declaredReason, Patient? patient)
    {
        const int ReasonElderly = 1;
        const int ReasonYoungChild = 2;

        var age = CalculateAgeInVn(patient);

        // Ngưỡng theo Luật Người cao tuổi (từ đủ 60) và trẻ em dưới 6 tuổi — hai nhóm được ưu tiên
        // khám bệnh theo quy định hiện hành.
        if (age is >= 60) return (1, ReasonElderly, true);
        if (age is < 6) return (1, ReasonYoungChild, true);

        if (declaredReason is null or 0) return (0, null, false);

        // Khai là cao tuổi hoặc trẻ em nhưng ngày sinh nói khác: từ chối, không phải nghi ngờ ai
        // mà vì đây là điều đối chiếu được nên phải đối chiếu.
        if (age is not null && (declaredReason == ReasonElderly || declaredReason == ReasonYoungChild))
            return (0, null, false);

        // Cấp cứu không đi đường này.
        if (declaredReason == 6) return (0, null, false);

        return (1, declaredReason, false);
    }

    /// <summary>Tuổi tính theo ngày giờ Việt Nam; null nếu hồ sơ không có ngày sinh.</summary>
    private static int? CalculateAgeInVn(Patient? patient)
    {
        var dateOfBirth = patient?.DateOfBirth;
        if (dateOfBirth is null) return null;

        // VnTime.TodayVn trả DateTime đã cắt giờ; dùng DateOnly để so sánh cho khỏi lẫn phần giờ.
        var today = DateOnly.FromDateTime(HIS.Core.Common.VnTime.TodayVn);
        var birthDate = DateOnly.FromDateTime(dateOfBirth.Value);
        var age = today.Year - birthDate.Year;

        // Chưa tới sinh nhật năm nay thì trừ đi một tuổi.
        if (birthDate > today.AddYears(-age)) age--;

        return age < 0 ? null : age;
    }

    public async Task<QueueTicketDto?> CallNextAsync(Guid roomId, int queueType, Guid userId)
    {
        var (cnFromUtc, cnToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);

        var nextTicket = await _context.QueueTickets
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate >= cnFromUtc && t.IssueDate < cnToUtc &&
                       t.Status == 0) // Waiting
            .OrderBy(t => t.Priority == 2 ? 0 : t.Priority == 1 ? 1 : 2) // Emergency first
            .ThenBy(t => t.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextTicket == null) return null;

        await EnsureAppointmentRecordAsync(nextTicket);

        nextTicket.Status = 1; // Calling
        nextTicket.CalledTime = DateTime.Now;
        nextTicket.CalledByUserId = userId;
        await SyncMedicalRecordStatusAsync(nextTicket, mrStatus: 1); // InProgress on the MR side

        await _unitOfWork.SaveChangesAsync();

        return await GetQueueTicketByIdAsync(nextTicket.Id);
    }

    public async Task<QueueTicketDto> CallSpecificAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new KeyNotFoundException("Ticket not found");

        await EnsureAppointmentRecordAsync(ticket);

        ticket.Status = 1; // Calling
        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 1); // InProgress on the MR side

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketStatusDto?> GetQueueTicketStatusAsync(Guid ticketId)
    {
        var ticket = await _context.QueueTickets
            .Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted);

        if (ticket == null) return null;

        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);

        // Đếm số người đứng TRƯỚC vé này theo đúng thứ tự mà CallNextAsync sẽ gọi: ưu tiên cao hơn
        // đi trước, cùng mức ưu tiên thì số nhỏ đi trước. Đếm kiểu khác sẽ ra một con số không khớp
        // với thực tế người bệnh nhìn thấy ở phòng khám.
        var peopleAhead = ticket.Status == 0
            ? await _context.QueueTickets.CountAsync(t =>
                t.RoomId == ticket.RoomId &&
                t.QueueType == ticket.QueueType &&
                t.IssueDate >= fromUtc && t.IssueDate < toUtc &&
                t.Status == 0 &&
                !t.IsDeleted &&
                (t.Priority > ticket.Priority ||
                 (t.Priority == ticket.Priority && t.QueueNumber < ticket.QueueNumber)))
            : 0;

        var currentServing = await _context.QueueTickets
            .Where(t => t.RoomId == ticket.RoomId &&
                        t.QueueType == ticket.QueueType &&
                        t.IssueDate >= fromUtc && t.IssueDate < toUtc &&
                        (t.Status == 1 || t.Status == 2) &&
                        !t.IsDeleted)
            .OrderByDescending(t => t.CalledTime)
            .Select(t => t.TicketNumber)
            .FirstOrDefaultAsync();

        var averageWait = ticket.RoomId.HasValue
            ? await CalculateEstimatedWaitAsync(ticket.RoomId.Value, ticket.QueueType)
            : 0;

        return new QueueTicketStatusDto
        {
            TicketId = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = ticket.Room?.RoomName ?? "",
            Status = ticket.Status,
            Priority = ticket.Priority,
            PriorityVerified = ticket.PriorityVerified,
            CurrentServingTicket = currentServing,
            PeopleAhead = peopleAhead,
            EstimatedWaitMinutes = averageWait,
        };
    }

    public async Task<QueueTicketDto> RecallAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new KeyNotFoundException("Ticket not found");

        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> SkipAsync(Guid ticketId, Guid userId, string? reason)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new KeyNotFoundException("Ticket not found");

        ticket.Status = 4; // Skipped
        ticket.Notes = reason;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 0); // back to waiting (no-show)

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> StartServingAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new KeyNotFoundException("Ticket not found");

        ticket.Status = 2; // Serving
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 1); // InProgress

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> CompleteServingAsync(Guid ticketId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new KeyNotFoundException("Ticket not found");

        ticket.Status = 3; // Completed
        ticket.CompletedTime = DateTime.Now;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 3); // Completed

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    /// <summary>
    /// Mở hồ sơ khám cho vé sinh ra từ lịch hẹn, ngay lúc phòng khám gọi số (migration 187).
    ///
    /// <para>Người đặt lịch trên app được giữ số từ trước và vé tự vào hàng đợi đầu ngày, nên có
    /// thể bị gọi mà chưa ai bấm tiếp đón. Không mở hồ sơ ở đây thì bệnh nhân bước vào phòng còn
    /// bác sĩ không có gì trên màn hình.</para>
    ///
    /// <para>Cố ý mở hồ sơ ở bước GỌI SỐ chứ không phải lúc phát vé đầu ngày: người không đến sẽ
    /// không bao giờ được gọi, nên không đẻ ra hồ sơ khám rỗng và không làm sai thống kê vắng mặt.</para>
    /// </summary>
    private async Task EnsureAppointmentRecordAsync(QueueTicket ticket)
    {
        if (ticket.MedicalRecordId.HasValue) return;

        // Điều kiện chỉ là "lịch chưa huỷ / chưa đánh dấu vắng". CỐ Ý không đòi Status < 2: một
        // lịch đã mang nhãn "đã đến" nhưng chưa có hồ sơ là chuyện có thật (bấm nhầm nút, hoặc lỗi
        // tiếp đón cũ), và đó chính là ca cần cứu nhất — người bệnh đang đứng trước cửa phòng.
        var appointment = await _context.Appointments.FirstOrDefaultAsync(
            a => !a.IsDeleted && a.QueueTicketId == ticket.Id && a.Status < 3);
        if (appointment == null) return;

        // Lễ tân vừa tiếp đón tay cho chính người này: gắn vé vào hồ sơ đang mở, không mở hồ sơ
        // thứ hai cho cùng một lượt khám.
        var active = await AppointmentCheckin.FindActiveRecordAsync(_context, appointment.PatientId);
        if (active != null)
        {
            ticket.MedicalRecordId = active.Id;
            appointment.Status = 2; // Đã đến khám
            appointment.UpdatedAt = DateTime.UtcNow;
            return;
        }

        await AppointmentCheckin.CreateRecordAsync(
            _context, appointment, ticket, HIS.Core.Common.VnTime.TodayVn);
    }

    /// <summary>
    /// Keep MedicalRecord.Status in sync with QueueTicket.Status so the
    /// reception list (which reads from MedicalRecord) reflects the
    /// latest queue action without a separate write from the controller.
    /// </summary>
    private async Task SyncMedicalRecordStatusAsync(QueueTicket ticket, int mrStatus)
    {
        if (ticket.MedicalRecordId.HasValue)
        {
            var mr = await _context.MedicalRecords.FindAsync(ticket.MedicalRecordId.Value);
            if (mr != null) mr.Status = mrStatus;
        }
    }

    public async Task<List<QueueTicketDto>> GetWaitingListAsync(Guid roomId, int queueType, DateTime date)
    {
        var (wlFromUtc, wlToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate >= wlFromUtc && t.IssueDate < wlToUtc &&
                       t.Status == 0)
            .OrderBy(t => t.Priority == 2 ? 0 : t.Priority == 1 ? 1 : 2)
            .ThenBy(t => t.QueueNumber)
            .ToListAsync();

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<List<PendingCheckinTicketDto>> GetPendingCheckinTicketsAsync(DateTime date)
    {
        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);

        // Vé còn sống trong ngày (chờ / đang gọi / đang phục vụ) mà chưa gắn hồ sơ khám.
        // Vé của lịch hẹn tự mở hồ sơ lúc gọi số nên sẽ tự rớt khỏi danh sách này.
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => !t.IsDeleted
                && t.IssueDate >= fromUtc && t.IssueDate < toUtc
                && t.Status < 3
                && t.MedicalRecordId == null)
            .OrderBy(t => t.QueueType)
            .ThenBy(t => t.QueueNumber)
            .ToBoundedListAsync("Reception.GetPendingCheckinTickets");

        // Vé sinh ra từ lịch hẹn: nêu mã hẹn để quầy biết người này đã đặt lịch từ trước.
        var ticketIds = tickets.Select(t => t.Id).ToList();
        var appointmentByTicket = await _context.Appointments
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.QueueTicketId != null && ticketIds.Contains(a.QueueTicketId!.Value))
            .Select(a => new { TicketId = a.QueueTicketId!.Value, a.AppointmentCode })
            .ToDictionaryAsync(x => x.TicketId, x => x.AppointmentCode);

        var nowUtc = DateTime.UtcNow;

        return tickets.Select(t => new PendingCheckinTicketDto
        {
            TicketId = t.Id,
            TicketCode = t.TicketNumber,
            QueueNumber = t.QueueNumber,
            QueueType = t.QueueType,
            QueueTypeName = t.QueueType switch
            {
                1 => "Tiếp đón",
                2 => "Khám bệnh",
                3 => "Xét nghiệm",
                4 => "CĐHA",
                5 => "Lĩnh thuốc",
                _ => "Khác",
            },
            RoomId = t.RoomId,
            RoomName = t.Room?.RoomName,
            PatientId = t.PatientId,
            PatientCode = t.Patient?.PatientCode,
            PatientName = t.Patient?.FullName,
            PhoneNumber = t.Patient?.PhoneNumber,
            Priority = t.Priority,
            PriorityVerified = t.PriorityVerified,
            Status = t.Status,
            StatusName = t.Status switch { 0 => "Chờ", 1 => "Đang gọi", 2 => "Đang phục vụ", _ => "Khác" },
            IssuedAt = t.IssueDate,
            WaitingMinutes = (int)Math.Max(0, (nowUtc - t.IssueDate).TotalMinutes),
            AppointmentCode = appointmentByTicket.GetValueOrDefault(t.Id),
        }).ToList();
    }

    public async Task<List<QueueTicketDto>> GetServingListAsync(Guid roomId, int queueType, DateTime date)
    {
        var (slFromUtc, slToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate >= slFromUtc && t.IssueDate < slToUtc &&
                       t.Status == 2)
            .ToBoundedListAsync("Reception.GetServingList");

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<QueueDisplayDto> GetDisplayDataAsync(Guid roomId, int queueType)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        var today = HIS.Core.Common.VnTime.TodayVn;
        var (gdFromUtc, gdToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(today);

        var currentServing = await _context.QueueTickets
            .Include(t => t.Patient)
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate >= gdFromUtc && t.IssueDate < gdToUtc && t.Status == 2)
            .FirstOrDefaultAsync();

        var callingList = await GetCallingTicketsAsync(roomId, 5, queueType);
        var waitingList = await GetWaitingListAsync(roomId, queueType, today);

        return new QueueDisplayDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            CurrentServing = currentServing != null ? MapToQueueTicketDto(currentServing) : null,
            CallingList = callingList,
            WaitingList = waitingList.Take(10).ToList(),
            TotalWaiting = waitingList.Count,
            AverageWaitMinutes = await CalculateEstimatedWaitAsync(roomId, queueType)
        };
    }

    /// <summary>
    /// Những vé đang được gọi ở một phòng.
    /// </summary>
    /// <param name="queueType">
    /// Lọc theo loại hàng đợi. BỎ TRỐNG là lấy mọi loại — chỉ đúng khi người gọi thật sự muốn xem
    /// cả phòng.
    ///
    /// Bảng chiếu BẮT BUỘC truyền giá trị này. Trước đây nó không truyền, nên bảng mở hàng đợi
    /// "Khám bệnh" vẫn hiện — và đọc loa — vé của hàng đợi "Tiếp đón" cùng phòng: gọi nhầm người
    /// không nằm trong hàng đó.
    /// </param>
    public async Task<List<QueueTicketDto>> GetCallingTicketsAsync(Guid roomId, int limit = 5, int? queueType = null)
    {
        var (ctFromUtc, ctToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId && t.IssueDate >= ctFromUtc && t.IssueDate < ctToUtc && t.Status == 1)
            .Where(t => queueType == null || t.QueueType == queueType)
            .OrderByDescending(t => t.CalledTime)
            .Take(limit)
            .ToListAsync();

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<QueueTicketDto?> GetQueueTicketByIdAsync(Guid id)
    {
        var ticket = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Include(t => t.CalledByUser)
            .FirstOrDefaultAsync(t => t.Id == id);

        return ticket != null ? MapToQueueTicketDto(ticket) : null;
    }

    #endregion
}
