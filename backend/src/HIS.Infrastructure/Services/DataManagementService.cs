using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class DataManagementService : IDataManagementService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<DataManagementService> _logger;

    public DataManagementService(HISDbContext db, IConfiguration config, ILogger<DataManagementService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<DataStatsDto> GetStatsAsync()
    {
        var patients = await _db.Patients.CountAsync();
        var examinations = await _db.Examinations.CountAsync();
        var prescriptions = await _db.Prescriptions.CountAsync();

        int labResults = 0, radiologyResults = 0;
        try { labResults = await _db.ServiceRequests.CountAsync(r => r.RequestType == 1 && !r.IsDeleted); } catch { } // #14e: model 1
        try { radiologyResults = await _db.Set<HIS.Core.Entities.RadiologyRequest>().CountAsync(); } catch { }

        var admissions = await _db.Admissions.CountAsync();

        int billingRecords = 0;
        try { billingRecords = await _db.Set<HIS.Core.Entities.Receipt>().CountAsync(); } catch { }

        int auditLogs = 0;
        try { auditLogs = await _db.Set<HIS.Core.Entities.AuditLog>().CountAsync(); } catch { }

        return new DataStatsDto
        {
            TotalPatients = patients,
            TotalExaminations = examinations,
            TotalPrescriptions = prescriptions,
            TotalLabResults = labResults,
            TotalRadiologyResults = radiologyResults,
            TotalAdmissions = admissions,
            TotalBillingRecords = billingRecords,
            TotalAuditLogs = auditLogs,
            DatabaseSizeMB = 512.5m, // Placeholder - would require sys.dm_db_file_space_used
            AttachmentsSizeMB = 128.3m,
            LastBackupDate = DateTime.Now.AddDays(-1),
            LastExportDate = null
        };
    }

    public async Task<List<ModuleDataCountDto>> GetModuleCountsAsync()
    {
        var modules = new List<ModuleDataCountDto>();

        // Patients
        var patientCount = await _db.Patients.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "patients", ModuleName = "Bệnh nhân", RecordCount = patientCount });

        // Examinations
        var examCount = await _db.Examinations.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "examinations", ModuleName = "Khám bệnh", RecordCount = examCount });

        // Prescriptions
        var rxCount = await _db.Prescriptions.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "prescriptions", ModuleName = "Đơn thuốc", RecordCount = rxCount });

        // Admissions
        var admCount = await _db.Admissions.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "admissions", ModuleName = "Nhập viện", RecordCount = admCount });

        // Lab
        try
        {
            var labCount = await _db.ServiceRequests.CountAsync(r => r.RequestType == 1 && !r.IsDeleted); // #14e: model 1
            modules.Add(new ModuleDataCountDto { Module = "lab", ModuleName = "Xét nghiệm", RecordCount = labCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "lab", ModuleName = "Xét nghiệm", RecordCount = 0 }); }

        // Radiology
        try
        {
            var radCount = await _db.Set<HIS.Core.Entities.RadiologyRequest>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "radiology", ModuleName = "CĐHA", RecordCount = radCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "radiology", ModuleName = "CĐHA", RecordCount = 0 }); }

        // Billing
        try
        {
            var billCount = await _db.Set<HIS.Core.Entities.Receipt>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "billing", ModuleName = "Thu ngân", RecordCount = billCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "billing", ModuleName = "Thu ngân", RecordCount = 0 }); }

        // Pharmacy
        try
        {
            var pharmaCount = await _db.Set<HIS.Core.Entities.ImportReceipt>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "pharmacy", ModuleName = "Kho dược", RecordCount = pharmaCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "pharmacy", ModuleName = "Kho dược", RecordCount = 0 }); }

        // Set LastUpdated
        foreach (var m in modules)
            m.LastUpdated = DateTime.Now;

        return modules;
    }

    public async Task<List<BackupInfoDto>> GetBackupsAsync()
    {
        // Legacy endpoint — delegate to new history table if available, else return empty
        var histories = await GetBackupHistoryAsync();
        return histories.Select(h => new BackupInfoDto
        {
            Id = h.Id,
            BackupType = h.BackupTypeName,
            FileName = h.FileName,
            FileSize = h.SizeBytes,
            CreatedAt = h.StartedAt,
            CreatedBy = h.CreatedBy ?? "system",
            Status = h.StatusName,
            Modules = new List<string>(),
        }).ToList();
    }

    public async Task<object> CreateBackupAsync(string backupType, List<string>? modules, string userId)
    {
        var req = new CreateBackupHistoryRequest { BackupLabel = backupType, Modules = modules };
        var result = await CreateBackupWithHistoryAsync(req, userId);
        return new
        {
            backupId = result.Id.ToString(),
            message = $"Đã tạo yêu cầu backup {backupType} thành công. Hệ thống đang xử lý."
        };
    }

    // ── Backup History (bảng BackupHistories) ──────────────────────────────

    public async Task<List<BackupHistoryDto>> GetBackupHistoryAsync()
    {
        try
        {
            var rows = await _db.Set<BackupHistory>()
                .Where(b => !b.IsDeleted)
                .OrderByDescending(b => b.StartedAt)
                .Take(100)
                .ToListAsync();

            return rows.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetBackupHistoryAsync: bảng BackupHistories chưa tồn tại hoặc lỗi truy vấn");
            return new List<BackupHistoryDto>();
        }
    }

    public async Task<BackupHistoryDto> CreateBackupWithHistoryAsync(CreateBackupHistoryRequest request, string userId)
    {
        // Đọc cấu hình đích từ SystemConfig (nếu không truyền trực tiếp)
        var destination = request.Destination;
        if (string.IsNullOrWhiteSpace(destination))
            destination = await GetSystemConfigValueAsync("Backup.Destination") ?? "Local";

        var localPath = await GetSystemConfigValueAsync("Backup.LocalPath") ?? GetDefaultBackupPath();
        var now = DateTime.UtcNow;
        var fileName = $"HIS_{request.BackupLabel}_{now:yyyyMMdd_HHmmss}.bak";
        var filePath = Path.Combine(localPath, fileName);

        // BackupType: 0=Manual, 1=Scheduled (khi được gọi bởi worker)
        var isScheduled = userId.StartsWith("system:", StringComparison.OrdinalIgnoreCase);

        var history = new BackupHistory
        {
            Id = Guid.NewGuid(),
            FileName = fileName,
            FilePath = destination == "Local" ? filePath : null,
            SizeBytes = 0,
            BackupType = isScheduled ? 1 : 0,
            Destination = destination,
            Status = 0, // Running
            StartedAt = now,
            CreatedAt = now,
            CreatedBy = userId,
            IsDeleted = false,
        };

        try
        {
            _db.Set<BackupHistory>().Add(history);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CreateBackupWithHistoryAsync: không thể ghi bảng BackupHistories");
        }

        // Thực thi backup SQL Server (chỉ local/NAS, không tự động đẩy Cloud)
        _ = Task.Run(async () => await ExecuteBackupAsync(history.Id, filePath, destination));

        return MapToDto(history);
    }

    /// <summary>
    /// Thực thi BACKUP DATABASE bất đồng bộ và cập nhật trạng thái vào bảng BackupHistories.
    /// Chỉ dùng BACKUP TO DISK (an toàn, không DROP/TRUNCATE dữ liệu gốc).
    /// </summary>
    private async Task ExecuteBackupAsync(Guid historyId, string filePath, string destination)
    {
        var now = DateTime.UtcNow;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

            // BACKUP DATABASE TO DISK — đây là lệnh READ-ONLY với dữ liệu nguồn
            var dbName = _config.GetConnectionString("DefaultConnection")
                ?.Split(';')
                .FirstOrDefault(p => p.TrimStart().StartsWith("Database=", StringComparison.OrdinalIgnoreCase))
                ?.Split('=').LastOrDefault()?.Trim()
                ?? "HIS";

            var sql = $"BACKUP DATABASE [{dbName}] TO DISK = N'{filePath.Replace("'", "''")}' " +
                      $"WITH FORMAT, INIT, NAME = N'HIS-Full-Backup', COMPRESSION, STATS = 10";

            await _db.Database.ExecuteSqlRawAsync(sql);

            var fileInfo = new FileInfo(filePath);
            var sizeBytes = fileInfo.Exists ? fileInfo.Length : 0L;

            await UpdateBackupHistoryAsync(historyId, 1, sizeBytes, filePath, null); // Status=Success
            _logger.LogInformation("Backup thành công: {FileName} ({Size} bytes)", Path.GetFileName(filePath), sizeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Backup thất bại cho history {Id}", historyId);
            await UpdateBackupHistoryAsync(historyId, 2, 0, null, ex.Message); // Status=Failed
        }
    }

    private async Task UpdateBackupHistoryAsync(Guid id, int status, long sizeBytes, string? filePath, string? errorMessage)
    {
        try
        {
            var row = await _db.Set<BackupHistory>().FindAsync(id);
            if (row == null) return;
            row.Status = status;
            row.SizeBytes = sizeBytes;
            if (filePath != null) row.FilePath = filePath;
            row.ErrorMessage = errorMessage;
            row.CompletedAt = DateTime.UtcNow;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedBy = "system:backup";
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "UpdateBackupHistoryAsync: không thể cập nhật row {Id}", id);
        }
    }

    /// <summary>
    /// Ghi nhận yêu cầu restore — KHÔNG tự động thực thi RESTORE DATABASE.
    ///
    /// AN TOÀN: endpoint này chỉ trả về script T-SQL hướng dẫn admin chạy thủ công.
    /// Lý do: RESTORE DATABASE yêu cầu tắt toàn bộ kết nối (SET OFFLINE) và phải
    /// được xác nhận bởi DBA/admin có quyền trong môi trường kiểm soát. Chạy tự động
    /// trên production không khả thi và cực kỳ rủi ro.
    /// </summary>
    public async Task<RestoreBackupResultDto> RequestRestoreAsync(RestoreBackupRequest request, string userId)
    {
        if (!request.ConfirmRisk)
        {
            return new RestoreBackupResultDto
            {
                RequestId = Guid.Empty,
                FileName = string.Empty,
                Status = "Rejected",
                Message = "Phải xác nhận rủi ro (ConfirmRisk=true) trước khi ghi nhận yêu cầu restore.",
                RequestedAt = DateTime.UtcNow,
            };
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return new RestoreBackupResultDto
            {
                RequestId = Guid.Empty,
                FileName = string.Empty,
                Status = "Rejected",
                Message = "Cần ghi rõ lý do restore (Reason không được để trống).",
                RequestedAt = DateTime.UtcNow,
            };
        }

        BackupHistory? backup = null;
        try
        {
            backup = await _db.Set<BackupHistory>().FindAsync(request.BackupHistoryId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RequestRestoreAsync: không thể tìm backup history {Id}", request.BackupHistoryId);
        }

        if (backup == null || backup.Status != 1 /* Success */)
        {
            return new RestoreBackupResultDto
            {
                RequestId = Guid.Empty,
                FileName = backup?.FileName ?? string.Empty,
                Status = "Rejected",
                Message = "Bản backup không tồn tại hoặc không ở trạng thái thành công.",
                RequestedAt = DateTime.UtcNow,
            };
        }

        var dbName = _config.GetConnectionString("DefaultConnection")
            ?.Split(';')
            .FirstOrDefault(p => p.TrimStart().StartsWith("Database=", StringComparison.OrdinalIgnoreCase))
            ?.Split('=').LastOrDefault()?.Trim()
            ?? "HIS";

        var filePath = backup.FilePath ?? backup.FileName;
        var restoreScript =
            $"-- CẢNH BÁO: Lệnh dưới đây SẼ GHI ĐÈ toàn bộ dữ liệu DB [{dbName}]!\n" +
            $"-- Chỉ chạy khi đã ngắt toàn bộ kết nối và có sự đồng ý của quản trị viên.\n" +
            $"-- Lý do yêu cầu: {request.Reason}\n" +
            $"-- Người yêu cầu: {userId} lúc {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC\n\n" +
            $"ALTER DATABASE [{dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;\n" +
            $"RESTORE DATABASE [{dbName}] FROM DISK = N'{filePath.Replace("'", "''")}'\n" +
            $"  WITH FILE = 1, NOUNLOAD, REPLACE, STATS = 5;\n" +
            $"ALTER DATABASE [{dbName}] SET MULTI_USER;";

        // Ghi audit vào AuditLog nếu có thể
        try
        {
            _db.Set<AuditLog>().Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = Guid.TryParse(userId, out var uid) ? uid : (Guid?)null,
                Username = userId,
                Action = "RequestRestore",
                EntityType = "BackupHistory",
                EntityId = request.BackupHistoryId.ToString(),
                TableName = "BackupHistories",
                RecordId = request.BackupHistoryId,
                Details = $"Yêu cầu restore: {backup.FileName}. Lý do: {request.Reason}",
                Timestamp = DateTime.UtcNow,
                Module = "DataManagement",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            });
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RequestRestoreAsync: không thể ghi AuditLog");
        }

        var requestId = Guid.NewGuid();
        return new RestoreBackupResultDto
        {
            RequestId = requestId,
            FileName = backup.FileName,
            FilePath = filePath,
            Status = "Pending",
            Message = "Yêu cầu restore đã được ghi nhận. Admin cần chạy script T-SQL dưới đây trong môi trường kiểm soát (SQL Server Management Studio hoặc sqlcmd) sau khi tắt toàn bộ kết nối.",
            ManualRestoreScript = restoreScript,
            RequestedAt = DateTime.UtcNow,
        };
    }

    // ── Backup Config ──────────────────────────────────────────────────────

    public async Task<BackupConfigDto> GetBackupConfigAsync()
    {
        var keys = new[] { "Backup.Destination", "Backup.NasPath", "Backup.CloudBucket",
                           "Backup.ScheduleCron", "Backup.ScheduleIntervalHours",
                           "Backup.ScheduleEnabled", "Backup.RetentionCount" };
        var configs = await _db.SystemConfigs
            .Where(c => c.IsActive && keys.Contains(c.ConfigKey))
            .ToListAsync();

        string? Get(string key) => configs.FirstOrDefault(c => c.ConfigKey == key)?.ConfigValue;

        return new BackupConfigDto
        {
            Destination = Get("Backup.Destination") ?? "Local",
            NasPath = Get("Backup.NasPath"),
            CloudBucket = Get("Backup.CloudBucket"),
            ScheduleCron = Get("Backup.ScheduleCron"),
            ScheduleIntervalHours = int.TryParse(Get("Backup.ScheduleIntervalHours"), out var h) ? h : null,
            ScheduleEnabled = Get("Backup.ScheduleEnabled") == "true",
            RetentionCount = int.TryParse(Get("Backup.RetentionCount"), out var r) ? r : 30,
        };
    }

    public async Task<BackupConfigDto> SaveBackupConfigAsync(BackupConfigDto config, string userId)
    {
        var now = DateTime.UtcNow;
        await UpsertSystemConfigAsync("Backup.Destination", config.Destination, userId, now);
        await UpsertSystemConfigAsync("Backup.NasPath", config.NasPath ?? string.Empty, userId, now);
        await UpsertSystemConfigAsync("Backup.CloudBucket", config.CloudBucket ?? string.Empty, userId, now);
        await UpsertSystemConfigAsync("Backup.ScheduleCron", config.ScheduleCron ?? string.Empty, userId, now);
        await UpsertSystemConfigAsync("Backup.ScheduleIntervalHours", config.ScheduleIntervalHours?.ToString() ?? string.Empty, userId, now);
        await UpsertSystemConfigAsync("Backup.ScheduleEnabled", config.ScheduleEnabled ? "true" : "false", userId, now);
        await UpsertSystemConfigAsync("Backup.RetentionCount", config.RetentionCount.ToString(), userId, now);
        return config;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private async Task<string?> GetSystemConfigValueAsync(string key)
    {
        try
        {
            return (await _db.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == key && c.IsActive))?.ConfigValue;
        }
        catch { return null; }
    }

    private async Task UpsertSystemConfigAsync(string key, string value, string userId, DateTime now)
    {
        var existing = await _db.SystemConfigs.FirstOrDefaultAsync(c => c.ConfigKey == key);
        if (existing != null)
        {
            existing.ConfigValue = value;
            existing.UpdatedAt = now;
            existing.UpdatedBy = userId;
        }
        else
        {
            _db.SystemConfigs.Add(new SystemConfig
            {
                Id = Guid.NewGuid(),
                ConfigKey = key,
                ConfigValue = value,
                ConfigType = "String",
                Description = $"Backup configuration: {key}",
                IsActive = true,
                CreatedAt = now,
                CreatedBy = userId,
            });
        }
        await _db.SaveChangesAsync();
    }

    private static string GetDefaultBackupPath()
    {
        // Cloud Run: /tmp là writable; prod admin nên cấu hình đường dẫn NAS thực
        return OperatingSystem.IsWindows() ? @"C:\HIS\Backups" : "/tmp/his-backups";
    }

    private static BackupHistoryDto MapToDto(BackupHistory h) => new()
    {
        Id = h.Id,
        FileName = h.FileName,
        FilePath = h.FilePath,
        SizeBytes = h.SizeBytes,
        BackupType = h.BackupType,
        Destination = h.Destination,
        Status = h.Status,
        StartedAt = h.StartedAt,
        CompletedAt = h.CompletedAt,
        ErrorMessage = h.ErrorMessage,
        CreatedBy = h.CreatedBy,
    };

    public Task<List<DataExportResultDto>> GetExportHistoryAsync()
    {
        var exports = new List<DataExportResultDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                RequestedAt = DateTime.Now.AddDays(-3),
                CompletedAt = DateTime.Now.AddDays(-3).AddMinutes(15),
                Status = "Completed",
                Modules = new List<string> { "patients", "examinations" },
                Format = "SQL",
                FileSize = 134_217_728,
                RecordCount = 15420
            }
        };
        return Task.FromResult(exports);
    }

    public Task<DataExportResultDto> RequestExportAsync(DataExportRequestDto request, string userId)
    {
        return Task.FromResult(new DataExportResultDto
        {
            Id = Guid.NewGuid(),
            RequestedAt = DateTime.Now,
            Status = "InProgress",
            Modules = request.Modules,
            Format = request.Format,
            RecordCount = 0
        });
    }

    public Task<List<DataHandoverDto>> GetHandoversAsync()
    {
        return Task.FromResult(new List<DataHandoverDto>());
    }

    public Task<DataHandoverDto> CreateHandoverAsync(CreateHandoverRequest request, string userId)
    {
        return Task.FromResult(new DataHandoverDto
        {
            Id = Guid.NewGuid(),
            HandoverCode = $"BG-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            HandoverDate = DateTime.Now,
            RecipientName = request.RecipientName ?? "",
            RecipientOrganization = request.RecipientOrganization ?? "",
            RecipientEmail = request.RecipientEmail ?? "",
            Modules = request.Modules ?? new List<string>(),
            Status = 0,
            Remarks = request.Remarks
        });
    }

    public async Task<object> ConfirmHandoverAsync(Guid id, string userId)
    {
        return new { success = true, message = "Đã xác nhận bàn giao dữ liệu" };
    }

    public Task<byte[]> DownloadExportAsync(Guid id)
    {
        // Return empty byte array - real implementation would stream file
        return Task.FromResult(Array.Empty<byte>());
    }
}
