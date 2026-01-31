using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 10: Thu ngân
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BillingCompleteController : ControllerBase
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
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<CashBookDto>> CreateCashBook([FromBody] CreateCashBookDto dto)
    {
        var result = await _billingService.CreateCashBookAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo sổ tạm ứng
    /// </summary>
    [HttpPost("deposit-books")]
    [Authorize(Roles = "Admin,Accountant")]
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
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<CashBookDto>> LockCashBook(Guid id)
    {
        var result = await _billingService.LockCashBookAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa sổ thu
    /// </summary>
    [HttpPost("cash-books/{id}/unlock")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CashBookDto>> UnlockCashBook(Guid id)
    {
        var result = await _billingService.UnlockCashBookAsync(id, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Phân quyền sổ
    /// </summary>
    [HttpPost("cash-books/permissions")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<bool>> AssignCashBookPermission([FromBody] AssignCashBookPermissionDto dto)
    {
        var result = await _billingService.AssignCashBookPermissionAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa quyền sổ
    /// </summary>
    [HttpDelete("cash-books/{cashBookId}/permissions/{userId}")]
    [Authorize(Roles = "Admin,Accountant")]
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
    [Authorize(Roles = "Admin,Cashier,Nurse")]
    public async Task<ActionResult<DepositDto>> CreateDeposit([FromBody] CreateDepositDto dto)
    {
        var result = await _billingService.CreateDepositAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu thu tạm ứng từ khoa lâm sàng
    /// </summary>
    [HttpPost("deposits/department")]
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<DepartmentDepositDto>> CreateDepartmentDeposit([FromBody] CreateDepartmentDepositRequest request)
    {
        var result = await _billingService.CreateDepartmentDepositAsync(request.DepartmentId, request.DepositIds, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận phiếu tạm ứng từ khoa
    /// </summary>
    [HttpPost("deposits/department/{id}/receive")]
    [Authorize(Roles = "Admin,Cashier")]
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
    [Authorize(Roles = "Admin,Cashier")]
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
    [Authorize(Roles = "Admin,Cashier")]
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
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<PaymentDto>> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        var result = await _billingService.CreatePaymentAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu thu tiền
    /// </summary>
    [HttpPost("payments/{id}/cancel")]
    [Authorize(Roles = "Admin,Cashier")]
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
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<RefundDto>> CreateRefund([FromBody] CreateRefundDto dto)
    {
        var result = await _billingService.CreateRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Phê duyệt phiếu hoàn ứng
    /// </summary>
    [HttpPost("refunds/approve")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<RefundDto>> ApproveRefund([FromBody] ApproveRefundDto dto)
    {
        var result = await _billingService.ApproveRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xác nhận đã hoàn tiền
    /// </summary>
    [HttpPost("refunds/confirm")]
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<RefundDto>> ConfirmRefund([FromBody] ConfirmRefundDto dto)
    {
        var result = await _billingService.ConfirmRefundAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm phiếu hoàn ứng
    /// </summary>
    [HttpGet("refunds/search")]
    public async Task<ActionResult<PagedResultDto<RefundDto>>> SearchRefunds([FromQuery] RefundSearchDto dto)
    {
        var result = await _billingService.SearchRefundsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu hoàn ứng
    /// </summary>
    [HttpPost("refunds/{id}/cancel")]
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<bool>> CancelRefund(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelRefundAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 10.1.6 Tạm khóa hồ sơ

    /// <summary>
    /// Tạm khóa hồ sơ bệnh án
    /// </summary>
    [HttpPost("records/lock")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<RecordLockDto>> LockMedicalRecord([FromBody] LockRecordDto dto)
    {
        var result = await _billingService.LockMedicalRecordAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa hồ sơ bệnh án
    /// </summary>
    [HttpPost("records/{medicalRecordId}/unlock")]
    [Authorize(Roles = "Admin")]
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

    #endregion

    #region 10.1.7 Duyệt kế toán

    /// <summary>
    /// Duyệt kế toán cho hóa đơn
    /// </summary>
    [HttpPost("accounting/approve")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<List<AccountingApprovalDto>>> ApproveAccounting([FromBody] ApproveAccountingDto dto)
    {
        var result = await _billingService.ApproveAccountingAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hóa đơn chờ duyệt kế toán
    /// </summary>
    [HttpGet("accounting/pending")]
    [Authorize(Roles = "Admin,Accountant")]
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

    #endregion

    #region 10.1.8 Miễn giảm

    /// <summary>
    /// Áp dụng miễn giảm theo hóa đơn
    /// </summary>
    [HttpPost("discounts/invoice")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<InvoiceDto>> ApplyInvoiceDiscount([FromBody] ApplyDiscountDto dto)
    {
        var result = await _billingService.ApplyInvoiceDiscountAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Áp dụng miễn giảm theo từng dịch vụ
    /// </summary>
    [HttpPost("discounts/services")]
    [Authorize(Roles = "Admin,Accountant")]
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
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<bool>> CancelDiscount(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelDiscountAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 10.1.9 Hóa đơn

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
    [Authorize(Roles = "Admin,Cashier")]
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

    #endregion

    #region 10.2 In ấn

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

    #endregion

    #region 10.2.1 Hóa đơn điện tử

    /// <summary>
    /// Phát hành hóa đơn điện tử
    /// </summary>
    [HttpPost("e-invoices")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<ElectronicInvoiceDto>> IssueElectronicInvoice([FromBody] IssueEInvoiceDto dto)
    {
        var result = await _billingService.IssueElectronicInvoiceAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy hóa đơn điện tử
    /// </summary>
    [HttpPost("e-invoices/{id}/cancel")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<bool>> CancelElectronicInvoice(Guid id, [FromBody] BillingCancelRequest request)
    {
        var result = await _billingService.CancelElectronicInvoiceAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hóa đơn điện tử
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
    /// Gửi lại hóa đơn điện tử qua email
    /// </summary>
    [HttpPost("e-invoices/{id}/resend")]
    public async Task<ActionResult<bool>> ResendElectronicInvoice(Guid id, [FromBody] ResendEmailRequest request)
    {
        var result = await _billingService.ResendElectronicInvoiceAsync(id, request.Email);
        return Ok(result);
    }

    #endregion

    #region 10.3 Quản lý thu ngân

    /// <summary>
    /// Lấy báo cáo thu ngân theo ngày
    /// </summary>
    [HttpGet("reports/cashier")]
    [Authorize(Roles = "Admin,Cashier,Accountant")]
    public async Task<ActionResult<CashierReportDto>> GetCashierReport([FromQuery] CashierReportRequestDto dto)
    {
        var result = await _billingService.GetCashierReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Đóng sổ thu ngân
    /// </summary>
    [HttpPost("cash-books/close")]
    [Authorize(Roles = "Admin,Cashier")]
    public async Task<ActionResult<CashierReportDto>> CloseCashBook([FromBody] CloseCashBookDto dto)
    {
        var result = await _billingService.CloseCashBookAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền ngoại trú
    /// </summary>
    [HttpGet("reports/outpatient-revenue")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<OutpatientRevenueReportDto>> GetOutpatientRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetOutpatientRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền nội trú
    /// </summary>
    [HttpGet("reports/inpatient-revenue")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<InpatientRevenueReportDto>> GetInpatientRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetInpatientRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thu tiền tạm ứng
    /// </summary>
    [HttpGet("reports/deposit-revenue")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<DepositRevenueReportDto>> GetDepositRevenueReport([FromQuery] RevenueReportRequestDto dto)
    {
        var result = await _billingService.GetDepositRevenueReportAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo sử dụng sổ thu chi
    /// </summary>
    [HttpGet("reports/cash-book-usage/{cashBookId}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<CashBookUsageReportDto>> GetCashBookUsageReport(
        Guid cashBookId,
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _billingService.GetCashBookUsageReportAsync(cashBookId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In báo cáo thu tiền ngoại trú
    /// </summary>
    [HttpPost("reports/outpatient-revenue/print")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> PrintOutpatientRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintOutpatientRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_thutien_ngoaitru.pdf");
    }

    /// <summary>
    /// In báo cáo thu tiền nội trú
    /// </summary>
    [HttpPost("reports/inpatient-revenue/print")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> PrintInpatientRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintInpatientRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_thutien_noitru.pdf");
    }

    /// <summary>
    /// In báo cáo thu tiền tạm ứng
    /// </summary>
    [HttpPost("reports/deposit-revenue/print")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> PrintDepositRevenueReport([FromBody] RevenueReportRequestDto dto)
    {
        var result = await _billingService.PrintDepositRevenueReportAsync(dto);
        return File(result, "application/pdf", "baocao_tamung.pdf");
    }

    #endregion

    #region 10.4 Thống kê & BHYT

    /// <summary>
    /// Thống kê viện phí tổng hợp
    /// </summary>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<BillingStatisticsDto>> GetBillingStatistics([FromQuery] BillingStatisticsRequestDto dto)
    {
        var result = await _billingService.GetBillingStatisticsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo doanh thu theo ngày
    /// </summary>
    [HttpGet("statistics/daily/{date}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<DailyRevenueReportDto>> GetDailyRevenue(DateTime date)
    {
        var result = await _billingService.GetDailyRevenueAsync(date);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo doanh thu theo khoa/phòng
    /// </summary>
    [HttpGet("statistics/by-department")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<List<DepartmentRevenueDto>>> GetRevenueByDepartment([FromQuery] DepartmentRevenueRequestDto dto)
    {
        var result = await _billingService.GetRevenueByDepartmentAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê công nợ
    /// </summary>
    [HttpGet("statistics/debt")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<DebtStatisticsDto>> GetDebtStatistics([FromQuery] DateTime? asOfDate)
    {
        var result = await _billingService.GetDebtStatisticsAsync(asOfDate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu giám định BHYT
    /// </summary>
    [HttpPost("insurance-claims/{medicalRecordId}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<InsuranceClaimDto>> GenerateInsuranceClaim(Guid medicalRecordId)
    {
        var result = await _billingService.GenerateInsuranceClaimAsync(medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo file XML 4210
    /// </summary>
    [HttpPost("insurance-claims/xml-4210")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<Xml4210ResultDto>> GenerateXml4210([FromBody] GenerateXml4210RequestDto dto)
    {
        var result = await _billingService.GenerateXml4210Async(dto);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê giám định BHYT
    /// </summary>
    [HttpGet("insurance-claims/statistics")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<InsuranceClaimStatisticsDto>> GetInsuranceClaimStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _billingService.GetInsuranceClaimStatisticsAsync(fromDate, toDate);
        return Ok(result);
    }

    #endregion
}

#region Request DTOs

public class CreateDepartmentDepositRequest
{
    public Guid DepartmentId { get; set; }
    public List<Guid> DepositIds { get; set; } = new();
}

public class BillingCancelRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class ResendEmailRequest
{
    public string Email { get; set; } = string.Empty;
}

#endregion
