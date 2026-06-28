using System.ComponentModel.DataAnnotations;
using HIS.Application.Common;
using HIS.Application.DTOs;

namespace HIS.Application.DTOs.Billing;


/// <summary>
/// DTO cho kiểm tra thông tuyến BHYT
/// </summary>
public class InsuranceCheckDto
{
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public string? PatientName { get; set; }
    public string? BuyerName { get; set; }
    public string? BuyerTaxCode { get; set; }
    public string? BuyerAddress { get; set; }
    public string? BuyerEmail { get; set; }
    public string? PaymentMethod { get; set; }

    // Số tiền
    public decimal SubTotal { get; set; }
    public decimal Amount { get; set; }
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }

    // Chi tiết dòng hóa đơn
    public string? ItemsJson { get; set; }

    // Trạng thái: 0-Nháp, 1-Đã phát hành, 2-Đã gửi, 3-Đã hủy, 4-Đã thay thế
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Link tra cứu
    public string? LookupUrl { get; set; }
    public string? LookupCode { get; set; }

    // Hủy
    public string? CancelReason { get; set; }
    public DateTime? CancelledAt { get; set; }

    // Gửi
    public DateTime? SentAt { get; set; }
    public string? SentTo { get; set; }

    // Ký
    public string? SignedBy { get; set; }

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
    public string? PaymentMethod { get; set; }
    public bool SendEmail { get; set; }
}

/// <summary>
/// DTO tìm kiếm HĐĐT
/// </summary>
public class ElectronicInvoiceSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? PatientId { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO thống kê HĐĐT
/// </summary>
public class ElectronicInvoiceStatsDto
{
    public int TotalInvoices { get; set; }
    public int DraftCount { get; set; }
    public int IssuedCount { get; set; }
    public int SentCount { get; set; }
    public int CancelledCount { get; set; }
    public int ReplacedCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVatAmount { get; set; }
    public decimal TotalWithVat { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public List<ElectronicInvoiceDailyStatDto> DailyStats { get; set; } = new();
}

/// <summary>
/// DTO thống kê HĐĐT theo ngày
/// </summary>
public class ElectronicInvoiceDailyStatDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}



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



/// <summary>
/// DTO cho báo cáo thu tiền ngoại trú
/// </summary>
public class OutpatientRevenueReportDto
{
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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



/// <summary>
/// DTO cho thống kê viện phí tổng hợp
/// </summary>
public class BillingStatisticsDto
{
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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



/// <summary>
/// DTO cho giám định BHYT
/// </summary>
public class InsuranceClaimDto
{
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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
    public bool IsError { get; set; }          // #190
    public string? ErrorMessage { get; set; }  // #190: phân biệt "rỗng thật" vs exception bị nuốt
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

