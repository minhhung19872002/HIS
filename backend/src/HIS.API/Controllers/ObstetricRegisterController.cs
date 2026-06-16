using HIS.Application.DTOs.ObstetricRegister;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// F1.8 #154: Sổ sinh đẻ + Sổ theo dõi nạo phá thai (register pháp lý khoa Sản) + báo cáo BYT.
/// </summary>
[ApiController]
[Route("api/obstetric-register")]
[Authorize]
public class ObstetricRegisterController : ControllerBase
{
    private readonly IObstetricRegisterService _svc;

    public ObstetricRegisterController(IObstetricRegisterService svc) => _svc = svc;

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? User.FindFirst("sub")?.Value;

    // ─── Sổ sinh đẻ ────────────────────────────────────────────────────────────

    [HttpGet("births")]
    public async Task<IActionResult> GetBirths([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? keyword) =>
        Ok(await _svc.GetBirthRegistersAsync(from, to, keyword));

    [HttpPost("births")]
    public async Task<IActionResult> SaveBirth([FromBody] BirthRegisterDto dto) =>
        Ok(await _svc.SaveBirthRegisterAsync(dto, UserId));

    [HttpDelete("births/{id:guid}")]
    public async Task<IActionResult> DeleteBirth(Guid id) =>
        await _svc.DeleteBirthRegisterAsync(id, UserId) ? Ok() : NotFound();

    // ─── Sổ theo dõi nạo phá thai ──────────────────────────────────────────────

    [HttpGet("abortions")]
    public async Task<IActionResult> GetAbortions([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? keyword) =>
        Ok(await _svc.GetAbortionRegistersAsync(from, to, keyword));

    [HttpPost("abortions")]
    public async Task<IActionResult> SaveAbortion([FromBody] AbortionRegisterDto dto) =>
        Ok(await _svc.SaveAbortionRegisterAsync(dto, UserId));

    [HttpDelete("abortions/{id:guid}")]
    public async Task<IActionResult> DeleteAbortion(Guid id) =>
        await _svc.DeleteAbortionRegisterAsync(id, UserId) ? Ok() : NotFound();

    // ─── Báo cáo BYT ───────────────────────────────────────────────────────────

    [HttpGet("report")]
    public async Task<IActionResult> GetReport([FromQuery] DateTime from, [FromQuery] DateTime to) =>
        Ok(await _svc.GetReportAsync(from, to));
}
