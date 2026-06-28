namespace HIS.Application.DTOs.Warehouse;


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
        12 => "Xuất tủ trực",
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

    // Context for cabinet dispensing (IssueType=12): one of these is set
    public Guid? AdmissionId { get; set; }    // Inpatient admission context
    public Guid? SurgeryId { get; set; }      // Surgery (PTTT) context
    public Guid? ExaminationId { get; set; }  // OPD examination context

    public List<CreateStockIssueItemDto> Items { get; set; } = new();

    public string? Notes { get; set; }
}

/// <summary>
/// Request DTO for creating a cabinet (tủ trực) stock issue.
/// Wraps CreateStockIssueDto; IssueType is forced to 12 server-side.
/// </summary>
public class CreateCabinetIssueDto : CreateStockIssueDto
{
    // IssueType intentionally not set by client — server forces 12
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


