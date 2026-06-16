using HIS.Application.DTOs.DataManagement;

namespace HIS.Application.Services;

public interface IDataManagementService
{
    Task<DataStatsDto> GetStatsAsync();
    Task<List<ModuleDataCountDto>> GetModuleCountsAsync();

    // ── Legacy (giữ backward compat cho controller cũ) ──
    Task<List<BackupInfoDto>> GetBackupsAsync();
    Task<object> CreateBackupAsync(string backupType, List<string>? modules, string userId);

    // ── Backup History (mới — bảng BackupHistories) ──
    Task<List<BackupHistoryDto>> GetBackupHistoryAsync();
    Task<BackupHistoryDto> CreateBackupWithHistoryAsync(CreateBackupHistoryRequest request, string userId);
    Task<RestoreBackupResultDto> RequestRestoreAsync(RestoreBackupRequest request, string userId);

    // ── Backup Config (SystemConfig keys) ──
    Task<BackupConfigDto> GetBackupConfigAsync();
    Task<BackupConfigDto> SaveBackupConfigAsync(BackupConfigDto config, string userId);

    Task<List<DataExportResultDto>> GetExportHistoryAsync();
    Task<DataExportResultDto> RequestExportAsync(DataExportRequestDto request, string userId);
    Task<List<DataHandoverDto>> GetHandoversAsync();
    Task<DataHandoverDto> CreateHandoverAsync(CreateHandoverRequest request, string userId);
    Task<object> ConfirmHandoverAsync(Guid id, string userId);
    Task<byte[]> DownloadExportAsync(Guid id);
}
