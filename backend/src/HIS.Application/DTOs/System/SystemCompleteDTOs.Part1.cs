using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.System
{
    /// <summary>
    /// Complete System Management DTOs
    /// Module 11: Quản lý tài chính - 9 chức năng
    /// Module 13: Quản lý danh mục - 17 chức năng
    /// Module 15: Báo cáo dược - 17 chức năng
    /// Module 16: HSBA, KHTH - 12 chức năng
    /// Module 17: Quản trị hệ thống - 10 chức năng
    /// </summary>


    /// <summary>
    /// Hạch toán doanh thu khoa phòng chỉ định
    /// </summary>
    public class RevenueByOrderingDeptDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal ServiceRevenue { get; set; }
        public List<DeptRevenueItemDto> ByDepartment { get; set; }
    }

    /// <summary>
    /// Hạch toán doanh thu khoa phòng thực hiện
    /// </summary>
    public class RevenueByExecutingDeptDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal ServiceRevenue { get; set; }
        public List<DeptRevenueItemDto> ByDepartment { get; set; }
    }

    /// <summary>
    /// Chi tiết doanh thu theo khoa
    /// </summary>
    public class DeptRevenueItemDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal ServiceRevenue { get; set; }
        public int PatientCount { get; set; }
        public int ServiceCount { get; set; }
    }

    /// <summary>
    /// Hạch toán doanh thu theo dịch vụ kỹ thuật
    /// </summary>
    public class RevenueByServiceDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<ServiceRevenueItemDto> ByService { get; set; }
    }

    /// <summary>
    /// Chi tiết doanh thu theo dịch vụ
    /// </summary>
    public class ServiceRevenueItemDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public string ServiceGroup { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
    }

    /// <summary>
    /// Hạch toán doanh thu theo nhóm dịch vụ
    /// </summary>
    public class RevenueByServiceGroupDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<ServiceGroupRevenueDto> ByGroup { get; set; }
    }

    /// <summary>
    /// Chi tiết doanh thu theo nhóm
    /// </summary>
    public class ServiceGroupRevenueDto
    {
        public string GroupCode { get; set; }
        public string GroupName { get; set; } // XN, CĐHA, TDCN, PTTT
        public int ServiceCount { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
    }

    /// <summary>
    /// Hạch toán doanh thu theo hóa đơn
    /// </summary>
    public class RevenueByInvoiceDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string PatientType { get; set; } // Inpatient, Outpatient
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public int InvoiceCount { get; set; }
        public List<InvoiceRevenueItemDto> Invoices { get; set; }
    }

    /// <summary>
    /// Chi tiết hóa đơn
    /// </summary>
    public class InvoiceRevenueItemDto
    {
        public string InvoiceCode { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string PaymentType { get; set; } // BHYT, Viện phí, Dịch vụ
        public decimal Amount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal PatientAmount { get; set; }
    }

    /// <summary>
    /// Hạch toán tạm ứng, hoàn ứng
    /// </summary>
    public class DepositRefundReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string PatientType { get; set; }
        public decimal TotalDeposit { get; set; }
        public decimal TotalRefund { get; set; }
        public decimal Balance { get; set; }
        public List<DepositRefundItemDto> Transactions { get; set; }
    }

    /// <summary>
    /// Chi tiết tạm ứng/hoàn ứng
    /// </summary>
    public class DepositRefundItemDto
    {
        public string TransactionCode { get; set; }
        public DateTime TransactionDate { get; set; }
        public string TransactionType { get; set; } // Deposit, Refund
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public decimal Amount { get; set; }
        public string CashierName { get; set; }
    }

    /// <summary>
    /// Báo cáo chi phí bệnh nhân
    /// </summary>
    public class PatientCostReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<PatientCostItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết chi phí bệnh nhân
    /// </summary>
    public class PatientCostItemDto
    {
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string DepartmentName { get; set; }
        public decimal MedicineCost { get; set; }
        public decimal SupplyCost { get; set; }
        public decimal ServiceCost { get; set; }
        public decimal BedCost { get; set; }
        public decimal TotalCost { get; set; }
    }

    /// <summary>
    /// Hạch toán doanh thu, lợi nhuận PTTT
    /// </summary>
    public class SurgeryProfitReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal ProfitMargin { get; set; }
        public List<SurgeryProfitItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết lợi nhuận PTTT
    /// </summary>
    public class SurgeryProfitItemDto
    {
        public string SurgeryCode { get; set; }
        public string SurgeryName { get; set; }
        public string SurgeryType { get; set; }
        public int Count { get; set; }
        public decimal Revenue { get; set; }
        public decimal MedicineCost { get; set; }
        public decimal SupplyCost { get; set; }
        public decimal LaborCost { get; set; }
        public decimal TotalCost { get; set; }
        public decimal Profit { get; set; }
    }



    /// <summary>
    /// Danh mục dịch vụ khám bệnh
    /// </summary>
    public class ExaminationServiceCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EquivalentCode { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public string TT37Code { get; set; }
        public string TT15Code { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục dịch vụ kỹ thuật (XN, CĐHA, TDCN, PTTT)
    /// </summary>
    public class TechnicalServiceCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ServiceType { get; set; } // XN, CDHA, TDCN, PTTT, NguoiGiuong
        public string EquivalentCode { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public string TT37Code { get; set; }
        public string TT15Code { get; set; }
        public string SurgeryType { get; set; } // For PTTT: Loại 1, Loại 2, Loại 3, Đặc biệt
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục khoa, phòng, kho
    /// </summary>
    public class DepartmentCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string DepartmentType { get; set; } // Clinical, Paraclinical, Administrative, Warehouse
        public string BYTDeptCode { get; set; }
        public string BYTRoomCode { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục đường dùng
    /// </summary>
    public class RouteOfAdministrationDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string BYTCode { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục hoạt chất
    /// </summary>
    public class ActiveIngredientDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string BYTCode { get; set; }
        public string TT40Code { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục thuốc
    /// </summary>
    public class MedicineCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EquivalentCode { get; set; }
        public string RegistrationNumber { get; set; }
        public Guid? ActiveIngredientId { get; set; }
        public string ActiveIngredientName { get; set; }
        public string Concentration { get; set; }
        public string Unit { get; set; }
        public string PackageUnit { get; set; }
        public decimal PackageQuantity { get; set; }
        public string Manufacturer { get; set; }
        public string Country { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public string BidCode { get; set; }
        public string BidGroup { get; set; }
        public string BidPackage { get; set; }
        public DateTime? BidDate { get; set; }
        public Guid? RouteId { get; set; }
        public string RouteName { get; set; }
        public bool IsNarcotic { get; set; }
        public bool IsPsychotropic { get; set; }
        public bool IsPrecursor { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục vật tư y tế
    /// </summary>
    public class MedicalSupplyCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EquivalentCode { get; set; }
        public string RegistrationNumber { get; set; }
        public string Specification { get; set; }
        public string Unit { get; set; }
        public string Manufacturer { get; set; }
        public string Country { get; set; }
        public decimal Price { get; set; }
        public decimal InsurancePrice { get; set; }
        public string BidCode { get; set; }
        public string BidGroup { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục người dùng
    /// </summary>
    public class UserCatalogDto
    {
        public Guid Id { get; set; }
        public string UserCode { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Title { get; set; }
        public string LicenseNumber { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public List<string> Roles { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục ICD-10
    /// </summary>
    public class ICD10CatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string EnglishName { get; set; }
        public string ChapterCode { get; set; }
        public string ChapterName { get; set; }
        public string GroupCode { get; set; }
        public string GroupName { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục kết quả điều trị
    /// </summary>
    public class TreatmentResultCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string BYTCode { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Danh mục máy y tế
    /// </summary>
    public class MedicalEquipmentCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string SerialNumber { get; set; }
        public string Model { get; set; }
        public string Manufacturer { get; set; }
        public string PurchaseSource { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public DateTime? WarrantyExpiry { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Status { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Thuật ngữ lâm sàng (Clinical Term)
    /// </summary>
    public class ClinicalTermCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEnglish { get; set; }
        public string Category { get; set; } // Symptom, Sign, Examination, ReviewOfSystems, Procedure, Other
        public string BodySystem { get; set; } // Cardiovascular, Respiratory, GI, Neuro, MSK, Skin, General
        public string Description { get; set; }
        public string? SnomedCtCode { get; set; }
        public string? SnomedCtDisplay { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Chi nhánh bệnh viện DTO (NangCap15 1.21)
    /// </summary>
    public class HospitalBranchDto
    {
        public Guid? Id { get; set; }
        public string BranchCode { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public Guid? ParentBranchId { get; set; }
        public string? ParentBranchName { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsHeadquarters { get; set; } = false;
        public int ChildCount { get; set; }
    }

    public class SnomedIcdMappingDto
    {
        public Guid Id { get; set; }
        public string IcdCode { get; set; } = string.Empty;
        public string IcdName { get; set; } = string.Empty;
        public string SnomedCtCode { get; set; } = string.Empty;
        public string SnomedCtDisplay { get; set; } = string.Empty;
        public string? MapGroup { get; set; }
        public int MapPriority { get; set; } = 1;
        public string MapRule { get; set; } = "EQUIVALENT";
        public bool IsActive { get; set; } = true;
    }



    /// <summary>
    /// Sổ thuốc gây nghiện, hướng thần (Phụ lục VIII - TT20/2017)
    /// </summary>
    public class NarcoticDrugRegisterDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string DrugType { get; set; } // Narcotic, Psychotropic, Precursor
        public List<NarcoticDrugRegisterItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sổ thuốc GN/HT
    /// </summary>
    public class NarcoticDrugRegisterItemDto
    {
        public int RowNumber { get; set; }
        public DateTime TransactionDate { get; set; }
        public string TransactionType { get; set; } // Import, Export
        public string DocumentCode { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string LotNumber { get; set; }
        public string Unit { get; set; }
        public decimal ImportQuantity { get; set; }
        public decimal ExportQuantity { get; set; }
        public decimal Balance { get; set; }
        public string RecipientInfo { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Báo cáo xuất nhập tồn thuốc GN/HT/TC (Phụ lục X - TT20/2017)
    /// </summary>
    public class NarcoticDrugInventoryReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ReportPeriod { get; set; } // Monthly, Quarterly, Yearly
        public List<NarcoticDrugInventoryItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết báo cáo xuất nhập tồn GN/HT
    /// </summary>
    public class NarcoticDrugInventoryItemDto
    {
        public int RowNumber { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string Unit { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ImportQuantity { get; set; }
        public decimal ExportQuantity { get; set; }
        public decimal ClosingStock { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Báo cáo công tác khoa Dược (Mẫu 10D/BV-01/TT22)
    /// </summary>
    public class PharmacyActivityReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalPrescriptions { get; set; }
        public int InsurancePrescriptions { get; set; }
        public int OutOfPocketPrescriptions { get; set; }
        public decimal TotalMedicineValue { get; set; }
        public decimal InsuranceMedicineValue { get; set; }
        public List<PharmacyActivityByDeptDto> ByDepartment { get; set; }
    }

    /// <summary>
    /// Chi tiết theo khoa
    /// </summary>
    public class PharmacyActivityByDeptDto
    {
        public string DepartmentName { get; set; }
        public int PrescriptionCount { get; set; }
        public decimal MedicineValue { get; set; }
    }

    /// <summary>
    /// Báo cáo sử dụng thuốc (Mẫu 05D/BV-01/TT22)
    /// </summary>
    public class MedicineUsageReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<MedicineUsageItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sử dụng thuốc
    /// </summary>
    public class MedicineUsageItemDto
    {
        public int RowNumber { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string ActiveIngredient { get; set; }
        public string Unit { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalValue { get; set; }
    }

    /// <summary>
    /// Báo cáo sử dụng kháng sinh (Mẫu 06D/BV-01/TT22)
    /// </summary>
    public class AntibioticUsageReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalPatients { get; set; }
        public int PatientsWithAntibiotics { get; set; }
        public decimal AntibioticUsageRate { get; set; }
        public List<AntibioticUsageItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết sử dụng kháng sinh
    /// </summary>
    public class AntibioticUsageItemDto
    {
        public string AntibioticName { get; set; }
        public string AntibioticGroup { get; set; }
        public int PatientCount { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public decimal Value { get; set; }
    }

    /// <summary>
    /// Biên bản kiểm kê (Mẫu 11D/BV-01/TT22)
    /// </summary>
    public class InventoryRecordDto
    {
        public Guid Id { get; set; }
        public string RecordCode { get; set; }
        public DateTime InventoryDate { get; set; }
        public Guid WarehouseId { get; set; }
        public string WarehouseName { get; set; }
        public string ItemType { get; set; } // Medicine, Chemical, Supply
        public string Status { get; set; }
        public string ConductedBy { get; set; }
        public string ApprovedBy { get; set; }
        public List<InventoryRecordItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết biên bản kiểm kê
    /// </summary>
    public class InventoryRecordItemDto
    {
        public int RowNumber { get; set; }
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string LotNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string Unit { get; set; }
        public decimal SystemQuantity { get; set; }
        public decimal ActualQuantity { get; set; }
        public decimal Variance { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal VarianceValue { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Thống kê 15 ngày sử dụng (Mẫu 16D/BV-01/TT23)
    /// </summary>
    public class FifteenDayUsageReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ItemType { get; set; }
        public List<FifteenDayUsageItemDto> Items { get; set; }
    }

    /// <summary>
    /// Chi tiết thống kê 15 ngày
    /// </summary>
    public class FifteenDayUsageItemDto
    {
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string Unit { get; set; }
        public decimal Day1 { get; set; }
        public decimal Day2 { get; set; }
        public decimal Day3 { get; set; }
        public decimal Day4 { get; set; }
        public decimal Day5 { get; set; }
        public decimal Day6 { get; set; }
        public decimal Day7 { get; set; }
        public decimal Day8 { get; set; }
        public decimal Day9 { get; set; }
        public decimal Day10 { get; set; }
        public decimal Day11 { get; set; }
        public decimal Day12 { get; set; }
        public decimal Day13 { get; set; }
        public decimal Day14 { get; set; }
        public decimal Day15 { get; set; }
        public decimal Total { get; set; }
    }


}
