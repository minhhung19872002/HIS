using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Clinical;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/clinical-records")]
[Authorize]
public class ClinicalRecordController : ControllerBase
{
    private readonly IClinicalRecordService _service;

    public ClinicalRecordController(IClinicalRecordService service)
    {
        _service = service;
    }

    // ========== Partograph ==========

    [HttpGet("partograph")]
    public async Task<ActionResult<List<PartographRecordDto>>> GetPartographRecords(
        [FromQuery] Guid? admissionId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 100)
    {
        var filter = new PartographSearchDto
        {
            AdmissionId = admissionId,
            FromDate = fromDate,
            ToDate = toDate,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _service.GetPartographRecordsAsync(filter);
        return Ok(result);
    }

    [HttpPost("partograph")]
    public async Task<ActionResult<PartographRecordDto>> SavePartographRecord([FromBody] PartographSaveDto dto)
    {
        var result = await _service.SavePartographRecordAsync(dto);
        return Ok(result);
    }

    [HttpDelete("partograph/{id}")]
    public async Task<ActionResult> DeletePartographRecord(Guid id)
    {
        var success = await _service.DeletePartographRecordAsync(id);
        if (!success) return NotFound();
        return Ok(new { success = true });
    }

    // ========== Anesthesia ==========

    [HttpGet("anesthesia")]
    public async Task<ActionResult<List<AnesthesiaRecordDto>>> GetAnesthesiaRecords(
        [FromQuery] Guid? surgeryId = null,
        [FromQuery] Guid? patientId = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 100)
    {
        var filter = new AnesthesiaSearchDto
        {
            SurgeryId = surgeryId,
            PatientId = patientId,
            FromDate = fromDate,
            ToDate = toDate,
            Status = status,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _service.GetAnesthesiaRecordsAsync(filter);
        return Ok(result);
    }

    [HttpGet("anesthesia/{id}")]
    public async Task<ActionResult<AnesthesiaRecordDto>> GetAnesthesiaById(Guid id)
    {
        var result = await _service.GetAnesthesiaByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("anesthesia")]
    public async Task<ActionResult<AnesthesiaRecordDto>> SaveAnesthesiaRecord([FromBody] AnesthesiaSaveDto dto)
    {
        var result = await _service.SaveAnesthesiaRecordAsync(dto);
        return Ok(result);
    }

    [HttpDelete("anesthesia/{id}")]
    public async Task<ActionResult> DeleteAnesthesiaRecord(Guid id)
    {
        var success = await _service.DeleteAnesthesiaRecordAsync(id);
        if (!success) return NotFound();
        return Ok(new { success = true });
    }
}
