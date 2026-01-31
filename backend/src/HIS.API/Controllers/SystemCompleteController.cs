using System;
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
    public class SystemCompleteController : ControllerBase
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
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
        [Authorize(Roles = "Admin,Accountant,Cashier")]
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
        [Authorize(Roles = "Admin,Accountant,InsuranceOfficer")]
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
        [Authorize(Roles = "Admin,Accountant,InsuranceOfficer")]
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
        [Authorize(Roles = "Admin,Accountant,Manager")]
        public async Task<IActionResult> PrintFinancialReport([FromBody] FinancialReportRequest request)
        {
            var result = await _service.PrintFinancialReportAsync(request);
            return File(result, "application/pdf", $"FinancialReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        /// <summary>
        /// Xuất Excel báo cáo tài chính
        /// </summary>
        [HttpPost("api/finance/reports/export")]
        [Authorize(Roles = "Admin,Accountant,Manager")]
        public async Task<IActionResult> ExportFinancialReport([FromBody] FinancialReportRequest request)
        {
            var result = await _service.ExportFinancialReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"FinancialReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }

        #endregion

        #region Module 13: Quản lý Danh mục

        // 13.1 Danh mục dịch vụ khám
        [HttpGet("api/catalog/examination-services")]
        public async Task<ActionResult<List<ExaminationServiceCatalogDto>>> GetExaminationServices(
            [FromQuery] string keyword = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetExaminationServicesAsync(keyword, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/examination-services/{serviceId}")]
        public async Task<ActionResult<ExaminationServiceCatalogDto>> GetExaminationService(Guid serviceId)
        {
            var result = await _service.GetExaminationServiceAsync(serviceId);
            return Ok(result);
        }

        [HttpPost("api/catalog/examination-services")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<ExaminationServiceCatalogDto>> SaveExaminationService([FromBody] ExaminationServiceCatalogDto dto)
        {
            var result = await _service.SaveExaminationServiceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/examination-services/{serviceId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteExaminationService(Guid serviceId)
        {
            var result = await _service.DeleteExaminationServiceAsync(serviceId);
            return Ok(result);
        }

        // 13.2 Danh mục dịch vụ cận lâm sàng
        [HttpGet("api/catalog/paraclinical-services")]
        public async Task<ActionResult<List<ParaclinicalServiceCatalogDto>>> GetParaclinicalServices(
            [FromQuery] string keyword = null,
            [FromQuery] string serviceType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetParaclinicalServicesAsync(keyword, serviceType, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/paraclinical-services/{serviceId}")]
        public async Task<ActionResult<ParaclinicalServiceCatalogDto>> GetParaclinicalService(Guid serviceId)
        {
            var result = await _service.GetParaclinicalServiceAsync(serviceId);
            return Ok(result);
        }

        [HttpPost("api/catalog/paraclinical-services")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<ParaclinicalServiceCatalogDto>> SaveParaclinicalService([FromBody] ParaclinicalServiceCatalogDto dto)
        {
            var result = await _service.SaveParaclinicalServiceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/paraclinical-services/{serviceId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteParaclinicalService(Guid serviceId)
        {
            var result = await _service.DeleteParaclinicalServiceAsync(serviceId);
            return Ok(result);
        }

        // 13.3 Danh mục thuốc
        [HttpGet("api/catalog/medicines")]
        public async Task<ActionResult<List<MedicineCatalogDto>>> GetMedicines([FromQuery] MedicineCatalogSearchDto search)
        {
            var result = await _service.GetMedicinesAsync(search);
            return Ok(result);
        }

        [HttpGet("api/catalog/medicines/{medicineId}")]
        public async Task<ActionResult<MedicineCatalogDto>> GetMedicine(Guid medicineId)
        {
            var result = await _service.GetMedicineAsync(medicineId);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicines")]
        [Authorize(Roles = "Admin,CatalogManager,PharmacyManager")]
        public async Task<ActionResult<MedicineCatalogDto>> SaveMedicine([FromBody] MedicineCatalogDto dto)
        {
            var result = await _service.SaveMedicineAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/medicines/{medicineId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteMedicine(Guid medicineId)
        {
            var result = await _service.DeleteMedicineAsync(medicineId);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicines/import")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<bool>> ImportMedicines([FromBody] byte[] fileData)
        {
            var result = await _service.ImportMedicinesFromExcelAsync(fileData);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicines/export")]
        [Authorize(Roles = "Admin,CatalogManager,PharmacyManager")]
        public async Task<IActionResult> ExportMedicines([FromBody] MedicineCatalogSearchDto search)
        {
            var result = await _service.ExportMedicinesToExcelAsync(search);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Medicines.xlsx");
        }

        // 13.4 Danh mục vật tư y tế
        [HttpGet("api/catalog/medical-supplies")]
        public async Task<ActionResult<List<MedicalSupplyCatalogDto>>> GetMedicalSupplies(
            [FromQuery] string keyword = null,
            [FromQuery] Guid? categoryId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetMedicalSuppliesAsync(keyword, categoryId, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/medical-supplies/{supplyId}")]
        public async Task<ActionResult<MedicalSupplyCatalogDto>> GetMedicalSupply(Guid supplyId)
        {
            var result = await _service.GetMedicalSupplyAsync(supplyId);
            return Ok(result);
        }

        [HttpPost("api/catalog/medical-supplies")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<MedicalSupplyCatalogDto>> SaveMedicalSupply([FromBody] MedicalSupplyCatalogDto dto)
        {
            var result = await _service.SaveMedicalSupplyAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/medical-supplies/{supplyId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteMedicalSupply(Guid supplyId)
        {
            var result = await _service.DeleteMedicalSupplyAsync(supplyId);
            return Ok(result);
        }

        // 13.5 Danh mục ICD-10
        [HttpGet("api/catalog/icd10")]
        public async Task<ActionResult<List<ICD10CatalogDto>>> GetICD10Codes(
            [FromQuery] string keyword = null,
            [FromQuery] string chapterCode = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetICD10CodesAsync(keyword, chapterCode, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/icd10/{icd10Id}")]
        public async Task<ActionResult<ICD10CatalogDto>> GetICD10Code(Guid icd10Id)
        {
            var result = await _service.GetICD10CodeAsync(icd10Id);
            return Ok(result);
        }

        [HttpPost("api/catalog/icd10")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<ICD10CatalogDto>> SaveICD10Code([FromBody] ICD10CatalogDto dto)
        {
            var result = await _service.SaveICD10CodeAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/icd10/{icd10Id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteICD10Code(Guid icd10Id)
        {
            var result = await _service.DeleteICD10CodeAsync(icd10Id);
            return Ok(result);
        }

        [HttpPost("api/catalog/icd10/import")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> ImportICD10([FromBody] byte[] fileData)
        {
            var result = await _service.ImportICD10FromExcelAsync(fileData);
            return Ok(result);
        }

        [HttpGet("api/catalog/icd10/export")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<IActionResult> ExportICD10([FromQuery] string chapterCode = null)
        {
            var result = await _service.ExportICD10ToExcelAsync(chapterCode);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ICD10.xlsx");
        }

        // 13.6 Danh mục khoa phòng
        [HttpGet("api/catalog/departments")]
        public async Task<ActionResult<List<DepartmentCatalogDto>>> GetDepartments(
            [FromQuery] string keyword = null,
            [FromQuery] string departmentType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetDepartmentsAsync(keyword, departmentType, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/departments/{departmentId}")]
        public async Task<ActionResult<DepartmentCatalogDto>> GetDepartment(Guid departmentId)
        {
            var result = await _service.GetDepartmentAsync(departmentId);
            return Ok(result);
        }

        [HttpPost("api/catalog/departments")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DepartmentCatalogDto>> SaveDepartment([FromBody] DepartmentCatalogDto dto)
        {
            var result = await _service.SaveDepartmentAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/departments/{departmentId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteDepartment(Guid departmentId)
        {
            var result = await _service.DeleteDepartmentAsync(departmentId);
            return Ok(result);
        }

        // 13.7 Danh mục phòng/giường
        [HttpGet("api/catalog/rooms")]
        public async Task<ActionResult<List<RoomCatalogDto>>> GetRooms(
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string roomType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetRoomsAsync(departmentId, roomType, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/rooms/{roomId}")]
        public async Task<ActionResult<RoomCatalogDto>> GetRoom(Guid roomId)
        {
            var result = await _service.GetRoomAsync(roomId);
            return Ok(result);
        }

        [HttpPost("api/catalog/rooms")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<RoomCatalogDto>> SaveRoom([FromBody] RoomCatalogDto dto)
        {
            var result = await _service.SaveRoomAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/rooms/{roomId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteRoom(Guid roomId)
        {
            var result = await _service.DeleteRoomAsync(roomId);
            return Ok(result);
        }

        [HttpGet("api/catalog/beds")]
        public async Task<ActionResult<List<BedCatalogDto>>> GetBeds(
            [FromQuery] Guid? roomId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetBedsAsync(roomId, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/beds/{bedId}")]
        public async Task<ActionResult<BedCatalogDto>> GetBed(Guid bedId)
        {
            var result = await _service.GetBedAsync(bedId);
            return Ok(result);
        }

        [HttpPost("api/catalog/beds")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<BedCatalogDto>> SaveBed([FromBody] BedCatalogDto dto)
        {
            var result = await _service.SaveBedAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/beds/{bedId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteBed(Guid bedId)
        {
            var result = await _service.DeleteBedAsync(bedId);
            return Ok(result);
        }

        // 13.8 Danh mục nhân viên
        [HttpGet("api/catalog/employees")]
        public async Task<ActionResult<List<EmployeeCatalogDto>>> GetEmployees(
            [FromQuery] string keyword = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string position = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetEmployeesAsync(keyword, departmentId, position, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/employees/{employeeId}")]
        public async Task<ActionResult<EmployeeCatalogDto>> GetEmployee(Guid employeeId)
        {
            var result = await _service.GetEmployeeAsync(employeeId);
            return Ok(result);
        }

        [HttpPost("api/catalog/employees")]
        [Authorize(Roles = "Admin,HRManager")]
        public async Task<ActionResult<EmployeeCatalogDto>> SaveEmployee([FromBody] EmployeeCatalogDto dto)
        {
            var result = await _service.SaveEmployeeAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/employees/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteEmployee(Guid employeeId)
        {
            var result = await _service.DeleteEmployeeAsync(employeeId);
            return Ok(result);
        }

        // 13.9 Danh mục nhà cung cấp
        [HttpGet("api/catalog/suppliers")]
        public async Task<ActionResult<List<SupplierCatalogDto>>> GetSuppliers(
            [FromQuery] string keyword = null,
            [FromQuery] string supplierType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetSuppliersAsync(keyword, supplierType, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/suppliers/{supplierId}")]
        public async Task<ActionResult<SupplierCatalogDto>> GetSupplier(Guid supplierId)
        {
            var result = await _service.GetSupplierAsync(supplierId);
            return Ok(result);
        }

        [HttpPost("api/catalog/suppliers")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<SupplierCatalogDto>> SaveSupplier([FromBody] SupplierCatalogDto dto)
        {
            var result = await _service.SaveSupplierAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/suppliers/{supplierId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteSupplier(Guid supplierId)
        {
            var result = await _service.DeleteSupplierAsync(supplierId);
            return Ok(result);
        }

        // 13.10 Danh mục giá viện phí
        [HttpGet("api/catalog/service-prices")]
        public async Task<ActionResult<List<ServicePriceCatalogDto>>> GetServicePrices(
            [FromQuery] Guid? serviceId = null,
            [FromQuery] string priceType = null,
            [FromQuery] DateTime? effectiveDate = null)
        {
            var result = await _service.GetServicePricesAsync(serviceId, priceType, effectiveDate);
            return Ok(result);
        }

        [HttpGet("api/catalog/service-prices/{priceId}")]
        public async Task<ActionResult<ServicePriceCatalogDto>> GetServicePrice(Guid priceId)
        {
            var result = await _service.GetServicePriceAsync(priceId);
            return Ok(result);
        }

        [HttpPost("api/catalog/service-prices")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<ServicePriceCatalogDto>> SaveServicePrice([FromBody] ServicePriceCatalogDto dto)
        {
            var result = await _service.SaveServicePriceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/service-prices/{priceId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteServicePrice(Guid priceId)
        {
            var result = await _service.DeleteServicePriceAsync(priceId);
            return Ok(result);
        }

        // 13.11-17 Additional Catalogs
        [HttpGet("api/catalog/patient-types")]
        public async Task<ActionResult<List<PatientTypeCatalogDto>>> GetPatientTypes([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetPatientTypesAsync(isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/patient-types")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<PatientTypeCatalogDto>> SavePatientType([FromBody] PatientTypeCatalogDto dto)
        {
            var result = await _service.SavePatientTypeAsync(dto);
            return Ok(result);
        }

        [HttpGet("api/catalog/admission-sources")]
        public async Task<ActionResult<List<AdmissionSourceCatalogDto>>> GetAdmissionSources([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetAdmissionSourcesAsync(isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/admission-sources")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<AdmissionSourceCatalogDto>> SaveAdmissionSource([FromBody] AdmissionSourceCatalogDto dto)
        {
            var result = await _service.SaveAdmissionSourceAsync(dto);
            return Ok(result);
        }

        [HttpGet("api/catalog/print-templates")]
        public async Task<ActionResult<List<PrintTemplateCatalogDto>>> GetPrintTemplates(
            [FromQuery] string templateType = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetPrintTemplatesAsync(templateType, departmentId, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/print-templates")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<PrintTemplateCatalogDto>> SavePrintTemplate([FromBody] PrintTemplateCatalogDto dto)
        {
            var result = await _service.SavePrintTemplateAsync(dto);
            return Ok(result);
        }

        [HttpGet("api/catalog/medical-record-templates")]
        public async Task<ActionResult<List<MedicalRecordTemplateCatalogDto>>> GetMedicalRecordTemplates(
            [FromQuery] string templateType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetMedicalRecordTemplatesAsync(templateType, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/medical-record-templates")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<MedicalRecordTemplateCatalogDto>> SaveMedicalRecordTemplate([FromBody] MedicalRecordTemplateCatalogDto dto)
        {
            var result = await _service.SaveMedicalRecordTemplateAsync(dto);
            return Ok(result);
        }

        [HttpGet("api/catalog/service-groups")]
        public async Task<ActionResult<List<ServiceGroupCatalogDto>>> GetServiceGroups(
            [FromQuery] string groupType = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetServiceGroupsAsync(groupType, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/service-groups")]
        [Authorize(Roles = "Admin,CatalogManager")]
        public async Task<ActionResult<ServiceGroupCatalogDto>> SaveServiceGroup([FromBody] ServiceGroupCatalogDto dto)
        {
            var result = await _service.SaveServiceGroupAsync(dto);
            return Ok(result);
        }

        [HttpGet("api/catalog/medicine-groups")]
        public async Task<ActionResult<List<MedicineGroupCatalogDto>>> GetMedicineGroups([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetMedicineGroupsAsync(isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicine-groups")]
        [Authorize(Roles = "Admin,CatalogManager,PharmacyManager")]
        public async Task<ActionResult<MedicineGroupCatalogDto>> SaveMedicineGroup([FromBody] MedicineGroupCatalogDto dto)
        {
            var result = await _service.SaveMedicineGroupAsync(dto);
            return Ok(result);
        }

        // 13.17 Đồng bộ BHXH
        [HttpPost("api/catalog/sync/bhxh/medicines")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SyncResultDto>> SyncBHXHMedicines()
        {
            var result = await _service.SyncBHXHMedicinesAsync();
            return Ok(result);
        }

        [HttpPost("api/catalog/sync/bhxh/services")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SyncResultDto>> SyncBHXHServices()
        {
            var result = await _service.SyncBHXHServicesAsync();
            return Ok(result);
        }

        [HttpPost("api/catalog/sync/bhxh/icd10")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SyncResultDto>> SyncBHXHICD10()
        {
            var result = await _service.SyncBHXHICD10Async();
            return Ok(result);
        }

        [HttpGet("api/catalog/sync/last-date")]
        public async Task<ActionResult<DateTime?>> GetLastSyncDate([FromQuery] string syncType)
        {
            var result = await _service.GetLastSyncDateAsync(syncType);
            return Ok(result);
        }

        #endregion

        #region Module 15: Báo cáo Dược

        /// <summary>
        /// 15.1 Sổ theo dõi thuốc gây nghiện
        /// </summary>
        [HttpGet("api/pharmacy/reports/narcotic-drugs")]
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist,InfectionControl")]
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
        [Authorize(Roles = "Admin,PharmacyManager")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
        public async Task<ActionResult<List<ExpiredDrugReportDto>>> GetExpiredDrugReport([FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetExpiredDrugReportAsync(warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.10 Báo cáo thuốc tồn kho dưới mức tối thiểu
        /// </summary>
        [HttpGet("api/pharmacy/reports/low-stock-drugs")]
        [Authorize(Roles = "Admin,PharmacyManager")]
        public async Task<ActionResult<List<LowStockDrugReportDto>>> GetLowStockDrugReport([FromQuery] Guid? warehouseId = null)
        {
            var result = await _service.GetLowStockDrugReportAsync(warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// 15.11 Báo cáo chi phí thuốc theo khoa
        /// </summary>
        [HttpGet("api/pharmacy/reports/drug-cost-by-dept")]
        [Authorize(Roles = "Admin,PharmacyManager,Accountant")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Accountant")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Accountant")]
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
        [Authorize(Roles = "Admin,PharmacyManager")]
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
        [Authorize(Roles = "Admin,PharmacyManager")]
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
        [Authorize(Roles = "Admin,PharmacyManager")]
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
        [Authorize(Roles = "Admin,PharmacyManager")]
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
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
        public async Task<IActionResult> PrintPharmacyReport([FromBody] PharmacyReportRequest request)
        {
            var result = await _service.PrintPharmacyReportAsync(request);
            return File(result, "application/pdf", $"PharmacyReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        /// <summary>
        /// Xuất Excel báo cáo dược
        /// </summary>
        [HttpPost("api/pharmacy/reports/export")]
        [Authorize(Roles = "Admin,PharmacyManager,Pharmacist")]
        public async Task<IActionResult> ExportPharmacyReport([FromBody] PharmacyReportRequest request)
        {
            var result = await _service.ExportPharmacyReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"PharmacyReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }

        #endregion

        #region Module 16: HSBA & Thống kê

        // 16.1 Quản lý lưu trữ hồ sơ bệnh án
        [HttpGet("api/medical-records/archives")]
        [Authorize(Roles = "Admin,MedicalRecordManager,Doctor")]
        public async Task<ActionResult<List<MedicalRecordArchiveDto>>> GetMedicalRecordArchives(
            [FromQuery] string keyword = null,
            [FromQuery] int? year = null,
            [FromQuery] string archiveStatus = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetMedicalRecordArchivesAsync(keyword, year, archiveStatus, departmentId);
            return Ok(result);
        }

        [HttpGet("api/medical-records/archives/{archiveId}")]
        [Authorize(Roles = "Admin,MedicalRecordManager,Doctor")]
        public async Task<ActionResult<MedicalRecordArchiveDto>> GetMedicalRecordArchive(Guid archiveId)
        {
            var result = await _service.GetMedicalRecordArchiveAsync(archiveId);
            return Ok(result);
        }

        [HttpPost("api/medical-records/archives")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<MedicalRecordArchiveDto>> SaveMedicalRecordArchive([FromBody] MedicalRecordArchiveDto dto)
        {
            var result = await _service.SaveMedicalRecordArchiveAsync(dto);
            return Ok(result);
        }

        [HttpPut("api/medical-records/archives/{archiveId}/location")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<bool>> UpdateArchiveLocation(Guid archiveId, [FromBody] string location)
        {
            var result = await _service.UpdateArchiveLocationAsync(archiveId, location);
            return Ok(result);
        }

        // 16.2 Quản lý mượn trả hồ sơ
        [HttpGet("api/medical-records/borrow-requests")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<List<MedicalRecordBorrowRequestDto>>> GetBorrowRequests(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string status = null,
            [FromQuery] Guid? borrowerId = null)
        {
            var result = await _service.GetBorrowRequestsAsync(fromDate, toDate, status, borrowerId);
            return Ok(result);
        }

        [HttpGet("api/medical-records/borrow-requests/{requestId}")]
        [Authorize(Roles = "Admin,MedicalRecordManager,Doctor")]
        public async Task<ActionResult<MedicalRecordBorrowRequestDto>> GetBorrowRequest(Guid requestId)
        {
            var result = await _service.GetBorrowRequestAsync(requestId);
            return Ok(result);
        }

        [HttpPost("api/medical-records/borrow-requests")]
        [Authorize(Roles = "Admin,MedicalRecordManager,Doctor")]
        public async Task<ActionResult<MedicalRecordBorrowRequestDto>> CreateBorrowRequest([FromBody] CreateBorrowRequestDto dto)
        {
            var result = await _service.CreateBorrowRequestAsync(dto);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/approve")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<bool>> ApproveBorrowRequest(Guid requestId)
        {
            var result = await _service.ApproveBorrowRequestAsync(requestId);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/reject")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<bool>> RejectBorrowRequest(Guid requestId, [FromBody] string reason)
        {
            var result = await _service.RejectBorrowRequestAsync(requestId, reason);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/process")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<bool>> ProcessBorrow(Guid requestId)
        {
            var result = await _service.ProcessBorrowAsync(requestId);
            return Ok(result);
        }

        [HttpPut("api/medical-records/borrow-requests/{requestId}/return")]
        [Authorize(Roles = "Admin,MedicalRecordManager")]
        public async Task<ActionResult<bool>> ReturnMedicalRecord(Guid requestId, [FromBody] string note)
        {
            var result = await _service.ReturnMedicalRecordAsync(requestId, note);
            return Ok(result);
        }

        // 16.3 Dashboard thống kê
        [HttpGet("api/statistics/dashboard")]
        [Authorize(Roles = "Admin,Manager,Director")]
        public async Task<ActionResult<HospitalDashboardDto>> GetHospitalDashboard([FromQuery] DateTime? date = null)
        {
            var result = await _service.GetHospitalDashboardAsync(date);
            return Ok(result);
        }

        [HttpGet("api/statistics/departments")]
        [Authorize(Roles = "Admin,Manager,Director")]
        public async Task<ActionResult<List<DepartmentStatisticsDto>>> GetDepartmentStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetDepartmentStatisticsAsync(fromDate, toDate);
            return Ok(result);
        }

        // 16.4 Báo cáo khám bệnh
        [HttpGet("api/statistics/examination")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<ExaminationStatisticsDto>>> GetExaminationStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? doctorId = null)
        {
            var result = await _service.GetExaminationStatisticsAsync(fromDate, toDate, departmentId, doctorId);
            return Ok(result);
        }

        // 16.5 Báo cáo nhập viện
        [HttpGet("api/statistics/admission")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<AdmissionStatisticsDto>>> GetAdmissionStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string admissionSource = null)
        {
            var result = await _service.GetAdmissionStatisticsAsync(fromDate, toDate, departmentId, admissionSource);
            return Ok(result);
        }

        // 16.6 Báo cáo xuất viện
        [HttpGet("api/statistics/discharge")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<DischargeStatisticsDto>>> GetDischargeStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string dischargeType = null)
        {
            var result = await _service.GetDischargeStatisticsAsync(fromDate, toDate, departmentId, dischargeType);
            return Ok(result);
        }

        // 16.7 Báo cáo tử vong
        [HttpGet("api/statistics/mortality")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<MortalityStatisticsDto>>> GetMortalityStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetMortalityStatisticsAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.8 Báo cáo bệnh theo ICD-10
        [HttpGet("api/statistics/disease")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<DiseaseStatisticsDto>>> GetDiseaseStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string icdChapter = null,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetDiseaseStatisticsAsync(fromDate, toDate, icdChapter, departmentId);
            return Ok(result);
        }

        // 16.9 Báo cáo hoạt động khoa
        [HttpGet("api/statistics/department-activity")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<DepartmentActivityReportDto>>> GetDepartmentActivityReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetDepartmentActivityReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.10 Báo cáo công suất giường
        [HttpGet("api/statistics/bed-occupancy")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<List<BedOccupancyReportDto>>> GetBedOccupancyReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _service.GetBedOccupancyReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        // 16.11 Báo cáo A1-A2-A3 (BYT)
        [HttpGet("api/statistics/byt-report")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<ActionResult<BYTReportDto>> GetBYTReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetBYTReportAsync(fromDate, toDate);
            return Ok(result);
        }

        // 16.12 Báo cáo KPI
        [HttpGet("api/statistics/kpi")]
        [Authorize(Roles = "Admin,Manager,Director")]
        public async Task<ActionResult<List<HospitalKPIDto>>> GetHospitalKPIs(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _service.GetHospitalKPIsAsync(fromDate, toDate);
            return Ok(result);
        }

        // In báo cáo thống kê
        [HttpPost("api/statistics/reports/print")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<IActionResult> PrintStatisticsReport([FromBody] StatisticsReportRequest request)
        {
            var result = await _service.PrintStatisticsReportAsync(request);
            return File(result, "application/pdf", $"StatisticsReport_{DateTime.Now:yyyyMMdd}.pdf");
        }

        [HttpPost("api/statistics/reports/export")]
        [Authorize(Roles = "Admin,Manager,Director,StatisticsOfficer")]
        public async Task<IActionResult> ExportStatisticsReport([FromBody] StatisticsReportRequest request)
        {
            var result = await _service.ExportStatisticsReportToExcelAsync(request);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StatisticsReport_{DateTime.Now:yyyyMMdd}.xlsx");
        }

        #endregion

        #region Module 17: Quản trị Hệ thống

        // 17.1 Quản lý người dùng
        [HttpGet("api/admin/users")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<SystemUserDto>>> GetUsers(
            [FromQuery] string keyword = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetUsersAsync(keyword, departmentId, isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/users/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemUserDto>> GetUser(Guid userId)
        {
            var result = await _service.GetUserAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemUserDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            var result = await _service.CreateUserAsync(dto);
            return Ok(result);
        }

        [HttpPut("api/admin/users/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemUserDto>> UpdateUser(Guid userId, [FromBody] UpdateUserDto dto)
        {
            var result = await _service.UpdateUserAsync(userId, dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/users/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteUser(Guid userId)
        {
            var result = await _service.DeleteUserAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/reset-password")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> ResetPassword(Guid userId)
        {
            var result = await _service.ResetPasswordAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/change-password")]
        [Authorize]
        public async Task<ActionResult<bool>> ChangePassword(Guid userId, [FromBody] AdminChangePasswordDto dto)
        {
            var result = await _service.ChangePasswordAsync(userId, dto);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/lock")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> LockUser(Guid userId, [FromBody] string reason)
        {
            var result = await _service.LockUserAsync(userId, reason);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/unlock")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> UnlockUser(Guid userId)
        {
            var result = await _service.UnlockUserAsync(userId);
            return Ok(result);
        }

        // 17.2 Quản lý vai trò
        [HttpGet("api/admin/roles")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<RoleDto>>> GetRoles([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetRolesAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/roles/{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<RoleDto>> GetRole(Guid roleId)
        {
            var result = await _service.GetRoleAsync(roleId);
            return Ok(result);
        }

        [HttpPost("api/admin/roles")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<RoleDto>> SaveRole([FromBody] RoleDto dto)
        {
            var result = await _service.SaveRoleAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/roles/{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteRole(Guid roleId)
        {
            var result = await _service.DeleteRoleAsync(roleId);
            return Ok(result);
        }

        // 17.3 Quản lý quyền
        [HttpGet("api/admin/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<PermissionDto>>> GetPermissions([FromQuery] string module = null)
        {
            var result = await _service.GetPermissionsAsync(module);
            return Ok(result);
        }

        [HttpGet("api/admin/roles/{roleId}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<PermissionDto>>> GetRolePermissions(Guid roleId)
        {
            var result = await _service.GetRolePermissionsAsync(roleId);
            return Ok(result);
        }

        [HttpPut("api/admin/roles/{roleId}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> UpdateRolePermissions(Guid roleId, [FromBody] List<Guid> permissionIds)
        {
            var result = await _service.UpdateRolePermissionsAsync(roleId, permissionIds);
            return Ok(result);
        }

        [HttpGet("api/admin/users/{userId}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<PermissionDto>>> GetUserPermissions(Guid userId)
        {
            var result = await _service.GetUserPermissionsAsync(userId);
            return Ok(result);
        }

        [HttpPut("api/admin/users/{userId}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> UpdateUserPermissions(Guid userId, [FromBody] List<Guid> permissionIds)
        {
            var result = await _service.UpdateUserPermissionsAsync(userId, permissionIds);
            return Ok(result);
        }

        // 17.4 Nhật ký hệ thống
        [HttpGet("api/admin/audit-logs")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<AuditLogDto>>> GetAuditLogs([FromQuery] AuditLogSearchDto search)
        {
            var result = await _service.GetAuditLogsAsync(search);
            return Ok(result);
        }

        [HttpGet("api/admin/audit-logs/{logId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AuditLogDto>> GetAuditLog(Guid logId)
        {
            var result = await _service.GetAuditLogAsync(logId);
            return Ok(result);
        }

        [HttpPost("api/admin/audit-logs/export")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportAuditLogs([FromBody] AuditLogSearchDto search)
        {
            var result = await _service.ExportAuditLogsToExcelAsync(search);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "AuditLogs.xlsx");
        }

        // 17.5 Cấu hình hệ thống
        [HttpGet("api/admin/configs")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<SystemConfigDto>>> GetSystemConfigs([FromQuery] string category = null)
        {
            var result = await _service.GetSystemConfigsAsync(category);
            return Ok(result);
        }

        [HttpGet("api/admin/configs/{configKey}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemConfigDto>> GetSystemConfig(string configKey)
        {
            var result = await _service.GetSystemConfigAsync(configKey);
            return Ok(result);
        }

        [HttpPost("api/admin/configs")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemConfigDto>> SaveSystemConfig([FromBody] SystemConfigDto dto)
        {
            var result = await _service.SaveSystemConfigAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/configs/{configKey}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteSystemConfig(string configKey)
        {
            var result = await _service.DeleteSystemConfigAsync(configKey);
            return Ok(result);
        }

        // 17.6 Quản lý phiên đăng nhập
        [HttpGet("api/admin/sessions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<UserSessionDto>>> GetActiveSessions([FromQuery] Guid? userId = null)
        {
            var result = await _service.GetActiveSessionsAsync(userId);
            return Ok(result);
        }

        [HttpDelete("api/admin/sessions/{sessionId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> TerminateSession(Guid sessionId)
        {
            var result = await _service.TerminateSessionAsync(sessionId);
            return Ok(result);
        }

        [HttpDelete("api/admin/users/{userId}/sessions")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> TerminateAllSessions(Guid userId)
        {
            var result = await _service.TerminateAllSessionsAsync(userId);
            return Ok(result);
        }

        // 17.7 Quản lý thông báo hệ thống
        [HttpGet("api/admin/notifications")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<SystemNotificationDto>>> GetSystemNotifications([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetSystemNotificationsAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/notifications/{notificationId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemNotificationDto>> GetSystemNotification(Guid notificationId)
        {
            var result = await _service.GetSystemNotificationAsync(notificationId);
            return Ok(result);
        }

        [HttpPost("api/admin/notifications")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemNotificationDto>> SaveSystemNotification([FromBody] SystemNotificationDto dto)
        {
            var result = await _service.SaveSystemNotificationAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/notifications/{notificationId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteSystemNotification(Guid notificationId)
        {
            var result = await _service.DeleteSystemNotificationAsync(notificationId);
            return Ok(result);
        }

        // 17.8 Sao lưu dữ liệu
        [HttpGet("api/admin/backups")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<BackupHistoryDto>>> GetBackupHistory(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _service.GetBackupHistoryAsync(fromDate, toDate);
            return Ok(result);
        }

        [HttpPost("api/admin/backups")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<BackupHistoryDto>> CreateBackup([FromBody] CreateBackupDto dto)
        {
            var result = await _service.CreateBackupAsync(dto);
            return Ok(result);
        }

        [HttpPost("api/admin/backups/{backupId}/restore")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> RestoreBackup(Guid backupId)
        {
            var result = await _service.RestoreBackupAsync(backupId);
            return Ok(result);
        }

        [HttpDelete("api/admin/backups/{backupId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteBackup(Guid backupId)
        {
            var result = await _service.DeleteBackupAsync(backupId);
            return Ok(result);
        }

        // 17.9 Giám sát hệ thống
        [HttpGet("api/admin/health")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SystemHealthDto>> GetSystemHealth()
        {
            var result = await _service.GetSystemHealthAsync();
            return Ok(result);
        }

        [HttpGet("api/admin/resources")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<SystemResourceDto>>> GetSystemResources()
        {
            var result = await _service.GetSystemResourcesAsync();
            return Ok(result);
        }

        [HttpGet("api/admin/database-statistics")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<DatabaseStatisticsDto>>> GetDatabaseStatistics()
        {
            var result = await _service.GetDatabaseStatisticsAsync();
            return Ok(result);
        }

        // 17.10 Quản lý tích hợp
        [HttpGet("api/admin/integrations")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<IntegrationConfigDto>>> GetIntegrationConfigs([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetIntegrationConfigsAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/integrations/{integrationId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IntegrationConfigDto>> GetIntegrationConfig(Guid integrationId)
        {
            var result = await _service.GetIntegrationConfigAsync(integrationId);
            return Ok(result);
        }

        [HttpPost("api/admin/integrations")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IntegrationConfigDto>> SaveIntegrationConfig([FromBody] IntegrationConfigDto dto)
        {
            var result = await _service.SaveIntegrationConfigAsync(dto);
            return Ok(result);
        }

        [HttpPost("api/admin/integrations/{integrationId}/test")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> TestIntegrationConnection(Guid integrationId)
        {
            var result = await _service.TestIntegrationConnectionAsync(integrationId);
            return Ok(result);
        }

        [HttpGet("api/admin/integrations/{integrationId}/logs")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<IntegrationLogDto>>> GetIntegrationLogs(
            Guid integrationId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _service.GetIntegrationLogsAsync(integrationId, fromDate, toDate);
            return Ok(result);
        }

        #endregion
    }
}
