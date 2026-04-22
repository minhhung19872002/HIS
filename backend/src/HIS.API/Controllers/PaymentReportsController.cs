using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// 7 báo cáo thanh toán theo chuẩn MQ Solutions — N1.03.
/// </summary>
[ApiController]
[Route("api/payment-reports")]
[Authorize]
public class PaymentReportsController : ControllerBase
{
    private readonly HISDbContext _db;
    public PaymentReportsController(HISDbContext db) { _db = db; }

    private static (DateTime from, DateTime to) NormalizeRange(DateTime? fromDate, DateTime? toDate)
    {
        var from = fromDate ?? DateTime.Today;
        var to = (toDate ?? DateTime.Today).AddDays(1);
        return (from, to);
    }

    /// <summary>BC1 — Tạm ứng VNPay/MoMo/ZaloPay</summary>
    [HttpGet("deposit-gateway")]
    public async Task<IActionResult> DepositGateway(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? provider)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var q = _db.PaymentTransactions
            .Include(t => t.Patient)
            .Where(t => t.OrderType == "deposit" && t.Status == 1 && t.CreatedAt >= from && t.CreatedAt < to);
        if (!string.IsNullOrWhiteSpace(provider)) q = q.Where(t => t.Provider == provider);
        var list = await q.OrderBy(t => t.CreatedAt).ToListAsync();
        var total = list.Sum(t => t.Amount);
        return Ok(new
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
    [HttpGet("daily-summary")]
    public async Task<IActionResult> DailySummary(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var receipts = await _db.Receipts
            .Where(r => r.Status == 1 && r.ReceiptDate >= from && r.ReceiptDate < to)
            .ToListAsync();
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
                net = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                    - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                cash = g.Where(r => r.PaymentMethod == 1).Sum(r => r.FinalAmount),
                transfer = g.Where(r => r.PaymentMethod == 2).Sum(r => r.FinalAmount),
                card = g.Where(r => r.PaymentMethod == 3).Sum(r => r.FinalAmount),
                eWallet = g.Where(r => r.PaymentMethod == 4).Sum(r => r.FinalAmount),
            })
            .ToList();
        return Ok(new
        {
            fromDate = from,
            toDate = to,
            totalReceipts = receipts.Count,
            totalNet = grouped.Sum(g => g.net),
            byDay = grouped,
        });
    }

    /// <summary>BC3 — Thu tiền theo ngày chi tiết (mỗi phiếu 1 dòng)</summary>
    [HttpGet("daily-detail")]
    public async Task<IActionResult> DailyDetail(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? cashierId, [FromQuery] int? paymentMethod)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var q = _db.Receipts
            .Include(r => r.Patient)
            .Include(r => r.Cashier)
            .Where(r => r.Status == 1 && r.ReceiptDate >= from && r.ReceiptDate < to);
        if (cashierId.HasValue) q = q.Where(r => r.CashierId == cashierId.Value);
        if (paymentMethod.HasValue) q = q.Where(r => r.PaymentMethod == paymentMethod.Value);
        var list = await q.OrderBy(r => r.ReceiptDate).ToListAsync();
        return Ok(list.Select(r => new
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
    [HttpGet("einvoice-budget")]
    public async Task<IActionResult> EInvoiceBudget(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var list = await _db.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .Where(e => e.InvoiceDate >= from && e.InvoiceDate < to
                && e.InvoiceSummary != null
                && e.InvoiceSummary.InsuranceAmount > 0)
            .OrderBy(e => e.InvoiceDate)
            .ToListAsync();
        return Ok(new
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
    [HttpGet("einvoice-service")]
    public async Task<IActionResult> EInvoiceService(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var list = await _db.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .Where(e => e.InvoiceDate >= from && e.InvoiceDate < to
                && (e.InvoiceSummary == null || e.InvoiceSummary.InsuranceAmount == 0))
            .OrderBy(e => e.InvoiceDate)
            .ToListAsync();
        return Ok(new
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
                e.TotalAmount,
            })
        });
    }

    /// <summary>BC6 — Viện phí chi tiết (theo từng dòng dịch vụ)</summary>
    [HttpGet("billing-detail")]
    public async Task<IActionResult> BillingDetail(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? patientId)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var q = _db.ReceiptDetails
            .Include(d => d.Receipt).ThenInclude(r => r.Patient)
            .Where(d => d.Receipt.Status == 1
                && d.Receipt.ReceiptDate >= from && d.Receipt.ReceiptDate < to);
        if (patientId.HasValue) q = q.Where(d => d.Receipt.PatientId == patientId.Value);
        var list = await q.OrderBy(d => d.Receipt.ReceiptDate).Take(500).ToListAsync();
        return Ok(list.Select(d => new
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
    [HttpGet("refund-gateway")]
    public async Task<IActionResult> RefundGateway(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var list = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .Where(t => t.RefundedAmount > 0
                && t.RefundedAt != null
                && t.RefundedAt >= from && t.RefundedAt < to)
            .OrderBy(t => t.RefundedAt)
            .ToListAsync();
        return Ok(new
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
}
