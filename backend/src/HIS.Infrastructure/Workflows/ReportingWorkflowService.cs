using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 10: Báo cáo & Thống kê (Reporting Workflow)
/// Theo HIS_DataFlow_Architecture.md - Liên kết Module 15, 16, 11
///
/// LUỒNG BÁO CÁO:
/// - Module 15 (BC Dược): Báo cáo xuất nhập tồn, thuốc kiểm soát đặc biệt
/// - Module 11 (Tài chính): Báo cáo doanh thu, chi phí, lợi nhuận
/// - Module 16 (HSBA/KHTH): Báo cáo bệnh án, thống kê lâm sàng
/// - Module 12 (BHYT): Báo cáo claim BHYT
///
/// LIÊN KẾT:
/// - Tổng hợp dữ liệu từ tất cả module
/// - Xuất báo cáo theo mẫu quy định
/// - Dashboard quản trị
/// </summary>
public class ReportingWorkflowService : IReportingWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public ReportingWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region BÁO CÁO DƯỢC (Module 15)

    /// <summary>
    /// Báo cáo sử dụng thuốc
    /// - Thống kê theo nhóm thuốc
    /// - Theo khoa/phòng
    /// - Theo thời gian
    /// </summary>
    public async Task<DrugUsageReportResult> GenerateDrugUsageReportAsync(DateRange range)
    {
        try
        {
            var transactions = await _unitOfWork.GetRepository<StockTransaction>()
                .Query()
                .Include(st => st.Item)
                .Where(st => st.TransactionDate >= range.From
                    && st.TransactionDate <= range.To
                    && st.Quantity < 0 // Only dispensed items
                    && !st.IsDeleted)
                .ToListAsync();

            var reportData = transactions
                .GroupBy(st => st.Item?.DrugGroup ?? "Khác")
                .Select(g => new
                {
                    DrugGroup = g.Key,
                    TotalQuantity = Math.Abs(g.Sum(st => st.Quantity)),
                    TotalValue = Math.Abs(g.Sum(st => st.Quantity * (st.Item?.Price ?? 0))),
                    ItemCount = g.Select(st => st.ItemId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalValue)
                .ToList();

            var report = new
            {
                ReportType = "DrugUsage",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalItems = transactions.Select(t => t.ItemId).Distinct().Count(),
                    TotalQuantity = Math.Abs(transactions.Sum(t => t.Quantity)),
                    TotalValue = Math.Abs(transactions.Sum(t => t.Quantity * (t.Item?.Price ?? 0)))
                },
                Details = reportData
            };

            return new DrugUsageReportResult(true, report, "Đã xuất báo cáo sử dụng thuốc");
        }
        catch (Exception ex)
        {
            return new DrugUsageReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo thuốc kiểm soát đặc biệt
    /// RULE_PHAR_003: Thuốc gây nghiện/hướng thần
    /// </summary>
    public async Task<ControlledDrugReportResult> GenerateControlledDrugReportAsync(DateRange range)
    {
        try
        {
            var controlledDrugs = await _unitOfWork.GetRepository<StockTransaction>()
                .Query()
                .Include(st => st.Item)
                .Where(st => st.TransactionDate >= range.From
                    && st.TransactionDate <= range.To
                    && st.Item!.IsControlled
                    && !st.IsDeleted)
                .ToListAsync();

            var reportData = controlledDrugs
                .GroupBy(st => st.Item?.Name ?? "Unknown")
                .Select(g => new
                {
                    DrugName = g.Key,
                    DrugType = g.First().Item?.ControlledType ?? "Unknown",
                    OpeningBalance = 0m, // Would calculate from previous period
                    Received = g.Where(t => t.Quantity > 0).Sum(t => t.Quantity),
                    Dispensed = Math.Abs(g.Where(t => t.Quantity < 0).Sum(t => t.Quantity)),
                    ClosingBalance = 0m // Would calculate current stock
                })
                .ToList();

            var report = new
            {
                ReportType = "ControlledDrug",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Details = reportData
            };

            return new ControlledDrugReportResult(true, report, "Đã xuất báo cáo thuốc kiểm soát đặc biệt");
        }
        catch (Exception ex)
        {
            return new ControlledDrugReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo thuốc sắp hết hạn
    /// RULE_PHAR_002: Cảnh báo 30/60/90 ngày
    /// </summary>
    public async Task<ExpiryReportResult> GenerateExpiryReportAsync(DateRange range)
    {
        try
        {
            var expiringItems = await _unitOfWork.GetRepository<ItemBatch>()
                .Query()
                .Include(b => b.Item)
                .Where(b => b.ExpiryDate >= range.From
                    && b.ExpiryDate <= range.To
                    && b.CurrentQuantity > 0
                    && !b.IsDeleted)
                .OrderBy(b => b.ExpiryDate)
                .ToListAsync();

            var reportData = expiringItems.Select(b => new
            {
                ItemName = b.Item?.Name ?? "Unknown",
                BatchNumber = b.BatchNumber,
                ExpiryDate = b.ExpiryDate,
                RemainingQuantity = b.CurrentQuantity,
                Value = b.CurrentQuantity * (b.Item?.Price ?? 0),
                DaysToExpiry = (b.ExpiryDate - DateTime.Now).Days
            }).ToList();

            var report = new
            {
                ReportType = "Expiry",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalBatches = reportData.Count,
                    TotalValue = reportData.Sum(r => r.Value),
                    CriticalItems = reportData.Count(r => r.DaysToExpiry <= 30)
                },
                Details = reportData
            };

            return new ExpiryReportResult(true, report, "Đã xuất báo cáo thuốc sắp hết hạn");
        }
        catch (Exception ex)
        {
            return new ExpiryReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo tồn kho
    /// </summary>
    public async Task<StockReportResult> GenerateStockReportAsync(DateTime asOfDate)
    {
        try
        {
            var stocks = await _unitOfWork.GetRepository<ItemStock>()
                .Query()
                .Include(s => s.Item)
                .Where(s => !s.IsDeleted)
                .ToListAsync();

            var reportData = stocks.Select(s => new
            {
                ItemCode = s.Item?.Code ?? "",
                ItemName = s.Item?.Name ?? "Unknown",
                Unit = s.Item?.Unit ?? "",
                Quantity = s.Quantity,
                UnitPrice = s.Item?.Price ?? 0,
                TotalValue = s.Quantity * (s.Item?.Price ?? 0),
                MinStock = s.Item?.MinStockLevel ?? 0,
                Status = s.Quantity <= (s.Item?.MinStockLevel ?? 0) ? "Low" : "Normal"
            }).ToList();

            var report = new
            {
                ReportType = "Stock",
                AsOfDate = asOfDate,
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalItems = reportData.Count,
                    TotalValue = reportData.Sum(r => r.TotalValue),
                    LowStockItems = reportData.Count(r => r.Status == "Low")
                },
                Details = reportData
            };

            return new StockReportResult(true, report, "Đã xuất báo cáo tồn kho");
        }
        catch (Exception ex)
        {
            return new StockReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region BÁO CÁO TÀI CHÍNH (Module 11)

    /// <summary>
    /// Báo cáo doanh thu
    /// </summary>
    public async Task<RevenueReportResult> GenerateRevenueReportAsync(DateRange range)
    {
        try
        {
            var payments = await _unitOfWork.GetRepository<Payment>()
                .Query()
                .Include(p => p.Invoice)
                .Where(p => p.PaidAt >= range.From
                    && p.PaidAt <= range.To
                    && !p.IsDeleted)
                .ToListAsync();

            var byDay = payments
                .GroupBy(p => p.PaidAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(p => p.Amount),
                    TransactionCount = g.Count()
                })
                .OrderBy(x => x.Date)
                .ToList();

            var byPaymentMethod = payments
                .GroupBy(p => p.PaymentMethod)
                .Select(g => new
                {
                    Method = g.Key,
                    Total = g.Sum(p => p.Amount),
                    Count = g.Count()
                })
                .ToList();

            var report = new
            {
                ReportType = "Revenue",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalRevenue = payments.Sum(p => p.Amount),
                    TotalTransactions = payments.Count,
                    AverageTransaction = payments.Any() ? payments.Average(p => p.Amount) : 0
                },
                ByDay = byDay,
                ByPaymentMethod = byPaymentMethod
            };

            return new RevenueReportResult(true, report, "Đã xuất báo cáo doanh thu");
        }
        catch (Exception ex)
        {
            return new RevenueReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo chi phí
    /// </summary>
    public async Task<CostReportResult> GenerateCostReportAsync(DateRange range)
    {
        try
        {
            var purchases = await _unitOfWork.GetRepository<GoodsReceipt>()
                .Query()
                .Include(gr => gr.Items)
                .Where(gr => gr.ReceivedAt >= range.From
                    && gr.ReceivedAt <= range.To
                    && !gr.IsDeleted)
                .ToListAsync();

            var totalCost = purchases.Sum(gr => gr.Items.Sum(i => i.Quantity * i.UnitPrice));

            var byCategory = purchases
                .SelectMany(gr => gr.Items)
                .GroupBy(i => i.Item?.Category ?? "Khác")
                .Select(g => new
                {
                    Category = g.Key,
                    TotalCost = g.Sum(i => i.Quantity * i.UnitPrice)
                })
                .ToList();

            var report = new
            {
                ReportType = "Cost",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalCost = totalCost,
                    TotalReceipts = purchases.Count
                },
                ByCategory = byCategory
            };

            return new CostReportResult(true, report, "Đã xuất báo cáo chi phí");
        }
        catch (Exception ex)
        {
            return new CostReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo lợi nhuận
    /// </summary>
    public async Task<ProfitReportResult> GenerateProfitReportAsync(DateRange range)
    {
        try
        {
            var revenueResult = await GenerateRevenueReportAsync(range);
            var costResult = await GenerateCostReportAsync(range);

            var revenue = (revenueResult.ReportData as dynamic)?.Summary?.TotalRevenue ?? 0m;
            var cost = (costResult.ReportData as dynamic)?.Summary?.TotalCost ?? 0m;
            var profit = revenue - cost;

            var report = new
            {
                ReportType = "Profit",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalRevenue = revenue,
                    TotalCost = cost,
                    GrossProfit = profit,
                    ProfitMargin = revenue > 0 ? (profit / revenue * 100) : 0
                }
            };

            return new ProfitReportResult(true, report, "Đã xuất báo cáo lợi nhuận");
        }
        catch (Exception ex)
        {
            return new ProfitReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo công nợ
    /// </summary>
    public async Task<DebtReportResult> GenerateDebtReportAsync(DateTime asOfDate)
    {
        try
        {
            var unpaidInvoices = await _unitOfWork.GetRepository<Invoice>()
                .Query()
                .Include(i => i.Patient)
                .Where(i => i.Status == "Pending" && !i.IsDeleted)
                .ToListAsync();

            var reportData = unpaidInvoices.Select(i => new
            {
                InvoiceNumber = i.InvoiceNumber,
                PatientName = i.Patient?.FullName ?? "Unknown",
                InvoiceDate = i.InvoiceDate,
                Amount = i.TotalAmount,
                DaysOverdue = (asOfDate - i.InvoiceDate).Days
            }).OrderByDescending(x => x.DaysOverdue).ToList();

            var report = new
            {
                ReportType = "Debt",
                AsOfDate = asOfDate,
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalUnpaidInvoices = reportData.Count,
                    TotalDebt = reportData.Sum(r => r.Amount),
                    Overdue30Days = reportData.Count(r => r.DaysOverdue > 30),
                    Overdue60Days = reportData.Count(r => r.DaysOverdue > 60),
                    Overdue90Days = reportData.Count(r => r.DaysOverdue > 90)
                },
                Details = reportData
            };

            return new DebtReportResult(true, report, "Đã xuất báo cáo công nợ");
        }
        catch (Exception ex)
        {
            return new DebtReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region BÁO CÁO HSBA (Module 16)

    /// <summary>
    /// Thống kê bệnh án
    /// </summary>
    public async Task<MedicalRecordReportResult> GenerateMedicalRecordStatsAsync(DateRange range)
    {
        try
        {
            var visits = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .Where(v => v.VisitDate >= range.From && v.VisitDate <= range.To && !v.IsDeleted)
                .CountAsync();

            var admissions = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .Where(a => a.AdmittedAt >= range.From && a.AdmittedAt <= range.To && !a.IsDeleted)
                .CountAsync();

            var surgeries = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .Where(s => s.CreatedAt >= range.From && s.CreatedAt <= range.To && !s.IsDeleted)
                .CountAsync();

            var report = new
            {
                ReportType = "MedicalRecord",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalOutpatientVisits = visits,
                    TotalAdmissions = admissions,
                    TotalSurgeries = surgeries
                }
            };

            return new MedicalRecordReportResult(true, report, "Đã xuất thống kê bệnh án");
        }
        catch (Exception ex)
        {
            return new MedicalRecordReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thống kê chẩn đoán theo ICD-10
    /// </summary>
    public async Task<DiagnosisReportResult> GenerateDiagnosisStatsAsync(DateRange range)
    {
        try
        {
            var diagnoses = await _unitOfWork.GetRepository<Examination>()
                .Query()
                .Where(e => e.CreatedAt >= range.From && e.CreatedAt <= range.To && !e.IsDeleted)
                .GroupBy(e => e.MainDiagnosis)
                .Select(g => new { Diagnosis = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(20)
                .ToListAsync();

            var report = new
            {
                ReportType = "Diagnosis",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                TopDiagnoses = diagnoses
            };

            return new DiagnosisReportResult(true, report, "Đã xuất thống kê chẩn đoán");
        }
        catch (Exception ex)
        {
            return new DiagnosisReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thống kê theo khoa/phòng
    /// </summary>
    public async Task<DepartmentReportResult> GenerateDepartmentStatsAsync(DateRange range)
    {
        try
        {
            var departments = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .Include(v => v.Department)
                .Where(v => v.VisitDate >= range.From && v.VisitDate <= range.To && !v.IsDeleted)
                .GroupBy(v => v.Department!.Name)
                .Select(g => new { Department = g.Key, VisitCount = g.Count() })
                .ToListAsync();

            var report = new
            {
                ReportType = "Department",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                DepartmentStats = departments
            };

            return new DepartmentReportResult(true, report, "Đã xuất thống kê theo khoa");
        }
        catch (Exception ex)
        {
            return new DepartmentReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region BÁO CÁO BHYT

    /// <summary>
    /// Báo cáo claim BHYT
    /// </summary>
    public async Task<InsuranceClaimReportResult> GenerateInsuranceClaimReportAsync(DateRange range)
    {
        try
        {
            var claims = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Where(cc => cc.CreatedAt >= range.From
                    && cc.CreatedAt <= range.To
                    && cc.InsuranceAmount > 0
                    && !cc.IsDeleted)
                .ToListAsync();

            var report = new
            {
                ReportType = "InsuranceClaim",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalClaims = claims.Count,
                    TotalInsuranceAmount = claims.Sum(c => c.InsuranceAmount ?? 0),
                    TotalPatientAmount = claims.Sum(c => c.PatientAmount ?? 0)
                }
            };

            return new InsuranceClaimReportResult(true, report, "Đã xuất báo cáo claim BHYT");
        }
        catch (Exception ex)
        {
            return new InsuranceClaimReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo từ chối BHYT
    /// </summary>
    public async Task<RejectionReportResult> GenerateRejectionReportAsync(DateRange range)
    {
        try
        {
            var rejections = await _unitOfWork.GetRepository<InsuranceRejection>()
                .Query()
                .Where(r => r.RejectedAt >= range.From && r.RejectedAt <= range.To && !r.IsDeleted)
                .ToListAsync();

            var byReason = rejections
                .GroupBy(r => r.RejectionReason)
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .ToList();

            var report = new
            {
                ReportType = "Rejection",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Summary = new
                {
                    TotalRejections = rejections.Count
                },
                ByReason = byReason
            };

            return new RejectionReportResult(true, report, "Đã xuất báo cáo từ chối BHYT");
        }
        catch (Exception ex)
        {
            return new RejectionReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region BÁO CÁO QUẢN TRỊ

    /// <summary>
    /// Dashboard tổng quan
    /// </summary>
    public async Task<DashboardResult> GenerateDashboardAsync()
    {
        try
        {
            var today = DateTime.Today;
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            // Today's stats
            var todayVisits = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .CountAsync(v => v.VisitDate.Date == today && !v.IsDeleted);

            var todayAdmissions = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .CountAsync(a => a.AdmittedAt.Date == today && !a.IsDeleted);

            var todayRevenue = await _unitOfWork.GetRepository<Payment>()
                .Query()
                .Where(p => p.PaidAt.Date == today && !p.IsDeleted)
                .SumAsync(p => p.Amount);

            // Current inpatients
            var currentInpatients = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .CountAsync(a => a.Status == "Active" && !a.IsDeleted);

            // Monthly stats
            var monthlyVisits = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .CountAsync(v => v.VisitDate >= thisMonth && !v.IsDeleted);

            var monthlyRevenue = await _unitOfWork.GetRepository<Payment>()
                .Query()
                .Where(p => p.PaidAt >= thisMonth && !p.IsDeleted)
                .SumAsync(p => p.Amount);

            var dashboard = new
            {
                GeneratedAt = DateTime.Now,
                Today = new
                {
                    OutpatientVisits = todayVisits,
                    NewAdmissions = todayAdmissions,
                    Revenue = todayRevenue,
                    Date = today
                },
                Current = new
                {
                    InpatientCount = currentInpatients
                },
                Monthly = new
                {
                    TotalVisits = monthlyVisits,
                    TotalRevenue = monthlyRevenue,
                    Month = thisMonth.ToString("MMMM yyyy")
                }
            };

            return new DashboardResult(true, dashboard, "Dashboard generated");
        }
        catch (Exception ex)
        {
            return new DashboardResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Báo cáo KPI
    /// </summary>
    public async Task<KPIReportResult> GenerateKPIReportAsync(DateRange range)
    {
        try
        {
            // Calculate KPIs
            var totalVisits = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .CountAsync(v => v.VisitDate >= range.From && v.VisitDate <= range.To && !v.IsDeleted);

            var totalAdmissions = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .CountAsync(a => a.AdmittedAt >= range.From && a.AdmittedAt <= range.To && !a.IsDeleted);

            var totalRevenue = await _unitOfWork.GetRepository<Payment>()
                .Query()
                .Where(p => p.PaidAt >= range.From && p.PaidAt <= range.To && !p.IsDeleted)
                .SumAsync(p => p.Amount);

            var averageLengthOfStay = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .Where(a => a.DischargedAt.HasValue
                    && a.AdmittedAt >= range.From
                    && a.AdmittedAt <= range.To
                    && !a.IsDeleted)
                .AverageAsync(a => EF.Functions.DateDiffDay(a.AdmittedAt, a.DischargedAt));

            var kpi = new
            {
                ReportType = "KPI",
                Period = new { From = range.From, To = range.To },
                GeneratedAt = DateTime.Now,
                Indicators = new
                {
                    TotalOutpatientVisits = totalVisits,
                    TotalInpatientAdmissions = totalAdmissions,
                    TotalRevenue = totalRevenue,
                    AverageLengthOfStay = averageLengthOfStay ?? 0,
                    RevenuePerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0
                }
            };

            return new KPIReportResult(true, kpi, "Đã xuất báo cáo KPI");
        }
        catch (Exception ex)
        {
            return new KPIReportResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion
}
