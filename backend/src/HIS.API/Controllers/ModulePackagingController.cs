using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Authorization;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Constants;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// #405: cờ đóng gói module thương mại (Gói PK / Gói BV). FE gọi GET sau login để
/// ẩn menu/route module tắt. KHÔNG phải security boundary — permission (#367) lo phần đó.
/// </summary>
[ApiController]
[Route("api/system")]
public class ModulePackagingController : ControllerBase
{
    private readonly IModulePackagingService _service;

    public ModulePackagingController(IModulePackagingService service) => _service = service;

    /// <summary>Danh sách module đang bật — mọi user đã đăng nhập đọc được.</summary>
    [Authorize]
    [HttpGet("enabled-modules")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetEnabledModules()
        => Ok(ApiResponse<List<string>>.Ok(await _service.GetEnabledModulesAsync()));

    /// <summary>Cập nhật gói (CORE không tắt được — service tự union). Chỉ System.Configure.</summary>
    [RequirePermission(PermissionCatalog.System.Configure)]
    [HttpPut("enabled-modules")]
    public async Task<ActionResult<ApiResponse<List<string>>>> SetEnabledModules([FromBody] List<string> modules)
    {
        var by = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var result = await _service.SetEnabledModulesAsync(modules ?? new List<string>(), by);
        return Ok(ApiResponse<List<string>>.Ok(result, "Đã cập nhật gói module"));
    }
}
