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
    /// API Controller for Clinical Nutrition - Luồng 12
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NutritionController : ControllerBase
    {
        private readonly IClinicalNutritionService _service;

        public NutritionController(IClinicalNutritionService service)
        {
            _service = service;
        }

        [HttpGet("screenings/pending")]
        public async Task<ActionResult<List<NutritionScreeningDto>>> GetPendingScreenings([FromQuery] Guid? departmentId)
            => Ok(await _service.GetPendingScreeningsAsync(departmentId));

        [HttpGet("screenings/admission/{admissionId}")]
        public async Task<ActionResult<NutritionScreeningDto>> GetScreeningByAdmission(Guid admissionId)
            => Ok(await _service.GetScreeningByAdmissionAsync(admissionId));

        [HttpPost("screenings")]
        public async Task<ActionResult<NutritionScreeningDto>> PerformScreening([FromBody] PerformNutritionScreeningDto dto)
            => Ok(await _service.PerformScreeningAsync(dto));

        [HttpGet("high-risk")]
        public async Task<ActionResult<List<NutritionScreeningDto>>> GetHighRiskPatients([FromQuery] Guid? departmentId)
            => Ok(await _service.GetHighRiskPatientsAsync(departmentId));

        [HttpGet("diet-orders")]
        public async Task<ActionResult<List<DietOrderDto>>> GetActiveDietOrders([FromQuery] Guid? departmentId)
            => Ok(await _service.GetActiveDietOrdersAsync(departmentId));

        [HttpGet("diet-orders/{id}")]
        public async Task<ActionResult<DietOrderDto>> GetDietOrder(Guid id)
            => Ok(await _service.GetDietOrderAsync(id));

        [HttpPost("diet-orders")]
        public async Task<ActionResult<DietOrderDto>> CreateDietOrder([FromBody] CreateDietOrderDto dto)
            => Ok(await _service.CreateDietOrderAsync(dto));

        [HttpGet("screenings")]
        public async Task<ActionResult<List<NutritionScreeningDto>>> GetScreenings(
            [FromQuery] Guid? departmentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 200)
            => Ok(await _service.GetPendingScreeningsAsync(departmentId));

        [HttpGet("screenings/high-risk")]
        public async Task<ActionResult<List<NutritionScreeningDto>>> GetHighRiskPatientsAlias([FromQuery] Guid? departmentId)
            => Ok(await _service.GetHighRiskPatientsAsync(departmentId));

        [HttpGet("diet-types")]
        public async Task<ActionResult<List<DietTypeDto>>> GetDietTypes([FromQuery] string category = null)
            => Ok(await _service.GetDietTypesAsync(category));

        [HttpGet("meal-plans")]
        public async Task<ActionResult<List<MealPlanDto>>> GetMealPlans([FromQuery] DateTime date, [FromQuery] Guid? departmentId)
            => Ok(await _service.GetMealPlansAsync(date, departmentId));

        // F2: sinh suất ăn + đánh dấu đã cấp phát (trước method service không có endpoint).
        [HttpPost("meal-plans/generate")]
        public async Task<ActionResult<MealPlanDto>> GenerateMealPlan([FromBody] GenerateMealPlanRequest req)
            => Ok(await _service.GenerateMealPlanAsync(req.Date, string.IsNullOrWhiteSpace(req.MealType) ? "Lunch" : req.MealType, req.DepartmentId));

        [HttpPost("meal-plans/mark-delivered")]
        public async Task<ActionResult<bool>> MarkMealDelivered([FromBody] MarkMealDeliveredRequest req)
            => Ok(await _service.MarkMealDeliveredAsync(req.DietOrderId, req.Date, string.IsNullOrWhiteSpace(req.MealType) ? "Lunch" : req.MealType));

        #region NangCap26 XII.5/XII.6 — Duyệt phiếu suất ăn & màn hình Nhà ăn

        /// <summary>XII.5 — khoa dinh dưỡng duyệt phiếu suất ăn (duyệt → sinh khoản thu cho BN).</summary>
        [HttpPost("meal-plans/{id}/approve")]
        public async Task<ActionResult<MealPlanApprovalResultDto>> ApproveMealPlan(Guid id)
            => Ok(await _service.ApproveMealPlanAsync(id, CurrentUserId()));

        /// <summary>XII.5 — từ chối phiếu suất ăn (bắt buộc có lý do).</summary>
        [HttpPost("meal-plans/{id}/reject")]
        public async Task<ActionResult<MealPlanApprovalResultDto>> RejectMealPlan(Guid id, [FromBody] RejectMealPlanRequest req)
            => Ok(await _service.RejectMealPlanAsync(id, req?.Reason ?? string.Empty, CurrentUserId()));

        /// <summary>XII.6 — hàng đợi màn hình Nhà ăn theo ngày (tùy chọn lọc bữa).</summary>
        [HttpGet("canteen/queue")]
        public async Task<ActionResult<List<CanteenQueueItemDto>>> GetCanteenQueue([FromQuery] DateTime? date, [FromQuery] string? mealType)
            => Ok(await _service.GetCanteenQueueAsync(date ?? DateTime.Today, mealType));

        /// <summary>XII.6 — nhà ăn đánh dấu đã chuẩn bị xong.</summary>
        [HttpPost("canteen/{id}/prepared")]
        public async Task<ActionResult<CanteenQueueItemDto>> MarkPrepared(Guid id)
            => Ok(await _service.MarkMealPlanPreparedAsync(id, CurrentUserId()));

        /// <summary>XII.6 — nhà ăn đánh dấu đã phát về khoa phòng.</summary>
        [HttpPost("canteen/{id}/distributed")]
        public async Task<ActionResult<CanteenQueueItemDto>> MarkDistributed(Guid id)
            => Ok(await _service.MarkMealPlanDistributedAsync(id, CurrentUserId()));

        public class RejectMealPlanRequest { public string Reason { get; set; } = string.Empty; }

        private Guid CurrentUserId()
        {
            var raw = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
        }

        #endregion

        [HttpGet("dashboard")]
        public async Task<ActionResult<NutritionDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }
}
