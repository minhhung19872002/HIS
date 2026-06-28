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
    // 10.1.6 Tạm khóa hồ sơ

    /// <summary>
    /// Tạm khóa hồ sơ bệnh án
    /// </summary>
    [HttpPost("records/lock")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<RecordLockDto>> LockMedicalRecord([FromBody] LockRecordDto dto)
    {
        var result = await _billingService.LockMedicalRecordAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa hồ sơ bệnh án
    /// </summary>
    [HttpPost("records/{medicalRecordId}/unlock")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<RecordLockDto>> UnlockMedicalRecord(Guid medicalRecordId)
    {
        var result = await _billingService.UnlockMedicalRecordAsync(medicalRecordId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy trạng thái khóa của hồ sơ
    /// </summary>
    [HttpGet("records/{medicalRecordId}/lock-status")]
    public async Task<ActionResult<RecordLockDto>> GetRecordLockStatus(Guid medicalRecordId)
    {
        var result = await _billingService.GetRecordLockStatusAsync(medicalRecordId);
        return Ok(result);
    }

    // 10.1.7 Duyệt kế toán

    /// <summary>
    /// Duyệt kế toán cho hóa đơn
    /// </summary>
    [HttpPost("accounting/approve")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<List<AccountingApprovalDto>>> ApproveAccounting([FromBody] ApproveAccountingDto dto)
    {
        var result = await _billingService.ApproveAccountingAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hóa đơn chờ duyệt kế toán
    /// </summary>
    [HttpGet("accounting/pending")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<PagedResultDto<AccountingApprovalDto>>> GetPendingApprovals([FromQuery] PendingApprovalSearchDto dto)
    {
        var result = await _billingService.GetPendingApprovalsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết duyệt kế toán của hóa đơn
    /// </summary>
    [HttpGet("accounting/invoices/{invoiceId}")]
    public async Task<ActionResult<AccountingApprovalDto>> GetApprovalDetail(Guid invoiceId)
    {
        var result = await _billingService.GetApprovalDetailAsync(invoiceId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // 10.1.8 Miễn giảm

    /// <summary>
    /// Áp dụng miễn giảm theo hóa đơn
    /// </summary>
    [HttpPost("discounts/invoice")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<InvoiceDto>> ApplyInvoiceDiscount([FromBody] ApplyDiscountDto dto)
    {
        var result = await _billingService.ApplyInvoiceDiscountAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng miễn giảm theo từng dịch vụ
    /// </summary>
    [HttpPost("discounts/services")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<InvoiceDto>> ApplyServiceDiscount([FromBody] ApplyDiscountDto dto)
    {
        var result = await _billingService.ApplyServiceDiscountAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử miễn giảm của hóa đơn
    /// </summary>
    [HttpGet("discounts/history/{invoiceId}")]
    public async Task<ActionResult<List<DiscountHistoryDto>>> GetDiscountHistory(Guid invoiceId)
    {
        var result = await _billingService.GetDiscountHistoryAsync(invoiceId);
        return Ok(result);
    }

    /// <summary>
    /// Hủy miễn giảm
    /// </summary>
    [HttpPost("discounts/{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<bool>> CancelDiscount(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelDiscountAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }
}
