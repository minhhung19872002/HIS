using HIS.Application.DTOs.NationalPrescription;

namespace HIS.Application.Services;

public interface INationalPrescriptionService
{
    Task<NationalPrescriptionPagedResult> SearchAsync(NationalPrescriptionSearchDto search);
    Task<NationalPrescriptionDto?> GetByIdAsync(Guid id);
    Task<object> SubmitAsync(Guid prescriptionId, string userId);
    Task<SubmitBatchResult> SubmitBatchAsync(List<string> prescriptionIds, string userId);
    Task<NationalPrescriptionStatsDto> GetStatsAsync();
    Task<object> TestConnectionAsync();
    Task<object> RetrySubmissionAsync(Guid id, string userId);
    Task<object> CancelSubmissionAsync(Guid id, string userId);
}
