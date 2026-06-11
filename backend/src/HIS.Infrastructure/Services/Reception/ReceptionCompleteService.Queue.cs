using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
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
            .Where(u => u.IsActive && u.UserType == 2); // 2 = Doctor

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

        var records = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();

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
            .Where(e => medicalRecordIds.Contains(e.MedicalRecordId))
            .Select(e => new { e.MedicalRecordId, e.Id, e.CreatedAt })
            .ToListAsync();
        var examLookup = examinations
            .GroupBy(e => e.MedicalRecordId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedAt).First().Id);

        var result = records.Select(m => {
            var ticket = ticketLookup.GetValueOrDefault(new { PatientId = (Guid?)m.PatientId, RoomId = m.RoomId });
            var dto = BuildAdmissionDto(m, ticket);
            if (examLookup.TryGetValue(m.Id, out var examId))
                dto.ExaminationId = examId;
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

        var kw = keyword.Trim().ToLower();
        var pattern = $"%{kw}%";
        var today = HIS.Core.Common.VnTime.TodayVn;
        var (todayFromUtc, todayToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(today);

        // Search across all recent medical records (not just today) so the
        // reception search bar can find historical patients. The
        // "today's reception queue" use case is served by
        // GetTodayAdmissionsAsync; this one is a free-text patient lookup.
        var records = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .ThenInclude(r => r!.Department)
            .Where(m =>
                (EF.Functions.Like(m.MedicalRecordCode, pattern) ||
                 EF.Functions.Like(m.Patient!.PatientCode, pattern) ||
                 EF.Functions.Like(m.Patient.FullName, pattern) ||
                 (m.Patient.IdentityNumber != null && EF.Functions.Like(m.Patient.IdentityNumber, pattern)) ||
                 (m.Patient.InsuranceNumber != null && EF.Functions.Like(m.Patient.InsuranceNumber, pattern)) ||
                 (m.Patient.PhoneNumber != null && EF.Functions.Like(m.Patient.PhoneNumber, pattern))))
            .OrderByDescending(m => m.CreatedAt)
            .Take(50)
            .ToListAsync();

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

        // Get or create queue config
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == dto.RoomId && c.QueueType == dto.QueueType);

        int nextNumber;
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
            nextNumber = 1;
        }
        else
        {
            if (config.ResetDaily && config.LastResetDate < today)
            {
                config.CurrentNumber = config.StartNumber;
                config.LastResetDate = today;
            }
            nextNumber = config.CurrentNumber;
            config.CurrentNumber++;
        }

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
        var existingTicket = await _context.QueueTickets
            .FirstOrDefaultAsync(t => t.PatientId == dto.PatientId
                && t.RoomId == dto.RoomId
                && t.IssueDate >= iqFromUtc && t.IssueDate < iqToUtc
                && t.Status < 2); // Waiting or InProgress
        if (existingTicket != null)
            throw new Exception($"Bệnh nhân đã có số thứ tự {existingTicket.TicketNumber} tại phòng này hôm nay");

        var ticket = new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"{config.Prefix}{nextNumber:D3}",
            QueueNumber = nextNumber,
            IssueDate = DateTime.UtcNow, // Chuẩn hóa UTC — query dùng DayRangeUtc để so sánh đúng ngày VN
            QueueType = dto.QueueType,
            Priority = dto.Priority,
            Status = 0, // Waiting
            PatientId = dto.PatientId,
            RoomId = dto.RoomId,
            BranchId = ticketBranchId, // R3 đa cơ sở
            Notes = dto.Source,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _context.QueueTickets.AddAsync(ticket);
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
            Status = ticket.Status,
            EstimatedWaitMinutes = await CalculateEstimatedWaitAsync(dto.RoomId, dto.QueueType)
        };
    }

    public async Task<QueueTicketDto> IssueQueueTicketMobileAsync(MobileQueueTicketDto dto)
    {
        // Find patient by phone
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.PhoneNumber == dto.PatientPhone);

        return await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient?.Id,
            PatientName = dto.PatientName ?? patient?.FullName,
            RoomId = dto.RoomId,
            QueueType = dto.QueueType,
            Priority = 0,
            Source = "Mobile"
        });
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
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 1; // Calling
        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 1); // InProgress on the MR side

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> RecallAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> SkipAsync(Guid ticketId, Guid userId, string? reason)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 4; // Skipped
        ticket.Notes = reason;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 0); // back to waiting (no-show)

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> StartServingAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 2; // Serving
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 1); // InProgress

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> CompleteServingAsync(Guid ticketId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 3; // Completed
        ticket.CompletedTime = DateTime.Now;
        await SyncMedicalRecordStatusAsync(ticket, mrStatus: 3); // Completed

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
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
            .ToListAsync();

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

        var callingList = await GetCallingTicketsAsync(roomId, 5);
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

    public async Task<List<QueueTicketDto>> GetCallingTicketsAsync(Guid roomId, int limit = 5)
    {
        var (ctFromUtc, ctToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId && t.IssueDate >= ctFromUtc && t.IssueDate < ctToUtc && t.Status == 1)
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
