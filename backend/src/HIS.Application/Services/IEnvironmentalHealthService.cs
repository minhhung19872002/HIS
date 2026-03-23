using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IEnvironmentalHealthService
{
    Task<List<WasteRecordDto>> SearchWasteRecordsAsync(WasteRecordSearchDto? filter = null);
    Task<WasteRecordDto> CreateWasteRecordAsync(CreateWasteRecordDto dto);
    Task<WasteRecordDto> UpdateWasteRecordAsync(Guid id, CreateWasteRecordDto dto);
    Task<List<EnvironmentalMonitoringDto>> SearchMonitoringAsync(EnvironmentalMonitoringSearchDto? filter = null);
    Task<EnvironmentalMonitoringDto> CreateMonitoringAsync(CreateEnvironmentalMonitoringDto dto);
    Task<WasteStatsDto> GetWasteStatsAsync();
    Task<MonitoringStatsDto> GetMonitoringStatsAsync();
    Task<BiosafetyStatusDto> GetBiosafetyStatusAsync();
}
