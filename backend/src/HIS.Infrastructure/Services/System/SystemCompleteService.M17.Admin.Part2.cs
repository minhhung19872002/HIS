using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{
    // 17.4 Nhat ky he thong
    public async Task<List<AuditLogDto>> GetAuditLogsAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (search?.FromDate.HasValue == true)
                query = query.Where(l => l.CreatedAt >= search.FromDate.Value);
            if (search?.ToDate.HasValue == true)
                query = query.Where(l => l.CreatedAt <= search.ToDate.Value);
            if (search?.UserId.HasValue == true)
                query = query.Where(l => l.UserId == search.UserId.Value);
            if (!string.IsNullOrWhiteSpace(search?.Action))
                query = query.Where(l => l.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType))
                query = query.Where(l => l.TableName == search.EntityType || l.EntityType == search.EntityType);

            // Keyword search across username, action, entity type, details
            if (!string.IsNullOrWhiteSpace(search?.Keyword))
            {
                var kw = search.Keyword;
                query = query.Where(l =>
                    (l.Username != null && l.Username.Contains(kw)) ||
                    (l.Action != null && l.Action.Contains(kw)) ||
                    (l.TableName != null && l.TableName.Contains(kw)) ||
                    (l.EntityType != null && l.EntityType.Contains(kw)) ||
                    (l.Details != null && l.Details.Contains(kw)) ||
                    (l.UserFullName != null && l.UserFullName.Contains(kw))
                );
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = search.PageIndex.Value * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(100);
            }

            var items = await query.ToListAsync();
            return items.Select(l => new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogsAsync");
            return new List<AuditLogDto>();
        }
    }

    public async Task<AuditLogDto> GetAuditLogAsync(Guid logId)
    {
        try
        {
            var l = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == logId);
            if (l == null) return null;
            return new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.Timestamp != default ? l.Timestamp : l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username ?? l.UserFullName,
                Action = l.Action,
                Module = l.Module,
                EntityType = l.EntityType ?? l.TableName,
                EntityId = l.EntityId ?? l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogAsync");
            return null;
        }
    }

    public async Task<byte[]> ExportAuditLogsToExcelAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.Set<AuditLog>().AsNoTracking().AsQueryable();
            if (search?.FromDate.HasValue == true) query = query.Where(a => a.Timestamp >= search.FromDate);
            if (search?.ToDate.HasValue == true) query = query.Where(a => a.Timestamp <= search.ToDate);
            if (!string.IsNullOrWhiteSpace(search?.Action)) query = query.Where(a => a.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType)) query = query.Where(a => a.EntityType == search.EntityType);

            var logs = await query.OrderByDescending(a => a.Timestamp).Take(2000).ToListAsync();

            var rows = logs.Select(a => new string[] {
                a.Timestamp.ToString("dd/MM/yyyy HH:mm:ss"), a.UserFullName ?? a.Username ?? "",
                a.Action ?? "", a.EntityType ?? "", a.Details ?? "", a.IpAddress ?? ""
            }).ToList();

            var html = BuildTableReport("NHAT KY HE THONG", $"Tong: {logs.Count} ban ghi", DateTime.Now,
                new[] { "Thoi gian", "Nguoi dung", "Hanh dong", "Doi tuong", "Mo ta", "IP" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 17.5 Cau hinh he thong
    public async Task<List<SystemConfigDto>> GetSystemConfigsAsync(string category = null)
    {
        try
        {
            var query = _context.SystemConfigs.AsNoTracking()
                .Where(c => c.IsActive)
                .AsQueryable();

            // Filter by category (convention: ConfigKey prefix before '.' is the category)
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(c => c.ConfigKey.StartsWith(category + ".") || c.ConfigType == category);

            var items = await query.OrderBy(c => c.ConfigKey).ToListAsync();
            return items.Select(c => new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigsAsync");
            return new List<SystemConfigDto>();
        }
    }

    public async Task<SystemConfigDto> GetSystemConfigAsync(string configKey)
    {
        try
        {
            var c = await _context.SystemConfigs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ConfigKey == configKey);
            if (c == null) return null;
            return new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                Category = c.ConfigKey.Contains('.') ? c.ConfigKey.Substring(0, c.ConfigKey.IndexOf('.')) : "General",
                IsEditable = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigAsync");
            return null;
        }
    }

    public async Task<SystemConfigDto> SaveSystemConfigAsync(SystemConfigDto dto)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == dto.Key);

            if (entity == null)
            {
                entity = new SystemConfig
                {
                    ConfigKey = dto.Key ?? string.Empty,
                    ConfigValue = dto.Value ?? string.Empty,
                    ConfigType = dto.DataType ?? "String",
                    Description = dto.Description,
                    IsActive = true
                };
                _context.SystemConfigs.Add(entity);
            }
            else
            {
                entity.ConfigValue = dto.Value ?? entity.ConfigValue;
                entity.ConfigType = dto.DataType ?? entity.ConfigType;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemConfigAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemConfigAsync(string configKey)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == configKey);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteSystemConfigAsync");
            return false;
        }
    }

    // 17.6 Quan ly phien dang nhap
    public async Task<List<UserSessionDto>> GetActiveSessionsAsync(Guid? userId = null)
    {
        try
        {
            var query = _context.UserSessions.AsNoTracking()
                .Include(s => s.User)
                .Where(s => s.Status == 0) // 0 = Active
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(s => s.UserId == userId.Value);

            var items = await query.OrderByDescending(s => s.LoginTime).Take(200).ToListAsync();
            return items.Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Username = s.User != null ? $"{s.User.Username} ({s.User.FullName})" : null,
                IpAddress = s.IPAddress,
                UserAgent = s.UserAgent,
                LoginTime = s.LoginTime,
                LastActivityTime = s.LogoutTime ?? s.LoginTime,
                IsActive = s.Status == 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetActiveSessionsAsync");
            return new List<UserSessionDto>();
        }
    }

    public async Task<bool> TerminateSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;
            session.Status = 2; // Logged out
            session.LogoutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateSessionAsync");
            return false;
        }
    }

    public async Task<bool> TerminateAllSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.Status == 0)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.Status = 2;
                session.LogoutTime = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateAllSessionsAsync");
            return false;
        }
    }

    // 17.7 Quan ly thong bao he thong
    public async Task<List<SystemNotificationDto>> GetSystemNotificationsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Notifications.AsNoTracking()
                .Where(n => !n.IsDeleted)
                .AsQueryable();

            if (isActive.HasValue)
            {
                if (isActive.Value)
                    query = query.Where(n => !n.IsRead);
                else
                    query = query.Where(n => n.IsRead);
            }

            var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
            return items.Select(n => new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationsAsync");
            return new List<SystemNotificationDto>();
        }
    }

    public async Task<SystemNotificationDto> GetSystemNotificationAsync(Guid notificationId)
    {
        try
        {
            var n = await _context.Notifications.AsNoTracking()
                .Include(x => x.TargetUser)
                .FirstOrDefaultAsync(x => x.Id == notificationId);
            if (n == null) return null;
            return new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                TargetUsers = n.TargetUserId.HasValue ? new List<Guid> { n.TargetUserId.Value } : new List<Guid>(),
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationAsync");
            return null;
        }
    }

    public async Task<SystemNotificationDto> SaveSystemNotificationAsync(SystemNotificationDto dto)
    {
        try
        {
            Notification entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Notification
                {
                    Title = dto.Title ?? string.Empty,
                    Content = dto.Message ?? string.Empty,
                    NotificationType = dto.NotificationType ?? "Info",
                    TargetUserId = dto.TargetUsers?.FirstOrDefault(),
                    IsRead = false
                };
                _context.Notifications.Add(entity);

                // If multiple target users, create a notification for each
                if (dto.TargetUsers?.Count > 1)
                {
                    foreach (var targetUserId in dto.TargetUsers.Skip(1))
                    {
                        _context.Notifications.Add(new Notification
                        {
                            Title = dto.Title ?? string.Empty,
                            Content = dto.Message ?? string.Empty,
                            NotificationType = dto.NotificationType ?? "Info",
                            TargetUserId = targetUserId,
                            IsRead = false
                        });
                    }
                }
            }
            else
            {
                entity = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == dto.Id);
                if (entity == null) return null;
                entity.Title = dto.Title ?? entity.Title;
                entity.Content = dto.Message ?? entity.Content;
                entity.NotificationType = dto.NotificationType ?? entity.NotificationType;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemNotificationAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemNotificationAsync(Guid notificationId)
    {
        return await SoftDeleteEntityAsync<Notification>(notificationId);
    }

    // 17.8 Sao luu du lieu
    public async Task<List<BackupHistoryDto>> GetBackupHistoryAsync(
        DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SQL Server backup history from msdb system database
            var results = new List<BackupHistoryDto>();

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    bs.backup_set_id,
                    bs.name,
                    CASE bs.type
                        WHEN 'D' THEN 'Full'
                        WHEN 'I' THEN 'Differential'
                        WHEN 'L' THEN 'TransactionLog'
                        ELSE bs.type
                    END AS BackupType,
                    bmf.physical_device_name AS FilePath,
                    bs.backup_size,
                    bs.backup_start_date,
                    bs.user_name,
                    CASE
                        WHEN bs.backup_finish_date IS NOT NULL THEN 'Completed'
                        ELSE 'InProgress'
                    END AS Status
                FROM msdb.dbo.backupset bs
                INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
                WHERE bs.database_name = DB_NAME()
                ORDER BY bs.backup_start_date DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var backupDate = reader.GetDateTime(5);
                if (fromDate.HasValue && backupDate < fromDate.Value) continue;
                if (toDate.HasValue && backupDate > toDate.Value) continue;

                results.Add(new BackupHistoryDto
                {
                    Id = Guid.NewGuid(), // backup_set_id is int, generate GUID for DTO
                    BackupName = reader.IsDBNull(1) ? $"Backup_{backupDate:yyyyMMdd}" : reader.GetString(1),
                    BackupType = reader.GetString(2),
                    FilePath = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    FileSize = reader.IsDBNull(4) ? 0 : Convert.ToInt64(reader.GetDecimal(4)),
                    BackupDate = backupDate,
                    BackupBy = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    Status = reader.GetString(7)
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBackupHistoryAsync (msdb query may require elevated permissions)");
            return new List<BackupHistoryDto>();
        }
    }

    public async Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var backupName = string.IsNullOrEmpty(dto.BackupName)
            ? $"HIS_Backup_{timestamp}" : dto.BackupName;
        // Docker volume mapping: ./backup:/var/opt/mssql/backup (see docker-compose.yml)
        var backupPath = $"/var/opt/mssql/backup/{backupName}.bak";

        var sql = (dto.BackupType?.ToUpper()) switch
        {
            "DIFFERENTIAL" => $"BACKUP DATABASE [HIS] TO DISK = N'{backupPath}' WITH DIFFERENTIAL, COMPRESSION, STATS = 10, NAME = N'{backupName}'",
            "LOG" or "TRANSACTIONLOG" => $"BACKUP LOG [HIS] TO DISK = N'{backupPath}' WITH COMPRESSION, STATS = 10, NAME = N'{backupName}'",
            _ => $"BACKUP DATABASE [HIS] TO DISK = N'{backupPath}' WITH COMPRESSION, STATS = 10, NAME = N'{backupName}'"
        };

        try
        {
            _logger.LogInformation("Starting database backup: {BackupName}, Type: {BackupType}, Path: {BackupPath}",
                backupName, dto.BackupType ?? "Full", backupPath);

            await _context.Database.ExecuteSqlRawAsync(sql);

            _logger.LogInformation("Database backup completed successfully: {BackupName}", backupName);

            return new BackupHistoryDto
            {
                Id = Guid.NewGuid(),
                BackupName = backupName,
                BackupType = dto.BackupType ?? "Full",
                FilePath = backupPath,
                BackupDate = DateTime.UtcNow,
                Status = "Completed"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database backup failed: {BackupName}", backupName);
            return new BackupHistoryDto
            {
                Id = Guid.NewGuid(),
                BackupName = backupName,
                BackupType = dto.BackupType ?? "Full",
                FilePath = backupPath,
                BackupDate = DateTime.UtcNow,
                Status = $"Failed: {ex.Message}"
            };
        }
    }

    public async Task<bool> RestoreBackupAsync(Guid backupId)
    {
        // Retrieve backup info from msdb history to get the file path
        var history = await GetBackupHistoryAsync();
        var backup = history.FirstOrDefault(b => b.Id == backupId);

        // Since GetBackupHistoryAsync generates new GUIDs each call, also try matching by file path
        // In practice, the UI should pass the file path directly or use a stable identifier.
        // For now, search across all history entries for the given ID.
        if (backup == null || string.IsNullOrEmpty(backup.FilePath))
        {
            _logger.LogWarning("RestoreBackupAsync: Backup {BackupId} not found in history", backupId);
            return false;
        }

        try
        {
            _logger.LogWarning("Starting database restore from: {FilePath}. This requires exclusive access.", backup.FilePath);

            // RESTORE requires exclusive access - set DB to single-user first.
            // WARNING: This is a dangerous operation and should only be done by admin.
            var sql = $@"
                ALTER DATABASE [HIS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                RESTORE DATABASE [HIS] FROM DISK = N'{backup.FilePath}' WITH REPLACE;
                ALTER DATABASE [HIS] SET MULTI_USER;";

            await _context.Database.ExecuteSqlRawAsync(sql);

            _logger.LogInformation("Database restore completed successfully from: {FilePath}", backup.FilePath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database restore failed for backup {BackupId}, FilePath: {FilePath}", backupId, backup.FilePath);

            // Attempt to set back to multi-user mode if restore failed mid-way
            try
            {
                await _context.Database.ExecuteSqlRawAsync("ALTER DATABASE [HIS] SET MULTI_USER;");
            }
            catch (Exception innerEx)
            {
                _logger.LogError(innerEx, "Failed to restore multi-user mode after failed restore");
            }

            return false;
        }
    }

    public async Task<bool> DeleteBackupAsync(Guid backupId)
    {
        _logger.LogWarning("DeleteBackupAsync: Not implemented");
        return false;
    }

}
