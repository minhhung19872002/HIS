using HIS.Application.DTOs;

namespace HIS.Application.DTOs.Billing;

#region Cashbook Management - Quản lý sổ thu

/// <summary>
/// DTO cho sổ thu ngân
/// </summary>
public class CashBookDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    // Loại sổ: 1-Sổ thu tiền, 2-Sổ tạm ứng, 3-Sổ hoàn ứng
    public int BookType { get; set; }
    public string BookTypeName { get; set; } = string.Empty;

    // Khoa/phòng quản lý
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Quầy thu ngân
    public Guid? CashierStationId { get; set; }
    public string? CashierStationName { get; set; }

    // Dải số phiếu
    public string? ReceiptPrefix { get; set; }
    public int CurrentNumber { get; set; }
    public int? MaxNumber { get; set; }

    // Số dư
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }

    // Trạng thái: 1-Mở, 2-Tạm khóa, 3-Đã đóng
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Người được phân quyền
    public List<CashBookUserDto> AuthorizedUsers { get; set; } = new();

    // Audit
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
}

/// <summary>
/// DTO cho người dùng được phân quyền sổ
/// </summary>
public class CashBookUserDto
{
    public Guid UserId { get; set; }
    public string UserCode { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;

    // Quyền: 1-Xem, 2-Thu, 3-Thu+Hoàn, 4-Quản lý
    public int Permission { get; set; }
    public string PermissionName { get; set; } = string.Empty;

    public DateTime AssignedAt { get; set; }
    public string? AssignedBy { get; set; }
}

/// <summary>
/// DTO cho tạo sổ thu
/// </summary>
public class CreateCashBookDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int BookType { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? CashierStationId { get; set; }
    public string? ReceiptPrefix { get; set; }
    public int StartNumber { get; set; } = 1;
    public int? MaxNumber { get; set; }
    public decimal OpeningBalance { get; set; }
}

/// <summary>
/// DTO cho phân quyền sổ
/// </summary>
public class AssignCashBookPermissionDto
{
    public Guid CashBookId { get; set; }
    public Guid UserId { get; set; }
    public int Permission { get; set; }
}

#endregion

#region Deposit Management - Quản lý tạm ứng

/// <summary>
/// DTO cho phiếu tạm ứng
/// </summary>
public class DepositDto
{
    public Guid Id { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    // Thông tin hồ sơ
    public Guid? MedicalRecordId { get; set; }
    public string? MedicalRecordCode { get; set; }

    // Loại tạm ứng: 1-Ngoại trú, 2-Nội trú, 3-Từ khoa LS
    public int DepositType { get; set; }
    public string DepositTypeName { get; set; } = string.Empty;

    // Nguồn tạm ứng: 1-Thu ngân, 2-Khoa lâm sàng
    public int DepositSource { get; set; }
    public string DepositSourceName { get; set; } = string.Empty;

    // Khoa/phòng (nếu thu từ khoa)
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Số tiền
    public decimal Amount { get; set; }
    public decimal UsedAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    // Phương thức thanh toán
    public int PaymentMethod { get; set; }
    public string PaymentMethodName { get; set; } = string.Empty;
    public string? TransactionNumber { get; set; }
    public string? BankName { get; set; }

    // Thu ngân
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;

    // Sổ tạm ứng
    public Guid? DepositBookId { get; set; }
    public string? DepositBookCode { get; set; }

    // Trạng thái: 1-Chờ xác nhận, 2-Đã xác nhận, 3-Đã sử dụng hết, 4-Đã hoàn trả, 5-Đã hủy
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Ghi chú
    public string? Notes { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public Guid? ConfirmedBy { get; set; }
}

/// <summary>
/// DTO cho tạo phiếu tạm ứng
/// </summary>
public class CreateDepositDto
{
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public int DepositType { get; set; }
    public int DepositSource { get; set; }
    public Guid? DepartmentId { get; set; }
    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; }
    public string? TransactionNumber { get; set; }
    public string? BankName { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho phiếu thu tạm ứng từ khoa lâm sàng
/// </summary>
public class DepartmentDepositDto
{
    public Guid Id { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;

    // Khoa/phòng
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;

    // Người nộp
    public Guid SubmittedBy { get; set; }
    public string SubmittedByName { get; set; } = string.Empty;

    // Danh sách phiếu tạm ứng
    public List<DepositDto> Deposits { get; set; } = new();
    public decimal TotalAmount { get; set; }

    // Phương thức
    public int PaymentMethod { get; set; }

    // Thu ngân tiếp nhận
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;

    // Trạng thái
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
}

/// <summary>
/// DTO cho số dư tạm ứng
/// </summary>
public class DepositBalanceDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public decimal TotalDeposit { get; set; }
    public decimal UsedAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public List<DepositDto> ActiveDeposits { get; set; } = new();
}

#endregion

#region Invoice Management - Quản lý hóa đơn

/// <summary>
/// DTO cho hóa đơn
/// </summary>
public class InvoiceDto
{
    public Guid Id { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // Thông tin BHYT
    public string? InsuranceCardNumber { get; set; }
    public string? InsuranceCardPlace { get; set; }
    public decimal? InsuranceRate { get; set; }

    // Thông tin hồ sơ
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public int PatientType { get; set; } // 1-Ngoại trú, 2-Nội trú
    public string PatientTypeName { get; set; } = string.Empty;

    // Khoa/phòng
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Chi tiết dịch vụ
    public List<InvoiceServiceItemDto> ServiceItems { get; set; } = new();
    public List<InvoiceMedicineItemDto> MedicineItems { get; set; } = new();
    public List<InvoiceSupplyItemDto> SupplyItems { get; set; } = new();
    public List<InvoiceBedItemDto> BedItems { get; set; } = new();

    // Tổng tiền
    public decimal ServiceTotal { get; set; }
    public decimal MedicineTotal { get; set; }
    public decimal SupplyTotal { get; set; }
    public decimal BedTotal { get; set; }
    public decimal SubTotal { get; set; }

    // BHYT chi trả
    public decimal InsuranceAmount { get; set; }

    // Miễn giảm
    public decimal DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }
    public int? DiscountType { get; set; } // 1-Theo %, 2-Theo số tiền
    public decimal? DiscountPercent { get; set; }

    // Phụ thu
    public decimal SurchargeAmount { get; set; }

    // Tổng thanh toán
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    // Trạng thái thanh toán: 0-Chưa TT, 1-Một phần, 2-Đã TT, 3-Đã hủy
    public int PaymentStatus { get; set; }
    public string PaymentStatusName { get; set; } = string.Empty;

    // Trạng thái duyệt: 0-Chưa duyệt, 1-Đã duyệt KT, 2-Tạm khóa
    public int ApprovalStatus { get; set; }
    public string ApprovalStatusName { get; set; } = string.Empty;

    // Duyệt kế toán
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }

    // Khóa hồ sơ
    public bool IsLocked { get; set; }
    public DateTime? LockedAt { get; set; }
    public Guid? LockedBy { get; set; }
    public string? LockReason { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO cho dịch vụ trong hóa đơn
/// </summary>
public class InvoiceServiceItemDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? ServiceGroup { get; set; }

    // Khoa thực hiện
    public Guid? ExecuteDepartmentId { get; set; }
    public string? ExecuteDepartmentName { get; set; }

    // Số lượng và đơn giá
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    // BHYT
    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Miễn giảm riêng
    public decimal DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }

    // Đối tượng thanh toán: 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public int PaymentObject { get; set; }
    public string PaymentObjectName { get; set; } = string.Empty;

    // Trạng thái: 1-Chờ TT, 2-Đã TT
    public int Status { get; set; }

    public DateTime? ExecutedAt { get; set; }
}

/// <summary>
/// DTO cho thuốc trong hóa đơn
/// </summary>
public class InvoiceMedicineItemDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Dosage { get; set; }
    public string Unit { get; set; } = string.Empty;

    // Số lượng và đơn giá
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    // BHYT
    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Đối tượng thanh toán
    public int PaymentObject { get; set; }
    public string PaymentObjectName { get; set; } = string.Empty;

    public int Status { get; set; }
}

/// <summary>
/// DTO cho vật tư trong hóa đơn
/// </summary>
public class InvoiceSupplyItemDto
{
    public Guid Id { get; set; }
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int PaymentObject { get; set; }
    public int Status { get; set; }
}

/// <summary>
/// DTO cho giường bệnh trong hóa đơn
/// </summary>
public class InvoiceBedItemDto
{
    public Guid Id { get; set; }
    public string BedCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string BedTypeName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int Days { get; set; }

    public decimal DayRate { get; set; }
    public decimal Amount { get; set; }

    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int PaymentObject { get; set; }
    public int Status { get; set; }
}

/// <summary>
/// DTO cho tạo hóa đơn
/// </summary>
public class CreateInvoiceDto
{
    public Guid MedicalRecordId { get; set; }
    public List<Guid>? ServiceItemIds { get; set; }
    public List<Guid>? MedicineItemIds { get; set; }
    public List<Guid>? SupplyItemIds { get; set; }
}

/// <summary>
/// DTO cho tìm kiếm hóa đơn
/// </summary>
public class InvoiceSearchDto
{
    public string? Keyword { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? PatientType { get; set; }
    public int? PaymentStatus { get; set; }
    public int? ApprovalStatus { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region Discount Management - Quản lý miễn giảm

/// <summary>
/// DTO cho áp dụng miễn giảm
/// </summary>
public class ApplyDiscountDto
{
    public Guid InvoiceId { get; set; }

    // Loại miễn giảm: 1-Theo hóa đơn, 2-Theo dịch vụ
    public int DiscountScope { get; set; }

    // Miễn giảm theo hóa đơn
    public int? DiscountType { get; set; } // 1-Theo %, 2-Theo số tiền
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }

    // Miễn giảm theo từng dịch vụ
    public List<ServiceDiscountDto>? ServiceDiscounts { get; set; }

    // Phê duyệt (nếu cần)
    public Guid? ApproverId { get; set; }
}

/// <summary>
/// DTO cho miễn giảm từng dịch vụ
/// </summary>
public class ServiceDiscountDto
{
    public Guid ItemId { get; set; }
    public int ItemType { get; set; } // 1-Dịch vụ, 2-Thuốc, 3-Vật tư, 4-Giường
    public int DiscountType { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// DTO cho lịch sử miễn giảm
/// </summary>
public class DiscountHistoryDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;

    public int DiscountScope { get; set; }
    public int DiscountType { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Reason { get; set; }

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
}

#endregion

#region Refund Management - Quản lý hoàn ứng

/// <summary>
/// DTO cho phiếu hoàn ứng
/// </summary>
public class RefundDto
{
    public Guid Id { get; set; }
    public string RefundCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    // Loại hoàn: 1-Hoàn tạm ứng, 2-Hoàn thanh toán, 3-Hoàn BHYT
    public int RefundType { get; set; }
    public string RefundTypeName { get; set; } = string.Empty;

    // Phiếu gốc
    public Guid? OriginalDepositId { get; set; }
    public Guid? OriginalPaymentId { get; set; }

    // Số tiền
    public decimal RefundAmount { get; set; }

    // Phương thức hoàn
    public int RefundMethod { get; set; } // 1-Tiền mặt, 2-Chuyển khoản
    public string RefundMethodName { get; set; } = string.Empty;
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }

    // Lý do
    public string Reason { get; set; } = string.Empty;

    // Thu ngân
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;

    // Trạng thái: 1-Chờ duyệt, 2-Đã duyệt, 3-Đã hoàn, 4-Từ chối, 5-Đã hủy
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Phê duyệt
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Xác nhận hoàn
    public Guid? ConfirmedBy { get; set; }
    public string? ConfirmedByName { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO cho tạo phiếu hoàn ứng
/// </summary>
public class CreateRefundDto
{
    public Guid PatientId { get; set; }
    public int RefundType { get; set; }
    public Guid? OriginalDepositId { get; set; }
    public Guid? OriginalPaymentId { get; set; }
    public decimal RefundAmount { get; set; }
    public int RefundMethod { get; set; }
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho phê duyệt hoàn ứng
/// </summary>
public class ApproveRefundDto
{
    public Guid RefundId { get; set; }
    public bool IsApproved { get; set; }
    public string? RejectReason { get; set; }
}

/// <summary>
/// DTO cho xác nhận hoàn tiền
/// </summary>
public class ConfirmRefundDto
{
    public Guid RefundId { get; set; }
    public string? TransactionNumber { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho tìm kiếm hoàn ứng
/// </summary>
public class RefundSearchDto
{
    public string? Keyword { get; set; }
    public Guid? PatientId { get; set; }
    public int? RefundType { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region Record Locking - Tạm khóa hồ sơ

/// <summary>
/// DTO cho khóa hồ sơ
/// </summary>
public class RecordLockDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    public bool IsLocked { get; set; }
    public int? LockType { get; set; } // 1-Tạm khóa, 2-Khóa vĩnh viễn
    public string LockTypeName { get; set; } = string.Empty;

    public string? LockReason { get; set; }
    public Guid? LockedBy { get; set; }
    public string? LockedByName { get; set; }
    public DateTime? LockedAt { get; set; }

    public Guid? UnlockedBy { get; set; }
    public string? UnlockedByName { get; set; }
    public DateTime? UnlockedAt { get; set; }
}

/// <summary>
/// DTO cho khóa/mở khóa hồ sơ
/// </summary>
public class LockRecordDto
{
    public Guid MedicalRecordId { get; set; }
    public bool Lock { get; set; }
    public int? LockType { get; set; }
    public string? Reason { get; set; }
}

#endregion

#region Accounting Approval - Duyệt kế toán

/// <summary>
/// DTO cho duyệt kế toán
/// </summary>
public class AccountingApprovalDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Trạng thái duyệt: 1-Chờ duyệt, 2-Đã duyệt, 3-Từ chối
    public int ApprovalStatus { get; set; }
    public string ApprovalStatusName { get; set; } = string.Empty;

    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? RejectReason { get; set; }
}

/// <summary>
/// DTO cho thực hiện duyệt kế toán
/// </summary>
public class ApproveAccountingDto
{
    public List<Guid> InvoiceIds { get; set; } = new();
    public bool IsApproved { get; set; }
    public string? RejectReason { get; set; }
}

/// <summary>
/// DTO cho tìm kiếm hồ sơ chờ duyệt
/// </summary>
public class PendingApprovalSearchDto
{
    public string? Keyword { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? PatientType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region Insurance Check - Kiểm tra BHYT

/// <summary>
/// DTO cho kiểm tra thông tuyến BHYT
/// </summary>
public class InsuranceCheckDto
{
    public string InsuranceCardNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }

    // Kết quả kiểm tra
    public bool IsValid { get; set; }
    public bool IsInNetwork { get; set; } // Đúng tuyến
    public bool IsReferral { get; set; } // Có giấy chuyển viện

    // Thông tin thẻ
    public string? CardPlace { get; set; }
    public DateTime? CardFromDate { get; set; }
    public DateTime? CardToDate { get; set; }
    public decimal? InsuranceRate { get; set; }

    // Thông tin 5 năm liên tục
    public bool Is5YearContinuous { get; set; }

    // Cảnh báo
    public List<string> Warnings { get; set; } = new();
    public List<string> Errors { get; set; } = new();

    // Thông tin đồng chi trả
    public decimal? CoPaymentRate { get; set; }
    public decimal? MaxCoPaymentAmount { get; set; }

    public DateTime CheckedAt { get; set; }
}

/// <summary>
/// DTO cho yêu cầu kiểm tra BHYT
/// </summary>
public class InsuranceCheckRequestDto
{
    public string InsuranceCardNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public bool CheckOnline { get; set; } = true;
}

#endregion

#region Electronic Invoice - Hóa đơn điện tử

/// <summary>
/// DTO cho hóa đơn điện tử
/// </summary>
public class ElectronicInvoiceDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;

    // Thông tin HĐĐT
    public string EInvoiceNumber { get; set; } = string.Empty;
    public string EInvoiceSeries { get; set; } = string.Empty;
    public DateTime EInvoiceDate { get; set; }

    // Nhà cung cấp HĐĐT
    public string Provider { get; set; } = string.Empty;
    public string? ProviderInvoiceId { get; set; }

    // Thông tin người mua
    public string? BuyerName { get; set; }
    public string? BuyerTaxCode { get; set; }
    public string? BuyerAddress { get; set; }
    public string? BuyerEmail { get; set; }

    // Số tiền
    public decimal Amount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }

    // Trạng thái: 1-Đã phát hành, 2-Đã ký, 3-Đã gửi CQT, 4-Đã hủy
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Link tra cứu
    public string? LookupUrl { get; set; }
    public string? LookupCode { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

/// <summary>
/// DTO cho phát hành HĐĐT
/// </summary>
public class IssueEInvoiceDto
{
    public Guid InvoiceId { get; set; }
    public string? BuyerName { get; set; }
    public string? BuyerTaxCode { get; set; }
    public string? BuyerAddress { get; set; }
    public string? BuyerEmail { get; set; }
    public bool SendEmail { get; set; }
}

#endregion

#region Print Templates - Mẫu in ấn

/// <summary>
/// DTO cho tham số in bảng kê 6556
/// </summary>
public class Print6556RequestDto
{
    public Guid MedicalRecordId { get; set; }
    public bool SplitByObject { get; set; } // Tách theo đối tượng
    public bool SplitByDepartment { get; set; } // Tách theo khoa
    public int? PaymentObject { get; set; } // Lọc theo đối tượng cụ thể
    public Guid? DepartmentId { get; set; } // Lọc theo khoa cụ thể
}

/// <summary>
/// DTO cho in phiếu theo dịch vụ
/// </summary>
public class PrintByServiceRequestDto
{
    public Guid PatientId { get; set; }
    public List<Guid>? ServiceIds { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

#endregion

#region Reports - Báo cáo

/// <summary>
/// DTO cho báo cáo thu tiền ngoại trú
/// </summary>
public class OutpatientRevenueReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalPatients { get; set; }
    public int TotalInvoices { get; set; }

    public decimal TotalRevenue { get; set; }
    public decimal InsuranceRevenue { get; set; }
    public decimal PatientRevenue { get; set; }

    // Chi tiết theo ngày
    public List<DailyRevenueItemDto> DailyDetails { get; set; } = new();

    // Chi tiết theo dịch vụ
    public List<ServiceRevenueItemDto> ServiceDetails { get; set; } = new();

    // Chi tiết theo đối tượng
    public List<ObjectRevenueItemDto> ObjectDetails { get; set; } = new();
}

/// <summary>
/// DTO cho báo cáo thu tiền nội trú
/// </summary>
public class InpatientRevenueReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalPatients { get; set; }
    public int TotalInvoices { get; set; }

    public decimal TotalRevenue { get; set; }
    public decimal InsuranceRevenue { get; set; }
    public decimal PatientRevenue { get; set; }
    public decimal DepositRevenue { get; set; }

    // Chi tiết theo khoa
    public List<DepartmentRevenueItemDto> DepartmentDetails { get; set; } = new();

    // Chi tiết theo ngày giường
    public List<BedRevenueItemDto> BedDetails { get; set; } = new();
}

/// <summary>
/// DTO cho doanh thu theo ngày
/// </summary>
public class DailyRevenueItemDto
{
    public DateTime Date { get; set; }
    public int PatientCount { get; set; }
    public int InvoiceCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO cho doanh thu theo dịch vụ
/// </summary>
public class ServiceRevenueItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroup { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO cho doanh thu theo đối tượng
/// </summary>
public class ObjectRevenueItemDto
{
    public int PaymentObject { get; set; }
    public string PaymentObjectName { get; set; } = string.Empty;
    public int PatientCount { get; set; }
    public decimal TotalAmount { get; set; }
}

/// <summary>
/// DTO cho doanh thu theo khoa
/// </summary>
public class DepartmentRevenueItemDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int PatientCount { get; set; }
    public decimal ServiceAmount { get; set; }
    public decimal MedicineAmount { get; set; }
    public decimal SupplyAmount { get; set; }
    public decimal BedAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

/// <summary>
/// DTO cho doanh thu ngày giường
/// </summary>
public class BedRevenueItemDto
{
    public string BedType { get; set; } = string.Empty;
    public int TotalDays { get; set; }
    public decimal DayRate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO cho báo cáo thu tiền tạm ứng
/// </summary>
public class DepositRevenueReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalDeposits { get; set; }
    public decimal TotalDepositAmount { get; set; }
    public decimal TotalUsedAmount { get; set; }
    public decimal TotalRefundAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    // Chi tiết theo ngày
    public List<DailyDepositItemDto> DailyDetails { get; set; } = new();

    // Chi tiết theo loại
    public List<DepositTypeItemDto> TypeDetails { get; set; } = new();
}

/// <summary>
/// DTO cho tạm ứng theo ngày
/// </summary>
public class DailyDepositItemDto
{
    public DateTime Date { get; set; }
    public int DepositCount { get; set; }
    public decimal DepositAmount { get; set; }
    public int RefundCount { get; set; }
    public decimal RefundAmount { get; set; }
}

/// <summary>
/// DTO cho tạm ứng theo loại
/// </summary>
public class DepositTypeItemDto
{
    public int DepositType { get; set; }
    public string DepositTypeName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// DTO cho báo cáo sử dụng sổ thu chi
/// </summary>
public class CashBookUsageReportDto
{
    public Guid CashBookId { get; set; }
    public string CashBookCode { get; set; } = string.Empty;
    public string CashBookName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    // Số phiếu đã sử dụng
    public int StartReceiptNumber { get; set; }
    public int EndReceiptNumber { get; set; }
    public int TotalReceiptsUsed { get; set; }
    public int TotalReceiptsCancelled { get; set; }

    // Tổng thu chi
    public decimal TotalReceipt { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal Balance { get; set; }

    // Chi tiết theo người sử dụng
    public List<UserCashBookUsageDto> UserUsages { get; set; } = new();
}

/// <summary>
/// DTO cho sử dụng sổ theo người dùng
/// </summary>
public class UserCashBookUsageDto
{
    public Guid UserId { get; set; }
    public string UserCode { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int ReceiptCount { get; set; }
    public decimal TotalAmount { get; set; }
}

/// <summary>
/// DTO cho tham số báo cáo
/// </summary>
public class RevenueReportRequestDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int? PatientType { get; set; } // 1-Ngoại trú, 2-Nội trú
    public Guid? DepartmentId { get; set; }
    public Guid? CashierId { get; set; }
    public int? PaymentObject { get; set; }
}

#endregion

#region Patient Status - Trạng thái bệnh nhân

/// <summary>
/// DTO cho trạng thái thanh toán bệnh nhân
/// </summary>
public class PatientBillingStatusDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;

    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;

    // Trạng thái hồ sơ: 1-Đang khám, 2-Chờ TT, 3-Đang điều trị, 4-Chờ ra viện, 5-Đã đóng BA
    public int RecordStatus { get; set; }
    public string RecordStatusName { get; set; } = string.Empty;

    // Trạng thái kế toán: 1-Chưa duyệt, 2-Đã duyệt, 3-Tạm khóa
    public int AccountingStatus { get; set; }
    public string AccountingStatusName { get; set; } = string.Empty;

    // Trạng thái thanh toán
    public int PaymentStatus { get; set; }
    public string PaymentStatusName { get; set; } = string.Empty;

    // Số tiền
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DepositBalance { get; set; }
    public decimal RemainingAmount { get; set; }

    // Cảnh báo
    public bool HasUnpaidServices { get; set; }
    public bool HasPendingApproval { get; set; }
    public bool IsLocked { get; set; }
    public bool CanDischarge { get; set; }

    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// DTO cho tìm kiếm bệnh nhân theo trạng thái
/// </summary>
public class PatientStatusSearchDto
{
    public string? Keyword { get; set; }
    public int? RecordStatus { get; set; }
    public int? AccountingStatus { get; set; }
    public int? PaymentStatus { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region Unpaid Items - Dịch vụ/thuốc chưa thanh toán

/// <summary>
/// DTO cho dịch vụ chưa thanh toán
/// </summary>
public class UnpaidServiceItemDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroup { get; set; } = string.Empty;

    public Guid? OrderDepartmentId { get; set; }
    public string? OrderDepartmentName { get; set; }

    public Guid? ExecuteDepartmentId { get; set; }
    public string? ExecuteDepartmentName { get; set; }

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentObject { get; set; }
    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public DateTime OrderedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
}

/// <summary>
/// DTO cho thuốc chưa thanh toán
/// </summary>
public class UnpaidMedicineItemDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentObject { get; set; }
    public decimal InsuranceRate { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public DateTime PrescribedAt { get; set; }
    public DateTime? DispensedAt { get; set; }
}

#endregion

#region Statistics - Thống kê

/// <summary>
/// DTO cho thống kê viện phí tổng hợp
/// </summary>
public class BillingStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    // Tổng quan
    public int TotalPatients { get; set; }
    public int OutpatientCount { get; set; }
    public int InpatientCount { get; set; }

    // Doanh thu
    public decimal TotalRevenue { get; set; }
    public decimal ServiceRevenue { get; set; }
    public decimal MedicineRevenue { get; set; }
    public decimal SupplyRevenue { get; set; }
    public decimal BedRevenue { get; set; }

    // Nguồn thu
    public decimal InsuranceRevenue { get; set; }
    public decimal PatientRevenue { get; set; }

    // Tạm ứng
    public decimal TotalDeposit { get; set; }
    public decimal DepositUsed { get; set; }
    public decimal DepositRefund { get; set; }

    // Miễn giảm
    public decimal TotalDiscount { get; set; }

    // Công nợ
    public decimal TotalDebt { get; set; }

    // Biểu đồ theo ngày
    public List<DailyRevenueItemDto> DailyTrend { get; set; } = new();
}

/// <summary>
/// DTO cho tham số thống kê
/// </summary>
public class BillingStatisticsRequestDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int? PatientType { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IncludeDailyTrend { get; set; }
}

/// <summary>
/// DTO cho báo cáo doanh thu theo ngày
/// </summary>
public class DailyRevenueReportDto
{
    public DateTime Date { get; set; }

    // Ngoại trú
    public int OutpatientCount { get; set; }
    public decimal OutpatientRevenue { get; set; }

    // Nội trú
    public int InpatientCount { get; set; }
    public decimal InpatientRevenue { get; set; }

    // Tạm ứng
    public int DepositCount { get; set; }
    public decimal DepositAmount { get; set; }

    // Hoàn trả
    public int RefundCount { get; set; }
    public decimal RefundAmount { get; set; }

    // Tổng
    public decimal TotalRevenue { get; set; }
}

/// <summary>
/// DTO cho yêu cầu báo cáo theo khoa
/// </summary>
public class DepartmentRevenueRequestDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public List<Guid>? DepartmentIds { get; set; }
    public int? PatientType { get; set; }
}

/// <summary>
/// DTO cho thống kê công nợ
/// </summary>
public class DebtStatisticsDto
{
    public DateTime AsOfDate { get; set; }

    public int TotalDebtors { get; set; }
    public decimal TotalDebt { get; set; }

    // Phân loại theo thời gian
    public decimal Debt0To30Days { get; set; }
    public decimal Debt30To60Days { get; set; }
    public decimal Debt60To90Days { get; set; }
    public decimal DebtOver90Days { get; set; }

    // Top công nợ
    public List<DebtorDto> TopDebtors { get; set; } = new();
}

/// <summary>
/// DTO cho thông tin người nợ
/// </summary>
public class DebtorDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public decimal DebtAmount { get; set; }
    public int DaysOverdue { get; set; }
    public DateTime LastPaymentDate { get; set; }
}

#endregion

#region Insurance Claim - Giám định BHYT

/// <summary>
/// DTO cho giám định BHYT
/// </summary>
public class InsuranceClaimDto
{
    public Guid Id { get; set; }
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public string PatientName { get; set; } = string.Empty;
    public string InsuranceCardNumber { get; set; } = string.Empty;

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Trạng thái: 1-Chờ giám định, 2-Đã giám định, 3-Đã gửi BHXH, 4-Đã duyệt, 5-Từ chối
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
}

/// <summary>
/// DTO cho kết quả xuất XML 4210
/// </summary>
public class Xml4210ResultDto
{
    public bool Success { get; set; }
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public byte[]? FileContent { get; set; }

    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }

    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// DTO cho yêu cầu xuất XML 4210
/// </summary>
public class GenerateXml4210RequestDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int? PatientType { get; set; }
    public List<Guid>? MedicalRecordIds { get; set; }
    public bool AutoSubmit { get; set; }
}

/// <summary>
/// DTO cho thống kê giám định BHYT
/// </summary>
public class InsuranceClaimStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalClaims { get; set; }
    public int PendingClaims { get; set; }
    public int ApprovedClaims { get; set; }
    public int RejectedClaims { get; set; }

    public decimal TotalClaimAmount { get; set; }
    public decimal ApprovedAmount { get; set; }
    public decimal RejectedAmount { get; set; }

    // Theo loại KCB
    public decimal OutpatientAmount { get; set; }
    public decimal InpatientAmount { get; set; }
}

#endregion
