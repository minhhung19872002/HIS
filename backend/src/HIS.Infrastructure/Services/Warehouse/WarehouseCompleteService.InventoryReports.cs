using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// #364 wave-8b (2026-07-17): tach nhom bao cao (Stock Card/Movement/Dept Usage) khoi WarehouseCompleteService.Inventory.cs
public partial class WarehouseCompleteService {
    #region 5.3 Ton kho - Bao cao

    // ════════════════════════════════════════════════════════════════════════════════════════
    // QA0915 wave 2: thẻ kho + báo cáo NXT trước đây đọc bảng `StockMovements` — bảng mà KHÔNG đường
    // ghi nào trong hệ thống từng ghi (0 dòng), nên thẻ kho / NXT luôn rỗng; bản in NXT còn lấy tồn HIỆN
    // TẠI làm "tồn đầu kỳ" với nhập = xuất = 0. Thay vì rải ghi StockMovements vào mọi đường nhập/xuất
    // (nhiều module khác nhau), dựng lại từ đúng các chứng từ đang là nguồn sự thật — cùng nguồn với
    // StockLedgerReportService: phiếu nhập đã duyệt, phiếu xuất đã xuất (không tính phiếu hủy / phiếu
    // gốc đã gộp), dòng bán lẻ đã hoàn tất. Tồn đầu kỳ = tồn hiện tại − phát sinh ròng từ đầu kỳ tới nay,
    // nên neo vào số tồn thật; mọi kỳ và tồn cuối kỳ tự khớp: đầu + nhập − xuất = cuối.
    // Giới hạn đã biết: module trừ kho trực tiếp không qua chứng từ (vật tư VP, CĐHA, YHCT, PTTT, dự trù
    // loại ≠ 1) không hiện dòng phát sinh — phần đó dồn vào tồn đầu kỳ.
    // ════════════════════════════════════════════════════════════════════════════════════════

    private sealed record StockDocLine(
        DateTime Date, string DocumentCode, Guid ItemId, bool IsSupply, string TransactionType,
        decimal Received, decimal Issued, decimal UnitPrice, string? Note);

    private static string ImportTypeLabel(int t) => t switch
    {
        1 => "Nhap NCC", 2 => "Nhap khac", 3 => "Nhap chuyen kho", 4 => "Hoan tra khoa",
        5 => "Hoan tra kho", 6 => "Kiem ke tang", _ => "Nhap kho"
    };

    private static string ExportTypeLabel(int t) => t switch
    {
        1 => "Xuat BN ngoai tru", 2 => "Xuat BN noi tru", 3 => "Xuat khoa phong", 4 => "Xuat chuyen kho",
        5 => "Tra NCC", 6 => "Xuat ngoai", 7 => "Xuat huy", 8 => "Xuat mau", 9 => "Kiem ke giam",
        10 => "Thanh ly", 12 => "Xuat tu truc", _ => "Xuat kho"
    };

    /// <summary>Mọi dòng chứng từ làm đổi tồn của kho (tuỳ chọn: một mặt hàng) từ <paramref name="from"/> tới nay.</summary>
    private async Task<List<StockDocLine>> LoadStockDocLinesAsync(Guid warehouseId, Guid? itemId, DateTime from)
    {
        var imports = await _context.ImportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && !d.ImportReceipt.IsDeleted
                && d.ImportReceipt.WarehouseId == warehouseId && d.ImportReceipt.Status == 1
                && d.ImportReceipt.ReceiptDate >= from
                && (itemId == null || d.MedicineId == itemId || d.SupplyId == itemId))
            .Select(d => new { d.ImportReceipt.ReceiptDate, d.ImportReceipt.ReceiptCode, d.ImportReceipt.ImportType, d.MedicineId, d.SupplyId, d.Quantity, d.UnitPrice, d.ImportReceipt.Note })
            .ToListAsync();

        var exports = await _context.ExportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && !d.ExportReceipt.IsDeleted
                && d.ExportReceipt.WarehouseId == warehouseId && d.ExportReceipt.Status == 1
                && d.ExportReceipt.ReceiptDate >= from
                && (itemId == null || d.MedicineId == itemId || d.SupplyId == itemId))
            .Select(d => new { d.ExportReceipt.ReceiptDate, d.ExportReceipt.ReceiptCode, d.ExportReceipt.ExportType, d.MedicineId, d.SupplyId, d.Quantity, d.UnitPrice, d.ExportReceipt.Note })
            .ToListAsync();

        // RetailSale.CreatedAt is UTC while receipt dates are local (UTC+7).
        var fromUtc = from.AddHours(-7);
        var sales = await _context.RetailSaleItems.AsNoTracking()
            .Where(i => !i.IsDeleted && i.WarehouseId == warehouseId
                && i.RetailSale != null && !i.RetailSale.IsDeleted && i.RetailSale.Status == "Completed"
                && i.RetailSale.CreatedAt >= fromUtc
                && (itemId == null || i.MedicineId == itemId))
            .Select(i => new { i.RetailSale!.CreatedAt, i.RetailSale.SaleCode, i.MedicineId, i.Quantity, i.UnitPrice })
            .ToListAsync();

        var lines = new List<StockDocLine>(imports.Count + exports.Count + sales.Count);
        lines.AddRange(imports.Where(x => x.MedicineId.HasValue || x.SupplyId.HasValue).Select(x => new StockDocLine(
            x.ReceiptDate, x.ReceiptCode, (x.MedicineId ?? x.SupplyId)!.Value, !x.MedicineId.HasValue,
            ImportTypeLabel(x.ImportType), x.Quantity, 0, x.UnitPrice, x.Note)));
        lines.AddRange(exports.Where(x => x.MedicineId.HasValue || x.SupplyId.HasValue).Select(x => new StockDocLine(
            x.ReceiptDate, x.ReceiptCode, (x.MedicineId ?? x.SupplyId)!.Value, !x.MedicineId.HasValue,
            ExportTypeLabel(x.ExportType), 0, x.Quantity, x.UnitPrice, x.Note)));
        lines.AddRange(sales.Select(x => new StockDocLine(
            x.CreatedAt.AddHours(7), x.SaleCode, x.MedicineId, false, "Ban le", 0, x.Quantity, x.UnitPrice, null)));
        return lines.OrderBy(l => l.Date).ThenBy(l => l.DocumentCode).ToList();
    }

    public async Task<byte[]> PrintStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var card = await GetStockCardAsync(warehouseId, itemId, fromDate, toDate);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">THE KHO</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}</div>");

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Kho:</span><span class=""field-value"">{Esc(card.WarehouseName)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ten hang:</span><span class=""field-value"">{Esc(card.ItemName)} ({Esc(card.ItemCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">DVT:</span><span class=""field-value"">{Esc(card.Unit)}</span></div>");

            body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
                <th>Ngay</th><th>So chung tu</th><th>Dien giai</th><th>Nhap</th><th>Xuat</th><th>Ton</th>
            </tr></thead><tbody>");
            body.AppendLine($@"<tr><td>{fromDate:dd/MM/yyyy}</td><td>Ton dau ky</td><td></td><td></td><td></td><td class=""text-right"">{card.OpeningQuantity:#,##0.##}</td></tr>");

            foreach (var entry in card.Entries)
            {
                body.AppendLine($@"<tr>
                    <td>{entry.TransactionDate:dd/MM/yyyy}</td>
                    <td>{Esc(entry.DocumentCode)}</td>
                    <td>{Esc(entry.TransactionType)}</td>
                    <td class=""text-right"">{(entry.ReceivedQuantity > 0 ? entry.ReceivedQuantity.ToString("#,##0.##") : "")}</td>
                    <td class=""text-right"">{(entry.IssuedQuantity > 0 ? entry.IssuedQuantity.ToString("#,##0.##") : "")}</td>
                    <td class=""text-right"">{entry.Balance:#,##0.##}</td>
                </tr>");
            }

            var totalImport = card.Entries.Sum(e => e.ReceivedQuantity);
            var totalExport = card.Entries.Sum(e => e.IssuedQuantity);
            body.AppendLine($@"<tr><td colspan=""3"" class=""text-right""><b>Tong:</b></td><td class=""text-right""><b>{totalImport:#,##0.##}</b></td><td class=""text-right""><b>{totalExport:#,##0.##}</b></td><td class=""text-right""><b>{card.ClosingQuantity:#,##0.##}</b></td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(null, null, null, false));

            var html = WrapHtmlPage("The kho", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<StockCardDto> GetStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var toExclusive = toDate.Date.AddDays(1);

        var warehouse = await _context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w => w.Id == warehouseId);
        var medicine = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == itemId);
        var supply = medicine == null
            ? await _context.MedicalSupplies.AsNoTracking()
                .Where(s => s.Id == itemId).Select(s => new { s.SupplyCode, s.SupplyName, s.Unit }).FirstOrDefaultAsync()
            : null;

        var currentStock = await _context.InventoryItems.AsNoTracking()
            .Where(i => i.WarehouseId == warehouseId && !i.IsDeleted && (i.MedicineId == itemId || i.SupplyId == itemId))
            .SumAsync(i => (decimal?)i.Quantity) ?? 0;

        var lines = await LoadStockDocLinesAsync(warehouseId, itemId, from);
        var opening = currentStock - lines.Sum(l => l.Received - l.Issued);

        var balance = opening;
        var entries = new List<StockCardEntryDto>();
        foreach (var l in lines.Where(l => l.Date < toExclusive))
        {
            balance += l.Received - l.Issued;
            entries.Add(new StockCardEntryDto
            {
                TransactionDate = l.Date,
                DocumentCode = l.DocumentCode,
                TransactionType = l.TransactionType,
                Description = l.Note,
                ReceivedQuantity = l.Received,
                IssuedQuantity = l.Issued,
                Balance = balance
            });
        }

        return new StockCardDto
        {
            ItemId = itemId,
            ItemCode = medicine?.MedicineCode ?? supply?.SupplyCode ?? string.Empty,
            ItemName = medicine?.MedicineName ?? supply?.SupplyName ?? string.Empty,
            Unit = medicine?.Unit ?? supply?.Unit ?? string.Empty,
            WarehouseId = warehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            FromDate = fromDate,
            ToDate = toDate,
            OpeningQuantity = opening,
            ClosingQuantity = balance,
            Entries = entries
        };
    }

    public async Task<List<StockMovementReportDto>> GetStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        var from = fromDate.Date;
        var toExclusive = toDate.Date.AddDays(1);

        // Current stock + average cost per item (itemType: 1 = thuốc, 2 = vật tư).
        var lots = await _context.InventoryItems.AsNoTracking()
            .Where(i => i.WarehouseId == warehouseId && !i.IsDeleted && (i.MedicineId != null || i.SupplyId != null)
                && (itemType == null || (itemType == 1 ? i.MedicineId != null : i.MedicineId == null)))
            .Select(i => new { ItemId = (i.MedicineId ?? i.SupplyId)!.Value, i.Quantity, i.ImportPrice })
            .ToListAsync();
        var stockByItem = lots.GroupBy(l => l.ItemId).ToDictionary(g => g.Key, g => new
        {
            Quantity = g.Sum(x => x.Quantity),
            Price = g.Where(x => x.Quantity > 0).Select(x => x.ImportPrice).DefaultIfEmpty(g.Average(x => x.ImportPrice)).Average()
        });

        var lines = (await LoadStockDocLinesAsync(warehouseId, null, from))
            .Where(l => itemType == null || (itemType == 1 ? !l.IsSupply : l.IsSupply))
            .ToList();
        var linesByItem = lines.GroupBy(l => l.ItemId).ToDictionary(g => g.Key, g => g.ToList());

        var itemIds = stockByItem.Keys.Union(linesByItem.Keys).ToList();
        var medicines = await _context.Medicines.AsNoTracking()
            .Where(m => itemIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit })
            .ToDictionaryAsync(m => m.Id);
        var supplies = await _context.MedicalSupplies.AsNoTracking()
            .Where(s => itemIds.Contains(s.Id))
            .Select(s => new { s.Id, s.SupplyCode, s.SupplyName, s.Unit })
            .ToDictionaryAsync(s => s.Id);

        var result = new List<StockMovementReportDto>();
        foreach (var id in itemIds)
        {
            stockByItem.TryGetValue(id, out var stock);
            var itemLines = linesByItem.TryGetValue(id, out var ls) ? ls : new List<StockDocLine>();
            var current = stock?.Quantity ?? 0;
            var opening = current - itemLines.Sum(l => l.Received - l.Issued);
            var period = itemLines.Where(l => l.Date < toExclusive).ToList();
            var received = period.Sum(l => l.Received);
            var issued = period.Sum(l => l.Issued);
            if (opening == 0 && received == 0 && issued == 0) continue;

            var price = stock?.Price ?? period.Select(l => l.UnitPrice).DefaultIfEmpty(0).Average();
            var receivedValue = period.Sum(l => l.Received * l.UnitPrice);
            var issuedValue = period.Sum(l => l.Issued * l.UnitPrice);
            medicines.TryGetValue(id, out var med);
            supplies.TryGetValue(id, out var sup);

            result.Add(new StockMovementReportDto
            {
                ItemId = id,
                ItemCode = med?.MedicineCode ?? sup?.SupplyCode ?? string.Empty,
                ItemName = med?.MedicineName ?? sup?.SupplyName ?? string.Empty,
                Unit = med?.Unit ?? sup?.Unit ?? string.Empty,
                OpeningQuantity = opening,
                OpeningValue = opening * price,
                TotalReceived = received,
                TotalReceivedValue = receivedValue,
                TotalIssued = issued,
                TotalIssuedValue = issuedValue,
                ClosingQuantity = opening + received - issued,
                ClosingValue = opening * price + receivedValue - issuedValue,
            });
        }

        return result.OrderBy(r => r.ItemName).ToList();
    }

    public async Task<byte[]> PrintStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);
            var rows = await GetStockMovementReportAsync(warehouseId, fromDate, toDate, itemType);

            var headers = new[] { "Ten hang", "DVT", "Ton dau ky", "Nhap trong ky", "Xuat trong ky", "Ton cuoi ky" };
            var tableRows = rows.Select(r => new[]
            {
                r.ItemName,
                r.Unit,
                r.OpeningQuantity.ToString("#,##0.##"),
                r.TotalReceived.ToString("#,##0.##"),
                r.TotalIssued.ToString("#,##0.##"),
                r.ClosingQuantity.ToString("#,##0.##")
            }).ToList();

            var html = BuildTableReport(
                "BAO CAO NHAP XUAT TON",
                $"Kho: {warehouse?.WarehouseName} - Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}",
                DateTime.Now,
                headers, tableRows,
                null, "Thu kho");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<DepartmentUsageReportDto> GetDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Get issue movements (type=2) from this warehouse grouped by destination department
            var transfers = await _context.WarehouseTransfers
                .Include(t => t.ToWarehouse).ThenInclude(w => w!.Department)
                .Include(t => t.Items).ThenInclude(i => i.Medicine)
                .Where(t => t.FromWarehouseId == warehouseId
                    && t.TransferDate >= fromDate && t.TransferDate <= toDate
                    && t.Status >= 1 && t.Status != 4) // approved/received, not cancelled
                .ToListAsync();

            var departments = transfers
                .Where(t => t.ToWarehouse?.Department != null)
                .GroupBy(t => new
                {
                    DeptId = t.ToWarehouse!.DepartmentId!.Value,
                    DeptCode = t.ToWarehouse.Department!.DepartmentCode ?? "",
                    DeptName = t.ToWarehouse.Department.DepartmentName ?? ""
                })
                .Select(g =>
                {
                    var items = g.SelectMany(t => t.Items ?? Enumerable.Empty<WarehouseTransferItem>()).ToList();
                    return new DepartmentUsageItemDto
                    {
                        DepartmentId = g.Key.DeptId,
                        DepartmentCode = g.Key.DeptCode,
                        DepartmentName = g.Key.DeptName,
                        IssueCount = g.Count(),
                        TotalQuantity = items.Sum(i => i.ReceivedQuantity ?? i.DeliveredQuantity ?? i.RequestedQuantity),
                        TotalAmount = items.Sum(i => i.Amount),
                        TopItems = items
                            .GroupBy(i => new { i.MedicineId, Name = i.Medicine?.MedicineName ?? "", Code = i.Medicine?.MedicineCode ?? "", Unit = i.Medicine?.Unit ?? "" })
                            .OrderByDescending(ig => ig.Sum(x => x.ReceivedQuantity ?? x.DeliveredQuantity ?? x.RequestedQuantity))
                            .Take(5)
                            .Select(ig => new ItemUsageDto
                            {
                                ItemId = ig.Key.MedicineId,
                                ItemCode = ig.Key.Code,
                                ItemName = ig.Key.Name,
                                Unit = ig.Key.Unit,
                                Quantity = ig.Sum(x => x.ReceivedQuantity ?? x.DeliveredQuantity ?? x.RequestedQuantity),
                                Amount = ig.Sum(x => x.Amount)
                            })
                            .ToList()
                    };
                })
                .OrderByDescending(d => d.TotalAmount)
                .ToList();

            return new DepartmentUsageReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Departments = departments,
                TotalAmount = departments.Sum(d => d.TotalAmount)
            };
        }
        catch { return new DepartmentUsageReportDto { FromDate = fromDate, ToDate = toDate }; }
    }

    public async Task<byte[]> PrintDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);

            // Group exports by department
            var deptExports = await _context.ExportReceipts
                .Where(e => e.WarehouseId == warehouseId
                    && e.ReceiptDate >= fromDate
                    && e.ReceiptDate <= toDate
                    && e.Status == 1
                    && e.ToDepartmentId != null)
                .GroupBy(e => e.ToDepartmentId!.Value)
                .Select(g => new
                {
                    DepartmentId = g.Key,
                    IssueCount = g.Count(),
                    TotalAmount = g.Sum(e => e.TotalAmount)
                })
                .ToListAsync();

            var deptIds = deptExports.Select(d => d.DepartmentId).ToList();
            var departments = await _context.Departments
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

            var headers = new[] { "Khoa/Phong", "So phieu xuat", "Tong tien" };
            var rows = deptExports
                .OrderByDescending(d => d.TotalAmount)
                .Select(d => new[]
                {
                    departments.GetValueOrDefault(d.DepartmentId, ""),
                    d.IssueCount.ToString(),
                    d.TotalAmount.ToString("#,##0")
                }).ToList();

            var html = BuildTableReport(
                "BAO CAO XUAT THUOC THEO KHOA",
                $"Kho: {warehouse?.WarehouseName} - Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}",
                DateTime.Now,
                headers, rows,
                null, "Thu kho");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }
    #endregion
}
