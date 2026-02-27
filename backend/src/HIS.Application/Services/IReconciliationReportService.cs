using System;
using System.Threading.Tasks;
using HIS.Application.DTOs.Reporting;

namespace HIS.Application.Services
{
    /// <summary>
    /// Service Interface for Level 6 Reconciliation Reports
    /// 8 reports: Đối chiếu Level 6
    /// </summary>
    public interface IReconciliationReportService
    {
        /// <summary>
        /// BC1: Theo dõi kết quả trúng thầu theo NCC (Supplier Procurement)
        /// </summary>
        Task<SupplierProcurementReportDto> GetSupplierProcurementAsync(
            DateTime fromDate, DateTime toDate, Guid? supplierId = null);

        /// <summary>
        /// BC2: Tính doanh thu chi phí theo HSBA (Revenue/Cost by Medical Record)
        /// </summary>
        Task<RevenueByRecordReportDto> GetRevenueByRecordAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC3: Đối chiếu chi phí khoa phòng vs viện phí (Dept Cost vs Hospital Fees)
        /// </summary>
        Task<DeptCostVsFeesReportDto> GetDeptCostVsFeesAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC4: Tổng hợp chi phí HSBA: sử dụng vs thu (Record Cost Summary)
        /// </summary>
        Task<RecordCostSummaryReportDto> GetRecordCostSummaryAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC5: Đối chiếu viện phí vs định mức DVKT (Fees vs Service Standards)
        /// </summary>
        Task<FeesVsStandardsReportDto> GetFeesVsStandardsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC6: Đối chiếu DVKT giữa BS chỉ định và BS thực hiện (Service Order Doctors)
        /// </summary>
        Task<ServiceOrderDoctorsReportDto> GetServiceOrderDoctorsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC7: Đối chiếu xuất kho thuốc/VTYT vs viện phí theo khoa (Dispensing vs Billing)
        /// </summary>
        Task<DispensingVsBillingReportDto> GetDispensingVsBillingAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// BC8: Đối chiếu xuất kho vs định mức theo khoa phòng (Dispensing vs Standards)
        /// </summary>
        Task<DispensingVsStandardsReportDto> GetDispensingVsStandardsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null);
    }
}
