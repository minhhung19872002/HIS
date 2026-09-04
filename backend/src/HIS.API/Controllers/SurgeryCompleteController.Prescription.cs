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
    /// Lấy đơn thuốc/vật tư của PTTT
    /// </summary>
    [HttpGet("{surgeryId}/prescription")]
    public async Task<ActionResult<SurgeryPrescriptionDto>> GetPrescription(Guid surgeryId)
    {
        var result = await _surgeryService.GetPrescriptionAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm thuốc
    /// </summary>
    [HttpPost("{surgeryId}/medicines")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<SurgeryMedicineDto>> AddMedicine(Guid surgeryId, [FromBody] AddSurgeryMedicineDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.AddMedicineAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thêm vật tư
    /// </summary>
    [HttpPost("{surgeryId}/supplies")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<SurgerySupplyDto>> AddSupply(Guid surgeryId, [FromBody] AddSurgerySupplyDto dto)
    {
        dto.SurgeryId = surgeryId;
        var result = await _surgeryService.AddSupplyAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thuốc
    /// </summary>
    [HttpPut("medicines/{itemId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<SurgeryMedicineDto>> UpdateMedicine(Guid itemId, [FromBody] AddSurgeryMedicineDto dto)
    {
        var result = await _surgeryService.UpdateMedicineAsync(itemId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa thuốc
    /// </summary>
    [HttpDelete("medicines/{itemId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<bool>> RemoveMedicine(Guid itemId)
    {
        var result = await _surgeryService.RemoveMedicineAsync(itemId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa vật tư
    /// </summary>
    [HttpDelete("supplies/{itemId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<bool>> RemoveSupply(Guid itemId)
    {
        var result = await _surgeryService.RemoveSupplyAsync(itemId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng gói thuốc/VT
    /// </summary>
    [HttpPost("{surgeryId}/prescription/apply-package/{packageId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryPrescriptionDto>> ApplyPackage(Guid surgeryId, Guid packageId)
    {
        var result = await _surgeryService.ApplyPackageAsync(surgeryId, packageId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    [HttpGet("medicines/search")]
    public async Task<ActionResult<List<MedicineDetailDto>>> SearchMedicines([FromQuery] string keyword, [FromQuery] Guid warehouseId)
    {
        var result = await _surgeryService.SearchMedicinesAsync(keyword, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo thuốc
    /// </summary>
    [HttpGet("{surgeryId}/medicines/warnings")]
    public async Task<ActionResult<List<MedicineWarningDto>>> CheckMedicineWarnings(Guid surgeryId, [FromQuery] Guid medicineId)
    {
        var result = await _surgeryService.CheckMedicineWarningsAsync(surgeryId, medicineId);
        return Ok(result);
    }

    /// <summary>
    /// Xem thông tin chi tiết thuốc
    /// </summary>
    [HttpGet("medicines/{medicineId}/detail")]
    public async Task<ActionResult<MedicineDetailDto>> GetMedicineDetail(Guid medicineId, [FromQuery] Guid warehouseId)
    {
        var result = await _surgeryService.GetMedicineDetailAsync(medicineId, warehouseId);
        if (result == null) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mẫu đơn thuốc
    /// </summary>
    [HttpGet("prescription-templates")]
    public async Task<ActionResult<List<SurgeryPrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? surgeryServiceId)
    {
        var result = await _surgeryService.GetPrescriptionTemplatesAsync(GetUserId(), surgeryServiceId);
        return Ok(result);
    }

    /// <summary>
    /// Lưu mẫu đơn thuốc
    /// </summary>
    [HttpPost("prescription-templates")]
    public async Task<ActionResult<SurgeryPrescriptionTemplateDto>> SavePrescriptionTemplate([FromBody] SurgeryPrescriptionTemplateDto dto)
    {
        var result = await _surgeryService.SavePrescriptionTemplateAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng mẫu đơn thuốc
    /// </summary>
    [HttpPost("{surgeryId}/prescription/apply-template/{templateId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryPrescriptionDto>> ApplyPrescriptionTemplate(Guid surgeryId, Guid templateId)
    {
        var result = await _surgeryService.ApplyPrescriptionTemplateAsync(surgeryId, templateId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Sao chép đơn thuốc cũ
    /// </summary>
    [HttpPost("{surgeryId}/prescription/copy/{sourceSurgeryId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryPrescriptionDto>> CopyPrescription(Guid surgeryId, Guid sourceSurgeryId)
    {
        var result = await _surgeryService.CopyPrescriptionAsync(surgeryId, sourceSurgeryId, GetUserId());
        return Ok(result);
    }
}
