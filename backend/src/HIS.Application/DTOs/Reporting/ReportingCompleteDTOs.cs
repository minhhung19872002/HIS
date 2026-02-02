using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Reporting
{
    /// <summary>
    /// Complete Reporting DTOs
    /// Module 16: Báo cáo & Thống kê - Luồng 10
    /// </summary>

    #region Common Report DTOs

    /// <summary>
    /// Yêu cầu báo cáo cơ bản
    /// </summary>
    public class ReportRequestDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? DepartmentId { get; set; }
        public string Format { get; set; } = "Excel"; // Excel, PDF, HTML
        public bool IncludeDetails { get; set; } = true;
    }

    /// <summary>
    /// Kết quả xuất báo cáo
    /// </summary>
    public class ReportExportResultDto
    {
        public bool Success { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
        public byte[] FileContent { get; set; }
        public string Message { get; set; }
    }

    /// <summary>
    /// Lịch sử báo cáo đã xuất
    /// </summary>
    public class ReportHistoryDto
    {
        public Guid Id { get; set; }
        public string ReportCode { get; set; }
        public string ReportName { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string Format { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string FilePath { get; set; }
        public long FileSize { get; set; }
    }

    #endregion

    #region Dashboard & KPI DTOs

    /// <summary>
    /// Dashboard tổng quan
    /// </summary>
    public class DashboardDto
    {
        public DateTime DataDate { get; set; }
        public DashboardSummaryDto Today { get; set; }
        public DashboardSummaryDto ThisMonth { get; set; }
        public List<DashboardChartDataDto> PatientTrend { get; set; }
        public List<DashboardChartDataDto> RevenueTrend { get; set; }
        public List<DepartmentStatDto> TopDepartments { get; set; }
        public List<ServiceStatDto> TopServices { get; set; }
        public List<AlertDto> Alerts { get; set; }
    }

    /// <summary>
    /// Tóm tắt dashboard
    /// </summary>
    public class DashboardSummaryDto
    {
        public int TotalPatients { get; set; }
        public int OutpatientCount { get; set; }
        public int InpatientCount { get; set; }
        public int EmergencyCount { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public int TotalExaminations { get; set; }
        public int TotalLabTests { get; set; }
        public int TotalRadiologyExams { get; set; }
        public int TotalSurgeries { get; set; }
        public decimal OccupancyRate { get; set; }
        public int AvailableBeds { get; set; }
    }

    /// <summary>
    /// Dữ liệu biểu đồ
    /// </summary>
    public class DashboardChartDataDto
    {
        public DateTime Date { get; set; }
        public string Label { get; set; }
        public decimal Value { get; set; }
        public decimal Value2 { get; set; }
        public string Category { get; set; }
    }

    /// <summary>
    /// Thống kê theo khoa
    /// </summary>
    public class DepartmentStatDto
    {
        public Guid DepartmentId { get; set; }
        public string DepartmentCode { get; set; }
        public string DepartmentName { get; set; }
        public int PatientCount { get; set; }
        public decimal Revenue { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Thống kê theo dịch vụ
    /// </summary>
    public class ServiceStatDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceCode { get; set; }
        public string ServiceName { get; set; }
        public int UsageCount { get; set; }
        public decimal Revenue { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Cảnh báo hệ thống
    /// </summary>
    public class AlertDto
    {
        public string AlertType { get; set; } // Warning, Error, Info
        public string Title { get; set; }
        public string Message { get; set; }
        public string Module { get; set; }
        public int Count { get; set; }
        public string ActionUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// KPI Dashboard
    /// </summary>
    public class KPIDashboardDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<KPIItemDto> ClinicalKPIs { get; set; }
        public List<KPIItemDto> FinancialKPIs { get; set; }
        public List<KPIItemDto> OperationalKPIs { get; set; }
        public List<KPIItemDto> QualityKPIs { get; set; }
    }

    /// <summary>
    /// Chi tiết KPI
    /// </summary>
    public class KPIItemDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal TargetValue { get; set; }
        public decimal PreviousValue { get; set; }
        public string Unit { get; set; }
        public string Trend { get; set; } // Up, Down, Stable
        public decimal ChangePercent { get; set; }
        public string Status { get; set; } // Good, Warning, Bad
    }

    #endregion

    #region Clinical Reports

    /// <summary>
    /// Báo cáo bệnh nhân theo khoa
    /// </summary>
    public class PatientByDepartmentReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalPatients { get; set; }
        public List<PatientByDepartmentItemDto> Departments { get; set; }
    }

    public class PatientByDepartmentItemDto
    {
        public string DepartmentName { get; set; }
        public int OutpatientCount { get; set; }
        public int InpatientCount { get; set; }
        public int EmergencyCount { get; set; }
        public int TotalCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Báo cáo Top 10 bệnh ICD-10
    /// </summary>
    public class Top10DiseasesReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalDiagnoses { get; set; }
        public List<DiseaseStatItemDto> Diseases { get; set; }
    }

    public class DiseaseStatItemDto
    {
        public int Rank { get; set; }
        public string IcdCode { get; set; }
        public string IcdName { get; set; }
        public int CaseCount { get; set; }
        public int MaleCount { get; set; }
        public int FemaleCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Báo cáo tỷ lệ tử vong
    /// </summary>
    public class MortalityReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalDeaths { get; set; }
        public int TotalDischarges { get; set; }
        public decimal MortalityRate { get; set; }
        public List<MortalityByDepartmentDto> ByDepartment { get; set; }
        public List<MortalityByCauseDto> ByCause { get; set; }
    }

    public class MortalityByDepartmentDto
    {
        public string DepartmentName { get; set; }
        public int DeathCount { get; set; }
        public int DischargeCount { get; set; }
        public decimal Rate { get; set; }
    }

    public class MortalityByCauseDto
    {
        public string IcdCode { get; set; }
        public string CauseOfDeath { get; set; }
        public int Count { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Báo cáo thống kê PTTT
    /// </summary>
    public class SurgeryStatisticsReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalSurgeries { get; set; }
        public int ElectiveSurgeries { get; set; }
        public int EmergencySurgeries { get; set; }
        public int MajorSurgeries { get; set; }
        public int MinorSurgeries { get; set; }
        public decimal AverageDurationMinutes { get; set; }
        public List<SurgeryByTypeDto> ByType { get; set; }
        public List<SurgeryByDoctorDto> ByDoctor { get; set; }
    }

    public class SurgeryByTypeDto
    {
        public string SurgeryType { get; set; }
        public int Count { get; set; }
        public decimal Percentage { get; set; }
    }

    public class SurgeryByDoctorDto
    {
        public string DoctorName { get; set; }
        public int SurgeryCount { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    #endregion

    #region Financial Reports

    /// <summary>
    /// Báo cáo doanh thu tổng hợp
    /// </summary>
    public class RevenueReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal OtherRevenue { get; set; }
        public List<RevenueByDayDto> ByDay { get; set; }
        public List<RevenueByDepartmentDto> ByDepartment { get; set; }
        public List<RevenueByServiceTypeDto> ByServiceType { get; set; }
        public List<RevenueByPatientTypeDto> ByPatientType { get; set; }
    }

    public class RevenueByDayDto
    {
        public DateTime Date { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public int TransactionCount { get; set; }
    }

    public class RevenueByDepartmentDto
    {
        public string DepartmentName { get; set; }
        public decimal Revenue { get; set; }
        public decimal InsuranceRevenue { get; set; }
        public decimal PatientRevenue { get; set; }
        public decimal Percentage { get; set; }
    }

    public class RevenueByServiceTypeDto
    {
        public string ServiceTypeName { get; set; }
        public decimal Revenue { get; set; }
        public int UsageCount { get; set; }
        public decimal Percentage { get; set; }
    }

    public class RevenueByPatientTypeDto
    {
        public string PatientType { get; set; }
        public decimal Revenue { get; set; }
        public int PatientCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Báo cáo công nợ bệnh nhân
    /// </summary>
    public class PatientDebtReportDto
    {
        public DateTime AsOfDate { get; set; }
        public decimal TotalDebt { get; set; }
        public int TotalDebtors { get; set; }
        public decimal DebtUnder30Days { get; set; }
        public decimal Debt30To60Days { get; set; }
        public decimal Debt60To90Days { get; set; }
        public decimal DebtOver90Days { get; set; }
        public List<PatientDebtItemDto> TopDebtors { get; set; }
        public List<DebtByDepartmentDto> ByDepartment { get; set; }
    }

    public class PatientDebtItemDto
    {
        public Guid PatientId { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string PhoneNumber { get; set; }
        public decimal DebtAmount { get; set; }
        public int DaysOverdue { get; set; }
        public DateTime LastPaymentDate { get; set; }
        public string DepartmentName { get; set; }
    }

    public class DebtByDepartmentDto
    {
        public string DepartmentName { get; set; }
        public decimal DebtAmount { get; set; }
        public int DebtorCount { get; set; }
    }

    /// <summary>
    /// Báo cáo BHYT tổng hợp
    /// </summary>
    public class InsuranceClaimReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalClaimAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal RejectedAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public int TotalClaims { get; set; }
        public int ApprovedClaims { get; set; }
        public int RejectedClaims { get; set; }
        public int PendingClaims { get; set; }
        public decimal ApprovalRate { get; set; }
        public List<ClaimByStatusDto> ByStatus { get; set; }
        public List<ClaimByTypeDto> ByClaimType { get; set; }
        public List<RejectionReasonDto> TopRejectionReasons { get; set; }
    }

    public class ClaimByStatusDto
    {
        public string Status { get; set; }
        public int ClaimCount { get; set; }
        public decimal Amount { get; set; }
    }

    public class ClaimByTypeDto
    {
        public string ClaimType { get; set; } // Outpatient, Inpatient
        public int ClaimCount { get; set; }
        public decimal Amount { get; set; }
    }

    public class RejectionReasonDto
    {
        public string ReasonCode { get; set; }
        public string ReasonDescription { get; set; }
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    /// <summary>
    /// Báo cáo lợi nhuận theo khoa
    /// </summary>
    public class ProfitByDepartmentReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal ProfitMargin { get; set; }
        public List<DepartmentProfitItemDto> Departments { get; set; }
    }

    public class DepartmentProfitItemDto
    {
        public string DepartmentName { get; set; }
        public decimal Revenue { get; set; }
        public decimal Cost { get; set; }
        public decimal Profit { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    #endregion

    #region Pharmacy Reports

    /// <summary>
    /// Báo cáo tồn kho hiện tại
    /// </summary>
    public class CurrentStockReportDto
    {
        public DateTime AsOfDate { get; set; }
        public decimal TotalStockValue { get; set; }
        public int TotalItems { get; set; }
        public int LowStockItems { get; set; }
        public int ExpiringItems { get; set; }
        public int ExpiredItems { get; set; }
        public List<StockByWarehouseDto> ByWarehouse { get; set; }
        public List<StockByCategoryDto> ByCategory { get; set; }
    }

    public class StockByWarehouseDto
    {
        public string WarehouseName { get; set; }
        public int ItemCount { get; set; }
        public decimal StockValue { get; set; }
    }

    public class StockByCategoryDto
    {
        public string CategoryName { get; set; }
        public int ItemCount { get; set; }
        public decimal StockValue { get; set; }
    }

    /// <summary>
    /// Báo cáo xuất nhập tồn
    /// </summary>
    public class StockMovementReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? WarehouseId { get; set; }
        public string WarehouseName { get; set; }
        public decimal OpeningStockValue { get; set; }
        public decimal ImportValue { get; set; }
        public decimal ExportValue { get; set; }
        public decimal ClosingStockValue { get; set; }
        public List<StockMovementItemDto> Items { get; set; }
    }

    public class StockMovementItemDto
    {
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string Unit { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ImportQuantity { get; set; }
        public decimal ExportQuantity { get; set; }
        public decimal ClosingStock { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal StockValue { get; set; }
    }

    /// <summary>
    /// Báo cáo thuốc gây nghiện/hướng thần
    /// </summary>
    public class ControlledDrugReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string DrugType { get; set; } // Narcotic, Psychotropic
        public List<ControlledDrugItemDto> Items { get; set; }
    }

    public class ControlledDrugItemDto
    {
        public int RowNumber { get; set; }
        public DateTime Date { get; set; }
        public string PatientCode { get; set; }
        public string PatientName { get; set; }
        public string Diagnosis { get; set; }
        public string DrugCode { get; set; }
        public string DrugName { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public string DoctorName { get; set; }
        public string LicenseNumber { get; set; }
    }

    /// <summary>
    /// Báo cáo thuốc sắp hết hạn
    /// </summary>
    public class ExpiringDrugsReportDto
    {
        public DateTime AsOfDate { get; set; }
        public int DaysAhead { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalValue { get; set; }
        public List<ExpiringDrugItemDto> Items { get; set; }
    }

    public class ExpiringDrugItemDto
    {
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string LotNumber { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int DaysUntilExpiry { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalValue { get; set; }
        public string WarehouseName { get; set; }
    }

    #endregion

    #region Administrative Reports

    /// <summary>
    /// Thống kê người dùng
    /// </summary>
    public class UserStatisticsReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int NewUsersThisMonth { get; set; }
        public List<UserByDepartmentDto> ByDepartment { get; set; }
        public List<UserByRoleDto> ByRole { get; set; }
        public List<UserActivityDto> TopActiveUsers { get; set; }
    }

    public class UserByDepartmentDto
    {
        public string DepartmentName { get; set; }
        public int UserCount { get; set; }
    }

    public class UserByRoleDto
    {
        public string RoleName { get; set; }
        public int UserCount { get; set; }
    }

    public class UserActivityDto
    {
        public string UserName { get; set; }
        public string FullName { get; set; }
        public string DepartmentName { get; set; }
        public int LoginCount { get; set; }
        public int ActionCount { get; set; }
        public DateTime LastLoginTime { get; set; }
    }

    /// <summary>
    /// Audit Log Report
    /// </summary>
    public class AuditLogReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalLogs { get; set; }
        public List<AuditLogItemDto> Logs { get; set; }
        public List<AuditByActionDto> ByAction { get; set; }
        public List<AuditByModuleDto> ByModule { get; set; }
    }

    public class AuditLogItemDto
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string UserName { get; set; }
        public string Action { get; set; }
        public string Module { get; set; }
        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public string OldValues { get; set; }
        public string NewValues { get; set; }
        public string IpAddress { get; set; }
    }

    public class AuditByActionDto
    {
        public string Action { get; set; }
        public int Count { get; set; }
    }

    public class AuditByModuleDto
    {
        public string Module { get; set; }
        public int Count { get; set; }
    }

    #endregion

    #region Scheduled Reports

    /// <summary>
    /// Cấu hình báo cáo tự động
    /// </summary>
    public class ScheduledReportConfigDto
    {
        public Guid Id { get; set; }
        public string ReportCode { get; set; }
        public string ReportName { get; set; }
        public string Schedule { get; set; } // Daily, Weekly, Monthly
        public string CronExpression { get; set; }
        public string Format { get; set; }
        public string Recipients { get; set; } // Comma-separated emails
        public bool IsActive { get; set; }
        public DateTime? LastRunTime { get; set; }
        public DateTime? NextRunTime { get; set; }
        public string Parameters { get; set; } // JSON
    }

    /// <summary>
    /// Tạo/Cập nhật cấu hình báo cáo tự động
    /// </summary>
    public class SaveScheduledReportDto
    {
        public Guid? Id { get; set; }
        public string ReportCode { get; set; }
        public string Schedule { get; set; }
        public string CronExpression { get; set; }
        public string Format { get; set; }
        public string Recipients { get; set; }
        public bool IsActive { get; set; }
        public string Parameters { get; set; }
    }

    #endregion
}
