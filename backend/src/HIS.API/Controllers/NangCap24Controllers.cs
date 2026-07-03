using System.Security.Claims;
using HIS.API.Filters;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Dtos.NangCap24;

namespace HIS.API.Controllers;

// ============================================================
// Gap #2 - Biometric WebAuthn signature controller
// ============================================================
[ApiController]
[Route("api/biometric")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class BiometricSignatureController : ControllerBase
{
    private readonly IBiometricSignatureService _service;
    public BiometricSignatureController(IBiometricSignatureService service) { _service = service; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
    private string? GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpPost("register-begin")]
    public async Task<ActionResult<BiometricRegisterBeginResponseDto>> RegisterBegin([FromBody] BiometricRegisterBeginDto dto)
        => Ok(await _service.BeginRegisterAsync(dto));

    [HttpPost("register-finish")]
    public async Task<ActionResult<BiometricCredentialDto>> RegisterFinish([FromBody] BiometricRegisterFinishDto dto)
        => Ok(await _service.FinishRegisterAsync(dto, GetUserId()));

    [HttpGet("credentials/{patientId:guid}")]
    public async Task<ActionResult<List<BiometricCredentialDto>>> List(Guid patientId)
        => Ok(await _service.ListCredentialsAsync(patientId));

    [HttpDelete("credentials/{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        await _service.RevokeCredentialAsync(id, GetUserId());
        return NoContent();
    }

    [HttpPost("sign-begin")]
    public async Task<ActionResult<BiometricSignBeginResponseDto>> SignBegin([FromBody] BiometricSignBeginDto dto)
        => Ok(await _service.BeginSignAsync(dto));

    [HttpPost("sign-finish")]
    public async Task<ActionResult<BiometricSignFinishResponseDto>> SignFinish([FromBody] BiometricSignFinishDto dto)
        => Ok(await _service.FinishSignAsync(dto, GetClientIp()));
}

// ============================================================
// Gap #3 - BHXH Inspector portal controller
// ============================================================
[ApiController]
[Route("api/inspector-portal")]
[TypeFilter(typeof(DomainExceptionFilter))]
public class BhxhInspectorPortalController : ControllerBase
{
    private readonly IBhxhInspectorService _service;
    public BhxhInspectorPortalController(IBhxhInspectorService service) { _service = service; }

    private Guid GetInspectorId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
    private Guid GetUserId() => GetInspectorId();
    private string? GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<InspectorLoginResponseDto>> Login([FromBody] InspectorLoginDto dto)
        => Ok(await _service.LoginAsync(dto, GetClientIp() ?? "127.0.0.1"));

    [HttpGet("records")]
    [Authorize(Roles = RoleNames.BhxhInspector)]
    public async Task<ActionResult<InspectorRecordSearchResultDto>> SearchRecords([FromQuery] InspectorSearchRecordDto dto)
        => Ok(await _service.SearchRecordsAsync(dto, GetInspectorId(), GetClientIp()));

    [HttpGet("records/{id:guid}")]
    [Authorize(Roles = RoleNames.BhxhInspector)]
    public async Task<ActionResult<InspectorRecordDetailDto>> GetRecord(Guid id)
    {
        var detail = await _service.GetRecordDetailAsync(id, GetInspectorId(), GetClientIp());
        return detail == null ? NotFound() : Ok(detail);
    }

    [HttpGet("records/{id:guid}/signed-xml")]
    [Authorize(Roles = RoleNames.BhxhInspector)]
    public async Task<IActionResult> DownloadSignedXml(Guid id)
    {
        var bytes = await _service.DownloadSignedXmlAsync(id, GetInspectorId(), GetClientIp());
        if (bytes == null) return NotFound();
        return File(bytes, "application/xml", $"HSBA_{id}.xml");
    }

    // Admin: quản lý tài khoản inspector
    [HttpGet("accounts")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<List<InspectorAccountDto>>> ListAccounts()
        => Ok(await _service.ListAccountsAsync());

    [HttpPost("accounts")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<InspectorAccountDto>> CreateAccount([FromBody] InspectorCreateDto dto)
        => Ok(await _service.CreateAccountAsync(dto, GetUserId()));

    [HttpPut("accounts/{id:guid}/active")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] bool isActive)
    {
        await _service.UpdateAccountActiveAsync(id, isActive, GetUserId());
        return NoContent();
    }

    [HttpPost("accounts/{id:guid}/reset-password")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPwDto dto)
    {
        await _service.ResetPasswordAsync(id, dto.NewPassword, GetUserId());
        return NoContent();
    }

}

// ============================================================
// Gap #4 - HL7 EMR archive controller
// ============================================================
[ApiController]
[Route("api/emr/hl7")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class EmrHl7ArchiveController : ControllerBase
{
    private readonly IEmrHl7ArchiveService _service;
    public EmrHl7ArchiveController(IEmrHl7ArchiveService service) { _service = service; }

    [HttpPost("export")]
    public async Task<ActionResult<Hl7ExportResponseDto>> Export([FromBody] Hl7ExportRequestDto request)
        => Ok(await _service.GenerateAsync(request));

    [HttpGet("export/{medicalRecordId:guid}")]
    public async Task<IActionResult> ExportFile(Guid medicalRecordId)
    {
        var result = await _service.GenerateAsync(new Hl7ExportRequestDto { MedicalRecordId = medicalRecordId });
        return File(System.Text.Encoding.UTF8.GetBytes(result.Hl7Content), "text/plain", result.FileName);
    }
}

// ============================================================
// Gap #5 - EMR Cloud sync controller
// ============================================================
[ApiController]
[Route("api/emr/cloud-sync")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class EmrCloudSyncController : ControllerBase
{
    private readonly IEmrCloudSyncService _service;
    public EmrCloudSyncController(IEmrCloudSyncService service) { _service = service; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost("sync")]
    public async Task<ActionResult<EmrCloudSyncResponseDto>> Sync([FromBody] EmrCloudSyncRequestDto request)
        => Ok(await _service.SyncRecordAsync(request, GetUserId()));

    [HttpGet("logs")]
    public async Task<ActionResult<List<EmrCloudSyncLogDto>>> Logs(
        [FromQuery] Guid? medicalRecordId, [FromQuery] string? status,
        [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 30)
        => Ok(await _service.GetLogsAsync(medicalRecordId, status, pageIndex, pageSize));

    [HttpGet("status")]
    public async Task<ActionResult<EmrCloudSyncStatusDto>> Status()
        => Ok(await _service.GetStatusAsync());

    [HttpPost("retry-failed")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> RetryFailed()
    {
        var count = await _service.RetryFailedAsync(GetUserId());
        return Ok(new { retried = count });
    }
}

// ============================================================
// Gap #6 - DICOM auto-send + transmission controller
// ============================================================
[ApiController]
[Route("api/dicom-autosend")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class DicomAutoSendController : ControllerBase
{
    private readonly IDicomAutoSendService _service;
    public DicomAutoSendController(IDicomAutoSendService service) { _service = service; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet("rules")]
    public async Task<ActionResult<List<DicomAutoSendRuleDto>>> ListRules()
        => Ok(await _service.ListRulesAsync());

    [HttpPost("rules")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.RadiologistManager)]
    public async Task<ActionResult<DicomAutoSendRuleDto>> CreateRule([FromBody] DicomAutoSendRuleCreateDto dto)
        => Ok(await _service.CreateRuleAsync(dto, GetUserId()));

    [HttpPut("rules/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.RadiologistManager)]
    public async Task<ActionResult<DicomAutoSendRuleDto>> UpdateRule(Guid id, [FromBody] DicomAutoSendRuleCreateDto dto)
        => Ok(await _service.UpdateRuleAsync(id, dto, GetUserId()));

    [HttpDelete("rules/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        await _service.DeleteRuleAsync(id, GetUserId());
        return NoContent();
    }

    [HttpPost("send")]
    public async Task<ActionResult<DicomTransmissionLogDto>> Send([FromBody] DicomSendRequestDto dto)
        => Ok(await _service.SendStudyAsync(dto, GetUserId()));

    [HttpGet("transmissions")]
    public async Task<ActionResult<List<DicomTransmissionLogDto>>> SearchTransmissions(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? status,
        [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 30)
        => Ok(await _service.SearchTransmissionsAsync(from, to, status, pageIndex, pageSize));

    [HttpGet("stats")]
    public async Task<ActionResult<DicomTransmissionStatsDto>> Stats(
        [FromQuery] DateTime from, [FromQuery] DateTime to)
        => Ok(await _service.GetStatsAsync(from, to));

    [HttpPost("trigger-check")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> TriggerCheck()
    {
        var n = await _service.TriggerAutoSendCheckAsync();
        return Ok(new { triggered = n });
    }
}

// ============================================================
// Gap #8 - HL7 message retry queue controller
// ============================================================
[ApiController]
[Route("api/hl7-queue")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class Hl7QueueController : ControllerBase
{
    private readonly IHl7QueueService _service;
    public Hl7QueueController(IHl7QueueService service) { _service = service; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet]
    public async Task<ActionResult<Hl7QueueSearchResultDto>> Search([FromQuery] Hl7QueueSearchDto dto)
        => Ok(await _service.SearchAsync(dto));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Hl7MessageQueueDto>> GetById(Guid id)
    {
        var msg = await _service.GetByIdAsync(id);
        return msg == null ? NotFound() : Ok(msg);
    }

    [HttpPost("{id:guid}/retry")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.LabManager)]
    public async Task<ActionResult<Hl7MessageQueueDto>> Retry(Guid id)
        => Ok(await _service.RetryAsync(id, GetUserId()));

    [HttpPost("retry-all-failed")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.LabManager)]
    public async Task<ActionResult<Hl7RetryResultDto>> RetryAllFailed()
        => Ok(await _service.RetryAllFailedAsync(GetUserId()));

    // Demo enqueue endpoint cho test
    [HttpPost("demo-enqueue")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<Hl7MessageQueueDto>> DemoEnqueue([FromBody] DemoEnqueueDto dto)
    {
        var msg = await _service.EnqueueAsync(
            dto.Direction ?? "outbound", dto.Source ?? "HIS", dto.Target ?? "RIS",
            dto.MessageType ?? "ORM^O01", $"DEMO-{DateTime.UtcNow:HHmmssfff}",
            dto.Payload ?? "MSH|^~\\&|HIS|HOSPITAL|RIS|HOSPITAL|...|||ORM^O01|...|P|2.5\r",
            dto.Endpoint, null);
        return Ok(msg);
    }

}

// ============================================================
// Gap #9 - Per-study DICOM activity log controller
// ============================================================
[ApiController]
[Route("api/dicom-study-log")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class DicomStudyActivityController : ControllerBase
{
    private readonly IDicomStudyActivityService _service;
    public DicomStudyActivityController(IDicomStudyActivityService service) { _service = service; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
    private string? GetUserName() => User.FindFirstValue(JwtClaims.FullName);
    private string? GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpGet]
    public async Task<ActionResult<DicomStudyActivityLogSearchResultDto>> Search([FromQuery] DicomStudyActivityLogSearchDto dto)
        => Ok(await _service.SearchAsync(dto));

    [HttpGet("study/{studyUid}")]
    public async Task<ActionResult<List<DicomStudyActivityLogDto>>> StudyTimeline(string studyUid)
        => Ok(await _service.GetStudyTimelineAsync(studyUid));

    [HttpPost("log")]
    public async Task<IActionResult> Log([FromBody] LogDto dto)
    {
        await _service.LogAsync(dto.StudyInstanceUid, dto.Action, dto.RadiologyRequestId,
            GetUserId(), GetUserName(), dto.ActionDetails, dto.MachineName, GetClientIp(), dto.RelatedReportId);
        return NoContent();
    }

}
