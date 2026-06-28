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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<ExaminationServiceCatalogDto>> SaveExaminationService([FromBody] ExaminationServiceCatalogDto dto)
        {
            var result = await _service.SaveExaminationServiceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/examination-services/{serviceId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<ParaclinicalServiceCatalogDto>> SaveParaclinicalService([FromBody] ParaclinicalServiceCatalogDto dto)
        {
            var result = await _service.SaveParaclinicalServiceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/paraclinical-services/{serviceId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<MedicineCatalogDto>> SaveMedicine([FromBody] MedicineCatalogDto dto)
        {
            var result = await _service.SaveMedicineAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/medicines/{medicineId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteMedicine(Guid medicineId)
        {
            var result = await _service.DeleteMedicineAsync(medicineId);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicines/import")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<bool>> ImportMedicines([FromBody] byte[] fileData)
        {
            var result = await _service.ImportMedicinesFromExcelAsync(fileData);
            return Ok(result);
        }

        [HttpPost("api/catalog/medicines/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager + "," + RoleNames.PharmacyManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<MedicalSupplyCatalogDto>> SaveMedicalSupply([FromBody] MedicalSupplyCatalogDto dto)
        {
            var result = await _service.SaveMedicalSupplyAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/medical-supplies/{supplyId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<ICD10CatalogDto>> SaveICD10Code([FromBody] ICD10CatalogDto dto)
        {
            var result = await _service.SaveICD10CodeAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/icd10/{icd10Id}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteICD10Code(Guid icd10Id)
        {
            var result = await _service.DeleteICD10CodeAsync(icd10Id);
            return Ok(result);
        }

        [HttpPost("api/catalog/icd10/import")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> ImportICD10([FromBody] byte[] fileData)
        {
            var result = await _service.ImportICD10FromExcelAsync(fileData);
            return Ok(result);
        }

        [HttpGet("api/catalog/icd10/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<DepartmentCatalogDto>> SaveDepartment([FromBody] DepartmentCatalogDto dto)
        {
            var result = await _service.SaveDepartmentAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/departments/{departmentId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<RoomCatalogDto>> SaveRoom([FromBody] RoomCatalogDto dto)
        {
            var result = await _service.SaveRoomAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/rooms/{roomId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<BedCatalogDto>> SaveBed([FromBody] BedCatalogDto dto)
        {
            var result = await _service.SaveBedAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/beds/{bedId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.HRManager)]
        public async Task<ActionResult<EmployeeCatalogDto>> SaveEmployee([FromBody] EmployeeCatalogDto dto)
        {
            var result = await _service.SaveEmployeeAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/employees/{employeeId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<SupplierCatalogDto>> SaveSupplier([FromBody] SupplierCatalogDto dto)
        {
            var result = await _service.SaveSupplierAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/suppliers/{supplierId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<ServicePriceCatalogDto>> SaveServicePrice([FromBody] ServicePriceCatalogDto dto)
        {
            var result = await _service.SaveServicePriceAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/service-prices/{priceId}")]
        [Authorize(Roles = RoleNames.Admin)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager + "," + RoleNames.PharmacyManager)]
        public async Task<ActionResult<MedicineGroupCatalogDto>> SaveMedicineGroup([FromBody] MedicineGroupCatalogDto dto)
        {
            var result = await _service.SaveMedicineGroupAsync(dto);
            return Ok(result);
        }

        // 13.17 Thuật ngữ lâm sàng (Clinical Terms)
        [HttpGet("api/catalog/clinical-terms")]
        public async Task<ActionResult<List<ClinicalTermCatalogDto>>> GetClinicalTerms(
            [FromQuery] string keyword = null, [FromQuery] string category = null,
            [FromQuery] string bodySystem = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetClinicalTermsAsync(keyword, category, bodySystem, isActive);
            return Ok(result);
        }

        [HttpGet("api/catalog/clinical-terms/{termId}")]
        public async Task<ActionResult<ClinicalTermCatalogDto>> GetClinicalTerm(Guid termId)
        {
            var result = await _service.GetClinicalTermAsync(termId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("api/catalog/clinical-terms")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<ClinicalTermCatalogDto>> SaveClinicalTerm([FromBody] ClinicalTermCatalogDto dto)
        {
            var result = await _service.SaveClinicalTermAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/clinical-terms/{termId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteClinicalTerm(Guid termId)
        {
            var result = await _service.DeleteClinicalTermAsync(termId);
            return Ok(result);
        }

        // SNOMED CT Mapping
        [HttpGet("api/catalog/snomed-mappings")]
        public async Task<ActionResult<List<SnomedIcdMappingDto>>> GetSnomedMappings(
            [FromQuery] string? keyword, [FromQuery] string? icdCode)
        {
            var result = await _service.GetSnomedMappingsAsync(keyword, icdCode);
            return Ok(result);
        }

        [HttpPost("api/catalog/snomed-mappings")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SnomedIcdMappingDto>> SaveSnomedMapping([FromBody] SnomedIcdMappingDto dto)
        {
            var result = await _service.SaveSnomedMappingAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/snomed-mappings/{mappingId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteSnomedMapping(Guid mappingId)
        {
            var result = await _service.DeleteSnomedMappingAsync(mappingId);
            return Ok(result);
        }

        [HttpGet("api/catalog/snomed-search")]
        public async Task<ActionResult<List<SnomedIcdMappingDto>>> SearchSnomedByIcd([FromQuery] string icdCode)
        {
            var result = await _service.SearchSnomedByIcdAsync(icdCode);
            return Ok(result);
        }

        // 13.19 Chi nhánh bệnh viện (NangCap15 1.21)
        /// <summary>
        /// Danh sách chi nhánh / cơ sở bệnh viện
        /// </summary>
        [HttpGet("api/catalog/branches")]
        public async Task<ActionResult<List<HospitalBranchDto>>> GetBranches(
            [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetBranchesAsync(keyword, isActive);
            return Ok(result);
        }

        /// <summary>
        /// Thêm mới / Cập nhật chi nhánh bệnh viện
        /// </summary>
        [HttpPost("api/catalog/branches")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<HospitalBranchDto>> SaveBranch([FromBody] HospitalBranchDto dto)
        {
            var result = await _service.SaveBranchAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa chi nhánh bệnh viện
        /// </summary>
        [HttpDelete("api/catalog/branches/{id}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteBranch(Guid id)
        {
            var result = await _service.DeleteBranchAsync(id);
            return Ok(result);
        }

        // 13.18 Đồng bộ BHXH
        [HttpPost("api/catalog/sync/bhxh/medicines")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SyncResultDto>> SyncBHXHMedicines()
        {
            var result = await _service.SyncBHXHMedicinesAsync();
            return Ok(result);
        }

        [HttpPost("api/catalog/sync/bhxh/services")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SyncResultDto>> SyncBHXHServices()
        {
            var result = await _service.SyncBHXHServicesAsync();
            return Ok(result);
        }

        [HttpPost("api/catalog/sync/bhxh/icd10")]
        [Authorize(Roles = RoleNames.Admin)]
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
    }
}
