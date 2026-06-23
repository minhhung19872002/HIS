using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using HIS.API.Filters;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/satisfaction-survey")]
[Authorize]
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public class SatisfactionSurveyController : ControllerBase
{
    private readonly HISDbContext _db;

    public SatisfactionSurveyController(HISDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
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

            return Ok(new
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
            return Ok(new { totalSurveys = 0, recentCount = 0, averageScore = 0, satisfactionRate = 0, responseRate = 0, byDepartment = Array.Empty<object>() });
        }
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
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
            return Ok(templates);
        }
        catch
        {
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] SurveyTemplateDto dto)
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
        return Ok(new { template.Id, template.Name });
    }

    [HttpPut("templates/{id}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] SurveyTemplateDto dto)
    {
        var template = await _db.Set<SatisfactionSurveyTemplate>().FindAsync(id);
        if (template == null) return NotFound();

        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Category = dto.Category;
        template.Questions = dto.Questions;
        template.SortOrder = dto.SortOrder;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { template.Id, template.Name });
    }

    [HttpDelete("templates/{id}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var template = await _db.Set<SatisfactionSurveyTemplate>().FindAsync(id);
        if (template == null) return NotFound();
        template.IsDeleted = true;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("results")]
    public async Task<IActionResult> GetResults()
    {
        try
        {
            var results = await _db.Set<SatisfactionSurveyResult>()
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => new
                {
                    r.Id, r.PatientName, r.PatientCode, r.DepartmentName,
                    r.OverallScore, r.Comment, r.TemplateName, r.CreatedAt
                })
                .ToListAsync();
            return Ok(results);
        }
        catch
        {
            return Ok(Array.Empty<object>());
        }
    }

    [HttpGet("analysis")]
    public async Task<IActionResult> GetAnalysis()
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

            return Ok(new
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
            return Ok(new { totalResponses = 0, averageScore = 0, trend = Array.Empty<object>(), distribution = Array.Empty<object>(), topComplaints = Array.Empty<object>(), topPraises = Array.Empty<object>() });
        }
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        try
        {
            var config = await _db.Set<HIS.Core.Entities.SystemConfig>()
                .FirstOrDefaultAsync(c => c.ConfigKey == "SatisfactionSurvey");
            return Ok(config != null
                ? new { autoSend = true, sendAfterDischarge = true, sendAfterOPD = false, reminderDays = 3, configValue = config.ConfigValue }
                : new { autoSend = false, sendAfterDischarge = false, sendAfterOPD = false, reminderDays = 0, configValue = (string?)null });
        }
        catch
        {
            return Ok(new { autoSend = false, sendAfterDischarge = false, sendAfterOPD = false, reminderDays = 0 });
        }
    }

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] object config)
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
            return Ok();
        }
        catch
        {
            return Ok();
        }
    }

    // ========================================================================
    // Campaigns
    // ========================================================================

    /// <summary>
    /// Danh sách chiến dịch khảo sát.
    /// </summary>
    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns([FromQuery] int? status)
    {
        try
        {
            var q = _db.SatisfactionSurveyCampaigns.AsQueryable();
            if (status.HasValue) q = q.Where(c => c.Status == status.Value);
            var list = await q.OrderByDescending(c => c.StartDate).Take(100).ToListAsync();
            return Ok(list);
        }
        catch { return Ok(Array.Empty<object>()); }
    }

    /// <summary>
    /// Tạo chiến dịch khảo sát mới.
    /// </summary>
    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateSurveyCampaignDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
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
        return Ok(new { campaign.Id, campaign.CampaignCode, campaign.Name });
    }

    // ========================================================================
    // Feedback Callbacks
    // ========================================================================

    /// <summary>
    /// Danh sách phản hồi cần liên hệ lại.
    /// </summary>
    [HttpGet("callbacks")]
    public async Task<IActionResult> GetCallbacks([FromQuery] int? status)
    {
        try
        {
            var q = _db.SurveyFeedbackCallbacks.AsQueryable();
            if (status.HasValue) q = q.Where(c => c.Status == status.Value);
            var list = await q.OrderByDescending(c => c.CreatedAt).Take(200).ToListAsync();
            return Ok(list);
        }
        catch { return Ok(Array.Empty<object>()); }
    }

    /// <summary>
    /// Ghi nhận liên hệ lại bệnh nhân (contactCallback).
    /// </summary>
    [HttpPost("callbacks")]
    public async Task<IActionResult> ContactCallback([FromBody] ContactCallbackDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
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
        return Ok(new { cb.Id, cb.Status, cb.ContactedAt });
    }

    /// <summary>
    /// Xác nhận đã tiếp nhận phản hồi (acknowledgeFeedback).
    /// </summary>
    [HttpPost("callbacks/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeFeedback(Guid id, [FromBody] AcknowledgeDto dto)
    {
        var cb = await _db.SurveyFeedbackCallbacks.FindAsync(id);
        if (cb == null) return NotFound();
        cb.Status = 2; // Resolved
        cb.AcknowledgmentNote = dto.Note;
        cb.UpdatedAt = DateTime.UtcNow;
        cb.UpdatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        await _db.SaveChangesAsync();
        return Ok(new { cb.Id, cb.Status });
    }

    // ========================================================================
    // Export
    // ========================================================================

    /// <summary>
    /// Xuất dữ liệu khảo sát dạng CSV.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportSurveys([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] Guid? campaignId)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var results = await _db.SatisfactionSurveyResults
            .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate.AddDays(1))
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
        return File(bytes, "text/csv; charset=utf-8", $"survey-export-{DateTime.Today:yyyyMMdd}.csv");

        static string Escape(string? s) => s == null ? "" : $"\"{s.Replace("\"", "\"\"")}\"";
    }
}

public class CreateSurveyCampaignDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TargetGroup { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
    public int TargetCount { get; set; }
    public string? Notes { get; set; }
}

public class ContactCallbackDto
{
    public Guid? SurveyResultId { get; set; }
    public Guid? CampaignId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientPhone { get; set; }
    public string? PatientCode { get; set; }
    public string? IssueDescription { get; set; }
    public string? ContactedByName { get; set; }
    public string? Resolution { get; set; }
}

public class AcknowledgeDto
{
    public string? Note { get; set; }
}

public class SurveyTemplateDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Questions { get; set; }
    public int SortOrder { get; set; }
}
