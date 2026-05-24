using HIS.Application.DTOs.NangCap24;

namespace HIS.Application.Services;

// ============================================================
// Gap #2 - WebAuthn biometric signature
// ============================================================
public interface IBiometricSignatureService
{
    Task<BiometricRegisterBeginResponseDto> BeginRegisterAsync(BiometricRegisterBeginDto dto);
    Task<BiometricCredentialDto> FinishRegisterAsync(BiometricRegisterFinishDto dto, Guid userId);
    Task<List<BiometricCredentialDto>> ListCredentialsAsync(Guid patientId);
    Task RevokeCredentialAsync(Guid credentialId, Guid userId);
    Task<BiometricSignBeginResponseDto> BeginSignAsync(BiometricSignBeginDto dto);
    Task<BiometricSignFinishResponseDto> FinishSignAsync(BiometricSignFinishDto dto, string? ipAddress);
}

// ============================================================
// Gap #3 - BHXH Inspector portal
// ============================================================
public interface IBhxhInspectorService
{
    Task<InspectorLoginResponseDto> LoginAsync(InspectorLoginDto dto, string ipAddress);
    Task<List<InspectorAccountDto>> ListAccountsAsync();
    Task<InspectorAccountDto> CreateAccountAsync(InspectorCreateDto dto, Guid adminUserId);
    Task UpdateAccountActiveAsync(Guid id, bool isActive, Guid adminUserId);
    Task ResetPasswordAsync(Guid id, string newPassword, Guid adminUserId);
    Task<InspectorRecordSearchResultDto> SearchRecordsAsync(InspectorSearchRecordDto dto, Guid inspectorId, string? ipAddress);
    Task<InspectorRecordDetailDto?> GetRecordDetailAsync(Guid medicalRecordId, Guid inspectorId, string? ipAddress);
    Task<byte[]?> DownloadSignedXmlAsync(Guid medicalRecordId, Guid inspectorId, string? ipAddress);
}

// ============================================================
// Gap #4 - HL7 v2 EMR archive
// ============================================================
public interface IEmrHl7ArchiveService
{
    Task<Hl7ExportResponseDto> GenerateAsync(Hl7ExportRequestDto request);
}

// ============================================================
// Gap #5 - EMR Cloud sync
// ============================================================
public interface IEmrCloudSyncService
{
    Task<EmrCloudSyncResponseDto> SyncRecordAsync(EmrCloudSyncRequestDto request, Guid userId);
    Task<List<EmrCloudSyncLogDto>> GetLogsAsync(Guid? medicalRecordId, string? status, int pageIndex, int pageSize);
    Task<EmrCloudSyncStatusDto> GetStatusAsync();
    Task<int> RetryFailedAsync(Guid userId);
}

// ============================================================
// Gap #6 - DICOM auto-send + transmission stats
// ============================================================
public interface IDicomAutoSendService
{
    Task<List<DicomAutoSendRuleDto>> ListRulesAsync();
    Task<DicomAutoSendRuleDto> CreateRuleAsync(DicomAutoSendRuleCreateDto dto, Guid userId);
    Task<DicomAutoSendRuleDto> UpdateRuleAsync(Guid id, DicomAutoSendRuleCreateDto dto, Guid userId);
    Task DeleteRuleAsync(Guid id, Guid userId);
    Task<DicomTransmissionLogDto> SendStudyAsync(DicomSendRequestDto dto, Guid userId);
    Task<List<DicomTransmissionLogDto>> SearchTransmissionsAsync(DateTime? from, DateTime? to, string? status, int pageIndex, int pageSize);
    Task<DicomTransmissionStatsDto> GetStatsAsync(DateTime from, DateTime to);
    Task<int> TriggerAutoSendCheckAsync();    // Quét và áp dụng rules
}

// ============================================================
// Gap #8 - HL7 message retry queue
// ============================================================
public interface IHl7QueueService
{
    Task<Hl7MessageQueueDto> EnqueueAsync(string direction, string source, string target,
        string messageType, string controlId, string payload, string? endpoint, Guid? relatedRecordId);
    Task<Hl7QueueSearchResultDto> SearchAsync(Hl7QueueSearchDto dto);
    Task<Hl7MessageQueueDto?> GetByIdAsync(Guid id);
    Task<Hl7MessageQueueDto> RetryAsync(Guid id, Guid userId);
    Task<Hl7RetryResultDto> RetryAllFailedAsync(Guid userId);
    Task<int> ProcessPendingAsync();   // Background worker dùng
}

// ============================================================
// Gap #9 - Per-study DICOM activity audit log
// ============================================================
public interface IDicomStudyActivityService
{
    Task LogAsync(string studyUid, string action, Guid? requestId, Guid? userId,
        string? userName, string? actionDetails, string? machineName, string? ipAddress, string? relatedReportId);
    Task<DicomStudyActivityLogSearchResultDto> SearchAsync(DicomStudyActivityLogSearchDto dto);
    Task<List<DicomStudyActivityLogDto>> GetStudyTimelineAsync(string studyUid);
}
