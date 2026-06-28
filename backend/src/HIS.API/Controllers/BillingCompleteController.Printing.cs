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
    // 10.2 In ấn

    /// <summary>
    /// In bảng kê thanh toán theo mẫu 6556
    /// </summary>
    [HttpPost("print/statement-6556")]
    public async Task<IActionResult> Print6556Statement([FromBody] Print6556RequestDto dto)
    {
        var result = await _billingService.Print6556StatementAsync(dto);
        return File(result, "application/pdf", "bangke6556.pdf");
    }

    /// <summary>
    /// In bảng kê thanh toán tách theo đối tượng
    /// </summary>
    [HttpPost("print/statement-6556-by-object")]
    public async Task<IActionResult> Print6556ByObject([FromBody] Print6556RequestDto dto)
    {
        var result = await _billingService.Print6556ByObjectAsync(dto);
        return File(result, "application/pdf", "bangke6556_doituong.pdf");
    }

    /// <summary>
    /// In bảng kê thanh toán theo khoa
    /// </summary>
    [HttpPost("print/statement-6556-by-department")]
    public async Task<IActionResult> Print6556ByDepartment([FromBody] Print6556RequestDto dto)
    {
        var result = await _billingService.Print6556ByDepartmentAsync(dto);
        return File(result, "application/pdf", "bangke6556_khoa.pdf");
    }

    /// <summary>
    /// In phiếu tạm ứng theo dịch vụ
    /// </summary>
    [HttpPost("print/deposit-by-service")]
    public async Task<IActionResult> PrintDepositByService([FromBody] PrintByServiceRequestDto dto)
    {
        var result = await _billingService.PrintDepositByServiceAsync(dto);
        return File(result, "application/pdf", "phieutamung_dichvu.pdf");
    }

    /// <summary>
    /// In phiếu thu tạm ứng
    /// </summary>
    [HttpGet("print/deposit/{id}")]
    public async Task<IActionResult> PrintDepositReceipt(Guid id)
    {
        var result = await _billingService.PrintDepositReceiptAsync(id);
        return File(result, "application/pdf", "phieutamung.pdf");
    }

    /// <summary>
    /// In biên lai thu tiền
    /// </summary>
    [HttpGet("print/payment/{id}")]
    public async Task<IActionResult> PrintPaymentReceipt(Guid id)
    {
        var result = await _billingService.PrintPaymentReceiptAsync(id);
        return File(result, "application/pdf", "bienlaithutien.pdf");
    }

    /// <summary>
    /// In hóa đơn
    /// </summary>
    [HttpGet("print/invoice/{id}")]
    public async Task<IActionResult> PrintInvoice(Guid id)
    {
        var result = await _billingService.PrintInvoiceAsync(id);
        return File(result, "application/pdf", "hoadon.pdf");
    }

    /// <summary>
    /// In phiếu thu hoàn ứng
    /// </summary>
    [HttpGet("print/refund/{id}")]
    public async Task<IActionResult> PrintRefundReceipt(Guid id)
    {
        var result = await _billingService.PrintRefundReceiptAsync(id);
        return File(result, "application/pdf", "phieuhoanting.pdf");
    }
}
