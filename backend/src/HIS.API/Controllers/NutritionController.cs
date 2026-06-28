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

        [HttpGet("dashboard")]
        public async Task<ActionResult<NutritionDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }
}
