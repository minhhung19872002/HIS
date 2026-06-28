using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Infrastructure.Data;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.ExaminationComplete;

namespace HIS.API.Controllers;

public partial class ExaminationCompleteController : ControllerBase
{
    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("{examinationId}/service-orders")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> GetServiceOrders(Guid examinationId)
    {
        var result = await _examinationService.GetServiceOrdersAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> CreateServiceOrders([FromBody] CreateServiceOrderDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng 500 — validate rõ ràng thay vì "Hệ thống gặp sự cố"
        if (dto == null || dto.ExaminationId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu examinationId" });
        if (dto.Services == null || dto.Services.Count == 0)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Danh sách dịch vụ trống" });
        var result = await _examinationService.CreateServiceOrdersAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{orderId}")]
    public async Task<ActionResult<ServiceOrderFullDto>> UpdateServiceOrder(Guid orderId, [FromBody] ServiceOrderFullDto dto)
    {
        var result = await _examinationService.UpdateServiceOrderAsync(orderId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Hủy chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders/{orderId}/cancel")]
    public async Task<ActionResult<bool>> CancelServiceOrder(Guid orderId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelServiceOrderAsync(orderId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dịch vụ
    /// </summary>
    [HttpGet("services")]
    public async Task<ActionResult<List<ServiceDto>>> GetServices(
        [FromQuery] int? serviceType = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? keyword = null)
    {
        var result = await _examinationService.GetServicesAsync(serviceType, departmentId, keyword);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("services/search")]
    public async Task<ActionResult<List<ServiceDto>>> SearchServices([FromQuery] string keyword, [FromQuery] int limit = 20)
    {
        var result = await _examinationService.SearchServicesAsync(keyword, limit);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<ServiceGroupTemplateDto>>> GetServiceGroupTemplates([FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetServiceGroupTemplatesAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo nhóm dịch vụ
    /// </summary>
    [HttpPost("service-groups")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> CreateServiceGroupTemplate([FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _examinationService.CreateServiceGroupTemplateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật nhóm dịch vụ
    /// </summary>
    [HttpPut("service-groups/{id}")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> UpdateServiceGroupTemplate(Guid id, [FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _examinationService.UpdateServiceGroupTemplateAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa nhóm dịch vụ
    /// </summary>
    [HttpDelete("service-groups/{id}")]
    public async Task<ActionResult<bool>> DeleteServiceGroupTemplate(Guid id)
    {
        var result = await _examinationService.DeleteServiceGroupTemplateAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách gói dịch vụ
    /// </summary>
    [HttpGet("service-packages")]
    public async Task<ActionResult<List<ServicePackageDto>>> GetServicePackages()
    {
        var result = await _examinationService.GetServicePackagesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng gói dịch vụ
    /// </summary>
    [HttpPost("{examinationId}/apply-service-package/{packageId}")]
    public async Task<ActionResult<List<ServiceOrderFullDto>>> ApplyServicePackage(Guid examinationId, Guid packageId)
    {
        var result = await _examinationService.ApplyServicePackageAsync(examinationId, packageId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trùng dịch vụ
    /// </summary>
    [HttpPost("{examinationId}/check-duplicate-services")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> CheckDuplicateServices(Guid examinationId, [FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.CheckDuplicateServicesAsync(examinationId, serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy định chỉ định
    /// </summary>
    [HttpPost("{examinationId}/validate-service-orders")]
    public async Task<ActionResult<List<ServiceOrderWarningDto>>> ValidateServiceOrders(Guid examinationId, [FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.ValidateServiceOrdersAsync(examinationId, serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng thực hiện dịch vụ
    /// </summary>
    [HttpGet("services/{serviceId}/rooms")]
    public async Task<ActionResult<List<RoomDto>>> GetServiceRooms(Guid serviceId)
    {
        var result = await _examinationService.GetServiceRoomsAsync(serviceId);
        return Ok(result);
    }

    /// <summary>
    /// Tự động chọn phòng tối ưu
    /// </summary>
    [HttpGet("services/{serviceId}/optimal-room")]
    public async Task<ActionResult<Guid?>> AutoSelectOptimalRoom(Guid serviceId)
    {
        var result = await _examinationService.AutoSelectOptimalRoomAsync(serviceId);
        return Ok(result);
    }

    /// <summary>
    /// Tính đường đi tối ưu
    /// </summary>
    [HttpPost("calculate-optimal-path")]
    public async Task<ActionResult<List<RoomDto>>> CalculateOptimalPath([FromBody] List<Guid> serviceIds)
    {
        var result = await _examinationService.CalculateOptimalPathAsync(serviceIds);
        return Ok(result);
    }

    /// <summary>
    /// Lấy dịch vụ thường dùng
    /// </summary>
    [HttpGet("services/frequent")]
    public async Task<ActionResult<List<ServiceDto>>> GetFrequentServices([FromQuery] int limit = 20)
    {
        var doctorId = GetCurrentUserId();
        var result = await _examinationService.GetFrequentServicesAsync(doctorId, limit);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    [HttpGet("service-orders/{orderId}/print")]
    public async Task<ActionResult> PrintServiceOrder(Guid orderId)
    {
        var result = await _examinationService.PrintServiceOrderAsync(orderId);
        return File(result, "application/pdf", $"PhieuChiDinh_{orderId}.pdf");
    }

    /// <summary>
    /// In tất cả phiếu chỉ định
    /// </summary>
    [HttpGet("{examinationId}/service-orders/print-all")]
    public async Task<ActionResult> PrintAllServiceOrders(Guid examinationId)
    {
        var result = await _examinationService.PrintAllServiceOrdersAsync(examinationId);
        return File(result, "application/pdf", $"PhieuChiDinh_{examinationId}.pdf");
    }
}
