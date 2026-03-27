using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;

namespace HIS.API.Controllers;

// ============================================================
// Module 1: FollowUpController (Tái khám)
// ============================================================

[ApiController]
[Route("api/follow-up")]
[Authorize]
public class FollowUpController : ControllerBase
{
    private readonly IFollowUpService _service;

    public FollowUpController(IFollowUpService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách lịch tái khám (phân trang, lọc)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<FollowUpPagedResult>> GetFollowUps([FromQuery] FollowUpSearchDto filter)
    {
        var result = await _service.GetFollowUpsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tái khám hôm nay
    /// </summary>
    [HttpGet("today")]
    public async Task<ActionResult<List<FollowUpListDto>>> GetTodayFollowUps()
    {
        var result = await _service.GetTodayFollowUpsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tái khám quá hạn
    /// </summary>
    [HttpGet("overdue")]
    public async Task<ActionResult<List<FollowUpListDto>>> GetOverdueFollowUps()
    {
        var result = await _service.GetOverdueFollowUpsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Tạo lịch tái khám mới
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<FollowUpListDto>> CreateFollowUp([FromBody] CreateFollowUpDto dto)
    {
        try
        {
            var result = await _service.CreateFollowUpAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật trạng thái lịch tái khám
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<ActionResult<FollowUpListDto>> UpdateStatus(Guid id, [FromBody] UpdateFollowUpDto dto)
    {
        try
        {
            var result = await _service.UpdateStatusAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gửi nhắc nhở tái khám
    /// </summary>
    [HttpPost("{id}/send-reminder")]
    public async Task<ActionResult> SendReminder(Guid id)
    {
        try
        {
            await _service.SendReminderAsync(id);
            return Ok(new { message = "Đã gửi nhắc nhở thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

// ============================================================
// Module 2: ProcurementController (Dự trù mua sắm)
// ============================================================

[ApiController]
[Route("api/procurement")]
[Authorize]
public class ProcurementController : ControllerBase
{
    private readonly IProcurementService _service;

    public ProcurementController(IProcurementService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách phiếu dự trù (phân trang, lọc)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ProcurementPagedResult>> GetRequests([FromQuery] ProcurementSearchDto filter)
    {
        var result = await _service.GetRequestsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết phiếu dự trù theo ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ProcurementDetailDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu dự trù mới
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ProcurementDetailDto>> Create([FromBody] CreateProcurementDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Duyệt phiếu dự trù
    /// </summary>
    [HttpPut("approve/{id}")]
    public async Task<ActionResult<ProcurementListDto>> Approve(Guid id)
    {
        try
        {
            var result = await _service.ApproveAsync(id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Từ chối phiếu dự trù
    /// </summary>
    [HttpPut("reject/{id}")]
    public async Task<ActionResult<ProcurementListDto>> Reject(Guid id, [FromBody] RejectProcurementRequest request)
    {
        try
        {
            var result = await _service.RejectAsync(id, request.Reason);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy gợi ý tự động (vật tư dưới tồn kho tối thiểu)
    /// </summary>
    [HttpGet("auto-suggestions")]
    public async Task<ActionResult<List<AutoSuggestionDto>>> GetAutoSuggestions()
    {
        var result = await _service.GetAutoSuggestionsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê dự trù
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<ProcurementStatisticsDto>> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }
}

/// <summary>
/// Request body for rejecting procurement
/// </summary>
public class RejectProcurementRequest
{
    public string? Reason { get; set; }
}

// ============================================================
// Module 3: ImmunizationController (Tiêm chủng)
// ============================================================

[ApiController]
[Route("api/immunization")]
[Authorize]
public class ImmunizationController : ControllerBase
{
    private readonly IImmunizationService _service;

    public ImmunizationController(IImmunizationService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách bản ghi tiêm chủng (phân trang, lọc)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ImmunizationPagedResult>> GetRecords([FromQuery] ImmunizationSearchDto filter)
    {
        var result = await _service.GetRecordsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch tiêm chủng của bệnh nhân
    /// </summary>
    [HttpGet("patient/{patientId}/schedule")]
    public async Task<ActionResult<ImmunizationScheduleDto>> GetPatientSchedule(Guid patientId)
    {
        var result = await _service.GetPatientScheduleAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận tiêm chủng
    /// </summary>
    [HttpPost("administer")]
    public async Task<ActionResult<ImmunizationListDto>> Administer([FromBody] CreateImmunizationDto dto)
    {
        try
        {
            var result = await _service.AdministerAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Ghi nhận phản ứng sau tiêm (AEFI)
    /// </summary>
    [HttpPut("{id}/reaction")]
    public async Task<ActionResult<ImmunizationListDto>> RecordReaction(Guid id, [FromBody] RecordReactionDto dto)
    {
        try
        {
            var result = await _service.RecordReactionAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thống kê tiêm chủng
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<ImmunizationStatisticsDto>> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tiêm chủng quá hạn
    /// </summary>
    [HttpGet("overdue")]
    public async Task<ActionResult<List<ImmunizationListDto>>> GetOverdue()
    {
        var result = await _service.GetOverdueAsync();
        return Ok(result);
    }
}

// ============================================================
// Module 4: HealthCheckupController (Khám sức khỏe định kỳ)
// ============================================================

[ApiController]
[Route("api/health-checkup")]
[Authorize]
public class HealthCheckupController : ControllerBase
{
    private readonly IHealthCheckupService _service;

    public HealthCheckupController(IHealthCheckupService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách đợt khám sức khỏe (phân trang, lọc)
    /// </summary>
    [HttpGet("campaigns")]
    public async Task<ActionResult<CampaignPagedResult>> GetCampaigns([FromQuery] CampaignSearchDto filter)
    {
        var result = await _service.GetCampaignsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Tạo đợt khám sức khỏe mới
    /// </summary>
    [HttpPost("campaign")]
    public async Task<ActionResult<CampaignListDto>> CreateCampaign([FromBody] CreateCampaignDto dto)
    {
        try
        {
            var result = await _service.CreateCampaignAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách kết quả khám theo đợt
    /// </summary>
    [HttpGet("campaign/{id}/records")]
    public async Task<ActionResult<List<CheckupRecordDto>>> GetRecordsByCampaign(Guid id)
    {
        var result = await _service.GetRecordsByCampaignAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu kết quả khám sức khỏe
    /// </summary>
    [HttpPost("record")]
    public async Task<ActionResult<CheckupRecordDto>> CreateRecord([FromBody] CreateCheckupRecordDto dto)
    {
        try
        {
            var result = await _service.CreateRecordAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cấp giấy chứng nhận sức khỏe
    /// </summary>
    [HttpPut("record/{id}/certificate")]
    public async Task<ActionResult<CheckupRecordDto>> IssueCertificate(Guid id)
    {
        try
        {
            var result = await _service.IssueCertificateAsync(id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thống kê khám sức khỏe
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<CheckupStatisticsDto>> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Dashboard khám sức khỏe
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<CheckupDashboardDto>> GetDashboard()
    {
        var result = await _service.GetDashboardAsync();
        return Ok(result);
    }
}

// ============================================================
// Module 5: EpidemiologyController (Giám sát dịch tễ)
// ============================================================

[ApiController]
[Route("api/epidemiology")]
[Authorize]
public class EpidemiologyController : ControllerBase
{
    private readonly IEpidemiologyService _service;

    public EpidemiologyController(IEpidemiologyService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách ca bệnh (phân trang, lọc)
    /// </summary>
    [HttpGet("cases")]
    public async Task<ActionResult<DiseaseCasePagedResult>> GetCases([FromQuery] DiseaseCaseSearchDto filter)
    {
        var result = await _service.GetCasesAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Tạo ca bệnh mới
    /// </summary>
    [HttpPost("case")]
    public async Task<ActionResult<DiseaseCaseListDto>> CreateCase([FromBody] CreateDiseaseCaseDto dto)
    {
        try
        {
            var result = await _service.CreateCaseAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật ca bệnh
    /// </summary>
    [HttpPut("case/{id}")]
    public async Task<ActionResult<DiseaseCaseListDto>> UpdateCase(Guid id, [FromBody] UpdateDiseaseCaseDto dto)
    {
        try
        {
            var result = await _service.UpdateCaseAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thêm người tiếp xúc cho ca bệnh
    /// </summary>
    [HttpPost("case/{id}/contacts")]
    public async Task<ActionResult<List<ContactTraceDto>>> AddContactTrace(Guid id, [FromBody] CreateContactTraceDto dto)
    {
        try
        {
            var result = await _service.AddContactTraceAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách người tiếp xúc của ca bệnh
    /// </summary>
    [HttpGet("case/{id}/contacts")]
    public async Task<ActionResult<List<ContactTraceDto>>> GetContacts(Guid id)
    {
        var result = await _service.GetContactsByCaseIdAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Dashboard dịch tễ
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<EpidemiologyDashboardDto>> GetDashboard()
    {
        var result = await _service.GetDashboardAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách ổ dịch
    /// </summary>
    [HttpGet("outbreaks")]
    public async Task<ActionResult<List<OutbreakSummaryDto>>> GetOutbreaks()
    {
        var result = await _service.GetOutbreaksAsync();
        return Ok(result);
    }
}
