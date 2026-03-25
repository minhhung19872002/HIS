using HIS.Application.DTOs;

namespace HIS.Application.Interfaces;

public interface IEmrManagementService
{
    // ============ Sharing (B.1.2) ============
    Task<List<EmrShareDto>> GetSharesAsync(Guid? examinationId = null, string? userId = null);
    Task<EmrShareDto> CreateShareAsync(CreateEmrShareDto dto);
    Task<bool> RevokeShareAsync(Guid shareId);
    Task<List<EmrShareAccessLogDto>> GetShareAccessLogsAsync(Guid shareId);
    Task<bool> ValidateShareAccessAsync(Guid shareId, string userId);

    // ============ Extract (B.1.3) ============
    Task<List<EmrExtractDto>> GetExtractsAsync(Guid? examinationId = null, string? userId = null);
    Task<EmrExtractDto> CreateExtractAsync(CreateEmrExtractDto dto);
    Task<bool> RevokeExtractAsync(Guid extractId);
    Task<bool> ValidateExtractAccessAsync(string accessCode);

    // ============ Spine (B.1.5) ============
    Task<List<EmrSpineDto>> GetSpinesAsync(string? keyword = null);
    Task<EmrSpineDto> SaveSpineAsync(SaveEmrSpineDto dto);
    Task<bool> DeleteSpineAsync(Guid id);

    // ============ Patient Signature (B.1.7) ============
    Task<List<PatientSignatureDto>> GetSignaturesAsync(Guid? patientId = null, Guid? examinationId = null);
    Task<PatientSignatureDto> CreateSignatureAsync(CreatePatientSignatureDto dto);
    Task<bool> VerifySignatureAsync(Guid signatureId, string verificationCode);

    // ============ Document Lock (B.1.11) ============
    Task<DocumentLockDto?> AcquireLockAsync(AcquireLockDto dto);
    Task<bool> ReleaseLockAsync(Guid lockId);
    Task<DocumentLockDto?> GetLockStatusAsync(string documentType, Guid documentId);
    Task<bool> ForceReleaseLockAsync(Guid lockId);

    // ============ Data Tags (B.1.13) ============
    Task<List<EmrDataTagDto>> GetDataTagsAsync(string? keyword = null, string? category = null, string? formType = null);
    Task<EmrDataTagDto> SaveDataTagAsync(SaveEmrDataTagDto dto);
    Task<bool> DeleteDataTagAsync(Guid id);

    // ============ Images (B.1.20) ============
    Task<List<EmrImageDto>> GetImagesAsync(string? keyword = null, string? category = null, Guid? departmentId = null);
    Task<EmrImageDto> SaveImageAsync(SaveEmrImageDto dto);
    Task<bool> DeleteImageAsync(Guid id);

    // ============ Shortcodes (B.1.22) ============
    Task<List<ShortcodeDto>> GetShortcodesAsync(string? keyword = null, string? category = null, Guid? departmentId = null, string? userId = null);
    Task<ShortcodeDto> SaveShortcodeAsync(SaveShortcodeDto dto);
    Task<bool> DeleteShortcodeAsync(Guid id);
    Task<string?> ExpandShortcodeAsync(string code, string? userId = null, Guid? departmentId = null);

    // ============ Auto Check (B.1.25) ============
    Task<List<EmrAutoCheckRuleDto>> GetRulesAsync(string? ruleType = null);
    Task<EmrAutoCheckRuleDto> SaveRuleAsync(SaveEmrAutoCheckRuleDto dto);
    Task<bool> DeleteRuleAsync(Guid id);
    Task<EmrAutoCheckResultDto> RunAutoCheckAsync(Guid examinationId);

    // ============ Close EMR (B.2.5) ============
    Task<EmrCloseValidationResultDto> CloseEmrAsync(CloseEmrDto dto);
    Task<bool> ReopenEmrAsync(Guid examinationId, string? note = null);
    Task<List<EmrCloseLogDto>> GetCloseLogsAsync(Guid? examinationId = null);

    // ============ Data Recovery (B.2.4) ============
    Task<List<DeletedRecordDto>> GetDeletedRecordsAsync(string entityType);
    Task<bool> RestoreRecordAsync(RestoreRecordDto dto);
}
