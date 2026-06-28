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
    /// API Controller for Medical Equipment - Luồng 15
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EquipmentController : ControllerBase
    {
        private readonly IMedicalEquipmentService _service;

        public EquipmentController(IMedicalEquipmentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<MedicalEquipmentDto>>> GetEquipmentList(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string category = null,
            [FromQuery] string status = null)
            => Ok(await _service.GetEquipmentListAsync(departmentId, category, status));

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<MedicalEquipmentDto>> GetEquipment(Guid id)
            => Ok(await _service.GetEquipmentAsync(id));

        [HttpPost]
        public async Task<ActionResult<MedicalEquipmentDto>> RegisterEquipment([FromBody] RegisterEquipmentDto dto)
            => Ok(await _service.RegisterEquipmentAsync(dto));

        [HttpGet("maintenance/schedules")]
        public async Task<ActionResult<List<MaintenanceScheduleDto>>> GetMaintenanceSchedules(
            [FromQuery] DateTime? dueDate,
            [FromQuery] bool? overdue)
            => Ok(await _service.GetMaintenanceSchedulesAsync(dueDate, overdue));

        [HttpPost("maintenance")]
        public async Task<ActionResult<MaintenanceRecordDto>> RecordMaintenance([FromBody] CreateMaintenanceRecordDto dto)
            => Ok(await _service.RecordMaintenanceAsync(dto));

        [HttpGet("calibrations/due")]
        public async Task<ActionResult<List<CalibrationRecordDto>>> GetCalibrationsDue([FromQuery] int daysAhead = 30)
            => Ok(await _service.GetCalibrationsDueAsync(daysAhead));

        [HttpPost("calibrations")]
        public async Task<ActionResult<CalibrationRecordDto>> RecordCalibration([FromBody] RecordCalibrationDto dto)
            => Ok(await _service.RecordCalibrationAsync(dto));

        [HttpGet("repairs")]
        public async Task<ActionResult<List<RepairRequestDto>>> GetRepairRequests(
            [FromQuery] string status = null,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetRepairRequestsAsync(status, departmentId));

        [HttpPost("repairs")]
        public async Task<ActionResult<RepairRequestDto>> CreateRepairRequest([FromBody] CreateRepairRequestDto dto)
            => Ok(await _service.CreateRepairRequestAsync(dto));

        [HttpGet("dashboard")]
        public async Task<ActionResult<EquipmentDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }
}
