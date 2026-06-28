using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.BillingComplete;

namespace HIS.API.Controllers;

public partial class BillingCompleteController
{
    // 10.1.9 Hóa đơn

    /// <summary>
    /// Tính toán hóa đơn cho bệnh nhân
    /// </summary>
    [HttpGet("invoices/calculate/{medicalRecordId}")]
    public async Task<ActionResult<InvoiceDto>> CalculateInvoice(Guid medicalRecordId)
    {
        var result = await _billingService.CalculateInvoiceAsync(medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hoặc cập nhật hóa đơn
    /// </summary>
    [HttpPost("invoices")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<InvoiceDto>> CreateOrUpdateInvoice([FromBody] CreateInvoiceDto dto)
    {
        var result = await _billingService.CreateOrUpdateInvoiceAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy hóa đơn theo ID
    /// </summary>
    [HttpGet("invoices/{id}")]
    public async Task<ActionResult<InvoiceDto>> GetInvoice(Guid id)
    {
        var result = await _billingService.GetInvoiceByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Lấy hóa đơn của bệnh nhân theo hồ sơ
    /// </summary>
    [HttpGet("invoices/medical-record/{medicalRecordId}")]
    public async Task<ActionResult<InvoiceDto>> GetPatientInvoice(Guid medicalRecordId)
    {
        var result = await _billingService.GetPatientInvoiceAsync(medicalRecordId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm hóa đơn
    /// </summary>
    [HttpGet("invoices/search")]
    public async Task<ActionResult<PagedResultDto<InvoiceDto>>> SearchInvoices([FromQuery] InvoiceSearchDto dto)
    {
        var result = await _billingService.SearchInvoicesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dịch vụ chưa thanh toán
    /// </summary>
    [HttpGet("invoices/unpaid-services/{patientId}")]
    public async Task<ActionResult<List<UnpaidServiceItemDto>>> GetUnpaidServices(Guid patientId)
    {
        var result = await _billingService.GetUnpaidServicesAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách thuốc chưa thanh toán
    /// </summary>
    [HttpGet("invoices/unpaid-medicines/{patientId}")]
    public async Task<ActionResult<List<UnpaidMedicineItemDto>>> GetUnpaidMedicines(Guid patientId)
    {
        var result = await _billingService.GetUnpaidMedicinesAsync(patientId);
        return Ok(result);
    }

    // 10.2.1 Hóa đơn điện tử

    /// <summary>
    /// Tạo/Phát hành hóa đơn điện tử
    /// </summary>
    [HttpPost("e-invoices")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Cashier)]
    public async Task<ActionResult<ElectronicInvoiceDto>> IssueElectronicInvoice([FromBody] IssueEInvoiceDto dto)
    {
        var result = await _billingService.IssueElectronicInvoiceAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy hóa đơn điện tử
    /// </summary>
    [HttpPost("e-invoices/{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<bool>> CancelElectronicInvoice(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelElectronicInvoiceAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm hóa đơn điện tử (phân trang)
    /// </summary>
    [HttpGet("e-invoices/search")]
    public async Task<ActionResult<PagedResultDto<ElectronicInvoiceDto>>> SearchElectronicInvoices([FromQuery] ElectronicInvoiceSearchDto dto)
    {
        var result = await _billingService.SearchElectronicInvoicesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hóa đơn điện tử (legacy)
    /// </summary>
    [HttpGet("e-invoices")]
    public async Task<ActionResult<List<ElectronicInvoiceDto>>> GetElectronicInvoices(
        [FromQuery] Guid? invoiceId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _billingService.GetElectronicInvoicesAsync(invoiceId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy hóa đơn điện tử theo ID
    /// </summary>
    [HttpGet("e-invoices/{id}")]
    public async Task<ActionResult<ElectronicInvoiceDto>> GetElectronicInvoiceById(Guid id)
    {
        var result = await _billingService.GetElectronicInvoiceByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Gửi hóa đơn điện tử qua email
    /// </summary>
    [HttpPost("e-invoices/{id}/send")]
    public async Task<ActionResult<bool>> SendElectronicInvoice(Guid id, [FromBody] ResendEmailRequest request)
    {
        var result = await _billingService.ResendElectronicInvoiceAsync(id, request.Email);
        return Ok(result);
    }

    /// <summary>
    /// Gửi lại hóa đơn điện tử qua email (legacy)
    /// </summary>
    [HttpPost("e-invoices/{id}/resend")]
    public async Task<ActionResult<bool>> ResendElectronicInvoice(Guid id, [FromBody] ResendEmailRequest request)
    {
        var result = await _billingService.ResendElectronicInvoiceAsync(id, request.Email);
        return Ok(result);
    }

    /// <summary>
    /// Xuất hóa đơn lên nhà cung cấp (VNInvoice/Misa)
    /// </summary>
    [HttpPut("e-invoices/{id}/export")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<ElectronicInvoiceDto>> ExportElectronicInvoice(Guid id)
    {
        var result = await _billingService.ExportElectronicInvoiceAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thống kê hóa đơn điện tử
    /// </summary>
    [HttpGet("e-invoices/stats")]
    public async Task<ActionResult<ElectronicInvoiceStatsDto>> GetElectronicInvoiceStats(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _billingService.GetElectronicInvoiceStatsAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In hóa đơn đại diện
    /// </summary>
    [HttpGet("e-invoices/{id}/print")]
    public async Task<ActionResult> PrintRepresentativeInvoice(Guid id)
    {
        var result = await _billingService.PrintRepresentativeInvoiceAsync(id);
        if (result.Length == 0) return NotFound();
        return File(result, "text/html", "hoadon_daidien.html");
    }
}
