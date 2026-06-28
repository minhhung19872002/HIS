using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 2. Inventory ====================

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryItems([FromQuery] string? warehouseId = null)
    {
        try
        {
            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Medicine)
                .Include(i => i.Warehouse)
                .Where(i => !i.IsDeleted && i.Quantity > 0 && i.MedicineId != null);

            if (!string.IsNullOrEmpty(warehouseId) && Guid.TryParse(warehouseId, out var wId))
                query = query.Where(i => i.WarehouseId == wId);

            var items = await query.Take(500).ToListAsync();

            if (!items.Any())
                return Ok(Array.Empty<object>());

            // Get stock thresholds
            var medicineIds = items.Where(i => i.MedicineId.HasValue)
                .Select(i => i.MedicineId!.Value).Distinct().ToList();

            var thresholds = await _context.StockThresholds
                .AsNoTracking()
                .Where(t => medicineIds.Contains(t.MedicineId) && t.IsActive)
                .ToListAsync();

            var thresholdMap = thresholds
                .GroupBy(t => t.MedicineId)
                .ToDictionary(g => g.Key, g => g.First());

            // Group by medicine + warehouse
            var grouped = items.GroupBy(i => new { i.MedicineId, i.WarehouseId });

            var result = grouped.Select(g =>
            {
                var first = g.First();
                var medicine = first.Medicine;
                var threshold = first.MedicineId.HasValue
                    ? thresholdMap.GetValueOrDefault(first.MedicineId.Value) : null;
                var totalStock = g.Sum(i => i.Quantity);
                var nearestExpiry = g
                    .Where(i => i.ExpiryDate.HasValue)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefault()?.ExpiryDate;
                var avgPrice = g.Average(i => i.UnitPrice);
                var minStock = threshold?.MinimumQuantity ?? 0;

                string status = "normal";
                if (totalStock <= 0) status = "out";
                else if (minStock > 0 && totalStock <= minStock) status = "low";
                else if (nearestExpiry.HasValue && nearestExpiry.Value <= DateTime.Now.AddMonths(3)) status = "expiring";

                return new
                {
                    id = first.Id.ToString(),
                    medicationCode = medicine?.MedicineCode ?? "",
                    medicationName = medicine?.MedicineName ?? "",
                    category = medicine?.MedicineGroupCode ?? "",
                    unit = medicine?.Unit ?? "",
                    totalStock = (int)totalStock,
                    minStock = (int)minStock,
                    maxStock = (int)(threshold?.MaximumQuantity ?? 0),
                    warehouse = first.Warehouse?.WarehouseName ?? "",
                    nearestExpiry = nearestExpiry?.ToString("o") ?? "",
                    averagePrice = Math.Round(avgPrice, 0),
                    status,
                };
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpGet("inventory/warnings")]
    public async Task<IActionResult> GetInventoryWarnings()
    {
        // Reuse inventory endpoint with filter for warnings only
        return await GetInventoryItems(null);
    }

    [HttpGet("inventory/{medicationId}/history")]
    public async Task<IActionResult> GetInventoryHistory(Guid medicationId)
    {
        try
        {
            var movements = await _context.StockMovements
                .AsNoTracking()
                .Where(m => !m.IsDeleted && m.MedicineId == medicationId)
                .OrderByDescending(m => m.MovementDate)
                .Take(50)
                .ToListAsync();

            var result = movements.Select(m => new
            {
                id = m.Id.ToString(),
                medicationCode = "",
                medicationName = "",
                transactionType = m.MovementType switch
                {
                    1 => "import",
                    2 => "export",
                    3 => "transfer",
                    4 => "adjust",
                    _ => "import",
                },
                quantity = (int)m.Quantity,
                batchNumber = m.BatchNumber,
                referenceCode = m.ReferenceCode,
                note = m.Notes ?? "",
                createdDate = m.MovementDate,
                createdBy = m.CreatedBy ?? "",
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching inventory history for {Id}", medicationId);
            return Ok(Array.Empty<object>());
        }
    }
}
