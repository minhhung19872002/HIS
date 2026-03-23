using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/public-health")]
[Authorize]
public class PublicHealthController : ControllerBase
{
    private readonly IPublicHealthService _service;

    public PublicHealthController(IPublicHealthService service)
    {
        _service = service;
    }

    // =====================================================================
    // HEALTH CHECKUP (Khám sức khỏe)
    // =====================================================================

    [HttpGet("checkups")]
    public async Task<IActionResult> GetHealthCheckups([FromQuery] HealthCheckupSearchDto? filter)
    {
        var result = await _service.GetHealthCheckupsAsync(filter);
        return Ok(result);
    }

    [HttpGet("checkups/{id}")]
    public async Task<IActionResult> GetHealthCheckupById(Guid id)
    {
        var result = await _service.GetHealthCheckupByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("checkups")]
    public async Task<IActionResult> CreateHealthCheckup([FromBody] CreateHealthCheckupDto dto)
    {
        var result = await _service.CreateHealthCheckupAsync(dto);
        return Ok(result);
    }

    [HttpPut("checkups/{id}")]
    public async Task<IActionResult> UpdateHealthCheckup(Guid id, [FromBody] UpdateHealthCheckupDto dto)
    {
        try
        {
            var result = await _service.UpdateHealthCheckupAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("checkups/{id}")]
    public async Task<IActionResult> DeleteHealthCheckup(Guid id)
    {
        try
        {
            await _service.DeleteHealthCheckupAsync(id);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("checkups/statistics")]
    public async Task<IActionResult> GetHealthCheckupStats()
    {
        var result = await _service.GetHealthCheckupStatsAsync();
        return Ok(result);
    }

    // =====================================================================
    // VACCINATION (Tiêm chủng)
    // =====================================================================

    [HttpGet("vaccinations")]
    public async Task<IActionResult> GetVaccinationRecords([FromQuery] VaccinationSearchDto? filter)
    {
        var result = await _service.GetVaccinationRecordsAsync(filter);
        return Ok(result);
    }

    [HttpGet("vaccinations/{id}")]
    public async Task<IActionResult> GetVaccinationRecordById(Guid id)
    {
        var result = await _service.GetVaccinationRecordByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("vaccinations")]
    public async Task<IActionResult> RecordVaccination([FromBody] CreateVaccinationRecordDto dto)
    {
        var result = await _service.RecordVaccinationAsync(dto);
        return Ok(result);
    }

    [HttpPut("vaccinations/{id}")]
    public async Task<IActionResult> UpdateVaccinationRecord(Guid id, [FromBody] UpdateVaccinationRecordDto dto)
    {
        try
        {
            var result = await _service.UpdateVaccinationRecordAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("vaccinations/{id}")]
    public async Task<IActionResult> DeleteVaccinationRecord(Guid id)
    {
        try
        {
            await _service.DeleteVaccinationRecordAsync(id);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("vaccinations/schedule/{patientId}")]
    public async Task<IActionResult> GetVaccinationSchedule(Guid patientId)
    {
        var result = await _service.GetVaccinationScheduleAsync(patientId);
        return Ok(result);
    }

    [HttpGet("vaccinations/campaigns")]
    public async Task<IActionResult> GetVaccinationCampaigns()
    {
        var result = await _service.GetVaccinationCampaignsAsync();
        return Ok(result);
    }

    [HttpPost("vaccinations/campaigns")]
    public async Task<IActionResult> CreateVaccinationCampaign([FromBody] CreateVaccinationCampaignDto dto)
    {
        var result = await _service.CreateVaccinationCampaignAsync(dto);
        return Ok(result);
    }

    [HttpGet("vaccinations/statistics")]
    public async Task<IActionResult> GetVaccinationStats()
    {
        var result = await _service.GetVaccinationStatsAsync();
        return Ok(result);
    }

    // =====================================================================
    // DISEASE SURVEILLANCE (Giám sát dịch tễ)
    // =====================================================================

    [HttpGet("diseases")]
    public async Task<IActionResult> GetDiseaseReports([FromQuery] DiseaseReportSearchDto? filter)
    {
        var result = await _service.GetDiseaseReportsAsync(filter);
        return Ok(result);
    }

    [HttpGet("diseases/{id}")]
    public async Task<IActionResult> GetDiseaseReportById(Guid id)
    {
        var result = await _service.GetDiseaseReportByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("diseases")]
    public async Task<IActionResult> ReportDisease([FromBody] CreateDiseaseReportDto dto)
    {
        var result = await _service.ReportDiseaseAsync(dto);
        return Ok(result);
    }

    [HttpPut("diseases/{id}")]
    public async Task<IActionResult> UpdateDiseaseReport(Guid id, [FromBody] UpdateDiseaseReportDto dto)
    {
        try
        {
            var result = await _service.UpdateDiseaseReportAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("diseases/{id}")]
    public async Task<IActionResult> DeleteDiseaseReport(Guid id)
    {
        try
        {
            await _service.DeleteDiseaseReportAsync(id);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("outbreaks")]
    public async Task<IActionResult> GetOutbreakEvents()
    {
        var result = await _service.GetOutbreakEventsAsync();
        return Ok(result);
    }

    [HttpPost("outbreaks")]
    public async Task<IActionResult> CreateOutbreakEvent([FromBody] CreateOutbreakEventDto dto)
    {
        var result = await _service.CreateOutbreakEventAsync(dto);
        return Ok(result);
    }

    [HttpPut("outbreaks/{id}")]
    public async Task<IActionResult> UpdateOutbreakEvent(Guid id, [FromBody] UpdateOutbreakEventDto dto)
    {
        try
        {
            var result = await _service.UpdateOutbreakEventAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("diseases/statistics")]
    public async Task<IActionResult> GetDiseaseStats()
    {
        var result = await _service.GetDiseaseStatsAsync();
        return Ok(result);
    }

    // =====================================================================
    // SCHOOL HEALTH (Y tế trường học)
    // =====================================================================

    [HttpGet("school-health")]
    public async Task<IActionResult> GetSchoolHealthExams([FromQuery] SchoolHealthSearchDto? filter)
    {
        var result = await _service.GetSchoolHealthExamsAsync(filter);
        return Ok(result);
    }

    [HttpGet("school-health/{id}")]
    public async Task<IActionResult> GetSchoolHealthExamById(Guid id)
    {
        var result = await _service.GetSchoolHealthExamByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("school-health")]
    public async Task<IActionResult> CreateSchoolHealthExam([FromBody] CreateSchoolHealthExamDto dto)
    {
        var result = await _service.CreateSchoolHealthExamAsync(dto);
        return Ok(result);
    }

    [HttpPut("school-health/{id}")]
    public async Task<IActionResult> UpdateSchoolHealthExam(Guid id, [FromBody] UpdateSchoolHealthExamDto dto)
    {
        try
        {
            var result = await _service.UpdateSchoolHealthExamAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("school-health/{id}")]
    public async Task<IActionResult> DeleteSchoolHealthExam(Guid id)
    {
        try
        {
            await _service.DeleteSchoolHealthExamAsync(id);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("school-health/statistics")]
    public async Task<IActionResult> GetSchoolHealthStats()
    {
        var result = await _service.GetSchoolHealthStatsAsync();
        return Ok(result);
    }

    // =====================================================================
    // OCCUPATIONAL HEALTH (Sức khỏe nghề nghiệp)
    // =====================================================================

    [HttpGet("occupational-health")]
    public async Task<IActionResult> GetOccupationalHealthExams([FromQuery] OccupationalHealthSearchDto? filter)
    {
        var result = await _service.GetOccupationalHealthExamsAsync(filter);
        return Ok(result);
    }

    [HttpGet("occupational-health/{id}")]
    public async Task<IActionResult> GetOccupationalHealthExamById(Guid id)
    {
        var result = await _service.GetOccupationalHealthExamByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("occupational-health")]
    public async Task<IActionResult> CreateOccupationalHealthExam([FromBody] CreateOccupationalHealthExamDto dto)
    {
        var result = await _service.CreateOccupationalHealthExamAsync(dto);
        return Ok(result);
    }

    [HttpPut("occupational-health/{id}")]
    public async Task<IActionResult> UpdateOccupationalHealthExam(Guid id, [FromBody] UpdateOccupationalHealthExamDto dto)
    {
        try
        {
            var result = await _service.UpdateOccupationalHealthExamAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("occupational-health/{id}")]
    public async Task<IActionResult> DeleteOccupationalHealthExam(Guid id)
    {
        try
        {
            await _service.DeleteOccupationalHealthExamAsync(id);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("occupational-health/statistics")]
    public async Task<IActionResult> GetOccupationalHealthStats()
    {
        var result = await _service.GetOccupationalHealthStatsAsync();
        return Ok(result);
    }

    // =====================================================================
    // METHADONE TREATMENT (Điều trị Methadone)
    // =====================================================================

    [HttpGet("methadone/patients")]
    public async Task<IActionResult> GetMethadonePatients([FromQuery] MethadonePatientSearchDto? filter)
    {
        var result = await _service.GetMethadonePatientsAsync(filter);
        return Ok(result);
    }

    [HttpGet("methadone/patients/{id}")]
    public async Task<IActionResult> GetMethadonePatientById(Guid id)
    {
        var result = await _service.GetMethadonePatientByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("methadone/patients")]
    public async Task<IActionResult> CreateMethadonePatient([FromBody] CreateMethadonePatientDto dto)
    {
        var result = await _service.CreateMethadonePatientAsync(dto);
        return Ok(result);
    }

    [HttpPut("methadone/patients/{id}")]
    public async Task<IActionResult> UpdateMethadonePatient(Guid id, [FromBody] UpdateMethadonePatientDto dto)
    {
        try
        {
            var result = await _service.UpdateMethadonePatientAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("methadone/patients/{id}/dosing-history")]
    public async Task<IActionResult> GetDosingHistory(Guid id)
    {
        var result = await _service.GetDosingHistoryAsync(id);
        return Ok(result);
    }

    [HttpPost("methadone/dosing")]
    public async Task<IActionResult> RecordDose([FromBody] CreateMethadoneDosingDto dto)
    {
        try
        {
            var result = await _service.RecordDoseAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("methadone/patients/{id}/urine-tests")]
    public async Task<IActionResult> GetUrineTests(Guid id)
    {
        var result = await _service.GetUrineTestsAsync(id);
        return Ok(result);
    }

    [HttpPost("methadone/urine-tests")]
    public async Task<IActionResult> RecordUrineTest([FromBody] CreateMethadoneUrineTestDto dto)
    {
        try
        {
            var result = await _service.RecordUrineTestAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("methadone/statistics")]
    public async Task<IActionResult> GetMethadoneStats()
    {
        var result = await _service.GetMethadoneStatsAsync();
        return Ok(result);
    }
}
