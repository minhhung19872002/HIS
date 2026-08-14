using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Hóa đơn điện tử (HĐĐT) đa NCC — VNPT / Viettel / MISA.
/// Luồng phiếu thu cũ. Chưa cấu hình NCC thật thì API từ chối phát hành;
/// tuyệt đối không sinh số hóa đơn hoặc mã CQT giả.
/// </summary>
[ApiController]
[Route("api/einvoice")]
[Authorize]
[TypeFilter(typeof(HIS.API.Filters.DomainExceptionFilter))]
public sealed class EInvoiceController : ControllerBase
{
    private readonly IEInvoiceService _svc;

    public EInvoiceController(IEInvoiceService svc)
    {
        _svc = svc;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /// <summary>Lấy danh sách HĐĐT (mới nhất trước).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EInvoiceDto>>> GetList(
        [FromQuery] Guid? receiptId,
        [FromQuery] int? status,
        [FromQuery] int pageSize = 200,
        CancellationToken ct = default)
    {
        var rows = await _svc.GetListAsync(receiptId, status, Math.Clamp(pageSize, 1, 500), ct);
        return Ok(rows);
    }

    // ── Detail ───────────────────────────────────────────────────────────────

    /// <summary>Chi tiết 1 HĐĐT (kèm PortalResponse thô).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EInvoiceDetailDto>> GetDetail(Guid id, CancellationToken ct = default)
    {
        try
        {
            return Ok(await _svc.GetDetailAsync(id, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ── Issue ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Phát hành HĐĐT từ phiếu thu.
    /// Chỉ phát hành khi có adapter NCC thật. Luồng bảng kê là luồng tích hợp chính.
    /// </summary>
    [HttpPost("issue")]
    public async Task<ActionResult<EInvoiceDto>> Issue(
        [FromBody] IssueEInvoiceRequestDto dto,
        CancellationToken ct = default)
    {
        var issuedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var result = await _svc.IssueAsync(dto, issuedBy, ct);
        return Ok(result);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    /// <summary>Hủy HĐĐT (Status → 3=cancelled).</summary>
    [HttpPost("cancel/{id:guid}")]
    public async Task<ActionResult<EInvoiceDto>> Cancel(Guid id, CancellationToken ct = default)
    {
        var cancelledBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        try
        {
            return Ok(await _svc.CancelAsync(id, cancelledBy, ct));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ── Sync Status ──────────────────────────────────────────────────────────

    /// <summary>
    /// Đồng bộ trạng thái từ NCC.
    /// Trả trạng thái hiện có của bản ghi thuộc luồng cũ.
    /// </summary>
    [HttpPost("status/{id:guid}")]
    public async Task<ActionResult<EInvoiceDto>> SyncStatus(Guid id, CancellationToken ct = default)
    {
        try
        {
            return Ok(await _svc.SyncStatusAsync(id, ct));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // ── Config ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Đọc cấu hình hiện tại.
    /// Trả: Provider, MockMode, Enabled.
    /// Để bật live: set EInvoice__MockMode=false + EInvoice__Enabled=true + credential NCC qua env.
    /// </summary>
    [HttpGet("config")]
    public ActionResult<EInvoiceConfigDto> GetConfig()
    {
        return Ok(_svc.GetConfig());
    }

    /// <summary>
    /// Endpoint tương thích cũ. Cấu hình triển khai là chỉ đọc và không được
    /// giả vờ lưu thành công trong bộ nhớ tạm.
    /// </summary>
    [HttpPut("config")]
    public async Task<ActionResult> SaveConfig(
        [FromBody] EInvoiceConfigDto dto,
        CancellationToken ct = default)
    {
        await _svc.SaveConfigAsync(dto, ct);
        return NoContent();
    }
}
