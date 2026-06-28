using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class ReportingCompleteService
{

    public async Task<RevenueReportDto> GetRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, string? patientType = null)
    {
        try
        {
            var query = _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted);

            var receipts = await query
                .Select(r => new
                {
                    r.ReceiptDate,
                    r.FinalAmount,
                    r.Amount,
                    r.MedicalRecordId,
                    PatientType = r.MedicalRecord != null ? r.MedicalRecord.PatientType : 0,
                    DeptName = r.MedicalRecord != null && r.MedicalRecord.Department != null ? r.MedicalRecord.Department.DepartmentName : "Khong xac dinh"
                })
                .ToListAsync();

            if (!string.IsNullOrEmpty(patientType) && int.TryParse(patientType, out var pt))
                receipts = receipts.Where(r => r.PatientType == pt).ToList();

            var totalRevenue = receipts.Sum(r => r.FinalAmount);
            var insuranceRevenue = receipts.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount);
            var patientRevenue = receipts.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount);

            // By day
            var byDay = receipts
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount),
                    TransactionCount = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToList();

            // By department
            var byDept = receipts
                .GroupBy(r => r.DeptName)
                .Select(g => new RevenueByDepartmentDto
                {
                    DepartmentName = g.Key,
                    Revenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.PatientType != 1).Sum(r => r.FinalAmount),
                    Percentage = totalRevenue > 0 ? Math.Round(g.Sum(r => r.FinalAmount) * 100m / totalRevenue, 1) : 0
                })
                .OrderByDescending(d => d.Revenue)
                .ToList();

            // By patient type
            var typeNames = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" }, { 4, "Kham suc khoe" } };
            var byPatientType = receipts
                .GroupBy(r => r.PatientType)
                .Select(g => new RevenueByPatientTypeDto
                {
                    PatientType = typeNames.GetValueOrDefault(g.Key, $"Loai {g.Key}"),
                    Revenue = g.Sum(r => r.FinalAmount),
                    PatientCount = g.Select(r => r.MedicalRecordId).Distinct().Count(),
                    Percentage = totalRevenue > 0 ? Math.Round(g.Sum(r => r.FinalAmount) * 100m / totalRevenue, 1) : 0
                })
                .OrderByDescending(p => p.Revenue)
                .ToList();

            return new RevenueReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRevenue = totalRevenue,
                InsuranceRevenue = insuranceRevenue,
                PatientRevenue = patientRevenue,
                OtherRevenue = 0,
                ByDay = byDay,
                ByDepartment = byDept,
                ByServiceType = new List<RevenueByServiceTypeDto>(),
                ByPatientType = byPatientType
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Revenue report failed");
            return new RevenueReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByDay = new List<RevenueByDayDto>(),
                ByDepartment = new List<RevenueByDepartmentDto>(),
                ByServiceType = new List<RevenueByServiceTypeDto>(),
                ByPatientType = new List<RevenueByPatientTypeDto>()
            };
        }
    }

    public async Task<List<RevenueByDayDto>> GetDailyRevenueReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var data = await _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted)
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(r => r.FinalAmount),
                    InsuranceRevenue = g.Where(r => r.MedicalRecord != null && r.MedicalRecord.PatientType == 1).Sum(r => r.FinalAmount),
                    PatientRevenue = g.Where(r => r.MedicalRecord == null || r.MedicalRecord.PatientType != 1).Sum(r => r.FinalAmount),
                    TransactionCount = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToListAsync();
            return data;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Daily revenue report failed");
            return new List<RevenueByDayDto>();
        }
    }

    public async Task<PatientDebtReportDto> GetPatientDebtReportAsync(DateTime? asOfDate = null, Guid? departmentId = null)
    {
        var date = asOfDate ?? DateTime.Today;
        try
        {
            var query = _context.InvoiceSummaries
                .Where(inv => inv.RemainingAmount > 0 && inv.Status != 2 && !inv.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(inv => inv.MedicalRecord.DepartmentId == departmentId.Value);

            var debts = await query
                .Select(inv => new
                {
                    inv.MedicalRecord.PatientId,
                    inv.MedicalRecord.Patient.PatientCode,
                    PatientName = inv.MedicalRecord.Patient.FullName,
                    inv.MedicalRecord.Patient.PhoneNumber,
                    inv.RemainingAmount,
                    inv.CreatedAt,
                    DeptName = inv.MedicalRecord.Department != null ? inv.MedicalRecord.Department.DepartmentName : ""
                })
                .ToListAsync();

            var totalDebt = debts.Sum(d => d.RemainingAmount);
            var totalDebtors = debts.Select(d => d.PatientId).Distinct().Count();

            var topDebtors = debts
                .GroupBy(d => d.PatientId)
                .Select(g => new PatientDebtItemDto
                {
                    PatientId = g.Key,
                    PatientCode = g.First().PatientCode,
                    PatientName = g.First().PatientName,
                    PhoneNumber = g.First().PhoneNumber ?? "",
                    DebtAmount = g.Sum(d => d.RemainingAmount),
                    DaysOverdue = (int)(date - g.Min(d => d.CreatedAt)).TotalDays,
                    LastPaymentDate = g.Max(d => d.CreatedAt),
                    DepartmentName = g.First().DeptName
                })
                .OrderByDescending(d => d.DebtAmount)
                .Take(20)
                .ToList();

            var byDept = debts
                .GroupBy(d => d.DeptName)
                .Select(g => new DebtByDepartmentDto
                {
                    DepartmentName = g.Key,
                    DebtAmount = g.Sum(d => d.RemainingAmount),
                    DebtorCount = g.Select(d => d.PatientId).Distinct().Count()
                })
                .OrderByDescending(d => d.DebtAmount)
                .ToList();

            return new PatientDebtReportDto
            {
                AsOfDate = date,
                TotalDebt = totalDebt,
                TotalDebtors = totalDebtors,
                DebtUnder30Days = debts.Where(d => (date - d.CreatedAt).TotalDays < 30).Sum(d => d.RemainingAmount),
                Debt30To60Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 30 && (date - d.CreatedAt).TotalDays < 60).Sum(d => d.RemainingAmount),
                Debt60To90Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 60 && (date - d.CreatedAt).TotalDays < 90).Sum(d => d.RemainingAmount),
                DebtOver90Days = debts.Where(d => (date - d.CreatedAt).TotalDays >= 90).Sum(d => d.RemainingAmount),
                TopDebtors = topDebtors,
                ByDepartment = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Patient debt report failed");
            return new PatientDebtReportDto { AsOfDate = date, TopDebtors = new List<PatientDebtItemDto>(), ByDepartment = new List<DebtByDepartmentDto>() };
        }
    }

    public async Task<InsuranceClaimReportDto> GetInsuranceClaimReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var claims = await _context.InsuranceClaims
                .Where(c => c.ServiceDate >= fromDate && c.ServiceDate < toDate && !c.IsDeleted)
                .ToListAsync();

            var total = claims.Count;
            var approved = claims.Where(c => c.ClaimStatus == 2 || c.ClaimStatus == 5).ToList();
            var rejected = claims.Where(c => c.ClaimStatus == 4).ToList();
            var partial = claims.Where(c => c.ClaimStatus == 3).ToList();
            var pending = claims.Where(c => c.ClaimStatus <= 1).ToList();

            var byStatus = claims.GroupBy(c => c.ClaimStatus)
                .Select(g => new ClaimByStatusDto
                {
                    Status = g.Key switch { 0 => "Chua gui", 1 => "Da gui", 2 => "Da duyet", 3 => "Tu choi 1 phan", 4 => "Tu choi", 5 => "Da thanh toan", _ => $"Loai {g.Key}" },
                    ClaimCount = g.Count(),
                    Amount = g.Sum(c => c.TotalAmount)
                }).ToList();

            var byType = claims.GroupBy(c => c.TreatmentType)
                .Select(g => new ClaimByTypeDto
                {
                    ClaimType = g.Key switch { 1 => "Ngoai tru", 2 => "Noi tru", 3 => "Cap cuu", _ => "Khac" },
                    ClaimCount = g.Count(),
                    Amount = g.Sum(c => c.TotalAmount)
                }).ToList();

            // Top rejection reasons
            var rejections = await _context.InsuranceRejections
                .Where(r => r.Claim.ServiceDate >= fromDate && r.Claim.ServiceDate < toDate && !r.IsDeleted)
                .GroupBy(r => new { r.RejectionCode, r.RejectionReason })
                .Select(g => new RejectionReasonDto
                {
                    ReasonCode = g.Key.RejectionCode,
                    ReasonDescription = g.Key.RejectionReason,
                    Count = g.Count(),
                    Amount = g.Sum(r => r.RejectedAmount)
                })
                .OrderByDescending(r => r.Count)
                .Take(10)
                .ToListAsync();

            var approvedCount = approved.Count + partial.Count;

            return new InsuranceClaimReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalClaimAmount = claims.Sum(c => c.TotalAmount),
                ApprovedAmount = approved.Sum(c => c.InsuranceAmount),
                RejectedAmount = rejected.Sum(c => c.TotalAmount),
                PendingAmount = pending.Sum(c => c.TotalAmount),
                TotalClaims = total,
                ApprovedClaims = approvedCount,
                RejectedClaims = rejected.Count,
                PendingClaims = pending.Count,
                ApprovalRate = total > 0 ? Math.Round(approvedCount * 100m / total, 1) : 0,
                ByStatus = byStatus,
                ByClaimType = byType,
                TopRejectionReasons = rejections
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Insurance claim report failed");
            return new InsuranceClaimReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                ByStatus = new List<ClaimByStatusDto>(),
                ByClaimType = new List<ClaimByTypeDto>(),
                TopRejectionReasons = new List<RejectionReasonDto>()
            };
        }
    }

    public async Task<ProfitByDepartmentReportDto> GetProfitByDepartmentReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Revenue per department from receipts
            var revenueByDept = await _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted && r.MedicalRecord != null)
                .GroupBy(r => r.MedicalRecord!.Department!.DepartmentName ?? "Khong xac dinh")
                .Select(g => new { Dept = g.Key, Revenue = g.Sum(r => r.FinalAmount) })
                .ToListAsync();

            // Cost from prescriptions (drug cost as proxy for department cost)
            var costByDept = await _context.Prescriptions
                .Where(p => p.PrescriptionDate >= fromDate && p.PrescriptionDate < toDate && !p.IsDeleted)
                .GroupBy(p => p.Department.DepartmentName)
                .Select(g => new { Dept = g.Key, Cost = g.Sum(p => p.TotalAmount) })
                .ToListAsync();

            var costDict = costByDept.ToDictionary(c => c.Dept, c => c.Cost);

            var departments = revenueByDept.Select(r =>
            {
                var cost = costDict.GetValueOrDefault(r.Dept, 0);
                var profit = r.Revenue - cost;
                return new DepartmentProfitItemDto
                {
                    DepartmentName = r.Dept,
                    Revenue = r.Revenue,
                    Cost = cost,
                    Profit = profit,
                    ProfitMargin = r.Revenue > 0 ? Math.Round(profit * 100m / r.Revenue, 1) : 0
                };
            }).OrderByDescending(d => d.Revenue).ToList();

            var totalRevenue = departments.Sum(d => d.Revenue);
            var totalCost = departments.Sum(d => d.Cost);
            var totalProfit = totalRevenue - totalCost;

            return new ProfitByDepartmentReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalRevenue = totalRevenue,
                TotalCost = totalCost,
                TotalProfit = totalProfit,
                ProfitMargin = totalRevenue > 0 ? Math.Round(totalProfit * 100m / totalRevenue, 1) : 0,
                Departments = departments
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Profit by department report failed");
            return new ProfitByDepartmentReportDto { FromDate = fromDate, ToDate = toDate, Departments = new List<DepartmentProfitItemDto>() };
        }
    }

    public async Task<object> GetCashierReportAsync(DateTime fromDate, DateTime toDate, Guid? cashierId = null)
    {
        try
        {
            var query = _context.Receipts
                .Where(r => r.ReceiptDate >= fromDate && r.ReceiptDate < toDate && r.Status == 1 && !r.IsDeleted);

            if (cashierId.HasValue)
                query = query.Where(r => r.CashierId == cashierId.Value);

            var byCashier = await query
                .GroupBy(r => new { r.CashierId, r.Cashier.FullName })
                .Select(g => new
                {
                    CashierId = g.Key.CashierId,
                    CashierName = g.Key.FullName,
                    TransactionCount = g.Count(),
                    TotalAmount = g.Sum(r => r.FinalAmount),
                    CashAmount = g.Where(r => r.PaymentMethod == 1).Sum(r => r.FinalAmount),
                    TransferAmount = g.Where(r => r.PaymentMethod == 2).Sum(r => r.FinalAmount),
                    CardAmount = g.Where(r => r.PaymentMethod == 3).Sum(r => r.FinalAmount)
                })
                .OrderByDescending(c => c.TotalAmount)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalTransactions = byCashier.Sum(c => c.TransactionCount),
                TotalAmount = byCashier.Sum(c => c.TotalAmount),
                Cashiers = byCashier
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Cashier report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalTransactions = 0, TotalAmount = 0m, Cashiers = Array.Empty<object>() };
        }
    }

    public async Task<object> GetVATInvoiceReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var invoices = await _context.ElectronicInvoices
                .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate < toDate && !i.IsDeleted)
                .Select(i => new
                {
                    i.InvoiceNumber,
                    i.InvoiceSeries,
                    i.InvoiceDate,
                    i.PatientName,
                    i.TaxCode,
                    i.SubTotal,
                    i.VatRate,
                    i.VatAmount,
                    i.TotalAmount,
                    i.Status
                })
                .OrderBy(i => i.InvoiceDate)
                .ToListAsync();

            var totalSubTotal = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.SubTotal);
            var totalVat = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.VatAmount);
            var totalAmount = invoices.Where(i => i.Status == 1 || i.Status == 2).Sum(i => i.TotalAmount);
            var cancelledCount = invoices.Count(i => i.Status == 3);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalInvoices = invoices.Count,
                CancelledInvoices = cancelledCount,
                TotalSubTotal = totalSubTotal,
                TotalVAT = totalVat,
                TotalAmount = totalAmount,
                Invoices = invoices
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "VAT invoice report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalInvoices = 0 };
        }
    }



    public async Task<CurrentStockReportDto> GetCurrentStockReportAsync(Guid? warehouseId = null, string? category = null)
    {
        try
        {
            var query = _context.InventoryItems
                .Where(i => i.Quantity > 0 && !i.IsDeleted);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var items = await query
                .Select(i => new
                {
                    i.WarehouseId,
                    WarehouseName = i.Warehouse.WarehouseName,
                    i.ItemType,
                    i.Quantity,
                    i.ImportPrice,
                    StockValue = i.Quantity * i.ImportPrice,
                    i.ExpiryDate
                })
                .ToListAsync();

            var now = DateTime.Now;
            var totalStockValue = items.Sum(i => i.StockValue);
            var totalItems = items.Count;
            var lowStockItems = items.Count(i => i.Quantity <= 10);
            var expiringItems = items.Count(i => i.ExpiryDate != null && i.ExpiryDate <= now.AddDays(90) && i.ExpiryDate > now);
            var expiredItems = items.Count(i => i.ExpiryDate != null && i.ExpiryDate <= now);

            var byWarehouse = items
                .GroupBy(i => i.WarehouseName)
                .Select(g => new StockByWarehouseDto
                {
                    WarehouseName = g.Key,
                    ItemCount = g.Count(),
                    StockValue = g.Sum(i => i.StockValue)
                })
                .OrderByDescending(w => w.StockValue)
                .ToList();

            var byCategory = items
                .GroupBy(i => i.ItemType)
                .Select(g => new StockByCategoryDto
                {
                    CategoryName = g.Key == "Medicine" ? "Thuoc" : "Vat tu",
                    ItemCount = g.Count(),
                    StockValue = g.Sum(i => i.StockValue)
                })
                .ToList();

            return new CurrentStockReportDto
            {
                AsOfDate = now,
                TotalStockValue = totalStockValue,
                TotalItems = totalItems,
                LowStockItems = lowStockItems,
                ExpiringItems = expiringItems,
                ExpiredItems = expiredItems,
                ByWarehouse = byWarehouse,
                ByCategory = byCategory
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Current stock report failed");
            return new CurrentStockReportDto { AsOfDate = DateTime.Now, ByWarehouse = new List<StockByWarehouseDto>(), ByCategory = new List<StockByCategoryDto>() };
        }
    }

    public async Task<StockMovementReportDto> GetStockMovementReportAsync(DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        try
        {
            // Imports
            var importQuery = _context.ImportReceiptDetails
                .Where(d => d.ImportReceipt.ReceiptDate >= fromDate && d.ImportReceipt.ReceiptDate < toDate && d.ImportReceipt.Status == 1 && !d.IsDeleted);
            if (warehouseId.HasValue)
                importQuery = importQuery.Where(d => d.ImportReceipt.WarehouseId == warehouseId.Value);

            var importValue = await importQuery.SumAsync(d => (decimal?)d.Amount) ?? 0;

            // Exports
            var exportQuery = _context.ExportReceiptDetails
                .Where(d => d.ExportReceipt.ReceiptDate >= fromDate && d.ExportReceipt.ReceiptDate < toDate && d.ExportReceipt.Status == 1 && !d.IsDeleted);
            if (warehouseId.HasValue)
                exportQuery = exportQuery.Where(d => d.ExportReceipt.WarehouseId == warehouseId.Value);

            var exportValue = await exportQuery.SumAsync(d => (decimal?)d.Amount) ?? 0;

            // Opening/closing stock (approximate: current stock + exports - imports in period)
            var currentStockQuery = _context.InventoryItems.Where(i => !i.IsDeleted);
            if (warehouseId.HasValue)
                currentStockQuery = currentStockQuery.Where(i => i.WarehouseId == warehouseId.Value);

            var closingStockValue = await currentStockQuery.SumAsync(i => (decimal?)(i.Quantity * i.ImportPrice)) ?? 0;
            var openingStockValue = closingStockValue - importValue + exportValue;

            var warehouseName = "";
            if (warehouseId.HasValue)
            {
                var wh = await _context.Warehouses.FindAsync(warehouseId.Value);
                warehouseName = wh?.WarehouseName ?? "";
            }

            return new StockMovementReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                WarehouseId = warehouseId,
                WarehouseName = warehouseName,
                OpeningStockValue = openingStockValue,
                ImportValue = importValue,
                ExportValue = exportValue,
                ClosingStockValue = closingStockValue,
                Items = new List<StockMovementItemDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Stock movement report failed");
            return new StockMovementReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<StockMovementItemDto>() };
        }
    }

    public async Task<ControlledDrugReportDto> GetNarcoticDrugReportAsync(DateTime fromDate, DateTime toDate)
    {
        return await GetControlledDrugReportInternalAsync(fromDate, toDate, isNarcotic: true);
    }

    public async Task<ControlledDrugReportDto> GetPsychotropicDrugReportAsync(DateTime fromDate, DateTime toDate)
    {
        return await GetControlledDrugReportInternalAsync(fromDate, toDate, isNarcotic: false);
    }

    public async Task<ExpiringDrugsReportDto> GetExpiringDrugsReportAsync(int daysAhead = 90, Guid? warehouseId = null)
    {
        try
        {
            var now = DateTime.Now;
            var cutoff = now.AddDays(daysAhead);

            var query = _context.InventoryItems
                .Where(i => i.ExpiryDate != null && i.ExpiryDate <= cutoff && i.Quantity > 0 && !i.IsDeleted);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var items = await query
                .Select(i => new ExpiringDrugItemDto
                {
                    ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : ""),
                    ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""),
                    LotNumber = i.BatchNumber ?? "",
                    ExpiryDate = i.ExpiryDate!.Value,
                    DaysUntilExpiry = (int)(i.ExpiryDate!.Value - now).TotalDays,
                    Quantity = i.Quantity,
                    Unit = i.Medicine != null ? i.Medicine.Unit ?? "" : "",
                    UnitPrice = i.ImportPrice,
                    TotalValue = i.Quantity * i.ImportPrice,
                    WarehouseName = i.Warehouse.WarehouseName
                })
                .OrderBy(i => i.ExpiryDate)
                .ToListAsync();

            return new ExpiringDrugsReportDto
            {
                AsOfDate = now,
                DaysAhead = daysAhead,
                TotalItems = items.Count,
                TotalValue = items.Sum(i => i.TotalValue),
                Items = items
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Expiring drugs report failed");
            return new ExpiringDrugsReportDto { AsOfDate = DateTime.Now, DaysAhead = daysAhead, Items = new List<ExpiringDrugItemDto>() };
        }
    }

    public async Task<object> GetDrugUsageByDepartmentReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate && pd.Prescription.PrescriptionDate < toDate && !pd.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(pd => pd.Prescription.DepartmentId == departmentId.Value);

            var byDept = await query
                .GroupBy(pd => pd.Prescription.Department.DepartmentName)
                .Select(g => new
                {
                    Department = g.Key,
                    TotalQuantity = g.Sum(pd => pd.Quantity),
                    TotalAmount = g.Sum(pd => pd.Amount),
                    ItemCount = g.Select(pd => pd.MedicineId).Distinct().Count()
                })
                .OrderByDescending(d => d.TotalAmount)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAmount = byDept.Sum(d => d.TotalAmount),
                Departments = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Drug usage by department report failed");
            return new { FromDate = fromDate, ToDate = toDate, Departments = Array.Empty<object>() };
        }
    }

    public async Task<object> GetABCVENReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var usage = await _context.PrescriptionDetails
                .Where(pd => pd.Prescription.PrescriptionDate >= fromDate && pd.Prescription.PrescriptionDate < toDate && !pd.IsDeleted)
                .GroupBy(pd => new { pd.MedicineId, pd.Medicine.MedicineCode, pd.Medicine.MedicineName })
                .Select(g => new
                {
                    MedicineCode = g.Key.MedicineCode,
                    MedicineName = g.Key.MedicineName,
                    TotalQuantity = g.Sum(pd => pd.Quantity),
                    TotalAmount = g.Sum(pd => pd.Amount)
                })
                .OrderByDescending(m => m.TotalAmount)
                .ToListAsync();

            var totalAmount = usage.Sum(u => u.TotalAmount);
            var cumulative = 0m;

            var classified = usage.Select(u =>
            {
                cumulative += u.TotalAmount;
                var cumulativePercent = totalAmount > 0 ? cumulative * 100m / totalAmount : 0;
                var abcClass = cumulativePercent <= 80 ? "A" : cumulativePercent <= 95 ? "B" : "C";
                return new
                {
                    u.MedicineCode,
                    u.MedicineName,
                    u.TotalQuantity,
                    u.TotalAmount,
                    Percentage = totalAmount > 0 ? Math.Round(u.TotalAmount * 100m / totalAmount, 2) : 0,
                    ABCClass = abcClass,
                    VENClass = "N" // Default to Normal; V/E requires clinical classification
                };
            }).ToList();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAmount = totalAmount,
                ClassA_Count = classified.Count(c => c.ABCClass == "A"),
                ClassA_Amount = classified.Where(c => c.ABCClass == "A").Sum(c => c.TotalAmount),
                ClassB_Count = classified.Count(c => c.ABCClass == "B"),
                ClassB_Amount = classified.Where(c => c.ABCClass == "B").Sum(c => c.TotalAmount),
                ClassC_Count = classified.Count(c => c.ABCClass == "C"),
                ClassC_Amount = classified.Where(c => c.ABCClass == "C").Sum(c => c.TotalAmount),
                Items = classified.Take(50)
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "ABC/VEN report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalAmount = 0m };
        }
    }


}
