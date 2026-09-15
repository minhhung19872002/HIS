using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.System;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{
    // 11.5 Hach toan chi phi theo khoa phong
    //
    // QA-R3: "cost" used to be the medicines' SELLING amount + the TOTAL of every service request (i.e. revenue),
    // with personnel/equipment/overhead hard-coded 0 and the last day of the period dropped.
    // Now: medicine/supply cost = quantity dispensed to patients (non-cancelled OPD/IPD export receipts) × import
    // price of the lot, attributed to the ordering department (the prescription's department, else the visit's);
    // retail pharmacy sales form their own row. Services are shown as revenue (ServiceRevenue), not cost.
    // Personnel/equipment/overhead have no per-department source → null + MissingData.
    public async Task<List<CostByDepartmentDto>> GetCostByDepartmentAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string costType = null)
    {
        var toEnd = ReportPeriod.EndExclusive(toDate);

        var exportLines = await _context.ExportReceiptDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && !d.ExportReceipt.IsDeleted && d.ExportReceipt.Status != 2
                && (d.ExportReceipt.ExportType == 1 || d.ExportReceipt.ExportType == 2)
                && d.ExportReceipt.ReceiptDate >= fromDate && d.ExportReceipt.ReceiptDate < toEnd)
            .Select(d => new
            {
                RxDeptId = _context.Prescriptions.Where(p => p.Id == d.ExportReceipt.PrescriptionId)
                    .Select(p => (Guid?)p.DepartmentId).FirstOrDefault(),
                MrDeptId = _context.MedicalRecords.Where(m => m.Id == d.ExportReceipt.MedicalRecordId)
                    .Select(m => m.DepartmentId).FirstOrDefault(),
                IsSupply = d.MedicineId == null && d.SupplyId != null,
                d.Quantity,
                ImportPrice = d.InventoryItem != null ? d.InventoryItem.ImportPrice : 0m,
            })
            .ToListAsync();
        var lines = exportLines
            .Select(l => new CostLine(l.RxDeptId ?? l.MrDeptId ?? Guid.Empty, l.IsSupply, l.Quantity, l.ImportPrice))
            .Where(l => !departmentId.HasValue || l.DeptId == departmentId.Value)
            .ToList();

        // Retail sales have no department: own row, only in the hospital-wide view.
        var saleLines = new List<CostLine>();
        if (!departmentId.HasValue)
        {
            var fromUtc = ReportPeriod.ToUtc(fromDate);
            var toUtc = ReportPeriod.ToUtc(toEnd);
            var sales = await _context.RetailSaleItems.AsNoTracking()
                .Where(i => !i.IsDeleted && !i.RetailSale!.IsDeleted && i.RetailSale!.Status == "Completed"
                    && i.RetailSale!.CreatedAt >= fromUtc && i.RetailSale!.CreatedAt < toUtc)
                .Select(i => new
                {
                    i.Quantity,
                    ImportPrice = _context.InventoryItems
                        .Where(l => l.WarehouseId == i.WarehouseId && l.MedicineId == i.MedicineId && l.BatchNumber == i.BatchNumber)
                        .Select(l => (decimal?)l.ImportPrice).FirstOrDefault() ?? 0m,
                })
                .ToListAsync();
            saleLines = sales.Select(x => new CostLine(Guid.Empty, false, x.Quantity, x.ImportPrice)).ToList();
        }

        var serviceQuery = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.RequestDate >= fromDate && sr.RequestDate < toEnd && sr.Status != 4 && !sr.IsDeleted);
        if (departmentId.HasValue)
            serviceQuery = serviceQuery.Where(sr => sr.DepartmentId == departmentId.Value);
        var serviceRevenueByDept = await serviceQuery
            .GroupBy(sr => sr.DepartmentId)
            .Select(g => new { DeptId = g.Key, Revenue = g.Sum(sr => sr.TotalAmount) })
            .ToDictionaryAsync(x => x.DeptId, x => x.Revenue);

        var byDept = lines.GroupBy(l => l.DeptId).ToDictionary(g => g.Key, g => g.ToList());
        var allDeptIds = byDept.Keys.Union(serviceRevenueByDept.Keys).Distinct().ToList();
        if (departmentId.HasValue && !allDeptIds.Contains(departmentId.Value))
            allDeptIds.Add(departmentId.Value);

        var departments = await _context.Departments.AsNoTracking()
            .Where(d => allDeptIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => new { d.DepartmentCode, d.DepartmentName });

        var result = allDeptIds.Select(deptId =>
        {
            departments.TryGetValue(deptId, out var dept);
            return BuildCostRow(deptId, dept?.DepartmentCode ?? "",
                dept?.DepartmentName ?? (deptId == Guid.Empty ? "Chưa xác định khoa" : ""),
                byDept.GetValueOrDefault(deptId) ?? new List<CostLine>(),
                serviceRevenueByDept.GetValueOrDefault(deptId));
        }).ToList();

        if (saleLines.Count > 0)
            result.Add(BuildCostRow(Guid.Empty, "NT-BANLE", "Nhà thuốc bệnh viện (bán lẻ)", saleLines, 0));

        return result
            .Where(c => costType == null || (c.TotalCost ?? 0) > 0)
            .OrderByDescending(c => c.TotalCost ?? 0)
            .ToList();
    }

    private sealed record CostLine(Guid DeptId, bool IsSupply, decimal Quantity, decimal ImportPrice);

    private static CostByDepartmentDto BuildCostRow(Guid id, string code, string name, List<CostLine> lines, decimal serviceRevenue)
    {
        static (decimal? Cost, int Uncosted) CostOf(List<CostLine> src)
        {
            var uncosted = src.Count(l => l.ImportPrice <= 0);
            if (src.Count == 0) return (0m, 0);
            return src.Any(l => l.ImportPrice > 0)
                ? (src.Where(l => l.ImportPrice > 0).Sum(l => l.Quantity * l.ImportPrice), uncosted)
                : (null, uncosted);
        }

        var (medCost, medUnc) = CostOf(lines.Where(l => !l.IsSupply).ToList());
        var (supCost, supUnc) = CostOf(lines.Where(l => l.IsSupply).ToList());
        var missing = new List<string>();
        if (medCost == null) missing.Add("Giá vốn thuốc: lô xuất không có giá nhập");
        if (supCost == null) missing.Add("Giá vốn vật tư: lô xuất không có giá nhập");
        if (medUnc + supUnc > 0) missing.Add($"{medUnc + supUnc} dòng xuất kho chưa có giá nhập — không tính vào giá vốn");
        missing.Add("Nhân sự / thiết bị / chi phí chung: chưa có nguồn dữ liệu theo khoa");

        return new CostByDepartmentDto
        {
            DepartmentId = id, DepartmentCode = code, DepartmentName = name,
            MedicineCost = medCost, SupplyCost = supCost,
            EquipmentCost = null, PersonnelCost = null, OverheadCost = null,
            // A component with dispensed lines but no import price at all makes the total unknown, not 0.
            TotalCost = medCost.HasValue && supCost.HasValue ? medCost.Value + supCost.Value : null,
            ServiceRevenue = serviceRevenue,
            UncostedLines = medUnc + supUnc,
            MissingData = missing,
        };
    }
}
