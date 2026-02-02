using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.HealthExchange
{
    #region Connection & Authentication DTOs

    /// <summary>
    /// Kết nối HIE
    /// </summary>
    public class HIEConnectionDto
    {
        public Guid Id { get; set; }
        public string ConnectionName { get; set; }
        public string ConnectionType { get; set; } // BHXH, HSSK, SoYTe, Partner
        public string Endpoint { get; set; }
        public string AuthMethod { get; set; } // OAuth2, APIKey, Certificate
        public bool IsActive { get; set; }
        public DateTime? LastSuccessfulConnection { get; set; }
        public string ConnectionStatus { get; set; } // Connected, Disconnected, Error
        public string ErrorMessage { get; set; }
        public int TotalTransactionsToday { get; set; }
        public int FailedTransactionsToday { get; set; }
    }

    /// <summary>
    /// Cấu hình kết nối HIE
    /// </summary>
    public class HIEConnectionConfigDto
    {
        public Guid Id { get; set; }
        public string ConnectionName { get; set; }
        public string ConnectionType { get; set; }
        public string Endpoint { get; set; }
        public string AuthMethod { get; set; }
        public string ClientId { get; set; }
        public string CertificatePath { get; set; }
        public int TimeoutSeconds { get; set; }
        public int RetryAttempts { get; set; }
        public bool EnableLogging { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Insurance (BHXH) Integration DTOs

    /// <summary>
    /// Kết quả tra cứu thẻ BHYT
    /// </summary>
    public class InsuranceCardLookupResultDto
    {
        public bool IsValid { get; set; }
        public string CardNumber { get; set; }
        public string PatientName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string Address { get; set; }

        // Insurance Details
        public string InsuranceProvider { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime EffectiveTo { get; set; }
        public string PatientType { get; set; } // 1-5
        public string RightRoute { get; set; } // Đúng tuyến
        public decimal CoveragePercent { get; set; }
        public bool Is5YearsContinuous { get; set; }

        // Facility
        public string RegisteredFacilityCode { get; set; }
        public string RegisteredFacilityName { get; set; }
        public string RegisteredProvince { get; set; }

        // Verification
        public string VerificationCode { get; set; }
        public DateTime VerifiedAt { get; set; }
        public string VerificationMessage { get; set; }

        // Warnings
        public List<string> Warnings { get; set; }
        public bool HasVisitToday { get; set; }
        public string TodayVisitFacility { get; set; }

        // Lookup Metadata
        public DateTime LookupTime { get; set; }
    }

    /// <summary>
    /// Gửi XML BHXH
    /// </summary>
    public class InsuranceXMLSubmissionDto
    {
        public Guid Id { get; set; }
        public string SubmissionCode { get; set; }
        public string XMLType { get; set; } // 4210, 130, 4750, 3176
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SubmissionDate { get; set; }
        public DateTime? GeneratedAt { get; set; }

        // Content
        public int RecordCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal InsuranceClaimAmount { get; set; }

        // Status
        public string Status { get; set; } // Draft, Submitted, Accepted, Rejected, PartiallyAccepted
        public DateTime? ProcessedAt { get; set; }
        public string BHXHTransactionId { get; set; }

        // Validation
        public bool IsValid { get; set; }
        public int ErrorCount { get; set; }
        public int WarningCount { get; set; }
        public List<XMLValidationErrorDto> Errors { get; set; }

        // Response
        public int AcceptedRecords { get; set; }
        public int RejectedRecords { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal RejectedAmount { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class XMLValidationErrorDto
    {
        public string RecordId { get; set; }
        public string PatientName { get; set; }
        public string FieldName { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorMessage { get; set; }
        public string Severity { get; set; } // Error, Warning
    }

    /// <summary>
    /// Kiểm tra giám định BHXH
    /// </summary>
    public class InsuranceAuditResultDto
    {
        public string SubmissionId { get; set; }
        public DateTime AuditDate { get; set; }
        public string AuditType { get; set; } // PreAudit, PostAudit

        public decimal SubmittedAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal RejectedAmount { get; set; }
        public decimal AdjustedAmount { get; set; }

        public List<InsuranceAuditFindingDto> Findings { get; set; }
    }

    public class InsuranceAuditFindingDto
    {
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string VisitCode { get; set; }
        public string FindingCode { get; set; }
        public string FindingDescription { get; set; }
        public decimal ClaimedAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal RejectedAmount { get; set; }
        public string Reason { get; set; }
    }

    #endregion

    #region Electronic Health Record Exchange DTOs

    /// <summary>
    /// Hồ sơ sức khỏe điện tử (HSSK quốc gia)
    /// </summary>
    public class ElectronicHealthRecordDto
    {
        public string EHRId { get; set; }
        public string PatientId { get; set; }
        public string FullName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string IdentityNumber { get; set; }
        public string InsuranceNumber { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }

        // Medical Summary
        public string BloodType { get; set; }
        public List<string> Allergies { get; set; }
        public List<string> ChronicConditions { get; set; }
        public List<EHRVaccinationDto> Vaccinations { get; set; }

        // Visit History
        public List<EHRVisitDto> RecentVisits { get; set; }

        // Current Medications
        public List<EHRMedicationDto> CurrentMedications { get; set; }

        // Consent
        public bool HasConsent { get; set; }
        public DateTime? ConsentDate { get; set; }
        public string ConsentScope { get; set; }

        public DateTime LastUpdated { get; set; }
    }

    public class EHRVisitDto
    {
        public string VisitId { get; set; }
        public DateTime VisitDate { get; set; }
        public string FacilityName { get; set; }
        public string FacilityCode { get; set; }
        public string VisitType { get; set; }
        public string Diagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public string TreatmentSummary { get; set; }
        public string DoctorName { get; set; }
    }

    public class EHRMedicationDto
    {
        public string DrugName { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string PrescribedBy { get; set; }
        public string FacilityName { get; set; }
    }

    public class EHRVaccinationDto
    {
        public string VaccineName { get; set; }
        public DateTime DateAdministered { get; set; }
        public string DoseNumber { get; set; }
        public string LotNumber { get; set; }
        public string FacilityName { get; set; }
    }

    /// <summary>
    /// Đồng ý chia sẻ HSSK
    /// </summary>
    public class PatientConsentDto
    {
        public Guid Id { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string ConsentType { get; set; } // FullAccess, LimitedAccess, NoAccess
        public string Scope { get; set; } // AllRecords, RecentOnly, SpecificTypes
        public List<string> AllowedFacilities { get; set; }
        public List<string> AllowedDataTypes { get; set; }
        public DateTime ConsentDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
        public string SignatureUrl { get; set; }
        public DateTime RecordedAt { get; set; }
        public DateTime? RevokedDate { get; set; }
        public string RevocationReason { get; set; }
    }

    #endregion

    #region Referral & Transfer DTOs

    /// <summary>
    /// Chuyển viện điện tử
    /// </summary>
    public class ElectronicReferralDto
    {
        public Guid Id { get; set; }
        public string ReferralCode { get; set; }
        public DateTime ReferralDate { get; set; }
        public DateTime CreatedAt { get; set; }

        // Patient
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string InsuranceNumber { get; set; }

        // Source
        public string SourceFacilityCode { get; set; }
        public string SourceFacilityName { get; set; }
        public string SourceDepartment { get; set; }
        public string ReferringDoctor { get; set; }
        public string ReferringDoctorLicense { get; set; }

        // Destination
        public string DestinationFacilityCode { get; set; }
        public string DestinationFacilityName { get; set; }
        public string DestinationDepartment { get; set; }

        // Clinical Info
        public string PrimaryDiagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public List<string> SecondaryDiagnoses { get; set; }
        public string ClinicalSummary { get; set; }
        public string TreatmentProvided { get; set; }
        public string CurrentMedications { get; set; }
        public string Allergies { get; set; }
        public string ReasonForReferral { get; set; }
        public string RequestedService { get; set; }

        // Attachments
        public List<ReferralAttachmentDto> Attachments { get; set; }

        // Status
        public string Status { get; set; } // Draft, Sent, Received, Accepted, Rejected
        public DateTime? SentAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public string ReceivedBy { get; set; }
        public string ResponseNotes { get; set; }

        // Transport
        public string TransportType { get; set; } // Self, Ambulance
        public bool RequiresEscort { get; set; }
        public string EscortNotes { get; set; }
    }

    public class ReferralAttachmentDto
    {
        public string AttachmentType { get; set; } // LabResult, Imaging, Summary, Other
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    /// <summary>
    /// Tạo chuyển viện điện tử
    /// </summary>
    public class CreateElectronicReferralDto
    {
        public Guid PatientId { get; set; }
        public Guid? AdmissionId { get; set; }
        public string DestinationFacilityCode { get; set; }
        public string DestinationDepartment { get; set; }
        public string PrimaryDiagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public string ClinicalSummary { get; set; }
        public string TreatmentProvided { get; set; }
        public string ReasonForReferral { get; set; }
        public string RequestedService { get; set; }
        public string TransportType { get; set; }
        public bool RequiresEscort { get; set; }
        public List<Guid> AttachmentIds { get; set; }
    }

    #endregion

    #region Teleconsultation DTOs

    /// <summary>
    /// Yêu cầu hội chẩn từ xa
    /// </summary>
    public class TeleconsultationRequestDto
    {
        public Guid Id { get; set; }
        public string RequestCode { get; set; }
        public DateTime RequestDate { get; set; }

        // Patient
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }

        // Requesting Facility
        public string RequestingFacilityCode { get; set; }
        public string RequestingFacilityName { get; set; }
        public string RequestingDoctor { get; set; }
        public string RequestingDoctorPhone { get; set; }

        // Consulting Facility
        public string ConsultingFacilityCode { get; set; }
        public string ConsultingFacilityName { get; set; }
        public string ConsultingSpecialty { get; set; }
        public string AssignedConsultant { get; set; }

        // Case Info
        public string Urgency { get; set; } // Routine, Urgent, Emergency
        public string ConsultationType { get; set; } // Diagnosis, Treatment, SecondOpinion
        public string PrimaryDiagnosis { get; set; }
        public string ClinicalQuestion { get; set; }
        public string PatientHistory { get; set; }
        public string CurrentTreatment { get; set; }
        public List<string> AttachedDocuments { get; set; }

        // Session
        public string SessionType { get; set; } // Async, Video
        public DateTime? ScheduledTime { get; set; }
        public string VideoRoomUrl { get; set; }

        // Response
        public string ConsultationNotes { get; set; }
        public string Recommendations { get; set; }
        public string FollowUpInstructions { get; set; }
        public DateTime? RespondedAt { get; set; }

        // Status
        public string Status { get; set; } // Pending, Scheduled, InProgress, Completed, Cancelled
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    /// <summary>
    /// Tạo yêu cầu hội chẩn
    /// </summary>
    public class CreateTeleconsultationDto
    {
        public Guid PatientId { get; set; }
        public string ConsultingFacilityCode { get; set; }
        public string ConsultingSpecialty { get; set; }
        public string Urgency { get; set; }
        public string ConsultationType { get; set; }
        public string PrimaryDiagnosis { get; set; }
        public string ClinicalQuestion { get; set; }
        public string PatientHistory { get; set; }
        public string CurrentTreatment { get; set; }
        public string SessionType { get; set; }
        public DateTime? PreferredTime { get; set; }
        public List<Guid> AttachmentIds { get; set; }
    }

    #endregion

    #region Reporting to Authorities DTOs

    /// <summary>
    /// Báo cáo Sở Y tế
    /// </summary>
    public class HealthAuthorityReportDto
    {
        public Guid Id { get; set; }
        public string ReportCode { get; set; }
        public string ReportType { get; set; } // Monthly, Quarterly, Annual, Adhoc
        public string ReportCategory { get; set; } // Activity, Disease, Financial, Incident
        public DateTime ReportPeriodFrom { get; set; }
        public DateTime ReportPeriodTo { get; set; }

        // Content
        public string ReportData { get; set; } // JSON data
        public string ReportFormat { get; set; } // XML, JSON, PDF

        // Submission
        public string SubmissionEndpoint { get; set; }
        public string Status { get; set; } // Draft, Submitted, Accepted, Rejected
        public DateTime? SubmittedAt { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string SubmissionTransactionId { get; set; }
        public string ResponseMessage { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Báo cáo bệnh truyền nhiễm
    /// </summary>
    public class InfectiousDiseaseReportDto
    {
        public Guid Id { get; set; }
        public string ReportCode { get; set; }
        public DateTime ReportDate { get; set; }

        // Patient Info
        public string PatientName { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }
        public string PatientAddress { get; set; }
        public string PatientPhone { get; set; }

        // Disease Info
        public string DiseaseCode { get; set; } // ICD-10
        public string DiseaseName { get; set; }
        public string DiseaseGroup { get; set; } // A, B, C
        public DateTime OnsetDate { get; set; }
        public DateTime? DiagnosisDate { get; set; }
        public string DiagnosisMethod { get; set; } // Clinical, Lab
        public string LabConfirmation { get; set; }

        // Epidemiological
        public string ProbableSource { get; set; }
        public string ExposureLocation { get; set; }
        public List<string> CloseContacts { get; set; }
        public string TravelHistory { get; set; }

        // Outcome
        public string Outcome { get; set; } // Recovered, Hospitalized, Deceased
        public DateTime? OutcomeDate { get; set; }

        // Submission
        public string Status { get; set; } // Draft, Submitted
        public DateTime? SubmittedAt { get; set; }
        public string SubmittedTo { get; set; } // CDC, SoYTe

        public string ReportedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard HIE
    /// </summary>
    public class HIEDashboardDto
    {
        public DateTime Date { get; set; }

        // Connections Summary
        public int TotalConnections { get; set; }
        public int ActiveConnections { get; set; }

        // Connections Detail
        public List<HIEConnectionDto> Connections { get; set; }

        // This Month Stats
        public int XMLSubmissionsThisMonth { get; set; }
        public int PendingReferrals { get; set; }
        public int PendingTeleconsultations { get; set; }

        // Today's Transactions
        public int InsuranceLookupsToday { get; set; }
        public int SuccessfulLookups { get; set; }
        public int FailedLookups { get; set; }

        // XML Submissions
        public int PendingSubmissions { get; set; }
        public int SubmittedThisMonth { get; set; }
        public decimal ClaimedAmountThisMonth { get; set; }
        public decimal ApprovedAmountThisMonth { get; set; }

        // Referrals
        public int OutgoingReferrals { get; set; }
        public int IncomingReferrals { get; set; }
        public int PendingReferralResponses { get; set; }

        // Teleconsultation
        public int ActiveTeleconsultations { get; set; }
        public int PendingRequests { get; set; }
        public int CompletedThisMonth { get; set; }

        // EHR
        public int EHRUpdatesToday { get; set; }
        public int ActiveConsents { get; set; }

        // Alerts
        public List<HIEAlertDto> Alerts { get; set; }
    }

    public class HIEAlertDto
    {
        public string AlertType { get; set; }
        public string Severity { get; set; }
        public string Message { get; set; }
        public string ConnectionName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
