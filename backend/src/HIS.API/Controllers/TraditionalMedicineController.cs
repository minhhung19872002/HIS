using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/traditional-medicine")]
[Authorize]
public class TraditionalMedicineController : ControllerBase
{
    private readonly ITraditionalMedicineService _service;

    public TraditionalMedicineController(ITraditionalMedicineService service)
    {
        _service = service;
    }

    [HttpGet("treatments")]
    public async Task<ActionResult<List<TraditionalMedicineTreatmentDto>>> SearchTreatments(
        [FromQuery] string? keyword = null, [FromQuery] string? treatmentType = null,
        [FromQuery] int? status = null, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
    {
        var filter = new TraditionalMedicineSearchDto { Keyword = keyword, TreatmentType = treatmentType, Status = status, FromDate = fromDate, ToDate = toDate };
        return Ok(await _service.SearchTreatmentsAsync(filter));
    }

    [HttpGet("treatments/{id}")]
    public async Task<ActionResult<TraditionalMedicineTreatmentDetailDto>> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("treatments")]
    public async Task<ActionResult<TraditionalMedicineTreatmentDto>> CreateTreatment([FromBody] CreateTraditionalMedicineTreatmentDto dto)
    {
        return Ok(await _service.CreateTreatmentAsync(dto));
    }

    [HttpPut("treatments/{id}")]
    public async Task<ActionResult<TraditionalMedicineTreatmentDto>> UpdateTreatment(Guid id, [FromBody] CreateTraditionalMedicineTreatmentDto dto)
    {
        return Ok(await _service.UpdateTreatmentAsync(id, dto));
    }

    [HttpPost("herbal-prescriptions")]
    public async Task<ActionResult<HerbalPrescriptionDto>> CreateHerbalPrescription([FromBody] CreateHerbalPrescriptionDto dto)
    {
        return Ok(await _service.CreateHerbalPrescriptionAsync(dto));
    }

    [HttpGet("treatments/{treatmentId}/herbal-prescriptions")]
    public async Task<ActionResult<List<HerbalPrescriptionDto>>> GetHerbalPrescriptions(Guid treatmentId)
    {
        return Ok(await _service.GetHerbalPrescriptionsAsync(treatmentId));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<TraditionalMedicineStatsDto>> GetStats()
    {
        return Ok(await _service.GetStatsAsync());
    }

    [HttpPut("treatments/{id}/complete")]
    public async Task<ActionResult<TraditionalMedicineTreatmentDto>> CompleteTreatment(Guid id)
    {
        return Ok(await _service.CompleteTreatmentAsync(id));
    }
}
