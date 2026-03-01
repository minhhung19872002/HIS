using HIS.Application.DTOs.Examination;

namespace HIS.Application.Services;

public interface IClinicalDecisionSupportService
{
    Task<List<DiagnosisSuggestionDto>> SuggestDiagnosesAsync(DiagnosisSuggestionRequestDto request);
    Task<EarlyWarningScoreDto> CalculateEarlyWarningScoreAsync(EarlyWarningScoreRequestDto request);
    Task<List<ClinicalAlertDto>> GetClinicalAlertsAsync(Guid patientId, Guid? examinationId = null);
    Task<ClinicalDecisionSupportResultDto> GetFullCdsAsync(Guid patientId, Guid? examinationId, DiagnosisSuggestionRequestDto? suggestionRequest = null);
    Task<List<IcdCodeFullDto>> GetFrequentDiagnosesAsync(string? departmentId, int limit = 10);
}
