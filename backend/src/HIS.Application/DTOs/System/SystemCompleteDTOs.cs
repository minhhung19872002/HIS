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

    #region Module 11: Quản lý tài chính

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

    #endregion

    #region Module 13: Quản lý danh mục dùng chung

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
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Module 15: Báo cáo dược

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

    #endregion

    #region Module 16: Quản lý HSBA, KHTH, Báo cáo thống kê

    /// <summary>
    /// Hồ sơ bệnh án lưu trữ
    /// </summary>
    public class MedicalRecordArchiveDto
    {
        public Guid Id { get; set; }
        public string ArchiveCode { get; set; }
        public string AdmissionCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public DateTime AdmissionDate { get; set; }
        public DateTime DischargeDate { get; set; }
        public string DepartmentName { get; set; }
        public string Diagnosis { get; set; }
        public string TreatmentResult { get; set; }
        public string StorageLocation { get; set; }
        public string ShelfNumber { get; set; }
        public string Status { get; set; } // Pending, Archived, Borrowed
        public DateTime? ArchivedDate { get; set; }
        public string ArchivedBy { get; set; }
    }

    /// <summary>
    /// Yêu cầu mượn/trả HSBA
    /// </summary>
    public class MedicalRecordBorrowRequestDto
    {
        public Guid Id { get; set; }
        public string RequestCode { get; set; }
        public Guid RecordId { get; set; }
        public string ArchiveCode { get; set; }
        public string PatientName { get; set; }
        public DateTime RequestDate { get; set; }
        public Guid RequestedById { get; set; }
        public string RequestedByName { get; set; }
        public string Purpose { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }
        public string Status { get; set; } // Pending, Approved, Borrowed, Returned, Rejected
        public DateTime? BorrowedDate { get; set; }
        public DateTime? ReturnedDate { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// Báo cáo thống kê bệnh tật tử vong (TT27 BYT)
    /// </summary>
    public class MorbidityMortalityReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalAdmissions { get; set; }
        public int TotalDeaths { get; set; }
        public decimal MortalityRate { get; set; }
        public List<MorbidityByICD10Dto> ByICD10 { get; set; }
        public List<MortalityByAgeDto> MortalityByAge { get; set; }
    }

    /// <summary>
    /// Bệnh tật theo ICD-10
    /// </summary>
    public class MorbidityByICD10Dto
    {
        public string ICD10Code { get; set; }
        public string DiseaseName { get; set; }
        public int CaseCount { get; set; }
        public int MaleCount { get; set; }
        public int FemaleCount { get; set; }
        public int DeathCount { get; set; }
    }

    /// <summary>
    /// Tử vong theo tuổi
    /// </summary>
    public class MortalityByAgeDto
    {
        public string AgeGroup { get; set; }
        public int DeathCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Báo cáo hoạt động bệnh viện
    /// </summary>
    public class HospitalActivityReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalOutpatients { get; set; }
        public int TotalInpatients { get; set; }
        public int TotalSurgeries { get; set; }
        public int TotalLabTests { get; set; }
        public int TotalRadiologyExams { get; set; }
        public decimal AverageLengthOfStay { get; set; }
        public decimal BedOccupancyRate { get; set; }
        public List<ActivityByDeptDto> ByDepartment { get; set; }
    }

    /// <summary>
    /// Hoạt động theo khoa
    /// </summary>
    public class ActivityByDeptDto
    {
        public string DepartmentName { get; set; }
        public int Admissions { get; set; }
        public int Discharges { get; set; }
        public int Deaths { get; set; }
        public decimal AverageLOS { get; set; }
    }

    /// <summary>
    /// Dashboard thống kê
    /// </summary>
    public class HospitalDashboardDto
    {
        public DateTime ReportDate { get; set; }
        public int TodayOutpatients { get; set; }
        public int TodayAdmissions { get; set; }
        public int TodayDischarges { get; set; }
        public int CurrentInpatients { get; set; }
        public int AvailableBeds { get; set; }
        public int TodaySurgeries { get; set; }
        public int TodayEmergencies { get; set; }
        public decimal TodayRevenue { get; set; }
        public List<DashboardTrendDto> Trends { get; set; }
    }

    /// <summary>
    /// Xu hướng theo ngày
    /// </summary>
    public class DashboardTrendDto
    {
        public DateTime Date { get; set; }
        public int Outpatients { get; set; }
        public int Admissions { get; set; }
        public decimal Revenue { get; set; }
    }

    #endregion

    #region Module 17: Quản trị hệ thống

    /// <summary>
    /// Người dùng hệ thống
    /// </summary>
    public class SystemUserDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public List<string> Roles { get; set; }
        public List<string> Permissions { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public string LastLoginIP { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật người dùng
    /// </summary>
    public class SaveUserDto
    {
        public Guid? Id { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public Guid? DepartmentId { get; set; }
        public List<Guid> RoleIds { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Vai trò
    /// </summary>
    public class RoleDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public List<string> Permissions { get; set; }
        public int UserCount { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Quyền
    /// </summary>
    public class PermissionDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Module { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Máy trạm
    /// </summary>
    public class WorkstationDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string IpAddress { get; set; }
        public string MacAddress { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Location { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastSeen { get; set; }
        public string Status { get; set; }
    }

    /// <summary>
    /// Thông báo hệ thống
    /// </summary>
    public class SystemNotificationDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string NotificationType { get; set; } // Info, Warning, Error, Maintenance
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public List<Guid> TargetWorkstations { get; set; }
        public List<Guid> TargetUsers { get; set; }
        public bool IsActive { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Log hệ thống
    /// </summary>
    public class AuditLogDto
    {
        public Guid Id { get; set; }
        public DateTime LogTime { get; set; }
        public Guid? UserId { get; set; }
        public string Username { get; set; }
        public string Action { get; set; }
        public string Module { get; set; }
        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
    }

    /// <summary>
    /// Khóa dịch vụ
    /// </summary>
    public class ServiceLockDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public string ServiceType { get; set; }
        public string Reason { get; set; }
        public DateTime LockStartTime { get; set; }
        public DateTime? LockEndTime { get; set; }
        public bool IsActive { get; set; }
        public string LockedBy { get; set; }
    }

    /// <summary>
    /// Cấu hình hệ thống
    /// </summary>
    public class SystemConfigDto
    {
        public string Key { get; set; }
        public string Value { get; set; }
        public string DataType { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public bool IsEditable { get; set; }
    }

    /// <summary>
    /// Cấu hình người dùng
    /// </summary>
    public class UserConfigDto
    {
        public Guid UserId { get; set; }
        public string Key { get; set; }
        public string Value { get; set; }
        public string Category { get; set; }
    }

    /// <summary>
    /// Mẫu báo cáo động
    /// </summary>
    public class ReportTemplateDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string TemplateContent { get; set; }
        public string Parameters { get; set; }
        public string OutputFormat { get; set; }
        public bool IsSystem { get; set; }
        public bool IsActive { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion

    #region Additional DTOs for Service Interface

    public class CostByDepartmentDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public decimal TotalCost { get; set; }
        public decimal MedicineCost { get; set; }
        public decimal SupplyCost { get; set; }
        public decimal EquipmentCost { get; set; }
        public decimal PersonnelCost { get; set; }
        public decimal OverheadCost { get; set; }
    }

    public class FinancialSummaryReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal NetProfit { get; set; }
        public List<DeptRevenueItemDto> RevenueByDepartment { get; set; }
        public List<CostByDepartmentDto> CostByDepartment { get; set; }
    }

    public class PatientDebtReportDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public decimal TotalDebt { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public string Status { get; set; }
    }

    public class InsuranceDebtReportDto
    {
        public string Period { get; set; }
        public string InsuranceCode { get; set; }
        public decimal TotalClaimAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal RejectedAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public int ClaimCount { get; set; }
    }

    public class InsuranceReconciliationDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal HospitalAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal Difference { get; set; }
        public List<ReconciliationItemDto> Items { get; set; }
    }

    public class ReconciliationItemDto
    {
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public decimal HospitalAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal Difference { get; set; }
        public string Reason { get; set; }
    }

    #endregion

    #region Module 13 Additional Catalog DTOs

    public class ParaclinicalServiceCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ServiceType { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? InsurancePrice { get; set; }
        public bool IsActive { get; set; }
    }

    public class RoomCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string RoomType { get; set; }
        public int? BedCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class BedCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public Guid RoomId { get; set; }
        public string RoomName { get; set; }
        public string BedType { get; set; }
        public decimal? DailyRate { get; set; }
        public bool IsActive { get; set; }
    }

    public class EmployeeCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string FullName { get; set; }
        public string Position { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public bool IsDoctor { get; set; }
        public bool IsNurse { get; set; }
        public bool IsActive { get; set; }
    }

    public class SupplierCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string SupplierType { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public string TaxCode { get; set; }
        public bool IsActive { get; set; }
    }

    public class ServicePriceCatalogDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public string PriceType { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? InsurancePrice { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class PatientTypeCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal? DiscountRate { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class AdmissionSourceCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class PrintTemplateCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string TemplateType { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string TemplateContent { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class MedicalRecordTemplateCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string TemplateType { get; set; }
        public string TemplateContent { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class ServiceGroupCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string GroupType { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public bool IsActive { get; set; }
    }

    public class MedicineGroupCatalogDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Module 15-17 Additional DTOs

    public class PsychotropicDrugRegisterDto
    {
        public DateTime Date { get; set; }
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class PrecursorDrugRegisterDto
    {
        public DateTime Date { get; set; }
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class DrugStockMovementReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ReceivedQuantity { get; set; }
        public decimal IssuedQuantity { get; set; }
        public decimal AdjustmentQuantity { get; set; }
        public decimal ClosingStock { get; set; }
    }

    public class ExpiringDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysUntilExpiry { get; set; }
        public decimal Quantity { get; set; }
        public decimal Value { get; set; }
    }

    public class ExpiredDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string BatchNumber { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysExpired { get; set; }
        public decimal Quantity { get; set; }
        public decimal Value { get; set; }
    }

    public class LowStockDrugReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal CurrentStock { get; set; }
        public decimal MinStock { get; set; }
        public decimal Shortfall { get; set; }
    }

    public class DrugCostByDeptReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public decimal TotalCost { get; set; }
        public decimal AntibioticCost { get; set; }
        public int PrescriptionCount { get; set; }
    }

    public class DrugCostByPatientReportDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public decimal TotalCost { get; set; }
        public decimal InsuranceCost { get; set; }
        public decimal PatientCost { get; set; }
    }

    public class DrugByPaymentTypeReportDto
    {
        public string PaymentType { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalValue { get; set; }
        public int PrescriptionCount { get; set; }
    }

    public class OutpatientPrescriptionStatDto
    {
        public Guid? DoctorId { get; set; }
        public string DoctorName { get; set; }
        public int PrescriptionCount { get; set; }
        public int PatientCount { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class InpatientPrescriptionStatDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int PatientCount { get; set; }
        public int PrescriptionCount { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class ABCVENReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<ABCVENItemDto> Items { get; set; }
    }

    public class ABCVENItemDto
    {
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string ABCClass { get; set; }
        public string VENClass { get; set; }
        public decimal TotalValue { get; set; }
        public decimal Percentage { get; set; }
    }

    public class DDDReportDto
    {
        public Guid MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public decimal DDDValue { get; set; }
        public decimal TotalDDD { get; set; }
    }

    public class DepartmentStatisticsDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int OutpatientCount { get; set; }
        public int InpatientCount { get; set; }
        public int AdmissionCount { get; set; }
        public int DischargeCount { get; set; }
        public decimal Revenue { get; set; }
    }

    public class ExaminationStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalExaminations { get; set; }
        public int NewPatients { get; set; }
        public int FollowUpPatients { get; set; }
    }

    public class AdmissionStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalAdmissions { get; set; }
        public int EmergencyAdmissions { get; set; }
        public int ElectiveAdmissions { get; set; }
    }

    public class DischargeStatisticsDto
    {
        public DateTime Date { get; set; }
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalDischarges { get; set; }
        public int RecoveredCount { get; set; }
        public int ImprovedCount { get; set; }
        public int DeathCount { get; set; }
    }

    public class MortalityStatisticsDto
    {
        public Guid? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalDeaths { get; set; }
        public int DeathWithin24Hours { get; set; }
        public int DeathAfter24Hours { get; set; }
        public double MortalityRate { get; set; }
    }

    public class DiseaseStatisticsDto
    {
        public string IcdCode { get; set; }
        public string IcdName { get; set; }
        public int TotalCases { get; set; }
        public int OutpatientCases { get; set; }
        public int InpatientCases { get; set; }
    }

    public class DepartmentActivityReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int OutpatientVisits { get; set; }
        public int InpatientAdmissions { get; set; }
        public int Surgeries { get; set; }
        public int LabTests { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class BedOccupancyReportDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int AvailableBeds { get; set; }
        public double OccupancyRate { get; set; }
    }

    public class BYTReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string HospitalName { get; set; }
        public string HospitalCode { get; set; }
        public int TotalOutpatients { get; set; }
        public int TotalInpatients { get; set; }
        public int TotalBeds { get; set; }
    }

    public class HospitalKPIDto
    {
        public string KPIName { get; set; }
        public string KPICategory { get; set; }
        public decimal TargetValue { get; set; }
        public decimal ActualValue { get; set; }
        public double Achievement { get; set; }
        public string Unit { get; set; }
    }

    public class UserSessionDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
        public DateTime LoginTime { get; set; }
        public DateTime? LastActivityTime { get; set; }
        public bool IsActive { get; set; }
    }

    public class BackupHistoryDto
    {
        public Guid Id { get; set; }
        public string BackupName { get; set; }
        public string BackupType { get; set; }
        public string FilePath { get; set; }
        public long FileSize { get; set; }
        public DateTime BackupDate { get; set; }
        public string BackupBy { get; set; }
        public string Status { get; set; }
    }

    public class SystemHealthDto
    {
        public string Status { get; set; }
        public double CpuUsage { get; set; }
        public double MemoryUsage { get; set; }
        public double DiskUsage { get; set; }
        public string DatabaseStatus { get; set; }
        public DateTime LastCheckTime { get; set; }
    }

    public class SystemResourceDto
    {
        public string ResourceName { get; set; }
        public string ResourceType { get; set; }
        public double CurrentValue { get; set; }
        public double MaxValue { get; set; }
        public double UtilizationPercentage { get; set; }
    }

    public class DatabaseStatisticsDto
    {
        public string TableName { get; set; }
        public long RowCount { get; set; }
        public long DataSize { get; set; }
        public long IndexSize { get; set; }
    }

    public class IntegrationConfigDto
    {
        public Guid Id { get; set; }
        public string IntegrationName { get; set; }
        public string IntegrationType { get; set; }
        public string Endpoint { get; set; }
        public string AuthType { get; set; }
        public bool IsActive { get; set; }
    }

    public class IntegrationLogDto
    {
        public Guid Id { get; set; }
        public Guid IntegrationId { get; set; }
        public string IntegrationName { get; set; }
        public DateTime RequestTime { get; set; }
        public DateTime? ResponseTime { get; set; }
        public string Status { get; set; }
        public string ErrorMessage { get; set; }
    }

    #endregion
}
