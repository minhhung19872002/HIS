using HIS.API.Extensions;
using HIS.API.Filters;
using HIS.Application.DTOs.SatisfactionSurvey;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/satisfaction-survey")]
[Authorize]
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public class SatisfactionSurveyController : ControllerBase
{
    private readonly ISatisfactionSurveyService _svc;

    public SatisfactionSurveyController(ISatisfactionSurveyService svc)
    {
        _svc = svc;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
        => (await _svc.GetStatsAsync()).ToActionResult();

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
        => (await _svc.GetTemplatesAsync()).ToActionResult();

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] SurveyTemplateDto dto)
        => (await _svc.CreateTemplateAsync(dto)).ToActionResult();

    [HttpPut("templates/{id}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] SurveyTemplateDto dto)
        => (await _svc.UpdateTemplateAsync(id, dto)).ToActionResult();

    [HttpDelete("templates/{id}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
        => (await _svc.DeleteTemplateAsync(id)).ToActionResult();

    [HttpGet("results")]
    public async Task<IActionResult> GetResults()
        => (await _svc.GetResultsAsync()).ToActionResult();

    [HttpGet("analysis")]
    public async Task<IActionResult> GetAnalysis()
        => (await _svc.GetAnalysisAsync()).ToActionResult();

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
        => (await _svc.GetConfigAsync()).ToActionResult();

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] object config)
        => (await _svc.UpdateConfigAsync(config)).ToActionResult();

    // ========================================================================
    // Campaigns
    // ========================================================================

    /// <summary>
    /// Danh sách chiến dịch khảo sát.
    /// </summary>
    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns([FromQuery] int? status)
        => (await _svc.GetCampaignsAsync(status)).ToActionResult();

    /// <summary>
    /// Tạo chiến dịch khảo sát mới.
    /// </summary>
    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateSurveyCampaignDto dto)
        => (await _svc.CreateCampaignAsync(dto, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value)).ToActionResult();

    // ========================================================================
    // Feedback Callbacks
    // ========================================================================

    /// <summary>
    /// Danh sách phản hồi cần liên hệ lại.
    /// </summary>
    [HttpGet("callbacks")]
    public async Task<IActionResult> GetCallbacks([FromQuery] int? status)
        => (await _svc.GetCallbacksAsync(status)).ToActionResult();

    /// <summary>
    /// Ghi nhận liên hệ lại bệnh nhân (contactCallback).
    /// </summary>
    [HttpPost("callbacks")]
    public async Task<IActionResult> ContactCallback([FromBody] ContactCallbackDto dto)
        => (await _svc.ContactCallbackAsync(dto, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value)).ToActionResult();

    /// <summary>
    /// Xác nhận đã tiếp nhận phản hồi (acknowledgeFeedback).
    /// </summary>
    [HttpPost("callbacks/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeFeedback(Guid id, [FromBody] AcknowledgeDto dto)
        => (await _svc.AcknowledgeFeedbackAsync(id, dto, User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value)).ToActionResult();

    // ========================================================================
    // Export
    // ========================================================================

    /// <summary>
    /// Xuất dữ liệu khảo sát dạng CSV.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportSurveys([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] Guid? campaignId)
    {
        var bytes = await _svc.ExportSurveysAsync(from, to, campaignId);
        return File(bytes, "text/csv; charset=utf-8", $"survey-export-{DateTime.Today:yyyyMMdd}.csv");
    }
}
