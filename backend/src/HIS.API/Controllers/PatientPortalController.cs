using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
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
    /// API Controller for Patient Portal - Luồng 18
    /// </summary>
    [ApiController]
    [Route("api/portal")]
    // B2 (audit bảo mật 2026-06-06) — staff-on-behalf roles + R2 (2026-06-11): thêm role `PortalPatient`
    // cho BN TỰ đăng nhập (POST /portal/login). Token PortalPatient: patientId/accountId LUÔN derive từ
    // claim (ResolvePatientId/ResolveAccountId — query param ≠ claim → 403, đóng IDOR lõi); token nhân
    // viên giữ hành vi query param cũ. (Register/login vẫn [AllowAnonymous].)
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Director + "," + RoleNames.Manager + "," + RoleNames.Receptionist + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.Midwife + "," + RoleNames.DepartmentHead + "," + RoleNames.MedicalRecordManager + "," + RoleNames.Accountant + "," + RoleNames.Cashier + "," + RoleNames.InsuranceOfficer + "," + RoleNames.PortalPatient)]
    public class PatientPortalController : ControllerBase
    {
        private readonly IPatientPortalService _service;
        private readonly IConfiguration _configuration;

        public PatientPortalController(IPatientPortalService service, IConfiguration configuration)
        {
            _service = service;
            _configuration = configuration;
        }

        private const string PortalPatientRole = "PortalPatient";
        private bool IsPortalPatient => User.IsInRole(PortalPatientRole);
        private Guid ClaimAccountId => Guid.TryParse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var g) ? g : Guid.Empty;
        private Guid ClaimPatientId => Guid.TryParse(
            User.FindFirst(HIS.Core.Constants.JwtClaims.PatientId)?.Value, out var g) ? g : Guid.Empty;

        /// <summary>R2: PortalPatient → patientId từ claim (query khác claim → 403); staff → giữ query param.</summary>
        private (Guid value, ActionResult? error) ResolvePatientId(Guid requested)
        {
            if (!IsPortalPatient) return (requested, null);
            var own = ClaimPatientId;
            if (own == Guid.Empty) return (Guid.Empty, Forbid());
            if (requested != Guid.Empty && requested != own) return (Guid.Empty, Forbid());
            return (own, null);
        }

        private (Guid value, ActionResult? error) ResolveAccountId(Guid requested)
        {
            if (!IsPortalPatient) return (requested, null);
            var own = ClaimAccountId;
            if (own == Guid.Empty) return (Guid.Empty, Forbid());
            if (requested != Guid.Empty && requested != own) return (Guid.Empty, Forbid());
            return (own, null);
        }

        /// <summary>
        /// R2: Bệnh nhân tự đăng nhập portal — identifier = username/email/phone. Mirror pattern
        /// BhxhInspectorService.LoginAsync: BCrypt verify + lockout 5 lần/15 phút; chặn account
        /// chưa Active (Pending/Suspended/Locked) và chưa link hồ sơ BN.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<PortalLoginResponseDto>> Login([FromBody] PortalLoginDto dto)
        {
            var ident = (dto.Identifier ?? "").Trim();
            if (ident.Length == 0 || string.IsNullOrEmpty(dto.Password))
                return Ok(new PortalLoginResponseDto { Success = false, Message = "Thiếu thông tin đăng nhập" });

            var auth = await _service.AuthenticatePortalAsync(ident, dto.Password);
            if (!auth.Success)
                return Ok(new PortalLoginResponseDto { Success = false, Message = auth.Message });

            return Ok(new PortalLoginResponseDto
            {
                Success = true,
                Message = "Đăng nhập thành công",
                Token = GeneratePortalToken(auth.AccountId, auth.Username, auth.PatientId),
                Account = await _service.GetAccountAsync(auth.AccountId),
            });
        }

        private string GeneratePortalToken(Guid accountId, string username, Guid patientId)
        {
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]
                    ?? throw new InvalidOperationException("Jwt:Key not configured")));
            var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, accountId.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, username),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, PortalPatientRole),
                new System.Security.Claims.Claim(HIS.Core.Constants.JwtClaims.PatientId, patientId.ToString()),
            };
            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds);
            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("register")]
        [HttpPost("account/register")]
        [AllowAnonymous]
        public async Task<ActionResult<PortalAccountDto>> Register([FromBody] RegisterPortalAccountDto dto)
            => Ok(await _service.RegisterAccountAsync(dto));

        /// <summary>
        /// R2: liên kết account → hồ sơ BN sau đăng ký. AllowAnonymous vì account Pending chưa login được;
        /// bảo vệ bằng verificationData phải khớp SĐT/CCCD/ngày sinh (service verify).
        /// </summary>
        [HttpPost("account/link-record")]
        [AllowAnonymous]
        public async Task<ActionResult> LinkRecord([FromBody] LinkPatientRecordRequestDto dto)
        {
            var ok = await _service.LinkPatientRecordAsync(dto.AccountId, dto.PatientCode, dto.VerificationData);
            return Ok(new { success = ok, message = ok ? "Liên kết thành công" : "Thông tin xác minh không khớp" });
        }


        [HttpGet("account")]
        [Authorize]
        public async Task<ActionResult> GetAccount()
        {
            // R2: BN tự đăng nhập thấy account thật của mình; staff giữ stub cũ (compat).
            if (IsPortalPatient) return Ok(await _service.GetAccountAsync(ClaimAccountId));
            return Ok(new { id = Guid.Empty, fullName = "", email = "", phone = "", isVerified = false });
        }

        [HttpGet("bills")]
        [Authorize]
        public async Task<ActionResult> GetBills([FromQuery] Guid patientId, [FromQuery] bool unpaidOnly = false)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetInvoicesAsync(pid, unpaidOnly));
        }

        [HttpGet("feedbacks")]
        [Authorize]
        public ActionResult GetFeedbacks()
            => Ok(new List<object>());

        [HttpGet("notifications")]
        [Authorize]
        public async Task<ActionResult> GetPortalNotifications(
            [FromQuery] Guid accountId = default,
            [FromQuery] bool unreadOnly = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetNotificationsAsync(aid, unreadOnly));
        }

        [HttpGet("doctors")]
        [Authorize]
        public async Task<ActionResult> GetDoctors()
            // Return a small list of doctors so the booking form has options.
            => Ok(await _service.GetPortalDoctorsAsync());

        [HttpGet("departments")]
        [Authorize]
        public async Task<ActionResult> GetDepartments()
            => Ok(await _service.GetPortalDepartmentsAsync());

        [HttpGet("appointments")]
        [Authorize]
        public async Task<ActionResult<List<PortalAppointmentDto>>> GetAppointments(
            [FromQuery] Guid patientId,
            [FromQuery] bool includeHistory = false)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetAppointmentsAsync(pid, includeHistory));
        }

        [HttpGet("available-slots")]
        [Authorize]
        public async Task<ActionResult<List<AvailableSlotDto>>> GetAvailableSlots(
            [FromQuery] Guid departmentId,
            [FromQuery] Guid? doctorId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
            => Ok(await _service.GetAvailableSlotsAsync(departmentId, doctorId, fromDate, toDate));

        [HttpPost("appointments")]
        [Authorize]
        public async Task<ActionResult<PortalAppointmentDto>> BookAppointment(
            [FromQuery] Guid patientId,
            [FromBody] CreatePortalAppointmentDto dto)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.BookAppointmentAsync(pid, dto));
        }

        [HttpGet("health-record")]
        [HttpGet("health-records")]
        [Authorize]
        public async Task<ActionResult<HealthRecordSummaryDto>> GetHealthRecord([FromQuery] Guid patientId)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetHealthRecordSummaryAsync(pid));
        }

        [HttpGet("vitals")]
        [Authorize]
        public async Task<ActionResult<List<VitalsTrendDto>>> GetVitals(
            [FromQuery] Guid patientId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            var summary = await _service.GetHealthRecordSummaryAsync(pid);
            var query = (summary.VitalsTrend ?? new List<VitalsTrendDto>()).AsEnumerable();
            if (fromDate.HasValue) query = query.Where(x => x.Date >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(x => x.Date <= toDate.Value);
            return Ok(query.ToList());
        }

        // G-39: Visit list for EMR tab
        [HttpGet("visits")]
        [Authorize]
        public async Task<ActionResult<List<VisitSummaryDto>>> GetVisits(
            [FromQuery] Guid patientId,
            [FromQuery] int limit = 20)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetVisitHistoryAsync(pid, limit));
        }

        // G-39: Full visit detail - security: service verifies exam belongs to patientId
        // RISK NOTE: patientId accepted from query param (current portal auth model) — not from JWT claims.
        // If portal moves to patient self-login, extract patientId from claims instead.
        [HttpGet("visits/{examId}")]
        [Authorize]
        public async Task<ActionResult<PortalVisitDetailDto>> GetVisitDetail(
            Guid examId,
            [FromQuery] Guid patientId)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            var result = await _service.GetVisitDetailAsync(examId, pid);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // G-39: Export full health record as HTML (printable)
        [HttpGet("export-health-record")]
        [Authorize]
        public async Task<ActionResult> ExportHealthRecord([FromQuery] Guid patientId)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            var bytes = await _service.ExportHealthRecordPdfAsync(pid);
            if (bytes == null || bytes.Length == 0) return NotFound();
            return File(bytes, "text/html", "ho-so-suc-khoe.html");
        }

        [HttpGet("lab-results")]
        [Authorize]
        public async Task<ActionResult<List<PortalLabResultDto>>> GetLabResults(
            [FromQuery] Guid patientId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetLabResultsAsync(pid, fromDate, toDate));
        }

        [HttpGet("imaging-results")]
        [Authorize]
        public async Task<ActionResult<List<PortalImagingResultDto>>> GetImagingResults(
            [FromQuery] Guid patientId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetImagingResultsAsync(pid, fromDate, toDate));
        }

        [HttpGet("prescriptions")]
        [Authorize]
        public async Task<ActionResult<List<PortalPrescriptionDto>>> GetPrescriptions(
            [FromQuery] Guid patientId,
            [FromQuery] bool activeOnly = true)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetPrescriptionsAsync(pid, activeOnly));
        }

        [HttpGet("invoices")]
        [Authorize]
        public async Task<ActionResult<List<PortalInvoiceDto>>> GetInvoices(
            [FromQuery] Guid patientId,
            [FromQuery] bool unpaidOnly = false)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetInvoicesAsync(pid, unpaidOnly));
        }

        [HttpPost("payments")]
        [Authorize]
        public async Task<ActionResult<OnlinePaymentDto>> InitiatePayment(
            [FromQuery] Guid patientId,
            [FromBody] InitiatePaymentDto dto)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.InitiatePaymentAsync(pid, dto));
        }

        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<PatientPortalDashboardDto>> GetDashboard([FromQuery] Guid patientId)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetDashboardAsync(pid));
        }

        // NangCap19: Family Members
        [HttpGet("family-members")]
        [Authorize]
        public async Task<ActionResult<List<FamilyMemberDto>>> GetFamilyMembers([FromQuery] Guid accountId)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetFamilyMembersAsync(aid));
        }

        [HttpPost("family-members")]
        [Authorize]
        public async Task<ActionResult<FamilyMemberDto>> SaveFamilyMember([FromBody] SaveFamilyMemberDto dto)
        {
            var (aid, err) = ResolveAccountId(dto.AccountId); if (err != null) return err;
            dto.AccountId = aid;
            return Ok(await _service.SaveFamilyMemberAsync(dto));
        }

        [HttpDelete("family-members/{id}")]
        [Authorize]
        public async Task<ActionResult<bool>> DeleteFamilyMember(Guid id)
        {
            // R2: BN chỉ xóa được bản ghi thuộc account mình
            if (IsPortalPatient && !await _service.IsFamilyMemberOwnedByAccountAsync(id, ClaimAccountId))
                return Forbid();
            return Ok(await _service.DeleteFamilyMemberAsync(id));
        }

        // NangCap19: Medicine Reminders
        [HttpGet("medicine-reminders")]
        [Authorize]
        public async Task<ActionResult<List<MedicineReminderDto>>> GetMedicineReminders(
            [FromQuery] Guid accountId, [FromQuery] bool activeOnly = true)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetMedicineRemindersAsync(aid, activeOnly));
        }

        [HttpPost("medicine-reminders")]
        [Authorize]
        public async Task<ActionResult<MedicineReminderDto>> SaveMedicineReminder([FromBody] SaveMedicineReminderDto dto)
        {
            var (aid, err) = ResolveAccountId(dto.AccountId); if (err != null) return err;
            dto.AccountId = aid;
            return Ok(await _service.SaveMedicineReminderAsync(dto));
        }

        [HttpDelete("medicine-reminders/{id}")]
        [Authorize]
        public async Task<ActionResult<bool>> DeleteMedicineReminder(Guid id)
        {
            if (IsPortalPatient && !await _service.IsMedicineReminderOwnedByAccountAsync(id, ClaimAccountId))
                return Forbid();
            return Ok(await _service.DeleteMedicineReminderAsync(id));
        }

        [HttpPut("medicine-reminders/{id}/toggle")]
        [Authorize]
        public async Task<ActionResult<bool>> ToggleMedicineReminder(Guid id)
        {
            if (IsPortalPatient && !await _service.IsMedicineReminderOwnedByAccountAsync(id, ClaimAccountId))
                return Forbid();
            return Ok(await _service.ToggleMedicineReminderAsync(id));
        }

        // NangCap19: Health Metrics
        [HttpGet("health-metrics")]
        [Authorize]
        public async Task<ActionResult<List<HealthMetricDto>>> GetHealthMetrics(
            [FromQuery] Guid accountId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetHealthMetricsAsync(aid, fromDate, toDate));
        }

        [HttpPost("health-metrics")]
        [Authorize]
        public async Task<ActionResult<HealthMetricDto>> SaveHealthMetric([FromBody] SaveHealthMetricDto dto)
        {
            var (aid, err) = ResolveAccountId(dto.AccountId); if (err != null) return err;
            dto.AccountId = aid;
            return Ok(await _service.SaveHealthMetricAsync(dto));
        }

        [HttpDelete("health-metrics/{id}")]
        [Authorize]
        public async Task<ActionResult<bool>> DeleteHealthMetric(Guid id)
        {
            if (IsPortalPatient && !await _service.IsHealthMetricOwnedByAccountAsync(id, ClaimAccountId))
                return Forbid();
            return Ok(await _service.DeleteHealthMetricAsync(id));
        }

        [HttpGet("health-metrics/trends")]
        [Authorize]
        public async Task<ActionResult<List<HealthMetricTrendDto>>> GetHealthMetricTrends(
            [FromQuery] Guid accountId, [FromQuery] int days = 30)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetHealthMetricTrendsAsync(aid, days));
        }

        // NangCap19: Patient Q&A
        [HttpGet("questions")]
        [Authorize]
        public async Task<ActionResult<List<PatientQuestionDto>>> GetPatientQuestions(
            [FromQuery] Guid accountId, [FromQuery] int? status = null)
        {
            var (aid, err) = ResolveAccountId(accountId); if (err != null) return err;
            return Ok(await _service.GetPatientQuestionsAsync(aid, status));
        }

        [HttpPost("questions")]
        [Authorize]
        public async Task<ActionResult<PatientQuestionDto>> CreatePatientQuestion([FromBody] CreatePatientQuestionDto dto)
        {
            var (aid, err) = ResolveAccountId(dto.AccountId); if (err != null) return err;
            dto.AccountId = aid;
            return Ok(await _service.CreatePatientQuestionAsync(dto));
        }

        [HttpGet("questions/{id}")]
        [Authorize]
        public async Task<ActionResult<PatientQuestionDto>> GetQuestionById(Guid id)
        {
            if (IsPortalPatient && !await _service.IsPatientQuestionOwnedByAccountAsync(id, ClaimAccountId))
                return Forbid();
            return Ok(await _service.GetQuestionByIdAsync(id));
        }

        [HttpPut("questions/{id}/answer")]
        [Authorize]
        public async Task<ActionResult<PatientQuestionDto>> AnswerPatientQuestion(
            Guid id, [FromBody] AnswerPatientQuestionDto dto)
            => Ok(await _service.AnswerPatientQuestionAsync(id, dto));

        // F9: cấp lại đơn + phản hồi dịch vụ (persist thật).
        [HttpPost("prescriptions/refill")]
        public async Task<ActionResult<RefillRequestDto>> RequestRefill([FromBody] RefillRequestDto dto)
        {
            // R2: BN chỉ refill được đơn thuốc của chính mình (đơn → HSBA → PatientId)
            if (IsPortalPatient && !await _service.IsPrescriptionOwnedByPatientAsync(dto.PrescriptionId, ClaimPatientId))
                return Forbid();
            return Ok(await _service.RequestRefillAsync(dto));
        }

        [HttpGet("prescriptions/refill-history")]
        public async Task<ActionResult<List<PortalPrescriptionDto>>> GetRefillHistory([FromQuery] Guid patientId)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.GetRefillHistoryAsync(pid));
        }

        [HttpPost("feedback")]
        public async Task<ActionResult<ServiceFeedbackDto>> SubmitFeedback([FromQuery] Guid patientId, [FromBody] SubmitFeedbackDto dto)
        {
            var (pid, err) = ResolvePatientId(patientId); if (err != null) return err;
            return Ok(await _service.SubmitFeedbackAsync(pid, dto));
        }
    }
}
