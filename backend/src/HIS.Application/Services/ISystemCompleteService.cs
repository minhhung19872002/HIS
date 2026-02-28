using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.System;

namespace HIS.Application.Services
{
    /// <summary>
    /// Complete System Service Interface
    /// Covers Modules: 11 (Tài chính), 13 (Danh mục), 15 (Báo cáo Dược), 16 (HSBA & Thống kê), 17 (Quản trị)
    /// </summary>
    public interface ISystemCompleteService
    {
        #region Module 11: Quản lý Tài chính Kế toán - 9 chức năng

        /// <summary>
        /// 11.1 Báo cáo doanh thu theo khoa chỉ định
        /// </summary>
        Task<List<RevenueByOrderingDeptDto>> GetRevenueByOrderingDeptAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string revenueType = null);

        /// <summary>
        /// 11.2 Báo cáo doanh thu theo khoa thực hiện
        /// </summary>
        Task<List<RevenueByExecutingDeptDto>> GetRevenueByExecutingDeptAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string revenueType = null);

        /// <summary>
        /// 11.3 Báo cáo doanh thu theo dịch vụ
        /// </summary>
        Task<List<RevenueByServiceDto>> GetRevenueByServiceAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? serviceGroupId = null,
            Guid? serviceId = null);

        /// <summary>
        /// 11.4 Báo cáo lợi nhuận phẫu thuật/thủ thuật
        /// </summary>
        Task<List<SurgeryProfitReportDto>> GetSurgeryProfitReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            Guid? surgeryId = null);

        /// <summary>
        /// 11.5 Báo cáo chi phí theo khoa phòng
        /// </summary>
        Task<List<CostByDepartmentDto>> GetCostByDepartmentAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string costType = null);

        /// <summary>
        /// 11.6 Báo cáo thu chi tổng hợp
        /// </summary>
        Task<FinancialSummaryReportDto> GetFinancialSummaryReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// 11.7 Báo cáo công nợ bệnh nhân
        /// </summary>
        Task<List<PatientDebtReportDto>> GetPatientDebtReportAsync(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string debtStatus = null);

        /// <summary>
        /// 11.8 Báo cáo công nợ BHYT
        /// </summary>
        Task<List<InsuranceDebtReportDto>> GetInsuranceDebtReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string insuranceCode = null);

        /// <summary>
        /// 11.9 Báo cáo đối soát BHYT
        /// </summary>
        Task<InsuranceReconciliationDto> GetInsuranceReconciliationAsync(
            DateTime fromDate,
            DateTime toDate,
            string insuranceCode = null);

        /// <summary>
        /// In báo cáo tài chính
        /// </summary>
        Task<byte[]> PrintFinancialReportAsync(FinancialReportRequest request);

        /// <summary>
        /// Xuất Excel báo cáo tài chính
        /// </summary>
        Task<byte[]> ExportFinancialReportToExcelAsync(FinancialReportRequest request);

        #endregion

        #region Module 13: Quản lý Danh mục - 17 chức năng

        // 13.1 Quản lý danh mục dịch vụ khám
        Task<List<ExaminationServiceCatalogDto>> GetExaminationServicesAsync(string keyword = null, bool? isActive = null);
        Task<ExaminationServiceCatalogDto> GetExaminationServiceAsync(Guid serviceId);
        Task<ExaminationServiceCatalogDto> SaveExaminationServiceAsync(ExaminationServiceCatalogDto dto);
        Task<bool> DeleteExaminationServiceAsync(Guid serviceId);

        // 13.2 Quản lý danh mục dịch vụ cận lâm sàng
        Task<List<ParaclinicalServiceCatalogDto>> GetParaclinicalServicesAsync(string keyword = null, string serviceType = null, bool? isActive = null);
        Task<ParaclinicalServiceCatalogDto> GetParaclinicalServiceAsync(Guid serviceId);
        Task<ParaclinicalServiceCatalogDto> SaveParaclinicalServiceAsync(ParaclinicalServiceCatalogDto dto);
        Task<bool> DeleteParaclinicalServiceAsync(Guid serviceId);

        // 13.3 Quản lý danh mục thuốc
        Task<List<MedicineCatalogDto>> GetMedicinesAsync(MedicineCatalogSearchDto search);
        Task<MedicineCatalogDto> GetMedicineAsync(Guid medicineId);
        Task<MedicineCatalogDto> SaveMedicineAsync(MedicineCatalogDto dto);
        Task<bool> DeleteMedicineAsync(Guid medicineId);
        Task<bool> ImportMedicinesFromExcelAsync(byte[] fileData);
        Task<byte[]> ExportMedicinesToExcelAsync(MedicineCatalogSearchDto search);

        // 13.4 Quản lý danh mục vật tư y tế
        Task<List<MedicalSupplyCatalogDto>> GetMedicalSuppliesAsync(string keyword = null, Guid? categoryId = null, bool? isActive = null);
        Task<MedicalSupplyCatalogDto> GetMedicalSupplyAsync(Guid supplyId);
        Task<MedicalSupplyCatalogDto> SaveMedicalSupplyAsync(MedicalSupplyCatalogDto dto);
        Task<bool> DeleteMedicalSupplyAsync(Guid supplyId);
        Task<bool> ImportMedicalSuppliesFromExcelAsync(byte[] fileData);
        Task<byte[]> ExportMedicalSuppliesToExcelAsync(string keyword = null, Guid? categoryId = null);

        // 13.5 Quản lý danh mục ICD-10
        Task<List<ICD10CatalogDto>> GetICD10CodesAsync(string keyword = null, string chapterCode = null, bool? isActive = null);
        Task<ICD10CatalogDto> GetICD10CodeAsync(Guid icd10Id);
        Task<ICD10CatalogDto> SaveICD10CodeAsync(ICD10CatalogDto dto);
        Task<bool> DeleteICD10CodeAsync(Guid icd10Id);
        Task<bool> ImportICD10FromExcelAsync(byte[] fileData);
        Task<byte[]> ExportICD10ToExcelAsync(string chapterCode = null);

        // 13.6 Quản lý danh mục khoa phòng
        Task<List<DepartmentCatalogDto>> GetDepartmentsAsync(string keyword = null, string departmentType = null, bool? isActive = null);
        Task<DepartmentCatalogDto> GetDepartmentAsync(Guid departmentId);
        Task<DepartmentCatalogDto> SaveDepartmentAsync(DepartmentCatalogDto dto);
        Task<bool> DeleteDepartmentAsync(Guid departmentId);

        // 13.7 Quản lý danh mục phòng bệnh/giường
        Task<List<RoomCatalogDto>> GetRoomsAsync(Guid? departmentId = null, string roomType = null, bool? isActive = null);
        Task<RoomCatalogDto> GetRoomAsync(Guid roomId);
        Task<RoomCatalogDto> SaveRoomAsync(RoomCatalogDto dto);
        Task<bool> DeleteRoomAsync(Guid roomId);
        Task<List<BedCatalogDto>> GetBedsAsync(Guid? roomId = null, bool? isActive = null);
        Task<BedCatalogDto> GetBedAsync(Guid bedId);
        Task<BedCatalogDto> SaveBedAsync(BedCatalogDto dto);
        Task<bool> DeleteBedAsync(Guid bedId);

        // 13.8 Quản lý danh mục nhân viên
        Task<List<EmployeeCatalogDto>> GetEmployeesAsync(string keyword = null, Guid? departmentId = null, string position = null, bool? isActive = null);
        Task<EmployeeCatalogDto> GetEmployeeAsync(Guid employeeId);
        Task<EmployeeCatalogDto> SaveEmployeeAsync(EmployeeCatalogDto dto);
        Task<bool> DeleteEmployeeAsync(Guid employeeId);

        // 13.9 Quản lý danh mục nhà cung cấp
        Task<List<SupplierCatalogDto>> GetSuppliersAsync(string keyword = null, string supplierType = null, bool? isActive = null);
        Task<SupplierCatalogDto> GetSupplierAsync(Guid supplierId);
        Task<SupplierCatalogDto> SaveSupplierAsync(SupplierCatalogDto dto);
        Task<bool> DeleteSupplierAsync(Guid supplierId);

        // 13.10 Quản lý danh mục giá viện phí
        Task<List<ServicePriceCatalogDto>> GetServicePricesAsync(Guid? serviceId = null, string priceType = null, DateTime? effectiveDate = null);
        Task<ServicePriceCatalogDto> GetServicePriceAsync(Guid priceId);
        Task<ServicePriceCatalogDto> SaveServicePriceAsync(ServicePriceCatalogDto dto);
        Task<bool> DeleteServicePriceAsync(Guid priceId);
        Task<bool> ImportServicePricesFromExcelAsync(byte[] fileData, DateTime effectiveDate);
        Task<byte[]> ExportServicePricesToExcelAsync(string priceType = null);

        // 13.11 Quản lý danh mục đối tượng bệnh nhân
        Task<List<PatientTypeCatalogDto>> GetPatientTypesAsync(bool? isActive = null);
        Task<PatientTypeCatalogDto> GetPatientTypeAsync(Guid patientTypeId);
        Task<PatientTypeCatalogDto> SavePatientTypeAsync(PatientTypeCatalogDto dto);
        Task<bool> DeletePatientTypeAsync(Guid patientTypeId);

        // 13.12 Quản lý danh mục nguồn nhập viện
        Task<List<AdmissionSourceCatalogDto>> GetAdmissionSourcesAsync(bool? isActive = null);
        Task<AdmissionSourceCatalogDto> GetAdmissionSourceAsync(Guid sourceId);
        Task<AdmissionSourceCatalogDto> SaveAdmissionSourceAsync(AdmissionSourceCatalogDto dto);
        Task<bool> DeleteAdmissionSourceAsync(Guid sourceId);

        // 13.13 Quản lý mẫu phiếu in
        Task<List<PrintTemplateCatalogDto>> GetPrintTemplatesAsync(string templateType = null, Guid? departmentId = null, bool? isActive = null);
        Task<PrintTemplateCatalogDto> GetPrintTemplateAsync(Guid templateId);
        Task<PrintTemplateCatalogDto> SavePrintTemplateAsync(PrintTemplateCatalogDto dto);
        Task<bool> DeletePrintTemplateAsync(Guid templateId);

        // 13.14 Quản lý mẫu bệnh án
        Task<List<MedicalRecordTemplateCatalogDto>> GetMedicalRecordTemplatesAsync(string templateType = null, bool? isActive = null);
        Task<MedicalRecordTemplateCatalogDto> GetMedicalRecordTemplateAsync(Guid templateId);
        Task<MedicalRecordTemplateCatalogDto> SaveMedicalRecordTemplateAsync(MedicalRecordTemplateCatalogDto dto);
        Task<bool> DeleteMedicalRecordTemplateAsync(Guid templateId);

        // 13.15 Quản lý nhóm dịch vụ
        Task<List<ServiceGroupCatalogDto>> GetServiceGroupsAsync(string groupType = null, bool? isActive = null);
        Task<ServiceGroupCatalogDto> GetServiceGroupAsync(Guid groupId);
        Task<ServiceGroupCatalogDto> SaveServiceGroupAsync(ServiceGroupCatalogDto dto);
        Task<bool> DeleteServiceGroupAsync(Guid groupId);

        // 13.16 Quản lý nhóm thuốc
        Task<List<MedicineGroupCatalogDto>> GetMedicineGroupsAsync(bool? isActive = null);
        Task<MedicineGroupCatalogDto> GetMedicineGroupAsync(Guid groupId);
        Task<MedicineGroupCatalogDto> SaveMedicineGroupAsync(MedicineGroupCatalogDto dto);
        Task<bool> DeleteMedicineGroupAsync(Guid groupId);

        // 13.17 Thuật ngữ lâm sàng (Clinical Terms)
        Task<List<ClinicalTermCatalogDto>> GetClinicalTermsAsync(string keyword = null, string category = null, string bodySystem = null, bool? isActive = null);
        Task<ClinicalTermCatalogDto> GetClinicalTermAsync(Guid termId);
        Task<ClinicalTermCatalogDto> SaveClinicalTermAsync(ClinicalTermCatalogDto dto);
        Task<bool> DeleteClinicalTermAsync(Guid termId);

        // SNOMED CT Mapping
        Task<List<SnomedIcdMappingDto>> GetSnomedMappingsAsync(string? keyword, string? icdCode);
        Task<SnomedIcdMappingDto> SaveSnomedMappingAsync(SnomedIcdMappingDto dto);
        Task<bool> DeleteSnomedMappingAsync(Guid mappingId);
        Task<List<SnomedIcdMappingDto>> SearchSnomedByIcdAsync(string icdCode);

        // 13.18 Đồng bộ danh mục BHXH
        Task<SyncResultDto> SyncBHXHMedicinesAsync();
        Task<SyncResultDto> SyncBHXHServicesAsync();
        Task<SyncResultDto> SyncBHXHICD10Async();
        Task<DateTime?> GetLastSyncDateAsync(string syncType);

        #endregion

        #region Module 15: Báo cáo Dược - 17 chức năng

        // 15.1 Sổ theo dõi thuốc gây nghiện
        Task<List<NarcoticDrugRegisterDto>> GetNarcoticDrugRegisterAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null);

        // 15.2 Sổ theo dõi thuốc hướng thần
        Task<List<PsychotropicDrugRegisterDto>> GetPsychotropicDrugRegisterAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null);

        // 15.3 Sổ theo dõi thuốc tiền chất
        Task<List<PrecursorDrugRegisterDto>> GetPrecursorDrugRegisterAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null);

        // 15.4 Báo cáo sử dụng thuốc theo TT20/2017
        Task<List<MedicineUsageReportDto>> GetMedicineUsageReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? medicineId = null,
            Guid? departmentId = null);

        // 15.5 Báo cáo sử dụng kháng sinh
        Task<List<AntibioticUsageReportDto>> GetAntibioticUsageReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? antibioticId = null,
            Guid? departmentId = null);

        // 15.6 Sổ kiểm kê thuốc (TT22)
        Task<List<InventoryRecordDto>> GetDrugInventoryRecordAsync(
            DateTime inventoryDate,
            Guid warehouseId);

        // 15.7 Báo cáo xuất nhập tồn kho thuốc
        Task<List<DrugStockMovementReportDto>> GetDrugStockMovementReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null,
            Guid? medicineGroupId = null);

        // 15.8 Báo cáo thuốc sắp hết hạn
        Task<List<ExpiringDrugReportDto>> GetExpiringDrugReportAsync(
            int daysUntilExpiry = 90,
            Guid? warehouseId = null);

        // 15.9 Báo cáo thuốc đã hết hạn
        Task<List<ExpiredDrugReportDto>> GetExpiredDrugReportAsync(
            Guid? warehouseId = null);

        // 15.10 Báo cáo thuốc tồn kho dưới mức tối thiểu
        Task<List<LowStockDrugReportDto>> GetLowStockDrugReportAsync(
            Guid? warehouseId = null);

        // 15.11 Báo cáo chi phí thuốc theo khoa
        Task<List<DrugCostByDeptReportDto>> GetDrugCostByDeptReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        // 15.12 Báo cáo chi phí thuốc theo bệnh nhân
        Task<List<DrugCostByPatientReportDto>> GetDrugCostByPatientReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? patientId = null,
            string patientType = null);

        // 15.13 Báo cáo thuốc BHYT/Viện phí
        Task<List<DrugByPaymentTypeReportDto>> GetDrugByPaymentTypeReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string paymentType = null);

        // 15.14 Thống kê đơn thuốc ngoại trú
        Task<List<OutpatientPrescriptionStatDto>> GetOutpatientPrescriptionStatAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? doctorId = null,
            Guid? departmentId = null);

        // 15.15 Thống kê đơn thuốc nội trú
        Task<List<InpatientPrescriptionStatDto>> GetInpatientPrescriptionStatAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        // 15.16 Báo cáo ABC/VEN
        Task<ABCVENReportDto> GetABCVENReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null);

        // 15.17 Báo cáo DDD (Defined Daily Dose)
        Task<List<DDDReportDto>> GetDDDReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? medicineId = null);

        // In báo cáo dược
        Task<byte[]> PrintPharmacyReportAsync(PharmacyReportRequest request);
        Task<byte[]> ExportPharmacyReportToExcelAsync(PharmacyReportRequest request);

        #endregion

        #region Module 16: HSBA & Thống kê - 12 chức năng

        // 16.1 Quản lý lưu trữ hồ sơ bệnh án
        Task<List<MedicalRecordArchiveDto>> GetMedicalRecordArchivesAsync(
            string keyword = null,
            int? year = null,
            string archiveStatus = null,
            Guid? departmentId = null);

        Task<MedicalRecordArchiveDto> GetMedicalRecordArchiveAsync(Guid archiveId);
        Task<MedicalRecordArchiveDto> SaveMedicalRecordArchiveAsync(MedicalRecordArchiveDto dto);
        Task<bool> UpdateArchiveLocationAsync(Guid archiveId, string location);

        // 16.2 Quản lý mượn trả hồ sơ
        Task<List<MedicalRecordBorrowRequestDto>> GetBorrowRequestsAsync(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string status = null,
            Guid? borrowerId = null);

        Task<MedicalRecordBorrowRequestDto> GetBorrowRequestAsync(Guid requestId);
        Task<MedicalRecordBorrowRequestDto> CreateBorrowRequestAsync(CreateBorrowRequestDto dto);
        Task<bool> ApproveBorrowRequestAsync(Guid requestId);
        Task<bool> RejectBorrowRequestAsync(Guid requestId, string reason);
        Task<bool> ProcessBorrowAsync(Guid requestId);
        Task<bool> ReturnMedicalRecordAsync(Guid requestId, string note);

        // 16.3 Dashboard thống kê bệnh viện
        Task<HospitalDashboardDto> GetHospitalDashboardAsync(DateTime? date = null);
        Task<List<DepartmentStatisticsDto>> GetDepartmentStatisticsAsync(DateTime fromDate, DateTime toDate);

        // 16.4 Báo cáo khám bệnh
        Task<List<ExaminationStatisticsDto>> GetExaminationStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            Guid? doctorId = null);

        // 16.5 Báo cáo nhập viện
        Task<List<AdmissionStatisticsDto>> GetAdmissionStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string admissionSource = null);

        // 16.6 Báo cáo xuất viện
        Task<List<DischargeStatisticsDto>> GetDischargeStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string dischargeType = null);

        // 16.7 Báo cáo tử vong
        Task<List<MortalityStatisticsDto>> GetMortalityStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        // 16.8 Báo cáo bệnh theo ICD-10
        Task<List<DiseaseStatisticsDto>> GetDiseaseStatisticsAsync(
            DateTime fromDate,
            DateTime toDate,
            string icdChapter = null,
            Guid? departmentId = null);

        // 16.9 Báo cáo hoạt động khoa
        Task<List<DepartmentActivityReportDto>> GetDepartmentActivityReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        // 16.10 Báo cáo công suất giường bệnh
        Task<List<BedOccupancyReportDto>> GetBedOccupancyReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        // 16.11 Báo cáo A1-A2-A3 (BYT)
        Task<BYTReportDto> GetBYTReportAsync(DateTime fromDate, DateTime toDate);

        // 16.12 Báo cáo chỉ số KPI bệnh viện
        Task<List<HospitalKPIDto>> GetHospitalKPIsAsync(
            DateTime fromDate,
            DateTime toDate);

        // In báo cáo thống kê
        Task<byte[]> PrintStatisticsReportAsync(StatisticsReportRequest request);
        Task<byte[]> ExportStatisticsReportToExcelAsync(StatisticsReportRequest request);

        #endregion

        #region Module 17: Quản trị Hệ thống - 10 chức năng

        // 17.1 Quản lý người dùng
        Task<List<SystemUserDto>> GetUsersAsync(string keyword = null, Guid? departmentId = null, bool? isActive = null);
        Task<SystemUserDto> GetUserAsync(Guid userId);
        Task<SystemUserDto> CreateUserAsync(CreateUserDto dto);
        Task<SystemUserDto> UpdateUserAsync(Guid userId, UpdateUserDto dto);
        Task<bool> DeleteUserAsync(Guid userId);
        Task<bool> ResetPasswordAsync(Guid userId);
        Task<bool> ChangePasswordAsync(Guid userId, AdminChangePasswordDto dto);
        Task<bool> LockUserAsync(Guid userId, string reason);
        Task<bool> UnlockUserAsync(Guid userId);

        // 17.2 Quản lý vai trò
        Task<List<RoleDto>> GetRolesAsync(bool? isActive = null);
        Task<RoleDto> GetRoleAsync(Guid roleId);
        Task<RoleDto> SaveRoleAsync(RoleDto dto);
        Task<bool> DeleteRoleAsync(Guid roleId);

        // 17.3 Quản lý quyền
        Task<List<PermissionDto>> GetPermissionsAsync(string module = null);
        Task<List<PermissionDto>> GetRolePermissionsAsync(Guid roleId);
        Task<bool> UpdateRolePermissionsAsync(Guid roleId, List<Guid> permissionIds);
        Task<List<PermissionDto>> GetUserPermissionsAsync(Guid userId);
        Task<bool> UpdateUserPermissionsAsync(Guid userId, List<Guid> permissionIds);

        // 17.4 Nhật ký hệ thống
        Task<List<AuditLogDto>> GetAuditLogsAsync(AuditLogSearchDto search);
        Task<AuditLogDto> GetAuditLogAsync(Guid logId);
        Task<byte[]> ExportAuditLogsToExcelAsync(AuditLogSearchDto search);

        // 17.5 Cấu hình hệ thống
        Task<List<SystemConfigDto>> GetSystemConfigsAsync(string category = null);
        Task<SystemConfigDto> GetSystemConfigAsync(string configKey);
        Task<SystemConfigDto> SaveSystemConfigAsync(SystemConfigDto dto);
        Task<bool> DeleteSystemConfigAsync(string configKey);

        // 17.6 Quản lý phiên đăng nhập
        Task<List<UserSessionDto>> GetActiveSessionsAsync(Guid? userId = null);
        Task<bool> TerminateSessionAsync(Guid sessionId);
        Task<bool> TerminateAllSessionsAsync(Guid userId);

        // 17.7 Quản lý thông báo hệ thống
        Task<List<SystemNotificationDto>> GetSystemNotificationsAsync(bool? isActive = null);
        Task<SystemNotificationDto> GetSystemNotificationAsync(Guid notificationId);
        Task<SystemNotificationDto> SaveSystemNotificationAsync(SystemNotificationDto dto);
        Task<bool> DeleteSystemNotificationAsync(Guid notificationId);

        // 17.8 Sao lưu dữ liệu
        Task<List<BackupHistoryDto>> GetBackupHistoryAsync(DateTime? fromDate = null, DateTime? toDate = null);
        Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto);
        Task<bool> RestoreBackupAsync(Guid backupId);
        Task<bool> DeleteBackupAsync(Guid backupId);

        // 17.9 Giám sát hệ thống
        Task<SystemHealthDto> GetSystemHealthAsync();
        Task<List<SystemResourceDto>> GetSystemResourcesAsync();
        Task<List<DatabaseStatisticsDto>> GetDatabaseStatisticsAsync();

        // 17.10 Quản lý tích hợp
        Task<List<IntegrationConfigDto>> GetIntegrationConfigsAsync(bool? isActive = null);
        Task<IntegrationConfigDto> GetIntegrationConfigAsync(Guid integrationId);
        Task<IntegrationConfigDto> SaveIntegrationConfigAsync(IntegrationConfigDto dto);
        Task<bool> TestIntegrationConnectionAsync(Guid integrationId);
        Task<List<IntegrationLogDto>> GetIntegrationLogsAsync(Guid integrationId, DateTime? fromDate = null, DateTime? toDate = null);

        #endregion
    }

    #region Additional DTOs for Complex Operations

    // Financial Report Request
    public class FinancialReportRequest
    {
        public string ReportType { get; set; } // Revenue, Cost, Summary, Debt
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? ServiceId { get; set; }
        public string GroupBy { get; set; } // Day, Week, Month, Quarter, Year
        public string OutputFormat { get; set; } // PDF, Excel
    }

    // Medicine Catalog Search
    public class MedicineCatalogSearchDto
    {
        public string Keyword { get; set; }
        public Guid? MedicineGroupId { get; set; }
        public string BHXHCode { get; set; }
        public bool? IsNarcotic { get; set; }
        public bool? IsPsychotropic { get; set; }
        public bool? IsPrecursor { get; set; }
        public bool? IsAntibiotic { get; set; }
        public bool? IsActive { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
    }

    // Pharmacy Report Request
    public class PharmacyReportRequest
    {
        public string ReportType { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? WarehouseId { get; set; }
        public Guid? MedicineId { get; set; }
        public Guid? DepartmentId { get; set; }
        public string OutputFormat { get; set; }
    }

    // Statistics Report Request
    public class StatisticsReportRequest
    {
        public string ReportType { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public string GroupBy { get; set; }
        public string OutputFormat { get; set; }
    }

    // Create Borrow Request
    public class CreateBorrowRequestDto
    {
        public Guid MedicalRecordArchiveId { get; set; }
        public string Purpose { get; set; }
        public DateTime ExpectedReturnDate { get; set; }
        public string Note { get; set; }
    }

    // Audit Log Search
    public class AuditLogSearchDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public Guid? UserId { get; set; }
        public string Action { get; set; }
        public string EntityType { get; set; }
        public string Keyword { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
    }

    // User DTOs
    public class CreateUserDto
    {
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? DepartmentId { get; set; }
        public List<Guid> RoleIds { get; set; }
        public string InitialPassword { get; set; }
    }

    public class UpdateUserDto
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? DepartmentId { get; set; }
        public List<Guid> RoleIds { get; set; }
        public bool IsActive { get; set; }
    }

    public class AdminChangePasswordDto
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
        public string ConfirmPassword { get; set; }
    }

    // Backup DTO
    public class CreateBackupDto
    {
        public string BackupName { get; set; }
        public string BackupType { get; set; } // Full, Differential, TransactionLog
        public string Description { get; set; }
        public bool CompressBackup { get; set; }
    }

    // Sync Result
    public class SyncResultDto
    {
        public bool IsSuccess { get; set; }
        public int TotalRecords { get; set; }
        public int InsertedRecords { get; set; }
        public int UpdatedRecords { get; set; }
        public int FailedRecords { get; set; }
        public List<string> Errors { get; set; }
        public DateTime SyncDate { get; set; }
    }

    #endregion
}
