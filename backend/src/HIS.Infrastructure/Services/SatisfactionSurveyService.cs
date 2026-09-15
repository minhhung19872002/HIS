using HIS.Application.Common;
using HIS.Application.DTOs.SatisfactionSurvey;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic khảo sát hài lòng — tách khỏi SatisfactionSurveyController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message + try/catch giữ nguyên;
/// userId (claim NameIdentifier dạng string?) truyền từ controller (thay cho đọc claim tại chỗ).
/// Return map về ServiceOutcome; riêng ExportSurveys trả byte[] để controller dựng File() y hệt.
/// </summary>
public class SatisfactionSurveyService : ISatisfactionSurveyService
{
    private readonly HISDbContext _db;

    public SatisfactionSurveyService(HISDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceOutcome> GetStatsAsync()
    {
        try
        {
            var totalSurveys = await _db.Set<SatisfactionSurveyResult>().CountAsync();
            var thisMonth = DateTime.Today.AddDays(-30);
            var recentSurveys = await _db.Set<SatisfactionSurveyResult>()
                .Where(s => s.CreatedAt >= thisMonth)
                .ToListAsync();

            var avgScore = recentSurveys.Any() ? recentSurveys.Average(s => s.OverallScore) : 0;
            var satisfiedCount = recentSurveys.Count(s => s.OverallScore >= 4);
            var satisfactionRate = recentSurveys.Any() ? (double)satisfiedCount / recentSurveys.Count * 100 : 0;

            // F10 (audit FLOW-FINAL 2026-06-06): tỷ lệ phản hồi THẬT = số khảo sát / số BN ra viện
            // trong tháng (thay placeholder hardcode 68.5).
            var dischargedThisMonth = await _db.Set<HIS.Core.Entities.Discharge>()
                .CountAsync(d => d.DischargeDate >= thisMonth && !d.IsDeleted);
            var responseRate = dischargedThisMonth > 0
                ? Math.Round((double)recentSurveys.Count / dischargedThisMonth * 100, 1) : 0;

            return ServiceOutcome.Ok(new
            {
                totalSurveys,
                recentCount = recentSurveys.Count,
                averageScore = Math.Round(avgScore, 1),
                satisfactionRate = Math.Round(satisfactionRate, 1),
                responseRate,
                byDepartment = recentSurveys
                    .GroupBy(s => s.DepartmentName ?? "Chưa xác định")
                    .Select(g => new { department = g.Key, avgScore = Math.Round(g.Average(s => s.OverallScore), 1), count = g.Count() })
                    .OrderByDescending(x => x.avgScore)
                    .ToList()
            });
        }
        catch
        {
            return ServiceOutcome.Ok(new { totalSurveys = 0, recentCount = 0, averageScore = 0, satisfactionRate = 0, responseRate = 0, byDepartment = Array.Empty<object>() });
        }
    }

    public async Task<ServiceOutcome> GetTemplatesAsync()
    {
        try
        {
            var templates = await _db.Set<SatisfactionSurveyTemplate>()
                .Where(t => !t.IsDeleted)
                .OrderBy(t => t.SortOrder)
                .Select(t => new
                {
                    t.Id, t.Name, t.Description, t.Category, t.IsActive, t.SortOrder,
                    t.Questions, t.CreatedAt
                })
                .ToListAsync();
            return ServiceOutcome.Ok(templates);
        }
        catch
        {
            return ServiceOutcome.Ok(Array.Empty<object>());
        }
    }

    public async Task<ServiceOutcome> CreateTemplateAsync(SurveyTemplateDto dto)
    {
        var template = new SatisfactionSurveyTemplate
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Category = dto.Category,
            Questions = dto.Questions,
            IsActive = true,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow
        };
        await _db.Set<SatisfactionSurveyTemplate>().AddAsync(template);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { template.Id, template.Name });
    }

    public async Task<ServiceOutcome> UpdateTemplateAsync(Guid id, SurveyTemplateDto dto)
    {
        var template = await _db.Set<SatisfactionSurveyTemplate>().FindAsync(id);
        if (template == null) return ServiceOutcome.NotFound();

        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Category = dto.Category;
        template.Questions = dto.Questions;
        template.SortOrder = dto.SortOrder;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { template.Id, template.Name });
    }

    public async Task<ServiceOutcome> DeleteTemplateAsync(Guid id)
    {
        var template = await _db.Set<SatisfactionSurveyTemplate>().FindAsync(id);
        if (template == null) return ServiceOutcome.NotFound();
        template.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> GetResultsAsync()
    {
        try
        {
            var results = await _db.Set<SatisfactionSurveyResult>()
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => new
                {
                    r.Id, r.PatientName, r.PatientCode, r.DepartmentName,
                    r.OverallScore, r.Comment, r.TemplateName, r.CreatedAt, r.CampaignId
                })
                .ToListAsync();
            return ServiceOutcome.Ok(results);
        }
        catch
        {
            return ServiceOutcome.Ok(Array.Empty<object>());
        }
    }

    /// <summary>
    /// QA-R3: there was no endpoint that records a completed survey into SatisfactionSurveyResults (the source every
    /// stats / analysis / export reads), and results had no campaign link so export by campaign returned everything.
    /// </summary>
    public async Task<ServiceOutcome> SubmitResultAsync(SubmitSurveyResultDto dto, string? userId)
    {
        if (double.IsNaN(dto.OverallScore) || dto.OverallScore < 1 || dto.OverallScore > 5)
            throw new ArgumentException("Điểm hài lòng tổng thể phải từ 1 đến 5", nameof(dto.OverallScore));
        if (!string.IsNullOrWhiteSpace(dto.Answers))
        {
            try { using var _ = System.Text.Json.JsonDocument.Parse(dto.Answers); }
            catch (System.Text.Json.JsonException) { throw new ArgumentException("Câu trả lời (answers) phải là JSON hợp lệ", nameof(dto.Answers)); }
        }

        SatisfactionSurveyCampaign? campaign = null;
        if (dto.CampaignId.HasValue)
        {
            campaign = await _db.SatisfactionSurveyCampaigns.FirstOrDefaultAsync(c => c.Id == dto.CampaignId.Value && !c.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy chiến dịch khảo sát");
            if (campaign.Status is 2 or 3)
                throw new InvalidOperationException("Chiến dịch khảo sát đã đóng — không ghi nhận thêm phiếu");
        }

        var templateId = dto.TemplateId ?? campaign?.TemplateId;
        string? templateName = campaign?.TemplateName;
        if (templateId.HasValue)
        {
            var tpl = await _db.Set<SatisfactionSurveyTemplate>().AsNoTracking()
                .Where(t => t.Id == templateId.Value && !t.IsDeleted).Select(t => new { t.Name }).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy mẫu khảo sát");
            templateName = tpl.Name;
        }

        Guid? patientId = dto.PatientId;
        string? patientName = dto.PatientName, patientCode = dto.PatientCode;
        if (patientId.HasValue || !string.IsNullOrWhiteSpace(patientCode))
        {
            var code = patientCode?.Trim();
            var p = await _db.Patients.AsNoTracking()
                .Where(x => !x.IsDeleted && (patientId.HasValue ? x.Id == patientId.Value : x.PatientCode == code))
                .Select(x => new { x.Id, x.FullName, x.PatientCode }).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy người bệnh");
            patientId = p.Id; patientName = p.FullName; patientCode = p.PatientCode;
        }

        var departmentName = dto.DepartmentName;
        if (dto.DepartmentId.HasValue)
            departmentName = await _db.Departments.AsNoTracking().Where(d => d.Id == dto.DepartmentId.Value)
                .Select(d => d.DepartmentName).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy khoa/phòng");

        var result = new SatisfactionSurveyResult
        {
            Id = Guid.NewGuid(),
            CampaignId = campaign?.Id,
            TemplateId = templateId,
            TemplateName = templateName,
            PatientId = patientId,
            PatientName = patientName,
            PatientCode = patientCode,
            DepartmentId = dto.DepartmentId,
            DepartmentName = departmentName,
            OverallScore = Math.Round(dto.OverallScore, 1),
            Answers = string.IsNullOrWhiteSpace(dto.Answers) ? null : dto.Answers,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _db.SatisfactionSurveyResults.Add(result);
        if (campaign != null) campaign.ActualCount++;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { result.Id, result.CampaignId, result.OverallScore, result.CreatedAt });
    }

    public async Task<ServiceOutcome> GetAnalysisAsync()
    {
        try
        {
            var results = await _db.Set<SatisfactionSurveyResult>()
                .Where(r => r.CreatedAt >= DateTime.Today.AddDays(-90))
                .ToListAsync();

            var byMonth = results
                .GroupBy(r => r.CreatedAt.ToString("yyyy-MM"))
                .Select(g => new { month = g.Key, avgScore = Math.Round(g.Average(r => r.OverallScore), 1), count = g.Count() })
                .OrderBy(x => x.month)
                .ToList();

            var byScore = Enumerable.Range(1, 5)
                .Select(score => new { score, count = results.Count(r => (int)Math.Round(r.OverallScore) == score) })
                .ToList();

            return ServiceOutcome.Ok(new
            {
                totalResponses = results.Count,
                averageScore = results.Any() ? Math.Round(results.Average(r => r.OverallScore), 1) : 0,
                trend = byMonth,
                distribution = byScore,
                topComplaints = results.Where(r => r.OverallScore <= 2 && !string.IsNullOrEmpty(r.Comment))
                    .OrderByDescending(r => r.CreatedAt).Take(10)
                    .Select(r => new { r.Comment, r.DepartmentName, r.CreatedAt }).ToList(),
                topPraises = results.Where(r => r.OverallScore >= 4 && !string.IsNullOrEmpty(r.Comment))
                    .OrderByDescending(r => r.CreatedAt).Take(10)
                    .Select(r => new { r.Comment, r.DepartmentName, r.CreatedAt }).ToList()
            });
        }
        catch
        {
            return ServiceOutcome.Ok(new { totalResponses = 0, averageScore = 0, trend = Array.Empty<object>(), distribution = Array.Empty<object>(), topComplaints = Array.Empty<object>(), topPraises = Array.Empty<object>() });
        }
    }

    public async Task<ServiceOutcome> GetConfigAsync()
    {
        try
        {
            var config = await _db.Set<HIS.Core.Entities.SystemConfig>()
                .FirstOrDefaultAsync(c => c.ConfigKey == "SatisfactionSurvey");
            // Return what was saved: previously any existing row answered a hard-coded {autoSend:true,...},
            // so the settings screen never reflected the values the user stored with PUT.
            if (!string.IsNullOrWhiteSpace(config?.ConfigValue))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(config.ConfigValue);
                    if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                        return ServiceOutcome.Ok(doc.RootElement.Clone());
                }
                catch (System.Text.Json.JsonException) { /* legacy non-JSON value → defaults below */ }
            }
            return ServiceOutcome.Ok(config != null
                ? new { autoSend = true, sendAfterDischarge = true, sendAfterOPD = false, reminderDays = 3, configValue = config.ConfigValue }
                : new { autoSend = false, sendAfterDischarge = false, sendAfterOPD = false, reminderDays = 0, configValue = (string?)null });
        }
        catch
        {
            return ServiceOutcome.Ok(new { autoSend = false, sendAfterDischarge = false, sendAfterOPD = false, reminderDays = 0 });
        }
    }

    public async Task<ServiceOutcome> UpdateConfigAsync(object config)
    {
        try
        {
            var existing = await _db.Set<HIS.Core.Entities.SystemConfig>()
                .FirstOrDefaultAsync(c => c.ConfigKey == "SatisfactionSurvey");
            var json = System.Text.Json.JsonSerializer.Serialize(config);
            if (existing != null)
            {
                existing.ConfigValue = json;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _db.Set<HIS.Core.Entities.SystemConfig>().AddAsync(new HIS.Core.Entities.SystemConfig
                {
                    Id = Guid.NewGuid(),
                    ConfigKey = "SatisfactionSurvey",
                    ConfigValue = json,
                    Description = "Cấu hình khảo sát hài lòng",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();
            return ServiceOutcome.OkEmpty();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Was OkEmpty(): a failed save told the user "Đã lưu cấu hình".
            return ServiceOutcome.Status(500, new { error = "SAVE_FAILED", message = "Lưu cấu hình khảo sát thất bại" });
        }
    }

    // ========================================================================
    // Campaigns
    // ========================================================================

    /// <summary>
    /// Danh sách chiến dịch khảo sát.
    /// </summary>
    public async Task<ServiceOutcome> GetCampaignsAsync(int? status)
    {
        try
        {
            var q = _db.SatisfactionSurveyCampaigns.AsQueryable();
            if (status.HasValue) q = q.Where(c => c.Status == status.Value);
            var list = await q.OrderByDescending(c => c.StartDate).Take(100).ToListAsync();
            return ServiceOutcome.Ok(list);
        }
        catch { return ServiceOutcome.Ok(Array.Empty<object>()); }
    }

    /// <summary>
    /// Tạo chiến dịch khảo sát mới.
    /// </summary>
    public async Task<ServiceOutcome> CreateCampaignAsync(CreateSurveyCampaignDto dto, string? userId)
    {
        if (dto.EndDate.Date < dto.StartDate.Date)
            throw new ArgumentException("Ngày kết thúc chiến dịch phải sau hoặc bằng ngày bắt đầu", nameof(dto.EndDate));
        if (dto.TargetCount < 0)
            throw new ArgumentException("Số lượng mục tiêu không được âm", nameof(dto.TargetCount));

        var now = DateTime.UtcNow;

        // Sinh CampaignCode: SURVEY-YYYYMM-XXX
        var prefix = $"SURVEY-{now:yyyyMM}-";
        var lastCode = await _db.SatisfactionSurveyCampaigns
            .Where(c => c.CampaignCode.StartsWith(prefix))
            .OrderByDescending(c => c.CampaignCode)
            .Select(c => c.CampaignCode)
            .FirstOrDefaultAsync();
        int seq = 1;
        if (lastCode != null && int.TryParse(lastCode.Substring(prefix.Length), out var n)) seq = n + 1;
        var code = $"{prefix}{seq:D3}";

        var campaign = new SatisfactionSurveyCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = code,
            Name = dto.Name,
            Description = dto.Description,
            TargetGroup = dto.TargetGroup,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            TemplateId = dto.TemplateId,
            TemplateName = dto.TemplateName,
            Status = 0, // Draft
            TargetCount = dto.TargetCount,
            Notes = dto.Notes,
            CreatedAt = now,
            CreatedBy = userId,
        };
        _db.SatisfactionSurveyCampaigns.Add(campaign);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { campaign.Id, campaign.CampaignCode, campaign.Name });
    }

    /// <summary>
    /// QA-R3: campaigns were created as Draft with no way to move them on. Transitions:
    /// 0 Draft → 1 Active / 3 Archived · 1 Active → 2 Closed · 2 Closed → 1 Active (reopen) / 3 Archived.
    /// </summary>
    public async Task<ServiceOutcome> UpdateCampaignStatusAsync(Guid id, int status, string? userId)
    {
        var campaign = await _db.SatisfactionSurveyCampaigns.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy chiến dịch khảo sát");
        var allowed = campaign.Status switch
        {
            0 => new[] { 1, 3 },
            1 => new[] { 2 },
            2 => new[] { 1, 3 },
            _ => Array.Empty<int>(),
        };
        if (!allowed.Contains(status))
            throw new InvalidOperationException($"Không chuyển được chiến dịch từ trạng thái {campaign.Status} sang {status}");
        campaign.Status = status;
        campaign.UpdatedAt = DateTime.UtcNow;
        campaign.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { campaign.Id, campaign.Status });
    }

    // ========================================================================
    // Feedback Callbacks
    // ========================================================================

    /// <summary>
    /// Danh sách phản hồi cần liên hệ lại.
    /// </summary>
    public async Task<ServiceOutcome> GetCallbacksAsync(int? status)
    {
        try
        {
            var q = _db.SurveyFeedbackCallbacks.AsQueryable();
            if (status.HasValue) q = q.Where(c => c.Status == status.Value);
            var list = await q.OrderByDescending(c => c.CreatedAt).Take(200).ToListAsync();
            return ServiceOutcome.Ok(list);
        }
        catch { return ServiceOutcome.Ok(Array.Empty<object>()); }
    }

    /// <summary>
    /// Ghi nhận liên hệ lại bệnh nhân (contactCallback).
    /// </summary>
    public async Task<ServiceOutcome> ContactCallbackAsync(ContactCallbackDto dto, string? userId)
    {
        var now = DateTime.UtcNow;

        var cb = new SurveyFeedbackCallback
        {
            Id = Guid.NewGuid(),
            SurveyResultId = dto.SurveyResultId,
            CampaignId = dto.CampaignId,
            PatientName = dto.PatientName,
            PatientPhone = dto.PatientPhone,
            PatientCode = dto.PatientCode,
            IssueDescription = dto.IssueDescription,
            Status = 1, // Contacted
            ContactedByName = dto.ContactedByName,
            ContactedAt = now,
            Resolution = dto.Resolution,
            CreatedAt = now,
            CreatedBy = userId,
        };
        _db.SurveyFeedbackCallbacks.Add(cb);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { cb.Id, cb.Status, cb.ContactedAt });
    }

    /// <summary>
    /// Xác nhận đã tiếp nhận phản hồi (acknowledgeFeedback).
    /// </summary>
    public async Task<ServiceOutcome> AcknowledgeFeedbackAsync(Guid id, AcknowledgeDto dto, string? userId)
    {
        var cb = await _db.SurveyFeedbackCallbacks.FindAsync(id);
        if (cb == null) return ServiceOutcome.NotFound();
        cb.Status = 2; // Resolved
        cb.AcknowledgmentNote = dto.Note;
        cb.UpdatedAt = DateTime.UtcNow;
        cb.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { cb.Id, cb.Status });
    }

    // ========================================================================
    // Export
    // ========================================================================

    /// <summary>
    /// Xuất dữ liệu khảo sát dạng CSV.
    /// </summary>
    public async Task<byte[]> ExportSurveysAsync(DateTime? from, DateTime? to, Guid? campaignId)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var query = _db.SatisfactionSurveyResults
            .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate.AddDays(1));
        // QA-R3: campaignId was accepted and ignored — "export this campaign" returned every result.
        if (campaignId.HasValue)
            query = query.Where(r => r.CampaignId == campaignId.Value);
        var results = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("STT,MaBenhNhan,TenBenhNhan,Khoa,DiemTongQuat,BinhLuan,NgayKhaoSat");
        int i = 1;
        foreach (var r in results)
        {
            csv.AppendLine($"{i++},{Escape(r.PatientCode)},{Escape(r.PatientName)},{Escape(r.DepartmentName)},{r.OverallScore:F1},{Escape(r.Comment)},{r.CreatedAt:yyyy-MM-dd}");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
        return bytes;

        static string Escape(string? s) => s == null ? "" : $"\"{s.Replace("\"", "\"\"")}\"";
    }
}
