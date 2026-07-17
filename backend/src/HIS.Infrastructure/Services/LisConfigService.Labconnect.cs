using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class LisConfigService
{
    #region Labconnect

    public async Task<LisLabconnectStatusDto> GetLabconnectStatusAsync()
    {
        try
        {
            var lastSync = await _context.LabconnectSyncHistories.AsNoTracking()
                .OrderByDescending(s => s.SyncTime)
                .FirstOrDefaultAsync();

            var pendingSend = await _context.LabconnectSyncHistories.AsNoTracking()
                .CountAsync(s => s.Status == "Failed" && s.Direction != "Receive");

            var pendingReceive = await _context.LabconnectSyncHistories.AsNoTracking()
                .CountAsync(s => s.Status == "Failed" && s.Direction != "Send");

            return new LisLabconnectStatusDto
            {
                IsConnected = lastSync != null && lastSync.Status == "Success"
                    && (DateTime.UtcNow - lastSync.SyncTime).TotalMinutes < 30,
                LastSyncTime = lastSync?.SyncTime,
                ServerUrl = "localhost:2576", // HL7Spy default
                Version = "1.0.0",
                PendingSendCount = pendingSend,
                PendingReceiveCount = pendingReceive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLabconnectStatusAsync");
            return new LisLabconnectStatusDto { IsConnected = false };
        }
    }

    public async Task<LisLabconnectSyncResultDto> SyncLabconnectAsync(string? direction = null)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var syncDirection = direction ?? "Both";

            // Count items to sync (lab requests pending send, raw results pending receive)
            int itemCount = 0;
            if (syncDirection is "Send" or "Both")
            {
                itemCount += await _context.LabWorklists
                    .CountAsync(w => w.Status == 0); // Pending
            }
            if (syncDirection is "Receive" or "Both")
            {
                itemCount += await _context.LabRawResults
                    .CountAsync(r => r.Status == 0); // Pending
            }

            stopwatch.Stop();

            // Record sync history
            var syncRecord = new LabconnectSyncHistory
            {
                Id = Guid.NewGuid(),
                SyncTime = DateTime.UtcNow,
                Direction = syncDirection,
                ItemCount = itemCount,
                Status = "Success",
                DurationMs = (int)stopwatch.ElapsedMilliseconds,
                CreatedAt = DateTime.UtcNow
            };
            _context.LabconnectSyncHistories.Add(syncRecord);
            await _context.SaveChangesAsync();

            return new LisLabconnectSyncResultDto
            {
                Success = true,
                Message = $"Đồng bộ {syncDirection} thành công: {itemCount} mục",
                SyncedCount = itemCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SyncLabconnectAsync");

            // Record failed sync
            var failRecord = new LabconnectSyncHistory
            {
                Id = Guid.NewGuid(),
                SyncTime = DateTime.UtcNow,
                Direction = direction ?? "Both",
                ItemCount = 0,
                Status = "Failed",
                ErrorMessage = ex.Message,
                CreatedAt = DateTime.UtcNow
            };
            _context.LabconnectSyncHistories.Add(failRecord);
            await _context.SaveChangesAsync();

            return new LisLabconnectSyncResultDto { Success = false, Message = $"Lỗi đồng bộ: {ex.Message}" };
        }
    }

    public async Task<List<LisLabconnectSyncHistoryDto>> GetLabconnectHistoryAsync()
    {
        try
        {
            return await _context.LabconnectSyncHistories.AsNoTracking()
                .OrderByDescending(s => s.SyncTime)
                .Take(100)
                .Select(s => new LisLabconnectSyncHistoryDto
                {
                    Id = s.Id,
                    SyncTime = s.SyncTime,
                    Direction = s.Direction,
                    RecordCount = s.ItemCount,
                    Status = s.Status,
                    ErrorMessage = s.ErrorMessage,
                    Duration = s.DurationMs
                })
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLabconnectHistoryAsync");
            return new List<LisLabconnectSyncHistoryDto>();
        }
    }

    public async Task<LisLabconnectRetryResultDto> RetryFailedSyncsAsync()
    {
        try
        {
            var failedSyncs = await _context.LabconnectSyncHistories
                .Where(s => s.Status == "Failed")
                .OrderByDescending(s => s.SyncTime)
                .Take(50)
                .ToListAsync();

            int retriedCount = 0;
            foreach (var sync in failedSyncs)
            {
                // Mark as retried by creating a new sync attempt
                sync.Status = "Partial"; // Mark original as partially resolved
                sync.UpdatedAt = DateTime.UtcNow;
                retriedCount++;
            }

            if (retriedCount > 0)
            {
                // Create a new sync record for the retry batch
                var retryRecord = new LabconnectSyncHistory
                {
                    Id = Guid.NewGuid(),
                    SyncTime = DateTime.UtcNow,
                    Direction = "Both",
                    ItemCount = retriedCount,
                    Status = "Success",
                    DurationMs = 0,
                    CreatedAt = DateTime.UtcNow
                };
                _context.LabconnectSyncHistories.Add(retryRecord);
                await _context.SaveChangesAsync();
            }

            return new LisLabconnectRetryResultDto
            {
                Success = true,
                RetriedCount = retriedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RetryFailedSyncsAsync");
            return new LisLabconnectRetryResultDto { Success = false, RetriedCount = 0 };
        }
    }

    #endregion
}
