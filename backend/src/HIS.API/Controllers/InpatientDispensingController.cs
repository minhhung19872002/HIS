using System.Security.Claims;
using HIS.Application.DTOs.InpatientDispensing;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Phát thuốc nội trú theo khoa — N1.05.
/// Gộp nhiều đơn thuốc nội trú theo khoa thành 1 phiếu xuất tổng hợp.
/// </summary>
[ApiController]
[Route("api/inpatient-dispensing")]
[Authorize]
public class InpatientDispensingController : ControllerBase
{
    private readonly IInpatientDispensingService _svc;
    public InpatientDispensingController(IInpatientDispensingService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>
    /// Danh sách đơn thuốc nội trú chờ phát, gộp theo khoa.
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] Guid? departmentId, [FromQuery] Guid? warehouseId)
        => (await _svc.PendingAsync(departmentId, warehouseId)).ToActionResult();

    /// <summary>
    /// Tạo 1 phiếu xuất tổng hợp cho nhiều đơn thuốc cùng 1 khoa.
    /// Gộp thuốc theo MedicineId, trừ tồn FEFO, đánh dấu IsDispensed.
    /// </summary>
    [HttpPost("batch")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.WarehouseManager + "," + RoleNames.WarehouseStaff + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> Batch([FromBody] BatchDispenseDto dto)
        => (await _svc.BatchAsync(dto, GetUserId())).ToActionResult();

    /// <summary>
    /// Xem chi tiết phiếu xuất tổng hợp — phục vụ in phiếu lĩnh.
    /// </summary>
    [HttpGet("receipt/{id:guid}")]
    public async Task<IActionResult> Receipt(Guid id)
        => (await _svc.ReceiptAsync(id)).ToActionResult();
}
