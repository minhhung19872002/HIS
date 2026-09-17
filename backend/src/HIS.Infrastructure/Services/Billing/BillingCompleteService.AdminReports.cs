using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Constants;
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

    // QA-R2 cash book basis (physical till): money in = collected receipts (Status 1); money out = refund slips
    // actually paid out (RefundStatus.Paid 4). Refund slips use their own lifecycle (0 pending · 1 approved ·
    // 2 rejected · 4 paid · 5 cancelled) — the old `Status == 1` filter subtracted approved-but-unpaid refunds
    // and ignored paid ones, so CloseCashBook WROTE a wrong ClosingBalance. Deposit refunds are left out on
    // both sides: deposit collections live in Deposits, not Receipts, so they never entered TotalReceipt.
    private static readonly System.Linq.Expressions.Expression<Func<Receipt, bool>> TillReceipt = r =>
        (r.ReceiptType != 3 && r.Status == 1)
        || (r.ReceiptType == 3 && r.Status == RefundStatus.Paid && r.OriginalDepositId == null);

    public async Task<CashierReportDto> GetCashierReportAsync(CashierReportRequestDto dto)
    {
        try
        {
            var user = await _context.Users.FindAsync(dto.CashierId);

            var cashBook = await _context.CashBooks
                .FirstOrDefaultAsync(cb => cb.CashierId == dto.CashierId
                    && cb.StartDate >= dto.FromDate && (cb.EndDate == null || cb.EndDate <= dto.ToDate));

            var toEnd = ReportPeriod.EndExclusive(dto.ToDate); // date-only toDate used to drop the whole last day
            var receipts = await _context.Receipts
                .Where(r => r.CashierId == dto.CashierId
                    && r.ReceiptDate >= dto.FromDate
                    && r.ReceiptDate < toEnd
                    && !r.IsDeleted)
                .Where(TillReceipt)
                // QA-R3 review S5: a QR deposit writes a payment receipt AND a Deposit — the Deposit side counts it.
                .Where(r => !_context.PaymentTransactions.Any(t => t.ReceiptId == r.Id && t.ReferenceType == "deposit"))
                .ToListAsync();

            var totalCash = receipts.Where(r => r.PaymentMethod == 1 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalCard = receipts.Where(r => r.PaymentMethod == 3 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalTransfer = receipts.Where(r => r.PaymentMethod == 2 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);
            var (depositIn, depositCount, depositOut, depositOutCount) =
                await GetTillDepositFlowsAsync(dto.CashierId, dto.FromDate, toEnd);

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
                DepositAmount = depositIn,
                DepositCount = depositCount,
                DepositRefundAmount = depositOut,
                DepositRefundCount = depositOutCount,
                ClosingBalance = (cashBook?.OpeningBalance ?? 0) + totalCash + totalCard + totalTransfer - totalRefund + depositIn - depositOut,
                TransactionCount = receipts.Count + depositCount + depositOutCount,
                IsClosed = cashBook?.IsClosed ?? false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetCashierReportAsync failed for cashier {CashierId}", dto.CashierId);
            return new CashierReportDto { IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<CashierReportDto> CloseCashBookAsync(CloseCashBookDto dto, Guid userId)
    {
        // Find open cash book for this cashier
        var cashBook = await _context.CashBooks
            .FirstOrDefaultAsync(cb => cb.CashierId == dto.CashierId && !cb.IsClosed);
        if (cashBook == null)
            throw new InvalidOperationException("No open cash book found for this cashier");

        // Calculate totals from receipts in this cash book's period
        var receipts = await _context.Receipts
            .Where(r => r.CashierId == dto.CashierId
                && r.ReceiptDate >= cashBook.StartDate
                && !r.IsDeleted)
            .Where(TillReceipt)
            // QA-R3 review S5: a QR deposit writes a payment receipt AND a Deposit — the Deposit side counts it.
            .Where(r => !_context.PaymentTransactions.Any(t => t.ReceiptId == r.Id && t.ReferenceType == "deposit"))
            .ToListAsync();

        var totalCash = receipts.Where(r => r.PaymentMethod == 1 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalCard = receipts.Where(r => r.PaymentMethod == 3 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalTransfer = receipts.Where(r => r.PaymentMethod == 2 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);
        var (depositIn, depositCount, depositOut, depositOutCount) =
            await GetTillDepositFlowsAsync(dto.CashierId, cashBook.StartDate, DateTime.MaxValue);

        // QA-R3: the till also received deposits (tạm ứng) and paid out deposit refunds.
        cashBook.TotalReceipt = totalCash + totalCard + totalTransfer + depositIn;
        cashBook.TotalRefund = totalRefund + depositOut;
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
            DepositAmount = depositIn,
            DepositCount = depositCount,
            DepositRefundAmount = depositOut,
            DepositRefundCount = depositOutCount,
            ClosingBalance = cashBook.ClosingBalance,
            TransactionCount = receipts.Count + depositCount + depositOutCount,
            IsClosed = true
        };
    }

    /// <summary>
    /// QA-R3: deposits (tạm ứng) the cashier collected (not cancelled) and deposit refunds paid out (RefundStatus.Paid)
    /// in [from, toExclusive). Both are real cash through the till but live outside TillReceipt.
    /// </summary>
    private async Task<(decimal DepositIn, int DepositCount, decimal DepositOut, int DepositOutCount)> GetTillDepositFlowsAsync(
        Guid cashierId, DateTime from, DateTime toExclusive)
    {
        var deposits = await _context.Deposits
            .Where(d => d.ReceivedByUserId == cashierId && d.ReceiptDate >= from && d.ReceiptDate < toExclusive
                && !d.IsDeleted && d.Status != DepositStatus.Cancelled)
            .Select(d => d.Amount)
            .ToListAsync();
        var depositRefunds = await _context.Receipts
            .Where(r => r.CashierId == cashierId && r.ReceiptDate >= from && r.ReceiptDate < toExclusive && !r.IsDeleted
                && r.ReceiptType == 3 && r.OriginalDepositId != null && r.Status == RefundStatus.Paid)
            .Select(r => r.FinalAmount)
            .ToListAsync();
        return (deposits.Sum(), deposits.Count, depositRefunds.Sum(), depositRefunds.Count);
    }

    public async Task<OutpatientRevenueReportDto> GetOutpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            // QA-R2: was `Status == 1` for refunds too (approved only, paid-out refunds ignored, deposit refunds
            // subtracted from receipt revenue) — use the shared net-revenue rule.
            var toEnd = ReportPeriod.EndExclusive(dto.ToDate);
            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate < toEnd && !r.IsDeleted
                    && r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 1)
                .Where(ReportPeriod.CashReceipt)
                .ToListAsync();

            var dailyDetails = receipts
                .GroupBy(r => r.ReceiptDate.Date)
                .Select(g => new DailyRevenueItemDto
                {
                    Date = g.Key,
                    PatientCount = g.Select(r => r.PatientId).Distinct().Count(),
                    InvoiceCount = g.Count(r => r.ReceiptType != 3), // QA-R6: same basis as TotalInvoices (days summed to 119 vs 82)
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetOutpatientRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            return new OutpatientRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<InpatientRevenueReportDto> GetInpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var toEnd = ReportPeriod.EndExclusive(dto.ToDate);
            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord).ThenInclude(mr => mr!.Department)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate < toEnd && !r.IsDeleted
                    && r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 2)
                .Where(ReportPeriod.CashReceipt)
                .ToListAsync();

            // DepositStatus 3 = fully used (money was received), 5 = cancelled — the old `!= 3` did the opposite.
            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate < toEnd && !d.IsDeleted
                    && d.Status != DepositStatus.Cancelled)
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetInpatientRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            return new InpatientRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<DepositRevenueReportDto> GetDepositRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var toEnd = ReportPeriod.EndExclusive(dto.ToDate);
            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate < toEnd && !d.IsDeleted)
                .ToListAsync();

            // QA-R2: DepositStatus 3 is "fully used", not "refunded" — the report counted every spent deposit as
            // a refund and kept cancelled (5) deposits as active money. Refunds are refund slips (ReceiptType 3)
            // raised on the deposit and actually paid out (RefundStatus.Paid).
            var depositIds = deposits.Select(d => d.Id).ToList();
            var paidRefunds = await _context.Receipts
                .Where(r => r.ReceiptType == 3 && r.Status == RefundStatus.Paid && !r.IsDeleted
                    && r.OriginalDepositId != null && depositIds.Contains(r.OriginalDepositId.Value))
                .Select(r => new { DepositId = r.OriginalDepositId!.Value, r.FinalAmount })
                .ToListAsync();
            var refundByDeposit = paidRefunds.GroupBy(r => r.DepositId).ToDictionary(g => g.Key, g => g.Sum(r => r.FinalAmount));

            var activeDeposits = deposits.Where(d => d.Status != DepositStatus.Cancelled).ToList();

            var dailyDetails = activeDeposits
                .GroupBy(d => d.ReceiptDate.Date)
                .Select(g => new DailyDepositItemDto
                {
                    Date = g.Key,
                    DepositCount = g.Count(),
                    DepositAmount = g.Sum(d => d.Amount),
                    RefundCount = g.Count(d => refundByDeposit.ContainsKey(d.Id)),
                    RefundAmount = g.Sum(d => refundByDeposit.GetValueOrDefault(d.Id))
                })
                .OrderBy(d => d.Date)
                .ToList();

            return new DepositRevenueReportDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalDeposits = activeDeposits.Count,
                TotalDepositAmount = activeDeposits.Sum(d => d.Amount),
                TotalUsedAmount = activeDeposits.Sum(d => d.UsedAmount),
                TotalRefundAmount = activeDeposits.Sum(d => refundByDeposit.GetValueOrDefault(d.Id)),
                RemainingAmount = activeDeposits.Sum(d => d.RemainingAmount),
                DailyDetails = dailyDetails
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetDepositRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            return new DepositRevenueReportDto { FromDate = dto.FromDate, ToDate = dto.ToDate, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<CashBookUsageReportDto> GetCashBookUsageReportAsync(Guid cashBookId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            var cashBook = await _context.CashBooks.FindAsync(cashBookId);
            if (cashBook == null) return new CashBookUsageReportDto();

            var toEnd = ReportPeriod.EndExclusive(toDate);
            var receipts = await _context.Receipts
                .Include(r => r.Cashier)
                .Where(r => r.CashBookId == cashBookId && !r.IsDeleted
                    && r.ReceiptDate >= fromDate && r.ReceiptDate < toEnd)
                .ToListAsync();
            // Money that moved through the book (same till basis as CloseCashBook); the per-user totals used to
            // include cancelled receipts and unpaid/rejected refund slips.
            var tillReceipts = receipts.AsQueryable().Where(TillReceipt).ToList();

            var userUsages = tillReceipts
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

            var totalReceipt = tillReceipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount);
            var totalPayment = tillReceipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

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
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetCashBookUsageReportAsync failed cashBook={CashBookId} {From}-{To}", cashBookId, fromDate, toDate);
            return new CashBookUsageReportDto { IsError = true, ErrorMessage = ex.Message };
        }
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintOutpatientRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            throw;
        }
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintInpatientRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            throw;
        }
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintDepositRevenueReportAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            throw;
        }
    }

    #endregion
}
