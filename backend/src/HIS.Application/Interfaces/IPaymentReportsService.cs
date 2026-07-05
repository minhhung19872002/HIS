using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// 8 báo cáo thanh toán theo chuẩn MQ Solutions — tách khỏi PaymentReportsController (#202 thin-controller).
/// Behavior-preserving: mọi LINQ/projection/financial calculation/date filtering giữ nguyên.
/// Tất cả endpoints read-only — không cần userId.
/// </summary>
public interface IPaymentReportsService
{
    Task<ServiceOutcome> DepositGatewayAsync(DateTime? fromDate, DateTime? toDate, string? provider);
    Task<ServiceOutcome> DailySummaryAsync(DateTime? fromDate, DateTime? toDate);
    Task<ServiceOutcome> DailyDetailAsync(DateTime? fromDate, DateTime? toDate, Guid? cashierId, int? paymentMethod);
    Task<ServiceOutcome> EInvoiceBudgetAsync(DateTime? fromDate, DateTime? toDate);
    Task<ServiceOutcome> EInvoiceServiceAsync(DateTime? fromDate, DateTime? toDate);
    Task<ServiceOutcome> BillingDetailAsync(DateTime? fromDate, DateTime? toDate, Guid? patientId);
    Task<ServiceOutcome> RefundGatewayAsync(DateTime? fromDate, DateTime? toDate);
    Task<ServiceOutcome> PharmacyRetailAsync(DateTime? fromDate, DateTime? toDate, string? paymentMethod);
}
