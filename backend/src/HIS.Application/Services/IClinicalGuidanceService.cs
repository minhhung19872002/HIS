using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IClinicalGuidanceService
{
    Task<List<ClinicalGuidanceBatchListDto>> SearchBatchesAsync(ClinicalGuidanceSearchDto filter);
    Task<ClinicalGuidanceBatchDetailDto?> GetBatchByIdAsync(Guid id);
    Task<ClinicalGuidanceBatchDetailDto> CreateBatchAsync(CreateClinicalGuidanceBatchDto dto);
    Task<ClinicalGuidanceBatchDetailDto> UpdateBatchAsync(Guid id, UpdateClinicalGuidanceBatchDto dto);
    Task<bool> CompleteBatchAsync(Guid id, CompleteClinicalGuidanceBatchDto dto);
    Task<bool> CancelBatchAsync(Guid id);
    Task<List<ClinicalGuidanceActivityDto>> GetActivitiesAsync(Guid batchId);
    Task<ClinicalGuidanceActivityDto> CreateActivityAsync(Guid batchId, CreateClinicalGuidanceActivityDto dto);
    Task<ClinicalGuidanceStatsDto> GetStatisticsAsync();
}
