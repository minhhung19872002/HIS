using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Cài đặt per-user (generic key-value).
/// GET  /api/user-settings           — lấy tất cả settings của user hiện tại
/// GET  /api/user-settings/{key}     — lấy 1 setting
/// PUT  /api/user-settings/{key}     — upsert 1 setting
/// GET  /api/user-settings/lab-roles — lấy lab default roles
/// PUT  /api/user-settings/lab-roles — lưu lab default roles
/// </summary>
[ApiController]
[Route("api/user-settings")]
[Authorize]
public class UserSettingsController : ControllerBase
{
    private readonly IUserSettingsService _service;

    public UserSettingsController(IUserSettingsService service)
    {
        _service = service;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
    private string GetActorId() => GetUserId().ToString();

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync(GetUserId());
        return Ok(result);
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key)
    {
        var value = await _service.GetValueAsync(GetUserId(), key);
        return Ok(new UserSettingDto { SettingKey = key, SettingValue = value });
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Upsert(string key, [FromBody] UpdateUserSettingDto dto)
    {
        // Key trong route có quyền ưu tiên (prevent body mismatch)
        await _service.UpsertAsync(GetUserId(), key, dto.SettingValue, GetActorId());
        return NoContent();
    }

    [HttpGet("lab-roles")]
    public async Task<IActionResult> GetLabRoles()
    {
        var dto = await _service.GetLabDefaultRolesAsync(GetUserId());
        return Ok(dto);
    }

    [HttpPut("lab-roles")]
    public async Task<IActionResult> SaveLabRoles([FromBody] LabDefaultRoleDto dto)
    {
        await _service.SaveLabDefaultRolesAsync(GetUserId(), dto, GetActorId());
        return NoContent();
    }
}
