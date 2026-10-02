using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.Payment;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class PaymentGatewayService
{
    private static string HmacSha256(string key, string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    public async Task<PaymentTransactionDto?> GetTransactionByRefAsync(string txnRef)
    {
        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.TxnRef == txnRef);
        return txn == null ? null : MapToDto(txn);
    }

    public async Task<PaymentTransactionDto?> GetTransactionByIdAsync(Guid id)
    {
        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.Id == id);
        return txn == null ? null : MapToDto(txn);
    }

    public async Task<PaymentSearchResultDto> SearchAsync(PaymentSearchDto dto)
    {
        var q = _db.PaymentTransactions.Include(t => t.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            q = q.Where(t =>
                t.TxnRef.Contains(kw) ||
                (t.GatewayTxnRef != null && t.GatewayTxnRef.Contains(kw)) ||
                t.OrderInfo.Contains(kw) ||
                (t.Patient != null && t.Patient.FullName!.Contains(kw)));
        }
        if (!string.IsNullOrWhiteSpace(dto.Provider))
            q = q.Where(t => t.Provider == dto.Provider);
        if (dto.Status.HasValue)
            q = q.Where(t => t.Status == dto.Status.Value);
        if (dto.PatientId.HasValue)
            q = q.Where(t => t.PatientId == dto.PatientId.Value);
        if (dto.FromDate.HasValue)
            q = q.Where(t => t.CreatedAt >= dto.FromDate.Value);
        if (dto.ToDate.HasValue)
            q = q.Where(t => t.CreatedAt <= dto.ToDate.Value.AddDays(1));

        var total = await q.CountAsync();
        var totalAmount = await q.SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalSuccess = await q.Where(t => t.Status == 1).SumAsync(t => (decimal?)t.Amount) ?? 0;

        var items = await q
            .OrderByDescending(t => t.CreatedAt)
            .Skip((Math.Max(1, dto.PageIndex) - 1) * Math.Max(1, dto.PageSize)) // pageIndex=0 gave a negative Skip → 500
            .Take(dto.PageSize)
            .ToListAsync();

        return new PaymentSearchResultDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            PageIndex = dto.PageIndex,
            PageSize = dto.PageSize,
            TotalAmount = totalAmount,
            TotalSuccessAmount = totalSuccess
        };
    }

    public async Task<PaymentTransactionDto> RefundAsync(PaymentRefundDto dto, Guid userId)
    {
        await using var tx = await SqlAppLock.BeginAsync(_db);
        await SqlAppLock.AcquireAsync(_db, $"HIS.Payment.Confirm.{dto.TransactionId:N}",
            "Giao dịch này đang được xử lý ở quầy khác, vui lòng tải lại.");
        var txn = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.Id == dto.TransactionId);
        if (txn == null) throw new KeyNotFoundException("Giao dịch không tồn tại");
        if (txn.Status != 1) throw new InvalidOperationException("Chỉ có thể hoàn tiền giao dịch đã thành công");

        var refundAmount = dto.Amount > 0 ? dto.Amount : txn.Amount;
        if (refundAmount > txn.Amount - txn.RefundedAmount)
            throw new InvalidOperationException("Số tiền hoàn vượt quá số còn lại có thể hoàn");

        // Tích hợp thật với gateway refund API đòi hỏi merchant contract —
        // tạm ghi nhận soft-refund và kế toán có thể đối soát thủ công.
        txn.RefundedAmount += refundAmount;
        txn.RefundedAt = DateTime.UtcNow;
        txn.RefundReason = dto.Reason;
        txn.UpdatedAt = DateTime.UtcNow;
        txn.UpdatedBy = userId.ToString();

        if (txn.RefundedAmount >= txn.Amount)
            txn.Status = 3;

        // QA-R13: the refund only touched the transaction — its payment receipt stayed collected, so the cashier
        // report, daily revenue, dashboard and the invoice still counted the money (measured: 35.000đ QR refunded,
        // still in today's 91.400đ net revenue). Book the money going out as a paid-out refund slip of that receipt
        // (same shape as BillingComplete refunds: ReceiptType 3, RefundStatus.Paid, OriginalPaymentId).
        if (txn.ReceiptId.HasValue)
        {
            var original = await _db.Receipts.AsNoTracking().FirstOrDefaultAsync(r => r.Id == txn.ReceiptId.Value);
            if (original != null)
            {
                var now = DateTime.Now;
                _db.Receipts.Add(new Receipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = $"HT{now:yyyyMMddHHmmssfff}{txn.TxnRef[^3..]}",
                    ReceiptDate = now,
                    PatientId = original.PatientId,
                    MedicalRecordId = original.MedicalRecordId,
                    ReceiptType = 3,
                    PaymentMethod = original.PaymentMethod,
                    Amount = refundAmount,
                    Discount = 0,
                    FinalAmount = refundAmount,
                    Status = HIS.Core.Constants.RefundStatus.Paid,
                    CashierId = userId,
                    OriginalPaymentId = original.Id,
                    RefundApprovedBy = userId,
                    RefundApprovedAt = now,
                    Note = $"Hoàn tiền giao dịch {txn.Provider.ToUpper()} {txn.TxnRef}: {dto.Reason}",
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                });
                // Whole payment returned → the lines it paid are unpaid again; the record's invoice is recomputed.
                if (txn.Status == 3)
                    await InvoiceLedger.ReverseReceiptItemsAsync(_db, original.Id);
                await _db.SaveChangesAsync();
                if (txn.InvoiceSummaryId.HasValue)
                {
                    var invoice = await _db.InvoiceSummaries.FirstOrDefaultAsync(i => i.Id == txn.InvoiceSummaryId.Value && !i.IsDeleted);
                    if (invoice != null) await InvoiceLedger.RefreshAsync(_db, invoice);
                }
            }
        }

        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return MapToDto(txn);
    }

    public async Task<PaymentStatsDto> GetStatsAsync(DateTime fromDate, DateTime toDate, string? provider)
    {
        var q = _db.PaymentTransactions.AsQueryable();
        q = q.Where(t => t.CreatedAt >= fromDate && t.CreatedAt <= toDate.AddDays(1));
        if (!string.IsNullOrWhiteSpace(provider))
            q = q.Where(t => t.Provider == provider);

        var all = await q.ToListAsync();
        var stats = new PaymentStatsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalTransactions = all.Count,
            SuccessTransactions = all.Count(t => t.Status == 1),
            FailedTransactions = all.Count(t => t.Status == 2),
            PendingTransactions = all.Count(t => t.Status == 0),
            TotalAmount = all.Sum(t => t.Amount),
            TotalSuccessAmount = all.Where(t => t.Status == 1).Sum(t => t.Amount),
            TotalRefundedAmount = all.Sum(t => t.RefundedAmount)
        };

        stats.ByProvider = all
            .GroupBy(t => t.Provider)
            .Select(g => new ProviderStatDto
            {
                Provider = g.Key,
                Count = g.Count(),
                Amount = g.Sum(t => t.Amount)
            })
            .ToList();

        stats.ByDay = all
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new DailyStatDto
            {
                Date = g.Key,
                Count = g.Count(),
                Amount = g.Where(t => t.Status == 1).Sum(t => t.Amount)
            })
            .OrderBy(x => x.Date)
            .ToList();

        return stats;
    }

    public async Task<bool> MarkExpiredAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _db.PaymentTransactions
            .Where(t => t.Status == 0 && t.ExpiresAt < now)
            .ToListAsync();
        foreach (var t in expired)
        {
            t.Status = 4;
            t.UpdatedAt = now;
        }
        if (expired.Count > 0) await _db.SaveChangesAsync();
        return expired.Count > 0;
    }

}
