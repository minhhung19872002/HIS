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
    /// API Controller for Quality Management - Luồng 17
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QualityController : ControllerBase
    {
        private readonly IQualityManagementService _service;

        public QualityController(IQualityManagementService service)
        {
            _service = service;
        }

        [HttpGet("incidents")]
        public async Task<ActionResult<object>> GetIncidents(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null,
            [FromQuery] string type = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            var all = await _service.GetIncidentReportsAsync(fromDate, toDate, status, type);
            var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Ok(new
            {
                items,
                totalCount = all.Count,
                pageIndex = page,
                pageSize
            });
        }

        [HttpGet("incidents/{id}")]
        public async Task<ActionResult<IncidentReportDto>> GetIncident(Guid id)
            => Ok(await _service.GetIncidentReportAsync(id));

        [HttpPost("incidents")]
        public async Task<ActionResult<IncidentReportDto>> CreateIncident([FromBody] CreateIncidentReportDto dto)
            => Ok(await _service.CreateIncidentReportAsync(dto));

        [HttpGet("indicators")]
        public async Task<ActionResult<List<QualityIndicatorDto>>> GetIndicators(
            [FromQuery] string category = null,
            [FromQuery] bool? isActive = null)
            => Ok(await _service.GetIndicatorsAsync(category));

        [HttpGet("indicators/{id}/values")]
        public async Task<ActionResult<List<QualityIndicatorValueDto>>> GetIndicatorValues(
            Guid id,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
            => Ok(await _service.GetIndicatorValuesAsync(id, fromDate, toDate));

        [HttpGet("indicators/critical")]
        public async Task<ActionResult<List<QualityIndicatorValueDto>>> GetCriticalIndicators()
            => Ok(await _service.GetCriticalIndicatorsAsync());

        [HttpGet("audits")]
        public async Task<ActionResult<List<AuditPlanDto>>> GetAuditPlans([FromQuery] int year)
            => Ok(await _service.GetAuditPlansAsync(year));

        [HttpGet("satisfaction")]
        public async Task<ActionResult<SatisfactionReportDto>> GetSatisfactionReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string surveyType,
            [FromQuery] string department)
            => Ok(await _service.GetSatisfactionReportAsync(fromDate, toDate, surveyType, department));

        [HttpGet("capa")]
        public async Task<ActionResult<List<CAPADto>>> GetCAPAs([FromQuery] string status = null, [FromQuery] string source = null)
            => Ok(await _service.GetCAPAsAsync(status, source));

        [HttpGet("capas")]
        public async Task<ActionResult<List<CAPADto>>> GetCAPAsAlias([FromQuery] string status = null, [FromQuery] string source = null)
            => Ok(await _service.GetCAPAsAsync(status, source));

        [HttpGet("surveys")]
        public async Task<ActionResult<SatisfactionReportDto>> GetSurveys(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
            => Ok(await _service.GetSatisfactionReportAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                null, null));

        // F10: ghi khảo sát hài lòng (vào chung nguồn SatisfactionSurveyResults — thống nhất 2 hệ).
        [HttpPost("surveys")]
        public async Task<ActionResult<PatientSatisfactionSurveyDto>> SubmitSurvey([FromBody] PatientSatisfactionSurveyDto dto)
            => Ok(await _service.SubmitSurveyAsync(dto));

        [HttpGet("surveys/statistics")]
        public async Task<ActionResult<SatisfactionReportDto>> GetSurveyStatistics(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
            => Ok(await _service.GetSatisfactionReportAsync(
                fromDate ?? DateTime.Today.AddMonths(-1),
                toDate ?? DateTime.Today.AddDays(1),
                null, null));

        [HttpGet("dashboard")]
        public async Task<ActionResult<QMDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());

        // F9: hành động khắc phục sự cố (persist qua CAPA).
        [HttpPost("incidents/{incidentId}/corrective-actions")]
        public async Task<ActionResult<bool>> AddCorrectiveAction(Guid incidentId, [FromBody] CorrectiveActionDto action)
            => Ok(await _service.AddCorrectiveActionAsync(incidentId, action));

        [HttpPut("corrective-actions/{actionId}/status")]
        public async Task<ActionResult<bool>> UpdateCorrectiveActionStatus(Guid actionId, [FromBody] UpdateCorrectiveActionRequest req)
            => Ok(await _service.UpdateCorrectiveActionStatusAsync(actionId, req.Status ?? "", req.Notes ?? ""));
    }
}
