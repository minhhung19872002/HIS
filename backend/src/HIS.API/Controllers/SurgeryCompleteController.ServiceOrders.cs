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
    /// Tìm kiếm ICD-10
    /// </summary>
    [HttpGet("icd-codes/search")]
    public async Task<ActionResult<List<IcdCodeDto>>> SearchIcdCodes([FromQuery] string keyword, [FromQuery] bool byCode = false)
    {
        var result = await _surgeryService.SearchIcdCodesAsync(keyword, byCode);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("services/search")]
    public async Task<ActionResult<List<ServiceDto>>> SearchServices([FromQuery] string? keyword = null, [FromQuery] int? serviceType = null)
    {
        var result = await _surgeryService.SearchServicesAsync(keyword, serviceType);
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định dịch vụ
    /// </summary>
    [HttpPost("{surgeryId}/service-orders")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryServiceOrderDto>> OrderService(Guid surgeryId, [FromBody] CreateSurgeryServiceOrderDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.OrderServiceAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định nhiều dịch vụ
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/batch")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> OrderServices(Guid surgeryId, [FromBody] List<CreateSurgeryServiceOrderDto> dtos)
    {
        var result = await _surgeryService.OrderServicesAsync(surgeryId, dtos, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo gói
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/package/{packageId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryPackageOrderDto>> OrderPackage(Guid surgeryId, Guid packageId)
    {
        var result = await _surgeryService.OrderPackageAsync(surgeryId, packageId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("{surgeryId}/service-orders")]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> GetServiceOrders(Guid surgeryId)
    {
        var result = await _surgeryService.GetServiceOrdersAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{orderId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryServiceOrderDto>> UpdateServiceOrder(Guid orderId, [FromBody] CreateSurgeryServiceOrderDto dto)
    {
        var result = await _surgeryService.UpdateServiceOrderAsync(orderId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    [HttpDelete("service-orders/{orderId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<bool>> DeleteServiceOrder(Guid orderId)
    {
        var result = await _surgeryService.DeleteServiceOrderAsync(orderId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xem tổng chi phí dịch vụ
    /// </summary>
    [HttpGet("{surgeryId}/service-cost")]
    public async Task<ActionResult<ServiceCostInfoDto>> GetServiceCostInfo(Guid surgeryId)
    {
        var result = await _surgeryService.GetServiceCostInfoAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo chỉ định
    /// </summary>
    [HttpGet("{surgeryId}/service-orders/warnings")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> CheckOrderWarnings(Guid surgeryId, [FromQuery] Guid serviceId)
    {
        var result = await _surgeryService.CheckOrderWarningsAsync(surgeryId, serviceId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<SurgeryServiceGroupDto>>> GetServiceGroups()
    {
        var result = await _surgeryService.GetServiceGroupsAsync(GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo nhóm dịch vụ
    /// </summary>
    [HttpPost("service-groups")]
    public async Task<ActionResult<SurgeryServiceGroupDto>> CreateServiceGroup([FromBody] SurgeryServiceGroupDto dto)
    {
        var result = await _surgeryService.CreateServiceGroupAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo nhóm
    /// </summary>
    [HttpPost("{surgeryId}/service-orders/group/{groupId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<List<SurgeryServiceOrderDto>>> OrderByGroup(Guid surgeryId, Guid groupId)
    {
        var result = await _surgeryService.OrderByGroupAsync(surgeryId, groupId, GetUserId());
        return Ok(result);
    }
}
