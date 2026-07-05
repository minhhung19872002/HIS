using HIS.Application.Common;
using HIS.Application.DTOs.StockLedgerReport;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Sổ chi tiết chuyển động kho (line-level theo ngày) — tách khỏi StockLedgerReportController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên; return map về ServiceOutcome.
/// </summary>
public class StockLedgerReportService : IStockLedgerReportService
{
    private readonly HISDbContext _db;
    public StockLedgerReportService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> GetAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        var to = toDate.Date.AddDays(1).AddSeconds(-1);
        var from = fromDate.Date;

        var imports = await _db.ImportReceiptDetails.AsNoTracking()
            .Where(d => d.ImportReceipt.WarehouseId == warehouseId && d.ImportReceipt.Status == 1
                        && d.ImportReceipt.ReceiptDate >= from && d.ImportReceipt.ReceiptDate <= to)
            .Select(d => new { d.ImportReceipt.ReceiptDate, d.ImportReceipt.ReceiptCode, d.MedicineId, d.SupplyId, Qty = d.Quantity, d.UnitPrice, d.Unit })
            .ToListAsync();

        var exports = await _db.ExportReceiptDetails.AsNoTracking()
            .Where(d => d.ExportReceipt.WarehouseId == warehouseId && d.ExportReceipt.Status == 1
                        && d.ExportReceipt.ReceiptDate >= from && d.ExportReceipt.ReceiptDate <= to)
            .Select(d => new { d.ExportReceipt.ReceiptDate, d.ExportReceipt.ReceiptCode, d.MedicineId, d.SupplyId, Qty = d.Quantity, d.UnitPrice, d.Unit })
            .ToListAsync();

        var medIds = imports.Select(x => x.MedicineId).Concat(exports.Select(x => x.MedicineId)).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var supIds = imports.Select(x => x.SupplyId).Concat(exports.Select(x => x.SupplyId)).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var meds = await _db.Medicines.AsNoTracking().Where(m => medIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName }).ToDictionaryAsync(m => m.Id, m => m);
        var sups = await _db.MedicalSupplies.AsNoTracking().Where(s => supIds.Contains(s.Id))
            .Select(s => new { s.Id, s.SupplyCode, s.SupplyName }).ToDictionaryAsync(s => s.Id, s => s);

        (string code, string name) Resolve(Guid? medId, Guid? supId)
        {
            if (medId != null && meds.TryGetValue(medId.Value, out var m)) return (m.MedicineCode, m.MedicineName);
            if (supId != null && sups.TryGetValue(supId.Value, out var s)) return (s.SupplyCode, s.SupplyName ?? "");
            return ("", "");
        }

        var lines = new List<StockLedgerLineDto>();
        foreach (var i in imports)
        {
            var (code, name) = Resolve(i.MedicineId, i.SupplyId);
            if (code.Length == 0) continue;
            lines.Add(new StockLedgerLineDto(i.ReceiptDate, code, name, i.Unit, i.Qty, 0, i.UnitPrice, i.ReceiptCode, "Import"));
        }
        foreach (var e in exports)
        {
            var (code, name) = Resolve(e.MedicineId, e.SupplyId);
            if (code.Length == 0) continue;
            lines.Add(new StockLedgerLineDto(e.ReceiptDate, code, name, e.Unit, 0, e.Qty, e.UnitPrice, e.ReceiptCode, "Export"));
        }

        return ServiceOutcome.Ok(lines.OrderBy(l => l.Date).ToList());
    }
}
