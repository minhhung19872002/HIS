using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Báo cáo tồn kho — N1.06.
/// 4 báo cáo: chi tiết theo lô/HSD, tổng hợp theo thuốc, sắp hết hạn, tồn thấp.
/// </summary>
[ApiController]
[Route("api/stock-report")]
[Authorize]
public class StockReportController : ControllerBase
{
    private readonly IStockReportService _svc;
    public StockReportController(IStockReportService svc) { _svc = svc; }

    /// <summary>BC1 — Tồn kho chi tiết theo lô / HSD / kho</summary>
    [HttpGet("detail")]
    public async Task<IActionResult> Detail(
        [FromQuery] Guid? warehouseId,
        [FromQuery] Guid? medicineId,
        [FromQuery] string? keyword,
        [FromQuery] bool? onlyAvailable = true)
        => (await _svc.DetailAsync(warehouseId, medicineId, keyword, onlyAvailable)).ToActionResult();

    /// <summary>BC2 — Tồn kho tổng hợp theo thuốc (gộp các lô)</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromQuery] Guid? warehouseId,
        [FromQuery] string? keyword)
        => (await _svc.SummaryAsync(warehouseId, keyword)).ToActionResult();

    /// <summary>BC3 — Thuốc sắp hết hạn (mặc định 90 ngày)</summary>
    [HttpGet("expiring")]
    public async Task<IActionResult> Expiring(
        [FromQuery] Guid? warehouseId,
        [FromQuery] int days = 90)
        => (await _svc.ExpiringAsync(warehouseId, days)).ToActionResult();

    /// <summary>BC4 — Tồn thấp (dưới ngưỡng, mặc định 10 đơn vị)</summary>
    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock(
        [FromQuery] Guid? warehouseId,
        [FromQuery] decimal threshold = 10)
        => (await _svc.LowStockAsync(warehouseId, threshold)).ToActionResult();
}
