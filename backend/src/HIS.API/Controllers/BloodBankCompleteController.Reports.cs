using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.BloodBank;
using HIS.API.Dtos.BloodBankComplete;

namespace HIS.API.Controllers
{
    public partial class BloodBankCompleteController : ControllerBase
    {
        /// <summary>
        /// 6. Thẻ kho máu
        /// </summary>
        [HttpGet("reports/stock-card")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult<BloodStockCardDto>> GetStockCard(
            [FromQuery] string bloodType,
            [FromQuery] string rhFactor,
            [FromQuery] Guid productTypeId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetStockCardAsync(bloodType, rhFactor, productTypeId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo nhập xuất tồn kho
        /// </summary>
        [HttpGet("reports/inventory")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult<BloodInventoryReportDto>> GetInventoryReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetInventoryReportAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// In phiếu nhập
        /// </summary>
        [HttpGet("reports/import/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> PrintImportReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? supplierId = null)
        {
            var result = await _bloodBankService.PrintImportReportAsync(fromDate, toDate, supplierId);
            return File(result, "application/pdf", "blood_import_report.pdf");
        }

        /// <summary>
        /// In phiếu xuất
        /// </summary>
        [HttpGet("reports/export/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> PrintExportReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.PrintExportReportAsync(fromDate, toDate, departmentId);
            return File(result, "application/pdf", "blood_export_report.pdf");
        }

        /// <summary>
        /// In biên bản kiểm kê
        /// </summary>
        [HttpGet("inventories/{inventoryId}/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> PrintInventoryReport(Guid inventoryId)
        {
            var result = await _bloodBankService.PrintInventoryReportAsync(inventoryId);
            return File(result, "application/pdf", $"blood_inventory_{inventoryId}.pdf");
        }

        /// <summary>
        /// In báo cáo nhập xuất tồn
        /// </summary>
        [HttpGet("reports/stock/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> PrintStockReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.PrintStockReportAsync(fromDate, toDate);
            return File(result, "application/pdf", "blood_stock_report.pdf");
        }

        /// <summary>
        /// 8. In phiếu lĩnh máu tổng hợp
        /// </summary>
        [HttpGet("reports/issue-summary/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> PrintBloodIssueSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.PrintBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            return File(result, "application/pdf", "blood_issue_summary.pdf");
        }

        /// <summary>
        /// Báo cáo phiếu lĩnh máu tổng hợp
        /// </summary>
        [HttpGet("reports/issue-summary")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult<BloodIssueSummaryDto>> GetBloodIssueSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.GetBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 9. In phiếu lĩnh máu theo bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/blood-issue/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult> PrintBloodIssueByPatient(
            Guid patientId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.PrintBloodIssueByPatientAsync(patientId, fromDate, toDate);
            return File(result, "application/pdf", $"blood_issue_patient_{patientId}.pdf");
        }

        /// <summary>
        /// Báo cáo máu theo bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/blood-issue")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult<BloodIssueByPatientDto>> GetBloodIssueByPatient(
            Guid patientId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetBloodIssueByPatientAsync(patientId, fromDate, toDate);
            return Ok(result);
        }
    }
}
