using HIS.Application.DTOs.MasterCatalog;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// NangCap22: 13 master catalogs from Đắk Nông tender doc.
/// All endpoints require auth, expose CRUD on each catalog.
/// </summary>
[ApiController]
[Route("api/master-catalog")]
[Authorize]
public class MasterCatalogController : ControllerBase
{
    private readonly IMasterCatalogService _svc;

    public MasterCatalogController(IMasterCatalogService svc) => _svc = svc;

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? User.FindFirst("sub")?.Value;

    // #1 Manufacturer
    [HttpGet("manufacturers")]
    public async Task<IActionResult> GetManufacturers([FromQuery] string? keyword) =>
        Ok(await _svc.GetManufacturersAsync(keyword));

    [HttpPost("manufacturers")]
    public async Task<IActionResult> SaveManufacturer([FromBody] ManufacturerDto dto) =>
        Ok(await _svc.SaveManufacturerAsync(dto, UserId));

    [HttpDelete("manufacturers/{id:guid}")]
    public async Task<IActionResult> DeleteManufacturer(Guid id) =>
        await _svc.DeleteManufacturerAsync(id) ? Ok() : NotFound();

    // #2 MedicationRoute
    [HttpGet("medication-routes")]
    public async Task<IActionResult> GetMedicationRoutes([FromQuery] string? keyword) =>
        Ok(await _svc.GetMedicationRoutesAsync(keyword));

    [HttpPost("medication-routes")]
    public async Task<IActionResult> SaveMedicationRoute([FromBody] MedicationRouteDto dto) =>
        Ok(await _svc.SaveMedicationRouteAsync(dto, UserId));

    [HttpDelete("medication-routes/{id:guid}")]
    public async Task<IActionResult> DeleteMedicationRoute(Guid id) =>
        await _svc.DeleteMedicationRouteAsync(id) ? Ok() : NotFound();

    // #3 AdditionalCharge
    [HttpGet("additional-charges")]
    public async Task<IActionResult> GetAdditionalCharges([FromQuery] string? keyword) =>
        Ok(await _svc.GetAdditionalChargesAsync(keyword));

    [HttpPost("additional-charges")]
    public async Task<IActionResult> SaveAdditionalCharge([FromBody] AdditionalChargeDto dto) =>
        Ok(await _svc.SaveAdditionalChargeAsync(dto, UserId));

    [HttpDelete("additional-charges/{id:guid}")]
    public async Task<IActionResult> DeleteAdditionalCharge(Guid id) =>
        await _svc.DeleteAdditionalChargeAsync(id) ? Ok() : NotFound();

    // #4 OtherIncome
    [HttpGet("other-incomes")]
    public async Task<IActionResult> GetOtherIncomes([FromQuery] string? keyword) =>
        Ok(await _svc.GetOtherIncomesAsync(keyword));

    [HttpPost("other-incomes")]
    public async Task<IActionResult> SaveOtherIncome([FromBody] OtherIncomeDto dto) =>
        Ok(await _svc.SaveOtherIncomeAsync(dto, UserId));

    [HttpDelete("other-incomes/{id:guid}")]
    public async Task<IActionResult> DeleteOtherIncome(Guid id) =>
        await _svc.DeleteOtherIncomeAsync(id) ? Ok() : NotFound();

    // #5 TransportService
    [HttpGet("transport-services")]
    public async Task<IActionResult> GetTransportServices([FromQuery] string? keyword) =>
        Ok(await _svc.GetTransportServicesAsync(keyword));

    [HttpPost("transport-services")]
    public async Task<IActionResult> SaveTransportService([FromBody] TransportServiceDto dto) =>
        Ok(await _svc.SaveTransportServiceAsync(dto, UserId));

    [HttpDelete("transport-services/{id:guid}")]
    public async Task<IActionResult> DeleteTransportService(Guid id) =>
        await _svc.DeleteTransportServiceAsync(id) ? Ok() : NotFound();

    // #6 GasolinePrice
    [HttpGet("gasoline-prices")]
    public async Task<IActionResult> GetGasolinePrices([FromQuery] string? fuelType) =>
        Ok(await _svc.GetGasolinePricesAsync(fuelType));

    [HttpPost("gasoline-prices")]
    public async Task<IActionResult> SaveGasolinePrice([FromBody] GasolinePriceDto dto) =>
        Ok(await _svc.SaveGasolinePriceAsync(dto, UserId));

    [HttpDelete("gasoline-prices/{id:guid}")]
    public async Task<IActionResult> DeleteGasolinePrice(Guid id) =>
        await _svc.DeleteGasolinePriceAsync(id) ? Ok() : NotFound();

    // #7 MachineCode
    [HttpGet("machine-codes")]
    public async Task<IActionResult> GetMachineCodes([FromQuery] string? keyword) =>
        Ok(await _svc.GetMachineCodesAsync(keyword));

    [HttpPost("machine-codes")]
    public async Task<IActionResult> SaveMachineCode([FromBody] MachineCodeDto dto) =>
        Ok(await _svc.SaveMachineCodeAsync(dto, UserId));

    [HttpDelete("machine-codes/{id:guid}")]
    public async Task<IActionResult> DeleteMachineCode(Guid id) =>
        await _svc.DeleteMachineCodeAsync(id) ? Ok() : NotFound();

    // #8 MachineService
    [HttpGet("machine-services")]
    public async Task<IActionResult> GetMachineServices([FromQuery] Guid? machineCodeId) =>
        Ok(await _svc.GetMachineServicesAsync(machineCodeId));

    [HttpPost("machine-services")]
    public async Task<IActionResult> SaveMachineService([FromBody] MachineServiceDto dto) =>
        Ok(await _svc.SaveMachineServiceAsync(dto, UserId));

    [HttpDelete("machine-services/{id:guid}")]
    public async Task<IActionResult> DeleteMachineService(Guid id) =>
        await _svc.DeleteMachineServiceAsync(id) ? Ok() : NotFound();

    // #9 InspectionCommittee
    [HttpGet("inspection-committees")]
    public async Task<IActionResult> GetInspectionCommittees([FromQuery] string? keyword) =>
        Ok(await _svc.GetInspectionCommitteesAsync(keyword));

    [HttpPost("inspection-committees")]
    public async Task<IActionResult> SaveInspectionCommittee([FromBody] InspectionCommitteeDto dto) =>
        Ok(await _svc.SaveInspectionCommitteeAsync(dto, UserId));

    [HttpDelete("inspection-committees/{id:guid}")]
    public async Task<IActionResult> DeleteInspectionCommittee(Guid id) =>
        await _svc.DeleteInspectionCommitteeAsync(id) ? Ok() : NotFound();

    // #10 NursingCareLevel
    [HttpGet("nursing-care-levels")]
    public async Task<IActionResult> GetNursingCareLevels() =>
        Ok(await _svc.GetNursingCareLevelsAsync());

    [HttpPost("nursing-care-levels")]
    public async Task<IActionResult> SaveNursingCareLevel([FromBody] NursingCareLevelDto dto) =>
        Ok(await _svc.SaveNursingCareLevelAsync(dto, UserId));

    [HttpDelete("nursing-care-levels/{id:guid}")]
    public async Task<IActionResult> DeleteNursingCareLevel(Guid id) =>
        await _svc.DeleteNursingCareLevelAsync(id) ? Ok() : NotFound();

    // #11 MedicalRecordType
    [HttpGet("medical-record-types")]
    public async Task<IActionResult> GetMedicalRecordTypes() =>
        Ok(await _svc.GetMedicalRecordTypesAsync());

    [HttpPost("medical-record-types")]
    public async Task<IActionResult> SaveMedicalRecordType([FromBody] MedicalRecordTypeDto dto) =>
        Ok(await _svc.SaveMedicalRecordTypeAsync(dto, UserId));

    [HttpDelete("medical-record-types/{id:guid}")]
    public async Task<IActionResult> DeleteMedicalRecordType(Guid id)
    {
        try { return await _svc.DeleteMedicalRecordTypeAsync(id) ? Ok() : NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // #12 ParaclinicalRoomPriority
    [HttpGet("paraclinical-room-priorities")]
    public async Task<IActionResult> GetParaclinicalRoomPriorities([FromQuery] Guid? serviceId) =>
        Ok(await _svc.GetParaclinicalRoomPrioritiesAsync(serviceId));

    [HttpPost("paraclinical-room-priorities")]
    public async Task<IActionResult> SaveParaclinicalRoomPriority([FromBody] ParaclinicalRoomPriorityDto dto) =>
        Ok(await _svc.SaveParaclinicalRoomPriorityAsync(dto, UserId));

    [HttpDelete("paraclinical-room-priorities/{id:guid}")]
    public async Task<IActionResult> DeleteParaclinicalRoomPriority(Guid id) =>
        await _svc.DeleteParaclinicalRoomPriorityAsync(id) ? Ok() : NotFound();

    // #13 ReportServiceGroupType + Group
    [HttpGet("report-group-types")]
    public async Task<IActionResult> GetReportServiceGroupTypes() =>
        Ok(await _svc.GetReportServiceGroupTypesAsync());

    [HttpPost("report-group-types")]
    public async Task<IActionResult> SaveReportServiceGroupType([FromBody] ReportServiceGroupTypeDto dto) =>
        Ok(await _svc.SaveReportServiceGroupTypeAsync(dto, UserId));

    [HttpDelete("report-group-types/{id:guid}")]
    public async Task<IActionResult> DeleteReportServiceGroupType(Guid id) =>
        await _svc.DeleteReportServiceGroupTypeAsync(id) ? Ok() : NotFound();

    [HttpGet("report-groups")]
    public async Task<IActionResult> GetReportServiceGroups([FromQuery] Guid? typeId) =>
        Ok(await _svc.GetReportServiceGroupsAsync(typeId));

    [HttpPost("report-groups")]
    public async Task<IActionResult> SaveReportServiceGroup([FromBody] ReportServiceGroupDto dto) =>
        Ok(await _svc.SaveReportServiceGroupAsync(dto, UserId));

    [HttpDelete("report-groups/{id:guid}")]
    public async Task<IActionResult> DeleteReportServiceGroup(Guid id) =>
        await _svc.DeleteReportServiceGroupAsync(id) ? Ok() : NotFound();
}
