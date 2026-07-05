using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Sổ chi tiết chuyển động kho (line-level theo ngày) cho một kho — tách khỏi StockLedgerReportController (#202 thin-controller).
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IStockLedgerReportService
{
    Task<ServiceOutcome> GetAsync(Guid warehouseId, DateTime fromDate, DateTime toDate);
}
