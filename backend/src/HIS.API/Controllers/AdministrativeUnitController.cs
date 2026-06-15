using HIS.Application.DTOs.AdministrativeUnit;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// F10.1 #94: CRUD danh mục địa danh hành chính — Tỉnh / Huyện / Xã.
/// </summary>
[ApiController]
[Route("api/administrative-unit")]
[Authorize]
public class AdministrativeUnitController : ControllerBase
{
    private readonly IAdministrativeUnitService _svc;

    public AdministrativeUnitController(IAdministrativeUnitService svc) => _svc = svc;

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? User.FindFirst("sub")?.Value;

    // ─── Province ─────────────────────────────────────────────────────────

    [HttpGet("provinces")]
    public async Task<IActionResult> GetProvinces([FromQuery] string? keyword) =>
        Ok(await _svc.GetProvincesAsync(keyword));

    [HttpPost("provinces")]
    public async Task<IActionResult> SaveProvince([FromBody] ProvinceDto dto) =>
        Ok(await _svc.SaveProvinceAsync(dto, UserId));

    [HttpDelete("provinces/{id:guid}")]
    public async Task<IActionResult> DeleteProvince(Guid id) =>
        await _svc.DeleteProvinceAsync(id) ? Ok() : NotFound();

    // ─── District ─────────────────────────────────────────────────────────

    [HttpGet("districts")]
    public async Task<IActionResult> GetDistricts([FromQuery] Guid? provinceId, [FromQuery] string? keyword) =>
        Ok(await _svc.GetDistrictsAsync(provinceId, keyword));

    [HttpPost("districts")]
    public async Task<IActionResult> SaveDistrict([FromBody] DistrictDto dto) =>
        Ok(await _svc.SaveDistrictAsync(dto, UserId));

    [HttpDelete("districts/{id:guid}")]
    public async Task<IActionResult> DeleteDistrict(Guid id) =>
        await _svc.DeleteDistrictAsync(id) ? Ok() : NotFound();

    // ─── Ward ─────────────────────────────────────────────────────────────

    [HttpGet("wards")]
    public async Task<IActionResult> GetWards([FromQuery] Guid? districtId, [FromQuery] string? keyword) =>
        Ok(await _svc.GetWardsAsync(districtId, keyword));

    [HttpPost("wards")]
    public async Task<IActionResult> SaveWard([FromBody] WardDto dto) =>
        Ok(await _svc.SaveWardAsync(dto, UserId));

    [HttpDelete("wards/{id:guid}")]
    public async Task<IActionResult> DeleteWard(Guid id) =>
        await _svc.DeleteWardAsync(id) ? Ok() : NotFound();
}
