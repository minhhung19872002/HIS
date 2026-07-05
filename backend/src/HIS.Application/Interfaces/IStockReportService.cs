using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Báo cáo tồn kho — N1.06.
/// Logic tách khỏi StockReportController (#202 thin-controller).
/// Behavior-preserving: 4 báo cáo chi tiết/tổng hợp/sắp hết hạn/tồn thấp.
/// </summary>
public interface IStockReportService
{
    Task<ServiceOutcome> DetailAsync(Guid? warehouseId, Guid? medicineId, string? keyword, bool? onlyAvailable);
    Task<ServiceOutcome> SummaryAsync(Guid? warehouseId, string? keyword);
    Task<ServiceOutcome> ExpiringAsync(Guid? warehouseId, int days);
    Task<ServiceOutcome> LowStockAsync(Guid? warehouseId, decimal threshold);
}
