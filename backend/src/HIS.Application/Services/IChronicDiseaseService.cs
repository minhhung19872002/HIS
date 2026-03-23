using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IChronicDiseaseService
{
    Task<List<ChronicDiseaseListDto>> SearchRecordsAsync(ChronicDiseaseSearchDto filter);
    Task<ChronicDiseaseDetailDto?> GetRecordByIdAsync(Guid id);
    Task<ChronicDiseaseDetailDto> CreateRecordAsync(CreateChronicDiseaseDto dto);
    Task<ChronicDiseaseDetailDto> UpdateRecordAsync(Guid id, UpdateChronicDiseaseDto dto);
    Task<bool> CloseRecordAsync(Guid id, CloseChronicDiseaseDto dto);
    Task<bool> RemoveRecordAsync(Guid id, RemoveChronicDiseaseDto dto);
    Task<bool> ReopenRecordAsync(Guid id);
    Task<List<ChronicDiseaseFollowUpDto>> GetFollowUpsAsync(Guid recordId);
    Task<ChronicDiseaseFollowUpDto> CreateFollowUpAsync(Guid recordId, CreateChronicDiseaseFollowUpDto dto);
    Task<ChronicDiseaseStatsDto> GetStatisticsAsync();
}
