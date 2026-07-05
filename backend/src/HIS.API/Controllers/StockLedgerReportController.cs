using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sổ chi tiết chuyển động kho (line-level theo ngày) cho một kho — phục vụ tích hợp NXT chuẩn mọi kỳ
/// cho hệ thống quản lý tài sản (IMS). Mỗi dòng là 1 lần nhập/xuất từ phiếu đã duyệt.
/// </summary>
[ApiController]
[Route("api/warehouse/reports/stock-ledger")]
[Authorize]
public class StockLedgerReportController : ControllerBase
{
    private readonly IStockLedgerReportService _svc;
    public StockLedgerReportController(IStockLedgerReportService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid warehouseId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        => (await _svc.GetAsync(warehouseId, fromDate, toDate)).ToActionResult();
}
