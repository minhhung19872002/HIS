using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.System;
using HIS.Application.Services;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete System Controller
    /// Covers Modules: 11 (Tài chính), 13 (Danh mục), 15 (Báo cáo Dược), 16 (HSBA & Thống kê), 17 (Quản trị)
    /// </summary>
    [ApiController]
    [Authorize]
    public partial class SystemCompleteController : ControllerBase
    {
        private readonly ISystemCompleteService _service;

        public SystemCompleteController(ISystemCompleteService service)
        {
            _service = service;
        }

        #region Module 11: Quản lý Tài chính Kế toán

        /// <summary>
        /// 11.1 Báo cáo doanh thu theo khoa chỉ định
        /// </summary>
        [HttpGet("api/finance/revenue/ordering-dept")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<List<RevenueByOrderingDeptDto>>> GetRevenueByOrderingDept(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string revenueType = null)
        {
            var result = await _service.GetRevenueByOrderingDeptAsync(fromDate, toDate, departmentId, revenueType);
            return Ok(result);
        }

        /// <summary>
        /// 11.2 Báo cáo doanh thu theo khoa thực hiện
        /// </summary>
        [HttpGet("api/finance/revenue/executing-dept")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<List<RevenueByExecutingDeptDto>>> GetRevenueByExecutingDept(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string revenueType = null)
        {
            var result = await _service.GetRevenueByExecutingDeptAsync(fromDate, toDate, departmentId, revenueType);
            return Ok(result);
        }

        /// <summary>
        /// 11.3 Báo cáo doanh thu theo dịch vụ
        /// </summary>
        [HttpGet("api/finance/revenue/service")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<List<RevenueByServiceDto>>> GetRevenueByService(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? serviceGroupId = null,
            [FromQuery] Guid? serviceId = null)
        {
            var result = await _service.GetRevenueByServiceAsync(fromDate, toDate, serviceGroupId, serviceId);
            return Ok(result);
        }

        /// <summary>
        /// 11.4 Báo cáo lợi nhuận phẫu thuật/thủ thuật
        /// </summary>
        [HttpGet("api/finance/profit/surgery")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<List<SurgeryProfitReportDto>>> GetSurgeryProfitReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? surgeryId = null)
        {
            var result = await _service.GetSurgeryProfitReportAsync(fromDate, toDate, departmentId, surgeryId);
            return Ok(result);
        }

        /// <summary>
        /// 11.5 Báo cáo chi phí theo khoa phòng
        /// </summary>
        [HttpGet("api/finance/cost/department")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<List<CostByDepartmentDto>>> GetCostByDepartment(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string costType = null)
        {
            var result = await _service.GetCostByDepartmentAsync(fromDate, toDate, departmentId, costType);
            return Ok(result);
        }

        /// <summary>
        /// 11.6 Báo cáo thu chi tổng hợp
        /// </summary>
        [HttpGet("api/finance/summary")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<ActionResult<FinancialSummaryReportDto>> GetFinancialSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetFinancialSummaryReportAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// 11.7 Báo cáo công nợ bệnh nhân
        /// </summary>
        [HttpGet("api/finance/debt/patient")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Cashier)]
        public async Task<ActionResult<List<PatientDebtReportDto>>> GetPatientDebtReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string debtStatus = null)
        {
            var result = await _service.GetPatientDebtReportAsync(fromDate, toDate, debtStatus);
            return Ok(result);
        }

        /// <summary>
        /// 11.8 Báo cáo công nợ BHYT
        /// </summary>
        [HttpGet("api/finance/debt/insurance")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.InsuranceOfficer)]
        public async Task<ActionResult<List<InsuranceDebtReportDto>>> GetInsuranceDebtReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string insuranceCode = null)
        {
            var result = await _service.GetInsuranceDebtReportAsync(fromDate, toDate, insuranceCode);
            return Ok(result);
        }

        /// <summary>
        /// 11.9 Báo cáo đối soát BHYT
        /// </summary>
        [HttpGet("api/finance/insurance/reconciliation")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.InsuranceOfficer)]
        public async Task<ActionResult<InsuranceReconciliationDto>> GetInsuranceReconciliation(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string insuranceCode = null)
        {
            var result = await _service.GetInsuranceReconciliationAsync(fromDate, toDate, insuranceCode);
            return Ok(result);
        }

        /// <summary>
        /// In báo cáo tài chính
        /// </summary>
        [HttpPost("api/finance/reports/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<IActionResult> PrintFinancialReport([FromBody] FinancialReportRequest request)
        {
            var result = await _service.PrintFinancialReportAsync(request);
            return File(result, "application/pdf", $"FinancialReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        /// <summary>
        /// Xuất Excel báo cáo tài chính
        /// </summary>
        [HttpPost("api/finance/reports/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Manager)]
        public async Task<IActionResult> ExportFinancialReport([FromBody] FinancialReportRequest request)
        {
            var result = await _service.ExportFinancialReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"FinancialReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }

        #endregion
    }
}
