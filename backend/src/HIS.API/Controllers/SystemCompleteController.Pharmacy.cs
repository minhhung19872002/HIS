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
    public partial class SystemCompleteController
    {
        /// <summary>
        /// 15.1 Sổ theo dõi thuốc gây nghiện
        /// </summary>
        [HttpGet("api/pharmacy/reports/narcotic-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<NarcoticDrugRegisterDto>>> GetNarcoticDrugRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetNarcoticDrugRegisterAsync(fromDate, toDate, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.2 Sổ theo dõi thuốc hướng thần
        /// </summary>
        [HttpGet("api/pharmacy/reports/psychotropic-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<PsychotropicDrugRegisterDto>>> GetPsychotropicDrugRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetPsychotropicDrugRegisterAsync(fromDate, toDate, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.3 Sổ theo dõi thuốc tiền chất
        /// </summary>
        [HttpGet("api/pharmacy/reports/precursor-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<PrecursorDrugRegisterDto>>> GetPrecursorDrugRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetPrecursorDrugRegisterAsync(fromDate, toDate, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.4 Báo cáo sử dụng thuốc theo TT20/2017
        /// </summary>
        [HttpGet("api/pharmacy/reports/medicine-usage")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<MedicineUsageReportDto>>> GetMedicineUsageReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? medicineId = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetMedicineUsageReportAsync(fromDate, toDate, medicineId, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 15.5 Báo cáo sử dụng kháng sinh
        /// </summary>
        [HttpGet("api/pharmacy/reports/antibiotic-usage")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist + "," + RoleNames.InfectionControl)]
        public async Task<ActionResult<List<AntibioticUsageReportDto>>> GetAntibioticUsageReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? antibioticId = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetAntibioticUsageReportAsync(fromDate, toDate, antibioticId, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 15.6 Sổ kiểm kê thuốc (TT22)
        /// </summary>
        [HttpGet("api/pharmacy/reports/inventory-record")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<List<InventoryRecordDto>>> GetDrugInventoryRecord(
            [FromQuery] DateTime inventoryDate,
            [FromQuery] Guid warehouseId)
        {
            var result = await _service.GetDrugInventoryRecordAsync(inventoryDate, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.7 Báo cáo xuất nhập tồn kho thuốc
        /// </summary>
        [HttpGet("api/pharmacy/reports/stock-movement")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<DrugStockMovementReportDto>>> GetDrugStockMovementReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null,
            [FromQuery] Guid? medicineGroupId = null)
        {
            var result = await _service.GetDrugStockMovementReportAsync(fromDate, toDate, warehouseId, medicineGroupId);
            return Ok(result);
        }

        /// <summary>
        /// 15.8 Báo cáo thuốc sắp hết hạn
        /// </summary>
        [HttpGet("api/pharmacy/reports/expiring-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<ExpiringDrugReportDto>>> GetExpiringDrugReport(
            [FromQuery] int daysUntilExpiry = 90,
            [FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetExpiringDrugReportAsync(daysUntilExpiry, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.9 Báo cáo thuốc đã hết hạn
        /// </summary>
        [HttpGet("api/pharmacy/reports/expired-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<ActionResult<List<ExpiredDrugReportDto>>> GetExpiredDrugReport([FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetExpiredDrugReportAsync(warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.10 Báo cáo thuốc tồn kho dưới mức tối thiểu
        /// </summary>
        [HttpGet("api/pharmacy/reports/low-stock-drugs")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<List<LowStockDrugReportDto>>> GetLowStockDrugReport([FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetLowStockDrugReportAsync(warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.11 Báo cáo chi phí thuốc theo khoa
        /// </summary>
        [HttpGet("api/pharmacy/reports/drug-cost-by-dept")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Accountant)]
        public async Task<ActionResult<List<DrugCostByDeptReportDto>>> GetDrugCostByDeptReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetDrugCostByDeptReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 15.12 Báo cáo chi phí thuốc theo bệnh nhân
        /// </summary>
        [HttpGet("api/pharmacy/reports/drug-cost-by-patient")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Accountant)]
        public async Task<ActionResult<List<DrugCostByPatientReportDto>>> GetDrugCostByPatientReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? patientId = null,
            [FromQuery] string patientType = null)
        {
            var result = await _service.GetDrugCostByPatientReportAsync(fromDate, toDate, patientId, patientType);
            return Ok(result);
        }

        /// <summary>
        /// 15.13 Báo cáo thuốc BHYT/Viện phí
        /// </summary>
        [HttpGet("api/pharmacy/reports/drug-by-payment-type")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Accountant)]
        public async Task<ActionResult<List<DrugByPaymentTypeReportDto>>> GetDrugByPaymentTypeReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string paymentType = null)
        {
            var result = await _service.GetDrugByPaymentTypeReportAsync(fromDate, toDate, paymentType);
            return Ok(result);
        }

        /// <summary>
        /// 15.14 Thống kê đơn thuốc ngoại trú
        /// </summary>
        [HttpGet("api/pharmacy/reports/outpatient-prescription-stat")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<List<OutpatientPrescriptionStatDto>>> GetOutpatientPrescriptionStat(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? doctorId = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetOutpatientPrescriptionStatAsync(fromDate, toDate, doctorId, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 15.15 Thống kê đơn thuốc nội trú
        /// </summary>
        [HttpGet("api/pharmacy/reports/inpatient-prescription-stat")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<List<InpatientPrescriptionStatDto>>> GetInpatientPrescriptionStat(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetInpatientPrescriptionStatAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 15.16 Báo cáo ABC/VEN
        /// </summary>
        [HttpGet("api/pharmacy/reports/abc-ven")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<ABCVENReportDto>> GetABCVENReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetABCVENReportAsync(fromDate, toDate, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.17 Báo cáo DDD
        /// </summary>
        [HttpGet("api/pharmacy/reports/ddd")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<List<DDDReportDto>>> GetDDDReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? medicineId = null)
        {
            var result = await _service.GetDDDReportAsync(fromDate, toDate, medicineId);
            return Ok(result);
        }

        /// <summary>
        /// In báo cáo dược
        /// </summary>
        [HttpPost("api/pharmacy/reports/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<IActionResult> PrintPharmacyReport([FromBody] PharmacyReportRequest request)
        {
            var result = await _service.PrintPharmacyReportAsync(request);
            return File(result, "application/pdf", $"PharmacyReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        /// <summary>
        /// Xuất Excel báo cáo dược
        /// </summary>
        [HttpPost("api/pharmacy/reports/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.PharmacyManager + "," + RoleNames.Pharmacist)]
        public async Task<IActionResult> ExportPharmacyReport([FromBody] PharmacyReportRequest request)
        {
            var result = await _service.ExportPharmacyReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"PharmacyReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
