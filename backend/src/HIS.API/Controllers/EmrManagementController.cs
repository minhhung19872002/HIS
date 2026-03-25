using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/emr-management")]
[Authorize]
public class EmrManagementController : ControllerBase
{
    private readonly IEmrManagementService _service;

    public EmrManagementController(IEmrManagementService service) => _service = service;

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    // ============ Sharing (B.1.2) ============

    [HttpGet("shares")]
    public async Task<IActionResult> GetShares([FromQuery] Guid examinationId)
        => Ok(await _service.GetSharesAsync(examinationId));

    [HttpPost("shares")]
    public async Task<IActionResult> CreateShare([FromBody] CreateEmrShareDto dto)
        => Ok(await _service.CreateShareAsync(dto));

    [HttpPut("shares/{id}/revoke")]
    public async Task<IActionResult> RevokeShare(Guid id)
        => await _service.RevokeShareAsync(id) ? Ok() : NotFound();

    [HttpGet("shares/{id}/access-logs")]
    public async Task<IActionResult> GetShareAccessLogs(Guid id)
        => Ok(await _service.GetShareAccessLogsAsync(id));

    [HttpGet("shares/validate")]
    public async Task<IActionResult> ValidateShareAccess([FromQuery] Guid shareId, [FromQuery] string? accessCode)
        => Ok(await _service.ValidateShareAccessAsync(shareId, GetUserId()));

    // ============ Extract (B.1.3) ============

    [HttpGet("extracts")]
    public async Task<IActionResult> GetExtracts([FromQuery] Guid examinationId)
        => Ok(await _service.GetExtractsAsync(examinationId));

    [HttpPost("extracts")]
    public async Task<IActionResult> CreateExtract([FromBody] CreateEmrExtractDto dto)
        => Ok(await _service.CreateExtractAsync(dto));

    [HttpPut("extracts/{id}/revoke")]
    public async Task<IActionResult> RevokeExtract(Guid id)
        => await _service.RevokeExtractAsync(id) ? Ok() : NotFound();

    [HttpPost("extracts/validate")]
    public async Task<IActionResult> ValidateExtractAccess([FromBody] ValidateExtractAccessRequestDto dto)
        => Ok(await _service.ValidateExtractAccessAsync(dto.AccessCode));

    // ============ Spine (B.1.5) ============

    [HttpGet("spines")]
    public async Task<IActionResult> GetSpines([FromQuery] string? keyword)
        => Ok(await _service.GetSpinesAsync(keyword));

    [HttpPost("spines")]
    public async Task<IActionResult> SaveSpine([FromBody] SaveEmrSpineDto dto)
        => Ok(await _service.SaveSpineAsync(dto));

    [HttpDelete("spines/{id}")]
    public async Task<IActionResult> DeleteSpine(Guid id)
        => await _service.DeleteSpineAsync(id) ? Ok() : NotFound();

    // ============ Patient Signature (B.1.7) ============

    [HttpGet("patient-signatures")]
    public async Task<IActionResult> GetSignatures([FromQuery] Guid patientId)
        => Ok(await _service.GetSignaturesAsync(patientId));

    [HttpPost("patient-signatures")]
    public async Task<IActionResult> CreateSignature([FromBody] CreatePatientSignatureDto dto)
        => Ok(await _service.CreateSignatureAsync(dto));

    [HttpPut("patient-signatures/{id}/verify")]
    public async Task<IActionResult> VerifySignature(Guid id, [FromQuery] string verificationCode)
        => await _service.VerifySignatureAsync(id, verificationCode) ? Ok() : NotFound();

    // ============ Document Lock (B.1.11) ============

    [HttpPost("locks/acquire")]
    public async Task<IActionResult> AcquireLock([FromBody] AcquireLockDto dto)
    {
        var result = await _service.AcquireLockAsync(dto);
        return result != null ? Ok(result) : Conflict(new { message = "Tai lieu dang bi khoa boi nguoi dung khac" });
    }

    [HttpPost("locks/release")]
    public async Task<IActionResult> ReleaseLock([FromBody] ReleaseLockRequestDto dto)
        => await _service.ReleaseLockAsync(dto.LockId) ? Ok() : NotFound();

    [HttpGet("locks/status")]
    public async Task<IActionResult> GetLockStatus([FromQuery] string documentType, [FromQuery] Guid documentId)
    {
        var result = await _service.GetLockStatusAsync(documentType, documentId);
        return result != null ? Ok(result) : Ok(new { isLocked = false });
    }

    [HttpPost("locks/force-release")]
    public async Task<IActionResult> ForceReleaseLock([FromBody] ForceReleaseLockRequestDto dto)
        => await _service.ForceReleaseLockAsync(dto.LockId) ? Ok() : NotFound();

    // ============ Data Tags (B.1.13) ============

    [HttpGet("data-tags")]
    public async Task<IActionResult> GetDataTags([FromQuery] string? keyword, [FromQuery] string? category, [FromQuery] string? formType)
        => Ok(await _service.GetDataTagsAsync(keyword, category, formType));

    [HttpPost("data-tags")]
    public async Task<IActionResult> SaveDataTag([FromBody] SaveEmrDataTagDto dto)
        => Ok(await _service.SaveDataTagAsync(dto));

    [HttpDelete("data-tags/{id}")]
    public async Task<IActionResult> DeleteDataTag(Guid id)
        => await _service.DeleteDataTagAsync(id) ? Ok() : NotFound();

    // ============ Images (B.1.20) ============

    [HttpGet("images")]
    public async Task<IActionResult> GetImages([FromQuery] string? keyword, [FromQuery] string? category, [FromQuery] Guid? departmentId)
        => Ok(await _service.GetImagesAsync(keyword, category, departmentId));

    [HttpPost("images")]
    public async Task<IActionResult> SaveImage([FromBody] SaveEmrImageDto dto)
        => Ok(await _service.SaveImageAsync(dto));

    [HttpDelete("images/{id}")]
    public async Task<IActionResult> DeleteImage(Guid id)
        => await _service.DeleteImageAsync(id) ? Ok() : NotFound();

    // ============ Shortcodes (B.1.22) ============

    [HttpGet("shortcodes")]
    public async Task<IActionResult> GetShortcodes([FromQuery] string? keyword, [FromQuery] string? category, [FromQuery] Guid? departmentId)
        => Ok(await _service.GetShortcodesAsync(keyword, category, departmentId, GetUserId()));

    [HttpPost("shortcodes")]
    public async Task<IActionResult> SaveShortcode([FromBody] SaveShortcodeDto dto)
        => Ok(await _service.SaveShortcodeAsync(dto));

    [HttpDelete("shortcodes/{id}")]
    public async Task<IActionResult> DeleteShortcode(Guid id)
        => await _service.DeleteShortcodeAsync(id) ? Ok() : NotFound();

    [HttpGet("shortcodes/expand")]
    public async Task<IActionResult> ExpandShortcode([FromQuery] string code)
    {
        var result = await _service.ExpandShortcodeAsync(code, GetUserId());
        return result != null ? Ok(new { fullText = result }) : NotFound();
    }

    // ============ Auto Check (B.1.25) ============

    [HttpGet("auto-check/rules")]
    public async Task<IActionResult> GetRules([FromQuery] string? ruleType)
        => Ok(await _service.GetRulesAsync(ruleType));

    [HttpPost("auto-check/rules")]
    public async Task<IActionResult> SaveRule([FromBody] SaveEmrAutoCheckRuleDto dto)
        => Ok(await _service.SaveRuleAsync(dto));

    [HttpDelete("auto-check/rules/{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
        => await _service.DeleteRuleAsync(id) ? Ok() : NotFound();

    [HttpGet("auto-check/run/{examinationId}")]
    public async Task<IActionResult> RunAutoCheck(Guid examinationId)
        => Ok(await _service.RunAutoCheckAsync(examinationId));

    // ============ Close EMR (B.2.5) ============

    [HttpPost("close")]
    public async Task<IActionResult> CloseEmr([FromBody] CloseEmrDto dto)
        => Ok(await _service.CloseEmrAsync(dto));

    [HttpPost("reopen")]
    public async Task<IActionResult> ReopenEmr([FromBody] ReopenEmrRequestDto dto)
        => await _service.ReopenEmrAsync(dto.ExaminationId, dto.Note) ? Ok() : NotFound();

    [HttpGet("close-logs")]
    public async Task<IActionResult> GetCloseLogs([FromQuery] Guid examinationId)
        => Ok(await _service.GetCloseLogsAsync(examinationId));

    // ============ Data Recovery (B.2.4) ============

    [HttpGet("recovery/deleted")]
    public async Task<IActionResult> GetDeletedRecords([FromQuery] string entityType)
        => Ok(await _service.GetDeletedRecordsAsync(entityType));

    [HttpPost("recovery/restore")]
    public async Task<IActionResult> RestoreRecord([FromBody] RestoreRecordDto dto)
        => await _service.RestoreRecordAsync(dto) ? Ok() : NotFound();
}

// Small request DTOs used only by the controller to receive body parameters
// where the service interface expects different parameter shapes

public class ValidateExtractAccessRequestDto
{
    public string AccessCode { get; set; } = string.Empty;
}

public class ReleaseLockRequestDto
{
    public Guid LockId { get; set; }
}

public class ForceReleaseLockRequestDto
{
    public Guid LockId { get; set; }
}

public class ReopenEmrRequestDto
{
    public Guid ExaminationId { get; set; }
    public string? Note { get; set; }
}
