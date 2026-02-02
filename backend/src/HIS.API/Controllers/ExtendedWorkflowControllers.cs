using Microsoft.AspNetCore.Authorization;
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

namespace HIS.API.Controllers
{
    #region Luồng 11: Telemedicine Controller

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
    }

    #endregion

    #region Luồng 12: Clinical Nutrition Controller

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

        [HttpGet("diet-types")]
        public async Task<ActionResult<List<DietTypeDto>>> GetDietTypes([FromQuery] string category)
            => Ok(await _service.GetDietTypesAsync(category));

        [HttpGet("meal-plans")]
        public async Task<ActionResult<List<MealPlanDto>>> GetMealPlans([FromQuery] DateTime date, [FromQuery] Guid? departmentId)
            => Ok(await _service.GetMealPlansAsync(date, departmentId));

        [HttpGet("dashboard")]
        public async Task<ActionResult<NutritionDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }

    #endregion

    #region Luồng 13: Infection Control Controller

    /// <summary>
    /// API Controller for Infection Control - Luồng 13
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InfectionControlController : ControllerBase
    {
        private readonly IInfectionControlService _service;

        public InfectionControlController(IInfectionControlService service)
        {
            _service = service;
        }

        [HttpGet("hai")]
        public async Task<ActionResult<List<HAIDto>>> GetActiveHAICases(
            [FromQuery] string infectionType,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GetActiveHAICasesAsync(infectionType, departmentId));

        [HttpGet("hai/{id}")]
        public async Task<ActionResult<HAIDto>> GetHAICase(Guid id)
            => Ok(await _service.GetHAICaseAsync(id));

        [HttpPost("hai")]
        public async Task<ActionResult<HAIDto>> ReportHAI([FromBody] ReportHAIDto dto)
            => Ok(await _service.ReportHAIAsync(dto));

        [HttpGet("isolations")]
        public async Task<ActionResult<List<IsolationOrderDto>>> GetActiveIsolations([FromQuery] Guid? departmentId)
            => Ok(await _service.GetActiveIsolationsAsync(departmentId));

        [HttpPost("isolations")]
        public async Task<ActionResult<IsolationOrderDto>> CreateIsolationOrder([FromBody] CreateIsolationOrderDto dto)
            => Ok(await _service.CreateIsolationOrderAsync(dto));

        [HttpGet("hand-hygiene")]
        public async Task<ActionResult<List<HandHygieneObservationDto>>> GetHandHygieneObservations(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GetHandHygieneObservationsAsync(fromDate, toDate, departmentId));

        [HttpPost("hand-hygiene")]
        public async Task<ActionResult<HandHygieneObservationDto>> RecordHandHygiene([FromBody] RecordHandHygieneDto dto)
            => Ok(await _service.RecordHandHygieneObservationAsync(dto));

        [HttpGet("outbreaks")]
        public async Task<ActionResult<List<OutbreakDto>>> GetActiveOutbreaks()
            => Ok(await _service.GetActiveOutbreaksAsync());

        [HttpPost("outbreaks")]
        public async Task<ActionResult<OutbreakDto>> DeclareOutbreak([FromBody] DeclareOutbreakDto dto)
            => Ok(await _service.DeclareOutbreakAsync(dto));

        [HttpGet("antibiotic-stewardship")]
        public async Task<ActionResult<List<AntibioticStewardshipDto>>> GetAntibioticsRequiringReview([FromQuery] Guid? departmentId)
            => Ok(await _service.GetAntibioticsRequiringReviewAsync(departmentId));

        [HttpGet("dashboard")]
        public async Task<ActionResult<ICDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }

    #endregion

    #region Luồng 14: Rehabilitation Controller

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

        [HttpGet("treatment-plans/{id}")]
        public async Task<ActionResult<RehabTreatmentPlanDto>> GetTreatmentPlan(Guid id)
            => Ok(await _service.GetTreatmentPlanAsync(id));

        [HttpPost("treatment-plans")]
        public async Task<ActionResult<RehabTreatmentPlanDto>> CreateTreatmentPlan([FromBody] CreateTreatmentPlanDto dto)
            => Ok(await _service.CreateTreatmentPlanAsync(dto));

        [HttpGet("sessions")]
        public async Task<ActionResult<List<RehabSessionDto>>> GetSessions(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? therapistId)
            => Ok(await _service.GetSessionsAsync(fromDate, toDate, therapistId));

        [HttpPost("sessions/{id}/document")]
        public async Task<ActionResult<RehabSessionDto>> DocumentSession([FromBody] DocumentSessionDto dto)
            => Ok(await _service.DocumentSessionAsync(dto));

        [HttpGet("progress/{planId}")]
        public async Task<ActionResult<RehabProgressReportDto>> GetProgressReport(Guid planId)
            => Ok(await _service.GetProgressReportAsync(planId));

        [HttpGet("dashboard")]
        public async Task<ActionResult<RehabDashboardDto>> GetDashboard([FromQuery] DateTime? date)
            => Ok(await _service.GetDashboardAsync(date));
    }

    #endregion

    #region Luồng 15: Medical Equipment Controller

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
            [FromQuery] Guid? departmentId,
            [FromQuery] string category,
            [FromQuery] string status)
            => Ok(await _service.GetEquipmentListAsync(departmentId, category, status));

        [HttpGet("{id}")]
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
            [FromQuery] string status,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GetRepairRequestsAsync(status, departmentId));

        [HttpPost("repairs")]
        public async Task<ActionResult<RepairRequestDto>> CreateRepairRequest([FromBody] CreateRepairRequestDto dto)
            => Ok(await _service.CreateRepairRequestAsync(dto));

        [HttpGet("dashboard")]
        public async Task<ActionResult<EquipmentDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }

    #endregion

    #region Luồng 16: Medical HR Controller

    /// <summary>
    /// API Controller for Medical HR - Luồng 16
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MedicalHRController : ControllerBase
    {
        private readonly IMedicalHRService _service;

        public MedicalHRController(IMedicalHRService service)
        {
            _service = service;
        }

        [HttpGet("staff")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetStaffList(
            [FromQuery] Guid? departmentId,
            [FromQuery] string staffType,
            [FromQuery] string status)
            => Ok(await _service.GetStaffListAsync(departmentId, staffType, status));

        [HttpGet("staff/{id}")]
        public async Task<ActionResult<MedicalStaffDto>> GetStaff(Guid id)
            => Ok(await _service.GetStaffAsync(id));

        [HttpPost("staff")]
        public async Task<ActionResult<MedicalStaffDto>> SaveStaff([FromBody] SaveMedicalStaffDto dto)
            => Ok(await _service.SaveStaffAsync(dto));

        [HttpGet("staff/expiring-licenses")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetStaffWithExpiringLicenses([FromQuery] int daysAhead = 90)
            => Ok(await _service.GetStaffWithExpiringLicensesAsync(daysAhead));

        [HttpGet("duty-roster")]
        public async Task<ActionResult<DutyRosterDto>> GetDutyRoster(
            [FromQuery] Guid departmentId,
            [FromQuery] int year,
            [FromQuery] int month)
            => Ok(await _service.GetDutyRosterAsync(departmentId, year, month));

        [HttpPost("duty-roster")]
        public async Task<ActionResult<DutyRosterDto>> CreateDutyRoster([FromBody] CreateDutyRosterDto dto)
            => Ok(await _service.CreateDutyRosterAsync(dto));

        [HttpGet("clinic-assignments")]
        public async Task<ActionResult<List<ClinicAssignmentDto>>> GetClinicAssignments(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId)
            => Ok(await _service.GetClinicAssignmentsAsync(date, departmentId));

        [HttpGet("cme/summary/{staffId}")]
        public async Task<ActionResult<CMESummaryDto>> GetCMESummary(Guid staffId)
            => Ok(await _service.GetStaffCMESummaryAsync(staffId));

        [HttpGet("cme/non-compliant")]
        public async Task<ActionResult<List<MedicalStaffDto>>> GetCMENonCompliantStaff()
            => Ok(await _service.GetCMENonCompliantStaffAsync());

        [HttpGet("dashboard")]
        public async Task<ActionResult<MedicalHRDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }

    #endregion

    #region Luồng 17: Quality Management Controller

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
        public async Task<ActionResult<List<IncidentReportDto>>> GetIncidents(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string status,
            [FromQuery] string type)
            => Ok(await _service.GetIncidentReportsAsync(fromDate, toDate, status, type));

        [HttpGet("incidents/{id}")]
        public async Task<ActionResult<IncidentReportDto>> GetIncident(Guid id)
            => Ok(await _service.GetIncidentReportAsync(id));

        [HttpPost("incidents")]
        public async Task<ActionResult<IncidentReportDto>> CreateIncident([FromBody] CreateIncidentReportDto dto)
            => Ok(await _service.CreateIncidentReportAsync(dto));

        [HttpGet("indicators")]
        public async Task<ActionResult<List<QualityIndicatorDto>>> GetIndicators([FromQuery] string category)
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
        public async Task<ActionResult<List<CAPADto>>> GetCAPAs([FromQuery] string status, [FromQuery] string source)
            => Ok(await _service.GetCAPAsAsync(status, source));

        [HttpGet("dashboard")]
        public async Task<ActionResult<QMDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }

    #endregion

    #region Luồng 18: Patient Portal Controller

    /// <summary>
    /// API Controller for Patient Portal - Luồng 18
    /// </summary>
    [ApiController]
    [Route("api/portal")]
    public class PatientPortalController : ControllerBase
    {
        private readonly IPatientPortalService _service;

        public PatientPortalController(IPatientPortalService service)
        {
            _service = service;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<PortalAccountDto>> Register([FromBody] RegisterPortalAccountDto dto)
            => Ok(await _service.RegisterAccountAsync(dto));

        [HttpGet("appointments")]
        [Authorize]
        public async Task<ActionResult<List<PortalAppointmentDto>>> GetAppointments(
            [FromQuery] Guid patientId,
            [FromQuery] bool includeHistory = false)
            => Ok(await _service.GetAppointmentsAsync(patientId, includeHistory));

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
            => Ok(await _service.BookAppointmentAsync(patientId, dto));

        [HttpGet("health-record")]
        [Authorize]
        public async Task<ActionResult<HealthRecordSummaryDto>> GetHealthRecord([FromQuery] Guid patientId)
            => Ok(await _service.GetHealthRecordSummaryAsync(patientId));

        [HttpGet("lab-results")]
        [Authorize]
        public async Task<ActionResult<List<PortalLabResultDto>>> GetLabResults(
            [FromQuery] Guid patientId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
            => Ok(await _service.GetLabResultsAsync(patientId, fromDate, toDate));

        [HttpGet("imaging-results")]
        [Authorize]
        public async Task<ActionResult<List<PortalImagingResultDto>>> GetImagingResults(
            [FromQuery] Guid patientId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
            => Ok(await _service.GetImagingResultsAsync(patientId, fromDate, toDate));

        [HttpGet("prescriptions")]
        [Authorize]
        public async Task<ActionResult<List<PortalPrescriptionDto>>> GetPrescriptions(
            [FromQuery] Guid patientId,
            [FromQuery] bool activeOnly = true)
            => Ok(await _service.GetPrescriptionsAsync(patientId, activeOnly));

        [HttpGet("invoices")]
        [Authorize]
        public async Task<ActionResult<List<PortalInvoiceDto>>> GetInvoices(
            [FromQuery] Guid patientId,
            [FromQuery] bool unpaidOnly = false)
            => Ok(await _service.GetInvoicesAsync(patientId, unpaidOnly));

        [HttpPost("payments")]
        [Authorize]
        public async Task<ActionResult<OnlinePaymentDto>> InitiatePayment(
            [FromQuery] Guid patientId,
            [FromBody] InitiatePaymentDto dto)
            => Ok(await _service.InitiatePaymentAsync(patientId, dto));

        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<PatientPortalDashboardDto>> GetDashboard([FromQuery] Guid patientId)
            => Ok(await _service.GetDashboardAsync(patientId));
    }

    #endregion

    #region Luồng 19: Health Information Exchange Controller

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
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status)
            => Ok(await _service.GetSubmissionsAsync(fromDate, toDate, status));

        [HttpGet("referrals/outgoing")]
        public async Task<ActionResult<List<ElectronicReferralDto>>> GetOutgoingReferrals(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status)
            => Ok(await _service.GetOutgoingReferralsAsync(fromDate, toDate, status));

        [HttpGet("referrals/incoming")]
        public async Task<ActionResult<List<ElectronicReferralDto>>> GetIncomingReferrals(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status)
            => Ok(await _service.GetIncomingReferralsAsync(fromDate, toDate, status));

        [HttpPost("referrals")]
        public async Task<ActionResult<ElectronicReferralDto>> CreateReferral([FromBody] CreateElectronicReferralDto dto)
            => Ok(await _service.CreateReferralAsync(dto));

        [HttpGet("teleconsultation")]
        public async Task<ActionResult<List<TeleconsultationRequestDto>>> GetTeleconsultations([FromQuery] string status)
            => Ok(await _service.GetTeleconsultationRequestsAsync(status));

        [HttpPost("teleconsultation")]
        public async Task<ActionResult<TeleconsultationRequestDto>> CreateTeleconsultation([FromBody] CreateTeleconsultationDto dto)
            => Ok(await _service.CreateTeleconsultationAsync(dto));

        [HttpGet("dashboard")]
        public async Task<ActionResult<HIEDashboardDto>> GetDashboard()
            => Ok(await _service.GetDashboardAsync());
    }

    #endregion

    #region Luồng 20: Mass Casualty Incident Controller

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

    #endregion
}
