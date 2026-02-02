using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.Reporting;

namespace HIS.Application.Services
{
    /// <summary>
    /// Complete Reporting Service Interface
    /// Module 16: Báo cáo & Thống kê - Luồng 10
    /// </summary>
    public interface IReportingCompleteService
    {
        #region Dashboard & KPI

        /// <summary>
        /// Lấy Dashboard tổng quan
        /// </summary>
        Task<DashboardDto> GetDashboardAsync(DateTime? date = null);

        /// <summary>
        /// Lấy Dashboard theo khoa
        /// </summary>
        Task<DashboardDto> GetDepartmentDashboardAsync(Guid departmentId, DateTime? date = null);

        /// <summary>
        /// Lấy KPI Dashboard
        /// </summary>
        Task<KPIDashboardDto> GetKPIDashboardAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Lấy KPI theo khoa
        /// </summary>
        Task<KPIDashboardDto> GetDepartmentKPIAsync(Guid departmentId, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Realtime Monitor - Số BN đang chờ
        /// </summary>
        Task<Dictionary<string, int>> GetRealtimeWaitingCountAsync();

        /// <summary>
        /// Realtime Monitor - Giường trống
        /// </summary>
        Task<Dictionary<string, int>> GetRealtimeBedAvailabilityAsync();

        /// <summary>
        /// Lấy danh sách cảnh báo
        /// </summary>
        Task<List<AlertDto>> GetAlertsAsync(string module = null, int? top = 10);

        #endregion

        #region Clinical Reports (Báo cáo Lâm sàng)

        /// <summary>
        /// BC-001: Báo cáo bệnh nhân theo khoa
        /// </summary>
        Task<PatientByDepartmentReportDto> GetPatientByDepartmentReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// BC-002: Báo cáo Top 10 bệnh ICD-10
        /// </summary>
        Task<Top10DiseasesReportDto> GetTop10DiseasesReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string patientType = null);

        /// <summary>
        /// BC-003: Báo cáo tỷ lệ tử vong
        /// </summary>
        Task<MortalityReportDto> GetMortalityReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// BC-004: Báo cáo thống kê PTTT
        /// </summary>
        Task<SurgeryStatisticsReportDto> GetSurgeryStatisticsReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// BC-005: Báo cáo thống kê xét nghiệm
        /// </summary>
        Task<object> GetLabStatisticsReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string testType = null);

        /// <summary>
        /// BC-006: Báo cáo thống kê CĐHA
        /// </summary>
        Task<object> GetRadiologyStatisticsReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string serviceType = null);

        /// <summary>
        /// BC-007: Báo cáo tái khám
        /// </summary>
        Task<object> GetFollowUpReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// BC-008: Báo cáo nhiễm khuẩn bệnh viện
        /// </summary>
        Task<object> GetHospitalInfectionReportAsync(
            DateTime fromDate,
            DateTime toDate);

        #endregion

        #region Financial Reports (Báo cáo Tài chính)

        /// <summary>
        /// BC-101: Báo cáo doanh thu tổng hợp
        /// </summary>
        Task<RevenueReportDto> GetRevenueReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string patientType = null);

        /// <summary>
        /// BC-102: Báo cáo doanh thu theo ngày
        /// </summary>
        Task<List<RevenueByDayDto>> GetDailyRevenueReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-103: Báo cáo công nợ bệnh nhân
        /// </summary>
        Task<PatientDebtReportDto> GetPatientDebtReportAsync(
            DateTime? asOfDate = null,
            Guid? departmentId = null);

        /// <summary>
        /// BC-104: Báo cáo BHYT tổng hợp
        /// </summary>
        Task<InsuranceClaimReportDto> GetInsuranceClaimReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-105: Báo cáo lợi nhuận theo khoa
        /// </summary>
        Task<ProfitByDepartmentReportDto> GetProfitByDepartmentReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-106: Báo cáo thu tiền theo nhân viên
        /// </summary>
        Task<object> GetCashierReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? cashierId = null);

        /// <summary>
        /// BC-107: Báo cáo hóa đơn GTGT
        /// </summary>
        Task<object> GetVATInvoiceReportAsync(
            DateTime fromDate,
            DateTime toDate);

        #endregion

        #region Pharmacy Reports (Báo cáo Dược)

        /// <summary>
        /// BC-201: Báo cáo tồn kho hiện tại
        /// </summary>
        Task<CurrentStockReportDto> GetCurrentStockReportAsync(
            Guid? warehouseId = null,
            string category = null);

        /// <summary>
        /// BC-202: Báo cáo xuất nhập tồn
        /// </summary>
        Task<StockMovementReportDto> GetStockMovementReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? warehouseId = null);

        /// <summary>
        /// BC-203: Báo cáo thuốc gây nghiện
        /// </summary>
        Task<ControlledDrugReportDto> GetNarcoticDrugReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-204: Báo cáo thuốc hướng thần
        /// </summary>
        Task<ControlledDrugReportDto> GetPsychotropicDrugReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-205: Báo cáo thuốc sắp hết hạn
        /// </summary>
        Task<ExpiringDrugsReportDto> GetExpiringDrugsReportAsync(
            int daysAhead = 90,
            Guid? warehouseId = null);

        /// <summary>
        /// BC-206: Báo cáo sử dụng thuốc theo khoa
        /// </summary>
        Task<object> GetDrugUsageByDepartmentReportAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// BC-207: Báo cáo ABC/VEN
        /// </summary>
        Task<object> GetABCVENReportAsync(
            DateTime fromDate,
            DateTime toDate);

        #endregion

        #region Administrative Reports (Báo cáo Quản trị)

        /// <summary>
        /// BC-301: Thống kê người dùng
        /// </summary>
        Task<UserStatisticsReportDto> GetUserStatisticsReportAsync(
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// BC-302: Báo cáo Audit Log
        /// </summary>
        Task<AuditLogReportDto> GetAuditLogReportAsync(
            DateTime fromDate,
            DateTime toDate,
            string module = null,
            string userName = null);

        /// <summary>
        /// BC-303: Báo cáo hiệu suất hệ thống
        /// </summary>
        Task<object> GetSystemPerformanceReportAsync(
            DateTime fromDate,
            DateTime toDate);

        #endregion

        #region Report Export & History

        /// <summary>
        /// Xuất báo cáo ra file
        /// </summary>
        Task<ReportExportResultDto> ExportReportAsync(
            string reportCode,
            ReportRequestDto request);

        /// <summary>
        /// Xuất báo cáo ra Excel
        /// </summary>
        Task<byte[]> ExportToExcelAsync(
            string reportCode,
            DateTime fromDate,
            DateTime toDate,
            object parameters = null);

        /// <summary>
        /// Xuất báo cáo ra PDF
        /// </summary>
        Task<byte[]> ExportToPdfAsync(
            string reportCode,
            DateTime fromDate,
            DateTime toDate,
            object parameters = null);

        /// <summary>
        /// Lấy lịch sử báo cáo đã xuất
        /// </summary>
        Task<List<ReportHistoryDto>> GetReportHistoryAsync(
            string reportCode = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int? top = 50);

        /// <summary>
        /// Tải lại báo cáo từ lịch sử
        /// </summary>
        Task<byte[]> DownloadReportFromHistoryAsync(Guid reportHistoryId);

        #endregion

        #region Scheduled Reports

        /// <summary>
        /// Lấy danh sách cấu hình báo cáo tự động
        /// </summary>
        Task<List<ScheduledReportConfigDto>> GetScheduledReportsAsync();

        /// <summary>
        /// Lưu cấu hình báo cáo tự động
        /// </summary>
        Task<ScheduledReportConfigDto> SaveScheduledReportAsync(SaveScheduledReportDto dto);

        /// <summary>
        /// Xóa cấu hình báo cáo tự động
        /// </summary>
        Task<bool> DeleteScheduledReportAsync(Guid id);

        /// <summary>
        /// Chạy báo cáo tự động ngay lập tức
        /// </summary>
        Task<bool> RunScheduledReportNowAsync(Guid id);

        #endregion

        #region Report Definitions

        /// <summary>
        /// Lấy danh sách định nghĩa báo cáo
        /// </summary>
        Task<List<ReportDefinitionDto>> GetReportDefinitionsAsync(string category = null);

        /// <summary>
        /// Lấy chi tiết định nghĩa báo cáo
        /// </summary>
        Task<ReportDefinitionDto> GetReportDefinitionAsync(string reportCode);

        #endregion
    }

    #region Additional DTOs for Reporting Service

    /// <summary>
    /// Định nghĩa báo cáo
    /// </summary>
    public class ReportDefinitionDto
    {
        public string ReportCode { get; set; }
        public string ReportName { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Module { get; set; }
        public List<string> SupportedFormats { get; set; }
        public List<ReportParameterDto> Parameters { get; set; }
        public List<string> RequiredPermissions { get; set; }
    }

    /// <summary>
    /// Tham số báo cáo
    /// </summary>
    public class ReportParameterDto
    {
        public string Name { get; set; }
        public string Label { get; set; }
        public string DataType { get; set; } // Date, String, Guid, Int, Bool
        public bool IsRequired { get; set; }
        public string DefaultValue { get; set; }
        public string LookupSource { get; set; } // API endpoint for dropdown
    }

    #endregion
}
