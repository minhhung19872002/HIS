namespace HIS.Application.DTOs.NangCap24;

// ============================================================
// Gap #2 - WebAuthn biometric signature DTOs
// ============================================================

public class BiometricRegisterBeginDto
{
    public Guid PatientId { get; set; }
    public string OwnerType { get; set; } = "patient";
    public string? OwnerName { get; set; }
    public string? DeviceName { get; set; }
}

public class BiometricRegisterBeginResponseDto
{
    public string Challenge { get; set; } = string.Empty;     // base64url
    public string UserHandle { get; set; } = string.Empty;    // base64url
    public string RpId { get; set; } = string.Empty;
    public string RpName { get; set; } = "HIS Bệnh viện";
    public string UserName { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
}

public class BiometricRegisterFinishDto
{
    public Guid PatientId { get; set; }
    public string OwnerType { get; set; } = "patient";
    public string? OwnerName { get; set; }
    public string? DeviceName { get; set; }
    public string CredentialId { get; set; } = string.Empty;        // base64url
    public string PublicKey { get; set; } = string.Empty;           // base64url
    public string UserHandle { get; set; } = string.Empty;
    public string? AaGuid { get; set; }
    public string ClientDataJson { get; set; } = string.Empty;
    public string AttestationObject { get; set; } = string.Empty;
}

public class BiometricCredentialDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string CredentialId { get; set; } = string.Empty;
    public string OwnerType { get; set; } = string.Empty;
    public string? OwnerName { get; set; }
    public string? DeviceName { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime EnrolledAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public int UsageCount { get; set; }
}

public class BiometricSignBeginDto
{
    public Guid PatientId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentRef { get; set; } = string.Empty;
    public string? OwnerType { get; set; }     // null = both patient and family
}

public class BiometricSignBeginResponseDto
{
    public string Challenge { get; set; } = string.Empty;
    public string RpId { get; set; } = string.Empty;
    public List<BiometricAllowedCredentialDto> AllowCredentials { get; set; } = new();
}

public class BiometricAllowedCredentialDto
{
    public string CredentialId { get; set; } = string.Empty;
    public string? OwnerName { get; set; }
    public string? DeviceName { get; set; }
}

public class BiometricSignFinishDto
{
    public Guid PatientId { get; set; }
    public string CredentialId { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentRef { get; set; } = string.Empty;
    public string Challenge { get; set; } = string.Empty;
    public string ClientDataJson { get; set; } = string.Empty;
    public string AuthenticatorData { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
}

public class BiometricSignFinishResponseDto
{
    public Guid SignatureLogId { get; set; }
    public bool IsVerified { get; set; }
    public string? Error { get; set; }
    public DateTime SignedAt { get; set; }
    public string SignerName { get; set; } = string.Empty;
}

// ============================================================
// Gap #3 - BHXH Inspection Portal DTOs
// ============================================================

public class InspectorLoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class InspectorLoginResponseDto
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? Message { get; set; }
    public InspectorAccountDto? Inspector { get; set; }
}

public class InspectorAccountDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? BhxhCode { get; set; }
    public string? Province { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class InspectorCreateDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BhxhCode { get; set; }
    public string? Province { get; set; }
}

public class InspectorSearchRecordDto
{
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? DepartmentCode { get; set; }
    public string? InsuranceNumber { get; set; }
    public int? TreatmentType { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class InspectorRecordListItemDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? InsuranceNumber { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public string? Diagnosis { get; set; }
    public int TreatmentType { get; set; }
    public string TreatmentTypeName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public bool HasSignedXml { get; set; }
}

public class InspectorRecordSearchResultDto
{
    public List<InspectorRecordListItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class InspectorRecordDetailDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime PatientDob { get; set; }
    public string? PatientGender { get; set; }
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public string? AdmissionDiagnosis { get; set; }
    public string? FinalDiagnosis { get; set; }
    public List<InspectorRecordFileDto> Files { get; set; } = new();
    public List<InspectorRecordServiceDto> Services { get; set; } = new();
    public List<InspectorRecordMedicineDto> Medicines { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal BhytAmount { get; set; }
    public decimal CoPayAmount { get; set; }
}

public class InspectorRecordFileDto
{
    public string FileType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
}

public class InspectorRecordServiceDto
{
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Status { get; set; }
}

public class InspectorRecordMedicineDto
{
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? Concentration { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}

// ============================================================
// Gap #4 - HL7 EMR archive DTOs
// ============================================================

public class Hl7ExportRequestDto
{
    public Guid MedicalRecordId { get; set; }
    public bool IncludeServices { get; set; } = true;
    public bool IncludePrescriptions { get; set; } = true;
    public bool IncludeLabResults { get; set; } = true;
    public bool IncludeRadiologyReports { get; set; } = true;
}

public class Hl7ExportResponseDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public string Hl7Content { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int MessageCount { get; set; }
    public long ContentSizeBytes { get; set; }
    public DateTime GeneratedAt { get; set; }
}

// ============================================================
// Gap #5 - EMR Cloud sync DTOs
// ============================================================

public class EmrCloudSyncRequestDto
{
    public Guid MedicalRecordId { get; set; }
    public List<string> FileTypes { get; set; } = new() { "signed_xml", "hl7", "pdf" };
    public bool SyncToDr { get; set; } = true;     // Đồng bộ sang DR server
}

public class EmrCloudSyncResponseDto
{
    public Guid MedicalRecordId { get; set; }
    public int TotalFiles { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<EmrCloudSyncLogDto> Logs { get; set; } = new();
}

public class EmrCloudSyncLogDto
{
    public Guid Id { get; set; }
    public Guid MedicalRecordId { get; set; }
    public string FileType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string? RemotePath { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int RetryCount { get; set; }
}

public class EmrCloudSyncStatusDto
{
    public int TotalRecordsTracked { get; set; }
    public int FullySyncedCount { get; set; }
    public int PartialSyncedCount { get; set; }
    public int FailedSyncCount { get; set; }
    public DateTime? LastSyncAt { get; set; }
}

// ============================================================
// Gap #6 - DICOM auto-send rules + transmission stats DTOs
// ============================================================

public class DicomAutoSendRuleDto
{
    public Guid Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string? Modality { get; set; }
    public string? SourceAeTitle { get; set; }
    public string? DepartmentCode { get; set; }
    public Guid DestinationServerId { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public bool EncryptBeforeSend { get; set; }
    public string TriggerType { get; set; } = string.Empty;
    public string? ScheduleCron { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public int TimesTriggered { get; set; }
}

public class DicomAutoSendRuleCreateDto
{
    public string RuleName { get; set; } = string.Empty;
    public string? Modality { get; set; }
    public string? SourceAeTitle { get; set; }
    public string? DepartmentCode { get; set; }
    public Guid DestinationServerId { get; set; }
    public bool EncryptBeforeSend { get; set; } = true;
    public string TriggerType { get; set; } = "on_arrival";
    public string? ScheduleCron { get; set; }
    public int Priority { get; set; } = 5;
    public bool IsActive { get; set; } = true;
}

public class DicomTransmissionLogDto
{
    public Guid Id { get; set; }
    public string StudyInstanceUid { get; set; } = string.Empty;
    public Guid? AutoSendRuleId { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public string TriggerType { get; set; } = string.Empty;
    public int InstanceCount { get; set; }
    public long TotalBytes { get; set; }
    public bool WasEncrypted { get; set; }
    public string? EncryptionAlgorithm { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int DurationMs { get; set; }
    public string? TriggeredByUserName { get; set; }
}

public class DicomTransmissionStatsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalTransmissions { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public long TotalBytesSent { get; set; }
    public int EncryptedCount { get; set; }
    public List<DicomTransmissionDestStatDto> ByDestination { get; set; } = new();
    public List<DicomTransmissionDailyDto> ByDay { get; set; } = new();
}

public class DicomTransmissionDestStatDto
{
    public string DestinationName { get; set; } = string.Empty;
    public int Count { get; set; }
    public long Bytes { get; set; }
}

public class DicomTransmissionDailyDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public long Bytes { get; set; }
}

public class DicomSendRequestDto
{
    public string StudyInstanceUid { get; set; } = string.Empty;
    public Guid DestinationServerId { get; set; }
    public bool Encrypt { get; set; } = false;
}

// ============================================================
// Gap #8 - HL7 message retry queue DTOs
// ============================================================

public class Hl7MessageQueueDto
{
    public Guid Id { get; set; }
    public string Direction { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = string.Empty;
    public string TargetSystem { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string MessageControlId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int RetryCount { get; set; }
    public int MaxRetries { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? FirstTryAt { get; set; }
    public DateTime? LastTryAt { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public DateTime? AckedAt { get; set; }
    public string? Endpoint { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Payload { get; set; }                      // null trừ khi xem detail
}

public class Hl7QueueSearchDto
{
    public string? Status { get; set; }
    public string? Direction { get; set; }
    public string? SourceSystem { get; set; }
    public string? MessageType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class Hl7QueueSearchResultDto
{
    public List<Hl7MessageQueueDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PendingCount { get; set; }
    public int FailedCount { get; set; }
    public int AckedCount { get; set; }
}

public class Hl7RetryResultDto
{
    public int Retried { get; set; }
    public int SucceededImmediately { get; set; }
    public int StillFailed { get; set; }
}

// ============================================================
// Gap #9 - Per-study DICOM activity audit log DTOs
// ============================================================

public class DicomStudyActivityLogDto
{
    public Guid Id { get; set; }
    public string StudyInstanceUid { get; set; } = string.Empty;
    public Guid? RadiologyRequestId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string? ActionDetails { get; set; }
    public string? PerformedByName { get; set; }
    public string? MachineName { get; set; }
    public string? IpAddress { get; set; }
    public DateTime PerformedAt { get; set; }
    public string? RelatedReportId { get; set; }
}

public class DicomStudyActivityLogSearchDto
{
    public string? StudyInstanceUid { get; set; }
    public Guid? RadiologyRequestId { get; set; }
    public string? Action { get; set; }
    public Guid? UserId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 30;
}

public class DicomStudyActivityLogSearchResultDto
{
    public List<DicomStudyActivityLogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
}
