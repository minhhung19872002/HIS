using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Validate practice license (CCHN — Chứng chỉ hành nghề) for the calling doctor.
/// NangCap18 yêu cầu: cấm khám khi BS chưa có CCHN hoặc CCHN hết hạn.
/// </summary>
[ApiController]
[Route("api/doctor-license")]
[Authorize]
public class DoctorLicenseController : ControllerBase
{
    private readonly IDoctorLicenseService _svc;

    public DoctorLicenseController(IDoctorLicenseService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;


    /// <summary>
    /// Kiểm tra CCHN của người đang login. Frontend OPD gọi khi load trang
    /// để hiển thị banner warning nếu không đủ điều kiện khám bệnh.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyLicenseStatus()
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        return (await _svc.GetMyLicenseStatusAsync(roles, userId)).ToActionResult();
    }
}
