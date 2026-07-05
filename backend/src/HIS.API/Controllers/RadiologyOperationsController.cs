using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.RadiologyOperations;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// CĐHA: chỉ định thêm + xuất thuốc/vật tư tại phòng — N1.14 + N1.15.
/// </summary>
[ApiController]
[Route("api/radiology-ops")]
[Authorize]
public class RadiologyOperationsController : ControllerBase
{
    private readonly IRadiologyOperationsService _svc;
    public RadiologyOperationsController(IRadiologyOperationsService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>N1.14 — thêm chỉ định CĐHA mới liên kết cùng HSBA/examination.</summary>
    [HttpPost("add-on")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
    public async Task<IActionResult> AddOn([FromBody] AddOnDto dto)
        => (await _svc.AddOnAsync(dto, GetUserId())).ToActionResult();

    /// <summary>N1.15 — xuất thuốc/vật tư tiêu hao tại phòng CĐHA cho BN.</summary>
    [HttpPost("dispense")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Nurse + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> Dispense([FromBody] RoomDispenseDto dto)
        => (await _svc.DispenseAsync(dto, GetUserId())).ToActionResult();
}
