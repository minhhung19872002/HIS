namespace HIS.Application.DTOs.Warehouse;

#region 5.1 Nhập kho

/// <summary>
/// DTO phiếu nhập kho
/// </summary>
public class StockReceiptDto
{
    public Guid Id { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public int ReceiptType { get; set; }
    public string ReceiptTypeName => ReceiptType switch
    {
        1 => "Nhập NCC",
        2 => "Nhập viện trợ",
        3 => "Nhập chuyển kho",
        4 => "Nhập hoàn trả khoa",
        5 => "Nhập hoàn trả kho",
        6 => "Nhập kiểm kê",
        7 => "Nhập khác",
        _ => ""
    };

    // NCC (nếu nhập từ NCC)
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string? ContractNumber { get; set; }

    // Kho nguồn (nếu nhập chuyển kho)
    public Guid? SourceWarehouseId { get; set; }
    public string? SourceWarehouseName { get; set; }
    public Guid? SourceReceiptId { get; set; }

    // Khoa (nếu nhập hoàn trả)
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public List<StockReceiptItemDto> Items { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }

    public int Status { get; set; } // 0-Mới tạo, 1-Đã duyệt, 2-Đã hủy
    public string StatusName => Status switch
    {
        0 => "Mới tạo",
        1 => "Đã duyệt",
        2 => "Đã hủy",
        _ => ""
    };

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO item nhập kho
/// </summary>
public class StockReceiptItemDto
{
    public Guid Id { get; set; }
    public Guid StockReceiptId { get; set; }

    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; } // 1-Thuốc, 2-Vật tư, 3-Hóa chất
    public string Unit { get; set; } = string.Empty;

    public string? BatchNumber { get; set; }
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
    public decimal DiscountRate { get; set; }
    public decimal Amount { get; set; }

    public string? CountryOfOrigin { get; set; }
    public string? Manufacturer { get; set; }
    public string? RegistrationNumber { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO tạo phiếu nhập
/// </summary>
public class CreateStockReceiptDto
{
    public DateTime ReceiptDate { get; set; }
    public Guid WarehouseId { get; set; }
    public int ReceiptType { get; set; }

    public Guid? SupplierId { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string? ContractNumber { get; set; }

    public Guid? SourceWarehouseId { get; set; }
    public Guid? SourceReceiptId { get; set; }
    public Guid? DepartmentId { get; set; }

    public List<CreateStockReceiptItemDto> Items { get; set; } = new();

    public string? Notes { get; set; }
}

/// <summary>
/// DTO tạo item nhập kho
/// </summary>
public class CreateStockReceiptItemDto
{
    public Guid ItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ManufactureDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
    public decimal DiscountRate { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? Manufacturer { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO công nợ NCC
/// </summary>
public class SupplierPayableDto
{
    public Guid SupplierId { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;

    public decimal TotalReceiptAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    public List<PayableInvoiceDto> Invoices { get; set; } = new();
}

/// <summary>
/// DTO hóa đơn chưa thanh toán
/// </summary>
public class PayableInvoiceDto
{
    public Guid ReceiptId { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public DateTime ReceiptDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public int DaysOverdue { get; set; }
}

/// <summary>
/// DTO thanh toán NCC
/// </summary>
public class SupplierPaymentDto
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;

    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReferenceNumber { get; set; }

    public List<Guid> ReceiptIds { get; set; } = new();

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;

    public string? Notes { get; set; }
}

#endregion

#region 5.2 Xuất kho

/// <summary>
/// DTO phiếu xuất kho
/// </summary>
public class StockIssueDto
{
    public Guid Id { get; set; }
    public string IssueCode { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public int IssueType { get; set; }
    public string IssueTypeName => IssueType switch
    {
        1 => "Xuất đơn thuốc ngoại trú",
        2 => "Xuất phiếu lĩnh nội trú",
        3 => "Xuất khoa/phòng",
        4 => "Xuất chuyển kho",
        5 => "Xuất trả NCC",
        6 => "Xuất ngoại viện",
        7 => "Xuất hủy",
        8 => "Xuất kiểm nghiệm",
        9 => "Xuất kiểm kê",
        10 => "Xuất thanh lý",
        11 => "Xuất bán nhà thuốc",
        _ => ""
    };

    // Khoa/phòng nhận
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Kho đích (nếu chuyển kho)
    public Guid? TargetWarehouseId { get; set; }
    public string? TargetWarehouseName { get; set; }

    // NCC (nếu xuất trả)
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }

    // BN (nếu xuất đơn thuốc)
    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public Guid? PrescriptionId { get; set; }

    public List<StockIssueItemDto> Items { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }

    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Mới tạo",
        1 => "Đã xuất",
        2 => "Đã hủy",
        _ => ""
    };

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO item xuất kho
/// </summary>
public class StockIssueItemDto
{
    public Guid Id { get; set; }
    public Guid StockIssueId { get; set; }

    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; }
    public string Unit { get; set; } = string.Empty;

    public Guid StockId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentSource { get; set; }
    public decimal InsuranceRatio { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO tạo phiếu xuất
/// </summary>
public class CreateStockIssueDto
{
    public DateTime IssueDate { get; set; }
    public Guid WarehouseId { get; set; }
    public int IssueType { get; set; }

    public Guid? DepartmentId { get; set; }
    public Guid? TargetWarehouseId { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? PrescriptionId { get; set; }

    public List<CreateStockIssueItemDto> Items { get; set; } = new();

    public string? Notes { get; set; }
}

/// <summary>
/// DTO tạo item xuất
/// </summary>
public class CreateStockIssueItemDto
{
    public Guid ItemId { get; set; }
    public Guid? StockId { get; set; }
    public decimal Quantity { get; set; }
    public int PaymentSource { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO xuất đơn thuốc ngoại trú
/// </summary>
public class DispenseOutpatientDto
{
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }

    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public bool IsInsurance { get; set; }

    public string? DoctorName { get; set; }
    public string? Diagnosis { get; set; }

    public List<DispenseItemDto> Items { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }

    public int Status { get; set; } // 0-Chờ phát, 1-Đã phát, 2-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ phát",
        1 => "Đã phát",
        2 => "Đã hủy",
        _ => ""
    };
}

/// <summary>
/// DTO item phát thuốc
/// </summary>
public class DispenseItemDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal PrescribedQuantity { get; set; }
    public decimal DispensedQuantity { get; set; }

    public string? Dosage { get; set; }
    public string? UsageInstructions { get; set; }

    public Guid? StockId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceRatio { get; set; }
}

/// <summary>
/// DTO bán thuốc nhà thuốc
/// </summary>
public class PharmacySaleDto
{
    public Guid Id { get; set; }
    public string SaleCode { get; set; } = string.Empty;
    public DateTime SaleDate { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public int SaleType { get; set; } // 1-Theo đơn BS, 2-Bán lẻ
    public string SaleTypeName => SaleType switch
    {
        1 => "Theo đơn bác sĩ",
        2 => "Bán lẻ",
        _ => ""
    };

    public Guid? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    public Guid? PrescriptionId { get; set; }

    public List<PharmacySaleItemDto> Items { get; set; } = new();

    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }

    public string? PaymentMethod { get; set; }

    public Guid SoldBy { get; set; }
    public string SoldByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO item bán thuốc
/// </summary>
public class PharmacySaleItemDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Amount { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

#endregion

#region 5.3 Tồn kho

/// <summary>
/// DTO tồn kho
/// </summary>
public class StockDto
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; }
    public string ItemTypeName => ItemType switch
    {
        1 => "Thuốc",
        2 => "Vật tư",
        3 => "Hóa chất",
        _ => ""
    };
    public string Unit { get; set; } = string.Empty;

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int? DaysToExpiry { get; set; }

    public decimal Quantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableQuantity => Quantity - ReservedQuantity;

    public decimal UnitPrice { get; set; }
    public decimal TotalValue { get; set; }

    public string? Location { get; set; }

    // Cảnh báo
    public bool IsBelowMinimum { get; set; }
    public bool IsAboveMaximum { get; set; }
    public bool IsExpiringSoon { get; set; }
    public bool IsExpired { get; set; }
}

/// <summary>
/// DTO tìm kiếm tồn kho
/// </summary>
public class StockSearchDto
{
    public Guid? WarehouseId { get; set; }
    public int? ItemType { get; set; }
    public string? Keyword { get; set; }
    public bool? IsExpiringSoon { get; set; }
    public bool? IsBelowMinimum { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO báo cáo nhập xuất tồn
/// </summary>
public class StockMovementReportDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal OpeningQuantity { get; set; }
    public decimal OpeningValue { get; set; }

    public decimal TotalReceived { get; set; }
    public decimal TotalReceivedValue { get; set; }

    public decimal TotalIssued { get; set; }
    public decimal TotalIssuedValue { get; set; }

    public decimal ClosingQuantity { get; set; }
    public decimal ClosingValue { get; set; }
}

/// <summary>
/// DTO dự trù
/// </summary>
public class ProcurementRequestDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public List<ProcurementItemDto> Items { get; set; } = new();

    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Mới tạo",
        1 => "Đã duyệt",
        2 => "Đã mua",
        3 => "Đã hủy",
        _ => ""
    };

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO item dự trù
/// </summary>
public class ProcurementItemDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal AverageConsumption { get; set; }

    public decimal RequestedQuantity { get; set; }
    public decimal ApprovedQuantity { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO tạo dự trù
/// </summary>
public class CreateProcurementRequestDto
{
    public Guid WarehouseId { get; set; }
    public string? Description { get; set; }
    public List<CreateProcurementItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO tạo item dự trù
/// </summary>
public class CreateProcurementItemDto
{
    public Guid ItemId { get; set; }
    public decimal RequestedQuantity { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO gợi ý dự trù tự động
/// </summary>
public class AutoProcurementSuggestionDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }

    public decimal AverageMonthlyUsage { get; set; }
    public decimal SameMonthLastYearUsage { get; set; }

    public decimal SuggestedQuantity { get; set; }
    public string? SuggestionReason { get; set; }
}

/// <summary>
/// DTO kiểm kê
/// </summary>
public class StockTakeDto
{
    public Guid Id { get; set; }
    public string StockTakeCode { get; set; } = string.Empty;
    public DateTime StockTakeDate { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }

    public List<StockTakeItemDto> Items { get; set; } = new();

    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Mới tạo",
        1 => "Đang kiểm",
        2 => "Đã hoàn thành",
        3 => "Đã điều chỉnh",
        4 => "Đã hủy",
        _ => ""
    };

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO item kiểm kê
/// </summary>
public class StockTakeItemDto
{
    public Guid Id { get; set; }
    public Guid StockTakeId { get; set; }

    public Guid StockId { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal BookQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
    public decimal DifferenceQuantity => ActualQuantity - BookQuantity;

    public decimal UnitPrice { get; set; }
    public decimal DifferenceValue => DifferenceQuantity * UnitPrice;

    public string? Notes { get; set; }
}

/// <summary>
/// DTO quản lý lô thuốc
/// </summary>
public class BatchInfoDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;

    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufactureDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int DaysToExpiry { get; set; }

    public string? CountryOfOrigin { get; set; }
    public string? Manufacturer { get; set; }
    public string? RegistrationNumber { get; set; }

    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }

    public decimal ReceivedQuantity { get; set; }
    public decimal IssuedQuantity { get; set; }
    public decimal RemainingQuantity { get; set; }
}

/// <summary>
/// DTO cảnh báo hết hạn
/// </summary>
public class ExpiryWarningDto
{
    public Guid StockId { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public string? BatchNumber { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int DaysToExpiry { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalValue { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public int WarningLevel { get; set; } // 1-3 tháng, 2-6 tháng, 3-12 tháng
    public string WarningLevelName => WarningLevel switch
    {
        1 => "Cảnh báo đỏ (< 3 tháng)",
        2 => "Cảnh báo vàng (< 6 tháng)",
        3 => "Cảnh báo xanh (< 12 tháng)",
        _ => ""
    };
}

/// <summary>
/// DTO đơn thuốc ngoại trú không lĩnh
/// </summary>
public class UnclaimedPrescriptionDto
{
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }

    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }

    public string? DoctorName { get; set; }

    public decimal TotalAmount { get; set; }
    public int DaysSincePrescription { get; set; }

    public int Status { get; set; } // 0-Chờ lĩnh, 1-Đã hủy
}

#endregion

#region 5.4 Quản lý

/// <summary>
/// DTO kho
/// </summary>
public class WarehouseDto
{
    public Guid Id { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;

    public int WarehouseType { get; set; }
    public string WarehouseTypeName => WarehouseType switch
    {
        1 => "Kho chính",
        2 => "Kho lẻ",
        3 => "Nhà thuốc",
        4 => "Tủ trực",
        5 => "Kho ký gửi",
        _ => ""
    };

    public Guid? ParentWarehouseId { get; set; }
    public string? ParentWarehouseName { get; set; }

    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public bool IsActive { get; set; }

    public string? Address { get; set; }
    public string? ManagerName { get; set; }
}

/// <summary>
/// DTO vật tư tái sử dụng
/// </summary>
public class ReusableSupplyDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;

    public int MaxReuseCount { get; set; }
    public int CurrentReuseCount { get; set; }
    public int RemainingUses => MaxReuseCount - CurrentReuseCount;

    public DateTime? LastSterilizationDate { get; set; }
    public DateTime? NextSterilizationDue { get; set; }

    public int Status { get; set; } // 1-Sẵn sàng, 2-Đang sử dụng, 3-Chờ tiệt khuẩn, 4-Hết số lần dùng
    public string StatusName => Status switch
    {
        1 => "Sẵn sàng",
        2 => "Đang sử dụng",
        3 => "Chờ tiệt khuẩn",
        4 => "Hết số lần dùng",
        _ => ""
    };
}

/// <summary>
/// DTO kho ký gửi
/// </summary>
public class ConsignmentStockDto
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UsedQuantity { get; set; }
    public decimal RemainingQuantity => Quantity - UsedQuantity;

    public DateTime ConsignmentDate { get; set; }
    public DateTime? ExpirationDate { get; set; } // Hạn ký gửi
}

/// <summary>
/// DTO thuốc kê theo IU
/// </summary>
public class IUMedicineDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;

    public string BaseUnit { get; set; } = string.Empty;
    public decimal IUPerBaseUnit { get; set; }

    public decimal CurrentStockInBaseUnit { get; set; }
    public decimal CurrentStockInIU { get; set; }
}

/// <summary>
/// DTO xuất lẻ
/// </summary>
public class SplitIssueDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;

    public string PackageUnit { get; set; } = string.Empty; // Đơn vị đóng gói (Hộp, Vỉ)
    public string SplitUnit { get; set; } = string.Empty; // Đơn vị lẻ (Viên)

    public decimal QuantityPerPackage { get; set; } // Số lẻ/gói
    public decimal PackagePricePerUnit { get; set; } // Giá 1 đơn vị gói

    public decimal CurrentPackageStock { get; set; }
    public decimal CurrentSplitStock { get; set; }
}

/// <summary>
/// DTO cấu hình giá lợi nhuận nhà thuốc
/// </summary>
public class ProfitMarginConfigDto
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }

    public Guid? ItemGroupId { get; set; }
    public string? ItemGroupName { get; set; }

    public Guid? ItemId { get; set; }
    public string? ItemName { get; set; }

    public decimal ProfitMarginPercent { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    public bool IsActive { get; set; }
}

/// <summary>
/// DTO thẻ kho
/// </summary>
public class StockCardDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public decimal OpeningQuantity { get; set; }
    public decimal ClosingQuantity { get; set; }

    public List<StockCardEntryDto> Entries { get; set; } = new();
}

/// <summary>
/// DTO bản ghi thẻ kho
/// </summary>
public class StockCardEntryDto
{
    public DateTime TransactionDate { get; set; }
    public string DocumentCode { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public string? Description { get; set; }

    public decimal ReceivedQuantity { get; set; }
    public decimal IssuedQuantity { get; set; }
    public decimal Balance { get; set; }
}

/// <summary>
/// DTO thống kê xuất khoa phòng
/// </summary>
public class DepartmentUsageReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<DepartmentUsageItemDto> Departments { get; set; } = new();

    public decimal TotalAmount { get; set; }
}

/// <summary>
/// DTO item thống kê xuất khoa
/// </summary>
public class DepartmentUsageItemDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;

    public int IssueCount { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }

    public List<ItemUsageDto> TopItems { get; set; } = new();
}

/// <summary>
/// DTO thống kê sử dụng item
/// </summary>
public class ItemUsageDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Amount { get; set; }
}

#endregion

#region Search

/// <summary>
/// DTO tìm kiếm phiếu nhập
/// </summary>
public class StockReceiptSearchDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? WarehouseId { get; set; }
    public int? ReceiptType { get; set; }
    public Guid? SupplierId { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO tìm kiếm phiếu xuất
/// </summary>
public class StockIssueSearchDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? WarehouseId { get; set; }
    public int? IssueType { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

#endregion
