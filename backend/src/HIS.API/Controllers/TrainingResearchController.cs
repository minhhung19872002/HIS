using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/training")]
[Authorize]
public class TrainingResearchController : ControllerBase
{
    private readonly ITrainingResearchService _service;

    public TrainingResearchController(ITrainingResearchService service)
    {
        _service = service;
    }

    // ---- Classes ----

    [HttpGet("classes")]
    public async Task<ActionResult<List<TrainingClassListDto>>> GetClasses(
        [FromQuery] string? keyword = null,
        [FromQuery] int? trainingType = null,
        [FromQuery] int? status = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new TrainingClassSearchDto
        {
            Keyword = keyword,
            TrainingType = trainingType,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate,
            DepartmentId = departmentId,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        return Ok(await _service.GetClassesAsync(filter));
    }

    [HttpGet("classes/{id}")]
    public async Task<ActionResult<TrainingClassDetailDto>> GetClassById(Guid id)
    {
        var result = await _service.GetClassByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("classes")]
    public async Task<ActionResult<TrainingClassDetailDto>> CreateClass([FromBody] SaveTrainingClassDto dto)
    {
        return Ok(await _service.SaveClassAsync(null, dto));
    }

    [HttpPut("classes/{id}")]
    public async Task<ActionResult<TrainingClassDetailDto>> UpdateClass(Guid id, [FromBody] SaveTrainingClassDto dto)
    {
        return Ok(await _service.SaveClassAsync(id, dto));
    }

    [HttpGet("classes/{classId}/students")]
    public async Task<ActionResult<List<TrainingStudentDto>>> GetClassStudents(Guid classId)
    {
        return Ok(await _service.GetClassStudentsAsync(classId));
    }

    // ---- Students ----

    [HttpPost("students/enroll")]
    public async Task<ActionResult<TrainingStudentDto>> EnrollStudent([FromBody] EnrollStudentDto dto)
    {
        return Ok(await _service.EnrollStudentAsync(dto));
    }

    [HttpPut("students/{studentId}/status")]
    public async Task<ActionResult<TrainingStudentDto>> UpdateStudentStatus(Guid studentId, [FromBody] UpdateStudentStatusDto dto)
    {
        return Ok(await _service.UpdateStudentStatusAsync(studentId, dto));
    }

    [HttpPut("students/{studentId}/certificate")]
    public async Task<ActionResult<TrainingStudentDto>> IssueCertificate(Guid studentId, [FromBody] IssueCertificateDto dto)
    {
        return Ok(await _service.IssueCertificateAsync(studentId, dto));
    }

    // ---- Clinical Direction ----

    [HttpGet("directions")]
    public async Task<ActionResult<List<ClinicalDirectionListDto>>> GetDirections(
        [FromQuery] string? keyword = null,
        [FromQuery] int? directionType = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new ClinicalDirectionSearchDto
        {
            Keyword = keyword,
            DirectionType = directionType,
            Status = status,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        return Ok(await _service.GetDirectionsAsync(filter));
    }

    [HttpGet("directions/{id}")]
    public async Task<ActionResult<ClinicalDirectionDetailDto>> GetDirectionById(Guid id)
    {
        var result = await _service.GetDirectionByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("directions")]
    public async Task<ActionResult<ClinicalDirectionDetailDto>> CreateDirection([FromBody] SaveClinicalDirectionDto dto)
    {
        return Ok(await _service.SaveDirectionAsync(null, dto));
    }

    [HttpPut("directions/{id}")]
    public async Task<ActionResult<ClinicalDirectionDetailDto>> UpdateDirection(Guid id, [FromBody] SaveClinicalDirectionDto dto)
    {
        return Ok(await _service.SaveDirectionAsync(id, dto));
    }

    // ---- Research ----

    [HttpGet("projects")]
    public async Task<ActionResult<List<ResearchProjectListDto>>> GetProjects(
        [FromQuery] string? keyword = null,
        [FromQuery] int? level = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new ResearchProjectSearchDto
        {
            Keyword = keyword,
            Level = level,
            Status = status,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        return Ok(await _service.GetProjectsAsync(filter));
    }

    [HttpGet("projects/{id}")]
    public async Task<ActionResult<ResearchProjectDetailDto>> GetProjectById(Guid id)
    {
        var result = await _service.GetProjectByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("projects")]
    public async Task<ActionResult<ResearchProjectDetailDto>> CreateProject([FromBody] SaveResearchProjectDto dto)
    {
        return Ok(await _service.SaveProjectAsync(null, dto));
    }

    [HttpPut("projects/{id}")]
    public async Task<ActionResult<ResearchProjectDetailDto>> UpdateProject(Guid id, [FromBody] SaveResearchProjectDto dto)
    {
        return Ok(await _service.SaveProjectAsync(id, dto));
    }

    // ---- Dashboard & Stats ----

    [HttpGet("dashboard")]
    public async Task<ActionResult<TrainingDashboardDto>> GetDashboard()
    {
        return Ok(await _service.GetDashboardAsync());
    }

    [HttpGet("credit-summary")]
    public async Task<ActionResult<List<CreditSummaryDto>>> GetCreditSummary()
    {
        return Ok(await _service.GetCreditSummaryAsync());
    }
}
