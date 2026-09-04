using HIS.Application.DTOs.MultiHisConnector;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// Quản trị kết nối API HIS đa nhà cung cấp + đối soát thiếu tờ phiếu.
/// Route: api/his-connector
/// Tất cả endpoint yêu cầu Authorize (JWT).
/// </summary>
[ApiController]
[Route("api/his-connector")]
[Authorize]
public class MultiHisConnectorController : ControllerBase
{
    private readonly IMultiHisConnectorService _svc;

    public MultiHisConnectorController(IMultiHisConnectorService svc) => _svc = svc;

    private string? UserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value;

    // ─── Connection CRUD ────────────────────────────────────────────────────

    /// <summary>Lấy danh sách kết nối HIS (chưa xoá)</summary>
    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections() =>
        Ok(await _svc.GetConnectionsAsync());

    /// <summary>Lấy chi tiết 1 kết nối theo Id</summary>
    [HttpGet("connections/{id:guid}")]
    public async Task<IActionResult> GetConnectionById(Guid id)
    {
        var dto = await _svc.GetConnectionByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Tạo mới hoặc cập nhật kết nối (Id null/empty = tạo mới)</summary>
    [HttpPost("connections")]
    public async Task<IActionResult> SaveConnection([FromBody] SaveHisConnectionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Name không được để trống.");
        if (string.IsNullOrWhiteSpace(dto.BaseUrl))
            return BadRequest("BaseUrl không được để trống.");
        if (!Uri.TryCreate(dto.BaseUrl, UriKind.Absolute, out _))
            return BadRequest("BaseUrl không hợp lệ — phải là URL tuyệt đối (https://...).");

        var result = await _svc.SaveConnectionAsync(dto, UserId);
        return Ok(result);
    }

    /// <summary>Xoá mềm (IsDeleted=true) kết nối theo Id</summary>
    [HttpDelete("connections/{id:guid}")]
    public async Task<IActionResult> DeleteConnection(Guid id) =>
        await _svc.DeleteConnectionAsync(id) ? Ok() : NotFound();

    // ─── Test Health ─────────────────────────────────────────────────────────

    /// <summary>
    /// Ping BaseUrl/health của kết nối.
    /// MockMode=true (mặc định): trả Online ngay không gọi HTTP thật.
    /// Cập nhật LastCheckedAt + LastStatus vào DB sau mỗi lần gọi.
    /// </summary>
    [HttpPost("test/{id:guid}")]
    public async Task<IActionResult> TestConnection(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _svc.TestConnectionAsync(id, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
    }

    // ─── CheckMissingForms ───────────────────────────────────────────────────

    /// <summary>
    /// Đối soát thiếu tờ phiếu bắt buộc cho các đợt khám/nhập viện trong khoảng ngày.
    /// Query params:
    ///   fromDate: yyyy-MM-dd (bắt buộc)
    ///   toDate:   yyyy-MM-dd (bắt buộc)
    ///   encounterType: "OPD" | "IPD" | null (null = kiểm cả 2)
    /// </summary>
    [HttpGet("check-missing-forms")]
    public async Task<IActionResult> CheckMissingForms(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] string? encounterType = null)
    {
        if (fromDate > toDate)
            return BadRequest("fromDate phải nhỏ hơn hoặc bằng toDate.");

        if (encounterType is not null && encounterType != "OPD" && encounterType != "IPD")
            return BadRequest("encounterType phải là 'OPD', 'IPD', hoặc không truyền.");

        var result = await _svc.CheckMissingFormsAsync(fromDate, toDate, encounterType);
        return Ok(result);
    }
}
