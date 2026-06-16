using HIS.Application.DTOs.Adr;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// ADR module (#5 #55-59): Báo cáo phản ứng có hại của thuốc — Thông tư 51/2017/TT-BYT.
/// Route: api/adr-report
/// TODO: Phân quyền chi tiết theo role (Dược sĩ / Bác sĩ / Admin) — cần thống nhất role-map với team.
/// </summary>
[ApiController]
[Route("api/adr-report")]
[Authorize]
public class AdrReportController : ControllerBase
{
    private readonly IAdrReportService _svc;

    public AdrReportController(IAdrReportService svc) => _svc = svc;

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? User.FindFirst("sub")?.Value;

    /// <summary>
    /// GET api/adr-report?from=&amp;to=&amp;keyword=
    /// Lấy danh sách phiếu ADR, lọc theo khoảng ngày báo cáo và từ khóa.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? keyword)
        => Ok(await _svc.GetAdrReportsAsync(from, to, keyword));

    /// <summary>
    /// POST api/adr-report
    /// Tạo mới (Id = Guid.Empty) hoặc cập nhật phiếu ADR.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] AdrReportDto dto)
    {
        try
        {
            var result = await _svc.SaveAdrReportAsync(dto, UserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// DELETE api/adr-report/{id}
    /// Soft-delete phiếu ADR.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => await _svc.DeleteAdrReportAsync(id, UserId) ? Ok() : NotFound();

    /// <summary>
    /// GET api/adr-report/report?from=&amp;to=
    /// Báo cáo tổng hợp số lượng ADR theo mức độ nghiêm trọng.
    /// </summary>
    [HttpGet("report")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
        => Ok(await _svc.GetReportSummaryAsync(from, to));
}
