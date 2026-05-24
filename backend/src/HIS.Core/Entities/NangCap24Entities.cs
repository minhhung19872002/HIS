namespace HIS.Core.Entities;

// ============================================================
// NangCap24 - HSMT BV Đa khoa
// ============================================================
// Gap #2: WebAuthn biometric signature
// Gap #3: BHXH Inspection Portal
// Gap #5: Cloud sync EMR
// Gap #6: DICOM auto-send + transmission log
// Gap #8: HL7 message retry queue
// Gap #9: Per-study DICOM audit log
// ============================================================

/// <summary>
/// Gap #2 — WebAuthn credential cho bệnh nhân ký HSBA sinh trắc học.
/// CredentialId + PublicKey (CBOR/COSE) lưu theo chuẩn FIDO2.
/// </summary>
public class BiometricCredential : BaseEntity
{
    public Guid PatientId { get; set; }
    public string CredentialId { get; set; } = string.Empty;  // base64url
    public string PublicKey { get; set; } = string.Empty;     // base64url COSE key
    public string UserHandle { get; set; } = string.Empty;    // base64url user handle
    public uint SignatureCounter { get; set; }
    public string? AaGuid { get; set; }                       // Authenticator AAGUID
    public string OwnerType { get; set; } = "patient";        // patient | family
    public string? OwnerName { get; set; }                    // Tên người (BN hoặc người nhà)
    public string? DeviceName { get; set; }                   // VD: "Vân tay Touch ID iPhone"
    public string Status { get; set; } = "active";            // active | revoked
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public int UsageCount { get; set; }
}

/// <summary>
/// Gap #2 — Log mỗi lần ký bằng vân tay (audit + pháp lý).
/// </summary>
public class BiometricSignatureLog : BaseEntity
{
    public Guid CredentialId { get; set; }    // FK -> BiometricCredential
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public string DocumentType { get; set; } = string.Empty;  // VD: "cam_ket_pt"
    public string DocumentRef { get; set; } = string.Empty;   // FK chính của document
    public string ChallengeBase64 { get; set; } = string.Empty;
    public string ClientDataJsonBase64 { get; set; } = string.Empty;
    public string AuthenticatorDataBase64 { get; set; } = string.Empty;
    public string SignatureBase64 { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public string? VerifyError { get; set; }
    public DateTime SignedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? MachineName { get; set; }
}

/// <summary>
/// Gap #3 — Tài khoản giám định viên BHXH login vào cổng tra cứu HSBA.
/// Tách biệt khỏi Users (User table) vì khác role + privacy.
/// </summary>
public class BhxhInspectorAccount : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BhxhCode { get; set; }                     // Mã giám định viên BHXH
    public string? Province { get; set; }                     // Tỉnh thuộc BHXH
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public int LoginFailCount { get; set; }
    public DateTime? LockedUntil { get; set; }
}

/// <summary>
/// Gap #3 — Phiên truy cập HSBA của giám định viên (audit cho BHXH).
/// </summary>
public class BhxhInspectorAccessLog : BaseEntity
{
    public Guid InspectorAccountId { get; set; }
    public string Action { get; set; } = string.Empty;        // login | view_record | download_xml | search
    public Guid? MedicalRecordId { get; set; }
    public string? ActionDetails { get; set; }
    public string? IpAddress { get; set; }
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Gap #5 — Log đồng bộ HSBA lên Cloud (Cloudflare R2) + máy chủ dự phòng.
/// </summary>
public class EmrCloudSyncLog : BaseEntity
{
    public Guid MedicalRecordId { get; set; }
    public string FileType { get; set; } = string.Empty;      // signed_xml | hl7 | pdf | dicom_zip
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }                     // SHA-256 hex
    public string Destination { get; set; } = string.Empty;   // r2_primary | r2_dr | local_backup
    public string? RemotePath { get; set; }                   // VD: emr/2026/05/24/xxx.xml
    public string Status { get; set; } = "pending";           // pending | uploading | done | failed
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int RetryCount { get; set; }
    public DateTime? LastRetryAt { get; set; }
}

/// <summary>
/// Gap #6 — Cấu hình tự động gửi DICOM sang server PACS khác (rule-based).
/// VD: "Auto gửi tất cả ca CT từ CT-Toshiba sang Cloud-PACS"
/// </summary>
public class DicomAutoSendRule : BaseEntity
{
    public string RuleName { get; set; } = string.Empty;
    public string? Modality { get; set; }                     // CT | MR | CR | DX | US | XA | MG | null (all)
    public string? SourceAeTitle { get; set; }                // Filter theo modality AET
    public string? DepartmentCode { get; set; }
    public Guid DestinationServerId { get; set; }             // FK -> RemotePacsServer
    public bool EncryptBeforeSend { get; set; }
    public string? EncryptionKeyId { get; set; }              // Reference đến KeyVault entry
    public string TriggerType { get; set; } = "on_arrival";   // on_arrival | scheduled | manual
    public string? ScheduleCron { get; set; }                 // Khi TriggerType=scheduled
    public int Priority { get; set; } = 5;                    // 1-10, thấp = ưu tiên cao
    public bool IsActive { get; set; } = true;
    public DateTime? LastTriggeredAt { get; set; }
    public int TimesTriggered { get; set; }
}

/// <summary>
/// Gap #6 — Log mỗi lần truyền DICOM (manual + auto-send) cho thống kê.
/// </summary>
public class DicomTransmissionLog : BaseEntity
{
    public string StudyInstanceUid { get; set; } = string.Empty;
    public Guid? DicomStudyId { get; set; }                   // FK nội bộ
    public Guid? AutoSendRuleId { get; set; }                 // null = manual
    public Guid DestinationServerId { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public string TriggerType { get; set; } = "manual";       // manual | auto | scheduled
    public int InstanceCount { get; set; }
    public long TotalBytes { get; set; }
    public bool WasEncrypted { get; set; }
    public string? EncryptionAlgorithm { get; set; }          // AES-256-GCM
    public string Status { get; set; } = "pending";           // pending | sending | done | failed
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int DurationMs { get; set; }
    public Guid? TriggeredByUserId { get; set; }              // null = system auto
}

/// <summary>
/// Gap #8 — Queue HL7 message giữa RIS/LIS/HIS cho retry.
/// </summary>
public class Hl7MessageQueue : BaseEntity
{
    public string Direction { get; set; } = string.Empty;     // outbound | inbound
    public string SourceSystem { get; set; } = string.Empty;  // HIS | RIS | LIS | PACS
    public string TargetSystem { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;   // ADT^A04 | ORM^O01 | ORU^R01 | MDM^T02
    public string MessageControlId { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;       // Full HL7 message
    public string Status { get; set; } = "pending";           // pending | sending | sent | failed | acked | retrying
    public int RetryCount { get; set; }
    public int MaxRetries { get; set; } = 5;
    public string? AckMessage { get; set; }                   // ACK/NACK response
    public string? ErrorMessage { get; set; }
    public DateTime? FirstTryAt { get; set; }
    public DateTime? LastTryAt { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public DateTime? AckedAt { get; set; }
    public Guid? RelatedRecordId { get; set; }                // MedicalRecord/ServiceRequest liên quan
    public string? Endpoint { get; set; }                     // TCP/HTTP endpoint
}

/// <summary>
/// Gap #9 — Log audit per-DICOM-study (granular hơn AuditLog chung).
/// Theo NangCap24 RIS 1.11 - log từng hoạt động trên 1 ca chụp.
/// </summary>
public class DicomStudyActivityLog : BaseEntity
{
    public string StudyInstanceUid { get; set; } = string.Empty;
    public Guid? DicomStudyId { get; set; }                   // FK nội bộ
    public Guid? RadiologyRequestId { get; set; }
    public string Action { get; set; } = string.Empty;
    // Action enum: created_from_his | received_from_modality | viewed | result_drafted |
    //              result_modified | result_approved | result_rejected | result_printed |
    //              study_info_modified | matched_to_request | unmatched | cancelled |
    //              restored | shared | exported_zip | sent_to_remote
    public string? ActionDetails { get; set; }                // JSON: what changed
    public Guid? PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public string? MachineName { get; set; }
    public string? IpAddress { get; set; }
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
    public string? RelatedReportId { get; set; }              // Report version liên quan
}
