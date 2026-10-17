using HIS.Application.DTOs.Integration;
using HIS.Application.Services;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// API cho cổng hợp đồng / mua sắm BlueContract (https://bluecontract.bluestar.com.vn), gọi bằng tài khoản dịch vụ role
/// BLUECONTRACT_SERVICE — role đó bị <c>ExternalActorScopeMiddleware</c> nhốt trong đúng tiền tố này. Đường dẫn và tên
/// trường khớp cấu hình His:* của cổng (BlueContract docs/HIS_INTEGRATION.md §3), nên cổng không cần ánh xạ riêng.
/// Chiều ngược lại (HIS đẩy phiếu khi duyệt) là <c>BlueContractReceiptPusher</c>.
/// </summary>
[ApiController]
[Route("api/integration/bluecontract")]
[Authorize(Roles = RoleNames.BlueContractService + "," + RoleNames.Admin)]
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public class BlueContractIntegrationController : ControllerBase
{
    private readonly IBlueContractIntegrationService _service;

    public BlueContractIntegrationController(IBlueContractIntegrationService service)
    {
        _service = service;
    }

    /// <summary>Xuất – Nhập – Tồn theo mã kho. <c>keys</c> = mã thuốc, cách nhau bằng dấu phẩy (rỗng = tất cả).</summary>
    [HttpGet("stock-movements")]
    public async Task<ActionResult<List<BlueContractStockMovementDto>>> GetStockMovements(
        [FromQuery] string warehouse, [FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] string? keys)
    {
        if (string.IsNullOrWhiteSpace(warehouse))
            return BadRequest(new { message = "Thiếu mã kho (warehouse)." });
        var hisKeys = (keys ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return Ok(await _service.GetStockMovementsAsync(warehouse, from, to, hisKeys));
    }

    /// <summary>Phiếu nhập NCC đã duyệt trong khoảng ngày duyệt, theo schema phiếu của cổng (cổng kéo định kỳ).</summary>
    [HttpGet("warehouse-receipts")]
    public async Task<ActionResult<List<BlueContractReceiptPayload>>> GetWarehouseReceipts([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (from == default || to == default || from.Date > to.Date)
            return BadRequest(new { message = "Khoảng ngày (from, to) không hợp lệ." });
        if ((to.Date - from.Date).TotalDays > 31)
            return BadRequest(new { message = "Khoảng ngày tối đa 31 ngày." });
        return Ok(await _service.GetApprovedReceiptsAsync(from, to));
    }

    /// <summary>
    /// "Danh mục trúng thầu theo Số QĐ + MST": HIS chưa lưu kết quả lựa chọn nhà thầu theo mặt hàng (bidCode / bidGroup
    /// trên danh mục không có cột), nên luôn trả rỗng — cổng báo "HIS chưa có danh mục…" và danh mục được nhập bằng
    /// Excel trên cổng (mã hàng = mã thuốc HIS).
    /// </summary>
    [HttpGet("bid-items")]
    public ActionResult<List<object>> GetBidItems() => Ok(new List<object>());
}
