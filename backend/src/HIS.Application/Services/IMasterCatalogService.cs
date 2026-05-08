using HIS.Application.DTOs.MasterCatalog;

namespace HIS.Application.Services;

/// <summary>
/// NangCap22: 13 master catalogs from Đắk Nông tender doc.
/// Each catalog supports list/get/save/delete via single service.
/// </summary>
public interface IMasterCatalogService
{
    // #1 Manufacturer
    Task<List<ManufacturerDto>> GetManufacturersAsync(string? keyword);
    Task<ManufacturerDto> SaveManufacturerAsync(ManufacturerDto dto, string? userId);
    Task<bool> DeleteManufacturerAsync(Guid id);

    // #2 MedicationRoute
    Task<List<MedicationRouteDto>> GetMedicationRoutesAsync(string? keyword);
    Task<MedicationRouteDto> SaveMedicationRouteAsync(MedicationRouteDto dto, string? userId);
    Task<bool> DeleteMedicationRouteAsync(Guid id);

    // #3 AdditionalCharge
    Task<List<AdditionalChargeDto>> GetAdditionalChargesAsync(string? keyword);
    Task<AdditionalChargeDto> SaveAdditionalChargeAsync(AdditionalChargeDto dto, string? userId);
    Task<bool> DeleteAdditionalChargeAsync(Guid id);

    // #4 OtherIncome
    Task<List<OtherIncomeDto>> GetOtherIncomesAsync(string? keyword);
    Task<OtherIncomeDto> SaveOtherIncomeAsync(OtherIncomeDto dto, string? userId);
    Task<bool> DeleteOtherIncomeAsync(Guid id);

    // #5 TransportService
    Task<List<TransportServiceDto>> GetTransportServicesAsync(string? keyword);
    Task<TransportServiceDto> SaveTransportServiceAsync(TransportServiceDto dto, string? userId);
    Task<bool> DeleteTransportServiceAsync(Guid id);

    // #6 GasolinePrice (history list, new entry creates a new period)
    Task<List<GasolinePriceDto>> GetGasolinePricesAsync(string? fuelType);
    Task<GasolinePriceDto> SaveGasolinePriceAsync(GasolinePriceDto dto, string? userId);
    Task<bool> DeleteGasolinePriceAsync(Guid id);

    // #7 MachineCode
    Task<List<MachineCodeDto>> GetMachineCodesAsync(string? keyword);
    Task<MachineCodeDto> SaveMachineCodeAsync(MachineCodeDto dto, string? userId);
    Task<bool> DeleteMachineCodeAsync(Guid id);

    // #8 MachineService
    Task<List<MachineServiceDto>> GetMachineServicesAsync(Guid? machineCodeId);
    Task<MachineServiceDto> SaveMachineServiceAsync(MachineServiceDto dto, string? userId);
    Task<bool> DeleteMachineServiceAsync(Guid id);

    // #9 InspectionCommittee + Members
    Task<List<InspectionCommitteeDto>> GetInspectionCommitteesAsync(string? keyword);
    Task<InspectionCommitteeDto> SaveInspectionCommitteeAsync(InspectionCommitteeDto dto, string? userId);
    Task<bool> DeleteInspectionCommitteeAsync(Guid id);

    // #10 NursingCareLevel
    Task<List<NursingCareLevelDto>> GetNursingCareLevelsAsync();
    Task<NursingCareLevelDto> SaveNursingCareLevelAsync(NursingCareLevelDto dto, string? userId);
    Task<bool> DeleteNursingCareLevelAsync(Guid id);

    // #11 MedicalRecordType
    Task<List<MedicalRecordTypeDto>> GetMedicalRecordTypesAsync();
    Task<MedicalRecordTypeDto> SaveMedicalRecordTypeAsync(MedicalRecordTypeDto dto, string? userId);
    Task<bool> DeleteMedicalRecordTypeAsync(Guid id);

    // #12 ParaclinicalRoomPriority
    Task<List<ParaclinicalRoomPriorityDto>> GetParaclinicalRoomPrioritiesAsync(Guid? serviceId);
    Task<ParaclinicalRoomPriorityDto> SaveParaclinicalRoomPriorityAsync(ParaclinicalRoomPriorityDto dto, string? userId);
    Task<bool> DeleteParaclinicalRoomPriorityAsync(Guid id);

    // #13 ReportServiceGroupType + ReportServiceGroup
    Task<List<ReportServiceGroupTypeDto>> GetReportServiceGroupTypesAsync();
    Task<ReportServiceGroupTypeDto> SaveReportServiceGroupTypeAsync(ReportServiceGroupTypeDto dto, string? userId);
    Task<bool> DeleteReportServiceGroupTypeAsync(Guid id);
    Task<List<ReportServiceGroupDto>> GetReportServiceGroupsAsync(Guid? typeId);
    Task<ReportServiceGroupDto> SaveReportServiceGroupAsync(ReportServiceGroupDto dto, string? userId);
    Task<bool> DeleteReportServiceGroupAsync(Guid id);
}
