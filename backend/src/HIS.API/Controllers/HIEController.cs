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
    /// API Controller for Health Information Exchange - Luồng 19
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HIEController : ControllerBase
    {
        private readonly IHealthExchangeService _service;

        public HIEController(IHealthExchangeService service)
        {
            _service = service;
        }

        [HttpGet("connections")]
        public async Task<ActionResult<List<HIEConnectionDto>>> GetConnections()
            => Ok(await _service.GetConnectionsAsync());

        [HttpPost("connections/{id}/test")]
        public async Task<ActionResult<HIEConnectionDto>> TestConnection(Guid id)
            => Ok(await _service.TestConnectionAsync(id));

        // Connection CRUD for the v2 page (POST/PUT/activate/deactivate were 405/404). Backed by the existing
        // SaveConnectionConfigAsync (HIEConnections table).
        [HttpPost("connections")]
        public async Task<ActionResult<HIEConnectionConfigDto>> CreateConnection([FromBody] HIEConnectionConfigDto dto)
        {
            dto.Id = Guid.Empty;
            dto.IsActive = true;
            return Ok(await _service.SaveConnectionConfigAsync(dto));
        }

        [HttpPut("connections/{id}")]
        public async Task<ActionResult<HIEConnectionConfigDto>> UpdateConnection(Guid id, [FromBody] HIEConnectionConfigDto dto)
        {
            var existing = (await _service.GetConnectionsAsync()).FirstOrDefault(c => c.Id == id);
            if (existing == null) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy kết nối" });
            dto.Id = id;
            dto.IsActive = existing.IsActive; // the edit form does not carry the active flag
            return Ok(await _service.SaveConnectionConfigAsync(dto));
        }

        [HttpPost("connections/{id}/activate")]
        public Task<ActionResult<HIEConnectionConfigDto>> ActivateConnection(Guid id) => SetConnectionActive(id, true);

        [HttpPost("connections/{id}/deactivate")]
        public Task<ActionResult<HIEConnectionConfigDto>> DeactivateConnection(Guid id) => SetConnectionActive(id, false);

        private async Task<ActionResult<HIEConnectionConfigDto>> SetConnectionActive(Guid id, bool active)
        {
            var c = (await _service.GetConnectionsAsync()).FirstOrDefault(x => x.Id == id);
            if (c == null) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy kết nối" });
            return Ok(await _service.SaveConnectionConfigAsync(new HIEConnectionConfigDto
            {
                Id = id, ConnectionName = c.ConnectionName, ConnectionType = c.ConnectionType,
                Endpoint = c.Endpoint, AuthMethod = c.AuthMethod, IsActive = active,
            }));
        }

        [HttpGet("insurance/lookup")]
        public async Task<ActionResult<InsuranceCardLookupResultDto>> LookupInsuranceCard([FromQuery] string cardNumber)
            => Ok(await _service.LookupInsuranceCardAsync(cardNumber));

        [HttpPost("insurance/xml/generate")]
        public async Task<ActionResult<InsuranceXMLSubmissionDto>> GenerateXML(
            [FromQuery] string xmlType,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GenerateXMLAsync(xmlType, fromDate, toDate, departmentId));

        [HttpPost("insurance/xml/{id}/submit")]
        public async Task<ActionResult<InsuranceXMLSubmissionDto>> SubmitXML(Guid id)
            => Ok(await _service.SubmitXMLAsync(id));

        [HttpGet("insurance/submissions")]
        public async Task<ActionResult<List<InsuranceXMLSubmissionDto>>> GetSubmissions(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null)
            => Ok(await _service.GetSubmissionsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                status));

        [HttpGet("referrals")]
        public async Task<ActionResult<List<ElectronicReferralDto>>> GetAllReferrals(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null)
            => Ok(await _service.GetOutgoingReferralsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                status));

        [HttpGet("referrals/outgoing")]
        public async Task<ActionResult<List<ElectronicReferralDto>>> GetOutgoingReferrals(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null)
            => Ok(await _service.GetOutgoingReferralsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                status));

        [HttpGet("referrals/incoming")]
        public async Task<ActionResult<List<ElectronicReferralDto>>> GetIncomingReferrals(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null)
            => Ok(await _service.GetIncomingReferralsAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                status));

        [HttpPost("referrals")]
        public async Task<ActionResult<ElectronicReferralDto>> CreateReferral([FromBody] CreateElectronicReferralDto dto)
            => Ok(await _service.CreateReferralAsync(dto));

        // Service method existed without a route (v2 "Gửi" → 404).
        [HttpPost("referrals/{id}/send")]
        public async Task<ActionResult<ElectronicReferralDto>> SendReferral(Guid id)
        {
            var r = await _service.SendReferralAsync(id);
            return r == null ? NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy phiếu chuyển viện" }) : Ok(r);
        }

        [HttpGet("teleconsultation")]
        public async Task<ActionResult<List<TeleconsultationRequestDto>>> GetTeleconsultations([FromQuery] string status = null)
            => Ok(await _service.GetTeleconsultationRequestsAsync(status));

        [HttpGet("teleconsults")]
        public async Task<ActionResult<List<TeleconsultationRequestDto>>> GetTeleconsultsAlias([FromQuery] string status = null)
            => Ok(await _service.GetTeleconsultationRequestsAsync(status));

        [HttpPost("teleconsultation")]
        public async Task<ActionResult<TeleconsultationRequestDto>> CreateTeleconsultation([FromBody] CreateTeleconsultationDto dto)
            => Ok(await _service.CreateTeleconsultationAsync(dto));

        [HttpGet("dashboard")]
        public async Task<ActionResult<HIEDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());

        /// <summary>
        /// Sync tất cả HIE connection đang active — ping endpoint, cập nhật trạng thái.
        /// </summary>
        [HttpPost("sync-all")]
        public async Task<ActionResult<HIESyncAllResultDto>> SyncAll()
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var result = await _service.SyncAllConnectionsAsync(userId);
            return Ok(result);
        }
    }
}
