using HIS.Application.DTOs.Equipment;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 5b (2026-05-30): tach MedicalEquipmentServiceImpl (~224 dong) khoi ExtendedWorkflowServices.cs.
#region Flow 15: Medical Equipment Service - Real Implementation
public class MedicalEquipmentServiceImpl : IMedicalEquipmentService
{
    private readonly HISDbContext _context;
    public MedicalEquipmentServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalEquipmentDto>> GetEquipmentListAsync(Guid? departmentId = null, string? category = null, string? status = null)
    {
        var query = _context.MedicalEquipments.Include(x => x.Department).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToBoundedListAsync("MedicalEquipment.GetEquipmentList");
        return list.Select(MapToEquipmentDto).ToList();
    }

    public async Task<MedicalEquipmentDto> GetEquipmentAsync(Guid id)
    {
        var e = await _context.MedicalEquipments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToEquipmentDto(e);
    }

    public async Task<MedicalEquipmentDto> RegisterEquipmentAsync(RegisterEquipmentDto dto)
    {
        var entity = new MedicalEquipment { Id = Guid.NewGuid(), EquipmentCode = CodeGenerator.Timestamp("EQ"), EquipmentName = dto.Name, Category = dto.Category ?? "General", SerialNumber = dto.SerialNumber, Manufacturer = dto.Manufacturer, DepartmentId = dto.DepartmentId, Status = "Active", PurchaseDate = dto.PurchaseDate, CreatedAt = DateTime.Now };
        _context.MedicalEquipments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(entity.Id);
    }

    public async Task<MedicalEquipmentDto> UpdateEquipmentAsync(Guid id, RegisterEquipmentDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return null!;
        e.EquipmentName = dto.Name; e.Category = dto.Category ?? e.Category; e.SerialNumber = dto.SerialNumber; e.Manufacturer = dto.Manufacturer;
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(id);
    }

    public async Task<bool> TransferEquipmentAsync(Guid id, Guid newDepartmentId, string roomNumber)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.DepartmentId = newDepartmentId; e.Location = roomNumber;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateEquipmentStatusAsync(Guid id, string status, string reason)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.Status = status; e.StatusReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MaintenanceScheduleDto>> GetMaintenanceSchedulesAsync(DateTime? dueDate = null, bool? overdue = null)
    {
        try
        {
            var query = _context.MaintenanceRecords.Include(x => x.Equipment).Where(x => x.Status == "Scheduled");
            if (dueDate.HasValue) query = query.Where(x => x.ScheduledDate <= dueDate);
            if (overdue == true) query = query.Where(x => x.ScheduledDate < DateTime.Today);
            var list = await query.ToBoundedListAsync("MedicalEquipment.GetMaintenanceSchedules");
            return list.Select(e => new MaintenanceScheduleDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", MaintenanceType = e.MaintenanceType, NextDueDate = e.ScheduledDate, Status = e.Status }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MaintenanceScheduleDto>();
        }
    }

    public async Task<MaintenanceScheduleDto> CreateMaintenanceScheduleAsync(Guid equipmentId, string maintenanceType, string frequency, DateTime nextDueDate)
    {
        var entity = new MaintenanceRecord { Id = Guid.NewGuid(), EquipmentId = equipmentId, MaintenanceType = maintenanceType, ScheduledDate = nextDueDate, Status = "Scheduled", CreatedAt = DateTime.Now };
        _context.MaintenanceRecords.Add(entity);
        await _context.SaveChangesAsync();
        return new MaintenanceScheduleDto { Id = entity.Id, EquipmentId = equipmentId, MaintenanceType = maintenanceType, NextDueDate = nextDueDate, Status = "Scheduled" };
    }

    public async Task<List<MaintenanceRecordDto>> GetMaintenanceHistoryAsync(Guid equipmentId)
    {
        var list = await _context.MaintenanceRecords.Include(x => x.PerformedBy).Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToBoundedListAsync("MedicalEquipment.MaintenanceHistory");
        return list.Select(e => new MaintenanceRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, MaintenanceType = e.MaintenanceType, MaintenanceDate = e.ScheduledDate, PerformedAt = e.PerformedDate, Result = e.Status, Description = e.WorkDescription, TotalCost = e.TotalCost }).ToList();
    }

    public async Task<MaintenanceRecordDto> RecordMaintenanceAsync(CreateMaintenanceRecordDto dto)
    {
        var entity = new MaintenanceRecord { Id = Guid.NewGuid(), EquipmentId = dto.EquipmentId, MaintenanceType = dto.MaintenanceType ?? "Corrective", ScheduledDate = dto.MaintenanceDate, PerformedDate = DateTime.Now, Status = "Completed", WorkDescription = dto.Description, PartsReplaced = dto.PartsReplaced, PartsCost = dto.PartsCost, LaborCost = dto.LaborCost, TotalCost = (dto.PartsCost ?? 0) + (dto.LaborCost ?? 0), CreatedAt = DateTime.Now };
        _context.MaintenanceRecords.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) eq.LastMaintenanceDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return new MaintenanceRecordDto { Id = entity.Id, EquipmentId = entity.EquipmentId, MaintenanceType = entity.MaintenanceType, PerformedAt = entity.PerformedDate, Result = entity.Status };
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationsDueAsync(int daysAhead = 30)
    {
        var dueDate = DateTime.Today.AddDays(daysAhead);
        var list = await _context.CalibrationRecords.Include(x => x.Equipment).Where(x => x.Status == "Scheduled" && x.ScheduledDate <= dueDate).ToBoundedListAsync("MedicalEquipment.CalibrationsDue");
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.ScheduledDate, Status = e.Status }).ToList();
    }

    public async Task<CalibrationRecordDto> GetCalibrationRecordAsync(Guid id)
    {
        var e = await _context.CalibrationRecords.Include(x => x.Equipment).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" };
    }

    public async Task<CalibrationRecordDto> RecordCalibrationAsync(RecordCalibrationDto dto)
    {
        var entity = new CalibrationRecord { Id = Guid.NewGuid(), EquipmentId = dto.EquipmentId, ScheduledDate = dto.CalibrationDate, PerformedDate = dto.CalibrationDate, PerformedBy = dto.CalibratedBy, Status = "Completed", CertificateNumber = dto.CertificateNumber, CalibrationStandard = dto.CalibrationStandard, PassedCalibration = dto.Result == "Pass", CalibrationCost = dto.CalibrationCost, ValidFrom = dto.CalibrationDate, ValidUntil = dto.NextCalibrationDate, NextCalibrationDate = dto.NextCalibrationDate, CreatedAt = DateTime.Now };
        _context.CalibrationRecords.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) { eq.LastCalibrationDate = DateTime.Now; eq.NextCalibrationDate = entity.ValidUntil; }
        await _context.SaveChangesAsync();
        return await GetCalibrationRecordAsync(entity.Id);
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationHistoryAsync(Guid equipmentId)
    {
        var list = await _context.CalibrationRecords.Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToBoundedListAsync("MedicalEquipment.CalibrationHistory");
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" }).ToList();
    }

    public async Task<List<RepairRequestDto>> GetRepairRequestsAsync(string? status = null, Guid? departmentId = null)
    {
        var query = _context.RepairRequests.Include(x => x.Equipment).Include(x => x.RequestedBy).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        var list = await query.OrderByDescending(x => x.RequestDate).ToBoundedListAsync("MedicalEquipment.RepairRequests");
        return list.Select(e => new RepairRequestDto { Id = e.Id, RequestCode = e.RequestCode, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", ProblemDescription = e.ProblemDescription, Severity = e.Priority, Status = e.Status, ReportedDate = e.RequestDate, RequestedAt = e.RequestDate }).ToList();
    }

    public async Task<RepairRequestDto> GetRepairRequestAsync(Guid id)
    {
        var e = await _context.RepairRequests.Include(x => x.Equipment).Include(x => x.RequestedBy).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new RepairRequestDto { Id = e.Id, RequestCode = e.RequestCode, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", ProblemDescription = e.ProblemDescription, Severity = e.Priority, Status = e.Status, ReportedDate = e.RequestDate, RequestedAt = e.RequestDate };
    }

    public async Task<RepairRequestDto> CreateRepairRequestAsync(CreateRepairRequestDto dto)
    {
        var entity = new RepairRequest { Id = Guid.NewGuid(), RequestCode = CodeGenerator.Timestamp("REP"), EquipmentId = dto.EquipmentId, RequestDate = DateTime.Now, ProblemDescription = dto.ProblemDescription ?? "", Priority = dto.Severity ?? "Normal", Status = "Pending", CreatedAt = DateTime.Now };
        _context.RepairRequests.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) eq.Status = "InMaintenance";
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(entity.Id);
    }

    public async Task<RepairRequestDto> UpdateRepairRequestAsync(Guid id, RepairRequestDto dto)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return null!;
        e.Priority = dto.Severity ?? e.Priority; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(id);
    }

    public async Task<bool> CompleteRepairAsync(Guid id, string actionTaken, string partsUsed, decimal cost)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return false;
        e.Status = "Completed"; e.CompletedDate = DateTime.Now; e.RepairActions = actionTaken; e.PartsUsed = partsUsed; e.TotalCost = cost; e.IsRepaired = true;
        var eq = await _context.MedicalEquipments.FindAsync(e.EquipmentId);
        if (eq != null) eq.Status = "Active";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<EquipmentDisposalDto>> GetDisposalRequestsAsync(string? status = null)
    {
        var query = _context.MedicalEquipments.Where(x => x.Status == "Decommissioned" || x.DecommissionDate != null);
        var list = await query.ToBoundedListAsync("MedicalEquipment.GetDisposalRequests");
        return list.Select(e => new EquipmentDisposalDto { Id = e.Id, EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = e.Status, DisposalDate = e.DecommissionDate, DisposalReason = e.DecommissionReason }).ToList();
    }

    public async Task<EquipmentDisposalDto> CreateDisposalRequestAsync(CreateDisposalRequestDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (e == null) return null!;
        e.Status = "PendingDisposal"; e.DecommissionReason = dto.DisposalReason;
        await _context.SaveChangesAsync();
        return new EquipmentDisposalDto { Id = Guid.NewGuid(), EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = "PendingDisposal", DisposalReason = dto.DisposalReason };
    }

    public async Task<bool> ApproveDisposalAsync(Guid id, string notes) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "ApprovedForDisposal"; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> RejectDisposalAsync(Guid id, string reason) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Active"; e.DecommissionReason = null; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> ExecuteDisposalAsync(Guid id, DateTime disposalDate, string certificate) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Decommissioned"; e.DecommissionDate = disposalDate; await _context.SaveChangesAsync(); return true; }

    public async Task<EquipmentDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new EquipmentDashboardDto
            {
                TotalEquipment = await _context.MedicalEquipments.CountAsync(),
                ActiveEquipment = await _context.MedicalEquipments.CountAsync(x => x.Status == "Active"),
                InMaintenance = await _context.MedicalEquipments.CountAsync(x => x.Status == "InMaintenance"),
                OpenRepairRequests = await _context.RepairRequests.CountAsync(x => x.Status == "Pending"),
                CalibrationDueThisMonth = await _context.MedicalEquipments.CountAsync(x => x.NextCalibrationDate != null && x.NextCalibrationDate <= DateTime.Today.AddDays(30))
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new EquipmentDashboardDto();
        }
    }

    public async Task<EquipmentReportDto> GetEquipmentReportAsync(DateTime fromDate, DateTime toDate)
    {
        return new EquipmentReportDto { FromDate = fromDate, ToDate = toDate, MaintenanceEventsTotal = await _context.MaintenanceRecords.CountAsync(x => x.PerformedDate >= fromDate && x.PerformedDate <= toDate), RepairRequests = await _context.RepairRequests.CountAsync(x => x.RequestDate >= fromDate && x.RequestDate <= toDate) };
    }

    private static MedicalEquipmentDto MapToEquipmentDto(MedicalEquipment e) => new()
    {
        Id = e.Id, EquipmentCode = e.EquipmentCode, Name = e.EquipmentName, Category = e.Category, SerialNumber = e.SerialNumber,
        Manufacturer = e.Manufacturer, DepartmentName = e.Department?.DepartmentName ?? "", Status = e.Status, Location = e.Location
    };
}
#endregion
