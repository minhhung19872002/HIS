using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;

namespace HIS.Application.Services;

/// <summary>
/// Service Interface đầy đủ cho Phân hệ 10: Thu ngân
/// Bổ sung các chức năng còn thiếu từ IBillingService
/// </summary>
public interface IBillingCompleteService
{
    #region 10.1.1 Quản lý sổ thu

    /// <summary>
    /// Tạo sổ thu tiền
    /// </summary>
    Task<CashBookDto> CreateCashBookAsync(CreateCashBookDto dto, Guid userId);

    /// <summary>
    /// Tạo sổ tạm ứng
    /// </summary>
    Task<CashBookDto> CreateDepositBookAsync(CreateCashBookDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách sổ thu
    /// </summary>
    Task<List<CashBookDto>> GetCashBooksAsync(int? bookType, Guid? departmentId);

    /// <summary>
    /// Lấy chi tiết sổ thu
    /// </summary>
    Task<CashBookDto?> GetCashBookByIdAsync(Guid id);

    /// <summary>
    /// Khóa sổ thu
    /// </summary>
    Task<CashBookDto> LockCashBookAsync(Guid cashBookId, Guid userId);

    /// <summary>
    /// Mở khóa sổ thu (quyền Admin)
    /// </summary>
    Task<CashBookDto> UnlockCashBookAsync(Guid cashBookId, Guid userId);

    /// <summary>
    /// Phân quyền sổ cho người dùng
    /// </summary>
    Task<bool> AssignCashBookPermissionAsync(AssignCashBookPermissionDto dto, Guid userId);

    /// <summary>
    /// Xóa quyền sổ của người dùng
    /// </summary>
    Task<bool> RemoveCashBookPermissionAsync(Guid cashBookId, Guid targetUserId, Guid userId);

    /// <summary>
    /// Lấy danh sách người dùng được phân quyền sổ
    /// </summary>
    Task<List<CashBookUserDto>> GetCashBookUsersAsync(Guid cashBookId);

    #endregion

    #region 10.1.2 Giao dịch - Tìm kiếm bệnh nhân

    /// <summary>
    /// Tìm kiếm bệnh nhân theo mã/tên/thẻ BHYT
    /// </summary>
    Task<PagedResultDto<PatientBillingStatusDto>> SearchPatientsAsync(PatientStatusSearchDto dto);

    /// <summary>
    /// Lấy trạng thái thanh toán của bệnh nhân
    /// </summary>
    Task<PatientBillingStatusDto> GetPatientBillingStatusAsync(Guid medicalRecordId);

    /// <summary>
    /// Kiểm tra thông tuyến thẻ BHYT
    /// </summary>
    Task<InsuranceCheckDto> CheckInsuranceCardAsync(InsuranceCheckRequestDto dto);

    #endregion

    #region 10.1.3 Tạm ứng

    /// <summary>
    /// Tạo phiếu tạm ứng tiền cho người bệnh
    /// </summary>
    Task<DepositDto> CreateDepositAsync(CreateDepositDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu thu tạm ứng tiền từ khoa lâm sàng
    /// </summary>
    Task<DepartmentDepositDto> CreateDepartmentDepositAsync(Guid departmentId, List<Guid> depositIds, Guid userId);

    /// <summary>
    /// Tiếp nhận phiếu tạm ứng từ khoa
    /// </summary>
    Task<DepartmentDepositDto> ReceiveDepartmentDepositAsync(Guid departmentDepositId, Guid userId);

    /// <summary>
    /// Lấy số dư tạm ứng của bệnh nhân
    /// </summary>
    Task<DepositBalanceDto> GetDepositBalanceAsync(Guid patientId);

    /// <summary>
    /// Sử dụng tiền tạm ứng để thanh toán
    /// </summary>
    Task<PaymentDto> UseDepositForPaymentAsync(UseDepositForPaymentDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách phiếu tạm ứng của bệnh nhân
    /// </summary>
    Task<List<DepositDto>> GetPatientDepositsAsync(Guid patientId, int? status);

    /// <summary>
    /// Hủy phiếu tạm ứng
    /// </summary>
    Task<bool> CancelDepositAsync(Guid depositId, string reason, Guid userId);

    #endregion

    #region 10.1.4 Thu tiền

    /// <summary>
    /// Tạo phiếu thu tiền cho người bệnh
    /// </summary>
    Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto, Guid userId);

    /// <summary>
    /// Hủy phiếu thu tiền
    /// </summary>
    Task<bool> CancelPaymentAsync(Guid paymentId, string reason, Guid userId);

    /// <summary>
    /// Lấy lịch sử thanh toán của bệnh nhân
    /// </summary>
    Task<PaymentHistoryDto> GetPaymentHistoryAsync(Guid patientId);

    /// <summary>
    /// Kiểm tra trạng thái thanh toán của hồ sơ
    /// </summary>
    Task<PaymentStatusDto> CheckPaymentStatusAsync(Guid medicalRecordId);

    #endregion

    #region 10.1.5 Hoàn ứng

    /// <summary>
    /// Tạo phiếu hoàn ứng cho người bệnh
    /// </summary>
    Task<RefundDto> CreateRefundAsync(CreateRefundDto dto, Guid userId);

    /// <summary>
    /// Phê duyệt phiếu hoàn ứng
    /// </summary>
    Task<RefundDto> ApproveRefundAsync(ApproveRefundDto dto, Guid userId);

    /// <summary>
    /// Xác nhận đã hoàn tiền
    /// </summary>
    Task<RefundDto> ConfirmRefundAsync(ConfirmRefundDto dto, Guid userId);

    /// <summary>
    /// Tìm kiếm phiếu hoàn ứng
    /// </summary>
    Task<PagedResultDto<RefundDto>> SearchRefundsAsync(RefundSearchDto dto);

    /// <summary>
    /// Hủy phiếu hoàn ứng
    /// </summary>
    Task<bool> CancelRefundAsync(Guid refundId, string reason, Guid userId);

    #endregion

    #region 10.1.6 Tạm khóa hồ sơ

    /// <summary>
    /// Tạm khóa hồ sơ bệnh án
    /// </summary>
    Task<RecordLockDto> LockMedicalRecordAsync(LockRecordDto dto, Guid userId);

    /// <summary>
    /// Mở khóa hồ sơ bệnh án
    /// </summary>
    Task<RecordLockDto> UnlockMedicalRecordAsync(Guid medicalRecordId, Guid userId);

    /// <summary>
    /// Lấy trạng thái khóa của hồ sơ
    /// </summary>
    Task<RecordLockDto> GetRecordLockStatusAsync(Guid medicalRecordId);

    #endregion

    #region 10.1.7 Duyệt kế toán

    /// <summary>
    /// Duyệt kế toán cho hóa đơn
    /// </summary>
    Task<List<AccountingApprovalDto>> ApproveAccountingAsync(ApproveAccountingDto dto, Guid userId);

    /// <summary>
    /// Lấy danh sách hóa đơn chờ duyệt kế toán
    /// </summary>
    Task<PagedResultDto<AccountingApprovalDto>> GetPendingApprovalsAsync(PendingApprovalSearchDto dto);

    /// <summary>
    /// Lấy chi tiết duyệt kế toán của hóa đơn
    /// </summary>
    Task<AccountingApprovalDto?> GetApprovalDetailAsync(Guid invoiceId);

    #endregion

    #region 10.1.8 Miễn giảm

    /// <summary>
    /// Áp dụng miễn giảm theo hóa đơn
    /// </summary>
    Task<InvoiceDto> ApplyInvoiceDiscountAsync(ApplyDiscountDto dto, Guid userId);

    /// <summary>
    /// Áp dụng miễn giảm theo từng dịch vụ
    /// </summary>
    Task<InvoiceDto> ApplyServiceDiscountAsync(ApplyDiscountDto dto, Guid userId);

    /// <summary>
    /// Lấy lịch sử miễn giảm của hóa đơn
    /// </summary>
    Task<List<DiscountHistoryDto>> GetDiscountHistoryAsync(Guid invoiceId);

    /// <summary>
    /// Hủy miễn giảm
    /// </summary>
    Task<bool> CancelDiscountAsync(Guid discountId, string reason, Guid userId);

    #endregion

    #region 10.1.9 Hóa đơn

    /// <summary>
    /// Tính toán hóa đơn cho bệnh nhân
    /// </summary>
    Task<InvoiceDto> CalculateInvoiceAsync(Guid medicalRecordId);

    /// <summary>
    /// Tạo hoặc cập nhật hóa đơn
    /// </summary>
    Task<InvoiceDto> CreateOrUpdateInvoiceAsync(CreateInvoiceDto dto, Guid userId);

    /// <summary>
    /// Lấy hóa đơn theo ID
    /// </summary>
    Task<InvoiceDto?> GetInvoiceByIdAsync(Guid invoiceId);

    /// <summary>
    /// Lấy hóa đơn của bệnh nhân theo hồ sơ
    /// </summary>
    Task<InvoiceDto?> GetPatientInvoiceAsync(Guid medicalRecordId);

    /// <summary>
    /// Tìm kiếm hóa đơn
    /// </summary>
    Task<PagedResultDto<InvoiceDto>> SearchInvoicesAsync(InvoiceSearchDto dto);

    /// <summary>
    /// Lấy danh sách dịch vụ chưa thanh toán
    /// </summary>
    Task<List<UnpaidServiceItemDto>> GetUnpaidServicesAsync(Guid patientId);

    /// <summary>
    /// Lấy danh sách thuốc chưa thanh toán
    /// </summary>
    Task<List<UnpaidMedicineItemDto>> GetUnpaidMedicinesAsync(Guid patientId);

    #endregion

    #region 10.2 In ấn, báo cáo

    /// <summary>
    /// In bảng kê thanh toán theo mẫu 6556
    /// </summary>
    Task<byte[]> Print6556StatementAsync(Print6556RequestDto dto);

    /// <summary>
    /// In bảng kê thanh toán tách theo đối tượng
    /// </summary>
    Task<byte[]> Print6556ByObjectAsync(Print6556RequestDto dto);

    /// <summary>
    /// In bảng kê thanh toán theo khoa
    /// </summary>
    Task<byte[]> Print6556ByDepartmentAsync(Print6556RequestDto dto);

    /// <summary>
    /// In phiếu tạm ứng theo dịch vụ
    /// </summary>
    Task<byte[]> PrintDepositByServiceAsync(PrintByServiceRequestDto dto);

    /// <summary>
    /// In phiếu thu tạm ứng
    /// </summary>
    Task<byte[]> PrintDepositReceiptAsync(Guid depositId);

    /// <summary>
    /// In biên lai thu tiền
    /// </summary>
    Task<byte[]> PrintPaymentReceiptAsync(Guid paymentId);

    /// <summary>
    /// In hóa đơn
    /// </summary>
    Task<byte[]> PrintInvoiceAsync(Guid invoiceId);

    /// <summary>
    /// In phiếu thu hoàn ứng
    /// </summary>
    Task<byte[]> PrintRefundReceiptAsync(Guid refundId);

    #endregion

    #region 10.2.1 Hóa đơn điện tử

    /// <summary>
    /// Phát hành hóa đơn điện tử
    /// </summary>
    Task<ElectronicInvoiceDto> IssueElectronicInvoiceAsync(IssueEInvoiceDto dto, Guid userId);

    /// <summary>
    /// Hủy hóa đơn điện tử
    /// </summary>
    Task<bool> CancelElectronicInvoiceAsync(Guid eInvoiceId, string reason, Guid userId);

    /// <summary>
    /// Lấy danh sách hóa đơn điện tử
    /// </summary>
    Task<List<ElectronicInvoiceDto>> GetElectronicInvoicesAsync(Guid? invoiceId, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Gửi lại hóa đơn điện tử qua email
    /// </summary>
    Task<bool> ResendElectronicInvoiceAsync(Guid eInvoiceId, string email);

    #endregion

    #region 10.3 Quản lý thu ngân

    /// <summary>
    /// Lấy báo cáo thu ngân theo ngày
    /// </summary>
    Task<CashierReportDto> GetCashierReportAsync(CashierReportRequestDto dto);

    /// <summary>
    /// Đóng sổ thu ngân
    /// </summary>
    Task<CashierReportDto> CloseCashBookAsync(CloseCashBookDto dto, Guid userId);

    /// <summary>
    /// Báo cáo thu tiền ngoại trú
    /// </summary>
    Task<OutpatientRevenueReportDto> GetOutpatientRevenueReportAsync(RevenueReportRequestDto dto);

    /// <summary>
    /// Báo cáo thu tiền nội trú
    /// </summary>
    Task<InpatientRevenueReportDto> GetInpatientRevenueReportAsync(RevenueReportRequestDto dto);

    /// <summary>
    /// Báo cáo thu tiền tạm ứng
    /// </summary>
    Task<DepositRevenueReportDto> GetDepositRevenueReportAsync(RevenueReportRequestDto dto);

    /// <summary>
    /// Báo cáo sử dụng sổ thu chi
    /// </summary>
    Task<CashBookUsageReportDto> GetCashBookUsageReportAsync(Guid cashBookId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// In báo cáo thu tiền ngoại trú
    /// </summary>
    Task<byte[]> PrintOutpatientRevenueReportAsync(RevenueReportRequestDto dto);

    /// <summary>
    /// In báo cáo thu tiền nội trú
    /// </summary>
    Task<byte[]> PrintInpatientRevenueReportAsync(RevenueReportRequestDto dto);

    /// <summary>
    /// In báo cáo thu tiền tạm ứng
    /// </summary>
    Task<byte[]> PrintDepositRevenueReportAsync(RevenueReportRequestDto dto);

    #endregion

    #region 10.4 Thống kê & BHYT

    /// <summary>
    /// Thống kê viện phí tổng hợp
    /// </summary>
    Task<BillingStatisticsDto> GetBillingStatisticsAsync(BillingStatisticsRequestDto dto);

    /// <summary>
    /// Báo cáo doanh thu theo ngày
    /// </summary>
    Task<DailyRevenueReportDto> GetDailyRevenueAsync(DateTime date);

    /// <summary>
    /// Báo cáo doanh thu theo khoa/phòng
    /// </summary>
    Task<List<DepartmentRevenueDto>> GetRevenueByDepartmentAsync(DepartmentRevenueRequestDto dto);

    /// <summary>
    /// Thống kê công nợ
    /// </summary>
    Task<DebtStatisticsDto> GetDebtStatisticsAsync(DateTime? asOfDate);

    /// <summary>
    /// Tạo dữ liệu giám định BHYT
    /// </summary>
    Task<InsuranceClaimDto> GenerateInsuranceClaimAsync(Guid medicalRecordId);

    /// <summary>
    /// Tạo file XML 4210
    /// </summary>
    Task<Xml4210ResultDto> GenerateXml4210Async(GenerateXml4210RequestDto dto);

    /// <summary>
    /// Thống kê giám định BHYT
    /// </summary>
    Task<InsuranceClaimStatisticsDto> GetInsuranceClaimStatisticsAsync(DateTime fromDate, DateTime toDate);

    #endregion
}

/// <summary>
/// DTO cho sử dụng tạm ứng thanh toán
/// </summary>
public class UseDepositForPaymentDto
{
    public Guid InvoiceId { get; set; }
    public Guid DepositId { get; set; }
    public decimal Amount { get; set; }
}
