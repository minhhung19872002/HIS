using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetById(Guid id)
    {
        var patient = await _patientService.GetByIdAsync(id);
        if (patient == null)
            return NotFound(ApiResponse<PatientDto>.Fail("Patient not found"));

        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpGet("by-code/{code}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetByCode(string code)
    {
        var patient = await _patientService.GetByCodeAsync(code);
        if (patient == null)
            return NotFound(ApiResponse<PatientDto>.Fail("Patient not found"));

        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpGet("by-identity/{identityNumber}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetByIdentityNumber(string identityNumber)
    {
        var patient = await _patientService.GetByIdentityNumberAsync(identityNumber);
        if (patient == null)
            return NotFound(ApiResponse<PatientDto>.Fail("Patient not found"));

        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpGet("by-insurance/{insuranceNumber}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetByInsuranceNumber(string insuranceNumber)
    {
        var patient = await _patientService.GetByInsuranceNumberAsync(insuranceNumber);
        if (patient == null)
            return NotFound(ApiResponse<PatientDto>.Fail("Patient not found"));

        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpPost("search")]
    public async Task<ActionResult<ApiResponse<PagedResultDto<PatientDto>>>> Search([FromBody] PatientSearchDto dto)
    {
        var result = await _patientService.SearchAsync(dto);
        return Ok(ApiResponse<PagedResultDto<PatientDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Create([FromBody] CreatePatientDto dto)
    {
        var patient = await _patientService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = patient.Id },
            ApiResponse<PatientDto>.Ok(patient, "Patient created successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Update(Guid id, [FromBody] UpdatePatientDto dto)
    {
        if (id != dto.Id)
            return BadRequest(ApiResponse<PatientDto>.Fail("Id mismatch"));

        try
        {
            var patient = await _patientService.UpdateAsync(dto);
            return Ok(ApiResponse<PatientDto>.Ok(patient, "Patient updated successfully"));
        }
        catch (Exception ex)
        {
            return NotFound(ApiResponse<PatientDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id)
    {
        try
        {
            await _patientService.DeleteAsync(id);
            return Ok(ApiResponse<bool>.Ok(true, "Patient deleted successfully"));
        }
        catch (Exception ex)
        {
            return NotFound(ApiResponse<bool>.Fail(ex.Message));
        }
    }
}
