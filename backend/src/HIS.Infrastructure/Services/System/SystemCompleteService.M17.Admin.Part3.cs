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
    // 17.9 Giam sat he thong
    public async Task<SystemHealthDto> GetSystemHealthAsync()
    {
        var dbStatus = "Unknown";
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();
            dbStatus = canConnect ? "Healthy" : "Unhealthy";
        }
        catch
        {
            dbStatus = "Unhealthy";
        }

        // Memory usage from current process
        double memoryUsagePct = 0;
        try
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            // Approximate: ratio of working set to 2GB as a simple metric
            memoryUsagePct = Math.Round(workingSetMB / 2048.0 * 100, 1);
            if (memoryUsagePct > 100) memoryUsagePct = 99;
        }
        catch { /* ignore process access errors */ }

        // Disk usage from application directory
        double diskUsagePct = 0;
        try
        {
            var appDir = AppDomain.CurrentDomain.BaseDirectory;
            var driveInfo = new System.IO.DriveInfo(System.IO.Path.GetPathRoot(appDir) ?? "C");
            if (driveInfo.IsReady && driveInfo.TotalSize > 0)
            {
                var usedBytes = driveInfo.TotalSize - driveInfo.AvailableFreeSpace;
                diskUsagePct = Math.Round((double)usedBytes / driveInfo.TotalSize * 100, 1);
            }
        }
        catch { /* ignore disk access errors */ }

        var overallStatus = dbStatus == "Healthy" ? "Healthy" : "Degraded";
        if (memoryUsagePct > 90 || diskUsagePct > 95) overallStatus = "Degraded";

        return new SystemHealthDto
        {
            Status = overallStatus,
            CpuUsage = 0, // CPU requires PerformanceCounter or OS-specific API
            MemoryUsage = memoryUsagePct,
            DiskUsage = diskUsagePct,
            DatabaseStatus = dbStatus,
            LastCheckTime = DateTime.UtcNow
        };
    }

    public async Task<List<SystemResourceDto>> GetSystemResourcesAsync()
    {
        try
        {
            var resources = new List<SystemResourceDto>();

            // Memory stats from GC and Process
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSetMB = process.WorkingSet64 / (1024.0 * 1024.0);
            var gcTotalMemMB = GC.GetTotalMemory(false) / (1024.0 * 1024.0);
            var maxWorkingSetMB = process.PeakWorkingSet64 / (1024.0 * 1024.0);

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Process Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(workingSetMB, 1),
                MaxValue = Math.Round(maxWorkingSetMB, 1),
                UtilizationPercentage = maxWorkingSetMB > 0 ? Math.Round(workingSetMB / maxWorkingSetMB * 100, 1) : 0
            });

            resources.Add(new SystemResourceDto
            {
                ResourceName = "GC Managed Memory",
                ResourceType = "RAM",
                CurrentValue = Math.Round(gcTotalMemMB, 1),
                MaxValue = Math.Round(workingSetMB, 1),
                UtilizationPercentage = workingSetMB > 0 ? Math.Round(gcTotalMemMB / workingSetMB * 100, 1) : 0
            });

            // Thread pool stats
            System.Threading.ThreadPool.GetAvailableThreads(out var workerAvail, out var ioAvail);
            System.Threading.ThreadPool.GetMaxThreads(out var workerMax, out var ioMax);
            var workerInUse = workerMax - workerAvail;

            resources.Add(new SystemResourceDto
            {
                ResourceName = "Thread Pool Workers",
                ResourceType = "Threads",
                CurrentValue = workerInUse,
                MaxValue = workerMax,
                UtilizationPercentage = workerMax > 0 ? Math.Round((double)workerInUse / workerMax * 100, 1) : 0
            });

            // Database connection check
            var dbConnected = await _context.Database.CanConnectAsync();
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Database",
                ResourceType = "Connection",
                CurrentValue = dbConnected ? 1 : 0,
                MaxValue = 1,
                UtilizationPercentage = dbConnected ? 100 : 0
            });

            // Active user sessions count
            var activeSessions = await _context.UserSessions.CountAsync(s => s.Status == 0);
            resources.Add(new SystemResourceDto
            {
                ResourceName = "Active Sessions",
                ResourceType = "Sessions",
                CurrentValue = activeSessions,
                MaxValue = 1000, // arbitrary max
                UtilizationPercentage = Math.Round(activeSessions / 10.0, 1) // % of 1000
            });

            return resources;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemResourcesAsync");
            return new List<SystemResourceDto>
            {
                new SystemResourceDto { ResourceName = "CPU", ResourceType = "Processor", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Memory", ResourceType = "RAM", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
                new SystemResourceDto { ResourceName = "Disk", ResourceType = "Storage", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 }
            };
        }
    }

    public async Task<List<DatabaseStatisticsDto>> GetDatabaseStatisticsAsync()
    {
        try
        {
            var results = new List<DatabaseStatisticsDto>();

            // Use raw SQL to query SQL Server system views for table statistics
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    t.NAME AS TableName,
                    p.rows AS RowCount,
                    SUM(a.total_pages) * 8 AS TotalSpaceKB,
                    SUM(a.used_pages) * 8 AS UsedSpaceKB,
                    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 AS UnusedSpaceKB
                FROM sys.tables t
                INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
                INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
                INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
                WHERE t.NAME NOT LIKE 'dt%'
                    AND t.is_ms_shipped = 0
                    AND i.OBJECT_ID > 255
                GROUP BY t.Name, p.Rows
                ORDER BY p.Rows DESC";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new DatabaseStatisticsDto
                {
                    TableName = reader.GetString(0),
                    RowCount = reader.GetInt64(1),
                    DataSize = reader.GetInt64(2) * 1024, // Convert KB to bytes
                    IndexSize = reader.GetInt64(3) * 1024  // UsedSpace as index proxy
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDatabaseStatisticsAsync");
            return new List<DatabaseStatisticsDto>();
        }
    }

    // 17.10 Quan ly tich hop (backed by HIEConnections table)
    public async Task<List<IntegrationConfigDto>> GetIntegrationConfigsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.HIEConnections.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            var items = await query.OrderBy(c => c.ConnectionName).ToListAsync();
            return items.Select(c => new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigsAsync");
            return new List<IntegrationConfigDto>();
        }
    }

    public async Task<IntegrationConfigDto> GetIntegrationConfigAsync(Guid integrationId)
    {
        try
        {
            var c = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == integrationId);
            if (c == null) return null;
            return new IntegrationConfigDto
            {
                Id = c.Id,
                IntegrationName = c.ConnectionName,
                IntegrationType = c.ConnectionType,
                Endpoint = c.EndpointUrl,
                AuthType = c.AuthType,
                IsActive = c.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<IntegrationConfigDto> SaveIntegrationConfigAsync(IntegrationConfigDto dto)
    {
        try
        {
            HIEConnection entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new HIEConnection
                {
                    ConnectionName = dto.IntegrationName ?? string.Empty,
                    ConnectionType = dto.IntegrationType ?? string.Empty,
                    EndpointUrl = dto.Endpoint ?? string.Empty,
                    AuthType = dto.AuthType ?? "APIKey",
                    IsActive = dto.IsActive
                };
                _context.HIEConnections.Add(entity);
            }
            else
            {
                entity = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == dto.Id);
                if (entity == null) return null;
                entity.ConnectionName = dto.IntegrationName ?? entity.ConnectionName;
                entity.ConnectionType = dto.IntegrationType ?? entity.ConnectionType;
                entity.EndpointUrl = dto.Endpoint ?? entity.EndpointUrl;
                entity.AuthType = dto.AuthType ?? entity.AuthType;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveIntegrationConfigAsync");
            return null;
        }
    }

    public async Task<bool> TestIntegrationConnectionAsync(Guid integrationId)
    {
        try
        {
            var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return false;

            // Attempt a basic HTTP HEAD request to the endpoint
            using var httpClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            var response = await httpClient.SendAsync(new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Head, conn.EndpointUrl));

            if (response.IsSuccessStatusCode)
            {
                conn.LastSuccessfulConnection = DateTime.UtcNow;
                conn.Status = "Active";
                conn.LastErrorMessage = null;
            }
            else
            {
                conn.LastFailedConnection = DateTime.UtcNow;
                conn.Status = "Error";
                conn.LastErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
            }
            await _context.SaveChangesAsync();
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TestIntegrationConnectionAsync");
            // Update connection status on failure
            try
            {
                var conn = await _context.HIEConnections.FirstOrDefaultAsync(c => c.Id == integrationId);
                if (conn != null)
                {
                    conn.LastFailedConnection = DateTime.UtcNow;
                    conn.Status = "Error";
                    conn.LastErrorMessage = ex.Message;
                    await _context.SaveChangesAsync();
                }
            }
            catch { /* swallow nested exception */ }
            return false;
        }
    }

    public async Task<List<IntegrationLogDto>> GetIntegrationLogsAsync(
        Guid integrationId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            // Query SystemLogs that reference integration activities
            var conn = await _context.HIEConnections.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == integrationId);
            if (conn == null) return new List<IntegrationLogDto>();

            var query = _context.SystemLogs.AsNoTracking()
                .Where(l => l.Message.Contains(conn.ConnectionName) || l.Message.Contains("Integration"))
                .AsQueryable();

            if (fromDate.HasValue)
                query = query.Where(l => l.CreatedAt >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(l => l.CreatedAt <= toDate.Value);

            var items = await query.OrderByDescending(l => l.CreatedAt).Take(100).ToListAsync();
            return items.Select(l => new IntegrationLogDto
            {
                Id = l.Id,
                IntegrationId = integrationId,
                IntegrationName = conn.ConnectionName,
                RequestTime = l.CreatedAt,
                ResponseTime = l.CreatedAt,
                Status = l.LogType,
                ErrorMessage = l.Exception
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetIntegrationLogsAsync");
            return new List<IntegrationLogDto>();
        }
    }

    // 17.11 Khoa dich vu (Service Locking)
    public async Task<List<LockedServiceDto>> GetLockedServicesAsync()
    {
        return await _context.LockedServices
            .OrderByDescending(l => l.LockedAt)
            .Select(l => new LockedServiceDto
            {
                Id = l.Id,
                ServiceId = l.ServiceId,
                ServiceName = l.ServiceName,
                ServiceCode = l.ServiceCode,
                ServiceType = l.ServiceType,
                ServiceTypeName = l.ServiceTypeName,
                IsLocked = l.IsLocked,
                LockReason = l.LockReason,
                LockedBy = l.LockedBy,
                LockedByName = l.LockedByName,
                LockedAt = l.LockedAt,
                UnlockedAt = l.UnlockedAt
            }).ToListAsync();
    }

    public async Task<LockedServiceDto> LockServiceAsync(LockServiceRequestDto dto, string userId, string userName)
    {
        // Check if already locked
        var existing = await _context.LockedServices
            .FirstOrDefaultAsync(l => l.ServiceId == dto.ServiceId && l.IsLocked);
        if (existing != null)
            throw new InvalidOperationException($"Service {dto.ServiceId} is already locked");

        var entity = new LockedService
        {
            Id = Guid.NewGuid(),
            ServiceId = dto.ServiceId,
            IsLocked = true,
            LockReason = dto.Reason,
            LockedBy = userId,
            LockedByName = userName,
            LockedAt = DateTime.UtcNow
        };

        // Try to resolve service name/code/type from Medicine, MedicalSupply, or Service tables
        var medicine = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.ServiceId);
        if (medicine != null)
        {
            entity.ServiceCode = medicine.MedicineCode;
            entity.ServiceName = medicine.MedicineName;
            entity.ServiceType = 1;
            entity.ServiceTypeName = "Thuốc";
        }
        else
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.ServiceId);
            if (service != null)
            {
                entity.ServiceCode = service.ServiceCode;
                entity.ServiceName = service.ServiceName;
                entity.ServiceType = 3;
                entity.ServiceTypeName = "DVKT";
            }
            else
            {
                entity.ServiceCode = "N/A";
                entity.ServiceName = "N/A";
                entity.ServiceType = 0;
                entity.ServiceTypeName = "Khác";
            }
        }

        _context.LockedServices.Add(entity);
        await _context.SaveChangesAsync();

        return new LockedServiceDto
        {
            Id = entity.Id,
            ServiceId = entity.ServiceId,
            ServiceName = entity.ServiceName,
            ServiceCode = entity.ServiceCode,
            ServiceType = entity.ServiceType,
            ServiceTypeName = entity.ServiceTypeName,
            IsLocked = entity.IsLocked,
            LockReason = entity.LockReason,
            LockedBy = entity.LockedBy,
            LockedByName = entity.LockedByName,
            LockedAt = entity.LockedAt,
            UnlockedAt = entity.UnlockedAt
        };
    }

    public async Task<bool> UnlockServiceAsync(UnlockServiceRequestDto dto)
    {
        var entity = await _context.LockedServices
            .FirstOrDefaultAsync(l => l.ServiceId == dto.ServiceId && l.IsLocked);
        if (entity == null) return false;
        entity.IsLocked = false;
        entity.UnlockedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

}
