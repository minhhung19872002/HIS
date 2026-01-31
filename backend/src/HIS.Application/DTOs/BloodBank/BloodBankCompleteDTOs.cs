using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.BloodBank
{
    /// <summary>
    /// Complete Blood Bank DTOs
    /// Module 9: Quản lý máu, chế phẩm máu - 10 chức năng
    /// </summary>

    #region Blood Bag & Product

    /// <summary>
    /// Thông tin túi máu
    /// </summary>
    public class BloodBagDto
    {
        public Guid Id { get; set; }
        public string BagCode { get; set; }
        public string Barcode { get; set; }
        public string BloodType { get; set; } // A, B, AB, O
        public string RhFactor { get; set; } // Positive, Negative
        public Guid ProductTypeId { get; set; }
        public string ProductTypeName { get; set; } // Whole Blood, RBC, Plasma, Platelet, Cryoprecipitate
        public decimal Volume { get; set; }
        public string Unit { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string DonorCode { get; set; }
        public string DonorName { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string Status { get; set; } // Available, Reserved, Issued, Transfused, Expired, Destroyed
        public string StorageLocation { get; set; }
        public decimal? Temperature { get; set; }
        public string TestResults { get; set; }
        public bool IsTestPassed { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Loại chế phẩm máu
    /// </summary>
    public class BloodProductTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int ShelfLifeDays { get; set; }
        public decimal? MinTemperature { get; set; }
        public decimal? MaxTemperature { get; set; }
        public decimal? StandardVolume { get; set; }
        public string Unit { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Import/Receipt

    /// <summary>
    /// Phiếu nhập máu từ nhà cung cấp
    /// </summary>
    public class BloodImportReceiptDto
    {
        public Guid Id { get; set; }
        public string ReceiptCode { get; set; }
        public DateTime ReceiptDate { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string SupplierAddress { get; set; }
        public string DeliveryPerson { get; set; }
        public string ReceiverName { get; set; }
        public string Status { get; set; } // Draft, Confirmed, Cancelled
        public int TotalBags { get; set; }
        public decimal TotalAmount { get; set; }
        public string Note { get; set; }
        public List<BloodImportItemDto> Items { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
    }

    /// <summary>
    /// Chi tiết phiếu nhập máu
    /// </summary>
    public class BloodImportItemDto
    {
        public Guid Id { get; set; }
        public string BagCode { get; set; }
        public string Barcode { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public string ProductTypeName { get; set; }
        public decimal Volume { get; set; }
        public string Unit { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string DonorCode { get; set; }
        public decimal Price { get; set; }
        public decimal Amount { get; set; }
        public string TestResults { get; set; }
    }

    /// <summary>
    /// Tạo phiếu nhập máu
    /// </summary>
    public class CreateBloodImportDto
    {
        public DateTime ReceiptDate { get; set; }
        public Guid SupplierId { get; set; }
        public string DeliveryPerson { get; set; }
        public string Note { get; set; }
        public List<CreateBloodImportItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết túi máu nhập
    /// </summary>
    public class CreateBloodImportItemDto
    {
        public string BagCode { get; set; }
        public string Barcode { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public decimal Volume { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string DonorCode { get; set; }
        public decimal Price { get; set; }
        public string TestResults { get; set; }
    }

    #endregion

    #region Issue/Export

    /// <summary>
    /// Phiếu xuất kho máu
    /// </summary>
    public class BloodIssueReceiptDto
    {
        public Guid Id { get; set; }
        public string ReceiptCode { get; set; }
        public DateTime IssueDate { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string RequestedBy { get; set; }
        public string IssuedBy { get; set; }
        public string Status { get; set; } // Pending, Approved, Issued, Cancelled
        public int TotalBags { get; set; }
        public string Note { get; set; }
        public List<BloodIssueItemDto> Items { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Chi tiết phiếu xuất máu
    /// </summary>
    public class BloodIssueItemDto
    {
        public Guid Id { get; set; }
        public Guid BloodBagId { get; set; }
        public string BagCode { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string ProductTypeName { get; set; }
        public decimal Volume { get; set; }
        public DateTime ExpiryDate { get; set; }
        public Guid? PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
    }

    /// <summary>
    /// Yêu cầu xuất kho máu
    /// </summary>
    public class BloodIssueRequestDto
    {
        public Guid Id { get; set; }
        public string RequestCode { get; set; }
        public DateTime RequestDate { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid RequestedById { get; set; }
        public string RequestedByName { get; set; }
        public Guid? PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public string ProductTypeName { get; set; }
        public int RequestedQuantity { get; set; }
        public int IssuedQuantity { get; set; }
        public string Urgency { get; set; } // Normal, Urgent, Emergency
        public string Status { get; set; } // Pending, Approved, PartiallyIssued, FullyIssued, Cancelled
        public string ClinicalIndication { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Tạo yêu cầu xuất kho
    /// </summary>
    public class CreateBloodIssueRequestDto
    {
        public Guid DepartmentId { get; set; }
        public Guid? PatientId { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public int RequestedQuantity { get; set; }
        public string Urgency { get; set; }
        public string ClinicalIndication { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Thực hiện xuất máu
    /// </summary>
    public class IssueBloodDto
    {
        public Guid RequestId { get; set; }
        public List<Guid> BloodBagIds { get; set; }
        public string Note { get; set; }
    }

    #endregion

    #region Inventory & Stock

    /// <summary>
    /// Tồn kho máu
    /// </summary>
    public class BloodStockDto
    {
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public string ProductTypeName { get; set; }
        public int TotalBags { get; set; }
        public int AvailableBags { get; set; }
        public int ReservedBags { get; set; }
        public int ExpiringWithin7Days { get; set; }
        public int ExpiredBags { get; set; }
        public decimal TotalVolume { get; set; }
    }

    /// <summary>
    /// Chi tiết tồn kho theo túi
    /// </summary>
    public class BloodStockDetailDto
    {
        public Guid BloodBagId { get; set; }
        public string BagCode { get; set; }
        public string Barcode { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string ProductTypeName { get; set; }
        public decimal Volume { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysUntilExpiry { get; set; }
        public string StorageLocation { get; set; }
        public string Status { get; set; }
    }

    /// <summary>
    /// Kiểm kê kho máu
    /// </summary>
    public class BloodInventoryDto
    {
        public Guid Id { get; set; }
        public string InventoryCode { get; set; }
        public DateTime InventoryDate { get; set; }
        public string Status { get; set; } // Draft, InProgress, Completed, Approved
        public string ConductedBy { get; set; }
        public string ApprovedBy { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public int TotalBagsSystem { get; set; }
        public int TotalBagsActual { get; set; }
        public int Variance { get; set; }
        public string Note { get; set; }
        public List<BloodInventoryItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết kiểm kê
    /// </summary>
    public class BloodInventoryItemDto
    {
        public Guid Id { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string ProductTypeName { get; set; }
        public int SystemQuantity { get; set; }
        public int ActualQuantity { get; set; }
        public int Variance { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Tạo phiếu kiểm kê
    /// </summary>
    public class CreateBloodInventoryDto
    {
        public DateTime InventoryDate { get; set; }
        public string Note { get; set; }
        public List<CreateBloodInventoryItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết kiểm kê cần tạo
    /// </summary>
    public class CreateBloodInventoryItemDto
    {
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public Guid ProductTypeId { get; set; }
        public int ActualQuantity { get; set; }
        public string Note { get; set; }
    }

    #endregion

    #region Blood Order (Prescription)

    /// <summary>
    /// Chỉ định máu cho bệnh nhân
    /// </summary>
    public class BloodOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public DateTime OrderDate { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string PatientBloodType { get; set; }
        public string PatientRhFactor { get; set; }
        public Guid VisitId { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string OrderDoctorName { get; set; }
        public string Diagnosis { get; set; }
        public string ClinicalIndication { get; set; }
        public string Status { get; set; } // Pending, CrossMatchTesting, Ready, Transfusing, Completed, Cancelled
        public List<BloodOrderItemDto> Items { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Chi tiết chỉ định máu
    /// </summary>
    public class BloodOrderItemDto
    {
        public Guid Id { get; set; }
        public Guid ProductTypeId { get; set; }
        public string ProductTypeName { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public int OrderedQuantity { get; set; }
        public int IssuedQuantity { get; set; }
        public int TransfusedQuantity { get; set; }
        public string Status { get; set; }
        public string Note { get; set; }
        public List<BloodBagAssignmentDto> AssignedBags { get; set; }
    }

    /// <summary>
    /// Túi máu được gán cho bệnh nhân
    /// </summary>
    public class BloodBagAssignmentDto
    {
        public Guid BloodBagId { get; set; }
        public string BagCode { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public decimal Volume { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string CrossMatchResult { get; set; }
        public DateTime? CrossMatchDate { get; set; }
        public string TransfusionStatus { get; set; } // Reserved, Transfusing, Completed, Returned
        public DateTime? TransfusionStartTime { get; set; }
        public DateTime? TransfusionEndTime { get; set; }
        public string TransfusionNote { get; set; }
    }

    /// <summary>
    /// Tạo chỉ định máu
    /// </summary>
    public class CreateBloodOrderDto
    {
        public Guid PatientId { get; set; }
        public Guid VisitId { get; set; }
        public string Diagnosis { get; set; }
        public string ClinicalIndication { get; set; }
        public List<CreateBloodOrderItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết chỉ định máu cần tạo
    /// </summary>
    public class CreateBloodOrderItemDto
    {
        public Guid ProductTypeId { get; set; }
        public int Quantity { get; set; }
        public string Note { get; set; }
    }

    #endregion

    #region Reports

    /// <summary>
    /// Thẻ kho máu
    /// </summary>
    public class BloodStockCardDto
    {
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string ProductTypeName { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int OpeningBalance { get; set; }
        public int TotalImport { get; set; }
        public int TotalExport { get; set; }
        public int ClosingBalance { get; set; }
        public List<BloodStockCardTransactionDto> Transactions { get; set; }
    }

    /// <summary>
    /// Giao dịch trên thẻ kho
    /// </summary>
    public class BloodStockCardTransactionDto
    {
        public DateTime TransactionDate { get; set; }
        public string TransactionType { get; set; } // Import, Export
        public string DocumentCode { get; set; }
        public string Description { get; set; }
        public int Quantity { get; set; }
        public int Balance { get; set; }
    }

    /// <summary>
    /// Báo cáo nhập xuất tồn kho máu
    /// </summary>
    public class BloodInventoryReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<BloodInventoryReportItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết báo cáo nhập xuất tồn
    /// </summary>
    public class BloodInventoryReportItemDto
    {
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string ProductTypeName { get; set; }
        public int OpeningStock { get; set; }
        public int ImportQuantity { get; set; }
        public int ExportQuantity { get; set; }
        public int ExpiredQuantity { get; set; }
        public int DestroyedQuantity { get; set; }
        public int ClosingStock { get; set; }
    }

    /// <summary>
    /// Phiếu lĩnh máu tổng hợp
    /// </summary>
    public class BloodIssueSummaryDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalBags { get; set; }
        public decimal TotalVolume { get; set; }
        public List<BloodIssueSummaryByTypeDto> ByProductType { get; set; }
        public List<BloodIssueSummaryByDeptDto> ByDepartment { get; set; }
    }

    /// <summary>
    /// Tổng hợp theo loại chế phẩm
    /// </summary>
    public class BloodIssueSummaryByTypeDto
    {
        public string ProductTypeName { get; set; }
        public int Quantity { get; set; }
        public decimal Volume { get; set; }
    }

    /// <summary>
    /// Tổng hợp theo khoa
    /// </summary>
    public class BloodIssueSummaryByDeptDto
    {
        public string DepartmentName { get; set; }
        public int Quantity { get; set; }
        public decimal Volume { get; set; }
    }

    /// <summary>
    /// Phiếu lĩnh máu theo bệnh nhân
    /// </summary>
    public class BloodIssueByPatientDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public int Age { get; set; }
        public string Gender { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public string Diagnosis { get; set; }
        public string DepartmentName { get; set; }
        public List<BloodIssueByPatientItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết máu đã cấp cho bệnh nhân
    /// </summary>
    public class BloodIssueByPatientItemDto
    {
        public DateTime IssueDate { get; set; }
        public string BagCode { get; set; }
        public string ProductTypeName { get; set; }
        public decimal Volume { get; set; }
        public string TransfusionStatus { get; set; }
        public DateTime? TransfusionDate { get; set; }
    }

    /// <summary>
    /// Biên bản kiểm kê kho máu
    /// </summary>
    public class BloodInventoryReportPrintDto
    {
        public string InventoryCode { get; set; }
        public DateTime InventoryDate { get; set; }
        public string ConductedBy { get; set; }
        public string ApprovedBy { get; set; }
        public List<BloodInventoryReportPrintItemDto> Items { get; set; }
        public int TotalSystemQuantity { get; set; }
        public int TotalActualQuantity { get; set; }
        public int TotalVariance { get; set; }
        public string Conclusion { get; set; }
    }

    /// <summary>
    /// Chi tiết biên bản kiểm kê
    /// </summary>
    public class BloodInventoryReportPrintItemDto
    {
        public int RowNumber { get; set; }
        public string ProductTypeName { get; set; }
        public string BloodType { get; set; }
        public string RhFactor { get; set; }
        public int SystemQuantity { get; set; }
        public int ActualQuantity { get; set; }
        public int Variance { get; set; }
        public string Note { get; set; }
    }

    #endregion

    #region Barcode/QRCode

    /// <summary>
    /// Đọc mã vạch túi máu
    /// </summary>
    public class ScanBloodBagDto
    {
        public string BarcodeOrQRCode { get; set; }
    }

    /// <summary>
    /// Kết quả đọc mã vạch
    /// </summary>
    public class ScanBloodBagResultDto
    {
        public bool Found { get; set; }
        public BloodBagDto BloodBag { get; set; }
        public string Message { get; set; }
        public List<string> Warnings { get; set; }
    }

    /// <summary>
    /// In mã vạch túi máu
    /// </summary>
    public class PrintBloodBagBarcodeDto
    {
        public List<Guid> BloodBagIds { get; set; }
        public string LabelFormat { get; set; }
    }

    #endregion

    #region Supplier

    /// <summary>
    /// Nhà cung cấp máu
    /// </summary>
    public class BloodSupplierDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string ContactPerson { get; set; }
        public string License { get; set; }
        public DateTime? LicenseExpiryDate { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion
}
