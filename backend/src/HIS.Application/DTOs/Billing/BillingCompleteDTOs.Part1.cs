using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;
using HIS.Application.DTOs;

namespace HIS.Application.DTOs.Billing;


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
    [Range(0, double.MaxValue, ErrorMessage = "Số dư đầu kỳ không được âm")]
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
    [NotEmptyGuid]
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public int DepositType { get; set; }
    public int DepositSource { get; set; }
    public Guid? DepartmentId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền tạm ứng không được âm")]
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
    [NotEmptyGuid]
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



/// <summary>
/// DTO cho áp dụng miễn giảm
/// </summary>
public class ApplyDiscountDto
{
    [NotEmptyGuid]
    public Guid InvoiceId { get; set; }

    // Loại miễn giảm: 1-Theo hóa đơn, 2-Theo dịch vụ
    public int DiscountScope { get; set; }

    // Miễn giảm theo hóa đơn
    public int? DiscountType { get; set; } // 1-Theo %, 2-Theo số tiền
    [Range(0, 100, ErrorMessage = "Phần trăm miễn giảm phải trong khoảng 0-100")]
    public decimal? DiscountPercent { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền miễn giảm không được âm")]
    public decimal? DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }

    /// <summary>
    /// Sprint 3 Item 2.4: Lý do chuẩn hóa (0=không, 1=BHBL, 2=NV, 3=NgườiNhà,
    /// 4=GĐduyệtMiễn, 5=CQBảoLãnh, 6=Khác)
    /// </summary>
    public int? DiscountReasonCode { get; set; }

    /// <summary>Ghi chú khi reason = 6 (Khác)</summary>
    public string? DiscountNote { get; set; }

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
    [NotEmptyGuid]
    public Guid ItemId { get; set; }
    public int ItemType { get; set; } // 1-Dịch vụ, 2-Thuốc, 3-Vật tư, 4-Giường
    public int DiscountType { get; set; }
    [Range(0, 100, ErrorMessage = "Phần trăm miễn giảm phải trong khoảng 0-100")]
    public decimal? DiscountPercent { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền miễn giảm không được âm")]
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
    [NotEmptyGuid]
    public Guid PatientId { get; set; }
    public int RefundType { get; set; }
    public Guid? OriginalDepositId { get; set; }
    public Guid? OriginalPaymentId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Số tiền hoàn không được âm")]
    public decimal RefundAmount { get; set; }
    public int RefundMethod { get; set; }
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Sprint 3 Item 2.5: Hoàn trả chi tiết. Nếu có items → hoàn từng dòng cụ thể.
    /// Bỏ trống → hoàn trả toàn bộ như cũ.
    /// </summary>
    public List<RefundItemDto>? Items { get; set; }
}

public class RefundItemDto
{
    /// <summary>ReceiptDetail.Id hoặc ServiceRequestDetail.Id hoặc PrescriptionDetail.Id</summary>
    [NotEmptyGuid]
    public Guid ItemId { get; set; }

    /// <summary>"service" | "medicine" | "receipt-detail"</summary>
    public string ItemType { get; set; } = "service";

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền hoàn không được âm")]
    public decimal RefundAmount { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// #419: một dòng dịch vụ/thuốc đã thanh toán còn hoàn được (nguồn cho modal hoàn trả chi tiết)
/// </summary>
public class RefundableItemDto
{
    /// <summary>ServiceRequestDetail.Id hoặc PrescriptionDetail.Id</summary>
    public Guid Id { get; set; }

    /// <summary>"service" | "medicine"</summary>
    public string ItemType { get; set; } = "service";
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Amount { get; set; }
    public decimal PatientAmount { get; set; }
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public bool HasResult { get; set; }
    public bool IsDispensed { get; set; }
}

/// <summary>
/// #419: phiếu thanh toán của BN (chọn phiếu gốc khi hoàn RefundType=2)
/// </summary>
public class PatientPaymentBriefDto
{
    public Guid Id { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public decimal FinalAmount { get; set; }
    public int PaymentMethod { get; set; }
    public string? Note { get; set; }
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
    [NotEmptyGuid]
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



/// <summary>
/// DTO cho khóa hồ sơ
/// </summary>
public class RecordLockDto
{
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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


