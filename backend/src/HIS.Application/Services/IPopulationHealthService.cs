using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IPopulationHealthService
{
    Task<List<PopulationRecordDto>> SearchRecordsAsync(PopulationRecordSearchDto? filter = null);
    Task<PopulationRecordDto> CreateRecordAsync(CreatePopulationRecordDto dto);
    Task<PopulationRecordDto> UpdateRecordAsync(Guid id, CreatePopulationRecordDto dto);
    Task<PopulationHealthStatsDto> GetStatsAsync();
    Task<ElderlyStatsDto> GetElderlyStatsAsync();
}
