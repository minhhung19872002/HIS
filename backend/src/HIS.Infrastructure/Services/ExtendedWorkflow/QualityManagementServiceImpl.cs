using HIS.Application.DTOs.QualityManagement;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
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
        // No Include(ReportedBy): required nav → INNER JOIN, so reports saved with ReportedById = Guid.Empty vanished
        // from the list. The reporter is not part of the DTO.
        var query = _context.IncidentReports.Include(x => x.Department).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.IncidentDate >= fromDate);
        // A date-only toDate (the usual query-string form) excluded every incident of that day after 00:00.
        if (toDate.HasValue)
        {
            var toExclusive = toDate.Value.TimeOfDay == TimeSpan.Zero ? toDate.Value.Date.AddDays(1) : toDate.Value.AddTicks(1);
            query = query.Where(x => x.IncidentDate < toExclusive);
        }
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(type)) query = query.Where(x => x.IncidentType == type);
        var list = await query.OrderByDescending(x => x.IncidentDate).ToBoundedListAsync("QualityManagement.GetIncidentReports");
        var names = await LoadIncidentPartyNamesAsync(list);
        return list.Select(e => MapToIncidentDto(e, names)).ToList();
    }

    public async Task<IncidentReportDto> GetIncidentReportAsync(Guid id)
    {
        var e = await _context.IncidentReports.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToIncidentDto(e, await LoadIncidentPartyNamesAsync(new List<IncidentReport> { e }));
    }

    // Reporter / patient names without Include (required navs would INNER JOIN away rows with Guid.Empty ids).
    private async Task<Dictionary<Guid, (string Name, string? Code)>> LoadIncidentPartyNamesAsync(List<IncidentReport> list)
    {
        var userIds = list.Where(x => !x.IsAnonymous && x.ReportedById != Guid.Empty).Select(x => x.ReportedById).Distinct().ToList();
        var patientIds = list.Where(x => x.PatientId.HasValue).Select(x => x.PatientId!.Value).Distinct().ToList();
        var map = new Dictionary<Guid, (string Name, string? Code)>();
        if (userIds.Count > 0)
            foreach (var u in await _context.Users.AsNoTracking().Where(u => userIds.Contains(u.Id)).Select(u => new { u.Id, u.FullName }).ToListAsync())
                map[u.Id] = (u.FullName ?? "", null);
        if (patientIds.Count > 0)
            foreach (var p in await _context.Patients.AsNoTracking().Where(p => patientIds.Contains(p.Id)).Select(p => new { p.Id, p.FullName, p.PatientCode }).ToListAsync())
                map[p.Id] = (p.FullName ?? "", p.PatientCode);
        return map;
    }

    // v2 "Lưu kết quả điều tra" (RCA) — POST /api/quality/incidents/investigate used to 405, so no investigation
    // could ever be recorded and every incident stayed "Reported".
    public async Task<IncidentReportDto> InvestigateIncidentAsync(InvestigateIncidentDto dto)
    {
        var e = await _context.IncidentReports.FirstOrDefaultAsync(x => x.Id == dto.IncidentId)
            ?? throw new KeyNotFoundException("Không tìm thấy sự cố");
        if (e.Status == "Closed")
            throw new InvalidOperationException("Sự cố đã đóng — không thể cập nhật kết quả điều tra");
        var rootCause = string.IsNullOrWhiteSpace(dto.RootCauseAnalysis) ? dto.InvestigationFindings : dto.RootCauseAnalysis;
        if (string.IsNullOrWhiteSpace(rootCause))
            throw new ArgumentException("Phải nhập kết quả điều tra hoặc nguyên nhân gốc");

        e.RootCause = rootCause.Trim();
        if (!string.IsNullOrWhiteSpace(dto.RcaMethod)) e.RCAMethod = dto.RcaMethod.Trim();
        // ContributingFactors already holds the reporter's notes (CreateIncidentReportAsync): keep them and
        // replace only the investigation block so re-saving does not duplicate text.
        const string marker = "[Điều tra]";
        var block = string.Join("\n", new[]
            {
                ("Kết quả điều tra", dto.InvestigationFindings),
                ("Biện pháp phòng ngừa", dto.PreventiveMeasures),
                ("Bài học kinh nghiệm", dto.LessonLearned),
            }
            .Where(x => !string.IsNullOrWhiteSpace(x.Item2))
            .Select(x => $"{x.Item1}: {x.Item2!.Trim()}"));
        if (block.Length > 0)
        {
            var baseNotes = e.ContributingFactors ?? "";
            var idx = baseNotes.IndexOf(marker, StringComparison.Ordinal);
            if (idx >= 0) baseNotes = baseNotes[..idx].TrimEnd();
            e.ContributingFactors = baseNotes.Length == 0 ? $"{marker}\n{block}" : $"{baseNotes}\n{marker}\n{block}";
        }
        if (!e.InvestigatorId.HasValue && dto.InvestigatorId != Guid.Empty) e.InvestigatorId = dto.InvestigatorId;
        e.InvestigationStartDate ??= DateTime.Now;
        e.InvestigationEndDate = DateTime.Now;
        e.Status = "RCAComplete";
        e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetIncidentReportAsync(e.Id);
    }

    public async Task<IncidentReportDto> CreateIncidentReportAsync(CreateIncidentReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new ArgumentException("Mô tả sự cố là bắt buộc", nameof(dto.Description));
        if (dto.IncidentDate == default)
            throw new ArgumentException("Ngày xảy ra sự cố là bắt buộc", nameof(dto.IncidentDate));
        Guid? departmentId = Guid.TryParse(dto.DepartmentId, out var dep) && dep != Guid.Empty ? dep : null;
        if (departmentId.HasValue && !await _context.Departments.AnyAsync(d => d.Id == departmentId.Value))
            throw new KeyNotFoundException("Không tìm thấy khoa/phòng");
        if (dto.IncidentDate.Date > DateTime.Today)
            throw new ArgumentException("Ngày xảy ra sự cố không được ở tương lai", nameof(dto.IncidentDate));
        // The form's "Mã bệnh nhân" is a patient CODE; posting it as patientId (Guid) made the whole report a 400.
        if (!dto.PatientId.HasValue && !string.IsNullOrWhiteSpace(dto.PatientCode))
        {
            var code = dto.PatientCode.Trim();
            dto.PatientId = await _context.Patients.Where(p => p.PatientCode == code).Select(p => (Guid?)p.Id).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy bệnh nhân mã {code}");
        }
        else if (dto.PatientId.HasValue && !await _context.Patients.AnyAsync(p => p.Id == dto.PatientId.Value))
            throw new KeyNotFoundException("Không tìm thấy bệnh nhân");
        var incidentAt = dto.IncidentDate.Date;
        if (!string.IsNullOrWhiteSpace(dto.IncidentTime) && TimeSpan.TryParse(dto.IncidentTime, out var tod)) incidentAt = incidentAt.Add(tod);
        var severity = dto.SeverityLevel ?? dto.Severity switch
        {
            1 => "NearMiss", 2 => "NoHarm", 3 => "Minor", 4 => "Moderate", 5 => "Major", 6 => "Catastrophic", _ => "Minor"
        };
        // DepartmentId / PatientId / immediate actions / reporter were accepted but never persisted.
        var entity = new IncidentReport { Id = Guid.NewGuid(), ReportCode = CodeGenerator.Timestamp("INC"), IncidentDate = incidentAt, ReportDate = DateTime.Now, IncidentType = dto.IncidentType ?? "Other", Severity = severity, Description = dto.Description, Status = "Reported", CreatedAt = DateTime.Now,
            DepartmentId = departmentId, PatientId = dto.PatientId, ReportedById = dto.ReportedById, IsAnonymous = dto.IsAnonymous,
            ImmediateActions = dto.ImmediateAction ?? dto.ImmediateActions, ContributingFactors = dto.Notes };
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

    // QA-R3: there was no close route at all, and the service closed any incident — even one never investigated.
    // An incident may only be closed once its root-cause analysis is recorded (RCAComplete / ActionPlan).
    public async Task<bool> CloseIncidentAsync(Guid id, string closureNotes)
    {
        var e = await _context.IncidentReports.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy sự cố");
        if (e.Status == "Closed")
            throw new InvalidOperationException("Sự cố đã đóng trước đó");
        if (string.IsNullOrWhiteSpace(e.RootCause) || (e.Status != "RCAComplete" && e.Status != "ActionPlan"))
            throw new InvalidOperationException("Chưa có kết quả phân tích nguyên nhân gốc (RCA) — hãy lưu kết quả điều tra trước khi đóng sự cố");
        if (string.IsNullOrWhiteSpace(closureNotes))
            throw new ArgumentException("Phải nhập ghi chú đóng sự cố", nameof(closureNotes));
        const string marker = "[Đóng sự cố]";
        var baseNotes = e.ContributingFactors ?? "";
        e.ContributingFactors = baseNotes.Length == 0
            ? $"{marker} {closureNotes.Trim()}"
            : $"{baseNotes}\n{marker} {closureNotes.Trim()}";
        e.Status = "Closed"; e.InvestigationEndDate ??= DateTime.Now; e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // F9 (audit FLOW-FINAL): corrective action persist THẬT qua CAPA (trước chỉ trả true, không lưu).
    public async Task<bool> AddCorrectiveActionAsync(Guid incidentId, CorrectiveActionDto action)
    {
        // Unknown incident ids produced orphan CAPA rows; the assignee was "whichever user comes first".
        if (!await _context.IncidentReports.AnyAsync(x => x.Id == incidentId))
            throw new KeyNotFoundException("Không tìm thấy sự cố");
        // QA-R11: an unknown/blank assignee fell back to "the first user in the table" (fabricated responsibility).
        if (!Guid.TryParse(action.AssignedTo, out var assignee) || !await _context.Users.AnyAsync(u => u.Id == assignee && !u.IsDeleted))
            throw new ArgumentException("Chưa chọn người thực hiện hành động khắc phục hợp lệ", nameof(action.AssignedTo));
        if (string.IsNullOrWhiteSpace(action.Description))
            throw new ArgumentException("Phải nhập nội dung hành động khắc phục", nameof(action.Description));
        var capa = new CAPA
        {
            Id = Guid.NewGuid(),
            CAPACode = CodeGenerator.Timestamp("CAPA"),
            IncidentReportId = incidentId,
            Source = "Incident",
            Type = "Corrective",
            ActionDescription = action.Description ?? "",
            AssignedToId = assignee,
            DueDate = action.DueDate == default ? DateTime.Now.AddDays(7) : action.DueDate,
            Status = "Open", // a new CAPA always starts Open (was: any client-supplied string, e.g. "Closed")
            Priority = "Medium",
            CreatedAt = DateTime.Now,
            CreatedBy = assignee.ToString(),
        };
        _context.CAPAs.Add(capa);
        await _context.SaveChangesAsync();
        return true;
    }

    // QA-R11: any string was stored as the CAPA status ("abc", "" …) and a Closed CAPA could be re-opened or re-closed
    // (overwriting its verification note). Allowed: Open → InProgress → PendingVerification → Closed.
    private static readonly string[] CapaStatuses = { "Open", "InProgress", "PendingVerification", "Closed" };

    public async Task<bool> UpdateCorrectiveActionStatusAsync(Guid actionId, string status, string notes)
    {
        var capa = await _context.CAPAs.FindAsync(actionId);
        if (capa == null) return false;
        if (status == "Completed") status = "Closed"; // legacy alias used by the incident drawer
        if (!CapaStatuses.Contains(status))
            throw new ArgumentException($"Trạng thái CAPA không hợp lệ: \"{status}\" (Open/InProgress/PendingVerification/Closed)", nameof(status));
        if (capa.Status == "Closed")
            throw new InvalidOperationException("CAPA đã đóng — không cập nhật trạng thái được nữa.");
        if (Array.IndexOf(CapaStatuses, status) < Array.IndexOf(CapaStatuses, capa.Status))
            throw new InvalidOperationException($"Không chuyển CAPA từ \"{capa.Status}\" về \"{status}\".");
        if (status == "Closed" && string.IsNullOrWhiteSpace(notes))
            throw new ArgumentException("Phải nhập kết quả xác minh hiệu quả khi đóng CAPA", nameof(notes));
        capa.Status = status;
        capa.VerificationNotes = notes;
        if (status == "Closed") { capa.CompletedDate = DateTime.Now; capa.IsEffective = true; capa.VerifiedDate = DateTime.Now; }
        capa.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<QualityIndicatorDto>> GetIndicatorsAsync(string? category = null)
    {
        var query = _context.QualityIndicators.AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        var list = await query.Where(x => x.IsActive).ToBoundedListAsync("QualityManagementServiceImpl.GetIndicators");
        return list.Select(e => new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0,
            IsActive = e.IsActive, Direction = e.ThresholdDirection, CalculationFrequency = e.MeasurementFrequency, StandardReference = e.StandardReference ?? "" }).ToList();
    }

    public async Task<QualityIndicatorDto> GetIndicatorAsync(Guid id)
    {
        var e = await _context.QualityIndicators.FindAsync(id);
        return e == null ? null! : new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0, Description = e.Description };
    }

    public async Task<QualityIndicatorDto> CreateIndicatorAsync(QualityIndicatorDto dto)
    {
        var entity = new QualityIndicator { Id = Guid.NewGuid(), IndicatorCode = dto.IndicatorCode ?? CodeGenerator.Timestamp("QI"), Name = dto.Name ?? "", Category = dto.Category ?? "Clinical", Description = dto.Description, TargetValue = dto.TargetValue, IsActive = true, CreatedAt = DateTime.Now };
        _context.QualityIndicators.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIndicatorAsync(entity.Id);
    }

    public async Task<List<QualityIndicatorValueDto>> GetIndicatorValuesAsync(Guid indicatorId, DateTime fromDate, DateTime toDate)
    {
        var list = await _context.QualityIndicatorValues.Where(x => x.IndicatorId == indicatorId && x.PeriodEnd >= fromDate && x.PeriodEnd <= toDate).OrderBy(x => x.PeriodEnd).ToBoundedListAsync("QualityManagement.IndicatorValues");
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
        var list = await _context.AuditPlans.AsNoTracking().Where(x => x.Year == year)
            .OrderBy(x => x.PlannedStartDate)
            .Select(e => new { Plan = e, LeadName = e.LeadAuditor != null ? e.LeadAuditor.FullName : null })
            .ToBoundedListAsync("QualityManagementServiceImpl.GetAuditPlans");
        return list.Select(x => MapToAuditDto(x.Plan, x.LeadName)).ToList();
    }

    private static AuditPlanDto MapToAuditDto(AuditPlan e, string? leadName) => new()
    {
        Id = e.Id, PlanCode = e.AuditCode, AuditCode = e.AuditCode, Title = e.AuditName, Year = e.Year,
        AuditType = e.AuditType, Standard = e.Standard, Status = e.Status,
        StatusName = e.Status switch { "Planned" => "Đã lên lịch", "InProgress" => "Đang thực hiện", "Completed" => "Hoàn thành", "Cancelled" => "Đã hủy", "Approved" => "Đã duyệt", _ => e.Status },
        ScheduledDate = e.PlannedStartDate, Scope = e.ScopeDescription, Criteria = e.Standard,
        DepartmentName = e.DepartmentsAudited, LeadAuditorId = e.LeadAuditorId.ToString(), LeadAuditorName = leadName,
        TotalFindings = e.TotalFindings, Notes = e.SummaryReport,
    };

    // Used to insert LeadAuditorId = Guid.Empty (FK to Users → every insert failed) and dropped title/department/date.
    public async Task<AuditPlanDto> CreateAuditPlanAsync(AuditPlanDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Tên audit là bắt buộc", nameof(dto.Title));
        if (!Guid.TryParse(dto.LeadAuditorId, out var leadId) || !await _context.Users.AnyAsync(u => u.Id == leadId))
            throw new KeyNotFoundException("Không tìm thấy trưởng đoàn audit");
        string? departmentName = null;
        if (!string.IsNullOrWhiteSpace(dto.DepartmentId))
        {
            if (!Guid.TryParse(dto.DepartmentId, out var depId))
                throw new ArgumentException("Khoa/phòng không hợp lệ", nameof(dto.DepartmentId));
            departmentName = await _context.Departments.Where(d => d.Id == depId).Select(d => d.DepartmentName).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy khoa/phòng");
        }
        var start = (dto.ScheduledDate ?? DateTime.Today).Date;
        var scope = string.Join("\n", new[] { dto.Scope, string.IsNullOrWhiteSpace(dto.Objective) ? null : $"Mục tiêu: {dto.Objective}" }.Where(x => !string.IsNullOrWhiteSpace(x)));
        var entity = new AuditPlan
        {
            Id = Guid.NewGuid(), AuditCode = dto.PlanCode ?? CodeGenerator.Timestamp("AUD"), AuditName = dto.Title.Trim(),
            Year = start.Year, AuditType = string.IsNullOrWhiteSpace(dto.AuditType) ? "Scheduled" : dto.AuditType,
            Standard = string.IsNullOrWhiteSpace(dto.Criteria) ? (dto.Standard ?? "Internal") : dto.Criteria.Trim(),
            PlannedStartDate = start, PlannedEndDate = start.AddDays(7), Status = "Planned", LeadAuditorId = leadId,
            ScopeDescription = string.IsNullOrEmpty(scope) ? null : scope, DepartmentsAudited = departmentName,
            SummaryReport = dto.Notes, CreatedAt = DateTime.Now
        };
        _context.AuditPlans.Add(entity);
        await _context.SaveChangesAsync();
        var leadName = await _context.Users.Where(u => u.Id == leadId).Select(u => u.FullName).FirstOrDefaultAsync();
        return MapToAuditDto(entity, leadName);
    }

    public async Task<bool> ApproveAuditPlanAsync(Guid id)
    {
        var e = await _context.AuditPlans.FindAsync(id);
        if (e == null) return false;
        // QA-R11: approving flipped ANY status (Completed/Cancelled included) back to "Approved".
        if (e.Status != "Planned")
            throw new InvalidOperationException($"Chỉ duyệt được kế hoạch audit đang ở trạng thái \"Đã lên lịch\" (hiện: {e.Status}).");
        e.Status = "Approved";
        e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // QA-R11: both were stubs (Task.FromResult) — an audit could be scheduled but its result never recorded, so every
    // audit stayed "Đã lên lịch" and findings counts stayed empty. Stored on the AuditPlan row itself.
    public async Task<AuditResultDto> GetAuditResultAsync(Guid id)
    {
        var e = await _context.AuditPlans.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapAuditResult(e);
    }

    public async Task<AuditResultDto> SubmitAuditResultAsync(AuditResultDto dto)
    {
        var id = dto.Id != Guid.Empty ? dto.Id : dto.ScheduleId;
        var e = await _context.AuditPlans.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy kế hoạch audit");
        if (e.Status is "Completed" or "Cancelled")
            throw new InvalidOperationException("Audit đã kết thúc — không ghi lại kết quả được.");
        if (e.Status == "Planned")
            throw new InvalidOperationException("Kế hoạch audit chưa được duyệt — duyệt trước khi ghi kết quả.");
        if (dto.MajorNonConformities < 0 || dto.MinorNonConformities < 0 || dto.Observations < 0)
            throw new ArgumentException("Số phát hiện không được âm");
        if (string.IsNullOrWhiteSpace(dto.ExecutiveSummary))
            throw new ArgumentException("Phải nhập tóm tắt kết quả audit", nameof(dto.ExecutiveSummary));
        var auditDate = dto.AuditDate == default ? DateTime.Today : dto.AuditDate.Date;
        if (auditDate > DateTime.Today)
            throw new ArgumentException("Ngày audit không được ở tương lai", nameof(dto.AuditDate));
        e.ActualStartDate ??= auditDate;
        e.ActualEndDate = auditDate;
        e.MajorNonconformities = dto.MajorNonConformities;
        e.MinorNonconformities = dto.MinorNonConformities;
        e.Observations = dto.Observations;
        e.TotalFindings = dto.MajorNonConformities + dto.MinorNonConformities + dto.Observations + Math.Max(0, dto.Opportunities);
        // SummaryReport also carries the notes typed when the audit was scheduled — keep them, replace only the result block.
        const string resultMarker = "[Kết quả audit]";
        var baseNotes = e.SummaryReport ?? "";
        var markerAt = baseNotes.IndexOf(resultMarker, StringComparison.Ordinal);
        if (markerAt >= 0) baseNotes = baseNotes[..markerAt].TrimEnd();
        var resultBlock = string.Join("\n", new[]
            {
                dto.ExecutiveSummary!.Trim(),
                string.IsNullOrWhiteSpace(dto.Strengths) ? null : $"Điểm mạnh: {dto.Strengths.Trim()}",
                string.IsNullOrWhiteSpace(dto.AreasForImprovement) ? null : $"Cần cải tiến: {dto.AreasForImprovement.Trim()}",
                string.IsNullOrWhiteSpace(dto.OverallRating) ? null : $"Đánh giá chung: {dto.OverallRating.Trim()}",
            }.Where(x => x != null));
        e.SummaryReport = baseNotes.Length == 0 ? $"{resultMarker}\n{resultBlock}" : $"{baseNotes}\n{resultMarker}\n{resultBlock}";
        e.Status = "Completed";
        e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return MapAuditResult(e);
    }

    private static AuditResultDto MapAuditResult(AuditPlan e) => new()
    {
        Id = e.Id, AuditCode = e.AuditCode, ScheduleId = e.Id, AuditDate = e.ActualEndDate ?? e.PlannedStartDate,
        Department = e.DepartmentsAudited ?? "", Process = e.ScopeDescription ?? "", LeadAuditor = e.LeadAuditorId.ToString(),
        Findings = new List<AuditFindingDto>(), TotalFindings = e.TotalFindings ?? 0,
        MajorNonConformities = e.MajorNonconformities ?? 0, MinorNonConformities = e.MinorNonconformities ?? 0,
        Observations = e.Observations ?? 0, ExecutiveSummary = e.SummaryReport ?? "",
    };
    public Task<List<AuditFindingDto>> GetOpenFindingsAsync(Guid? departmentId = null) => Task.FromResult(new List<AuditFindingDto>());

    // F10 (audit FLOW-FINAL): THỐNG NHẤT 2 hệ khảo sát — dùng chung 1 nguồn `SatisfactionSurveyResults`
    // (đúng nguồn mà SatisfactionSurveyController + UI khảo sát đọc/ghi), thay vì bảng `SatisfactionSurveys`
    // riêng của module Quality (gây split data, báo cáo lệch). Bảng cũ giữ nguyên (không destructive) nhưng ngừng dùng.
    // A date-only toDate (FE sends "YYYY-MM-DD") must include that whole day.
    private static DateTime ToExclusiveEnd(DateTime toDate) => toDate.TimeOfDay == TimeSpan.Zero ? toDate.Date.AddDays(1) : toDate.AddTicks(1);
    // QA-R11: SatisfactionSurveyResults.CreatedAt is a UTC audit value while fromDate/toDate are VN calendar dates —
    // comparing them directly dropped 00:00–07:00 VN of the first day and pulled in 00:00–07:00 of the day after.
    private static DateTime VnLocalToUtc(DateTime local) => VnTime.DayRangeUtc(local.Date).FromUtc + local.TimeOfDay;

    public async Task<List<PatientSatisfactionSurveyDto>> GetSurveysAsync(DateTime fromDate, DateTime toDate, string? surveyType = null)
    {
        var fromUtc = VnLocalToUtc(fromDate);
        var toExclusive = VnLocalToUtc(ToExclusiveEnd(toDate));
        var query = _context.SatisfactionSurveyResults.Where(x => !x.IsDeleted && x.CreatedAt >= fromUtc && x.CreatedAt < toExclusive);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.TemplateName == surveyType);
        var list = await query.OrderByDescending(x => x.CreatedAt).ToBoundedListAsync("QualityManagement.GetSurveys");
        return list.Select(e => new PatientSatisfactionSurveyDto
        {
            Id = e.Id, SurveyDate = e.CreatedAt, SurveyType = e.TemplateName ?? "General",
            OverallSatisfaction = (int)Math.Round(e.OverallScore, MidpointRounding.AwayFromZero), Department = e.DepartmentName ?? "",
            PatientId = e.PatientId, PositiveFeedback = e.Comment ?? "",
        }).ToList();
    }

    public async Task<PatientSatisfactionSurveyDto> SubmitSurveyAsync(PatientSatisfactionSurveyDto dto)
    {
        // QA-R11: a body without overallSatisfaction (e.g. {rating:4}) stored OverallScore = 0 — a score outside the
        // 1–5 scale that dragged every average on /satisfaction-survey and /quality down.
        if (dto.OverallSatisfaction < 1 || dto.OverallSatisfaction > 5)
            throw new ArgumentException("Điểm hài lòng tổng thể (overallSatisfaction) phải từ 1 đến 5", nameof(dto.OverallSatisfaction));
        var entity = new SatisfactionSurveyResult
        {
            Id = Guid.NewGuid(),
            TemplateName = dto.SurveyType ?? "General",
            PatientId = dto.PatientId,
            DepartmentName = dto.Department,
            OverallScore = dto.OverallSatisfaction,
            Comment = string.IsNullOrWhiteSpace(dto.NegativeFeedback) ? dto.PositiveFeedback : dto.NegativeFeedback,
            // Audit column is UTC everywhere else (SatisfactionSurveyService, range filters) — DateTime.Now shifted
            // these rows 7h against the others.
            CreatedAt = DateTime.UtcNow,
        };
        _context.SatisfactionSurveyResults.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id; dto.SurveyDate = entity.CreatedAt;
        return dto;
    }

    public async Task<SatisfactionReportDto> GetSatisfactionReportAsync(DateTime fromDate, DateTime toDate, string? surveyType = null, string? department = null)
    {
        var fromUtc = VnLocalToUtc(fromDate);
        var toExclusive = VnLocalToUtc(ToExclusiveEnd(toDate));
        var query = _context.SatisfactionSurveyResults.Where(x => !x.IsDeleted && x.CreatedAt >= fromUtc && x.CreatedAt < toExclusive);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.TemplateName == surveyType);
        if (!string.IsNullOrEmpty(department)) query = query.Where(x => x.DepartmentName == department);
        var surveys = await query.ToListAsync();
        return new SatisfactionReportDto
        {
            FromDate = fromDate, ToDate = toDate, SurveyType = surveyType ?? "", Department = department ?? "",
            TotalSurveys = surveys.Count, TotalResponses = surveys.Count,
            AverageOverall = surveys.Any() ? Math.Round((decimal)surveys.Average(x => x.OverallScore), 2) : 0,
            OverallSatisfactionScore = surveys.Any() ? Math.Round((decimal)surveys.Average(x => x.OverallScore), 2) : 0,
        };
    }

    public async Task<bool> MarkSurveyFollowedUpAsync(Guid id, string notes)
    {
        var e = await _context.SatisfactionSurveyResults.FindAsync(id);
        if (e == null) return false;
        e.Comment = string.IsNullOrWhiteSpace(e.Comment) ? $"[Đã liên hệ lại] {notes}" : $"{e.Comment}\n[Đã liên hệ lại] {notes}";
        e.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<CAPADto>> GetCAPAsAsync(string? status = null, string? source = null)
    {
        var query = _context.CAPAs.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(source)) query = query.Where(x => x.Source == source);
        var list = await query.OrderByDescending(x => x.CreatedAt).ToBoundedListAsync("QualityManagement.GetCAPAs");
        var owners = await LoadCapaOwnerNamesAsync(list);
        return list.Select(e => MapCapa(e, owners)).ToList();
    }

    // QA-R11: the list returned only code/title/source/status/due — priority, type, owner, incident link, completion and
    // verification were stored but never sent, so the CAPA table showed "P" / "—" everywhere.
    private async Task<Dictionary<Guid, string>> LoadCapaOwnerNamesAsync(List<CAPA> list)
    {
        var ids = list.Select(x => x.AssignedToId).Where(x => x != Guid.Empty).Distinct().ToList();
        if (ids.Count == 0) return new();
        return await _context.Users.AsNoTracking().Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName ?? "");
    }

    private static CAPADto MapCapa(CAPA e, Dictionary<Guid, string> owners) => new()
    {
        Id = e.Id, CAPACode = e.CAPACode, Title = e.ActionDescription, Type = e.Type, Source = e.Source,
        SourceIncidentId = e.IncidentReportId, ProblemDescription = e.ExpectedOutcome ?? "", Priority = e.Priority,
        Owner = owners.TryGetValue(e.AssignedToId, out var n) ? n : "", Status = e.Status, TargetCompletionDate = e.DueDate,
        ActualCompletionDate = e.CompletedDate, EffectivenessVerified = e.IsEffective, VerificationDate = e.VerifiedDate,
        VerificationResults = e.VerificationNotes ?? "", CreatedAt = e.CreatedAt,
    };

    public async Task<CAPADto> GetCAPAAsync(Guid id)
    {
        var e = await _context.CAPAs.FindAsync(id);
        return e == null ? null! : MapCapa(e, await LoadCapaOwnerNamesAsync(new List<CAPA> { e }));
    }

    public async Task<CAPADto> CreateCAPAAsync(CAPADto dto)
    {
        var entity = new CAPA { Id = Guid.NewGuid(), CAPACode = CodeGenerator.Timestamp("CAPA"), ActionDescription = dto.Title ?? "", Source = dto.Source ?? "Other", ExpectedOutcome = dto.ProblemDescription, Status = "Open", DueDate = dto.TargetCompletionDate, AssignedToId = Guid.Empty, CreatedAt = DateTime.Now };
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

    private static IncidentReportDto MapToIncidentDto(IncidentReport e, Dictionary<Guid, (string Name, string? Code)>? names = null) => new()
    {
        Id = e.Id, IncidentCode = e.ReportCode, IncidentDate = e.IncidentDate, IncidentType = e.IncidentType,
        SeverityLevel = e.Severity, Description = e.Description, Status = e.Status, DepartmentName = e.Department?.DepartmentName ?? "",
        // Report date / immediate action / patient / investigation fields were stored but never returned.
        ReportedAt = e.ReportDate, ImmediateAction = e.ImmediateActions ?? "", IsAnonymous = e.IsAnonymous,
        PatientId = e.PatientId,
        PatientName = e.PatientId.HasValue && names != null && names.TryGetValue(e.PatientId.Value, out var p) ? p.Name : "",
        PatientCode = e.PatientId.HasValue && names != null && names.TryGetValue(e.PatientId.Value, out var pc) ? pc.Code ?? "" : "",
        ReporterName = !e.IsAnonymous && names != null && names.TryGetValue(e.ReportedById, out var r) ? r.Name : "",
        InvestigationStatus = e.Status, InvestigationStartDate = e.InvestigationStartDate, InvestigationEndDate = e.InvestigationEndDate,
        RootCause = e.RootCause ?? "", RCAMethod = e.RCAMethod ?? "", RCAFindings = e.ContributingFactors ?? "",
        RequiresRCA = e.Severity is "Moderate" or "Major" or "Catastrophic",
        IsNearMiss = e.Severity == "NearMiss",
    };
}
#endregion
