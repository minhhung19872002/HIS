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
    /// API Controller for Rehabilitation - Luồng 14
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RehabilitationController : ControllerBase
    {
        private readonly IRehabilitationService _service;

        public RehabilitationController(IRehabilitationService service)
        {
            _service = service;
        }

        [HttpGet("referrals")]
        public async Task<ActionResult<List<RehabReferralDto>>> GetAllReferrals([FromQuery] int pageSize = 100)
            => Ok(await _service.GetPendingReferralsAsync());

        [HttpGet("referrals/pending")]
        public async Task<ActionResult<List<RehabReferralDto>>> GetPendingReferrals()
            => Ok(await _service.GetPendingReferralsAsync());

        [HttpGet("referrals/{id}")]
        public async Task<ActionResult<RehabReferralDto>> GetReferral(Guid id)
            => Ok(await _service.GetReferralAsync(id));

        [HttpPost("referrals")]
        public async Task<ActionResult<RehabReferralDto>> CreateReferral([FromBody] CreateRehabReferralDto dto)
            => Ok(await _service.CreateReferralAsync(dto));

        [HttpPost("referrals/{id}/accept")]
        public async Task<ActionResult<RehabReferralDto>> AcceptReferral(Guid id)
            => Ok(await _service.AcceptReferralAsync(id));

        [HttpGet("assessments/{id}")]
        public async Task<ActionResult<FunctionalAssessmentDto>> GetAssessment(Guid id)
            => Ok(await _service.GetAssessmentAsync(id));

        [HttpPost("assessments")]
        public async Task<ActionResult<FunctionalAssessmentDto>> SaveAssessment([FromBody] SaveFunctionalAssessmentDto dto)
            => Ok(await _service.SaveAssessmentAsync(dto));

        [HttpGet("plans")]
        public async Task<ActionResult<List<RehabReferralDto>>> GetTreatmentPlansList()
            => Ok(await _service.GetPendingReferralsAsync());

        [HttpGet("treatment-plans/{id}")]
        public async Task<ActionResult<RehabTreatmentPlanDto>> GetTreatmentPlan(Guid id)
            => Ok(await _service.GetTreatmentPlanAsync(id));

        [HttpPost("treatment-plans")]
        public async Task<ActionResult<RehabTreatmentPlanDto>> CreateTreatmentPlan([FromBody] CreateTreatmentPlanDto dto)
            => Ok(await _service.CreateTreatmentPlanAsync(dto));

        [HttpGet("sessions")]
        public async Task<ActionResult<List<RehabSessionDto>>> GetSessions(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? therapistId = null)
            => Ok(await _service.GetSessionsAsync(
                fromDate ?? DateTime.Today,
                toDate ?? DateTime.Today.AddDays(1),
                therapistId));

        [HttpGet("sessions/by-date")]
        public async Task<ActionResult<List<RehabSessionDto>>> GetSessionsByDate(
            [FromQuery] DateTime? date = null,
            [FromQuery] Guid? therapistId = null)
            => Ok(await _service.GetSessionsAsync(
                date ?? DateTime.Today,
                (date ?? DateTime.Today).AddDays(1),
                therapistId));

        [HttpPost("sessions/{id}/document")]
        public async Task<ActionResult<RehabSessionDto>> DocumentSession([FromBody] DocumentSessionDto dto)
            => Ok(await _service.DocumentSessionAsync(dto));

        [HttpGet("progress/{planId}")]
        public async Task<ActionResult<RehabProgressReportDto>> GetProgressReport(Guid planId)
            => Ok(await _service.GetProgressReportAsync(planId));

        [HttpGet("dashboard")]
        public async Task<ActionResult<RehabDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));

        // NangCap12: Additional endpoints for BV PHCN Dong Thap

        [HttpPost("referrals/{id}/reject")]
        public async Task<ActionResult<bool>> RejectReferral(Guid id, [FromBody] RejectReferralRequest request)
            => Ok(await _service.RejectReferralAsync(id, request.Reason));

        [HttpGet("assessments/history/{referralId}")]
        public async Task<ActionResult<List<FunctionalAssessmentDto>>> GetAssessmentHistory(Guid referralId)
            => Ok(await _service.GetAssessmentHistoryAsync(referralId));

        [HttpPut("treatment-plans/{id}")]
        public async Task<ActionResult<RehabTreatmentPlanDto>> UpdateTreatmentPlan(Guid id, [FromBody] CreateTreatmentPlanDto dto)
            => Ok(await _service.UpdateTreatmentPlanAsync(id, dto));

        [HttpPut("treatment-plans/{planId}/goals/{goalNumber}")]
        public async Task<ActionResult<bool>> UpdateGoalProgress(Guid planId, int goalNumber, [FromBody] GoalProgressRequest request)
            => Ok(await _service.UpdateGoalProgressAsync(planId, goalNumber, request.ProgressPercent, request.Notes));

        [HttpGet("sessions/patient/{referralId}")]
        public async Task<ActionResult<List<RehabSessionDto>>> GetPatientSessions(Guid referralId)
            => Ok(await _service.GetPatientSessionsAsync(referralId));

        [HttpGet("sessions/{id}")]
        public async Task<ActionResult<RehabSessionDto>> GetSession(Guid id)
            => Ok(await _service.GetSessionAsync(id));

        [HttpPost("sessions/schedule")]
        public async Task<ActionResult<RehabSessionDto>> ScheduleSession([FromBody] ScheduleSessionRequest request)
            => Ok(await _service.ScheduleSessionAsync(request.PlanId, request.Date, request.Time, request.Location));

        [HttpPost("sessions/{id}/cancel")]
        public async Task<ActionResult<bool>> CancelSession(Guid id, [FromBody] CancelSessionRequest request)
            => Ok(await _service.CancelSessionAsync(id, request.Reason));

        [HttpPost("sessions/{id}/no-show")]
        public async Task<ActionResult<bool>> MarkNoShow(Guid id)
            => Ok(await _service.MarkNoShowAsync(id));

        [HttpGet("outcome/{planId}")]
        public async Task<ActionResult<RehabOutcomeDto>> GetOutcome(Guid planId)
            => Ok(await _service.GetOutcomeAsync(planId));

        [HttpPost("discharge/{planId}")]
        public async Task<ActionResult<RehabOutcomeDto>> DischargePatient(Guid planId, [FromBody] RehabOutcomeDto outcomeData)
            => Ok(await _service.DischargePatientAsync(planId, outcomeData));

        [HttpGet("statistics")]
        public async Task<ActionResult<RehabDashboardDto>> GetStatistics([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
            => Ok(await _service.GetDashboardAsync(fromDate));

        [HttpGet("referrals/{id}/print-referral")]
        public async Task<IActionResult> PrintReferral(Guid id)
        {
            var bytes = await _service.PrintReferralAsync(id);
            return File(bytes, "text/html; charset=utf-8", $"giay-gt-phcn-{id:N}.html");
        }
    }
}
