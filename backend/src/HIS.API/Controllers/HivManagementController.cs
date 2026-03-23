using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/hiv-management")]
[Authorize]
public class HivManagementController : ControllerBase
{
    private readonly IHivManagementService _hivManagementService;

    public HivManagementController(IHivManagementService hivManagementService)
    {
        _hivManagementService = hivManagementService;
    }

    // ==================== HIV Patients ====================

    [HttpGet("patients")]
    public async Task<ActionResult<List<HivPatientListDto>>> SearchPatients(
        [FromQuery] string? keyword = null,
        [FromQuery] int? artStatus = null,
        [FromQuery] int? whoStage = null,
        [FromQuery] bool? isVirallySuppressed = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var filter = new HivPatientSearchDto
        {
            Keyword = keyword,
            ARTStatus = artStatus,
            WHOStage = whoStage,
            IsVirallySuppressed = isVirallySuppressed,
            FromDate = fromDate,
            ToDate = toDate,
        };
        var result = await _hivManagementService.SearchPatientsAsync(filter);
        return Ok(result);
    }

    [HttpGet("patients/{id}")]
    public async Task<ActionResult<HivPatientListDto>> GetPatientById(Guid id)
    {
        var result = await _hivManagementService.GetPatientByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("patients")]
    public async Task<ActionResult<HivPatientListDto>> CreatePatient([FromBody] HivPatientCreateDto dto)
    {
        var result = await _hivManagementService.CreatePatientAsync(dto);
        return Ok(result);
    }

    [HttpPut("patients/{id}")]
    public async Task<ActionResult<HivPatientListDto>> UpdatePatient(Guid id, [FromBody] HivPatientUpdateDto dto)
    {
        var result = await _hivManagementService.UpdatePatientAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("patients/stats")]
    public async Task<ActionResult<HivPatientStatsDto>> GetPatientStats()
    {
        var result = await _hivManagementService.GetPatientStatsAsync();
        return Ok(result);
    }

    // ==================== Lab Results ====================

    [HttpGet("lab-results")]
    public async Task<ActionResult<List<HivLabResultListDto>>> SearchLabResults(
        [FromQuery] Guid? hivPatientId = null,
        [FromQuery] string? testType = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null)
    {
        var filter = new HivLabResultSearchDto
        {
            HivPatientId = hivPatientId,
            TestType = testType,
            FromDate = fromDate,
            ToDate = toDate,
        };
        var result = await _hivManagementService.SearchLabResultsAsync(filter);
        return Ok(result);
    }

    [HttpPost("lab-results")]
    public async Task<ActionResult<HivLabResultListDto>> CreateLabResult([FromBody] HivLabResultCreateDto dto)
    {
        var result = await _hivManagementService.CreateLabResultAsync(dto);
        return Ok(result);
    }

    // ==================== PMTCT ====================

    [HttpGet("pmtct/{hivPatientId}")]
    public async Task<ActionResult<List<PmtctRecordListDto>>> GetPmtctRecords(Guid hivPatientId)
    {
        var result = await _hivManagementService.GetPmtctRecordsByPatientAsync(hivPatientId);
        return Ok(result);
    }

    [HttpPost("pmtct")]
    public async Task<ActionResult<PmtctRecordListDto>> CreatePmtctRecord([FromBody] PmtctRecordCreateDto dto)
    {
        var result = await _hivManagementService.CreatePmtctRecordAsync(dto);
        return Ok(result);
    }

    [HttpPut("pmtct/{id}")]
    public async Task<ActionResult<PmtctRecordListDto>> UpdatePmtctRecord(Guid id, [FromBody] PmtctRecordUpdateDto dto)
    {
        var result = await _hivManagementService.UpdatePmtctRecordAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("pmtct/stats")]
    public async Task<ActionResult<PmtctStatsDto>> GetPmtctStats()
    {
        var result = await _hivManagementService.GetPmtctStatsAsync();
        return Ok(result);
    }
}
