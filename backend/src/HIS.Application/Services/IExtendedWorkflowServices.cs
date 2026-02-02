using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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

namespace HIS.Application.Services
{
    #region Luồng 11: Telemedicine Service

    /// <summary>
    /// Luồng 11: Telemedicine - Khám bệnh từ xa
    /// </summary>
    public interface ITelemedicineService
    {
        // Appointments
        Task<List<TeleAppointmentDto>> GetAppointmentsAsync(DateTime? fromDate, DateTime? toDate, string status = null);
        Task<TeleAppointmentDto> GetAppointmentByIdAsync(Guid id);
        Task<TeleAppointmentDto> CreateAppointmentAsync(CreateTeleAppointmentDto dto);
        Task<bool> CancelAppointmentAsync(Guid id, string reason);
        Task<bool> ConfirmAppointmentAsync(Guid id);
        Task<List<DoctorAvailableSlotDto>> GetAvailableSlotsAsync(Guid? doctorId, Guid? specialityId, DateTime fromDate, DateTime toDate);

        // Video Sessions
        Task<TeleSessionDto> StartSessionAsync(StartVideoCallDto dto);
        Task<TeleSessionDto> GetSessionAsync(Guid sessionId);
        Task<WaitingRoomDto> GetWaitingRoomStatusAsync(Guid appointmentId);
        Task<bool> EndSessionAsync(Guid sessionId);
        Task<string> GetSessionRecordingUrlAsync(Guid sessionId);

        // Consultations
        Task<TeleConsultationRecordDto> GetConsultationRecordAsync(Guid sessionId);
        Task<TeleConsultationRecordDto> SaveConsultationRecordAsync(SaveTeleConsultationDto dto);

        // E-Prescriptions
        Task<TelePrescriptionDto> CreatePrescriptionAsync(Guid sessionId, List<TelePrescriptionItemDto> items, string note);
        Task<TelePrescriptionDto> SignPrescriptionAsync(Guid prescriptionId);
        Task<bool> SendPrescriptionToPharmacyAsync(SendPrescriptionToPharmacyDto dto);

        // Feedback
        Task<TeleFeedbackDto> SubmitFeedbackAsync(SubmitTeleFeedbackDto dto);

        // Dashboard
        Task<TelemedicineDashboardDto> GetDashboardAsync(DateTime? date = null);
    }

    #endregion

    #region Luồng 12: Clinical Nutrition Service

    /// <summary>
    /// Luồng 12: Dinh dưỡng lâm sàng
    /// </summary>
    public interface IClinicalNutritionService
    {
        // Screening
        Task<List<NutritionScreeningDto>> GetPendingScreeningsAsync(Guid? departmentId = null);
        Task<NutritionScreeningDto> GetScreeningByAdmissionAsync(Guid admissionId);
        Task<NutritionScreeningDto> PerformScreeningAsync(PerformNutritionScreeningDto dto);
        Task<List<NutritionScreeningDto>> GetHighRiskPatientsAsync(Guid? departmentId = null);

        // Assessment
        Task<NutritionAssessmentDto> GetAssessmentAsync(Guid id);
        Task<NutritionAssessmentDto> SaveAssessmentAsync(SaveNutritionAssessmentDto dto);
        Task<decimal> CalculateEnergyRequirementAsync(Guid patientId, decimal weight, decimal height, decimal activityFactor, decimal stressFactor);

        // Diet Orders
        Task<List<DietOrderDto>> GetActiveDietOrdersAsync(Guid? departmentId = null);
        Task<DietOrderDto> GetDietOrderAsync(Guid id);
        Task<DietOrderDto> CreateDietOrderAsync(CreateDietOrderDto dto);
        Task<DietOrderDto> UpdateDietOrderAsync(Guid id, CreateDietOrderDto dto);
        Task<bool> DiscontinueDietOrderAsync(Guid id, string reason);
        Task<List<DietTypeDto>> GetDietTypesAsync(string category = null);

        // Meal Planning
        Task<List<MealPlanDto>> GetMealPlansAsync(DateTime date, Guid? departmentId = null);
        Task<MealPlanDto> GenerateMealPlanAsync(DateTime date, string mealType, Guid? departmentId = null);
        Task<bool> MarkMealDeliveredAsync(Guid dietOrderId, DateTime date, string mealType);

        // Monitoring
        Task<NutritionMonitoringDto> GetMonitoringAsync(Guid admissionId, DateTime date);
        Task<NutritionMonitoringDto> RecordMonitoringAsync(RecordNutritionMonitoringDto dto);
        Task<List<NutritionMonitoringDto>> GetMonitoringHistoryAsync(Guid admissionId);

        // TPN
        Task<TPNOrderDto> GetTPNOrderAsync(Guid id);
        Task<TPNOrderDto> CreateTPNOrderAsync(TPNOrderDto dto);

        // Dashboard
        Task<NutritionDashboardDto> GetDashboardAsync(DateTime? date = null);
    }

    #endregion

    #region Luồng 13: Infection Control Service

    /// <summary>
    /// Luồng 13: Kiểm soát nhiễm khuẩn
    /// </summary>
    public interface IInfectionControlService
    {
        // HAI Surveillance
        Task<List<HAIDto>> GetActiveHAICasesAsync(string infectionType = null, Guid? departmentId = null);
        Task<HAIDto> GetHAICaseAsync(Guid id);
        Task<HAIDto> ReportHAIAsync(ReportHAIDto dto);
        Task<HAIDto> UpdateHAICaseAsync(Guid id, HAIDto dto);
        Task<HAIDto> ConfirmHAICaseAsync(Guid id, string organism, bool isMDRO);
        Task<HAIDto> ResolveHAICaseAsync(Guid id, string outcome);

        // Isolation
        Task<List<IsolationOrderDto>> GetActiveIsolationsAsync(Guid? departmentId = null);
        Task<IsolationOrderDto> GetIsolationOrderAsync(Guid id);
        Task<IsolationOrderDto> CreateIsolationOrderAsync(CreateIsolationOrderDto dto);
        Task<bool> DiscontinueIsolationAsync(Guid id, string reason);

        // Hand Hygiene
        Task<List<HandHygieneObservationDto>> GetHandHygieneObservationsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);
        Task<HandHygieneObservationDto> RecordHandHygieneObservationAsync(RecordHandHygieneDto dto);
        Task<decimal> GetHandHygieneComplianceRateAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        // Outbreak
        Task<List<OutbreakDto>> GetActiveOutbreaksAsync();
        Task<OutbreakDto> GetOutbreakAsync(Guid id);
        Task<OutbreakDto> DeclareOutbreakAsync(DeclareOutbreakDto dto);
        Task<OutbreakDto> UpdateOutbreakAsync(Guid id, OutbreakDto dto);
        Task<bool> CloseOutbreakAsync(Guid id);
        Task<bool> LinkCaseToOutbreakAsync(Guid outbreakId, Guid caseId);

        // Environmental Surveillance
        Task<List<EnvironmentSurveillanceDto>> GetEnvironmentSurveillanceAsync(DateTime fromDate, DateTime toDate, string locationType = null);
        Task<EnvironmentSurveillanceDto> RecordEnvironmentSurveillanceAsync(EnvironmentSurveillanceDto dto);

        // Antibiotic Stewardship
        Task<List<AntibioticStewardshipDto>> GetAntibioticsRequiringReviewAsync(Guid? departmentId = null);
        Task<AntibioticUsageReportDto> GetAntibioticUsageReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);
        Task<bool> ReviewAntibioticAsync(Guid id, string outcome, string notes);

        // Dashboard
        Task<ICDashboardDto> GetDashboardAsync(DateTime? date = null);
    }

    #endregion

    #region Luồng 14: Rehabilitation Service

    /// <summary>
    /// Luồng 14: Vật lý trị liệu / PHCN
    /// </summary>
    public interface IRehabilitationService
    {
        // Referrals
        Task<List<RehabReferralDto>> GetPendingReferralsAsync();
        Task<RehabReferralDto> GetReferralAsync(Guid id);
        Task<RehabReferralDto> CreateReferralAsync(CreateRehabReferralDto dto);
        Task<RehabReferralDto> AcceptReferralAsync(Guid id);
        Task<bool> RejectReferralAsync(Guid id, string reason);

        // Assessment
        Task<FunctionalAssessmentDto> GetAssessmentAsync(Guid id);
        Task<FunctionalAssessmentDto> SaveAssessmentAsync(SaveFunctionalAssessmentDto dto);
        Task<List<FunctionalAssessmentDto>> GetAssessmentHistoryAsync(Guid referralId);

        // Treatment Plan
        Task<RehabTreatmentPlanDto> GetTreatmentPlanAsync(Guid id);
        Task<RehabTreatmentPlanDto> CreateTreatmentPlanAsync(CreateTreatmentPlanDto dto);
        Task<RehabTreatmentPlanDto> UpdateTreatmentPlanAsync(Guid id, CreateTreatmentPlanDto dto);
        Task<bool> UpdateGoalProgressAsync(Guid planId, int goalNumber, decimal progressPercent, string notes);

        // Sessions
        Task<List<RehabSessionDto>> GetSessionsAsync(DateTime fromDate, DateTime toDate, Guid? therapistId = null);
        Task<List<RehabSessionDto>> GetPatientSessionsAsync(Guid referralId);
        Task<RehabSessionDto> GetSessionAsync(Guid id);
        Task<RehabSessionDto> ScheduleSessionAsync(Guid planId, DateTime date, TimeSpan time, string location);
        Task<RehabSessionDto> DocumentSessionAsync(DocumentSessionDto dto);
        Task<bool> CancelSessionAsync(Guid id, string reason);
        Task<bool> MarkNoShowAsync(Guid id);

        // Progress & Outcome
        Task<RehabProgressReportDto> GetProgressReportAsync(Guid planId);
        Task<RehabOutcomeDto> GetOutcomeAsync(Guid planId);
        Task<RehabOutcomeDto> DischargePatientAsync(Guid planId, RehabOutcomeDto outcomeData);

        // Dashboard
        Task<RehabDashboardDto> GetDashboardAsync(DateTime? date = null);
    }

    #endregion

    #region Luồng 15: Medical Equipment Service

    /// <summary>
    /// Luồng 15: Quản lý Trang thiết bị Y tế
    /// </summary>
    public interface IMedicalEquipmentService
    {
        // Equipment Inventory
        Task<List<MedicalEquipmentDto>> GetEquipmentListAsync(Guid? departmentId = null, string category = null, string status = null);
        Task<MedicalEquipmentDto> GetEquipmentAsync(Guid id);
        Task<MedicalEquipmentDto> RegisterEquipmentAsync(RegisterEquipmentDto dto);
        Task<MedicalEquipmentDto> UpdateEquipmentAsync(Guid id, RegisterEquipmentDto dto);
        Task<bool> TransferEquipmentAsync(Guid id, Guid newDepartmentId, string roomNumber);
        Task<bool> UpdateEquipmentStatusAsync(Guid id, string status, string reason);

        // Maintenance
        Task<List<MaintenanceScheduleDto>> GetMaintenanceSchedulesAsync(DateTime? dueDate = null, bool? overdue = null);
        Task<MaintenanceScheduleDto> CreateMaintenanceScheduleAsync(Guid equipmentId, string maintenanceType, string frequency, DateTime nextDueDate);
        Task<List<MaintenanceRecordDto>> GetMaintenanceHistoryAsync(Guid equipmentId);
        Task<MaintenanceRecordDto> RecordMaintenanceAsync(CreateMaintenanceRecordDto dto);

        // Calibration
        Task<List<CalibrationRecordDto>> GetCalibrationsDueAsync(int daysAhead = 30);
        Task<CalibrationRecordDto> GetCalibrationRecordAsync(Guid id);
        Task<CalibrationRecordDto> RecordCalibrationAsync(RecordCalibrationDto dto);
        Task<List<CalibrationRecordDto>> GetCalibrationHistoryAsync(Guid equipmentId);

        // Repairs
        Task<List<RepairRequestDto>> GetRepairRequestsAsync(string status = null, Guid? departmentId = null);
        Task<RepairRequestDto> GetRepairRequestAsync(Guid id);
        Task<RepairRequestDto> CreateRepairRequestAsync(CreateRepairRequestDto dto);
        Task<RepairRequestDto> UpdateRepairRequestAsync(Guid id, RepairRequestDto dto);
        Task<bool> CompleteRepairAsync(Guid id, string actionTaken, string partsUsed, decimal cost);

        // Disposal
        Task<List<EquipmentDisposalDto>> GetDisposalRequestsAsync(string status = null);
        Task<EquipmentDisposalDto> CreateDisposalRequestAsync(CreateDisposalRequestDto dto);
        Task<bool> ApproveDisposalAsync(Guid id, string notes);
        Task<bool> RejectDisposalAsync(Guid id, string reason);
        Task<bool> ExecuteDisposalAsync(Guid id, DateTime disposalDate, string certificate);

        // Reports & Dashboard
        Task<EquipmentDashboardDto> GetDashboardAsync();
        Task<EquipmentReportDto> GetEquipmentReportAsync(DateTime fromDate, DateTime toDate);
    }

    #endregion

    #region Luồng 16: Medical HR Service

    /// <summary>
    /// Luồng 16: Quản lý Nhân sự Y tế
    /// </summary>
    public interface IMedicalHRService
    {
        // Staff Profiles
        Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId = null, string staffType = null, string status = null);
        Task<MedicalStaffDto> GetStaffAsync(Guid id);
        Task<MedicalStaffDto> SaveStaffAsync(SaveMedicalStaffDto dto);
        Task<bool> UpdateStaffStatusAsync(Guid id, string status, string reason);
        Task<List<MedicalStaffDto>> GetStaffWithExpiringLicensesAsync(int daysAhead = 90);

        // Qualifications & Certifications
        Task<QualificationDto> AddQualificationAsync(Guid staffId, QualificationDto dto);
        Task<bool> RemoveQualificationAsync(Guid id);
        Task<CertificationDto> AddCertificationAsync(Guid staffId, CertificationDto dto);
        Task<bool> RemoveCertificationAsync(Guid id);

        // Duty Roster
        Task<DutyRosterDto> GetDutyRosterAsync(Guid departmentId, int year, int month);
        Task<DutyRosterDto> CreateDutyRosterAsync(CreateDutyRosterDto dto);
        Task<DutyRosterDto> PublishDutyRosterAsync(Guid rosterId);
        Task<DutyShiftDto> AddShiftAssignmentAsync(Guid shiftId, Guid staffId, string role);
        Task<bool> RemoveShiftAssignmentAsync(Guid assignmentId);

        // Shift Swaps
        Task<List<ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(Guid? departmentId = null);
        Task<ShiftSwapRequestDto> RequestShiftSwapAsync(Guid assignmentId, Guid targetAssignmentId, string reason);
        Task<bool> ApproveSwapAsTargetAsync(Guid requestId, bool approve);
        Task<bool> ApproveSwapAsManagerAsync(Guid requestId, bool approve, string notes);

        // Clinic Assignment
        Task<List<ClinicAssignmentDto>> GetClinicAssignmentsAsync(DateTime date, Guid? departmentId = null);
        Task<ClinicAssignmentDto> CreateClinicAssignmentAsync(CreateClinicAssignmentDto dto);
        Task<bool> CancelClinicAssignmentAsync(Guid id, string reason);

        // CME / Training
        Task<List<CMECourseDto>> GetAvailableCoursesAsync(string category = null);
        Task<CMESummaryDto> GetStaffCMESummaryAsync(Guid staffId);
        Task<CMERecordDto> RecordCMECompletionAsync(Guid staffId, Guid courseId, int creditsEarned, string certificateNumber);
        Task<List<MedicalStaffDto>> GetCMENonCompliantStaffAsync();

        // Competency Assessment
        Task<CompetencyAssessmentDto> GetCompetencyAssessmentAsync(Guid id);
        Task<CompetencyAssessmentDto> CreateCompetencyAssessmentAsync(Guid staffId, CompetencyAssessmentDto dto);
        Task<bool> SignAssessmentAsync(Guid id, string signatureType); // Employee, Manager

        // Dashboard
        Task<MedicalHRDashboardDto> GetDashboardAsync();
    }

    #endregion

    #region Luồng 17: Quality Management Service

    /// <summary>
    /// Luồng 17: Quản lý Chất lượng
    /// </summary>
    public interface IQualityManagementService
    {
        // Incident Reporting
        Task<List<IncidentReportDto>> GetIncidentReportsAsync(DateTime? fromDate = null, DateTime? toDate = null, string status = null, string type = null);
        Task<IncidentReportDto> GetIncidentReportAsync(Guid id);
        Task<IncidentReportDto> CreateIncidentReportAsync(CreateIncidentReportDto dto);
        Task<IncidentReportDto> UpdateIncidentReportAsync(Guid id, IncidentReportDto dto);
        Task<bool> AssignInvestigatorAsync(Guid id, string investigator);
        Task<bool> CloseIncidentAsync(Guid id, string closureNotes);
        Task<bool> AddCorrectiveActionAsync(Guid incidentId, CorrectiveActionDto action);
        Task<bool> UpdateCorrectiveActionStatusAsync(Guid actionId, string status, string notes);

        // Quality Indicators
        Task<List<QualityIndicatorDto>> GetIndicatorsAsync(string category = null);
        Task<QualityIndicatorDto> GetIndicatorAsync(Guid id);
        Task<QualityIndicatorDto> CreateIndicatorAsync(QualityIndicatorDto dto);
        Task<List<QualityIndicatorValueDto>> GetIndicatorValuesAsync(Guid indicatorId, DateTime fromDate, DateTime toDate);
        Task<QualityIndicatorValueDto> RecordIndicatorValueAsync(Guid indicatorId, DateTime periodEnd, decimal numerator, decimal denominator, string analysis);
        Task<List<QualityIndicatorValueDto>> GetCriticalIndicatorsAsync();

        // Internal Audits
        Task<List<AuditPlanDto>> GetAuditPlansAsync(int year);
        Task<AuditPlanDto> CreateAuditPlanAsync(AuditPlanDto dto);
        Task<bool> ApproveAuditPlanAsync(Guid id);
        Task<AuditResultDto> GetAuditResultAsync(Guid id);
        Task<AuditResultDto> SubmitAuditResultAsync(AuditResultDto dto);
        Task<List<AuditFindingDto>> GetOpenFindingsAsync(Guid? departmentId = null);

        // Patient Satisfaction
        Task<List<PatientSatisfactionSurveyDto>> GetSurveysAsync(DateTime fromDate, DateTime toDate, string surveyType = null);
        Task<PatientSatisfactionSurveyDto> SubmitSurveyAsync(PatientSatisfactionSurveyDto dto);
        Task<SatisfactionReportDto> GetSatisfactionReportAsync(DateTime fromDate, DateTime toDate, string surveyType = null, string department = null);
        Task<bool> MarkSurveyFollowedUpAsync(Guid id, string notes);

        // CAPA
        Task<List<CAPADto>> GetCAPAsAsync(string status = null, string source = null);
        Task<CAPADto> GetCAPAAsync(Guid id);
        Task<CAPADto> CreateCAPAAsync(CAPADto dto);
        Task<CAPADto> UpdateCAPAAsync(Guid id, CAPADto dto);
        Task<bool> CloseCAPAAsync(Guid id, string verificationResult);

        // Dashboard
        Task<QMDashboardDto> GetDashboardAsync();
    }

    #endregion

    #region Luồng 18: Patient Portal Service

    /// <summary>
    /// Luồng 18: Patient Portal
    /// </summary>
    public interface IPatientPortalService
    {
        // Account Management
        Task<PortalAccountDto> GetAccountAsync(Guid accountId);
        Task<PortalAccountDto> RegisterAccountAsync(RegisterPortalAccountDto dto);
        Task<bool> VerifyEmailAsync(Guid accountId, string code);
        Task<bool> VerifyPhoneAsync(Guid accountId, string otp);
        Task<bool> LinkPatientRecordAsync(Guid accountId, string patientCode, string verificationData);
        Task<eKYCVerificationDto> SubmitEKYCAsync(Guid accountId, eKYCVerificationDto dto);
        Task<bool> UpdatePreferencesAsync(Guid accountId, PortalAccountDto preferences);

        // Appointments
        Task<List<PortalAppointmentDto>> GetAppointmentsAsync(Guid patientId, bool includeHistory = false);
        Task<PortalAppointmentDto> GetAppointmentAsync(Guid id);
        Task<List<AvailableSlotDto>> GetAvailableSlotsAsync(Guid departmentId, Guid? doctorId, DateTime fromDate, DateTime toDate);
        Task<PortalAppointmentDto> BookAppointmentAsync(Guid patientId, CreatePortalAppointmentDto dto);
        Task<bool> CancelAppointmentAsync(Guid id, string reason);
        Task<PortalAppointmentDto> RescheduleAppointmentAsync(Guid id, DateTime newDate, TimeSpan newTime);

        // Medical Records
        Task<HealthRecordSummaryDto> GetHealthRecordSummaryAsync(Guid patientId);
        Task<List<VisitSummaryDto>> GetVisitHistoryAsync(Guid patientId, int limit = 20);
        Task<byte[]> ExportHealthRecordPdfAsync(Guid patientId);

        // Lab & Imaging Results
        Task<List<PortalLabResultDto>> GetLabResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<PortalLabResultDto> GetLabResultAsync(Guid id);
        Task<bool> MarkLabResultViewedAsync(Guid id);
        Task<List<PortalImagingResultDto>> GetImagingResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<PortalImagingResultDto> GetImagingResultAsync(Guid id);

        // Prescriptions
        Task<List<PortalPrescriptionDto>> GetPrescriptionsAsync(Guid patientId, bool activeOnly = true);
        Task<PortalPrescriptionDto> GetPrescriptionAsync(Guid id);
        Task<RefillRequestDto> RequestRefillAsync(RefillRequestDto dto);
        Task<List<PortalPrescriptionDto>> GetRefillHistoryAsync(Guid patientId);

        // Payments
        Task<List<PortalInvoiceDto>> GetInvoicesAsync(Guid patientId, bool unpaidOnly = false);
        Task<PortalInvoiceDto> GetInvoiceAsync(Guid id);
        Task<OnlinePaymentDto> InitiatePaymentAsync(Guid patientId, InitiatePaymentDto dto);
        Task<OnlinePaymentDto> GetPaymentStatusAsync(Guid paymentId);
        Task<bool> ProcessPaymentCallbackAsync(string transactionCode, string gatewayResponse);

        // Feedback & Notifications
        Task<ServiceFeedbackDto> SubmitFeedbackAsync(Guid patientId, SubmitFeedbackDto dto);
        Task<List<PortalNotificationDto>> GetNotificationsAsync(Guid accountId, bool unreadOnly = false);
        Task<bool> MarkNotificationReadAsync(Guid id);
        Task<int> GetUnreadNotificationCountAsync(Guid accountId);

        // Dashboard
        Task<PatientPortalDashboardDto> GetDashboardAsync(Guid patientId);
    }

    #endregion

    #region Luồng 19: Health Information Exchange Service

    /// <summary>
    /// Luồng 19: Liên thông Y tế (HIE)
    /// </summary>
    public interface IHealthExchangeService
    {
        // Connections
        Task<List<HIEConnectionDto>> GetConnectionsAsync();
        Task<HIEConnectionDto> TestConnectionAsync(Guid connectionId);
        Task<HIEConnectionConfigDto> SaveConnectionConfigAsync(HIEConnectionConfigDto dto);

        // Insurance (BHXH)
        Task<InsuranceCardLookupResultDto> LookupInsuranceCardAsync(string cardNumber);
        Task<InsuranceXMLSubmissionDto> GenerateXMLAsync(string xmlType, DateTime fromDate, DateTime toDate, Guid? departmentId = null);
        Task<InsuranceXMLSubmissionDto> ValidateXMLAsync(Guid submissionId);
        Task<InsuranceXMLSubmissionDto> SubmitXMLAsync(Guid submissionId);
        Task<InsuranceXMLSubmissionDto> GetSubmissionStatusAsync(Guid submissionId);
        Task<List<InsuranceXMLSubmissionDto>> GetSubmissionsAsync(DateTime fromDate, DateTime toDate, string status = null);
        Task<InsuranceAuditResultDto> GetAuditResultAsync(string submissionId);

        // Electronic Health Records
        Task<ElectronicHealthRecordDto> GetEHRAsync(string patientIdNumber);
        Task<bool> UpdateEHRAsync(ElectronicHealthRecordDto dto);
        Task<PatientConsentDto> GetPatientConsentAsync(Guid patientId);
        Task<PatientConsentDto> RecordPatientConsentAsync(PatientConsentDto dto);
        Task<bool> RevokeConsentAsync(Guid consentId, string reason);

        // Referrals
        Task<List<ElectronicReferralDto>> GetOutgoingReferralsAsync(DateTime fromDate, DateTime toDate, string status = null);
        Task<List<ElectronicReferralDto>> GetIncomingReferralsAsync(DateTime fromDate, DateTime toDate, string status = null);
        Task<ElectronicReferralDto> GetReferralAsync(Guid id);
        Task<ElectronicReferralDto> CreateReferralAsync(CreateElectronicReferralDto dto);
        Task<ElectronicReferralDto> SendReferralAsync(Guid id);
        Task<bool> AcceptReferralAsync(Guid id, string notes);
        Task<bool> RejectReferralAsync(Guid id, string reason);

        // Teleconsultation
        Task<List<TeleconsultationRequestDto>> GetTeleconsultationRequestsAsync(string status = null);
        Task<TeleconsultationRequestDto> GetTeleconsultationAsync(Guid id);
        Task<TeleconsultationRequestDto> CreateTeleconsultationAsync(CreateTeleconsultationDto dto);
        Task<TeleconsultationRequestDto> RespondToTeleconsultationAsync(Guid id, string notes, string recommendations);

        // Authority Reporting
        Task<HealthAuthorityReportDto> GenerateAuthorityReportAsync(string reportType, DateTime fromDate, DateTime toDate);
        Task<HealthAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId);
        Task<InfectiousDiseaseReportDto> SubmitInfectiousDiseaseReportAsync(InfectiousDiseaseReportDto dto);

        // Dashboard
        Task<HIEDashboardDto> GetDashboardAsync();
    }

    #endregion

    #region Luồng 20: Mass Casualty Incident Service

    /// <summary>
    /// Luồng 20: Cấp cứu Thảm họa (MCI)
    /// </summary>
    public interface IMassCasualtyService
    {
        // Event Management
        Task<MCIEventDto> GetActiveEventAsync();
        Task<List<MCIEventDto>> GetEventsAsync(DateTime? fromDate = null, DateTime? toDate = null);
        Task<MCIEventDto> GetEventAsync(Guid id);
        Task<MCIEventDto> ActivateEventAsync(ActivateMCIEventDto dto);
        Task<MCIEventDto> UpdateEventAsync(UpdateMCIEventDto dto);
        Task<bool> EscalateEventAsync(Guid eventId, string newAlertLevel);
        Task<bool> DeactivateEventAsync(Guid eventId, string reason);

        // Victim Management
        Task<List<MCIVictimDto>> GetVictimsAsync(Guid eventId, string triageCategory = null, string status = null);
        Task<MCIVictimDto> GetVictimAsync(Guid id);
        Task<MCIVictimDto> RegisterVictimAsync(RegisterMCIVictimDto dto);
        Task<MCIVictimDto> UpdateVictimAsync(Guid id, MCIVictimDto dto);
        Task<MCIVictimDto> ReTriageVictimAsync(ReTriageDto dto);
        Task<bool> IdentifyVictimAsync(Guid victimId, string name, string idNumber, DateTime? dateOfBirth);
        Task<bool> AssignVictimLocationAsync(Guid victimId, string area, string assignedTo);
        Task<MCIVictimDto> RecordTreatmentAsync(Guid victimId, MCITreatmentDto treatment);
        Task<MCIVictimDto> DispositionVictimAsync(Guid victimId, string disposition, string destination = null);

        // Resource Management
        Task<MCIResourceStatusDto> GetResourceStatusAsync(Guid eventId);
        Task<MCIResourceStatusDto> UpdateResourceStatusAsync(Guid eventId, MCIResourceStatusDto dto);
        Task<StaffCalloutDto> InitiateStaffCalloutAsync(Guid eventId);
        Task<bool> RecordStaffResponseAsync(Guid calloutId, Guid staffId, string response, int? etaMinutes);

        // Command Center
        Task<MCICommandCenterDto> GetCommandCenterDataAsync(Guid eventId);
        Task<MCIRealTimeStatsDto> GetRealTimeStatsAsync(Guid eventId);
        Task<MCIBroadcastDto> SendBroadcastAsync(Guid eventId, string messageType, string priority, string title, string message, List<string> targetGroups);
        Task<List<MCIUpdateDto>> GetEventUpdatesAsync(Guid eventId, int limit = 50);
        Task<MCIUpdateDto> PostUpdateAsync(Guid eventId, string category, string message, string priority);

        // Family Notification
        Task<List<FamilyNotificationDto>> GetFamilyNotificationsAsync(Guid eventId);
        Task<FamilyNotificationDto> NotifyFamilyAsync(Guid victimId, FamilyNotificationDto dto);
        Task<List<HotlineCallDto>> GetHotlineCallsAsync(Guid eventId);
        Task<HotlineCallDto> RecordHotlineCallAsync(Guid eventId, HotlineCallDto dto);
        Task<bool> MatchVictimToInquiryAsync(Guid callId, Guid victimId);

        // Reporting
        Task<MCIEventReportDto> GenerateEventReportAsync(Guid eventId);
        Task<MCIAuthorityReportDto> GenerateAuthorityReportAsync(Guid eventId, string reportType);
        Task<MCIAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId);

        // Dashboard
        Task<MCIDashboardDto> GetDashboardAsync();
    }

    #endregion
}
