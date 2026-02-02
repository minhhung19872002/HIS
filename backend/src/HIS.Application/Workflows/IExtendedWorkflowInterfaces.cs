using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HIS.Application.Workflows
{
    #region Luồng 11: Telemedicine Workflow

    /// <summary>
    /// Workflow interface for Telemedicine - Luồng 11
    /// </summary>
    public interface ITelemedicineWorkflowService
    {
        /// <summary>
        /// Complete telemedicine appointment flow
        /// </summary>
        Task<TelemedicineSessionResult> ProcessTelemedicineAppointmentAsync(
            Guid appointmentId,
            TelemedicineWorkflowContext context);

        /// <summary>
        /// Process e-prescription after teleconsultation
        /// </summary>
        Task<ePrescriptionResult> ProcessEPrescriptionAsync(
            Guid sessionId,
            List<PrescriptionItem> items);
    }

    public class TelemedicineWorkflowContext
    {
        public Guid PatientId { get; set; }
        public Guid DoctorId { get; set; }
        public string AppointmentType { get; set; }
        public string ChiefComplaint { get; set; }
    }

    public class TelemedicineSessionResult
    {
        public bool Success { get; set; }
        public Guid SessionId { get; set; }
        public string RoomUrl { get; set; }
        public int DurationMinutes { get; set; }
        public Guid? PrescriptionId { get; set; }
        public bool RequiresFollowUp { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class PrescriptionItem
    {
        public Guid DrugId { get; set; }
        public decimal Quantity { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public int DurationDays { get; set; }
    }

    public class ePrescriptionResult
    {
        public bool Success { get; set; }
        public Guid PrescriptionId { get; set; }
        public string QRCode { get; set; }
        public bool SentToPharmacy { get; set; }
    }

    #endregion

    #region Luồng 12: Clinical Nutrition Workflow

    /// <summary>
    /// Workflow interface for Clinical Nutrition - Luồng 12
    /// </summary>
    public interface INutritionWorkflowService
    {
        /// <summary>
        /// Complete nutrition care process
        /// </summary>
        Task<NutritionCareResult> ProcessNutritionCareAsync(
            Guid admissionId,
            NutritionWorkflowContext context);

        /// <summary>
        /// Generate daily meal plan
        /// </summary>
        Task<MealPlanGenerationResult> GenerateDailyMealPlanAsync(
            DateTime date,
            Guid? departmentId = null);
    }

    public class NutritionWorkflowContext
    {
        public decimal Weight { get; set; }
        public decimal Height { get; set; }
        public int ScreeningScore { get; set; }
        public string DietType { get; set; }
        public List<string> Allergies { get; set; }
    }

    public class NutritionCareResult
    {
        public bool Success { get; set; }
        public string RiskLevel { get; set; }
        public Guid? AssessmentId { get; set; }
        public Guid? DietOrderId { get; set; }
        public decimal EnergyRequirement { get; set; }
        public decimal ProteinRequirement { get; set; }
    }

    public class MealPlanGenerationResult
    {
        public bool Success { get; set; }
        public int TotalPatients { get; set; }
        public int MealsPlanned { get; set; }
        public List<string> Warnings { get; set; }
    }

    #endregion

    #region Luồng 13: Infection Control Workflow

    /// <summary>
    /// Workflow interface for Infection Control - Luồng 13
    /// </summary>
    public interface IInfectionControlWorkflowService
    {
        /// <summary>
        /// Process HAI case detection and investigation
        /// </summary>
        Task<HAIProcessResult> ProcessHAICaseAsync(
            Guid admissionId,
            HAIDetectionContext context);

        /// <summary>
        /// Initiate outbreak response
        /// </summary>
        Task<OutbreakResponseResult> InitiateOutbreakResponseAsync(
            Guid outbreakId,
            OutbreakContext context);

        /// <summary>
        /// Run daily surveillance
        /// </summary>
        Task<SurveillanceResult> RunDailySurveillanceAsync(DateTime date);
    }

    public class HAIDetectionContext
    {
        public string InfectionType { get; set; }
        public DateTime OnsetDate { get; set; }
        public string Organism { get; set; }
        public bool IsMDRO { get; set; }
        public List<string> RiskFactors { get; set; }
    }

    public class HAIProcessResult
    {
        public bool Success { get; set; }
        public Guid HAICaseId { get; set; }
        public bool RequiresIsolation { get; set; }
        public Guid? IsolationOrderId { get; set; }
        public bool RequiresOutbreakInvestigation { get; set; }
        public string RecommendedActions { get; set; }
    }

    public class OutbreakContext
    {
        public string Organism { get; set; }
        public List<Guid> InitialCases { get; set; }
        public List<string> AffectedDepartments { get; set; }
    }

    public class OutbreakResponseResult
    {
        public bool Success { get; set; }
        public Guid OutbreakId { get; set; }
        public int StaffNotified { get; set; }
        public List<string> ControlMeasures { get; set; }
        public bool ReportedToAuthority { get; set; }
    }

    public class SurveillanceResult
    {
        public int CasesScreened { get; set; }
        public int NewHAIDetected { get; set; }
        public int AlertsGenerated { get; set; }
        public decimal HandHygieneCompliance { get; set; }
    }

    #endregion

    #region Luồng 14: Rehabilitation Workflow

    /// <summary>
    /// Workflow interface for Rehabilitation - Luồng 14
    /// </summary>
    public interface IRehabilitationWorkflowService
    {
        /// <summary>
        /// Process complete rehabilitation episode
        /// </summary>
        Task<RehabEpisodeResult> ProcessRehabEpisodeAsync(
            Guid referralId,
            RehabWorkflowContext context);

        /// <summary>
        /// Generate progress report
        /// </summary>
        Task<RehabReportResult> GenerateProgressReportAsync(Guid planId);
    }

    public class RehabWorkflowContext
    {
        public string RehabType { get; set; }
        public string Diagnosis { get; set; }
        public int InitialFIMScore { get; set; }
        public List<string> Goals { get; set; }
    }

    public class RehabEpisodeResult
    {
        public bool Success { get; set; }
        public Guid AssessmentId { get; set; }
        public Guid TreatmentPlanId { get; set; }
        public int PlannedSessions { get; set; }
        public DateTime ExpectedDischargeDate { get; set; }
    }

    public class RehabReportResult
    {
        public bool Success { get; set; }
        public decimal GoalAchievementRate { get; set; }
        public int FIMGain { get; set; }
        public string Recommendations { get; set; }
    }

    #endregion

    #region Luồng 15: Medical Equipment Workflow

    /// <summary>
    /// Workflow interface for Medical Equipment - Luồng 15
    /// </summary>
    public interface IEquipmentWorkflowService
    {
        /// <summary>
        /// Process equipment lifecycle event
        /// </summary>
        Task<EquipmentEventResult> ProcessEquipmentEventAsync(
            Guid equipmentId,
            EquipmentEventContext context);

        /// <summary>
        /// Run maintenance due check
        /// </summary>
        Task<MaintenanceCheckResult> RunMaintenanceDueCheckAsync();
    }

    public class EquipmentEventContext
    {
        public string EventType { get; set; } // Registration, Maintenance, Calibration, Repair, Disposal
        public string Description { get; set; }
        public decimal? Cost { get; set; }
        public string PerformedBy { get; set; }
    }

    public class EquipmentEventResult
    {
        public bool Success { get; set; }
        public Guid EventRecordId { get; set; }
        public string NextScheduledEvent { get; set; }
        public DateTime? NextEventDate { get; set; }
        public List<string> Alerts { get; set; }
    }

    public class MaintenanceCheckResult
    {
        public int EquipmentChecked { get; set; }
        public int MaintenanceDue { get; set; }
        public int CalibrationDue { get; set; }
        public int AlertsGenerated { get; set; }
    }

    #endregion

    #region Luồng 16: Medical HR Workflow

    /// <summary>
    /// Workflow interface for Medical HR - Luồng 16
    /// </summary>
    public interface IMedicalHRWorkflowService
    {
        /// <summary>
        /// Generate duty roster
        /// </summary>
        Task<RosterGenerationResult> GenerateDutyRosterAsync(
            Guid departmentId,
            int year,
            int month,
            RosterGenerationContext context);

        /// <summary>
        /// Process staff credential check
        /// </summary>
        Task<CredentialCheckResult> ProcessCredentialCheckAsync();
    }

    public class RosterGenerationContext
    {
        public int RequiredDoctorsPerShift { get; set; }
        public int RequiredNursesPerShift { get; set; }
        public List<Guid> AvailableStaff { get; set; }
        public Dictionary<Guid, List<DateTime>> LeaveRequests { get; set; }
    }

    public class RosterGenerationResult
    {
        public bool Success { get; set; }
        public Guid RosterId { get; set; }
        public int TotalShifts { get; set; }
        public int FilledShifts { get; set; }
        public List<string> Warnings { get; set; }
    }

    public class CredentialCheckResult
    {
        public int StaffChecked { get; set; }
        public int ExpiringLicenses { get; set; }
        public int ExpiredLicenses { get; set; }
        public int CMENonCompliant { get; set; }
        public int AlertsSent { get; set; }
    }

    #endregion

    #region Luồng 17: Quality Management Workflow

    /// <summary>
    /// Workflow interface for Quality Management - Luồng 17
    /// </summary>
    public interface IQualityManagementWorkflowService
    {
        /// <summary>
        /// Process incident through investigation
        /// </summary>
        Task<IncidentProcessResult> ProcessIncidentAsync(
            Guid incidentId,
            IncidentProcessContext context);

        /// <summary>
        /// Run quality indicator calculation
        /// </summary>
        Task<QICalculationResult> CalculateQualityIndicatorsAsync(
            DateTime periodEnd);
    }

    public class IncidentProcessContext
    {
        public bool RequiresRCA { get; set; }
        public string RCAMethod { get; set; }
        public List<string> ContributingFactors { get; set; }
        public string RootCause { get; set; }
        public List<string> CorrectiveActions { get; set; }
    }

    public class IncidentProcessResult
    {
        public bool Success { get; set; }
        public string InvestigationStatus { get; set; }
        public Guid? CAPAId { get; set; }
        public int ActionsCreated { get; set; }
        public bool ReportedToAuthority { get; set; }
    }

    public class QICalculationResult
    {
        public int IndicatorsCalculated { get; set; }
        public int MetTarget { get; set; }
        public int WarningLevel { get; set; }
        public int CriticalLevel { get; set; }
        public List<string> CriticalIndicators { get; set; }
    }

    #endregion

    #region Luồng 18: Patient Portal Workflow

    /// <summary>
    /// Workflow interface for Patient Portal - Luồng 18
    /// </summary>
    public interface IPatientPortalWorkflowService
    {
        /// <summary>
        /// Process patient registration and linking
        /// </summary>
        Task<PatientRegistrationResult> ProcessPatientRegistrationAsync(
            PatientRegistrationContext context);

        /// <summary>
        /// Process online payment
        /// </summary>
        Task<PaymentProcessResult> ProcessOnlinePaymentAsync(
            Guid paymentId,
            PaymentContext context);
    }

    public class PatientRegistrationContext
    {
        public string FullName { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public bool UseEKYC { get; set; }
    }

    public class PatientRegistrationResult
    {
        public bool Success { get; set; }
        public Guid AccountId { get; set; }
        public Guid? PatientId { get; set; }
        public bool IsLinked { get; set; }
        public bool RequiresVerification { get; set; }
    }

    public class PaymentContext
    {
        public List<Guid> InvoiceIds { get; set; }
        public string PaymentMethod { get; set; }
        public string GatewayResponse { get; set; }
    }

    public class PaymentProcessResult
    {
        public bool Success { get; set; }
        public string TransactionId { get; set; }
        public decimal AmountPaid { get; set; }
        public string ReceiptUrl { get; set; }
        public string ErrorMessage { get; set; }
    }

    #endregion

    #region Luồng 19: Health Information Exchange Workflow

    /// <summary>
    /// Workflow interface for Health Information Exchange - Luồng 19
    /// </summary>
    public interface IHealthExchangeWorkflowService
    {
        /// <summary>
        /// Process insurance XML submission
        /// </summary>
        Task<XMLSubmissionResult> ProcessXMLSubmissionAsync(
            string xmlType,
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// Process electronic referral
        /// </summary>
        Task<ReferralProcessResult> ProcessElectronicReferralAsync(
            Guid referralId,
            ReferralContext context);
    }

    public class XMLSubmissionResult
    {
        public bool Success { get; set; }
        public Guid SubmissionId { get; set; }
        public int RecordCount { get; set; }
        public decimal ClaimAmount { get; set; }
        public int ValidationErrors { get; set; }
        public string BHXHTransactionId { get; set; }
    }

    public class ReferralContext
    {
        public string DestinationFacilityCode { get; set; }
        public string ClinicalSummary { get; set; }
        public List<Guid> AttachmentIds { get; set; }
    }

    public class ReferralProcessResult
    {
        public bool Success { get; set; }
        public string ReferralCode { get; set; }
        public bool SentToDestination { get; set; }
        public DateTime? ExpectedResponseDate { get; set; }
    }

    #endregion

    #region Luồng 20: Mass Casualty Incident Workflow

    /// <summary>
    /// Workflow interface for Mass Casualty Incident - Luồng 20
    /// </summary>
    public interface IMassCasualtyWorkflowService
    {
        /// <summary>
        /// Activate MCI response
        /// </summary>
        Task<MCIActivationResult> ActivateMCIResponseAsync(
            MCIActivationContext context);

        /// <summary>
        /// Process victim through triage
        /// </summary>
        Task<TriageResult> ProcessVictimTriageAsync(
            Guid victimId,
            TriageContext context);

        /// <summary>
        /// Deactivate MCI event
        /// </summary>
        Task<MCIDeactivationResult> DeactivateMCIAsync(
            Guid eventId,
            string reason);
    }

    public class MCIActivationContext
    {
        public string EventName { get; set; }
        public string EventType { get; set; }
        public string Location { get; set; }
        public string AlertLevel { get; set; }
        public int EstimatedCasualties { get; set; }
    }

    public class MCIActivationResult
    {
        public bool Success { get; set; }
        public Guid EventId { get; set; }
        public string EventCode { get; set; }
        public int StaffNotified { get; set; }
        public int BedsReserved { get; set; }
        public int ORsPrepared { get; set; }
    }

    public class TriageContext
    {
        public int RespiratoryRate { get; set; }
        public string Pulse { get; set; }
        public string MentalStatus { get; set; }
        public bool CanWalk { get; set; }
        public string ChiefComplaint { get; set; }
    }

    public class TriageResult
    {
        public bool Success { get; set; }
        public string TriageCategory { get; set; }
        public string AssignedArea { get; set; }
        public int QueuePosition { get; set; }
        public string RecommendedActions { get; set; }
    }

    public class MCIDeactivationResult
    {
        public bool Success { get; set; }
        public int TotalVictimsProcessed { get; set; }
        public int DurationHours { get; set; }
        public bool ReportGenerated { get; set; }
        public bool ReportedToAuthority { get; set; }
    }

    #endregion
}
