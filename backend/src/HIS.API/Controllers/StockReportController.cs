using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Báo cáo tồn kho — N1.06.
/// 4 báo cáo: chi tiết theo lô/HSD, tổng hợp theo thuốc, sắp hết hạn, tồn thấp.
/// </summary>
[ApiController]
[Route("api/stock-report")]
[Authorize]
public class StockReportController : ControllerBase
{
    private readonly HISDbContext _db;
    public StockReportController(HISDbContext db) { _db = db; }

    /// <summary>BC1 — Tồn kho chi tiết theo lô / HSD / kho</summary>
    [HttpGet("detail")]
    public async Task<IActionResult> Detail(
        [FromQuery] Guid? warehouseId,
        [FromQuery] Guid? medicineId,
        [FromQuery] string? keyword,
        [FromQuery] bool? onlyAvailable = true)
    {
        var q = _db.InventoryItems
            .Include(i => i.Warehouse)
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .AsQueryable();
        if (warehouseId.HasValue) q = q.Where(i => i.WarehouseId == warehouseId.Value);
        if (medicineId.HasValue) q = q.Where(i => i.MedicineId == medicineId.Value);
        if (onlyAvailable == true) q = q.Where(i => i.Quantity > 0);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(i =>
                (i.Medicine != null && (i.Medicine.MedicineName.Contains(kw) || i.Medicine.MedicineCode.Contains(kw)))
                || (i.Supply != null && (i.Supply.SupplyName.Contains(kw) || i.Supply.SupplyCode.Contains(kw)))
                || (i.BatchNumber != null && i.BatchNumber.Contains(kw)));
        }

        var list = await q
            .OrderBy(i => i.Warehouse.WarehouseName)
            .ThenBy(i => i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""))
            .ThenBy(i => i.ExpiryDate)
            .Take(2000)
            .ToListAsync();

        return Ok(new
        {
            count = list.Count,
            totalValue = list.Sum(i => i.Quantity * i.ImportPrice),
            items = list.Select(i => new
            {
                i.Id,
                WarehouseName = i.Warehouse.WarehouseName,
                ItemType = i.ItemType,
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : null),
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : null),
                Unit = i.Medicine != null ? i.Medicine.Unit : (i.Supply != null ? i.Supply.Unit : null),
                i.BatchNumber,
                i.ExpiryDate,
                i.ManufactureDate,
                i.Quantity,
                i.ReservedQuantity,
                Available = i.Quantity - i.ReservedQuantity,
                i.ImportPrice,
                i.UnitPrice,
                Value = i.Quantity * i.ImportPrice,
                i.IsLocked,
                i.LockReason,
                DaysToExpiry = i.ExpiryDate.HasValue
                    ? (int?)Math.Ceiling((i.ExpiryDate.Value - DateTime.Today).TotalDays)
                    : null,
            })
        });
    }

    /// <summary>BC2 — Tồn kho tổng hợp theo thuốc (gộp các lô)</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromQuery] Guid? warehouseId,
        [FromQuery] string? keyword)
    {
        var q = _db.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0);
        if (warehouseId.HasValue) q = q.Where(i => i.WarehouseId == warehouseId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(i =>
                (i.Medicine != null && (i.Medicine.MedicineName.Contains(kw) || i.Medicine.MedicineCode.Contains(kw)))
                || (i.Supply != null && (i.Supply.SupplyName.Contains(kw) || i.Supply.SupplyCode.Contains(kw))));
        }

        var list = await q.ToListAsync();
        var grouped = list
            .GroupBy(i => new
            {
                i.ItemType,
                i.MedicineId,
                i.SupplyId,
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : null),
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : null),
                Unit = i.Medicine != null ? i.Medicine.Unit : (i.Supply != null ? i.Supply.Unit : null),
            })
            .Select(g => new
            {
                g.Key.ItemType,
                g.Key.MedicineId,
                g.Key.SupplyId,
                g.Key.ItemCode,
                g.Key.ItemName,
                g.Key.Unit,
                totalQuantity = g.Sum(x => x.Quantity),
                reservedQuantity = g.Sum(x => x.ReservedQuantity),
                available = g.Sum(x => x.Quantity - x.ReservedQuantity),
                totalValue = g.Sum(x => x.Quantity * x.ImportPrice),
                batchCount = g.Count(),
                nearestExpiry = g.Where(x => x.ExpiryDate.HasValue).Min(x => x.ExpiryDate),
            })
            .OrderBy(g => g.ItemName)
            .ToList();

        return Ok(new
        {
            count = grouped.Count,
            totalValue = grouped.Sum(g => g.totalValue),
            items = grouped,
        });
    }

    /// <summary>BC3 — Thuốc sắp hết hạn (mặc định 90 ngày)</summary>
    [HttpGet("expiring")]
    public async Task<IActionResult> Expiring(
        [FromQuery] Guid? warehouseId,
        [FromQuery] int days = 90)
    {
        var deadline = DateTime.Today.AddDays(days);
        var q = _db.InventoryItems
            .Include(i => i.Warehouse)
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0
                && i.ExpiryDate != null
                && i.ExpiryDate < deadline);
        if (warehouseId.HasValue) q = q.Where(i => i.WarehouseId == warehouseId.Value);

        var list = await q.OrderBy(i => i.ExpiryDate).Take(500).ToListAsync();

        return Ok(new
        {
            count = list.Count,
            totalValue = list.Sum(i => i.Quantity * i.ImportPrice),
            items = list.Select(i => new
            {
                i.Id,
                WarehouseName = i.Warehouse.WarehouseName,
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : null),
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : null),
                Unit = i.Medicine != null ? i.Medicine.Unit : (i.Supply != null ? i.Supply.Unit : null),
                i.BatchNumber,
                i.ExpiryDate,
                i.Quantity,
                Value = i.Quantity * i.ImportPrice,
                DaysToExpiry = i.ExpiryDate.HasValue
                    ? (int)Math.Ceiling((i.ExpiryDate.Value - DateTime.Today).TotalDays)
                    : 0,
                Severity = i.ExpiryDate.HasValue && i.ExpiryDate < DateTime.Today ? "expired"
                    : i.ExpiryDate.HasValue && i.ExpiryDate < DateTime.Today.AddDays(30) ? "critical"
                    : "warning",
            })
        });
    }

    /// <summary>BC4 — Tồn thấp (dưới ngưỡng, mặc định 10 đơn vị)</summary>
    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock(
        [FromQuery] Guid? warehouseId,
        [FromQuery] decimal threshold = 10)
    {
        var q = _db.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0);
        if (warehouseId.HasValue) q = q.Where(i => i.WarehouseId == warehouseId.Value);

        var list = await q.ToListAsync();
        var grouped = list
            .GroupBy(i => new
            {
                i.MedicineId,
                i.SupplyId,
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : null),
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : null),
                Unit = i.Medicine != null ? i.Medicine.Unit : (i.Supply != null ? i.Supply.Unit : null),
            })
            .Where(g => g.Sum(x => x.Quantity - x.ReservedQuantity) <= threshold)
            .Select(g => new
            {
                g.Key.MedicineId,
                g.Key.SupplyId,
                g.Key.ItemCode,
                g.Key.ItemName,
                g.Key.Unit,
                available = g.Sum(x => x.Quantity - x.ReservedQuantity),
                totalQuantity = g.Sum(x => x.Quantity),
                threshold,
            })
            .OrderBy(g => g.available)
            .ToList();

        return Ok(new
        {
            count = grouped.Count,
            items = grouped,
        });
    }
}
