using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Telemedicine;
using HIS.Application.DTOs.Nutrition;
using HIS.Application.DTOs.InfectionControl;
using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.DTOs.Equipment;
using HIS.Application.DTOs.MedicalHR;
using HIS.Application.DTOs.QualityManagement;
using HIS.Application.DTOs.PatientPortal;
using HIS.Application.DTOs.HealthExchange;
using HIS.Application.DTOs.MassCasualty;
using HIS.API.Dtos.ExtendedWorkflow;

namespace HIS.API.Controllers
{
    /// <summary>
    /// API Controller for Infection Control - Luồng 13
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InfectionControlController : ControllerBase
    {
        private readonly IInfectionControlService _service;

        public InfectionControlController(IInfectionControlService service)
        {
            _service = service;
        }

        [HttpGet("hai")]
        public async Task<ActionResult<List<HAIDto>>> GetActiveHAICases(
            [FromQuery] string infectionType = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetActiveHAICasesAsync(infectionType, departmentId));

        [HttpGet("hai-cases")]
        public async Task<ActionResult<List<HAIDto>>> GetHAICasesList(
            [FromQuery] string infectionType = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetActiveHAICasesAsync(infectionType, departmentId));

        [HttpGet("hai-cases/active")]
        public async Task<ActionResult<List<HAIDto>>> GetActiveHAICasesAlias(
            [FromQuery] string infectionType = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetActiveHAICasesAsync(infectionType, departmentId));

        [HttpGet("hai/{id}")]
        public async Task<ActionResult<HAIDto>> GetHAICase(Guid id)
            => Ok(await _service.GetHAICaseAsync(id));

        [HttpPost("hai")]
        [HttpPost("hai-reports")]
        public async Task<ActionResult<HAIDto>> ReportHAI([FromBody] ReportHAIDto dto)
            => Ok(await _service.ReportHAIAsync(dto));

        [HttpGet("isolations")]
        public async Task<ActionResult<List<IsolationOrderDto>>> GetActiveIsolations([FromQuery] Guid? departmentId)
            => Ok(await _service.GetActiveIsolationsAsync(departmentId));

        [HttpGet("isolation-orders")]
        public async Task<ActionResult<List<IsolationOrderDto>>> GetIsolationOrdersAlias([FromQuery] Guid? departmentId)
            => Ok(await _service.GetActiveIsolationsAsync(departmentId));

        [HttpPost("isolations")]
        public async Task<ActionResult<IsolationOrderDto>> CreateIsolationOrder([FromBody] CreateIsolationOrderDto dto)
            => Ok(await _service.CreateIsolationOrderAsync(dto));

        [HttpGet("hand-hygiene")]
        public async Task<ActionResult<List<HandHygieneObservationDto>>> GetHandHygieneObservations(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetHandHygieneObservationsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                departmentId));

        [HttpGet("hand-hygiene/observations")]
        public async Task<ActionResult<List<HandHygieneObservationDto>>> GetHandHygieneObservationsAlias(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetHandHygieneObservationsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                departmentId));

        [HttpPost("hand-hygiene")]
        public async Task<ActionResult<HandHygieneObservationDto>> RecordHandHygiene([FromBody] RecordHandHygieneDto dto)
            => Ok(await _service.RecordHandHygieneObservationAsync(dto));

        [HttpGet("outbreaks")]
        public async Task<ActionResult<List<OutbreakDto>>> GetActiveOutbreaks()
            => Ok(await _service.GetActiveOutbreaksAsync());

        [HttpPost("outbreaks")]
        public async Task<ActionResult<OutbreakDto>> DeclareOutbreak([FromBody] DeclareOutbreakDto dto)
            => Ok(await _service.DeclareOutbreakAsync(dto));

        [HttpGet("antibiotic-stewardship")]
        public async Task<ActionResult<List<AntibioticStewardshipDto>>> GetAntibioticsRequiringReview([FromQuery] Guid? departmentId)
            => Ok(await _service.GetAntibioticsRequiringReviewAsync(departmentId));

        // F9: duyệt kháng sinh (persist vào AntibioticStewardship).
        [HttpPost("antibiotics/{id}/review")]
        public async Task<ActionResult<bool>> ReviewAntibiotic(Guid id, [FromBody] ReviewAntibioticRequest req)
            => Ok(await _service.ReviewAntibioticAsync(id, req.Outcome ?? "", req.Notes ?? ""));

        [HttpGet("dashboard")]
        public async Task<ActionResult<ICDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }
}
