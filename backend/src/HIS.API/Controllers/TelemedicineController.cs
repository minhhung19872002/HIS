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
        public async Task<ActionResult<bool>> CancelAppointment(Guid id, [FromBody] System.Text.Json.JsonElement body)
        {
            // Accept both a raw JSON string and { "reason": "..." } — the v2 page sends the object form,
            // which a [FromBody] string rejected with 400.
            string? reason = body.ValueKind switch
            {
                System.Text.Json.JsonValueKind.String => body.GetString(),
                System.Text.Json.JsonValueKind.Object when body.TryGetProperty("reason", out var r) && r.ValueKind == System.Text.Json.JsonValueKind.String => r.GetString(),
                _ => null
            };
            var ok = await _service.CancelAppointmentAsync(id, reason ?? string.Empty);
            return ok ? Ok(true) : NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy lịch hẹn" });
        }

        // The v2 page calls this to confirm a Pending booking; the service method existed but had no route (404).
        [HttpPost("appointments/{id}/confirm")]
        public async Task<ActionResult<bool>> ConfirmAppointment(Guid id)
        {
            var ok = await _service.ConfirmAppointmentAsync(id);
            return ok ? Ok(true) : NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy lịch hẹn" });
        }

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
        [HttpPost("sessions")] // v2 page posts { appointmentId } to /sessions (was 405)
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
        {
            var ok = await _service.SendPrescriptionToPharmacyAsync(dto);
            return ok ? Ok(true) : NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy đơn thuốc" });
        }
    }
}
