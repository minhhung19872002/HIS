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

        var existingAlertKeys = await db.ExpiryAlerts
            .Where(a => a.Status < 2)
            .Select(a => a.InventoryItemId)
            .ToHashSetAsync(ct);

        var newAlerts = 0;
        foreach (var item in expiringItems)
        {
            if (existingAlertKeys.Contains(item.Id)) continue;
            if (!item.MedicineId.HasValue || !item.ExpiryDate.HasValue) continue;

            var alertLevel = item.ExpiryDate <= cutoff1m ? 1 : item.ExpiryDate <= cutoff3m ? 2 : 3;

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

        if (newAlerts > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("ExpiryAlertWorker: created {Count} new expiry alerts", newAlerts);
        }
    }
}
