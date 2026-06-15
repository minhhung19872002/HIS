using System.Security.Claims;
using HIS.Application.DTOs.BhytFullCoverage;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// F3.4: Khai bao danh sach BN BHYT chi tra 100% thuoc dac tri.
/// </summary>
[ApiController]
[Route("api/bhyt-full-coverage")]
[Authorize]
public class BhytFullCoverageController : ControllerBase
{
    private readonly IBhytFullCoverageService _svc;

    public BhytFullCoverageController(IBhytFullCoverageService svc)
    {
        _svc = svc;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Tim kiem danh sach BN full-coverage.</summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] BhytFullCoverageSearchDto dto)
    {
        var result = await _svc.SearchAsync(dto);
        return Ok(result);
    }

    /// <summary>Lay chi tiet mot ban ghi.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var dto = await _svc.GetByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    /// <summary>Tao moi khai bao BN full-coverage.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBhytFullCoverageDto dto)
    {
        var result = await _svc.CreateAsync(dto, GetUserId());
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>Cap nhat ban ghi full-coverage.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateBhytFullCoverageDto dto)
    {
        var result = await _svc.UpdateAsync(id, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>Xoa (soft-delete) ban ghi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _svc.DeleteAsync(id, GetUserId());
        return NoContent();
    }

    /// <summary>Kiem tra nhanh BN co dang trong dien full-coverage khong.</summary>
    [HttpGet("check/{patientId:guid}")]
    public async Task<IActionResult> Check(Guid patientId)
    {
        var active = await _svc.IsFullCoverageActiveAsync(patientId);
        return Ok(new { patientId, isFullCoverageActive = active });
    }
}
