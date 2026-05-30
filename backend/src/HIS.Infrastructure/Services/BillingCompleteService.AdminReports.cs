using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 3 (2026-05-30): tach 3 region (10.3 Cashier + 10.4 Stats Insurance + 10.5 Service Reversal, ~887 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.3 Cashier Management

    public async Task<CashierReportDto> GetCashierReportAsync(CashierReportRequestDto dto)
    {
        try
        {
            var user = await _context.Users.FindAsync(dto.CashierId);

            var cashBook = await _context.CashBooks
                .FirstOrDefaultAsync(cb => cb.CashierId == dto.CashierId
                    && cb.StartDate >= dto.FromDate && (cb.EndDate == null || cb.EndDate <= dto.ToDate));

            var receipts = await _context.Receipts
                .Where(r => r.CashierId == dto.CashierId
                    && r.ReceiptDate >= dto.FromDate
                    && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1)
                .ToListAsync();

            var totalCash = receipts.Where(r => r.PaymentMethod == 1 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalCard = receipts.Where(r => r.PaymentMethod == 3 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalTransfer = receipts.Where(r => r.PaymentMethod == 2 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

            return new CashierReportDto
            {
                CashierId = dto.CashierId,
                CashierName = user?.FullName ?? string.Empty,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                ShiftCode = dto.ShiftCode,
                OpeningBalance = cashBook?.OpeningBalance ?? 0,
                TotalCashReceived = totalCash,
                TotalCardReceived = totalCard,
                TotalTransferReceived = totalTransfer,
                TotalRefunded = totalRefund,
                ClosingBalance = (cashBook?.OpeningBalance ?? 0) + totalCash + totalCard + totalTransfer - totalRefund,
                TransactionCount = receipts.Count,
                IsClosed = cashBook?.IsClosed ?? false
            };
        }
        catch { return new CashierReportDto(); }
    }

    public async Task<CashierReportDto> CloseCashBookAsync(CloseCashBookDto dto, Guid userId)
    {
        // Find open cash book for this cashier
        var cashBook = await _context.CashBooks
            .FirstOrDefaultAsync(cb => cb.CashierId == dto.CashierId && !cb.IsClosed);
        if (cashBook == null)
            throw new Exception("No open cash book found for this cashier");

        // Calculate totals from receipts in this cash book's period
        var receipts = await _context.Receipts
            .Where(r => r.CashierId == dto.CashierId
                && r.ReceiptDate >= cashBook.StartDate
                && r.Status == 1)
            .ToListAsync();

        var totalCash = receipts.Where(r => r.PaymentMethod == 1 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalCard = receipts.Where(r => r.PaymentMethod == 3 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalTransfer = receipts.Where(r => r.PaymentMethod == 2 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

        cashBook.TotalReceipt = totalCash + totalCard + totalTransfer;
        cashBook.TotalRefund = totalRefund;
        cashBook.ClosingBalance = cashBook.OpeningBalance + cashBook.TotalReceipt - cashBook.TotalRefund;
        cashBook.IsClosed = true;
        cashBook.ClosedAt = DateTime.Now;
        cashBook.EndDate = DateTime.Now;
        cashBook.Note = dto.Note;

        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(dto.CashierId);

        return new CashierReportDto
        {
            CashierId = dto.CashierId,
            CashierName = user?.FullName ?? string.Empty,
            FromDate = cashBook.StartDate,
            ToDate = DateTime.Now,
            ShiftCode = dto.ShiftCode,
            OpeningBalance = cashBook.OpeningBalance,
            TotalCashReceived = totalCash,
            TotalCardReceived = totalCard,
            TotalTransferReceived = totalTransfer,
            TotalRefunded = totalRefund,
            ClosingBalance = cashBook.ClosingBalance,
            TransactionCount = receipts.Count,
            IsClosed = true
        };
    }

    public async Task<OutpatientRevenueReportDto> GetOutpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 1)
                .ToListAsync();

            var dailyDetails = receipts
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new DailyRevenueItemDto
                {
                    Date = g.Key,
                    PatientCount = g.Select(r => r.PatientId).Distinct().Count(),
                    InvoiceCount = g.Count(),
                    TotalAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount) - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                    PatientAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount) - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
                })
                .OrderBy(d => d.Date)
                .ToList();

            var totalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

            return new OutpatientRevenueReportDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalPatients = receipts.Select(r => r.PatientId).Distinct().Count(),
                TotalInvoices = receipts.Count(r => r.ReceiptType != 3),
                TotalRevenue = totalRevenue,
                PatientRevenue = totalRevenue,
                DailyDetails = dailyDetails
            };
        }
        catch { return new OutpatientRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate }; }
    }

    public async Task<InpatientRevenueReportDto> GetInpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord).ThenInclude(mr => mr!.Department)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 2)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate && d.Status != 3)
                .SumAsync(d => d.Amount);

            var deptDetails = receipts
                .Where(r => r.MedicalRecord?.Department != null)
                .GroupBy(r => new { r.MedicalRecord!.DepartmentId, r.MedicalRecord.Department!.DepartmentName })
                .Select(g => new DepartmentRevenueItemDto
                {
                    DepartmentId = g.Key.DepartmentId ?? Guid.Empty,
                    DepartmentName = g.Key.DepartmentName ?? string.Empty,
                    PatientCount = g.Select(r => r.PatientId).Distinct().Count(),
                    TotalAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount) - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
                })
                .OrderByDescending(d => d.TotalAmount)
                .ToList();

            var totalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

            return new InpatientRevenueReportDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalPatients = receipts.Select(r => r.PatientId).Distinct().Count(),
                TotalInvoices = receipts.Count(r => r.ReceiptType != 3),
                TotalRevenue = totalRevenue,
                PatientRevenue = totalRevenue,
                DepositRevenue = deposits,
                DepartmentDetails = deptDetails
            };
        }
        catch { return new InpatientRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate }; }
    }

    public async Task<DepositRevenueReportDto> GetDepositRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate)
                .ToListAsync();

            var dailyDetails = deposits
                .GroupBy(d => d.ReceiptDate.Date)
                .Select(g => new DailyDepositItemDto
                {
                    Date = g.Key,
                    DepositCount = g.Count(d => d.Status != 3),
                    DepositAmount = g.Where(d => d.Status != 3).Sum(d => d.Amount),
                    RefundCount = g.Count(d => d.Status == 3),
                    RefundAmount = g.Where(d => d.Status == 3).Sum(d => d.Amount)
                })
                .OrderBy(d => d.Date)
                .ToList();

            var activeDeposits = deposits.Where(d => d.Status != 3).ToList();
            var refundedDeposits = deposits.Where(d => d.Status == 3).ToList();

            return new DepositRevenueReportDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalDeposits = activeDeposits.Count,
                TotalDepositAmount = activeDeposits.Sum(d => d.Amount),
                TotalUsedAmount = activeDeposits.Sum(d => d.UsedAmount),
                TotalRefundAmount = refundedDeposits.Sum(d => d.Amount),
                RemainingAmount = activeDeposits.Sum(d => d.RemainingAmount),
                DailyDetails = dailyDetails
            };
        }
        catch { return new DepositRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate }; }
    }

    public async Task<CashBookUsageReportDto> GetCashBookUsageReportAsync(Guid cashBookId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var cashBook = await _context.CashBooks.FindAsync(cashBookId);
            if (cashBook == null) return new CashBookUsageReportDto();

            var receipts = await _context.Receipts
                .Include(r => r.Cashier)
                .Where(r => r.CashBookId == cashBookId
                    && r.ReceiptDate >= fromDate && r.ReceiptDate <= toDate)
                .ToListAsync();

            var userUsages = receipts
                .GroupBy(r => new { r.CashierId, CashierName = r.Cashier?.FullName ?? "" })
                .Select(g => new UserCashBookUsageDto
                {
                    UserId = g.Key.CashierId,
                    UserName = g.Key.CashierName,
                    ReceiptCount = g.Count(),
                    TotalAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                               - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
                })
                .ToList();

            var totalReceipt = receipts.Where(r => r.ReceiptType != 3 && r.Status == 1).Sum(r => r.FinalAmount);
            var totalPayment = receipts.Where(r => r.ReceiptType == 3 && r.Status == 1).Sum(r => r.FinalAmount);

            return new CashBookUsageReportDto
            {
                CashBookId = cashBookId,
                CashBookCode = cashBook.BookCode,
                CashBookName = cashBook.BookName,
                FromDate = fromDate,
                ToDate = toDate,
                TotalReceiptsUsed = receipts.Count(r => r.Status == 1),
                TotalReceiptsCancelled = receipts.Count(r => r.Status == 2),
                TotalReceipt = totalReceipt,
                TotalPayment = totalPayment,
                Balance = totalReceipt - totalPayment,
                UserUsages = userUsages
            };
        }
        catch { return new CashBookUsageReportDto(); }
    }

    /// <summary>
    /// In bao cao thu tien ngoai tru theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintOutpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.Cashier)
                .Include(r => r.MedicalRecord).ThenInclude(m => m!.Patient)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.ReceiptType == 2);

            // Filter outpatient (TreatmentType=1)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 1);

            if (dto.DepartmentId.HasValue)
                query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId.Value);
            if (dto.CashierId.HasValue)
                query = query.Where(r => r.CashierId == dto.CashierId.Value);

            var receipts = await query.OrderBy(r => r.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "Tong tien", "Giam gia", "Thanh toan", "PT thanh toan", "Thu ngan" };
            var rows = receipts.Select(r => new[]
            {
                r.ReceiptCode,
                r.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                r.MedicalRecord?.Patient?.FullName ?? "",
                r.Amount.ToString("#,##0"),
                r.Discount.ToString("#,##0"),
                r.FinalAmount.ToString("#,##0"),
                r.PaymentMethod switch { 1 => "TM", 2 => "CK", 3 => "The", 4 => "Vi", _ => "" },
                r.Cashier?.FullName ?? ""
            }).ToList();

            // Add totals row
            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "",
                    receipts.Sum(r => r.Amount).ToString("#,##0"),
                    receipts.Sum(r => r.Discount).ToString("#,##0"),
                    receipts.Sum(r => r.FinalAmount).ToString("#,##0"),
                    "", ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO THU TIEN NGOAI TRU", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bao cao thu tien noi tru theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintInpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.Cashier)
                .Include(r => r.MedicalRecord).ThenInclude(m => m!.Patient)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.ReceiptType == 2);

            // Filter inpatient (TreatmentType=2)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 2);

            if (dto.DepartmentId.HasValue)
                query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId.Value);
            if (dto.CashierId.HasValue)
                query = query.Where(r => r.CashierId == dto.CashierId.Value);

            var receipts = await query.OrderBy(r => r.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "So HS", "Tong tien", "Giam gia", "Thanh toan", "Thu ngan" };
            var rows = receipts.Select(r => new[]
            {
                r.ReceiptCode,
                r.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                r.MedicalRecord?.Patient?.FullName ?? "",
                r.MedicalRecord?.MedicalRecordCode ?? "",
                r.Amount.ToString("#,##0"),
                r.Discount.ToString("#,##0"),
                r.FinalAmount.ToString("#,##0"),
                r.Cashier?.FullName ?? ""
            }).ToList();

            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "", "",
                    receipts.Sum(r => r.Amount).ToString("#,##0"),
                    receipts.Sum(r => r.Discount).ToString("#,##0"),
                    receipts.Sum(r => r.FinalAmount).ToString("#,##0"),
                    ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO THU TIEN NOI TRU", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bao cao tam ung theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintDepositRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Deposits
                .Include(d => d.Patient)
                .Include(d => d.ReceivedBy)
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate);

            var deposits = await query.OrderBy(d => d.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "So tien", "Da su dung", "Con lai", "PT thanh toan", "Nguoi thu" };
            var rows = deposits.Select(d => new[]
            {
                d.ReceiptNumber,
                d.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                d.Patient?.FullName ?? "",
                d.Amount.ToString("#,##0"),
                d.UsedAmount.ToString("#,##0"),
                d.RemainingAmount.ToString("#,##0"),
                d.PaymentMethod switch { 1 => "TM", 2 => "CK", 3 => "The", 4 => "QR", _ => "" },
                d.ReceivedBy?.FullName ?? ""
            }).ToList();

            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "",
                    deposits.Sum(d => d.Amount).ToString("#,##0"),
                    deposits.Sum(d => d.UsedAmount).ToString("#,##0"),
                    deposits.Sum(d => d.RemainingAmount).ToString("#,##0"),
                    "", ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO TAM UNG", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion

    #region 10.4 Statistics & Insurance

    public async Task<BillingStatisticsDto> GetBillingStatisticsAsync(BillingStatisticsRequestDto dto)
    {
        try
        {
            var receiptsQuery = _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate && r.Status == 1);

            if (dto.DepartmentId.HasValue)
                receiptsQuery = receiptsQuery.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId);

            var receipts = await receiptsQuery.ToListAsync();

            var serviceRequests = await _context.ServiceRequests
                .Where(sr => sr.RequestDate >= dto.FromDate && sr.RequestDate <= dto.ToDate && sr.Status != 4)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate)
                .ToListAsync();

            var outpatientReceipts = receipts.Where(r => r.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatientReceipts = receipts.Where(r => r.MedicalRecord?.TreatmentType == 2).ToList();
            var totalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

            var result = new BillingStatisticsDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalPatients = receipts.Select(r => r.PatientId).Distinct().Count(),
                OutpatientCount = outpatientReceipts.Select(r => r.PatientId).Distinct().Count(),
                InpatientCount = inpatientReceipts.Select(r => r.PatientId).Distinct().Count(),
                TotalRevenue = totalRevenue,
                ServiceRevenue = serviceRequests.Where(sr => sr.RequestType != 0).Sum(sr => sr.TotalAmount),
                InsuranceRevenue = serviceRequests.Sum(sr => sr.InsuranceAmount),
                PatientRevenue = serviceRequests.Sum(sr => sr.PatientAmount),
                TotalDeposit = deposits.Where(d => d.Status != 3).Sum(d => d.Amount),
                DepositUsed = deposits.Sum(d => d.UsedAmount),
                DepositRefund = deposits.Where(d => d.Status == 3).Sum(d => d.Amount),
                TotalDebt = serviceRequests.Where(sr => !sr.IsPaid).Sum(sr => sr.PatientAmount)
            };

            if (dto.IncludeDailyTrend)
            {
                result.DailyTrend = receipts
                    .GroupBy(r => r.ReceiptDate.Date)
                    .Select(g => new DailyRevenueItemDto
                    {
                        Date = g.Key,
                        PatientCount = g.Select(r => r.PatientId).Distinct().Count(),
                        InvoiceCount = g.Count(),
                        TotalAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                                     - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
                    })
                    .OrderBy(d => d.Date)
                    .ToList();
            }

            return result;
        }
        catch { return new BillingStatisticsDto { FromDate = dto.FromDate, ToDate = dto.ToDate }; }
    }

    public async Task<DailyRevenueReportDto> GetDailyRevenueAsync(DateTime date)
    {
        try
        {
            var dayStart = date.Date;
            var dayEnd = dayStart.AddDays(1);

            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dayStart && r.ReceiptDate < dayEnd && r.Status == 1)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dayStart && d.ReceiptDate < dayEnd && d.Status != 3)
                .ToListAsync();

            var outpatient = receipts.Where(r => r.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatient = receipts.Where(r => r.MedicalRecord?.TreatmentType == 2).ToList();

            var refunds = receipts.Where(r => r.ReceiptType == 3).ToList();

            return new DailyRevenueReportDto
            {
                Date = date.Date,
                OutpatientCount = outpatient.Select(r => r.PatientId).Distinct().Count(),
                OutpatientRevenue = outpatient.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                InpatientCount = inpatient.Select(r => r.PatientId).Distinct().Count(),
                InpatientRevenue = inpatient.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                DepositCount = deposits.Count,
                DepositAmount = deposits.Sum(d => d.Amount),
                RefundCount = refunds.Count,
                RefundAmount = refunds.Sum(r => r.FinalAmount),
                TotalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
            };
        }
        catch { return new DailyRevenueReportDto { Date = date.Date }; }
    }

    public async Task<List<DepartmentRevenueDto>> GetRevenueByDepartmentAsync(DepartmentRevenueRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.MedicalRecord).ThenInclude(mr => mr!.Department)
                .Include(r => r.Details)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.MedicalRecord != null && r.MedicalRecord.DepartmentId != null);

            if (dto.PatientType.HasValue)
                query = query.Where(r => r.MedicalRecord!.PatientType == dto.PatientType.Value);

            if (dto.DepartmentIds != null && dto.DepartmentIds.Any())
                query = query.Where(r => dto.DepartmentIds.Contains(r.MedicalRecord!.DepartmentId!.Value));

            var receipts = await query.ToListAsync();

            return receipts
                .Where(r => r.MedicalRecord?.Department != null)
                .GroupBy(r => new
                {
                    DeptId = r.MedicalRecord!.DepartmentId!.Value,
                    DeptCode = r.MedicalRecord.Department!.DepartmentCode ?? "",
                    DeptName = r.MedicalRecord.Department.DepartmentName ?? ""
                })
                .Select(g =>
                {
                    var details = g.SelectMany(r => r.Details ?? Enumerable.Empty<ReceiptDetail>()).ToList();
                    return new DepartmentRevenueDto
                    {
                        DepartmentId = g.Key.DeptId,
                        DepartmentCode = g.Key.DeptCode,
                        DepartmentName = g.Key.DeptName,
                        TotalRevenue = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                                     - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                        ServiceRevenue = details.Where(d => d.ItemType == 1).Sum(d => d.FinalAmount),
                        MedicineRevenue = details.Where(d => d.ItemType == 2).Sum(d => d.FinalAmount),
                        SupplyRevenue = details.Where(d => d.ItemType == 3).Sum(d => d.FinalAmount),
                        PatientCount = g.Select(r => r.PatientId).Distinct().Count()
                    };
                })
                .OrderByDescending(d => d.TotalRevenue)
                .ToList();
        }
        catch { return new List<DepartmentRevenueDto>(); }
    }

    public async Task<DebtStatisticsDto> GetDebtStatisticsAsync(DateTime? asOfDate)
    {
        try
        {
            var cutoff = asOfDate ?? DateTime.Now;

            var unpaidRequests = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr.Patient)
                .Where(sr => !sr.IsPaid && sr.Status != 4 && sr.PatientAmount > 0)
                .ToListAsync();

            var debtByPatient = unpaidRequests
                .GroupBy(sr => new
                {
                    PatientId = sr.MedicalRecord?.PatientId ?? Guid.Empty,
                    PatientCode = sr.MedicalRecord?.Patient?.PatientCode ?? "",
                    PatientName = sr.MedicalRecord?.Patient?.FullName ?? "",
                    Phone = sr.MedicalRecord?.Patient?.PhoneNumber
                })
                .Select(g => new
                {
                    g.Key.PatientId,
                    g.Key.PatientCode,
                    g.Key.PatientName,
                    g.Key.Phone,
                    DebtAmount = g.Sum(sr => sr.PatientAmount),
                    OldestDate = g.Min(sr => sr.RequestDate)
                })
                .ToList();

            var totalDebt = debtByPatient.Sum(d => d.DebtAmount);

            return new DebtStatisticsDto
            {
                AsOfDate = cutoff,
                TotalDebtors = debtByPatient.Count,
                TotalDebt = totalDebt,
                Debt0To30Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays <= 30).Sum(d => d.DebtAmount),
                Debt30To60Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 30 && (cutoff - d.OldestDate).TotalDays <= 60).Sum(d => d.DebtAmount),
                Debt60To90Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 60 && (cutoff - d.OldestDate).TotalDays <= 90).Sum(d => d.DebtAmount),
                DebtOver90Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 90).Sum(d => d.DebtAmount),
                TopDebtors = debtByPatient
                    .OrderByDescending(d => d.DebtAmount)
                    .Take(20)
                    .Select(d => new DebtorDto
                    {
                        PatientId = d.PatientId,
                        PatientCode = d.PatientCode,
                        PatientName = d.PatientName,
                        PhoneNumber = d.Phone,
                        DebtAmount = d.DebtAmount,
                        DaysOverdue = (int)(cutoff - d.OldestDate).TotalDays,
                        LastPaymentDate = d.OldestDate
                    })
                    .ToList()
            };
        }
        catch { return new DebtStatisticsDto { AsOfDate = asOfDate ?? DateTime.Now }; }
    }

    public async Task<InsuranceClaimDto> GenerateInsuranceClaimAsync(Guid medicalRecordId)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return new InsuranceClaimDto();

            var serviceRequests = await _context.ServiceRequests
                .Where(sr => sr.MedicalRecordId == medicalRecordId && sr.Status != 4)
                .ToListAsync();

            var totalAmount = serviceRequests.Sum(sr => sr.TotalAmount);
            var insuranceAmount = serviceRequests.Sum(sr => sr.InsuranceAmount);
            var patientAmount = serviceRequests.Sum(sr => sr.PatientAmount);

            return new InsuranceClaimDto
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecordId,
                MedicalRecordCode = record.MedicalRecordCode,
                PatientName = record.Patient?.FullName ?? string.Empty,
                InsuranceCardNumber = record.InsuranceNumber ?? record.Patient?.InsuranceNumber ?? string.Empty,
                TotalAmount = totalAmount,
                InsuranceAmount = insuranceAmount,
                PatientAmount = patientAmount,
                Status = 1,
                StatusName = "Cho giam dinh",
                CreatedAt = DateTime.Now
            };
        }
        catch { return new InsuranceClaimDto(); }
    }

    public async Task<Xml4210ResultDto> GenerateXml4210Async(GenerateXml4210RequestDto dto)
    {
        try
        {
            var query = _context.MedicalRecords
                .Include(r => r.Patient)
                .Where(r => r.AdmissionDate >= dto.FromDate && (r.DischargeDate == null || r.DischargeDate <= dto.ToDate)
                    && r.InsuranceNumber != null);

            if (dto.PatientType.HasValue)
                query = query.Where(r => r.PatientType == dto.PatientType.Value);

            if (dto.MedicalRecordIds != null && dto.MedicalRecordIds.Any())
                query = query.Where(r => dto.MedicalRecordIds.Contains(r.Id));

            var records = await query.ToListAsync();

            var xmlBuilder = new StringBuilder();
            xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
            xmlBuilder.AppendLine("<GIAMDINHHS>");
            xmlBuilder.AppendLine($"  <THONGTINDONVI>");
            xmlBuilder.AppendLine($"    <MACSKCB>79025</MACSKCB>");
            xmlBuilder.AppendLine($"  </THONGTINDONVI>");
            xmlBuilder.AppendLine($"  <DSHOSO>");

            decimal totalAmount = 0;
            var errors = new List<string>();

            foreach (var record in records)
            {
                if (string.IsNullOrEmpty(record.InsuranceNumber))
                {
                    errors.Add($"HS {record.MedicalRecordCode}: Thieu so the BHYT");
                    continue;
                }

                var srTotal = await _context.ServiceRequests
                    .Where(sr => sr.MedicalRecordId == record.Id && sr.Status != 4)
                    .SumAsync(sr => sr.TotalAmount);
                totalAmount += srTotal;

                xmlBuilder.AppendLine($"    <HOSO>");
                xmlBuilder.AppendLine($"      <MABN>{record.Patient?.PatientCode}</MABN>");
                xmlBuilder.AppendLine($"      <HOTENBN>{record.Patient?.FullName}</HOTENBN>");
                xmlBuilder.AppendLine($"      <MATHE>{record.InsuranceNumber}</MATHE>");
                xmlBuilder.AppendLine($"      <MABA>{record.MedicalRecordCode}</MABA>");
                xmlBuilder.AppendLine($"      <NGAYVAO>{record.AdmissionDate:yyyyMMddHHmm}</NGAYVAO>");
                xmlBuilder.AppendLine($"      <NGAYRA>{record.DischargeDate:yyyyMMddHHmm}</NGAYRA>");
                xmlBuilder.AppendLine($"      <CHANDOAN>{record.MainDiagnosis}</CHANDOAN>");
                xmlBuilder.AppendLine($"      <MAICD>{record.MainIcdCode}</MAICD>");
                xmlBuilder.AppendLine($"      <TONGCHI>{srTotal:F0}</TONGCHI>");
                xmlBuilder.AppendLine($"    </HOSO>");
            }

            xmlBuilder.AppendLine($"  </DSHOSO>");
            xmlBuilder.AppendLine("</GIAMDINHHS>");

            var xmlContent = xmlBuilder.ToString();
            return new Xml4210ResultDto
            {
                Success = !errors.Any(),
                FileName = $"XML4210_{dto.FromDate:yyyyMMdd}_{dto.ToDate:yyyyMMdd}.xml",
                FileContent = Encoding.UTF8.GetBytes(xmlContent),
                TotalRecords = records.Count,
                TotalAmount = totalAmount,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            return new Xml4210ResultDto { Errors = new List<string> { ex.Message } };
        }
    }

    public async Task<InsuranceClaimStatisticsDto> GetInsuranceClaimStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var invoices = await _context.InvoiceSummaries
                .Include(i => i.MedicalRecord)
                .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate
                    && i.MedicalRecord.InsuranceNumber != null)
                .ToListAsync();

            var outpatient = invoices.Where(i => i.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatient = invoices.Where(i => i.MedicalRecord?.TreatmentType == 2).ToList();

            return new InsuranceClaimStatisticsDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalClaims = invoices.Count,
                PendingClaims = invoices.Count(i => !i.IsApprovedByAccountant),
                ApprovedClaims = invoices.Count(i => i.IsApprovedByAccountant && i.Status >= 1),
                RejectedClaims = 0,
                TotalClaimAmount = invoices.Sum(i => i.InsuranceAmount),
                ApprovedAmount = invoices.Where(i => i.IsApprovedByAccountant).Sum(i => i.InsuranceAmount),
                RejectedAmount = 0,
                OutpatientAmount = outpatient.Sum(i => i.InsuranceAmount),
                InpatientAmount = inpatient.Sum(i => i.InsuranceAmount)
            };
        }
        catch { return new InsuranceClaimStatisticsDto { FromDate = fromDate, ToDate = toDate }; }
    }

    #endregion

    #region 10.5 Đảo bút toán dịch vụ

    public async Task<BillingReversalDto> ReverseServiceChargeAsync(ReverseServiceChargeDto dto, Guid userId)
    {
        // Tìm ServiceRequest
        var serviceRequest = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.Id == dto.ServiceRequestId);

        if (serviceRequest == null)
            throw new InvalidOperationException("Không tìm thấy chỉ định dịch vụ");

        var serviceName = await _context.Services
            .Where(s => s.Id == serviceRequest.ServiceId)
            .Select(s => s.ServiceName)
            .FirstOrDefaultAsync() ?? "Dịch vụ";

        // Tính số tiền cần đảo
        var amount = await _context.Set<ServiceRequestDetail>()
            .Where(d => d.ServiceRequestId == dto.ServiceRequestId)
            .SumAsync(d => d.Quantity * d.UnitPrice);

        // Tạo bản ghi đảo bút toán
        var reversalId = Guid.NewGuid();
        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BillingReversals (Id, MedicalRecordId, ServiceRequestId, ServiceName,
                  OriginalAmount, ReversedAmount, Reason, ReversedBy, ReversedAt, Status, CreatedAt, CreatedBy, IsDeleted)
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, GETDATE(), 2, GETDATE(), {8}, 0)",
                reversalId, dto.MedicalRecordId, dto.ServiceRequestId, serviceName,
                amount, amount, dto.Reason, userId, userId.ToString());
        }
        catch
        {
            // Table may not exist - return stub
        }

        // Cập nhật hóa đơn (giảm tổng)
        var invoice = await _context.Set<InvoiceSummary>()
            .FirstOrDefaultAsync(i => i.MedicalRecordId == dto.MedicalRecordId);

        if (invoice != null)
        {
            invoice.TotalServiceAmount -= amount;
            invoice.TotalAmount -= amount;
            if (invoice.TotalServiceAmount < 0) invoice.TotalServiceAmount = 0;
            if (invoice.TotalAmount < 0) invoice.TotalAmount = 0;
            invoice.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        // Hủy ServiceRequest
        serviceRequest.Status = 4; // Cancelled
        serviceRequest.UpdatedAt = DateTime.Now;
        serviceRequest.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);

        return new BillingReversalDto
        {
            Id = reversalId,
            MedicalRecordId = dto.MedicalRecordId,
            ServiceRequestId = dto.ServiceRequestId,
            ServiceName = serviceName,
            OriginalAmount = amount,
            ReversedAmount = amount,
            Reason = dto.Reason,
            ReversedByName = user?.FullName ?? "",
            ReversedAt = DateTime.Now,
            Status = 2,
            StatusName = "Đã duyệt"
        };
    }

    public async Task<List<BillingReversalDto>> GetReversalHistoryAsync(Guid? medicalRecordId, DateTime? fromDate, DateTime? toDate)
    {
        try
        {
            var from = fromDate ?? DateTime.Today.AddMonths(-1);
            var to = toDate ?? DateTime.Today.AddDays(1);

            if (medicalRecordId.HasValue)
            {
                return await _context.Database.SqlQueryRaw<BillingReversalDto>(
                    @"SELECT br.Id, br.MedicalRecordId, br.ServiceRequestId, br.ServiceName,
                             br.OriginalAmount, br.ReversedAmount, br.Reason, u.FullName as ReversedByName,
                             br.ReversedAt, br.Status, CASE br.Status WHEN 1 THEN N'Chờ duyệt' WHEN 2 THEN N'Đã duyệt' ELSE N'Từ chối' END as StatusName
                      FROM BillingReversals br LEFT JOIN Users u ON br.ReversedBy = u.Id
                      WHERE br.MedicalRecordId = {0} AND br.IsDeleted = 0
                      ORDER BY br.ReversedAt DESC", medicalRecordId.Value).ToListAsync();
            }

            return await _context.Database.SqlQueryRaw<BillingReversalDto>(
                @"SELECT br.Id, br.MedicalRecordId, br.ServiceRequestId, br.ServiceName,
                         br.OriginalAmount, br.ReversedAmount, br.Reason, u.FullName as ReversedByName,
                         br.ReversedAt, br.Status, CASE br.Status WHEN 1 THEN N'Chờ duyệt' WHEN 2 THEN N'Đã duyệt' ELSE N'Từ chối' END as StatusName
                  FROM BillingReversals br LEFT JOIN Users u ON br.ReversedBy = u.Id
                  WHERE br.IsDeleted = 0 AND br.ReversedAt BETWEEN {0} AND {1}
                  ORDER BY br.ReversedAt DESC", from, to).ToListAsync();
        }
        catch
        {
            // Table may not exist
            return new List<BillingReversalDto>();
        }
    }

    #endregion
}
