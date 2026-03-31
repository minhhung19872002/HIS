using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// ============================================================
// Module 1: FollowUpService
// ============================================================

public class FollowUpService : IFollowUpService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public FollowUpService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Đã hẹn" }, { 1, "Hoàn thành" }, { 2, "Quá hạn" }, { 3, "Đã hủy" }
    };

    public async Task<FollowUpPagedResult> GetFollowUpsAsync(FollowUpSearchDto filter)
    {
        var query = _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(f =>
                (f.Patient != null && (f.Patient.FullName.ToLower().Contains(kw) || f.Patient.PatientCode.ToLower().Contains(kw))) ||
                (f.Reason != null && f.Reason.ToLower().Contains(kw)) ||
                (f.Diagnosis != null && f.Diagnosis.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(f => f.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(f => f.ScheduledDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(f => f.ScheduledDate <= dateTo.AddDays(1));

        if (filter.DoctorId.HasValue)
            query = query.Where(f => f.DoctorId == filter.DoctorId.Value);

        if (filter.DepartmentId.HasValue)
            query = query.Where(f => f.DepartmentId == filter.DepartmentId.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(f => f.ScheduledDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(f => MapToListDto(f))
            .ToListAsync();

        return new FollowUpPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<List<FollowUpListDto>> GetTodayFollowUpsAsync()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        return await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted && f.ScheduledDate >= today && f.ScheduledDate < tomorrow)
            .OrderBy(f => f.ScheduledDate)
            .Select(f => MapToListDto(f))
            .ToListAsync();
    }

    public async Task<List<FollowUpListDto>> GetOverdueFollowUpsAsync()
    {
        var today = DateTime.Today;

        return await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .Where(f => !f.IsDeleted && f.Status == 0 && f.ScheduledDate < today)
            .OrderBy(f => f.ScheduledDate)
            .Select(f => MapToListDto(f))
            .ToListAsync();
    }

    public async Task<FollowUpListDto> CreateFollowUpAsync(CreateFollowUpDto dto)
    {
        var entity = new FollowUpAppointment
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            ExaminationId = dto.ExaminationId,
            ScheduledDate = dto.ScheduledDate,
            Status = 0, // Scheduled
            Notes = dto.Notes,
            Reason = dto.Reason,
            Diagnosis = dto.Diagnosis,
            DoctorId = dto.DoctorId,
            DepartmentId = dto.DepartmentId,
            ReminderDaysBefore = dto.ReminderDaysBefore ?? 1,
            ReminderSent = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.FollowUpAppointments.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        // Reload with navigation properties
        var result = await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .FirstAsync(f => f.Id == entity.Id);

        return MapToListDto(result);
    }

    public async Task<FollowUpListDto> UpdateStatusAsync(Guid id, UpdateFollowUpDto dto)
    {
        var entity = await _context.FollowUpAppointments
            .Include(f => f.Patient)
            .Include(f => f.Doctor)
            .Include(f => f.Department)
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted)
            ?? throw new Exception("Không tìm thấy lịch tái khám");

        entity.Status = dto.Status;
        entity.ActualDate = dto.ActualDate;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task SendReminderAsync(Guid id)
    {
        var entity = await _context.FollowUpAppointments
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted)
            ?? throw new Exception("Không tìm thấy lịch tái khám");

        entity.ReminderSent = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        // In production: send SMS/email via IEmailService/ISmsService
    }

    private static FollowUpListDto MapToListDto(FollowUpAppointment f) => new()
    {
        Id = f.Id,
        PatientId = f.PatientId,
        PatientName = f.Patient?.FullName,
        PatientCode = f.Patient?.PatientCode,
        PatientPhone = f.Patient?.PhoneNumber,
        ExaminationId = f.ExaminationId,
        ScheduledDate = f.ScheduledDate,
        ActualDate = f.ActualDate,
        Status = f.Status,
        StatusName = StatusNames.GetValueOrDefault(f.Status, "Không xác định"),
        ReminderSent = f.ReminderSent,
        Notes = f.Notes,
        Reason = f.Reason,
        Diagnosis = f.Diagnosis,
        DoctorId = f.DoctorId,
        DoctorName = f.Doctor?.FullName,
        DepartmentId = f.DepartmentId,
        DepartmentName = f.Department?.DepartmentName,
        CreatedAt = f.CreatedAt
    };
}

// ============================================================
// Module 2: ProcurementService
// ============================================================

public class ProcurementService : IProcurementService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public ProcurementService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Nháp" }, { 1, "Chờ duyệt" }, { 2, "Đã duyệt" }, { 3, "Từ chối" }, { 4, "Hoàn thành" }
    };

    public async Task<ProcurementPagedResult> GetRequestsAsync(ProcurementSearchDto filter)
    {
        var query = _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .Include(p => p.ApprovedBy)
            .Include(p => p.Items)
            .Where(p => !p.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(p =>
                p.RequestCode.ToLower().Contains(kw) ||
                (p.Notes != null && p.Notes.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(p => p.Status == filter.Status.Value);

        if (filter.DepartmentId.HasValue)
            query = query.Where(p => p.DepartmentId == filter.DepartmentId.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(p => p.RequestDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(p => p.RequestDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.RequestDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new ProcurementListDto
            {
                Id = p.Id,
                RequestCode = p.RequestCode,
                RequestDate = p.RequestDate,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null ? p.Department.DepartmentName : null,
                RequestedByName = p.RequestedBy != null ? p.RequestedBy.FullName : null,
                Status = p.Status,
                StatusName = "", // mapped below
                TotalAmount = p.TotalAmount,
                Notes = p.Notes,
                ApprovedByName = p.ApprovedBy != null ? p.ApprovedBy.FullName : null,
                ApprovedDate = p.ApprovedDate,
                ItemCount = p.Items.Count(i => !i.IsDeleted),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new ProcurementPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<ProcurementDetailDto?> GetByIdAsync(Guid id)
    {
        var p = await _context.ProcurementRequests
            .Include(x => x.Department)
            .Include(x => x.RequestedBy)
            .Include(x => x.ApprovedBy)
            .Include(x => x.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (p == null) return null;

        return new ProcurementDetailDto
        {
            Id = p.Id,
            RequestCode = p.RequestCode,
            RequestDate = p.RequestDate,
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department?.DepartmentName,
            RequestedByName = p.RequestedBy?.FullName,
            Status = p.Status,
            StatusName = StatusNames.GetValueOrDefault(p.Status, "Không xác định"),
            TotalAmount = p.TotalAmount,
            Notes = p.Notes,
            ApprovedByName = p.ApprovedBy?.FullName,
            ApprovedDate = p.ApprovedDate,
            ItemCount = p.Items.Count,
            CreatedAt = p.CreatedAt,
            RejectReason = p.RejectReason,
            Items = p.Items.Select(i => new ProcurementRequestItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId,
                ItemName = i.ItemName,
                ItemCode = i.ItemCode,
                Unit = i.Unit,
                RequestedQuantity = i.RequestedQuantity,
                CurrentStock = i.CurrentStock,
                MinimumStock = i.MinimumStock,
                EstimatedPrice = i.EstimatedPrice,
                Notes = i.Notes,
                Specification = i.Specification
            }).ToList()
        };
    }

    public async Task<ProcurementDetailDto> CreateAsync(CreateProcurementDto dto)
    {
        var code = $"DT{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";

        var entity = new ProcurementRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = code,
            RequestDate = DateTime.UtcNow,
            DepartmentId = dto.DepartmentId,
            Status = 1, // Pending
            Notes = dto.Notes,
            TotalAmount = dto.Items.Sum(i => i.RequestedQuantity * i.EstimatedPrice),
            CreatedAt = DateTime.UtcNow
        };

        foreach (var itemDto in dto.Items)
        {
            // Look up current stock from InventoryItems if ItemId provided
            int currentStock = 0;
            if (itemDto.ItemId.HasValue)
            {
                var totalQty = await _context.InventoryItems
                    .Where(x => (x.MedicineId == itemDto.ItemId.Value || x.SupplyId == itemDto.ItemId.Value) && !x.IsDeleted)
                    .SumAsync(x => x.Quantity);
                currentStock = (int)totalQty;
            }

            entity.Items.Add(new ProcurementRequestItem
            {
                Id = Guid.NewGuid(),
                ProcurementRequestId = entity.Id,
                ItemId = itemDto.ItemId,
                ItemName = itemDto.ItemName,
                ItemCode = itemDto.ItemCode,
                Unit = itemDto.Unit,
                RequestedQuantity = itemDto.RequestedQuantity,
                CurrentStock = currentStock,
                MinimumStock = 0,
                EstimatedPrice = itemDto.EstimatedPrice,
                Notes = itemDto.Notes,
                Specification = itemDto.Specification,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.ProcurementRequests.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<ProcurementListDto> ApproveAsync(Guid id)
    {
        var entity = await _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu dự trù");

        if (entity.Status != 1)
            throw new Exception("Chỉ có thể duyệt phiếu đang chờ duyệt");

        entity.Status = 2; // Approved
        entity.ApprovedDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new ProcurementListDto
        {
            Id = entity.Id,
            RequestCode = entity.RequestCode,
            RequestDate = entity.RequestDate,
            DepartmentName = entity.Department?.DepartmentName,
            RequestedByName = entity.RequestedBy?.FullName,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            TotalAmount = entity.TotalAmount,
            ApprovedDate = entity.ApprovedDate,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<ProcurementListDto> RejectAsync(Guid id, string? reason)
    {
        var entity = await _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu dự trù");

        if (entity.Status != 1)
            throw new Exception("Chỉ có thể từ chối phiếu đang chờ duyệt");

        entity.Status = 3; // Rejected
        entity.RejectReason = reason;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new ProcurementListDto
        {
            Id = entity.Id,
            RequestCode = entity.RequestCode,
            RequestDate = entity.RequestDate,
            DepartmentName = entity.Department?.DepartmentName,
            RequestedByName = entity.RequestedBy?.FullName,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            TotalAmount = entity.TotalAmount,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<AutoSuggestionDto>> GetAutoSuggestionsAsync()
    {
        // Aggregate inventory by medicine, find items with low stock
        var medicineStock = await _context.InventoryItems
            .Include(i => i.Medicine)
            .Where(i => !i.IsDeleted && i.MedicineId.HasValue && i.Medicine != null)
            .GroupBy(i => new { i.MedicineId, i.Medicine!.MedicineName, i.Medicine.MedicineCode, i.Medicine.Unit })
            .Select(g => new
            {
                MedicineId = g.Key.MedicineId!.Value,
                Name = g.Key.MedicineName,
                Code = g.Key.MedicineCode,
                Unit = g.Key.Unit,
                TotalQty = g.Sum(x => x.Quantity),
                LastPrice = g.Max(x => x.UnitPrice)
            })
            .Where(x => x.TotalQty < 10) // Items with less than 10 units in stock
            .OrderBy(x => x.TotalQty)
            .Take(50)
            .ToListAsync();

        return medicineStock.Select(m => new AutoSuggestionDto
        {
            ItemId = m.MedicineId,
            ItemName = m.Name,
            ItemCode = m.Code,
            Unit = m.Unit,
            CurrentStock = (int)m.TotalQty,
            MinimumStock = 10,
            SuggestedQuantity = 10 - (int)m.TotalQty + 5, // Buffer of 5
            LastPrice = m.LastPrice
        }).ToList();
    }

    public async Task<ProcurementStatisticsDto> GetStatisticsAsync()
    {
        var query = _context.ProcurementRequests.Where(p => !p.IsDeleted);

        return new ProcurementStatisticsDto
        {
            TotalRequests = await query.CountAsync(),
            DraftCount = await query.CountAsync(p => p.Status == 0),
            PendingCount = await query.CountAsync(p => p.Status == 1),
            ApprovedCount = await query.CountAsync(p => p.Status == 2),
            RejectedCount = await query.CountAsync(p => p.Status == 3),
            TotalApprovedAmount = await query.Where(p => p.Status == 2).SumAsync(p => p.TotalAmount),
            TotalPendingAmount = await query.Where(p => p.Status == 1).SumAsync(p => p.TotalAmount)
        };
    }
}

// ============================================================
// Module 3: ImmunizationService
// ============================================================

public class ImmunizationService : IImmunizationService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public ImmunizationService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Đã hẹn" }, { 1, "Đã tiêm" }, { 2, "Bỏ lỡ" }, { 3, "Chống chỉ định" }
    };

    public async Task<ImmunizationPagedResult> GetRecordsAsync(ImmunizationSearchDto filter)
    {
        var query = _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(v =>
                v.VaccineName.ToLower().Contains(kw) ||
                (v.Patient != null && (v.Patient.FullName.ToLower().Contains(kw) || v.Patient.PatientCode.ToLower().Contains(kw))));
        }

        if (filter.Status.HasValue)
            query = query.Where(v => v.Status == filter.Status.Value);

        if (filter.PatientId.HasValue)
            query = query.Where(v => v.PatientId == filter.PatientId.Value);

        if (!string.IsNullOrWhiteSpace(filter.VaccineName))
            query = query.Where(v => v.VaccineName.Contains(filter.VaccineName));

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(v => v.VaccinationDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(v => v.VaccinationDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(v => v.VaccinationDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(v => MapToListDto(v))
            .ToListAsync();

        return new ImmunizationPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<ImmunizationScheduleDto> GetPatientScheduleAsync(Guid patientId)
    {
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.Id == patientId && !p.IsDeleted);

        var records = await _context.VaccinationRecords
            .Where(v => v.PatientId == patientId && !v.IsDeleted)
            .OrderBy(v => v.VaccineName)
            .ThenBy(v => v.DoseNumber)
            .ToListAsync();

        var scheduleItems = records.Select(r => new ImmunizationScheduleItemDto
        {
            VaccineName = r.VaccineName,
            DoseNumber = r.DoseNumber,
            ScheduledDate = r.Status == 0 ? r.VaccinationDate : null,
            ActualDate = r.Status == 1 ? r.VaccinationDate : null,
            Status = r.Status,
            StatusName = StatusNames.GetValueOrDefault(r.Status)
        }).ToList();

        // Add upcoming doses from NextDoseDate
        var upcomingDoses = records
            .Where(r => r.NextDoseDate.HasValue && r.Status == 1)
            .Where(r => !records.Any(x => x.VaccineName == r.VaccineName && x.DoseNumber == r.DoseNumber + 1))
            .Select(r => new ImmunizationScheduleItemDto
            {
                VaccineName = r.VaccineName,
                DoseNumber = r.DoseNumber + 1,
                ScheduledDate = r.NextDoseDate,
                Status = 0,
                StatusName = "Đã hẹn"
            });

        scheduleItems.AddRange(upcomingDoses);

        return new ImmunizationScheduleDto
        {
            PatientId = patientId,
            PatientName = patient?.FullName,
            ScheduleItems = scheduleItems.OrderBy(s => s.VaccineName).ThenBy(s => s.DoseNumber).ToList()
        };
    }

    public async Task<ImmunizationListDto> AdministerAsync(CreateImmunizationDto dto)
    {
        var entity = new VaccinationRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            VaccineName = dto.VaccineName,
            VaccineCode = dto.VaccineCode,
            LotNumber = dto.LotNumber,
            Manufacturer = dto.Manufacturer,
            DoseNumber = dto.DoseNumber,
            VaccinationDate = dto.VaccinationDate,
            InjectionSite = dto.InjectionSite,
            Route = dto.Route,
            DoseMl = dto.DoseMl,
            NextDoseDate = dto.NextDoseDate,
            Status = 1, // Administered
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _context.VaccinationRecords.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        var result = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstAsync(v => v.Id == entity.Id);

        return MapToListDto(result);
    }

    public async Task<ImmunizationListDto> RecordReactionAsync(Guid id, RecordReactionDto dto)
    {
        var entity = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted)
            ?? throw new Exception("Không tìm thấy bản ghi tiêm chủng");

        entity.AefiReport = dto.AefiReport;
        entity.AefiSeverity = dto.AefiSeverity;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entity.Notes = string.IsNullOrEmpty(entity.Notes) ? dto.Notes : $"{entity.Notes}\n{dto.Notes}";
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return MapToListDto(entity);
    }

    public async Task<ImmunizationStatisticsDto> GetStatisticsAsync()
    {
        var query = _context.VaccinationRecords.Where(v => !v.IsDeleted);

        var byVaccine = await query
            .GroupBy(v => v.VaccineName)
            .Select(g => new VaccineCountDto { VaccineName = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        return new ImmunizationStatisticsDto
        {
            TotalRecords = await query.CountAsync(),
            CompletedCount = await query.CountAsync(v => v.Status == 1),
            ScheduledCount = await query.CountAsync(v => v.Status == 0),
            MissedCount = await query.CountAsync(v => v.Status == 2),
            AefiCount = await query.CountAsync(v => v.AefiSeverity.HasValue && v.AefiSeverity > 0),
            ByVaccine = byVaccine
        };
    }

    public async Task<List<ImmunizationListDto>> GetOverdueAsync()
    {
        var today = DateTime.Today;

        return await _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted && v.Status == 0 && v.VaccinationDate < today)
            .OrderBy(v => v.VaccinationDate)
            .Take(100)
            .Select(v => MapToListDto(v))
            .ToListAsync();
    }

    private static ImmunizationListDto MapToListDto(VaccinationRecord v) => new()
    {
        Id = v.Id,
        PatientId = v.PatientId,
        PatientName = v.Patient?.FullName,
        PatientCode = v.Patient?.PatientCode,
        PatientAge = v.Patient?.DateOfBirth != null
            ? (int)((DateTime.Today - v.Patient.DateOfBirth.Value).TotalDays / 365.25)
            : null,
        VaccineName = v.VaccineName,
        VaccineCode = v.VaccineCode,
        LotNumber = v.LotNumber,
        Manufacturer = v.Manufacturer,
        DoseNumber = v.DoseNumber,
        VaccinationDate = v.VaccinationDate,
        InjectionSite = v.InjectionSite,
        Route = v.Route,
        NextDoseDate = v.NextDoseDate,
        AefiReport = v.AefiReport,
        AefiSeverity = v.AefiSeverity,
        Status = v.Status,
        StatusName = StatusNames.GetValueOrDefault(v.Status, "Không xác định"),
        AdministeredBy = v.AdministeredBy,
        Notes = v.Notes,
        CreatedAt = v.CreatedAt
    };
}

// ============================================================
// Module 4: HealthCheckupService
// ============================================================

public class HealthCheckupService : IHealthCheckupService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public HealthCheckupService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Lên kế hoạch" }, { 1, "Đang thực hiện" }, { 2, "Hoàn thành" }, { 3, "Đã hủy" }
    };

    public async Task<CampaignPagedResult> GetCampaignsAsync(CampaignSearchDto filter)
    {
        var query = _context.HealthCheckupCampaigns
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(c =>
                c.CampaignName.ToLower().Contains(kw) ||
                c.CampaignCode.ToLower().Contains(kw) ||
                (c.OrganizationName != null && c.OrganizationName.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(c => c.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(c => c.StartDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(c => c.EndDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.StartDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(c => new CampaignListDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                OrganizationName = c.OrganizationName,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Status = c.Status,
                StatusName = "", // mapped below
                TotalRegistered = c.TotalRegistered,
                TotalCompleted = c.TotalCompleted,
                CompletionRate = c.TotalRegistered > 0 ? (decimal)c.TotalCompleted / c.TotalRegistered * 100 : 0,
                Notes = c.Notes,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new CampaignPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<CampaignListDto> CreateCampaignAsync(CreateCampaignDto dto)
    {
        var code = $"KSK{DateTime.Now:yyyyMMdd}{new Random().Next(100, 999)}";

        var entity = new HealthCheckupCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = code,
            CampaignName = dto.CampaignName,
            OrganizationName = dto.OrganizationName,
            ContactPerson = dto.ContactPerson,
            ContactPhone = dto.ContactPhone,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = 0, // Planning
            Notes = dto.Notes,
            PackageDescription = dto.PackageDescription,
            ContractAmount = dto.ContractAmount,
            CreatedAt = DateTime.UtcNow
        };

        await _context.HealthCheckupCampaigns.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new CampaignListDto
        {
            Id = entity.Id,
            CampaignCode = entity.CampaignCode,
            CampaignName = entity.CampaignName,
            OrganizationName = entity.OrganizationName,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<CheckupRecordDto>> GetRecordsByCampaignAsync(Guid campaignId)
    {
        return await _context.HealthCheckupRecords
            .Include(r => r.Campaign)
            .Include(r => r.Doctor)
            .Where(r => r.CampaignId == campaignId && !r.IsDeleted)
            .OrderByDescending(r => r.CheckupDate)
            .Select(r => new CheckupRecordDto
            {
                Id = r.Id,
                CampaignId = r.CampaignId,
                CampaignName = r.Campaign != null ? r.Campaign.CampaignName : null,
                PatientId = r.PatientId,
                EmployeeName = r.EmployeeName,
                EmployeeCode = r.EmployeeCode,
                Department = r.Department,
                CheckupDate = r.CheckupDate,
                ResultSummary = r.ResultSummary,
                CertificateIssued = r.CertificateIssued,
                CertificateNumber = r.CertificateNumber,
                Classification = r.Classification,
                DoctorName = r.Doctor != null ? r.Doctor.FullName : null,
                Notes = r.Notes,
                BloodPressure = r.BloodPressure,
                Height = r.Height,
                Weight = r.Weight,
                BMI = r.BMI,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<CheckupRecordDto> CreateRecordAsync(CreateCheckupRecordDto dto)
    {
        // Calculate BMI if height and weight provided
        float? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100f;
            bmi = dto.Weight.Value / (heightM * heightM);
        }

        var entity = new HealthCheckupRecord
        {
            Id = Guid.NewGuid(),
            CampaignId = dto.CampaignId,
            PatientId = dto.PatientId,
            EmployeeName = dto.EmployeeName,
            EmployeeCode = dto.EmployeeCode,
            Department = dto.Department,
            CheckupDate = dto.CheckupDate ?? DateTime.UtcNow,
            ResultSummary = dto.ResultSummary,
            Classification = dto.Classification,
            DoctorId = dto.DoctorId,
            Notes = dto.Notes,
            BloodPressure = dto.BloodPressure,
            Height = dto.Height,
            Weight = dto.Weight,
            BMI = bmi,
            CreatedAt = DateTime.UtcNow
        };

        await _context.HealthCheckupRecords.AddAsync(entity);

        // Update campaign TotalRegistered count
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(dto.CampaignId);
        if (campaign != null)
        {
            campaign.TotalRegistered = await _context.HealthCheckupRecords
                .CountAsync(r => r.CampaignId == dto.CampaignId && !r.IsDeleted) + 1;
        }

        await _unitOfWork.SaveChangesAsync();

        return new CheckupRecordDto
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            EmployeeName = entity.EmployeeName,
            EmployeeCode = entity.EmployeeCode,
            Department = entity.Department,
            CheckupDate = entity.CheckupDate,
            ResultSummary = entity.ResultSummary,
            Classification = entity.Classification,
            Notes = entity.Notes,
            BloodPressure = entity.BloodPressure,
            Height = entity.Height,
            Weight = entity.Weight,
            BMI = entity.BMI,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<CheckupRecordDto> IssueCertificateAsync(Guid recordId)
    {
        var entity = await _context.HealthCheckupRecords
            .Include(r => r.Campaign)
            .Include(r => r.Doctor)
            .FirstOrDefaultAsync(r => r.Id == recordId && !r.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu khám sức khỏe");

        if (entity.CertificateIssued)
            throw new Exception("Giấy chứng nhận đã được cấp");

        entity.CertificateIssued = true;
        entity.CertificateNumber = $"GCN{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";
        entity.UpdatedAt = DateTime.UtcNow;

        // Update campaign TotalCompleted
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(entity.CampaignId);
        if (campaign != null)
        {
            campaign.TotalCompleted = await _context.HealthCheckupRecords
                .CountAsync(r => r.CampaignId == entity.CampaignId && !r.IsDeleted && r.CertificateIssued) + 1;
        }

        await _unitOfWork.SaveChangesAsync();

        return new CheckupRecordDto
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            CampaignName = entity.Campaign?.CampaignName,
            EmployeeName = entity.EmployeeName,
            CheckupDate = entity.CheckupDate,
            ResultSummary = entity.ResultSummary,
            CertificateIssued = entity.CertificateIssued,
            CertificateNumber = entity.CertificateNumber,
            Classification = entity.Classification,
            DoctorName = entity.Doctor?.FullName,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<CheckupStatisticsDto> GetStatisticsAsync()
    {
        var byClassification = await _context.HealthCheckupRecords
            .Where(r => !r.IsDeleted && r.Classification != null)
            .GroupBy(r => r.Classification!)
            .Select(g => new { Classification = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Classification, x => x.Count);

        return new CheckupStatisticsDto
        {
            TotalCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted),
            ActiveCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted && c.Status == 1),
            TotalRecords = await _context.HealthCheckupRecords.CountAsync(r => !r.IsDeleted),
            CertificatesIssued = await _context.HealthCheckupRecords.CountAsync(r => !r.IsDeleted && r.CertificateIssued),
            ByClassification = byClassification
        };
    }

    public async Task<CheckupDashboardDto> GetDashboardAsync()
    {
        var thisMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);

        var recentCampaigns = await _context.HealthCheckupCampaigns
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.StartDate)
            .Take(5)
            .Select(c => new CampaignListDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                OrganizationName = c.OrganizationName,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Status = c.Status,
                TotalRegistered = c.TotalRegistered,
                TotalCompleted = c.TotalCompleted,
                CompletionRate = c.TotalRegistered > 0 ? (decimal)c.TotalCompleted / c.TotalRegistered * 100 : 0
            })
            .ToListAsync();

        return new CheckupDashboardDto
        {
            TotalCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted),
            ActiveCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted && c.Status == 1),
            TotalRecordsThisMonth = await _context.HealthCheckupRecords
                .CountAsync(r => !r.IsDeleted && r.CheckupDate >= thisMonth),
            CertificatesIssuedThisMonth = await _context.HealthCheckupRecords
                .CountAsync(r => !r.IsDeleted && r.CertificateIssued && r.CheckupDate >= thisMonth),
            RecentCampaigns = recentCampaigns
        };
    }

    public async Task<CampaignListDto> UpdateCampaignAsync(Guid id, CreateCampaignDto dto)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        campaign.CampaignName = dto.CampaignName;
        campaign.OrganizationName = dto.OrganizationName;
        campaign.ContactPerson = dto.ContactPerson;
        campaign.ContactPhone = dto.ContactPhone;
        campaign.StartDate = dto.StartDate;
        campaign.EndDate = dto.EndDate;
        campaign.Notes = dto.Notes;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return new CampaignListDto
        {
            Id = campaign.Id,
            CampaignCode = campaign.CampaignCode,
            CampaignName = campaign.CampaignName,
            OrganizationName = campaign.OrganizationName,
            StartDate = campaign.StartDate,
            EndDate = campaign.EndDate,
            Status = campaign.Status,
            TotalRegistered = campaign.TotalRegistered,
            TotalCompleted = campaign.TotalCompleted,
        };
    }

    public async Task DeleteCampaignAsync(Guid id)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        campaign.IsDeleted = true;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<CampaignListDto> GetCampaignByIdAsync(Guid id)
    {
        var c = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        return new CampaignListDto
        {
            Id = c.Id,
            CampaignCode = c.CampaignCode,
            CampaignName = c.CampaignName,
            OrganizationName = c.OrganizationName,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            Status = c.Status,
            TotalRegistered = c.TotalRegistered,
            TotalCompleted = c.TotalCompleted,
            Notes = c.Notes,
        };
    }

    public async Task<List<CampaignGroupDto>> GetCampaignGroupsAsync(Guid campaignId)
    {
        try
        {
            var groups = await _context.Set<HIS.Core.Entities.CheckupCampaignGroup>()
                .Where(g => g.CampaignId == campaignId && !g.IsDeleted)
                .Select(g => new CampaignGroupDto
                {
                    Id = g.Id,
                    CampaignId = g.CampaignId,
                    GroupName = g.GroupName,
                    RoomAssignment = g.RoomAssignment,
                    TotalMembers = g.TotalMembers,
                    CompletedMembers = g.CompletedMembers,
                })
                .ToListAsync();
            return groups;
        }
        catch
        {
            return new List<CampaignGroupDto>();
        }
    }

    public async Task<CampaignGroupDto> CreateCampaignGroupAsync(CreateCampaignGroupDto dto)
    {
        try
        {
            var group = new HIS.Core.Entities.CheckupCampaignGroup
            {
                Id = Guid.NewGuid(),
                CampaignId = dto.CampaignId,
                GroupName = dto.GroupName,
                RoomAssignment = dto.RoomAssignment,
                TotalMembers = 0,
                CompletedMembers = 0,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Set<HIS.Core.Entities.CheckupCampaignGroup>().Add(group);
            await _context.SaveChangesAsync();
            return new CampaignGroupDto
            {
                Id = group.Id,
                CampaignId = group.CampaignId,
                GroupName = group.GroupName,
                RoomAssignment = group.RoomAssignment,
                TotalMembers = 0,
                CompletedMembers = 0,
            };
        }
        catch
        {
            return new CampaignGroupDto { Id = Guid.NewGuid(), GroupName = dto.GroupName };
        }
    }

    public async Task DeleteCampaignGroupAsync(Guid campaignId, Guid groupId)
    {
        try
        {
            var group = await _context.Set<HIS.Core.Entities.CheckupCampaignGroup>()
                .FirstOrDefaultAsync(g => g.Id == groupId && g.CampaignId == campaignId);
            if (group != null)
            {
                group.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }
        catch { /* table may not exist */ }
    }

    public async Task<BatchImportResultDto> ImportBatchExcelAsync(Guid campaignId, Stream fileStream, string fileName)
    {
        var result = new BatchImportResultDto();
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(campaignId)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");

        try
        {
            using var reader = new StreamReader(fileStream);
            var lineNumber = 0;
            var headerProcessed = false;
            var nameIndex = 0;
            var genderIndex = 1;
            var dobIndex = 2;
            var idCardIndex = 3;
            var groupIndex = 4;

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;
                lineNumber++;

                // Simple CSV/TSV parsing (Excel exported as CSV)
                var fields = line.Contains('\t') ? line.Split('\t') : line.Split(',');

                if (!headerProcessed)
                {
                    headerProcessed = true;
                    // Try to detect column positions from header
                    for (int i = 0; i < fields.Length; i++)
                    {
                        var h = fields[i].Trim().ToLowerInvariant();
                        if (h.Contains("ten") || h.Contains("name")) nameIndex = i;
                        else if (h.Contains("gioi") || h.Contains("gender")) genderIndex = i;
                        else if (h.Contains("sinh") || h.Contains("dob") || h.Contains("birth")) dobIndex = i;
                        else if (h.Contains("cccd") || h.Contains("cmnd") || h.Contains("card")) idCardIndex = i;
                        else if (h.Contains("nhom") || h.Contains("group")) groupIndex = i;
                    }
                    continue;
                }

                result.TotalRows++;

                try
                {
                    var patientName = nameIndex < fields.Length ? fields[nameIndex].Trim().Trim('"') : "";
                    if (string.IsNullOrWhiteSpace(patientName))
                    {
                        result.ErrorCount++;
                        result.Errors.Add($"Dòng {lineNumber}: Thiếu họ tên");
                        continue;
                    }

                    var groupName = groupIndex < fields.Length ? fields[groupIndex].Trim().Trim('"') : "";

                    var record = new HIS.Core.Entities.HealthCheckupRecord
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaignId,
                        EmployeeName = patientName,
                        Department = groupName,
                        CheckupDate = DateTime.Today,
                        CreatedAt = DateTime.UtcNow,
                    };

                    _context.HealthCheckupRecords.Add(record);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.ErrorCount++;
                    result.Errors.Add($"Dòng {lineNumber}: {ex.Message}");
                }
            }

            campaign.TotalRegistered += result.SuccessCount;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Lỗi đọc file: {ex.Message}");
        }

        return result;
    }

    public async Task<CampaignCostReportDto> GetCampaignCostReportAsync(Guid campaignId)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(campaignId);
        if (campaign == null)
            return new CampaignCostReportDto();

        var records = await _context.HealthCheckupRecords
            .Where(r => r.CampaignId == campaignId && !r.IsDeleted)
            .CountAsync();

        return new CampaignCostReportDto
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.CampaignName,
            CompanyName = campaign.OrganizationName ?? "",
            TotalPatients = records,
            TotalServiceCost = campaign.ContractAmount ?? 0,
            DiscountAmount = 0,
            NetAmount = campaign.ContractAmount ?? 0,
        };
    }
}

// ============================================================
// Module 5: EpidemiologyService
// ============================================================

public class EpidemiologyService : IEpidemiologyService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public EpidemiologyService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> ClassificationNames = new()
    {
        { 0, "Nghi ngờ" }, { 1, "Có thể" }, { 2, "Xác nhận" }
    };

    private static readonly Dictionary<int, string> OutcomeNames = new()
    {
        { 0, "Đang hồi phục" }, { 1, "Đã hồi phục" }, { 2, "Tử vong" }, { 3, "Không rõ" }
    };

    private static readonly Dictionary<int, string> QuarantineNames = new()
    {
        { 0, "Không" }, { 1, "Cách ly tại nhà" }, { 2, "Cách ly tập trung" }, { 3, "Hoàn thành" }
    };

    public async Task<DiseaseCasePagedResult> GetCasesAsync(DiseaseCaseSearchDto filter)
    {
        var query = _context.DiseaseCases
            .Include(d => d.Investigator)
            .Include(d => d.ContactTraces)
            .Where(d => !d.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(d =>
                d.PatientName.ToLower().Contains(kw) ||
                d.DiseaseName.ToLower().Contains(kw) ||
                (d.IcdCode != null && d.IcdCode.ToLower().Contains(kw)) ||
                (d.Location != null && d.Location.ToLower().Contains(kw)));
        }

        if (filter.Classification.HasValue)
            query = query.Where(d => d.Classification == filter.Classification.Value);

        if (filter.Outcome.HasValue)
            query = query.Where(d => d.Outcome == filter.Outcome.Value);

        if (!string.IsNullOrWhiteSpace(filter.DiseaseName))
            query = query.Where(d => d.DiseaseName.Contains(filter.DiseaseName));

        if (filter.IsOutbreak.HasValue)
            query = query.Where(d => d.IsOutbreak == filter.IsOutbreak.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(d => d.ReportDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(d => d.ReportDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.ReportDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(d => new DiseaseCaseListDto
            {
                Id = d.Id,
                PatientId = d.PatientId,
                PatientName = d.PatientName,
                PatientAge = d.PatientAge,
                PatientGender = d.PatientGender,
                DiseaseName = d.DiseaseName,
                IcdCode = d.IcdCode,
                OnsetDate = d.OnsetDate,
                ReportDate = d.ReportDate,
                Classification = d.Classification,
                Outcome = d.Outcome,
                InvestigatorName = d.Investigator != null ? d.Investigator.FullName : null,
                Location = d.Location,
                IsOutbreak = d.IsOutbreak,
                OutbreakId = d.OutbreakId,
                ContactCount = d.ContactTraces.Count(c => !c.IsDeleted),
                Notes = d.Notes,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.ClassificationName = ClassificationNames.GetValueOrDefault(item.Classification);
            item.OutcomeName = OutcomeNames.GetValueOrDefault(item.Outcome);
        }

        return new DiseaseCasePagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<DiseaseCaseListDto> CreateCaseAsync(CreateDiseaseCaseDto dto)
    {
        var entity = new DiseaseCase
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientAge = dto.PatientAge,
            PatientGender = dto.PatientGender,
            DiseaseName = dto.DiseaseName,
            IcdCode = dto.IcdCode,
            OnsetDate = dto.OnsetDate,
            ReportDate = dto.ReportDate,
            Classification = dto.Classification,
            Outcome = dto.Outcome,
            InvestigatorId = dto.InvestigatorId,
            Location = dto.Location,
            Address = dto.Address,
            Notes = dto.Notes,
            IsOutbreak = dto.IsOutbreak,
            OutbreakId = dto.OutbreakId,
            CreatedAt = DateTime.UtcNow
        };

        await _context.DiseaseCases.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new DiseaseCaseListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            PatientAge = entity.PatientAge,
            PatientGender = entity.PatientGender,
            DiseaseName = entity.DiseaseName,
            IcdCode = entity.IcdCode,
            OnsetDate = entity.OnsetDate,
            ReportDate = entity.ReportDate,
            Classification = entity.Classification,
            ClassificationName = ClassificationNames.GetValueOrDefault(entity.Classification),
            Outcome = entity.Outcome,
            OutcomeName = OutcomeNames.GetValueOrDefault(entity.Outcome),
            Location = entity.Location,
            IsOutbreak = entity.IsOutbreak,
            OutbreakId = entity.OutbreakId,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<DiseaseCaseListDto> UpdateCaseAsync(Guid id, UpdateDiseaseCaseDto dto)
    {
        var entity = await _context.DiseaseCases
            .Include(d => d.Investigator)
            .Include(d => d.ContactTraces)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted)
            ?? throw new Exception("Không tìm thấy ca bệnh");

        if (dto.Classification.HasValue) entity.Classification = dto.Classification.Value;
        if (dto.Outcome.HasValue) entity.Outcome = dto.Outcome.Value;
        if (dto.LabTestResult != null) entity.LabTestResult = dto.LabTestResult;
        if (dto.LabTestDate.HasValue) entity.LabTestDate = dto.LabTestDate;
        if (dto.TreatmentSummary != null) entity.TreatmentSummary = dto.TreatmentSummary;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (dto.IsOutbreak.HasValue) entity.IsOutbreak = dto.IsOutbreak.Value;
        if (dto.OutbreakId != null) entity.OutbreakId = dto.OutbreakId;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new DiseaseCaseListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            PatientAge = entity.PatientAge,
            PatientGender = entity.PatientGender,
            DiseaseName = entity.DiseaseName,
            IcdCode = entity.IcdCode,
            OnsetDate = entity.OnsetDate,
            ReportDate = entity.ReportDate,
            Classification = entity.Classification,
            ClassificationName = ClassificationNames.GetValueOrDefault(entity.Classification),
            Outcome = entity.Outcome,
            OutcomeName = OutcomeNames.GetValueOrDefault(entity.Outcome),
            InvestigatorName = entity.Investigator?.FullName,
            Location = entity.Location,
            IsOutbreak = entity.IsOutbreak,
            OutbreakId = entity.OutbreakId,
            ContactCount = entity.ContactTraces.Count(c => !c.IsDeleted),
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<ContactTraceDto>> AddContactTraceAsync(Guid caseId, CreateContactTraceDto dto)
    {
        var diseaseCase = await _context.DiseaseCases
            .FirstOrDefaultAsync(d => d.Id == caseId && !d.IsDeleted)
            ?? throw new Exception("Không tìm thấy ca bệnh");

        var entity = new ContactTrace
        {
            Id = Guid.NewGuid(),
            DiseaseCaseId = caseId,
            ContactName = dto.ContactName,
            ContactPhone = dto.ContactPhone,
            Relationship = dto.Relationship,
            ExposureDate = dto.ExposureDate,
            ExposureType = dto.ExposureType,
            QuarantineStatus = dto.QuarantineStatus,
            TestResult = dto.TestResult,
            TestDate = dto.TestDate,
            Address = dto.Address,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactTraces.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return await GetContactsByCaseIdAsync(caseId);
    }

    public async Task<List<ContactTraceDto>> GetContactsByCaseIdAsync(Guid caseId)
    {
        return await _context.ContactTraces
            .Where(c => c.DiseaseCaseId == caseId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ContactTraceDto
            {
                Id = c.Id,
                DiseaseCaseId = c.DiseaseCaseId,
                ContactName = c.ContactName,
                ContactPhone = c.ContactPhone,
                Relationship = c.Relationship,
                ExposureDate = c.ExposureDate,
                ExposureType = c.ExposureType,
                QuarantineStatus = c.QuarantineStatus,
                QuarantineStatusName = QuarantineNames.GetValueOrDefault(c.QuarantineStatus),
                TestResult = c.TestResult,
                TestDate = c.TestDate,
                Address = c.Address,
                Notes = c.Notes,
                IsSymptomDeveloped = c.IsSymptomDeveloped,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<EpidemiologyDashboardDto> GetDashboardAsync()
    {
        var query = _context.DiseaseCases.Where(d => !d.IsDeleted);
        var thisWeek = DateTime.Today.AddDays(-7);
        var thisMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);

        var byDisease = await query
            .GroupBy(d => d.DiseaseName)
            .Select(g => new DiseaseCountDto
            {
                DiseaseName = g.Key,
                TotalCases = g.Count(),
                ConfirmedCases = g.Count(x => x.Classification == 2),
                Deaths = g.Count(x => x.Outcome == 2)
            })
            .OrderByDescending(x => x.TotalCases)
            .Take(15)
            .ToListAsync();

        var activeOutbreaks = await query
            .Where(d => d.IsOutbreak && d.OutbreakId != null)
            .GroupBy(d => d.OutbreakId!)
            .Select(g => new OutbreakSummaryDto
            {
                OutbreakId = g.Key,
                DiseaseName = g.OrderByDescending(x => x.ReportDate).Select(x => x.DiseaseName).FirstOrDefault(),
                Location = g.OrderByDescending(x => x.ReportDate).Select(x => x.Location).FirstOrDefault(),
                CaseCount = g.Count(),
                FirstCaseDate = g.Min(x => x.ReportDate),
                LatestCaseDate = g.Max(x => x.ReportDate)
            })
            .OrderByDescending(x => x.LatestCaseDate)
            .ToListAsync();

        return new EpidemiologyDashboardDto
        {
            TotalCases = await query.CountAsync(),
            SuspectedCases = await query.CountAsync(d => d.Classification == 0),
            ConfirmedCases = await query.CountAsync(d => d.Classification == 2),
            ActiveOutbreaks = activeOutbreaks.Count,
            TotalDeaths = await query.CountAsync(d => d.Outcome == 2),
            CasesThisWeek = await query.CountAsync(d => d.ReportDate >= thisWeek),
            CasesThisMonth = await query.CountAsync(d => d.ReportDate >= thisMonth),
            ByDisease = byDisease,
            ActiveOutbreakList = activeOutbreaks
        };
    }

    public async Task<List<OutbreakSummaryDto>> GetOutbreaksAsync()
    {
        return await _context.DiseaseCases
            .Where(d => !d.IsDeleted && d.IsOutbreak && d.OutbreakId != null)
            .GroupBy(d => d.OutbreakId!)
            .Select(g => new OutbreakSummaryDto
            {
                OutbreakId = g.Key,
                DiseaseName = g.OrderByDescending(x => x.ReportDate).Select(x => x.DiseaseName).FirstOrDefault(),
                Location = g.OrderByDescending(x => x.ReportDate).Select(x => x.Location).FirstOrDefault(),
                CaseCount = g.Count(),
                FirstCaseDate = g.Min(x => x.ReportDate),
                LatestCaseDate = g.Max(x => x.ReportDate)
            })
            .OrderByDescending(x => x.LatestCaseDate)
            .ToListAsync();
    }
}
