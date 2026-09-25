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
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ExpiryAlertWorker: scan error");
            }
            try
            {
                await ScanLowStock(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ExpiryAlertWorker: low-stock scan error");
            }
            try { await Task.Delay(TimeSpan.FromHours(6), stoppingToken); }
            catch (OperationCanceledException) { break; }
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
            // Skip batches that already have an open alert and take the soonest-expiring first: before, the
            // unordered Take(500) kept returning already-alerted batches, so batch #501+ was never alerted.
            .Where(i => i.MedicineId != null && !db.ExpiryAlerts.Any(a => a.InventoryItemId == i.Id && a.Status < 2))
            .OrderBy(i => i.ExpiryDate)
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

    /// <summary>
    /// QA-R11: LowStockAlerts was read by the pharmacy alert list but nothing ever wrote it — "Cảnh báo tồn thấp" was
    /// permanently empty. Compare usable stock (not expired, not locked, minus reserved) with the active minimum per
    /// medicine × warehouse. A threshold without a warehouse is the default for every medicine store / pharmacy; a
    /// warehouse-specific one overrides it. Open alerts are refreshed, and resolved once stock is back above minimum.
    /// </summary>
    private async Task ScanLowStock(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var thresholds = await db.StockThresholds
            .Where(t => t.IsActive && !t.IsDeleted && t.MinimumQuantity > 0)
            .ToListAsync(ct);
        var openAlerts = await db.LowStockAlerts
            .Where(a => !a.IsDeleted && a.Status < 3)
            .ToListAsync(ct);
        if (thresholds.Count == 0 && openAlerts.Count == 0) return;

        var defaultWarehouses = await db.Warehouses
            .Where(w => w.IsActive && !w.IsDeleted && HIS.Core.Constants.WarehouseType.Dispensing.Contains(w.WarehouseType))
            .Select(w => w.Id)
            .ToListAsync(ct);

        // (medicine, warehouse) → effective threshold
        var effective = new Dictionary<(Guid, Guid), StockThreshold>();
        foreach (var t in thresholds.Where(t => t.WarehouseId == null))
            foreach (var w in defaultWarehouses)
                effective[(t.MedicineId, w)] = t;
        foreach (var t in thresholds.Where(t => t.WarehouseId != null))
            effective[(t.MedicineId, t.WarehouseId!.Value)] = t;

        var medIds = effective.Keys.Select(k => k.Item1).Distinct().ToList();
        var today = DateTime.Today;
        var stock = medIds.Count == 0
            ? new Dictionary<(Guid, Guid), decimal>()
            : (await db.InventoryItems
                .Where(i => !i.IsDeleted && !i.IsLocked && i.MedicineId != null && medIds.Contains(i.MedicineId.Value)
                    && (i.ExpiryDate == null || i.ExpiryDate >= today))
                .GroupBy(i => new { MedicineId = i.MedicineId!.Value, i.WarehouseId })
                .Select(g => new { g.Key.MedicineId, g.Key.WarehouseId, Qty = g.Sum(x => x.Quantity - x.ReservedQuantity) })
                .ToListAsync(ct))
                .ToDictionary(x => (x.MedicineId, x.WarehouseId), x => x.Qty);

        var changed = 0;
        var openByKey = openAlerts.GroupBy(a => (a.MedicineId, a.WarehouseId)).ToDictionary(g => g.Key, g => g.First());
        foreach (var ((medicineId, warehouseId), t) in effective)
        {
            var qty = stock.GetValueOrDefault((medicineId, warehouseId));
            openByKey.TryGetValue((medicineId, warehouseId), out var alert);
            if (qty > t.MinimumQuantity) continue; // resolved below
            var level = qty <= 0 ? 1 : qty <= t.MinimumQuantity / 2 ? 2 : 3;
            var suggested = Math.Max(t.ReorderQuantity, t.MaximumQuantity > 0 ? t.MaximumQuantity - qty : t.MinimumQuantity * 2 - qty);
            if (alert == null)
            {
                db.LowStockAlerts.Add(new LowStockAlert
                {
                    Id = Guid.NewGuid(),
                    MedicineId = medicineId,
                    WarehouseId = warehouseId,
                    CurrentQuantity = qty,
                    MinimumQuantity = t.MinimumQuantity,
                    ReorderPoint = t.ReorderPoint,
                    SuggestedOrderQuantity = Math.Max(0, suggested),
                    AlertLevel = level,
                    Status = 0,
                    CreatedAt = DateTime.UtcNow,
                });
                changed++;
            }
            else if (alert.CurrentQuantity != qty || alert.MinimumQuantity != t.MinimumQuantity)
            {
                if (level < alert.AlertLevel && alert.Status == 1) alert.Status = 0; // got worse → notify again
                alert.CurrentQuantity = qty;
                alert.MinimumQuantity = t.MinimumQuantity;
                alert.AlertLevel = level;
                alert.SuggestedOrderQuantity = Math.Max(0, suggested);
                alert.UpdatedAt = DateTime.UtcNow;
                changed++;
            }
        }
        // Stock back above the minimum (or threshold removed) → close the alert.
        foreach (var alert in openAlerts)
        {
            var key = (alert.MedicineId, alert.WarehouseId);
            if (effective.TryGetValue(key, out var t) && stock.GetValueOrDefault(key) <= t.MinimumQuantity) continue;
            alert.Status = 3;
            alert.Notes = string.IsNullOrWhiteSpace(alert.Notes) ? "Tự đóng: tồn đã trên mức tối thiểu" : alert.Notes;
            alert.UpdatedAt = DateTime.UtcNow;
            changed++;
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("ExpiryAlertWorker: low-stock alerts changed {Count}", changed);
        }
    }

    private static int LevelFor(DateTime expiryDate, DateTime cutoff1m, DateTime cutoff3m)
        => expiryDate <= cutoff1m ? 1 : expiryDate <= cutoff3m ? 2 : 3;
}
