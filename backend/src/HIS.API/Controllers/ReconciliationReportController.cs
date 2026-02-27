using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.Reporting;

namespace HIS.API.Controllers
{
    /// <summary>
    /// API Controller for Level 6 Reconciliation Reports (Đối chiếu Level 6)
    /// 8 reports for NangCap Level 6 compliance
    /// </summary>
    [ApiController]
    [Route("api/reports/reconciliation")]
    [Authorize]
    public class ReconciliationReportController : ControllerBase
    {
        private readonly IReconciliationReportService _service;

        public ReconciliationReportController(IReconciliationReportService service)
        {
            _service = service;
        }

        /// <summary>
        /// BC1: Theo dõi kết quả trúng thầu theo NCC (Supplier Procurement)
        /// </summary>
        [HttpGet("supplier-procurement")]
        public async Task<ActionResult<SupplierProcurementReportDto>> GetSupplierProcurement(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? supplierId = null)
            => Ok(await _service.GetSupplierProcurementAsync(fromDate, toDate, supplierId));

        /// <summary>
        /// BC2: Tính doanh thu chi phí theo HSBA (Revenue/Cost by Medical Record)
        /// </summary>
        [HttpGet("revenue-by-record")]
        public async Task<ActionResult<RevenueByRecordReportDto>> GetRevenueByRecord(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetRevenueByRecordAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC3: Đối chiếu chi phí khoa phòng vs viện phí (Department Cost vs Hospital Fees)
        /// </summary>
        [HttpGet("dept-cost-vs-fees")]
        public async Task<ActionResult<DeptCostVsFeesReportDto>> GetDeptCostVsFees(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetDeptCostVsFeesAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC4: Tổng hợp chi phí HSBA: sử dụng vs thu (Medical Record Cost Summary)
        /// </summary>
        [HttpGet("record-cost-summary")]
        public async Task<ActionResult<RecordCostSummaryReportDto>> GetRecordCostSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetRecordCostSummaryAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC5: Đối chiếu viện phí vs định mức DVKT (Hospital Fees vs Service Standards)
        /// </summary>
        [HttpGet("fees-vs-standards")]
        public async Task<ActionResult<FeesVsStandardsReportDto>> GetFeesVsStandards(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetFeesVsStandardsAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC6: Đối chiếu DVKT giữa BS chỉ định và BS thực hiện (Service Order Doctors)
        /// </summary>
        [HttpGet("service-order-doctors")]
        public async Task<ActionResult<ServiceOrderDoctorsReportDto>> GetServiceOrderDoctors(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetServiceOrderDoctorsAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC7: Đối chiếu xuất kho thuốc/VTYT vs viện phí theo khoa (Dispensing vs Billing)
        /// </summary>
        [HttpGet("dispensing-vs-billing")]
        public async Task<ActionResult<DispensingVsBillingReportDto>> GetDispensingVsBilling(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetDispensingVsBillingAsync(fromDate, toDate, departmentId));

        /// <summary>
        /// BC8: Đối chiếu xuất kho vs định mức theo khoa phòng (Dispensing vs Standards)
        /// </summary>
        [HttpGet("dispensing-vs-standards")]
        public async Task<ActionResult<DispensingVsStandardsReportDto>> GetDispensingVsStandards(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
            => Ok(await _service.GetDispensingVsStandardsAsync(fromDate, toDate, departmentId));
    }
}
