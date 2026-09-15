using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class ExpiryAlertWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiryAlertWorker> _logger;

    public ExpiryAlertWorker(IServiceScopeFactory scopeFactory, ILogger<ExpiryAlertWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanExpiringItems(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ExpiryAlertWorker: scan error");
            }
            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }

    private async Task ScanExpiringItems(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var cutoff6m = DateTime.UtcNow.AddMonths(6);
        var cutoff3m = DateTime.UtcNow.AddMonths(3);
        var cutoff1m = DateTime.UtcNow.AddMonths(1);

        var expiringItems = await db.InventoryItems
            .Where(i => !i.IsDeleted && i.Quantity > 0 && i.ExpiryDate != null && i.ExpiryDate <= cutoff6m)
            .Select(i => new { i.Id, i.MedicineId, i.WarehouseId, i.BatchNumber, i.ExpiryDate, i.Quantity })
            .Take(500)
            .ToListAsync(ct);

        // Open alerts are re-evaluated every scan. Before, AlertLevel was frozen at creation: a batch first seen at
        // "3-6 months" (level 3) stayed level 3 until it expired, and the login popup only shows level <= 2, so it
        // never warned. Alerts whose batch was used up / deleted also stayed open forever with a stale quantity.
        var openAlerts = await db.ExpiryAlerts
            .Where(a => a.Status < 2)
            .ToListAsync(ct);
        var existingAlertKeys = openAlerts.Select(a => a.InventoryItemId).ToHashSet();

        var openItemIds = existingAlertKeys.ToList();
        var liveItems = openItemIds.Count == 0
            ? new Dictionary<Guid, (decimal Quantity, DateTime? ExpiryDate)>()
            : (await db.InventoryItems
                .Where(i => openItemIds.Contains(i.Id) && !i.IsDeleted && i.Quantity > 0)
                .Select(i => new { i.Id, i.Quantity, i.ExpiryDate })
                .ToListAsync(ct))
                .ToDictionary(i => i.Id, i => (i.Quantity, i.ExpiryDate));

        var updatedAlerts = 0;
        foreach (var alert in openAlerts)
        {
            if (!liveItems.TryGetValue(alert.InventoryItemId, out var live))
            {
                alert.Status = 2; // Resolved: batch no longer in stock
                alert.Notes = string.IsNullOrWhiteSpace(alert.Notes) ? "Tự đóng: lô đã hết tồn/xóa" : alert.Notes;
                alert.UpdatedAt = DateTime.UtcNow;
                updatedAlerts++;
                continue;
            }
            var level = LevelFor(live.ExpiryDate ?? alert.ExpiryDate, cutoff1m, cutoff3m);
            if (level < alert.AlertLevel || live.Quantity != alert.Quantity)
            {
                if (level < alert.AlertLevel && alert.Status == 1) alert.Status = 0; // escalated → notify again
                alert.AlertLevel = Math.Min(level, alert.AlertLevel);
                alert.Quantity = live.Quantity;
                alert.UpdatedAt = DateTime.UtcNow;
                updatedAlerts++;
            }
        }

        var newAlerts = 0;
        foreach (var item in expiringItems)
        {
            if (existingAlertKeys.Contains(item.Id)) continue;
            if (!item.MedicineId.HasValue || !item.ExpiryDate.HasValue) continue;

            var alertLevel = LevelFor(item.ExpiryDate.Value, cutoff1m, cutoff3m);

            db.ExpiryAlerts.Add(new ExpiryAlert
            {
                Id = Guid.NewGuid(),
                MedicineId = item.MedicineId.Value,
                WarehouseId = item.WarehouseId,
                InventoryItemId = item.Id,
                BatchNumber = item.BatchNumber ?? "",
                ExpiryDate = item.ExpiryDate.Value,
                Quantity = item.Quantity,
                AlertLevel = alertLevel,
                Status = 0,
                CreatedAt = DateTime.UtcNow,
            });
            newAlerts++;
        }

        if (newAlerts > 0 || updatedAlerts > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("ExpiryAlertWorker: created {Count} new expiry alerts, updated {Updated}", newAlerts, updatedAlerts);
        }
    }

    private static int LevelFor(DateTime expiryDate, DateTime cutoff1m, DateTime cutoff3m)
        => expiryDate <= cutoff1m ? 1 : expiryDate <= cutoff3m ? 2 : 3;
}
