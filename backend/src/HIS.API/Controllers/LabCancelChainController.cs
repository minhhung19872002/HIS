using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.LabCancelChain;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// M3.14 — Hủy chuỗi ngược workflow XN. Thin controller (#202): chỉ điều phối HTTP,
/// toàn bộ logic ở <see cref="ILabCancelChainService"/>.
/// </summary>
[ApiController]
[Route("api/laboratory/cancel-chain")]
[Authorize]
public class LabCancelChainController : ControllerBase
{
    private readonly ILabCancelChainService _svc;

    public LabCancelChainController(ILabCancelChainService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Step 1: Hủy duyệt kết quả (đã duyệt → bỏ duyệt, giữ KQ).</summary>
    [HttpPost("cancel-approval")]
    public async Task<IActionResult> CancelApproval([FromBody] CancelRequest dto)
        => (await _svc.CancelApprovalAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Step 2: Hủy kết quả (Có KQ → Đang TH). Phải hủy duyệt trước.</summary>
    [HttpPost("cancel-result")]
    public async Task<IActionResult> CancelResult([FromBody] CancelRequest dto)
        => (await _svc.CancelResultAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Step 3: Hủy lấy/nhận mẫu (→ Chờ lấy mẫu). Phải hủy KQ trước.</summary>
    [HttpPost("cancel-collection")]
    public async Task<IActionResult> CancelCollection([FromBody] CancelRequest dto)
        => (await _svc.CancelCollectionAsync(dto, GetUserId())).ToActionResult();
}
