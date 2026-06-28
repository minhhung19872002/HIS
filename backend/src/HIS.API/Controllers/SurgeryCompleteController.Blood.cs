using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.SurgeryComplete;

namespace HIS.API.Controllers;

public partial class SurgeryCompleteController
{
    /// <summary>
    /// Lấy kê đơn máu
    /// </summary>
    [HttpGet("{surgeryId}/blood-order")]
    public async Task<ActionResult<SurgeryBloodOrderDto>> GetBloodOrder(Guid surgeryId)
    {
        var result = await _surgeryService.GetBloodOrderAsync(surgeryId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tạo kê đơn máu
    /// </summary>
    [HttpPost("{surgeryId}/blood-order")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryBloodOrderDto>> CreateBloodOrder(Guid surgeryId, [FromBody] CreateBloodOrderDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.CreateBloodOrderAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật kê đơn máu
    /// </summary>
    [HttpPut("blood-orders/{orderId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryBloodOrderDto>> UpdateBloodOrder(Guid orderId, [FromBody] CreateBloodOrderDto dto)
    {
        var result = await _surgeryService.UpdateBloodOrderAsync(orderId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách kho máu
    /// </summary>
    [HttpGet("blood-banks")]
    public async Task<ActionResult<List<BloodBankDto>>> GetBloodBanks()
    {
        var result = await _surgeryService.GetBloodBanksAsync();
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm chế phẩm máu
    /// </summary>
    [HttpGet("blood-products/search")]
    public async Task<ActionResult<List<BloodProductItemDto>>> SearchBloodProducts(
        [FromQuery] Guid bloodBankId,
        [FromQuery] string? bloodType,
        [FromQuery] string? rhFactor)
    {
        var result = await _surgeryService.SearchBloodProductsAsync(bloodBankId, bloodType, rhFactor);
        return Ok(result);
    }
}
