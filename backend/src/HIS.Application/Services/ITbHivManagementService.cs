using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ITbHivManagementService
{
    Task<List<TbHivRecordListDto>> SearchRecordsAsync(TbHivSearchDto filter);
    Task<TbHivRecordDetailDto?> GetRecordByIdAsync(Guid id);
    Task<TbHivRecordDetailDto> CreateRecordAsync(CreateTbHivRecordDto dto);
    Task<TbHivRecordDetailDto> UpdateRecordAsync(Guid id, UpdateTbHivRecordDto dto);
    Task<bool> CloseRecordAsync(Guid id, CloseTbHivRecordDto dto);
    Task<List<TbHivFollowUpDto>> GetFollowUpsAsync(Guid recordId);
    Task<TbHivFollowUpDto> CreateFollowUpAsync(Guid recordId, CreateTbHivFollowUpDto dto);
    Task<TbHivStatsDto> GetStatisticsAsync();
    Task<List<TbHivTreatmentOutcomeDto>> GetTreatmentOutcomesAsync(string? fromDate, string? toDate);
}
