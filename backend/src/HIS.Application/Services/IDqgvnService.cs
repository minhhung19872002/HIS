using HIS.Application.DTOs.DQGVN;

namespace HIS.Application.Services;

/// <summary>
/// DQGVN - Cong du lieu y te quoc gia (Vietnam National Health Data Exchange)
/// Lien thong du lieu y te voi co quan quan ly nha nuoc
/// </summary>
public interface IDqgvnService
{
    Task<DqgvnDashboardDto> GetDashboardAsync();
    Task<DqgvnSubmissionPagedResult> SearchSubmissionsAsync(DqgvnSubmissionSearchDto search);
    Task<DqgvnSubmissionDto?> GetSubmissionAsync(Guid submissionId);
    Task<DqgvnSubmitResult> SubmitEncounterAsync(SubmitEncounterRequest request, string userId);
    Task<DqgvnSubmitResult> SubmitLabResultAsync(SubmitLabResultRequest request, string userId);
    Task<DqgvnSubmitResult> SubmitPatientAsync(Guid patientId, string userId);
    Task<DqgvnSubmitResult> RetrySubmissionAsync(Guid submissionId, string userId);
    Task<int> SubmitPendingBatchAsync(string userId); // Auto-submit pending
    Task<DqgvnConfigDto> GetConfigAsync();
    Task SaveConfigAsync(DqgvnConfigDto config, string userId);
}
