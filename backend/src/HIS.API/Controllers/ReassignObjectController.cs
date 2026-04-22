using System.Security.Claims;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sửa đối tượng thuốc/dịch vụ hàng loạt — Sprint 2 Item 2.7.
/// Chỉ Admin/Accountant được dùng; audit log qua ILogger.
/// </summary>
[ApiController]
[Route("api/billing/reassign-object")]
[Authorize(Roles = "Admin,Accountant,DepartmentHead")]
public class ReassignObjectController : ControllerBase
{
    private readonly IReassignObjectService _service;

    public ReassignObjectController(IReassignObjectService service)
    {
        _service = service;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    public async Task<ActionResult<ReassignObjectResultDto>> Reassign([FromBody] ReassignObjectRequestDto dto)
        => Ok(await _service.ReassignAsync(dto, GetUserId()));
}
