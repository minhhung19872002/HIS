using System.Security.Claims;
using HIS.Application.DTOs.Pharmacy;
using HIS.Application.Services;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// #214 [SAFE-3] Ngưỡng liều thuốc nguy cơ cao — cấu hình (dược sĩ/admin) + kiểm tra quá liều (advisory, mọi vai trò kê đơn).
/// </summary>
[ApiController]
[Route("api/medicine-dose-range")]
[TypeFilter(typeof(HIS.API.Filters.DomainExceptionFilter))]
public class MedicineDoseRangeController : ControllerBase
{
    private readonly IMedicineDoseRangeService _service;

    public MedicineDoseRangeController(IMedicineDoseRangeService service) => _service = service;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet("by-medicine/{medicineId:guid}")]
    [Authorize]
    public async Task<ActionResult<List<MedicineDoseRangeDto>>> GetByMedicine(Guid medicineId)
        => Ok(await _service.GetByMedicineAsync(medicineId));

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<MedicineDoseRangeDto>>> Search([FromQuery] string? keyword)
        => Ok(await _service.SearchAsync(keyword));

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<MedicineDoseRangeDto>> Create([FromBody] CreateMedicineDoseRangeDto dto)
        => Ok(await _service.CreateAsync(dto, GetUserId()));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<MedicineDoseRangeDto>> Update(Guid id, [FromBody] CreateMedicineDoseRangeDto dto)
        => Ok(await _service.UpdateAsync(id, dto, GetUserId()));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _service.DeleteAsync(id, GetUserId());
        return ok ? Ok() : NotFound();
    }

    /// <summary>Kiểm tra liều kê đơn so với ngưỡng (advisory) — trả cảnh báo, KHÔNG chặn.</summary>
    [HttpPost("check")]
    [Authorize]
    public async Task<ActionResult<List<DoseWarningDto>>> Check([FromBody] DoseCheckRequestDto request)
        => Ok(await _service.CheckAsync(request));
}
