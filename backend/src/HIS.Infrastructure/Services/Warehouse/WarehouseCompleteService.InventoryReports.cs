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

    public async Task<byte[]> PrintStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);
            var medicine = await _context.Medicines.FindAsync(itemId);
            var supply = medicine == null ? await _context.MedicalSupplies.FindAsync(itemId) : null;
            var itemName = medicine?.MedicineName ?? supply?.SupplyName ?? "";
            var itemCode = medicine?.MedicineCode ?? supply?.SupplyCode ?? "";
            var unit = medicine?.Unit ?? supply?.Unit ?? "";

            // Get import transactions in the date range
            var importEntries = await _context.ImportReceiptDetails
                .Include(d => d.ImportReceipt)
                .Where(d => d.ImportReceipt.WarehouseId == warehouseId
                    && (d.MedicineId == itemId || d.SupplyId == itemId)
                    && d.ImportReceipt.ReceiptDate >= fromDate
                    && d.ImportReceipt.ReceiptDate <= toDate
                    && d.ImportReceipt.Status == 1)
                .OrderBy(d => d.ImportReceipt.ReceiptDate)
                .Select(d => new { d.ImportReceipt.ReceiptDate, d.ImportReceipt.ReceiptCode, d.Quantity, Type = "Nhap" })
                .ToListAsync();

            // Get export transactions in the date range
            var exportEntries = await _context.ExportReceiptDetails
                .Include(d => d.ExportReceipt)
                .Where(d => d.ExportReceipt.WarehouseId == warehouseId
                    && (d.MedicineId == itemId || d.SupplyId == itemId)
                    && d.ExportReceipt.ReceiptDate >= fromDate
                    && d.ExportReceipt.ReceiptDate <= toDate
                    && d.ExportReceipt.Status == 1)
                .OrderBy(d => d.ExportReceipt.ReceiptDate)
                .Select(d => new { d.ExportReceipt.ReceiptDate, d.ExportReceipt.ReceiptCode, d.Quantity, Type = "Xuat" })
                .ToListAsync();

            var allEntries = importEntries
                .Select(e => new { e.ReceiptDate, e.ReceiptCode, Import = e.Quantity, Export = 0m })
                .Concat(exportEntries.Select(e => new { e.ReceiptDate, e.ReceiptCode, Import = 0m, Export = e.Quantity }))
                .OrderBy(e => e.ReceiptDate)
                .ToList();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">THE KHO</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}</div>");

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Kho:</span><span class=""field-value"">{Esc(warehouse?.WarehouseName)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ten hang:</span><span class=""field-value"">{Esc(itemName)} ({Esc(itemCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">DVT:</span><span class=""field-value"">{Esc(unit)}</span></div>");

            body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
                <th>Ngay</th><th>So chung tu</th><th>Nhap</th><th>Xuat</th><th>Ton</th>
            </tr></thead><tbody>");

            decimal balance = 0;
            // Calculate opening balance from inventory
            var currentStock = await _context.InventoryItems
                .Where(i => i.WarehouseId == warehouseId && (i.MedicineId == itemId || i.SupplyId == itemId))
                .SumAsync(i => i.Quantity);
            // rough opening = current - net movements in period
            var totalImport = allEntries.Sum(e => e.Import);
            var totalExport = allEntries.Sum(e => e.Export);
            balance = currentStock - totalImport + totalExport;

            body.AppendLine($@"<tr><td>{fromDate:dd/MM/yyyy}</td><td>Ton dau ky</td><td></td><td></td><td class=""text-right"">{balance:#,##0}</td></tr>");

            foreach (var entry in allEntries)
            {
                balance += entry.Import - entry.Export;
                body.AppendLine($@"<tr>
                    <td>{entry.ReceiptDate:dd/MM/yyyy}</td>
                    <td>{Esc(entry.ReceiptCode)}</td>
                    <td class=""text-right"">{(entry.Import > 0 ? entry.Import.ToString("#,##0") : "")}</td>
                    <td class=""text-right"">{(entry.Export > 0 ? entry.Export.ToString("#,##0") : "")}</td>
                    <td class=""text-right"">{balance:#,##0}</td>
                </tr>");
            }

            body.AppendLine($@"<tr><td colspan=""2"" class=""text-right""><b>Tong:</b></td><td class=""text-right""><b>{totalImport:#,##0}</b></td><td class=""text-right""><b>{totalExport:#,##0}</b></td><td class=""text-right""><b>{balance:#,##0}</b></td></tr>");
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
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);
            var medicine = await _context.Medicines.FindAsync(itemId);

            // Get stock movements for this item in this warehouse within date range
            var movements = await _context.StockMovements
                .Where(sm => sm.WarehouseId == warehouseId && sm.MedicineId == itemId)
                .OrderBy(sm => sm.MovementDate)
                .ToListAsync();

            // Calculate opening balance: sum of movements before fromDate
            var priorMovements = movements.Where(m => m.MovementDate < fromDate).ToList();
            var openingQty = priorMovements.Any() ? priorMovements.Last().BalanceAfter : 0;

            // Movements within the period
            var periodMovements = movements
                .Where(m => m.MovementDate >= fromDate && m.MovementDate <= toDate)
                .ToList();

            var closingQty = periodMovements.Any() ? periodMovements.Last().BalanceAfter : openingQty;

            var entries = periodMovements.Select(m => new StockCardEntryDto
            {
                TransactionDate = m.MovementDate,
                DocumentCode = m.ReferenceCode ?? string.Empty,
                TransactionType = m.MovementType switch
                {
                    1 => "Nhap kho",
                    2 => "Xuat kho",
                    3 => "Chuyen kho",
                    4 => "Dieu chinh",
                    5 => "Tra NCC",
                    _ => "Khac"
                },
                Description = m.Notes,
                ReceivedQuantity = m.MovementType == 1 || (m.MovementType == 4 && m.Quantity > 0) ? m.Quantity : 0,
                IssuedQuantity = m.MovementType == 2 || m.MovementType == 5 || (m.MovementType == 4 && m.Quantity < 0) ? Math.Abs(m.Quantity) : 0,
                Balance = m.BalanceAfter
            }).ToList();

            return new StockCardDto
            {
                ItemId = itemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                WarehouseId = warehouseId,
                WarehouseName = warehouse?.WarehouseName ?? string.Empty,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningQuantity = openingQty,
                ClosingQuantity = closingQty,
                Entries = entries
            };
        }
        catch { return new StockCardDto { WarehouseId = warehouseId, ItemId = itemId, FromDate = fromDate, ToDate = toDate }; }
    }

    public async Task<List<StockMovementReportDto>> GetStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        // Aggregate StockMovements per medicine within the date window:
        //   Opening = balance at fromDate (last balance-after of any movement
        //             dated < fromDate), Receipts = sum of imports/returns,
        //   Issues = sum of exports, Closing = Opening + Receipts − Issues.
        // itemType filter (1=Medicine) is applied implicitly — StockMovements
        // entity tracks medicines only.
        var movements = await _context.StockMovements
            .Where(m => m.WarehouseId == warehouseId
                        && m.MovementDate >= fromDate
                        && m.MovementDate < toDate.AddDays(1))
            .ToListAsync();

        if (movements.Count == 0) return new List<StockMovementReportDto>();

        var medIds = movements.Select(m => m.MedicineId).Distinct().ToList();

        // Opening balance per medicine = sum(balance after) of latest movement strictly before fromDate
        var openingMovements = await _context.StockMovements
            .Where(m => m.WarehouseId == warehouseId
                        && medIds.Contains(m.MedicineId)
                        && m.MovementDate < fromDate)
            .GroupBy(m => m.MedicineId)
            .Select(g => g.OrderByDescending(x => x.MovementDate).FirstOrDefault())
            .ToListAsync();

        var medicines = await _context.Medicines
            .Where(m => medIds.Contains(m.Id))
            .ToListAsync();

        return movements
            .GroupBy(m => m.MedicineId)
            .Select(g =>
            {
                var med = medicines.FirstOrDefault(x => x.Id == g.Key);
                var opening = openingMovements.FirstOrDefault(o => o!.MedicineId == g.Key);
                var openQty = opening?.BalanceAfter ?? 0;
                var openVal = openQty * (g.First().UnitPrice);
                var received = g.Where(x => x.MovementType == 1 || x.MovementType == 5).ToList();
                var issued = g.Where(x => x.MovementType == 2).ToList();

                return new StockMovementReportDto
                {
                    ItemId = g.Key,
                    ItemCode = med?.MedicineCode ?? "",
                    ItemName = med?.MedicineName ?? "",
                    Unit = med?.Unit ?? "",
                    OpeningQuantity = openQty,
                    OpeningValue = openVal,
                    TotalReceived = received.Sum(x => x.Quantity),
                    TotalReceivedValue = received.Sum(x => x.Amount),
                    TotalIssued = issued.Sum(x => x.Quantity),
                    TotalIssuedValue = issued.Sum(x => x.Amount),
                    ClosingQuantity = openQty + received.Sum(x => x.Quantity) - issued.Sum(x => x.Quantity),
                    ClosingValue = openVal + received.Sum(x => x.Amount) - issued.Sum(x => x.Amount),
                };
            })
            .OrderByDescending(d => d.TotalReceivedValue + d.TotalIssuedValue)
            .ToList();
    }

    public async Task<byte[]> PrintStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType)
    {
        try
        {
            var warehouse = await _context.Warehouses.FindAsync(warehouseId);

            // Query all inventory items in this warehouse
            var inventoryQuery = _context.InventoryItems
                .Include(i => i.Medicine)
                .Include(i => i.Supply)
                .Where(i => i.WarehouseId == warehouseId);
            if (itemType.HasValue)
                inventoryQuery = inventoryQuery.Where(i => i.ItemType == (itemType.Value == 1 ? "Medicine" : "Supply"));

            var inventoryItems = await inventoryQuery.ToListAsync();

            // Group by item
            var grouped = inventoryItems
                .GroupBy(i => i.MedicineId ?? i.SupplyId ?? i.Id)
                .Select(g =>
                {
                    var first = g.First();
                    var name = first.Medicine?.MedicineName ?? first.Supply?.SupplyName ?? "";
                    var unit = first.Medicine?.Unit ?? first.Supply?.Unit ?? "";
                    var currentQty = g.Sum(i => i.Quantity);
                    return new { Name = name, Unit = unit, CurrentQty = currentQty };
                })
                .OrderBy(x => x.Name)
                .ToList();

            var headers = new[] { "Ten hang", "DVT", "Ton dau ky", "Nhap trong ky", "Xuat trong ky", "Ton cuoi ky" };
            var rows = grouped.Select(item => new[]
            {
                item.Name,
                item.Unit,
                item.CurrentQty.ToString("#,##0"),
                "0",
                "0",
                item.CurrentQty.ToString("#,##0")
            }).ToList();

            var html = BuildTableReport(
                "BAO CAO NHAP XUAT TON",
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
