using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.EmrAdmin;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/emr-admin")]
[Authorize]
public class EmrAdminController : ControllerBase
{
    private readonly IEmrAdminService _service;

    public EmrAdminController(IEmrAdminService service) => _service = service;

    // ============ Cover Types (Vo benh an) ============
    [HttpGet("cover-types")]
    public async Task<IActionResult> GetCoverTypes([FromQuery] string? keyword, [FromQuery] string? category)
        => Ok(await _service.GetCoverTypesAsync(keyword, category));

    [HttpPost("cover-types")]
    public async Task<IActionResult> SaveCoverType([FromBody] SaveEmrCoverTypeDto dto)
        => Ok(await _service.SaveCoverTypeAsync(dto));

    [HttpDelete("cover-types/{id}")]
    public async Task<IActionResult> DeleteCoverType(Guid id)
        => await _service.DeleteCoverTypeAsync(id) ? Ok() : NotFound();

    // ============ Signer Catalog (Nguoi ky) ============
    [HttpGet("signers")]
    public async Task<IActionResult> GetSigners([FromQuery] string? keyword, [FromQuery] Guid? departmentId)
        => Ok(await _service.GetSignersAsync(keyword, departmentId));

    [HttpPost("signers")]
    public async Task<IActionResult> SaveSigner([FromBody] SaveEmrSignerDto dto)
        => Ok(await _service.SaveSignerAsync(dto));

    [HttpDelete("signers/{id}")]
    public async Task<IActionResult> DeleteSigner(Guid id)
        => await _service.DeleteSignerAsync(id) ? Ok() : NotFound();

    // ============ Signing Roles (Vai tro ky) ============
    [HttpGet("signing-roles")]
    public async Task<IActionResult> GetSigningRoles()
        => Ok(await _service.GetSigningRolesAsync());

    [HttpPost("signing-roles")]
    public async Task<IActionResult> SaveSigningRole([FromBody] SaveEmrSigningRoleDto dto)
        => Ok(await _service.SaveSigningRoleAsync(dto));

    [HttpDelete("signing-roles/{id}")]
    public async Task<IActionResult> DeleteSigningRole(Guid id)
        => await _service.DeleteSigningRoleAsync(id) ? Ok() : NotFound();

    // ============ Signing Operations (Nghiep vu ky) ============
    [HttpGet("signing-operations")]
    public async Task<IActionResult> GetSigningOperations([FromQuery] string? documentType)
        => Ok(await _service.GetSigningOperationsAsync(documentType));

    [HttpPost("signing-operations")]
    public async Task<IActionResult> SaveSigningOperation([FromBody] SaveEmrSigningOperationDto dto)
        => Ok(await _service.SaveSigningOperationAsync(dto));

    [HttpDelete("signing-operations/{id}")]
    public async Task<IActionResult> DeleteSigningOperation(Guid id)
        => await _service.DeleteSigningOperationAsync(id) ? Ok() : NotFound();

    // ============ Document Groups (Nhom van ban) ============
    [HttpGet("document-groups")]
    public async Task<IActionResult> GetDocumentGroups()
        => Ok(await _service.GetDocumentGroupsAsync());

    [HttpPost("document-groups")]
    public async Task<IActionResult> SaveDocumentGroup([FromBody] SaveEmrDocumentGroupDto dto)
        => Ok(await _service.SaveDocumentGroupAsync(dto));

    [HttpDelete("document-groups/{id}")]
    public async Task<IActionResult> DeleteDocumentGroup(Guid id)
        => await _service.DeleteDocumentGroupAsync(id) ? Ok() : NotFound();

    // ============ Document Types (Loai van ban) ============
    [HttpGet("document-types")]
    public async Task<IActionResult> GetDocumentTypes([FromQuery] Guid? groupId)
        => Ok(await _service.GetDocumentTypesAsync(groupId));

    [HttpPost("document-types")]
    public async Task<IActionResult> SaveDocumentType([FromBody] SaveEmrDocumentTypeDto dto)
        => Ok(await _service.SaveDocumentTypeAsync(dto));

    [HttpDelete("document-types/{id}")]
    public async Task<IActionResult> DeleteDocumentType(Guid id)
        => await _service.DeleteDocumentTypeAsync(id) ? Ok() : NotFound();

    // ============ Completeness Check ============
    [HttpGet("completeness/{recordId}")]
    public async Task<IActionResult> GetCompletenessCheck(Guid recordId)
        => Ok(await _service.GetCompletenessCheckAsync(recordId));

    // ============ Finalization ============
    [HttpPost("finalize/{recordId}")]
    public async Task<IActionResult> FinalizeRecord(Guid recordId, [FromBody] FinalizeRecordDto? dto)
    {
        var request = dto ?? new FinalizeRecordDto();
        request.MedicalRecordId = recordId;
        return Ok(await _service.FinalizeRecordAsync(request));
    }

    // ============ Attachments ============
    [HttpGet("attachments/{recordId}")]
    public async Task<IActionResult> GetAttachments(Guid recordId)
        => Ok(await _service.GetAttachmentsAsync(recordId));

    [HttpPost("attachments")]
    public async Task<IActionResult> SaveAttachment([FromBody] SaveAttachmentDto dto)
        => Ok(await _service.SaveAttachmentAsync(dto));

    [HttpDelete("attachments/{id}")]
    public async Task<IActionResult> DeleteAttachment(Guid id)
        => await _service.DeleteAttachmentAsync(id) ? Ok() : NotFound();

    // ============ Print Logs ============
    [HttpGet("print-logs/{recordId}")]
    public async Task<IActionResult> GetPrintLogs(Guid recordId)
        => Ok(await _service.GetPrintLogsAsync(recordId));

    [HttpPost("print-log")]
    public async Task<IActionResult> LogPrint([FromBody] LogPrintDto dto)
        => Ok(await _service.LogPrintAsync(dto));

    [HttpPost("print-log/stamp")]
    public async Task<IActionResult> StampPrintLog([FromBody] StampPrintLogDto dto)
        => await _service.StampPrintLogAsync(dto) ? Ok() : NotFound();

    // ============ Archive Barcode ============
    [HttpGet("barcode/{archiveId}")]
    public async Task<IActionResult> GetArchiveBarcode(Guid archiveId)
    {
        var result = await _service.GetArchiveBarcodeAsync(archiveId);
        return result != null ? Ok(result) : NotFound();
    }

    // ============ HL7 Import/Export ============
    [HttpPost("import-hl7")]
    public async Task<IActionResult> ImportHl7([FromBody] Hl7ImportDto dto)
        => Ok(await _service.ImportHl7Async(dto));

    [HttpGet("export-hl7/{recordId}")]
    public async Task<IActionResult> ExportHl7(Guid recordId)
    {
        var result = await _service.ExportHl7Async(recordId);
        return result != null ? Ok(result) : NotFound();
    }
}
