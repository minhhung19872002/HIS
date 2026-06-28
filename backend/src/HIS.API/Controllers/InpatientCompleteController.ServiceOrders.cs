using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.InpatientComplete;

namespace HIS.API.Controllers;

public partial class InpatientCompleteController
{
    #region 3.3 Chỉ định dịch vụ nội trú

    /// <summary>
    /// Lấy chẩn đoán đầy đủ (chính + kèm theo) từ hồ sơ bệnh án
    /// </summary>
    [HttpGet("diagnosis/{admissionId}")]
    public async Task<ActionResult<InpatientDiagnosisDto>> GetDiagnosisFromRecord(Guid admissionId)
    {
        var result = await _inpatientService.GetInpatientDiagnosisAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Lưu chẩn đoán chính + kèm theo cho đợt điều trị nội trú
    /// POST /api/inpatient/diagnosis/{admissionId}
    /// </summary>
    [HttpPost("diagnosis/{admissionId}")]
    public async Task<ActionResult<InpatientDiagnosisDto>> SaveInpatientDiagnosis(
        Guid admissionId, [FromBody] SaveInpatientDiagnosisDto dto)
    {
        var result = await _inpatientService.SaveInpatientDiagnosisAsync(admissionId, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy cây dịch vụ
    /// </summary>
    [HttpGet("service-tree")]
    public async Task<ActionResult<List<object>>> GetServiceTree([FromQuery] Guid? parentId)
    {
        var result = await _inpatientService.GetServiceTreeAsync(parentId);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("search-services")]
    public async Task<ActionResult<List<object>>> SearchServices([FromQuery] string keyword, [FromQuery] string? serviceType)
    {
        var result = await _inpatientService.SearchServicesAsync(keyword, serviceType);
        return Ok(result);
    }

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders")]
    public async Task<ActionResult<InpatientServiceOrderDto>> CreateServiceOrder([FromBody] CreateInpatientServiceOrderDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng 500 — validate khóa bắt buộc
        if (dto == null || dto.AdmissionId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu admissionId" });
        if (dto.Services == null || dto.Services.Count == 0)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Danh sách dịch vụ trống" });
        var result = await _inpatientService.CreateServiceOrderAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{id}")]
    public async Task<ActionResult<InpatientServiceOrderDto>> UpdateServiceOrder(Guid id, [FromBody] CreateInpatientServiceOrderDto dto)
    {
        var result = await _inpatientService.UpdateServiceOrderAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    [HttpDelete("service-orders/{id}")]
    public async Task<ActionResult> DeleteServiceOrder(Guid id)
    {
        await _inpatientService.DeleteServiceOrderAsync(id, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("service-orders/{admissionId}")]
    public async Task<ActionResult<List<InpatientServiceOrderDto>>> GetServiceOrders(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetServiceOrdersAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết chỉ định
    /// </summary>
    [HttpGet("service-order/{id}")]
    public async Task<ActionResult<InpatientServiceOrderDto>> GetServiceOrderById(Guid id)
    {
        var result = await _inpatientService.GetServiceOrderByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Tạo nhóm dịch vụ mẫu
    /// </summary>
    [HttpPost("service-group-templates")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> CreateServiceGroupTemplate([FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _inpatientService.CreateServiceGroupTemplateAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ mẫu
    /// </summary>
    [HttpGet("service-group-templates")]
    public async Task<ActionResult<List<ServiceGroupTemplateDto>>> GetServiceGroupTemplates([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetServiceGroupTemplatesAsync(departmentId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo nhóm mẫu
    /// </summary>
    [HttpPost("order-by-template")]
    public async Task<ActionResult<InpatientServiceOrderDto>> OrderByTemplate([FromBody] OrderByTemplateRequest request)
    {
        var result = await _inpatientService.OrderByTemplateAsync(request.AdmissionId, request.TemplateId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo gói
    /// </summary>
    [HttpPost("order-by-package")]
    public async Task<ActionResult<InpatientServiceOrderDto>> OrderByPackage([FromBody] OrderByPackageRequest request)
    {
        var result = await _inpatientService.OrderByPackageAsync(request.AdmissionId, request.PackageId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu ưu tiên
    /// </summary>
    [HttpPost("service-item/{itemId}/urgent")]
    public async Task<ActionResult> MarkServiceAsUrgent(Guid itemId, [FromBody] bool isUrgent)
    {
        await _inpatientService.MarkServiceAsUrgentAsync(itemId, isUrgent, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Kiểm tra cảnh báo chỉ định
    /// </summary>
    [HttpPost("service-order-warnings")]
    public async Task<ActionResult<ServiceOrderWarningDto>> CheckServiceOrderWarnings([FromBody] CheckServiceWarningsRequest request)
    {
        var result = await _inpatientService.CheckServiceOrderWarningsAsync(request.AdmissionId, request.Items);
        return Ok(result);
    }

    // G-08: Lay danh sach chi dinh CLS cua dot dieu tri
    [HttpGet("{admissionId}/service-requests")]
    public async Task<ActionResult<List<InpatientServiceRequestItemDto>>> GetAdmissionServiceRequests(Guid admissionId)
    {
        var result = await _inpatientService.GetAdmissionServiceRequestsAsync(admissionId);
        return Ok(result);
    }

    // G-08: Huy nhieu chi dinh CLS
    [HttpPost("{admissionId}/cancel-service-requests")]
    public async Task<ActionResult<CancelServiceRequestsResultDto>> CancelServiceRequests(
        Guid admissionId, [FromBody] CancelServiceRequestsDto dto)
    {
        var result = await _inpatientService.CancelServiceRequestsAsync(admissionId, dto, GetCurrentUserId());
        return Ok(result);
    }

    // G-15: Doi doi tuong thanh toan ServiceRequest
    [HttpPut("service-request/{requestId}/payment-type")]
    public async Task<ActionResult<InpatientServiceRequestItemDto>> UpdateServiceRequestPaymentType(
        Guid requestId, [FromBody] UpdateServiceRequestPaymentTypeDto dto)
    {
        var result = await _inpatientService.UpdateServiceRequestPaymentTypeAsync(requestId, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    [HttpGet("print-service-order/{orderId}")]
    public async Task<ActionResult> PrintServiceOrder(Guid orderId)
    {
        var pdfBytes = await _inpatientService.PrintServiceOrderAsync(orderId);
        return File(pdfBytes, "application/pdf", "service-order.pdf");
    }

    #endregion

    #region 3.4 Kê đơn thuốc nội trú

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    [HttpGet("search-medicines")]
    public async Task<ActionResult<List<object>>> SearchMedicines([FromQuery] string keyword, [FromQuery] Guid warehouseId)
    {
        var result = await _inpatientService.SearchMedicinesAsync(keyword, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chống chỉ định
    /// </summary>
    [HttpGet("medicine-contraindications/{medicineId}")]
    public async Task<ActionResult<object>> GetMedicineContraindications(Guid medicineId, [FromQuery] Guid admissionId)
    {
        var result = await _inpatientService.GetMedicineContraindicationsAsync(medicineId, admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tồn kho thuốc
    /// </summary>
    [HttpGet("medicine-stock/{medicineId}")]
    public async Task<ActionResult<decimal>> GetMedicineStock(Guid medicineId, [FromQuery] Guid warehouseId)
    {
        var result = await _inpatientService.GetMedicineStockAsync(medicineId, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo đơn thuốc
    /// </summary>
    [HttpPost("prescriptions")]
    public async Task<ActionResult<InpatientPrescriptionDto>> CreatePrescription([FromBody] CreateInpatientPrescriptionDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng 500 — validate khóa bắt buộc
        if (dto == null || dto.AdmissionId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu admissionId" });
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Đơn thuốc trống (chưa có dòng thuốc)" });
        var result = await _inpatientService.CreatePrescriptionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    [HttpPut("prescriptions/{id}")]
    public async Task<ActionResult<InpatientPrescriptionDto>> UpdatePrescription(Guid id, [FromBody] CreateInpatientPrescriptionDto dto)
    {
        var result = await _inpatientService.UpdatePrescriptionAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa đơn thuốc
    /// </summary>
    [HttpDelete("prescriptions/{id}")]
    public async Task<ActionResult> DeletePrescription(Guid id)
    {
        await _inpatientService.DeletePrescriptionAsync(id, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Lấy danh sách đơn thuốc
    /// </summary>
    [HttpGet("prescriptions/{admissionId}")]
    public async Task<ActionResult<List<InpatientPrescriptionDto>>> GetPrescriptions(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetPrescriptionsAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết đơn thuốc
    /// </summary>
    [HttpGet("prescription/{id}")]
    public async Task<ActionResult<InpatientPrescriptionDto>> GetPrescriptionById(Guid id)
    {
        var result = await _inpatientService.GetPrescriptionByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Kê đơn từ tủ trực
    /// </summary>
    [HttpPost("emergency-cabinet-prescription")]
    public async Task<ActionResult<EmergencyCabinetPrescriptionDto>> CreateEmergencyCabinetPrescription([FromBody] EmergencyCabinetPrescriptionRequest request)
    {
        var result = await _inpatientService.CreateEmergencyCabinetPrescriptionAsync(request.AdmissionId, request.CabinetId, request.Items, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tủ trực
    /// </summary>
    [HttpGet("emergency-cabinets/{departmentId}")]
    public async Task<ActionResult<List<object>>> GetEmergencyCabinets(Guid departmentId)
    {
        var result = await _inpatientService.GetEmergencyCabinetsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo kê đơn
    /// </summary>
    [HttpPost("prescription-warnings")]
    public async Task<ActionResult<PrescriptionWarningDto>> CheckPrescriptionWarnings([FromBody] CheckPrescriptionWarningsRequest request)
    {
        var result = await _inpatientService.CheckPrescriptionWarningsAsync(request.AdmissionId, request.Items);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đơn thuốc mẫu
    /// </summary>
    [HttpGet("prescription-templates")]
    public async Task<ActionResult<List<InpatientPrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetPrescriptionTemplatesAsync(departmentId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo đơn thuốc mẫu
    /// </summary>
    [HttpPost("prescription-templates")]
    public async Task<ActionResult<InpatientPrescriptionTemplateDto>> CreatePrescriptionTemplate([FromBody] InpatientPrescriptionTemplateDto dto)
    {
        var result = await _inpatientService.CreatePrescriptionTemplateAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kê theo mẫu
    /// </summary>
    [HttpPost("prescribe-by-template")]
    public async Task<ActionResult<InpatientPrescriptionDto>> PrescribeByTemplate([FromBody] PrescribeByTemplateRequest request)
    {
        var result = await _inpatientService.PrescribeByTemplateAsync(request.AdmissionId, request.TemplateId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tổng hợp phiếu lĩnh thuốc
    /// </summary>
    [HttpPost("medicine-order-summary")]
    public async Task<ActionResult<MedicineOrderSummaryDto>> CreateMedicineOrderSummary([FromBody] CreateMedicineOrderSummaryRequest request)
    {
        var result = await _inpatientService.CreateMedicineOrderSummaryAsync(request.DepartmentId, request.Date, request.RoomId, request.WarehouseId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu tổng hợp
    /// </summary>
    [HttpGet("medicine-order-summaries/{departmentId}")]
    public async Task<ActionResult<List<MedicineOrderSummaryDto>>> GetMedicineOrderSummaries(Guid departmentId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _inpatientService.GetMedicineOrderSummariesAsync(departmentId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu tổng hợp thuốc
    /// </summary>
    [HttpGet("print-medicine-summary/{summaryId}")]
    public async Task<ActionResult> PrintMedicineOrderSummary(Guid summaryId)
    {
        var pdfBytes = await _inpatientService.PrintMedicineOrderSummaryAsync(summaryId);
        return File(pdfBytes, "application/pdf", "medicine-summary.pdf");
    }

    #endregion
}
