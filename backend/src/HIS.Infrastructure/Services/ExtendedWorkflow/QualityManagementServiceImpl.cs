using HIS.Application.DTOs.QualityManagement;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

#region Flow 17: Quality Management Service - Real Implementation
public class QualityManagementServiceImpl : IQualityManagementService
{
    private readonly HISDbContext _context;
    public QualityManagementServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<IncidentReportDto>> GetIncidentReportsAsync(DateTime? fromDate = null, DateTime? toDate = null, string? status = null, string? type = null)
    {
        var query = _context.IncidentReports.Include(x => x.Department).Include(x => x.ReportedBy).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.IncidentDate >= fromDate);
        if (toDate.HasValue) query = query.Where(x => x.IncidentDate <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(type)) query = query.Where(x => x.IncidentType == type);
        var list = await query.OrderByDescending(x => x.IncidentDate).ToListAsync();
        return list.Select(MapToIncidentDto).ToList();
    }

    public async Task<IncidentReportDto> GetIncidentReportAsync(Guid id)
    {
        var e = await _context.IncidentReports.Include(x => x.Department).Include(x => x.ReportedBy).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToIncidentDto(e);
    }

    public async Task<IncidentReportDto> CreateIncidentReportAsync(CreateIncidentReportDto dto)
    {
        var entity = new IncidentReport { Id = Guid.NewGuid(), ReportCode = $"INC-{DateTime.Now:yyyyMMddHHmmss}", IncidentDate = dto.IncidentDate, ReportDate = DateTime.Now, IncidentType = dto.IncidentType ?? "Other", Severity = dto.SeverityLevel ?? "Minor", Description = dto.Description ?? "", Status = "Reported", CreatedAt = DateTime.Now };
        _context.IncidentReports.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIncidentReportAsync(entity.Id);
    }

    public async Task<IncidentReportDto> UpdateIncidentReportAsync(Guid id, IncidentReportDto dto)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return null!;
        e.IncidentType = dto.IncidentType; e.Severity = dto.SeverityLevel; e.Description = dto.Description; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetIncidentReportAsync(id);
    }

    public async Task<bool> AssignInvestigatorAsync(Guid id, string investigator)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return false;
        e.Status = "UnderInvestigation"; e.InvestigationStartDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CloseIncidentAsync(Guid id, string closureNotes)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.InvestigationEndDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // F9 (audit FLOW-FINAL): corrective action persist THẬT qua CAPA (trước chỉ trả true, không lưu).
    public async Task<bool> AddCorrectiveActionAsync(Guid incidentId, CorrectiveActionDto action)
    {
        var assignee = await _context.Users.Where(u => !u.IsDeleted).Select(u => u.Id).FirstOrDefaultAsync();
        if (assignee == Guid.Empty) return false;
        var capa = new CAPA
        {
            Id = Guid.NewGuid(),
            CAPACode = $"CAPA-{DateTime.Now:yyyyMMddHHmmss}",
            IncidentReportId = incidentId,
            Source = "Incident",
            Type = "Corrective",
            ActionDescription = action.Description ?? "",
            AssignedToId = assignee,
            DueDate = action.DueDate == default ? DateTime.Now.AddDays(7) : action.DueDate,
            Status = string.IsNullOrWhiteSpace(action.Status) ? "Open" : action.Status,
            Priority = "Medium",
            CreatedAt = DateTime.Now,
            CreatedBy = assignee.ToString(),
        };
        _context.CAPAs.Add(capa);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateCorrectiveActionStatusAsync(Guid actionId, string status, string notes)
    {
        var capa = await _context.CAPAs.FindAsync(actionId);
        if (capa == null) return false;
        capa.Status = status;
        capa.VerificationNotes = notes;
        if (status == "Closed" || status == "Completed") { capa.CompletedDate = DateTime.Now; capa.IsEffective = true; }
        capa.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<QualityIndicatorDto>> GetIndicatorsAsync(string? category = null)
    {
        var query = _context.QualityIndicators.AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        var list = await query.Where(x => x.IsActive).ToListAsync();
        return list.Select(e => new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0 }).ToList();
    }

    public async Task<QualityIndicatorDto> GetIndicatorAsync(Guid id)
    {
        var e = await _context.QualityIndicators.FindAsync(id);
        return e == null ? null! : new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0, Description = e.Description };
    }

    public async Task<QualityIndicatorDto> CreateIndicatorAsync(QualityIndicatorDto dto)
    {
        var entity = new QualityIndicator { Id = Guid.NewGuid(), IndicatorCode = dto.IndicatorCode ?? $"QI-{DateTime.Now:yyyyMMddHHmmss}", Name = dto.Name ?? "", Category = dto.Category ?? "Clinical", Description = dto.Description, TargetValue = dto.TargetValue, IsActive = true, CreatedAt = DateTime.Now };
        _context.QualityIndicators.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIndicatorAsync(entity.Id);
    }

    public async Task<List<QualityIndicatorValueDto>> GetIndicatorValuesAsync(Guid indicatorId, DateTime fromDate, DateTime toDate)
    {
        var list = await _context.QualityIndicatorValues.Where(x => x.IndicatorId == indicatorId && x.PeriodEnd >= fromDate && x.PeriodEnd <= toDate).OrderBy(x => x.PeriodEnd).ToListAsync();
        return list.Select(e => new QualityIndicatorValueDto { Id = e.Id, IndicatorId = e.IndicatorId, PeriodEnd = e.PeriodEnd, Numerator = e.Numerator ?? 0, Denominator = e.Denominator ?? 0, Value = e.Value }).ToList();
    }

    public async Task<QualityIndicatorValueDto> RecordIndicatorValueAsync(Guid indicatorId, DateTime periodEnd, decimal numerator, decimal denominator, string analysis)
    {
        var entity = new QualityIndicatorValue { Id = Guid.NewGuid(), IndicatorId = indicatorId, PeriodStart = periodEnd.AddMonths(-1), PeriodEnd = periodEnd, Numerator = numerator, Denominator = denominator, Value = denominator != 0 ? numerator / denominator * 100 : 0, Notes = analysis, CreatedAt = DateTime.Now };
        _context.QualityIndicatorValues.Add(entity);
        await _context.SaveChangesAsync();
        return new QualityIndicatorValueDto { Id = entity.Id, IndicatorId = indicatorId, PeriodEnd = periodEnd, Numerator = numerator, Denominator = denominator, Value = entity.Value };
    }

    public async Task<List<QualityIndicatorValueDto>> GetCriticalIndicatorsAsync()
    {
        var latest = await _context.QualityIndicatorValues.Include(x => x.Indicator).GroupBy(x => x.IndicatorId).Select(g => g.OrderByDescending(x => x.PeriodEnd).First()).ToListAsync();
        return latest.Where(e => e.Indicator != null && e.Indicator.ThresholdLow != null && e.Value < e.Indicator.ThresholdLow).Select(e => new QualityIndicatorValueDto { Id = e.Id, IndicatorId = e.IndicatorId, IndicatorName = e.Indicator?.Name ?? "", Value = e.Value, Status = "Critical" }).ToList();
    }

    public async Task<List<AuditPlanDto>> GetAuditPlansAsync(int year)
    {
        var list = await _context.AuditPlans.Where(x => x.Year == year).ToListAsync();
        return list.Select(e => new AuditPlanDto { Id = e.Id, PlanCode = e.AuditCode, Year = e.Year, AuditType = e.AuditType, Standard = e.Standard, Status = e.Status }).ToList();
    }

    public async Task<AuditPlanDto> CreateAuditPlanAsync(AuditPlanDto dto)
    {
        var entity = new AuditPlan { Id = Guid.NewGuid(), AuditCode = dto.PlanCode ?? $"AUD-{DateTime.Now:yyyyMMddHHmmss}", AuditName = dto.PlanCode ?? "", Year = dto.Year, AuditType = dto.AuditType ?? "Scheduled", Standard = dto.Standard ?? "Internal", PlannedStartDate = DateTime.Now, PlannedEndDate = DateTime.Now.AddDays(7), Status = "Planned", LeadAuditorId = Guid.Empty, CreatedAt = DateTime.Now };
        _context.AuditPlans.Add(entity);
        await _context.SaveChangesAsync();
        return new AuditPlanDto { Id = entity.Id, PlanCode = entity.AuditCode, Year = entity.Year, AuditType = entity.AuditType, Status = entity.Status };
    }

    public async Task<bool> ApproveAuditPlanAsync(Guid id)
    {
        var e = await _context.AuditPlans.FindAsync(id);
        if (e == null) return false;
        e.Status = "Approved";
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<AuditResultDto> GetAuditResultAsync(Guid id) => Task.FromResult(new AuditResultDto { Id = id });
    public Task<AuditResultDto> SubmitAuditResultAsync(AuditResultDto dto) => Task.FromResult(dto);
    public Task<List<AuditFindingDto>> GetOpenFindingsAsync(Guid? departmentId = null) => Task.FromResult(new List<AuditFindingDto>());

    public async Task<List<PatientSatisfactionSurveyDto>> GetSurveysAsync(DateTime fromDate, DateTime toDate, string? surveyType = null)
    {
        var query = _context.SatisfactionSurveys.Where(x => x.SurveyDate >= fromDate && x.SurveyDate <= toDate);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.SurveyType == surveyType);
        var list = await query.ToListAsync();
        return list.Select(e => new PatientSatisfactionSurveyDto { Id = e.Id, SurveyDate = e.SurveyDate, SurveyType = e.SurveyType, OverallSatisfaction = e.OverallRating ?? 0 }).ToList();
    }

    public async Task<PatientSatisfactionSurveyDto> SubmitSurveyAsync(PatientSatisfactionSurveyDto dto)
    {
        var entity = new SatisfactionSurvey { Id = Guid.NewGuid(), SurveyDate = DateTime.Now, SurveyType = dto.SurveyType ?? "General", OverallRating = dto.OverallSatisfaction, PositiveFeedback = "", CreatedAt = DateTime.Now };
        _context.SatisfactionSurveys.Add(entity);
        await _context.SaveChangesAsync();
        return new PatientSatisfactionSurveyDto { Id = entity.Id, SurveyDate = entity.SurveyDate, SurveyType = entity.SurveyType, OverallSatisfaction = entity.OverallRating ?? 0 };
    }

    public async Task<SatisfactionReportDto> GetSatisfactionReportAsync(DateTime fromDate, DateTime toDate, string? surveyType = null, string? department = null)
    {
        var query = _context.SatisfactionSurveys.Where(x => x.SurveyDate >= fromDate && x.SurveyDate <= toDate);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.SurveyType == surveyType);
        var surveys = await query.ToListAsync();
        return new SatisfactionReportDto { FromDate = fromDate, ToDate = toDate, TotalResponses = surveys.Count, AverageOverall = surveys.Any() ? (decimal)surveys.Average(x => x.OverallRating ?? 0) : 0 };
    }

    public async Task<bool> MarkSurveyFollowedUpAsync(Guid id, string notes)
    {
        var e = await _context.SatisfactionSurveys.FindAsync(id);
        if (e == null) return false;
        e.Suggestions = notes;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<CAPADto>> GetCAPAsAsync(string? status = null, string? source = null)
    {
        var query = _context.CAPAs.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(source)) query = query.Where(x => x.Source == source);
        var list = await query.ToListAsync();
        return list.Select(e => new CAPADto { Id = e.Id, CAPACode = e.CAPACode, Title = e.ActionDescription, Source = e.Source, Status = e.Status, TargetCompletionDate = e.DueDate }).ToList();
    }

    public async Task<CAPADto> GetCAPAAsync(Guid id)
    {
        var e = await _context.CAPAs.FindAsync(id);
        return e == null ? null! : new CAPADto { Id = e.Id, CAPACode = e.CAPACode, Title = e.ActionDescription, Source = e.Source, Status = e.Status, TargetCompletionDate = e.DueDate, ProblemDescription = e.ExpectedOutcome ?? "" };
    }

    public async Task<CAPADto> CreateCAPAAsync(CAPADto dto)
    {
        var entity = new CAPA { Id = Guid.NewGuid(), CAPACode = $"CAPA-{DateTime.Now:yyyyMMddHHmmss}", ActionDescription = dto.Title ?? "", Source = dto.Source ?? "Other", ExpectedOutcome = dto.ProblemDescription, Status = "Open", DueDate = dto.TargetCompletionDate, AssignedToId = Guid.Empty, CreatedAt = DateTime.Now };
        _context.CAPAs.Add(entity);
        await _context.SaveChangesAsync();
        return await GetCAPAAsync(entity.Id);
    }

    public async Task<CAPADto> UpdateCAPAAsync(Guid id, CAPADto dto)
    {
        var e = await _context.CAPAs.FindAsync(id);
        if (e == null) return null!;
        e.ActionDescription = dto.Title ?? e.ActionDescription; e.ExpectedOutcome = dto.ProblemDescription; e.Status = dto.Status ?? e.Status;
        await _context.SaveChangesAsync();
        return await GetCAPAAsync(id);
    }

    public async Task<bool> CloseCAPAAsync(Guid id, string verificationResult)
    {
        var e = await _context.CAPAs.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.CompletedDate = DateTime.Now; e.VerificationNotes = verificationResult;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<QMDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new QMDashboardDto
            {
                OpenIncidents = await _context.IncidentReports.CountAsync(x => x.Status != "Closed"),
                IncidentsThisMonth = await _context.IncidentReports.CountAsync(x => x.IncidentDate.Month == DateTime.Today.Month && x.IncidentDate.Year == DateTime.Today.Year),
                OpenCAPAs = await _context.CAPAs.CountAsync(x => x.Status != "Closed"),
                OverdueCAPAs = await _context.CAPAs.CountAsync(x => x.Status != "Closed" && x.DueDate < DateTime.Today)
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new QMDashboardDto();
        }
    }

    private static IncidentReportDto MapToIncidentDto(IncidentReport e) => new()
    {
        Id = e.Id, IncidentCode = e.ReportCode, IncidentDate = e.IncidentDate, IncidentType = e.IncidentType,
        SeverityLevel = e.Severity, Description = e.Description, Status = e.Status, DepartmentName = e.Department?.DepartmentName ?? ""
    };
}
#endregion
