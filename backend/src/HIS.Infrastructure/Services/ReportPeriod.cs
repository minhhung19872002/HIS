using System.Linq.Expressions;
using HIS.Core.Common;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Shared date-range and money filters for report/statistics queries, so every report reads
/// the same period and the same "cash that actually moved" rule.
/// </summary>
internal static class ReportPeriod
{
    /// <summary>
    /// Exclusive upper bound for a report's toDate. The FE sends a date-only toDate (YYYY-MM-DD)
    /// meaning "through that day"; `&lt; toDate` / `&lt;= toDate` against midnight dropped the whole
    /// last day. A toDate carrying a time is used as-is.
    /// </summary>
    public static DateTime EndExclusive(DateTime toDate) =>
        toDate.TimeOfDay == TimeSpan.Zero ? toDate.Date.AddDays(1) : toDate;

    /// <summary>
    /// Local (VN) boundary → UTC, for columns written with <c>DateTime.UtcNow</c> (CreatedAt via
    /// HISDbContext.SaveChangesAsync, PaymentTransactions, AuditLogs.Timestamp).
    /// </summary>
    public static DateTime ToUtc(DateTime local) =>
        VnTime.DayRangeUtc(local.Date).FromUtc + local.TimeOfDay;

    /// <summary>
    /// Receipts that make up net collected revenue: collected receipts (Status 1) and refund slips of
    /// those receipts once approved (RefundStatus.Approved 1) or paid out (RefundStatus.Paid 4) — sum
    /// refunds as negative. Pending (0), rejected (2) and cancelled (2 for receipts / 5 for refunds)
    /// never moved money. Refunds of a DEPOSIT (OriginalDepositId set) are excluded: deposits live in
    /// the Deposits table and never entered Receipts revenue, so subtracting their refunds pushed
    /// revenue below zero (15/09 local data: −553.800đ).
    /// </summary>
    public static readonly Expression<Func<Receipt, bool>> CashReceipt = r =>
        (r.ReceiptType != 3 && r.Status == 1)
        || (r.ReceiptType == 3 && (r.Status == 1 || r.Status == 4) && r.OriginalDepositId == null);
}
