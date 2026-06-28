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
    /// API Controller for Telemedicine - Luồng 11
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TelemedicineController : ControllerBase
    {
        private readonly ITelemedicineService _service;

        public TelemedicineController(ITelemedicineService service)
        {
            _service = service;
        }

        [HttpGet("appointments")]
        public async Task<ActionResult<List<TeleAppointmentDto>>> GetAppointments(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string status = null)
            => Ok(await _service.GetAppointmentsAsync(fromDate, toDate, status));

        [HttpGet("appointments/{id}")]
        public async Task<ActionResult<TeleAppointmentDto>> GetAppointment(Guid id)
            => Ok(await _service.GetAppointmentByIdAsync(id));

        [HttpPost("appointments")]
        public async Task<ActionResult<TeleAppointmentDto>> CreateAppointment([FromBody] CreateTeleAppointmentDto dto)
            => Ok(await _service.CreateAppointmentAsync(dto));

        [HttpPost("appointments/{id}/cancel")]
        public async Task<ActionResult<bool>> CancelAppointment(Guid id, [FromBody] string reason)
            => Ok(await _service.CancelAppointmentAsync(id, reason));

        [HttpGet("available-slots")]
        public async Task<ActionResult<List<DoctorAvailableSlotDto>>> GetAvailableSlots(
            [FromQuery] Guid? doctorId,
            [FromQuery] Guid? specialityId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
            => Ok(await _service.GetAvailableSlotsAsync(doctorId, specialityId, fromDate, toDate));

        [HttpGet("sessions")]
        public ActionResult<List<TeleSessionDto>> GetSessions()
            => Ok(new List<TeleSessionDto>());

        [HttpPost("sessions/start")]
        public async Task<ActionResult<TeleSessionDto>> StartSession([FromBody] StartVideoCallDto dto)
            => Ok(await _service.StartSessionAsync(dto));

        [HttpGet("sessions/{id}")]
        public async Task<ActionResult<TeleSessionDto>> GetSession(Guid id)
            => Ok(await _service.GetSessionAsync(id));

        [HttpPost("sessions/{id}/end")]
        public async Task<ActionResult<bool>> EndSession(Guid id)
            => Ok(await _service.EndSessionAsync(id));

        [HttpGet("consultations/{sessionId}")]
        public async Task<ActionResult<TeleConsultationRecordDto>> GetConsultationRecord(Guid sessionId)
            => Ok(await _service.GetConsultationRecordAsync(sessionId));

        [HttpPost("consultations")]
        public async Task<ActionResult<TeleConsultationRecordDto>> SaveConsultationRecord([FromBody] SaveTeleConsultationDto dto)
            => Ok(await _service.SaveConsultationRecordAsync(dto));

        [HttpGet("dashboard")]
        public async Task<ActionResult<TelemedicineDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));

        // F8 (audit FLOW-FINAL): wire kê đơn tele + gửi sang quầy phát (trước đây method service không có endpoint).
        [HttpPost("prescriptions")]
        public async Task<ActionResult<TelePrescriptionDto>> CreatePrescription([FromBody] CreateTelePrescriptionRequest req)
            => Ok(await _service.CreatePrescriptionAsync(req.SessionId, req.Items ?? new List<TelePrescriptionItemDto>(), req.Note ?? ""));

        [HttpPost("prescriptions/{id}/sign")]
        public async Task<ActionResult<TelePrescriptionDto>> SignPrescription(Guid id)
            => Ok(await _service.SignPrescriptionAsync(id));

        [HttpPost("prescriptions/send-to-pharmacy")]
        public async Task<ActionResult<bool>> SendPrescriptionToPharmacy([FromBody] SendPrescriptionToPharmacyDto dto)
            => Ok(await _service.SendPrescriptionToPharmacyAsync(dto));
    }
}
