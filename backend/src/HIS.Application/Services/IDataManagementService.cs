using HIS.Application.DTOs.DataManagement;

namespace HIS.Application.Services;

public interface IDataManagementService
{
    Task<DataStatsDto> GetStatsAsync();
    Task<List<ModuleDataCountDto>> GetModuleCountsAsync();
    Task<List<BackupInfoDto>> GetBackupsAsync();
    Task<object> CreateBackupAsync(string backupType, List<string>? modules, string userId);
    Task<List<DataExportResultDto>> GetExportHistoryAsync();
    Task<DataExportResultDto> RequestExportAsync(DataExportRequestDto request, string userId);
    Task<List<DataHandoverDto>> GetHandoversAsync();
    Task<DataHandoverDto> CreateHandoverAsync(CreateHandoverRequest request, string userId);
    Task<object> ConfirmHandoverAsync(Guid id, string userId);
    Task<byte[]> DownloadExportAsync(Guid id);
}
