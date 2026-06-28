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
    /// API Controller for Mass Casualty Incident - Luồng 20
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MCIController : ControllerBase
    {
        private readonly IMassCasualtyService _service;

        public MCIController(IMassCasualtyService service)
        {
            _service = service;
        }

        [HttpGet("active")]
        public async Task<ActionResult<MCIEventDto>> GetActiveEvent()
            => Ok(await _service.GetActiveEventAsync());

        [HttpGet("events/active")]
        public async Task<ActionResult<MCIEventDto>> GetActiveEventAlias()
            => Ok(await _service.GetActiveEventAsync());

        [HttpGet("events")]
        public async Task<ActionResult<List<MCIEventDto>>> GetEvents(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
            => Ok(await _service.GetEventsAsync(fromDate, toDate));

        [HttpGet("events/{id}")]
        public async Task<ActionResult<MCIEventDto>> GetEvent(Guid id)
            => Ok(await _service.GetEventAsync(id));

        [HttpPost("events/activate")]
        public async Task<ActionResult<MCIEventDto>> ActivateEvent([FromBody] ActivateMCIEventDto dto)
            => Ok(await _service.ActivateEventAsync(dto));

        [HttpPost("activate-code-blue")]
        public async Task<ActionResult<MCIEventDto>> ActivateCodeBlue([FromBody] ActivateCodeBlueRequest req)
        {
            var userId = Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid)
                ? uid : Guid.Empty;
            return Ok(await _service.ActivateCodeBlueAsync(req.Location ?? string.Empty, userId));
        }

        [HttpPost("events/{id}/deactivate")]
        public async Task<ActionResult<bool>> DeactivateEvent(Guid id, [FromBody] string reason)
            => Ok(await _service.DeactivateEventAsync(id, reason));

        [HttpGet("events/{eventId}/victims")]
        public async Task<ActionResult<List<MCIVictimDto>>> GetVictims(
            Guid eventId,
            [FromQuery] string triageCategory,
            [FromQuery] string status)
            => Ok(await _service.GetVictimsAsync(eventId, triageCategory, status));

        [HttpGet("victims/{id}")]
        public async Task<ActionResult<MCIVictimDto>> GetVictim(Guid id)
            => Ok(await _service.GetVictimAsync(id));

        [HttpPost("victims")]
        public async Task<ActionResult<MCIVictimDto>> RegisterVictim([FromBody] RegisterMCIVictimDto dto)
            => Ok(await _service.RegisterVictimAsync(dto));

        [HttpPost("victims/{id}/retriage")]
        public async Task<ActionResult<MCIVictimDto>> ReTriageVictim([FromBody] ReTriageDto dto)
            => Ok(await _service.ReTriageVictimAsync(dto));

        [HttpGet("events/{eventId}/resources")]
        public async Task<ActionResult<MCIResourceStatusDto>> GetResourceStatus(Guid eventId)
            => Ok(await _service.GetResourceStatusAsync(eventId));

        [HttpGet("events/{eventId}/command-center")]
        public async Task<ActionResult<MCICommandCenterDto>> GetCommandCenterData(Guid eventId)
            => Ok(await _service.GetCommandCenterDataAsync(eventId));

        [HttpGet("events/{eventId}/realtime")]
        public async Task<ActionResult<MCIRealTimeStatsDto>> GetRealTimeStats(Guid eventId)
            => Ok(await _service.GetRealTimeStatsAsync(eventId));

        [HttpPost("events/{eventId}/broadcast")]
        public async Task<ActionResult<MCIBroadcastDto>> SendBroadcast(
            Guid eventId,
            [FromBody] MCIBroadcastDto dto)
            => Ok(await _service.SendBroadcastAsync(eventId, dto.MessageType, dto.Priority, dto.Title, dto.Message, dto.TargetGroups));

        [HttpGet("events/{eventId}/report")]
        public async Task<ActionResult<MCIEventReportDto>> GenerateReport(Guid eventId)
            => Ok(await _service.GenerateEventReportAsync(eventId));

        [HttpGet("dashboard")]
        public async Task<ActionResult<MCIDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }
}
