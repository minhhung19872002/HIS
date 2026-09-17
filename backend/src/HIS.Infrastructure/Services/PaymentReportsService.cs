using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// 8 báo cáo thanh toán theo chuẩn MQ Solutions — N1.03, tách khỏi PaymentReportsController (#202 thin-controller).
/// Behavior-preserving: mọi LINQ GroupBy/projection/financial calculation/date filtering giữ nguyên.
/// Tất cả endpoints read-only — không cần userId.
/// </summary>
public class PaymentReportsService : IPaymentReportsService
{
    private readonly HISDbContext _db;
    public PaymentReportsService(HISDbContext db) { _db = db; }

    private static (DateTime from, DateTime to) NormalizeRange(DateTime? fromDate, DateTime? toDate)
    {
        var from = fromDate ?? DateTime.Today;
        var to = (toDate ?? DateTime.Today).AddDays(1);
        return (from, to);
    }

    /// <summary>BC1 — Tạm ứng VNPay/MoMo/ZaloPay</summary>
    public async Task<ServiceOutcome> DepositGatewayAsync(DateTime? fromDate, DateTime? toDate, string? provider)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        // PaymentTransactions.CreatedAt is UTC (SaveChangesAsync) — compare with UTC bounds of the VN days.
        var (fromUtc, toUtc) = (ReportPeriod.ToUtc(from), ReportPeriod.ToUtc(to));
        var q = _db.PaymentTransactions
            .Include(t => t.Patient)
            .Where(t => t.OrderType == "deposit" && t.Status == 1 && t.CreatedAt >= fromUtc && t.CreatedAt < toUtc);
        if (!string.IsNullOrWhiteSpace(provider)) q = q.Where(t => t.Provider == provider);
        var list = await q.OrderBy(t => t.CreatedAt).ToListAsync();
        var total = list.Sum(t => t.Amount);
        return ServiceOutcome.Ok(new
        {
            fromDate = from,
            toDate = to,
            provider,
            totalCount = list.Count,
            totalAmount = total,
            items = list.Select(t => new
            {
                t.TxnRef,
                t.GatewayTxnRef,
                PatientCode = t.Patient?.PatientCode,
                PatientName = t.Patient?.FullName,
                t.Amount,
                t.Provider,
                t.BankCode,
                t.CompletedAt,
            })
        });
    }

    /// <summary>BC2 — Thu tiền theo ngày tổng hợp</summary>
    public async Task<ServiceOutcome> DailySummaryAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        // Refund slips move to Paid (RefundStatus 4) once the cash is handed out; `Status == 1` alone
        // kept approved-but-unpaid refunds and dropped every paid one. Per-method totals are net of refunds.
        var receipts = await _db.Receipts
            .Where(r => r.ReceiptDate >= from && r.ReceiptDate < to)
            .Where(ReportPeriod.CashReceipt)
            .ToListAsync();
        static decimal Signed(HIS.Core.Entities.Receipt r) => r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount;
        var grouped = receipts
            .GroupBy(r => r.ReceiptDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                date = g.Key,
                receipts = g.Count(),
                deposit = g.Where(r => r.ReceiptType == 1).Sum(r => r.FinalAmount),
                payment = g.Where(r => r.ReceiptType == 2).Sum(r => r.FinalAmount),
                refund = g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                net = g.Sum(Signed),
                cash = g.Where(r => r.PaymentMethod == 1).Sum(Signed),
                transfer = g.Where(r => r.PaymentMethod == 2).Sum(Signed),
                card = g.Where(r => r.PaymentMethod == 3).Sum(Signed),
                eWallet = g.Where(r => r.PaymentMethod == 4).Sum(Signed),
            })
            .ToList();
        return ServiceOutcome.Ok(new
        {
            fromDate = from,
            toDate = to,
            totalReceipts = receipts.Count,
            totalNet = grouped.Sum(g => g.net),
            byDay = grouped,
        });
    }

    /// <summary>BC3 — Thu tiền theo ngày chi tiết (mỗi phiếu 1 dòng)</summary>
    public async Task<ServiceOutcome> DailyDetailAsync(DateTime? fromDate, DateTime? toDate, Guid? cashierId, int? paymentMethod)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var q = _db.Receipts
            .Include(r => r.Patient)
            .Include(r => r.Cashier)
            .Where(r => r.ReceiptDate >= from && r.ReceiptDate < to)
            .Where(ReportPeriod.CashReceipt); // paid-out refunds (4) were missing
        if (cashierId.HasValue) q = q.Where(r => r.CashierId == cashierId.Value);
        if (paymentMethod.HasValue) q = q.Where(r => r.PaymentMethod == paymentMethod.Value);
        var list = await q.OrderBy(r => r.ReceiptDate).ToListAsync();
        return ServiceOutcome.Ok(list.Select(r => new
        {
            r.ReceiptCode,
            r.ReceiptDate,
            PatientCode = r.Patient?.PatientCode,
            PatientName = r.Patient?.FullName,
            r.ReceiptType,
            ReceiptTypeName = r.ReceiptType switch { 1 => "Tạm ứng", 2 => "Viện phí", 3 => "Hoàn trả", _ => "?" },
            r.PaymentMethod,
            PaymentMethodName = r.PaymentMethod switch { 1 => "Tiền mặt", 2 => "Chuyển khoản", 3 => "Thẻ", 4 => "Ví điện tử", _ => "?" },
            r.Amount,
            r.Discount,
            r.FinalAmount,
            CashierName = r.Cashier?.FullName,
        }));
    }

    /// <summary>BC4 — HDDT sự nghiệp (BHYT + nguồn NS)</summary>
    public async Task<ServiceOutcome> EInvoiceBudgetAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var list = await _db.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .Where(e => e.InvoiceDate >= from && e.InvoiceDate < to
                && (e.Status == 1 || e.Status == 2) // QA-R6: issued/sent only — drafts (0), cancelled (3), replaced (4) were summed
                && e.InvoiceSummary != null
                && e.InvoiceSummary.InsuranceAmount > 0)
            .OrderBy(e => e.InvoiceDate)
            .ToListAsync();
        return ServiceOutcome.Ok(new
        {
            count = list.Count,
            totalSubTotal = list.Sum(e => e.SubTotal),
            totalVat = list.Sum(e => e.VatAmount),
            totalAmount = list.Sum(e => e.TotalAmount),
            items = list.Select(e => new
            {
                e.InvoiceSeries,
                e.InvoiceNumber,
                e.InvoiceDate,
                e.PatientName,
                e.SubTotal,
                e.VatAmount,
                e.TotalAmount,
                e.Status,
            })
        });
    }

    /// <summary>BC5 — HDDT dịch vụ (Thu phí + Dịch vụ)</summary>
    public async Task<ServiceOutcome> EInvoiceServiceAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var list = await _db.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .Where(e => e.InvoiceDate >= from && e.InvoiceDate < to
                && (e.Status == 1 || e.Status == 2) // QA-R6: 01-16/09 listed 69 invoices / 23.447.200đ incl. a draft and a cancelled one (67 / 23.080.000đ issued)
                && (e.InvoiceSummary == null || e.InvoiceSummary.InsuranceAmount == 0))
            .OrderBy(e => e.InvoiceDate)
            .ToListAsync();
        return ServiceOutcome.Ok(new
        {
            count = list.Count,
            totalSubTotal = list.Sum(e => e.SubTotal),
            totalVat = list.Sum(e => e.VatAmount),
            totalAmount = list.Sum(e => e.TotalAmount),
            items = list.Select(e => new
            {
                e.InvoiceSeries,
                e.InvoiceNumber,
                e.InvoiceDate,
                e.PatientName,
                e.PaymentMethod,
                e.SubTotal,
                e.VatAmount,
                e.TotalAmount,
            })
        });
    }

    /// <summary>BC6 — Viện phí chi tiết (theo từng dòng dịch vụ)</summary>
    public async Task<ServiceOutcome> BillingDetailAsync(DateTime? fromDate, DateTime? toDate, Guid? patientId)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var q = _db.ReceiptDetails
            .Include(d => d.Receipt).ThenInclude(r => r.Patient)
            // QA-R3: refund receipts (type 3) now carry item lines too — BC6 lists collected lines only.
            .Where(d => d.Receipt.Status == 1 && d.Receipt.ReceiptType != 3
                && d.Receipt.ReceiptDate >= from && d.Receipt.ReceiptDate < to);
        if (patientId.HasValue) q = q.Where(d => d.Receipt.PatientId == patientId.Value);
        var list = await q.OrderBy(d => d.Receipt.ReceiptDate).Take(500).ToListAsync();
        return ServiceOutcome.Ok(list.Select(d => new
        {
            ReceiptCode = d.Receipt.ReceiptCode,
            ReceiptDate = d.Receipt.ReceiptDate,
            PatientName = d.Receipt.Patient?.FullName,
            d.ItemCode,
            d.ItemName,
            d.ItemType,
            d.Quantity,
            d.UnitPrice,
            d.Amount,
            d.Discount,
            d.FinalAmount,
        }));
    }

    /// <summary>BC7 — Hoàn trả biên lai VNPay</summary>
    public async Task<ServiceOutcome> RefundGatewayAsync(DateTime? fromDate, DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var (fromUtc, toUtc) = (ReportPeriod.ToUtc(from), ReportPeriod.ToUtc(to)); // RefundedAt = DateTime.UtcNow
        var list = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .Where(t => t.RefundedAmount > 0
                && t.RefundedAt != null
                && t.RefundedAt >= fromUtc && t.RefundedAt < toUtc)
            .OrderBy(t => t.RefundedAt)
            .ToListAsync();
        return ServiceOutcome.Ok(new
        {
            count = list.Count,
            totalRefunded = list.Sum(t => t.RefundedAmount),
            items = list.Select(t => new
            {
                t.TxnRef,
                t.Provider,
                PatientName = t.Patient?.FullName,
                OriginalAmount = t.Amount,
                t.RefundedAmount,
                t.RefundedAt,
                t.RefundReason,
            })
        });
    }

    /// <summary>BC8 — Báo cáo nhà thuốc (doanh thu bán lẻ thuốc)</summary>
    public async Task<ServiceOutcome> PharmacyRetailAsync(DateTime? fromDate, DateTime? toDate, string? paymentMethod)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var (fromUtc, toUtc) = (ReportPeriod.ToUtc(from), ReportPeriod.ToUtc(to)); // RetailSale.CreatedAt is UTC
        var q = _db.RetailSales
            .Include(s => s.Patient)
            .Include(s => s.Cashier)
            .Include(s => s.Items)
            .Where(s => s.Status == "Completed"
                && s.CreatedAt >= fromUtc && s.CreatedAt < toUtc);
        if (!string.IsNullOrWhiteSpace(paymentMethod))
            q = q.Where(s => s.PaymentMethod == paymentMethod);
        var list = await q.OrderBy(s => s.CreatedAt).ToListAsync();
        var byMethod = list
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new { method = g.Key, count = g.Count(), total = g.Sum(s => s.PaidAmount) })
            .ToList();
        return ServiceOutcome.Ok(new
        {
            fromDate = from,
            toDate = to,
            paymentMethod,
            totalCount = list.Count,
            totalAmount = list.Sum(s => s.TotalAmount),
            totalDiscount = list.Sum(s => s.DiscountAmount),
            totalPaid = list.Sum(s => s.PaidAmount),
            byPaymentMethod = byMethod,
            items = list.Select(s => new
            {
                s.SaleCode,
                SaleDate = s.CreatedAt,
                PatientName = s.PatientName ?? s.Patient?.FullName ?? "Khách vãng lai",
                s.PhoneNumber,
                s.TotalAmount,
                s.DiscountAmount,
                s.PaidAmount,
                s.PaymentMethod,
                s.PaymentReference,
                CashierName = s.Cashier?.FullName,
                ItemCount = s.Items.Count,
            })
        });
    }
}
