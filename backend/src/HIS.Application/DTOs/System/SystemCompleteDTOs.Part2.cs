using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.System
{

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

        // Service status breakdown
        public int ServiceOpdDone { get; set; }
        public int ServiceOpdPending { get; set; }
        public int ServiceRadiologyDone { get; set; }
        public int ServiceRadiologyPending { get; set; }
        public int ServiceLabDone { get; set; }
        public int ServiceLabPending { get; set; }
        public int ServiceSurgeryDone { get; set; }
        public int ServiceSurgeryPending { get; set; }
        public int ServiceProcedureDone { get; set; }
        public int ServiceProcedurePending { get; set; }
        public int ServicePrescriptionDone { get; set; }
        public int ServicePrescriptionPending { get; set; }

        // Revenue breakdown by patient type
        public decimal RevenueBHYT { get; set; }
        public decimal RevenueSelfPay { get; set; }
        public decimal RevenueOther { get; set; }
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
        public Guid? BranchId { get; set; } // R3 đa cơ sở — NULL = toàn viện
        public List<string> Roles { get; set; }
        public List<string> Permissions { get; set; }
        public bool IsActive { get; set; }
        public bool IsTwoFactorEnabled { get; set; }
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


}
