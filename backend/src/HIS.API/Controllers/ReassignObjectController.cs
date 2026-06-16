using System.Security.Claims;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sửa đối tượng thuốc/dịch vụ (bulk + per-line) — Sprint 2 Item 2.7 / #104 #126 #127 #137.
/// Mọi thay đổi đều ghi PayerChangeLog.
/// TODO: Tách role Cashier/Accountant riêng cho per-line endpoints khi có role đó.
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

    /// <summary>Đổi đối tượng hàng loạt (bulk) — endpoint cũ, backward compatible</summary>
    [HttpPost]
    public async Task<ActionResult<ReassignObjectResultDto>> Reassign([FromBody] ReassignObjectRequestDto dto)
        => Ok(await _service.ReassignAsync(dto, GetUserId()));

    /// <summary>Đổi đối tượng toàn bộ hồ sơ bệnh án (cả dịch vụ lẫn thuốc) + ghi audit</summary>
    [HttpPost("change-record")]
    public async Task<ActionResult<ChangeObjectResultDto>> ChangeRecord([FromBody] ChangeObjectForRecordRequestDto dto)
        => Ok(await _service.ChangeObjectForRecordAsync(dto, GetUserId()));

    /// <summary>Đổi đối tượng 1 dòng dịch vụ CLS/PTTT + ghi audit</summary>
    [HttpPost("change-service-line")]
    public async Task<ActionResult<ChangeObjectResultDto>> ChangeServiceLine([FromBody] ChangeObjectForServiceLineRequestDto dto)
        => Ok(await _service.ChangeObjectForServiceLineAsync(dto, GetUserId()));

    /// <summary>Đổi đối tượng 1 dòng thuốc/VTYT tại CĐHA (#137) + ghi audit</summary>
    [HttpPost("change-drug-line")]
    public async Task<ActionResult<ChangeObjectResultDto>> ChangeDrugLine([FromBody] ChangeObjectForDrugLineRequestDto dto)
        => Ok(await _service.ChangeObjectForDrugLineAsync(dto, GetUserId()));

    /// <summary>Lịch sử đổi đối tượng theo hồ sơ bệnh án</summary>
    [HttpGet("history/{medicalRecordId:guid}")]
    public async Task<ActionResult<List<PayerChangeLogDto>>> GetHistory(Guid medicalRecordId)
        => Ok(await _service.GetPayerChangeHistoryAsync(medicalRecordId));
}
