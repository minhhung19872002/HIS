namespace HIS.Application.DTOs;

// ============ EmrShare (B.1.2) ============
public class EmrShareDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public string SharedByUserId { get; set; } = string.Empty;
    public string? SharedByUserName { get; set; }
    public string? SharedToUserId { get; set; }
    public string? SharedToUserName { get; set; }
    public Guid? SharedToDepartmentId { get; set; }
    public string? SharedToDepartmentName { get; set; }
    public int ShareType { get; set; } // 1=WholeRecord, 2=IndividualForm
    public string? FormType { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int AccessCount { get; set; }
    public bool IsRevoked { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateEmrShareDto
{
    public Guid ExaminationId { get; set; }
    public string? SharedToUserId { get; set; }
    public Guid? SharedToDepartmentId { get; set; }
    public int ShareType { get; set; } = 1;
    public string? FormType { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Note { get; set; }
}

public class EmrShareAccessLogDto
{
    public Guid Id { get; set; }
    public Guid EmrShareId { get; set; }
    public string AccessedByUserId { get; set; } = string.Empty;
    public string? AccessedByUserName { get; set; }
    public DateTime AccessedAt { get; set; }
    public string Action { get; set; } = string.Empty;
}

// ============ EmrExtract (B.1.3) ============
public class EmrExtractDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string ExtractedByUserId { get; set; } = string.Empty;
    public string? ExtractedByUserName { get; set; }
    public int ExtractType { get; set; } // 1=Full, 2=Partial
    public string? FormTypes { get; set; }
    public string WatermarkText { get; set; } = string.Empty;
    public string AccessCode { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public int AccessCount { get; set; }
    public int MaxAccessCount { get; set; }
    public bool IsRevoked { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateEmrExtractDto
{
    public Guid ExaminationId { get; set; }
    public int ExtractType { get; set; } = 1;
    public string? FormTypes { get; set; }
    public int MaxAccessCount { get; set; } = 5;
    public DateTime? ExpiresAt { get; set; }
    public string? Note { get; set; }
}

// ============ EmrSpine (B.1.5) ============
public class EmrSpineDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public List<EmrSpineSectionDto> Sections { get; set; } = new();
}

public class EmrSpineSectionDto
{
    public Guid Id { get; set; }
    public Guid EmrSpineId { get; set; }
    public string FormType { get; set; } = string.Empty;
    public string FormName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsRequired { get; set; }
    public bool IsActive { get; set; }
}

public class SaveEmrSpineDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public List<EmrSpineSectionDto> Sections { get; set; } = new();
}

// ============ PatientSignature (B.1.7) ============
public class PatientSignatureDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public Guid? ExaminationId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string SignatureData { get; set; } = string.Empty;
    public DateTime SignedAt { get; set; }
    public string? DeviceInfo { get; set; }
    public string? IpAddress { get; set; }
    public string? VerificationCode { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePatientSignatureDto
{
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string SignatureData { get; set; } = string.Empty;
    public string? DeviceInfo { get; set; }
    public string? IpAddress { get; set; }
}

// ============ DocumentLock (B.1.11) ============
public class DocumentLockDto
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string LockedByUserId { get; set; } = string.Empty;
    public string? LockedByUserName { get; set; }
    public DateTime LockedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}

public class AcquireLockDto
{
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public int? LockDurationMinutes { get; set; } // default 10
}

// ============ EmrDataTag (B.1.13) ============
public class EmrDataTagDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DataType { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public string? Category { get; set; }
    public string? FormType { get; set; }
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
}

public class SaveEmrDataTagDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DataType { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public string? Category { get; set; }
    public string? FormType { get; set; }
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
}

// ============ EmrImage (B.1.20) ============
public class EmrImageDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ImageData { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public string? UploadedByUserName { get; set; }
    public string? Tags { get; set; }
    public string? Annotations { get; set; }
    public bool IsShared { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveEmrImageDto
{
    public Guid? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ImageData { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Tags { get; set; }
    public string? Annotations { get; set; }
    public bool IsShared { get; set; }
    public bool IsActive { get; set; } = true;
}

// ============ Shortcode (B.1.22) ============
public class ShortcodeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string FullText { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public bool IsGlobal { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

public class SaveShortcodeDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string FullText { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? UserId { get; set; }
    public bool IsGlobal { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// ============ EmrAutoCheckRule (B.1.25) ============
public class EmrAutoCheckRuleDto
{
    public Guid Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string? FormType { get; set; }
    public string? FieldName { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int Severity { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class SaveEmrAutoCheckRuleDto
{
    public Guid? Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string? FormType { get; set; }
    public string? FieldName { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int Severity { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class EmrAutoCheckResultDto
{
    public Guid ExaminationId { get; set; }
    public DateTime CheckedAt { get; set; }
    public int TotalRules { get; set; }
    public int PassedRules { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }
    public bool IsComplete => ErrorCount == 0;
    public List<EmrAutoCheckViolationDto> Violations { get; set; } = new();
}

public class EmrAutoCheckViolationDto
{
    public Guid RuleId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string? FormType { get; set; }
    public string? FieldName { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int Severity { get; set; } // 1=Warning, 2=Error
}

// ============ EmrCloseLog (B.2.5) ============
public class EmrCloseLogDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public string ClosedByUserId { get; set; } = string.Empty;
    public string? ClosedByUserName { get; set; }
    public DateTime ClosedAt { get; set; }
    public int Status { get; set; } // 1=Closed, 2=Reopened, 3=Archived
    public string? ValidationErrors { get; set; }
    public string? Note { get; set; }
}

public class CloseEmrDto
{
    public Guid ExaminationId { get; set; }
    public string? Note { get; set; }
}

public class EmrCloseValidationResultDto
{
    public Guid ExaminationId { get; set; }
    public bool CanClose { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }
    public List<EmrAutoCheckViolationDto> Violations { get; set; } = new();
}

// ============ Data Recovery (B.2.4) ============
public class DeletedRecordDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}

public class RestoreRecordDto
{
    public string EntityType { get; set; } = string.Empty;
    public Guid RecordId { get; set; }
}
