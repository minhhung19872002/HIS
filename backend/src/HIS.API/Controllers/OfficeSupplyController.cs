using System.Security.Claims;
using HIS.Application.DTOs.OfficeSupply;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// VPP / TTB văn phòng — phê duyệt cấp phát văn phòng phẩm (N1.12).
/// Dùng chung PharmacyApproval infrastructure nhưng scope về MedicalSupply.IsMedical = false.
/// </summary>
[ApiController]
[Route("api/office-supply")]
[Authorize]
public class OfficeSupplyController : ControllerBase
{
    private readonly IOfficeSupplyService _svc;
    public OfficeSupplyController(IOfficeSupplyService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách vật tư văn phòng cho picker.</summary>
    [HttpGet("catalog")]
    public async Task<IActionResult> Catalog([FromQuery] string? keyword, [FromQuery] int? supplyType)
        => (await _svc.CatalogAsync(keyword, supplyType)).ToActionResult();

    /// <summary>Danh sách phiếu yêu cầu VPP theo trạng thái.</summary>
    [HttpGet("requests")]
    public async Task<IActionResult> Requests([FromQuery] int? status, [FromQuery] Guid? departmentId)
        => (await _svc.RequestsAsync(status, departmentId)).ToActionResult();

    /// <summary>Tạo phiếu yêu cầu VPP (status = 2 Đã chuyển).</summary>
    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateOfficeRequestDto dto)
        => (await _svc.CreateRequestAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Thu hồi phiếu yêu cầu VPP — đưa về trạng thái Nháp (1) để chỉnh sửa lại.</summary>
    [HttpPost("requests/{id}/recall")]
    public async Task<IActionResult> Recall(Guid id, [FromBody] string? note = null)
        => (await _svc.RecallAsync(id, note, GetUserId())).ToActionResult();

    /// <summary>Duyệt phiếu VPP — trừ tồn + tạo ExportReceipt.</summary>
    [HttpPost("requests/approve")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.WarehouseManager + "," + RoleNames.WarehouseStaff)]
    public async Task<IActionResult> Approve([FromBody] ApproveOfficeDto dto)
        => (await _svc.ApproveAsync(dto, GetUserId())).ToActionResult();

    // ===== HOÀN TRẢ VPP =====

    /// <summary>Danh sách phiếu hoàn trả VPP.</summary>
    [HttpGet("returns")]
    public async Task<IActionResult> Returns([FromQuery] int? status, [FromQuery] Guid? departmentId)
        => (await _svc.ReturnsAsync(status, departmentId)).ToActionResult();

    /// <summary>Tạo phiếu yêu cầu hoàn trả VPP.</summary>
    [HttpPost("returns")]
    public async Task<IActionResult> CreateReturn([FromBody] CreateReturnDto dto)
        => (await _svc.CreateReturnAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Duyệt phiếu hoàn trả — nhập lại tồn kho.</summary>
    [HttpPost("returns/approve")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.WarehouseManager + "," + RoleNames.WarehouseStaff)]
    public async Task<IActionResult> ApproveReturn([FromBody] ApproveReturnDto dto)
        => (await _svc.ApproveReturnAsync(dto, GetUserId())).ToActionResult();
}
