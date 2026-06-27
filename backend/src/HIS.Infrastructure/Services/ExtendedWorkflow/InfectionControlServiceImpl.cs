using HIS.Application.DTOs.InfectionControl;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

public class InfectionControlServiceImpl : IInfectionControlService
{
    private readonly HISDbContext _context;
    public InfectionControlServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<HAIDto>> GetActiveHAICasesAsync(string? infectionType = null, Guid? departmentId = null)
    {
        try
        {
            var query = _context.HAICases
                .Include(x => x.Admission).ThenInclude(x => x!.Patient)
                .Include(x => x.Admission).ThenInclude(x => x!.Department)
                .Include(x => x.Admission).ThenInclude(x => x!.Bed)
                .Include(x => x.ReportedBy)
                .Where(x => x.Status != "Resolved");
            if (!string.IsNullOrEmpty(infectionType)) query = query.Where(x => x.InfectionType == infectionType);
            if (departmentId.HasValue) query = query.Where(x => x.Admission!.DepartmentId == departmentId.Value);
            var list = await query.OrderByDescending(x => x.OnsetDate).Take(200).ToListAsync();
            return list.Select(MapToHAIDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HAIDto>();
        }
    }

    public async Task<HAIDto> GetHAICaseAsync(Guid id)
    {
        var e = await _context.HAICases
            .Include(x => x.Admission).ThenInclude(x => x!.Patient)
            .Include(x => x.Admission).ThenInclude(x => x!.Department)
            .Include(x => x.Admission).ThenInclude(x => x!.Bed)
            .Include(x => x.ReportedBy)
            .FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToHAIDto(e);
    }

    public async Task<HAIDto> ReportHAIAsync(ReportHAIDto dto)
    {
        var entity = new HAICase
        {
            Id = Guid.NewGuid(), CaseCode = CodeGenerator.Timestamp("HAI"),
            AdmissionId = dto.AdmissionId, InfectionType = dto.InfectionType, InfectionSite = dto.InfectionSite ?? "",
            OnsetDate = dto.OnsetDate, Status = "Suspected", CreatedAt = DateTime.Now
        };
        _context.HAICases.Add(entity);
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(entity.Id);
    }

    public async Task<HAIDto> UpdateHAICaseAsync(Guid id, HAIDto dto)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.InfectionType = dto.InfectionType; e.InfectionSite = dto.InfectionSite; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<HAIDto> ConfirmHAICaseAsync(Guid id, string organism, bool isMDRO)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.Organism = organism; e.IsMDRO = isMDRO; e.Status = "Confirmed"; e.ConfirmedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<HAIDto> ResolveHAICaseAsync(Guid id, string outcome)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.Outcome = outcome; e.Status = "Resolved"; e.ResolvedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<List<IsolationOrderDto>> GetActiveIsolationsAsync(Guid? departmentId = null)
    {
        var list = await _context.IsolationOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.Status == "Active").ToBoundedListAsync("InfectionControl.ActiveIsolations");
        return list.Select(e => new IsolationOrderDto { Id = e.Id, PatientName = e.Admission?.Patient?.FullName ?? "", IsolationType = e.IsolationType, Status = e.Status }).ToList();
    }

    public async Task<IsolationOrderDto> GetIsolationOrderAsync(Guid id)
    {
        var e = await _context.IsolationOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new IsolationOrderDto { Id = e.Id, PatientName = e.Admission?.Patient?.FullName ?? "", IsolationType = e.IsolationType, Reason = e.Reason, Status = e.Status };
    }

    public async Task<IsolationOrderDto> CreateIsolationOrderAsync(CreateIsolationOrderDto dto)
    {
        var entity = new IsolationOrder
        {
            Id = Guid.NewGuid(), OrderCode = CodeGenerator.Timestamp("ISO"),
            AdmissionId = dto.AdmissionId, IsolationType = dto.IsolationType, Reason = dto.Reason ?? "",
            StartDate = dto.StartDate, Status = "Active", CreatedAt = DateTime.Now
        };
        _context.IsolationOrders.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIsolationOrderAsync(entity.Id);
    }

    public async Task<bool> DiscontinueIsolationAsync(Guid id, string reason)
    {
        var e = await _context.IsolationOrders.FindAsync(id);
        if (e == null) return false;
        e.Status = "Discontinued"; e.EndDate = DateTime.Now; e.DiscontinuationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<HandHygieneObservationDto>> GetHandHygieneObservationsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var list = await _context.HandHygieneObservations.Where(x => x.ObservationDate >= fromDate && x.ObservationDate <= toDate).ToBoundedListAsync("InfectionControl.HandHygieneObservations");
        return list.Select(e => new HandHygieneObservationDto { Id = e.Id, ObservationDate = e.ObservationDate, TotalOpportunities = e.TotalOpportunities, CompliantActions = e.ComplianceCount, ComplianceRate = e.ComplianceRate }).ToList();
    }

    public async Task<HandHygieneObservationDto> RecordHandHygieneObservationAsync(RecordHandHygieneDto dto)
    {
        var total = dto.Events?.Count ?? 0;
        var compliant = dto.Events?.Count(e => e.IsCompliant) ?? 0;
        var entity = new HandHygieneObservation
        {
            Id = Guid.NewGuid(), ObservationDate = dto.ObservationDate, TotalOpportunities = total, ComplianceCount = compliant, ComplianceRate = total > 0 ? (decimal)compliant / total * 100 : 0, CreatedAt = DateTime.Now
        };
        _context.HandHygieneObservations.Add(entity);
        await _context.SaveChangesAsync();
        return new HandHygieneObservationDto { Id = entity.Id, ObservationDate = entity.ObservationDate, TotalOpportunities = total, CompliantActions = compliant };
    }

    public async Task<decimal> GetHandHygieneComplianceRateAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var obs = await _context.HandHygieneObservations.Where(x => x.ObservationDate >= fromDate && x.ObservationDate <= toDate).ToListAsync();
        var total = obs.Sum(x => x.TotalOpportunities);
        var compliant = obs.Sum(x => x.ComplianceCount);
        return total > 0 ? (decimal)compliant / total * 100 : 0;
    }

    public async Task<List<OutbreakDto>> GetActiveOutbreaksAsync()
    {
        try
        {
            var list = await _context.Outbreaks.Where(x => x.Status != "Closed").ToBoundedListAsync("InfectionControl.ActiveOutbreaks");
            return list.Select(e => new OutbreakDto { Id = e.Id, OutbreakCode = e.OutbreakCode, Name = e.OutbreakCode, Status = e.Status, TotalCases = e.TotalCases }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<OutbreakDto>();
        }
    }

    public async Task<OutbreakDto> GetOutbreakAsync(Guid id)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return null!;
        return new OutbreakDto { Id = e.Id, OutbreakCode = e.OutbreakCode, Name = e.OutbreakCode, Organism = e.Organism, Status = e.Status, TotalCases = e.TotalCases };
    }

    public async Task<OutbreakDto> DeclareOutbreakAsync(DeclareOutbreakDto dto)
    {
        var entity = new Outbreak
        {
            Id = Guid.NewGuid(), OutbreakCode = CodeGenerator.Timestamp("OB"),
            Organism = dto.Organism ?? "", AffectedAreas = string.Join(",", dto.AffectedDepartments ?? new List<string>()),
            DetectionDate = dto.IdentifiedDate, Status = "Active", TotalCases = dto.InitialCases?.Count ?? 0, CreatedAt = DateTime.Now
        };
        _context.Outbreaks.Add(entity);
        await _context.SaveChangesAsync();
        return await GetOutbreakAsync(entity.Id);
    }

    public async Task<OutbreakDto> UpdateOutbreakAsync(Guid id, OutbreakDto dto)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return null!;
        e.TotalCases = dto.TotalCases; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetOutbreakAsync(id);
    }

    public async Task<bool> CloseOutbreakAsync(Guid id)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.ResolvedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LinkCaseToOutbreakAsync(Guid outbreakId, Guid caseId)
    {
        var hai = await _context.HAICases.FindAsync(caseId);
        if (hai == null) return false;
        hai.OutbreakId = outbreakId;
        await _context.SaveChangesAsync();
        return true;
    }

    // EnvironmentSurveillance = DEFER (cần bảng + child SurfaceSamples — thiết kế riêng, xem STATUS F9).
    public Task<List<EnvironmentSurveillanceDto>> GetEnvironmentSurveillanceAsync(DateTime fromDate, DateTime toDate, string? locationType = null) => Task.FromResult(new List<EnvironmentSurveillanceDto>());
    public Task<EnvironmentSurveillanceDto> RecordEnvironmentSurveillanceAsync(EnvironmentSurveillanceDto dto) => Task.FromResult(dto);

    // F9: quản lý kháng sinh persist THẬT qua AntibioticStewardships (entity đã có).
    public async Task<List<AntibioticStewardshipDto>> GetAntibioticsRequiringReviewAsync(Guid? departmentId = null)
    {
        var list = await _context.AntibioticStewardships
            .Include(a => a.Patient)
            .Where(a => a.RequiresReview && a.ReviewDate == null && !a.IsDeleted)
            .OrderByDescending(a => a.StartDate).Take(200).ToListAsync();
        return list.Select(a => new AntibioticStewardshipDto
        {
            Id = a.Id, AdmissionId = a.AdmissionId,
            PatientName = a.Patient != null ? a.Patient.FullName : "",
            AntibioticName = a.AntibioticName, StartDate = a.StartDate, DurationDays = a.DayOfTherapy,
        }).ToList();
    }

    public async Task<AntibioticUsageReportDto> GetAntibioticUsageReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var rows = await _context.AntibioticStewardships
            .Where(a => !a.IsDeleted && a.StartDate >= fromDate && a.StartDate <= toDate).ToListAsync();
        var reviewed = rows.Count(a => a.ReviewDate != null);
        var pending = rows.Count(a => a.RequiresReview && a.ReviewDate == null);
        return new AntibioticUsageReportDto
        {
            FromDate = fromDate, ToDate = toDate,
            TotalRequiringReview = reviewed + pending,
            ReviewedCount = reviewed,
            ReviewComplianceRate = (reviewed + pending) > 0 ? Math.Round((decimal)reviewed / (reviewed + pending) * 100, 1) : 0,
        };
    }

    public async Task<bool> ReviewAntibioticAsync(Guid id, string outcome, string notes)
    {
        var a = await _context.AntibioticStewardships.FindAsync(id);
        if (a == null) return false;
        a.ReviewDate = DateTime.Now; a.ReviewOutcome = outcome; a.ReviewNotes = notes; a.RequiresReview = false;
        a.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ICDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new ICDashboardDto
            {
                Date = d,
                ActiveHAICases = await _context.HAICases.CountAsync(x => x.Status != "Resolved"),
                ActiveIsolations = await _context.IsolationOrders.CountAsync(x => x.Status == "Active"),
                ActiveOutbreaks = await _context.Outbreaks.CountAsync(x => x.Status == "Active")
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new ICDashboardDto { Date = d, ActiveHAICases = 0, ActiveIsolations = 0, ActiveOutbreaks = 0 };
        }
    }

    private static HAIDto MapToHAIDto(HAICase e) => new()
    {
        Id = e.Id,
        CaseCode = e.CaseCode,
        AdmissionId = e.AdmissionId,
        PatientId = e.PatientId,
        PatientName = e.Admission?.Patient?.FullName ?? "",
        PatientCode = e.Admission?.Patient?.PatientCode ?? "",
        DepartmentName = e.Admission?.Department?.DepartmentName ?? "",
        BedNumber = e.Admission?.Bed?.BedName ?? e.Admission?.Bed?.BedCode ?? "",
        InfectionType = e.InfectionType,
        InfectionSite = e.InfectionSite,
        OnsetDate = e.OnsetDate,
        DiagnosisDate = e.ConfirmedDate,
        DaysSinceAdmission = e.Admission != null ? Math.Max(0, (int)(e.OnsetDate - e.Admission.AdmissionDate).TotalDays) : 0,
        HasCentralLine = e.IsDeviceAssociated && e.DeviceType == "Central Line",
        CentralLineDays = e.IsDeviceAssociated && e.DeviceType == "Central Line" ? e.DeviceDays : null,
        HasUrinaryCatheter = e.IsDeviceAssociated && e.DeviceType == "Urinary Catheter",
        CatheterDays = e.IsDeviceAssociated && e.DeviceType == "Urinary Catheter" ? e.DeviceDays : null,
        OnVentilator = e.IsDeviceAssociated && e.DeviceType == "Ventilator",
        VentilatorDays = e.IsDeviceAssociated && e.DeviceType == "Ventilator" ? e.DeviceDays : null,
        Organism = e.Organism ?? "",
        IsMDRO = e.IsMDRO,
        ResistancePattern = e.ResistancePattern ?? "",
        IsOutbreakRelated = e.OutbreakId.HasValue,
        OutbreakId = e.OutbreakId,
        Status = e.Status,
        ResolvedDate = e.ResolvedDate,
        Outcome = e.Outcome ?? "",
        ReportedBy = e.ReportedBy?.FullName ?? "",
        ReportedAt = e.CreatedAt,
    };
}
