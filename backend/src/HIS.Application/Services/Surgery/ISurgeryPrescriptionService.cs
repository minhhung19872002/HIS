using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;

namespace HIS.Application.Services.Surgery;

/// <summary>
/// Surgery Prescription Service — 6.5 Rx + 6.5.1 Templates + 6.6 Blood + 6.6 Consent.
///
/// K12 Step 4 (2026-05-30, Plan B): tách 32 method khỏi god interface ISurgeryCompleteService.
/// </summary>
public interface ISurgeryPrescriptionService
{
    // 6.5 Kê thuốc, vật tư
    Task<SurgeryPrescriptionDto> GetPrescriptionAsync(Guid surgeryId);
    Task<SurgeryMedicineDto> AddMedicineAsync(AddSurgeryMedicineDto dto, Guid userId);
    Task<SurgerySupplyDto> AddSupplyAsync(AddSurgerySupplyDto dto, Guid userId);
    Task<SurgeryMedicineDto> UpdateMedicineAsync(Guid medicineItemId, AddSurgeryMedicineDto dto, Guid userId);
    Task<SurgerySupplyDto> UpdateSupplyAsync(Guid supplyItemId, AddSurgerySupplyDto dto, Guid userId);
    Task<bool> RemoveMedicineAsync(Guid medicineItemId, Guid userId);
    Task<bool> RemoveSupplyAsync(Guid supplyItemId, Guid userId);
    Task<SurgeryPrescriptionDto> ApplyPackageAsync(Guid surgeryId, Guid packageId, Guid userId);
    Task<List<SurgeryMedicineDto>> AddFromEmergencyCabinetAsync(Guid surgeryId, Guid cabinetId, List<AddSurgeryMedicineDto> medicines, Guid userId);
    Task<List<MedicineDetailDto>> SearchMedicinesAsync(string keyword, Guid warehouseId);
    Task<List<MedicineWarningDto>> CheckMedicineWarningsAsync(Guid surgeryId, Guid medicineId);
    Task<string?> GetContraindicationsAsync(Guid medicineId);
    Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId);
    Task<MedicineDetailDto?> GetMedicineDetailAsync(Guid medicineId, Guid warehouseId);

    // 6.5.1 Mẫu đơn thuốc
    Task<List<SurgeryPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid userId, Guid? surgeryServiceId);
    Task<SurgeryPrescriptionTemplateDto> SavePrescriptionTemplateAsync(SurgeryPrescriptionTemplateDto dto, Guid userId);
    Task<bool> DeletePrescriptionTemplateAsync(Guid templateId, Guid userId);
    Task<SurgeryPrescriptionTemplateDto> SharePrescriptionTemplateAsync(Guid templateId, Guid userId);
    Task<SurgeryPrescriptionDto> ApplyPrescriptionTemplateAsync(Guid surgeryId, Guid templateId, Guid userId);
    Task<SurgeryPrescriptionDto> CopyPrescriptionAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId);

    // 6.6 Kê đơn máu
    Task<SurgeryBloodOrderDto?> GetBloodOrderAsync(Guid surgeryId);
    Task<SurgeryBloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto, Guid userId);
    Task<SurgeryBloodOrderDto> UpdateBloodOrderAsync(Guid orderId, CreateBloodOrderDto dto, Guid userId);
    Task<bool> DeleteBloodOrderAsync(Guid orderId, Guid userId);
    Task<List<BloodBankDto>> GetBloodBanksAsync();
    Task<List<BloodProductItemDto>> SearchBloodProductsAsync(Guid bloodBankId, string? bloodType, string? rhFactor);
    Task<decimal> GetBloodProductStockAsync(Guid bloodProductId, Guid bloodBankId);

    // 6.6 Quản lý cam kết phẫu thuật
    Task<List<SurgeryConsentDto>> GetSurgeryConsentsAsync(Guid surgeryId);
    Task<SurgeryConsentDto> SaveSurgeryConsentAsync(SaveSurgeryConsentDto dto, Guid userId);
    Task<SurgeryConsentDto> SignConsentAsync(Guid consentId, string signerName, string relationship, Guid userId);
    Task<ConsentValidationResult> ValidateConsentsBeforeSurgeryAsync(Guid surgeryId);
    Task<byte[]> PrintConsentFormAsync(Guid consentId);
}
