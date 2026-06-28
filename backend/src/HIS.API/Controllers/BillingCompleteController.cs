using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.BillingComplete;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 10: Thu ngân
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
// 2026-06-12 (bug thu trùng prod): exception nghiệp vụ từng unhandled tới Kestrel → connection abort
// → Cloud Run trả 503 TRẦN không CORS → FE tưởng fail và retry. Filter trả JSON 400/500 có CORS.
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public partial class BillingCompleteController : ControllerBase
{
    private readonly IBillingCompleteService _billingService;

    public BillingCompleteController(IBillingCompleteService billingService)
    {
        _billingService = billingService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());

    #region 10.1.1 Quản lý sổ thu

    /// <summary>
    /// Tạo sổ thu tiền
    /// </summary>
    [HttpPost("cash-books")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<CashBookDto>> CreateCashBook([FromBody] CreateCashBookDto dto)
    {
        var result = await _billingService.CreateCashBookAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo sổ tạm ứng
    /// </summary>
    [HttpPost("deposit-books")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<CashBookDto>> CreateDepositBook([FromBody] CreateCashBookDto dto)
    {
        var result = await _billingService.CreateDepositBookAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách sổ thu
    /// </summary>
    [HttpGet("cash-books")]
    public async Task<ActionResult<List<CashBookDto>>> GetCashBooks([FromQuery] int? bookType, [FromQuery] Guid? departmentId)
    {
        var result = await _billingService.GetCashBooksAsync(bookType, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết sổ thu
    /// </summary>
    [HttpGet("cash-books/{id}")]
    public async Task<ActionResult<CashBookDto>> GetCashBook(Guid id)
    {
        var result = await _billingService.GetCashBookByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Khóa sổ thu
    /// </summary>
    [HttpPost("cash-books/{id}/lock")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<CashBookDto>> LockCashBook(Guid id)
    {
        var result = await _billingService.LockCashBookAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa sổ thu
    /// </summary>
    [HttpPost("cash-books/{id}/unlock")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<CashBookDto>> UnlockCashBook(Guid id)
    {
        var result = await _billingService.UnlockCashBookAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Phân quyền sổ
    /// </summary>
    [HttpPost("cash-books/permissions")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<bool>> AssignCashBookPermission([FromBody] AssignCashBookPermissionDto dto)
    {
        var result = await _billingService.AssignCashBookPermissionAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa quyền sổ
    /// </summary>
    [HttpDelete("cash-books/{cashBookId}/permissions/{userId}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<bool>> RemoveCashBookPermission(Guid cashBookId, Guid userId)
    {
        var result = await _billingService.RemoveCashBookPermissionAsync(cashBookId, userId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách người dùng được phân quyền sổ
    /// </summary>
    [HttpGet("cash-books/{id}/users")]
    public async Task<ActionResult<List<CashBookUserDto>>> GetCashBookUsers(Guid id)
    {
        var result = await _billingService.GetCashBookUsersAsync(id);
        return Ok(result);
    }

    #endregion

    #region 10.1.2 Tìm kiếm bệnh nhân

    /// <summary>
    /// Tìm kiếm bệnh nhân theo mã/tên/thẻ BHYT
    /// </summary>
    [HttpGet("patients/search")]
    public async Task<ActionResult<PagedResultDto<PatientBillingStatusDto>>> SearchPatients([FromQuery] PatientStatusSearchDto dto)
    {
        var result = await _billingService.SearchPatientsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy trạng thái thanh toán của bệnh nhân
    /// </summary>
    [HttpGet("patients/{medicalRecordId}/billing-status")]
    public async Task<ActionResult<PatientBillingStatusDto>> GetPatientBillingStatus(Guid medicalRecordId)
    {
        var result = await _billingService.GetPatientBillingStatusAsync(medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra thông tuyến thẻ BHYT
    /// </summary>
    [HttpPost("insurance/check")]
    public async Task<ActionResult<InsuranceCheckDto>> CheckInsuranceCard([FromBody] InsuranceCheckRequestDto dto)
    {
        var result = await _billingService.CheckInsuranceCardAsync(dto);
        return Ok(result);
    }

    #endregion

    #region 10.1.3 Tạm ứng

    /// <summary>
    /// Tạo phiếu tạm ứng
    /// </summary>
    [HttpPost("deposits")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier + "," + RoleNames.Nurse)]
    public async Task<ActionResult<DepositDto>> CreateDeposit([FromBody] CreateDepositDto dto)
    {
        var result = await _billingService.CreateDepositAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu thu tạm ứng từ khoa lâm sàng
    /// </summary>
    [HttpPost("deposits/department")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<DepartmentDepositDto>> CreateDepartmentDeposit([FromBody] CreateDepartmentDepositRequest request)
    {
        var result = await _billingService.CreateDepartmentDepositAsync(request.DepartmentId, request.DepositIds, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận phiếu tạm ứng từ khoa
    /// </summary>
    [HttpPost("deposits/department/{id}/receive")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<DepartmentDepositDto>> ReceiveDepartmentDeposit(Guid id)
    {
        var result = await _billingService.ReceiveDepartmentDepositAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy số dư tạm ứng của bệnh nhân
    /// </summary>
    [HttpGet("deposits/balance/{patientId}")]
    public async Task<ActionResult<DepositBalanceDto>> GetDepositBalance(Guid patientId)
    {
        var result = await _billingService.GetDepositBalanceAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Sử dụng tiền tạm ứng để thanh toán
    /// </summary>
    [HttpPost("deposits/use-for-payment")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<PaymentDto>> UseDepositForPayment([FromBody] UseDepositForPaymentDto dto)
    {
        var result = await _billingService.UseDepositForPaymentAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu tạm ứng của bệnh nhân
    /// </summary>
    [HttpGet("deposits/patient/{patientId}")]
    public async Task<ActionResult<List<DepositDto>>> GetPatientDeposits(Guid patientId, [FromQuery] int? status)
    {
        var result = await _billingService.GetPatientDepositsAsync(patientId, status);
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu tạm ứng
    /// </summary>
    [HttpPost("deposits/{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<bool>> CancelDeposit(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelDepositAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 10.1.4 Thu tiền

    /// <summary>
    /// Tạo phiếu thu tiền
    /// </summary>
    [HttpPost("payments")]
    [Authorize]
    public async Task<ActionResult<PaymentDto>> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        var result = await _billingService.CreatePaymentAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu thu tiền
    /// </summary>
    [HttpPost("payments/{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<bool>> CancelPayment(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelPaymentAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử thanh toán của bệnh nhân
    /// </summary>
    [HttpGet("payments/history/{patientId}")]
    public async Task<ActionResult<PaymentHistoryDto>> GetPaymentHistory(Guid patientId)
    {
        var result = await _billingService.GetPaymentHistoryAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trạng thái thanh toán của hồ sơ
    /// </summary>
    [HttpGet("payments/status/{medicalRecordId}")]
    public async Task<ActionResult<PaymentStatusDto>> CheckPaymentStatus(Guid medicalRecordId)
    {
        var result = await _billingService.CheckPaymentStatusAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 10.1.5 Hoàn ứng

    /// <summary>
    /// Tạo phiếu hoàn ứng
    /// </summary>
    [HttpPost("refunds")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<RefundDto>> CreateRefund([FromBody] CreateRefundDto dto)
    {
        var result = await _billingService.CreateRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Phê duyệt phiếu hoàn ứng
    /// </summary>
    [HttpPost("refunds/approve")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<RefundDto>> ApproveRefund([FromBody] ApproveRefundDto dto)
    {
        var result = await _billingService.ApproveRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xác nhận đã hoàn tiền
    /// </summary>
    [HttpPost("refunds/confirm")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<RefundDto>> ConfirmRefund([FromBody] ConfirmRefundDto dto)
    {
        var result = await _billingService.ConfirmRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm phiếu hoàn ứng
    /// </summary>
    [HttpGet("refunds/search")]
    [HttpGet("refunds")]
    public async Task<ActionResult<PagedResultDto<RefundDto>>> SearchRefunds([FromQuery] RefundSearchDto dto)
    {
        var result = await _billingService.SearchRefundsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu hoàn ứng
    /// </summary>
    [HttpPost("refunds/{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Cashier)]
    public async Task<ActionResult<bool>> CancelRefund(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelRefundAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    #endregion
}

#region Request DTOs




#endregion
