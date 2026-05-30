using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;
using BloodBankDto = HIS.Application.Services.BloodBankDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of ISurgeryCompleteService
/// Handles all surgery/procedure workflows
/// </summary>
public class SurgeryCompleteService : ISurgeryCompleteService
{
    private readonly HISDbContext _context;
    // K12 Plan B TRUE module hóa (2026-05-30):
    // Facade delegate sang sub-service theo Bounded Context Surgery.{Module}.
    // Public API ISurgeryCompleteService stable — controllers KHONG doi.
    private readonly ISurgerySpecialService _specialService;            // Step 1: NangCap18
    private readonly ISurgeryWaitingService _waitingService;            // Step 2a: 6.2 Waiting room
    private readonly ISurgerySchedulingService _schedulingService;      // Step 2b: 6.1 + 6.1.1
    private readonly ISurgeryOperationService _operationService;        // Step 3: 6.3 + 6.3.1 + 6.4 + 6.4.1 + 6.4.2
    private readonly ISurgeryPrescriptionService _prescriptionService;  // Step 4: 6.5 + 6.5.1 + 6.6 Blood + 6.6 Consent

    public SurgeryCompleteService(
        HISDbContext context,
        ISurgerySpecialService specialService,
        ISurgeryWaitingService waitingService,
        ISurgerySchedulingService schedulingService,
        ISurgeryOperationService operationService,
        ISurgeryPrescriptionService prescriptionService)
    {
        _context = context;
        _specialService = specialService;
        _waitingService = waitingService;
        _schedulingService = schedulingService;
        _operationService = operationService;
        _prescriptionService = prescriptionService;
    }

    #region 6.1 Quản lý PTTT + 6.1.1 Gói PTTT
    // K12 Step 2b (2026-05-30, Plan B): logic tach sang Services/Surgery/SurgerySchedulingServiceImpl.cs.

    public Task<SurgeryDto> CreateSurgeryRequestAsync(CreateSurgeryRequestDto dto, Guid userId)
        => _schedulingService.CreateSurgeryRequestAsync(dto, userId);
    public Task<SurgeryDto> ApproveSurgeryAsync(ApproveSurgeryDto dto, Guid userId)
        => _schedulingService.ApproveSurgeryAsync(dto, userId);
    public Task<SurgeryDto> RejectSurgeryAsync(Guid surgeryId, string reason, Guid userId)
        => _schedulingService.RejectSurgeryAsync(surgeryId, reason, userId);
    public Task<SurgeryDto> ScheduleSurgeryAsync(ScheduleSurgeryDto dto, Guid userId)
        => _schedulingService.ScheduleSurgeryAsync(dto, userId);
    public Task<List<SurgeryScheduleDto>> GetSurgeryScheduleAsync(DateTime date, Guid? operatingRoomId)
        => _schedulingService.GetSurgeryScheduleAsync(date, operatingRoomId);
    public Task<SurgeryDto> CheckInPatientAsync(SurgeryCheckInDto dto, Guid userId)
        => _schedulingService.CheckInPatientAsync(dto, userId);
    public Task<PagedResultDto<SurgeryDto>> GetSurgeriesAsync(SurgerySearchDto dto)
        => _schedulingService.GetSurgeriesAsync(dto);
    public Task<SurgeryDto?> GetSurgeryByIdAsync(Guid id)
        => _schedulingService.GetSurgeryByIdAsync(id);
    public Task<SurgeryDto> UpdateSurgeryStatusAsync(Guid surgeryId, int status, Guid userId)
        => _schedulingService.UpdateSurgeryStatusAsync(surgeryId, status, userId);
    public Task<bool> CancelSurgeryAsync(Guid surgeryId, string reason, Guid userId)
        => _schedulingService.CancelSurgeryAsync(surgeryId, reason, userId);
    public Task<SurgeryDto> SetTeamFeesAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> teamMembers, Guid userId)
        => _schedulingService.SetTeamFeesAsync(surgeryId, teamMembers, userId);
    public Task<SurgeryFeeCalculationDto> CalculateTeamFeesAsync(Guid surgeryId)
        => _schedulingService.CalculateTeamFeesAsync(surgeryId);
    public Task<SurgeryProfitDto> CalculateProfitAsync(Guid surgeryId)
        => _schedulingService.CalculateProfitAsync(surgeryId);
    public Task<SurgeryCostCalculationDto> CalculateCostTT37Async(Guid surgeryId, bool hasTeamChange)
        => _schedulingService.CalculateCostTT37Async(surgeryId, hasTeamChange);
    public Task<SurgeryStatisticsDto> GetStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId)
        => _schedulingService.GetStatisticsAsync(fromDate, toDate, departmentId);

    public Task<List<SurgeryPackageDto>> GetSurgeryPackagesAsync(Guid? surgeryServiceId)
        => _schedulingService.GetSurgeryPackagesAsync(surgeryServiceId);
    public Task<SurgeryPackageDto?> GetSurgeryPackageByIdAsync(Guid id)
        => _schedulingService.GetSurgeryPackageByIdAsync(id);
    public Task<SurgeryPackageDto> SaveSurgeryPackageAsync(SurgeryPackageDto dto, Guid userId)
        => _schedulingService.SaveSurgeryPackageAsync(dto, userId);
    public Task<bool> DeleteSurgeryPackageAsync(Guid id, Guid userId)
        => _schedulingService.DeleteSurgeryPackageAsync(id, userId);
    public Task<List<PackageMedicineNormDto>> GetPackageMedicineNormsAsync(Guid packageId)
        => _schedulingService.GetPackageMedicineNormsAsync(packageId);
    public Task<List<PackageSupplyNormDto>> GetPackageSupplyNormsAsync(Guid packageId)
        => _schedulingService.GetPackageSupplyNormsAsync(packageId);

    #endregion

    #region 6.2 Màn hình chờ phòng mổ
    // K12 Step 2a (2026-05-30, Plan B): logic tach sang Services/Surgery/SurgeryWaitingServiceImpl.cs.

    public Task<SurgeryWaitingListDto> GetWaitingListAsync(Guid operatingRoomId, DateTime date)
        => _waitingService.GetWaitingListAsync(operatingRoomId, date);

    public Task<List<SurgeryWaitingListDto>> GetAllWaitingListsAsync(DateTime date)
        => _waitingService.GetAllWaitingListsAsync(date);

    public Task<List<OperatingRoomDto>> GetOperatingRoomsAsync(int? roomType, int? status)
        => _waitingService.GetOperatingRoomsAsync(roomType, status);

    public Task<OperatingRoomDto> UpdateOperatingRoomStatusAsync(Guid roomId, int status, Guid userId)
        => _waitingService.UpdateOperatingRoomStatusAsync(roomId, status, userId);

    #endregion

    #region 6.3 + 6.3.1 + 6.4 + 6.4.1 + 6.4.2
    // K12 Step 3 (2026-05-30, Plan B): logic tach sang Services/Surgery/SurgeryOperationServiceImpl.cs.

    // 6.3 Thực hiện PTTT
    public Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId) => _operationService.StartSurgeryAsync(dto, userId);
    public Task<SurgeryDto> CompleteSurgeryAsync(CompleteSurgeryDto dto, Guid userId) => _operationService.CompleteSurgeryAsync(dto, userId);
    public Task<SurgeryDto> UpdateExecutionInfoAsync(SurgeryExecutionDto dto, Guid userId) => _operationService.UpdateExecutionInfoAsync(dto, userId);
    public Task<SurgeryDto> UpdatePreOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId) => _operationService.UpdatePreOperativeDiagnosisAsync(surgeryId, diagnosis, icdCode, userId);
    public Task<SurgeryDto> UpdatePostOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId) => _operationService.UpdatePostOperativeDiagnosisAsync(surgeryId, diagnosis, icdCode, userId);
    public Task<SurgeryDto> UpdateTT50InfoAsync(Guid surgeryId, SurgeryTT50InfoDto dto, Guid userId) => _operationService.UpdateTT50InfoAsync(surgeryId, dto, userId);
    public Task<SurgeryDto> UpdateDescriptionAsync(Guid surgeryId, string description, Guid userId) => _operationService.UpdateDescriptionAsync(surgeryId, description, userId);
    public Task<SurgeryDto> UpdateConclusionAsync(Guid surgeryId, string conclusion, Guid userId) => _operationService.UpdateConclusionAsync(surgeryId, conclusion, userId);
    public Task<SurgeryDto> UpdateTeamMembersAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> members, Guid userId) => _operationService.UpdateTeamMembersAsync(surgeryId, members, userId);
    public Task<SurgeryDto> ChangeTeamMemberAsync(Guid surgeryId, Guid oldMemberId, SurgeryTeamMemberRequestDto newMember, DateTime changeTime, Guid userId) => _operationService.ChangeTeamMemberAsync(surgeryId, oldMemberId, newMember, changeTime, userId);

    // 6.3.1 In ấn PTTT
    public Task<byte[]> PrintSurgeryCertificateAsync(Guid surgeryId) => _operationService.PrintSurgeryCertificateAsync(surgeryId);
    public Task<byte[]> PrintSurgeryReportAsync(Guid surgeryId) => _operationService.PrintSurgeryReportAsync(surgeryId);
    public Task<byte[]> PrintSafetyChecklistAsync(Guid surgeryId) => _operationService.PrintSafetyChecklistAsync(surgeryId);
    public Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId) => _operationService.PrintSurgeryFormAsync(surgeryId);
    public Task<byte[]> PrintPathologyFormAsync(Guid surgeryId) => _operationService.PrintPathologyFormAsync(surgeryId);
    public Task<byte[]> PrintConsultationMinutesAsync(Guid surgeryId) => _operationService.PrintConsultationMinutesAsync(surgeryId);
    public Task<byte[]> PrintPreOpChecklistAsync(Guid surgeryId) => _operationService.PrintPreOpChecklistAsync(surgeryId);
    public Task<byte[]> PrintPreOpQuestionnaireAsync(Guid surgeryId) => _operationService.PrintPreOpQuestionnaireAsync(surgeryId);
    public Task<byte[]> PrintAnesthesiaFormAsync(Guid surgeryId) => _operationService.PrintAnesthesiaFormAsync(surgeryId);
    public Task<byte[]> PrintPostOpCareFormAsync(Guid surgeryId) => _operationService.PrintPostOpCareFormAsync(surgeryId);
    public Task<byte[]> PrintMedicineDisclosureAsync(Guid surgeryId) => _operationService.PrintMedicineDisclosureAsync(surgeryId);
    public Task<byte[]> ExportXml4210Async(Guid surgeryId) => _operationService.ExportXml4210Async(surgeryId);

    // 6.4 Chỉ định dịch vụ
    public Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId) => _operationService.GetDiagnosisFromOrderAsync(medicalRecordId);
    public Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode) => _operationService.SearchIcdCodesAsync(keyword, byCode);
    public Task<List<SurgeryServiceDto>> SearchServicesAsync(string keyword, int? serviceType) => _operationService.SearchServicesAsync(keyword, serviceType);
    public Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId) => _operationService.OrderServiceAsync(dto, userId);
    public Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId) => _operationService.OrderServicesAsync(surgeryId, dtos, userId);
    public Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId) => _operationService.OrderPackageAsync(surgeryId, packageId, userId);
    public Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId) => _operationService.CopyPreviousOrdersAsync(surgeryId, sourceSurgeryId, userId);
    public Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId) => _operationService.UpdateServiceOrderAsync(orderId, dto, userId);
    public Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId) => _operationService.DeleteServiceOrderAsync(orderId, userId);
    public Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId) => _operationService.GetServiceOrdersAsync(surgeryId);
    public Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId) => _operationService.ChangeOrderDoctorAsync(orderId, newDoctorId, userId);
    public Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId) => _operationService.ChangePaymentObjectAsync(orderId, paymentObject, userId);
    public Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId) => _operationService.GetServiceCostInfoAsync(surgeryId);
    public Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId) => _operationService.CheckOrderWarningsAsync(surgeryId, serviceId);

    // 6.4.1 Nhóm dịch vụ nhanh
    public Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId) => _operationService.GetServiceGroupsAsync(userId);
    public Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId) => _operationService.CreateServiceGroupAsync(dto, userId);
    public Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId) => _operationService.UpdateServiceGroupAsync(groupId, dto, userId);
    public Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId) => _operationService.DeleteServiceGroupAsync(groupId, userId);
    public Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId) => _operationService.OrderByGroupAsync(surgeryId, groupId, userId);

    // 6.4.2 In chỉ định
    public Task<byte[]> PrintServiceOrderAsync(Guid orderId) => _operationService.PrintServiceOrderAsync(orderId);
    public Task<byte[]> PrintOrdersByPaymentObjectAsync(Guid surgeryId, int paymentObject) => _operationService.PrintOrdersByPaymentObjectAsync(surgeryId, paymentObject);
    public Task<byte[]> PrintOrdersByGroupAsync(Guid surgeryId, string serviceGroup) => _operationService.PrintOrdersByGroupAsync(surgeryId, serviceGroup);
    public Task<byte[]> PrintMultipleOrdersAsync(List<Guid> orderIds) => _operationService.PrintMultipleOrdersAsync(orderIds);

    #endregion

    #region 6.5 + 6.5.1 + 6.6 Blood + 6.6 Consent
    // K12 Step 4 (2026-05-30, Plan B): logic tach sang Services/Surgery/SurgeryPrescriptionServiceImpl.cs.

    // 6.5 Rx
    public Task<SurgeryPrescriptionDto> GetPrescriptionAsync(Guid surgeryId) => _prescriptionService.GetPrescriptionAsync(surgeryId);
    public Task<SurgeryMedicineDto> AddMedicineAsync(AddSurgeryMedicineDto dto, Guid userId) => _prescriptionService.AddMedicineAsync(dto, userId);
    public Task<SurgerySupplyDto> AddSupplyAsync(AddSurgerySupplyDto dto, Guid userId) => _prescriptionService.AddSupplyAsync(dto, userId);
    public Task<SurgeryMedicineDto> UpdateMedicineAsync(Guid medicineItemId, AddSurgeryMedicineDto dto, Guid userId) => _prescriptionService.UpdateMedicineAsync(medicineItemId, dto, userId);
    public Task<SurgerySupplyDto> UpdateSupplyAsync(Guid supplyItemId, AddSurgerySupplyDto dto, Guid userId) => _prescriptionService.UpdateSupplyAsync(supplyItemId, dto, userId);
    public Task<bool> RemoveMedicineAsync(Guid medicineItemId, Guid userId) => _prescriptionService.RemoveMedicineAsync(medicineItemId, userId);
    public Task<bool> RemoveSupplyAsync(Guid supplyItemId, Guid userId) => _prescriptionService.RemoveSupplyAsync(supplyItemId, userId);
    public Task<SurgeryPrescriptionDto> ApplyPackageAsync(Guid surgeryId, Guid packageId, Guid userId) => _prescriptionService.ApplyPackageAsync(surgeryId, packageId, userId);
    public Task<List<SurgeryMedicineDto>> AddFromEmergencyCabinetAsync(Guid surgeryId, Guid cabinetId, List<AddSurgeryMedicineDto> medicines, Guid userId) => _prescriptionService.AddFromEmergencyCabinetAsync(surgeryId, cabinetId, medicines, userId);
    public Task<List<MedicineDetailDto>> SearchMedicinesAsync(string keyword, Guid warehouseId) => _prescriptionService.SearchMedicinesAsync(keyword, warehouseId);
    public Task<List<MedicineWarningDto>> CheckMedicineWarningsAsync(Guid surgeryId, Guid medicineId) => _prescriptionService.CheckMedicineWarningsAsync(surgeryId, medicineId);
    public Task<string?> GetContraindicationsAsync(Guid medicineId) => _prescriptionService.GetContraindicationsAsync(medicineId);
    public Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId) => _prescriptionService.GetMedicineStockAsync(medicineId, warehouseId);
    public Task<MedicineDetailDto?> GetMedicineDetailAsync(Guid medicineId, Guid warehouseId) => _prescriptionService.GetMedicineDetailAsync(medicineId, warehouseId);

    // 6.5.1 Mẫu đơn thuốc
    public Task<List<SurgeryPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid userId, Guid? surgeryServiceId) => _prescriptionService.GetPrescriptionTemplatesAsync(userId, surgeryServiceId);
    public Task<SurgeryPrescriptionTemplateDto> SavePrescriptionTemplateAsync(SurgeryPrescriptionTemplateDto dto, Guid userId) => _prescriptionService.SavePrescriptionTemplateAsync(dto, userId);
    public Task<bool> DeletePrescriptionTemplateAsync(Guid templateId, Guid userId) => _prescriptionService.DeletePrescriptionTemplateAsync(templateId, userId);
    public Task<SurgeryPrescriptionTemplateDto> SharePrescriptionTemplateAsync(Guid templateId, Guid userId) => _prescriptionService.SharePrescriptionTemplateAsync(templateId, userId);
    public Task<SurgeryPrescriptionDto> ApplyPrescriptionTemplateAsync(Guid surgeryId, Guid templateId, Guid userId) => _prescriptionService.ApplyPrescriptionTemplateAsync(surgeryId, templateId, userId);
    public Task<SurgeryPrescriptionDto> CopyPrescriptionAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId) => _prescriptionService.CopyPrescriptionAsync(surgeryId, sourceSurgeryId, userId);

    // 6.6 Blood
    public Task<SurgeryBloodOrderDto?> GetBloodOrderAsync(Guid surgeryId) => _prescriptionService.GetBloodOrderAsync(surgeryId);
    public Task<SurgeryBloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto, Guid userId) => _prescriptionService.CreateBloodOrderAsync(dto, userId);
    public Task<SurgeryBloodOrderDto> UpdateBloodOrderAsync(Guid orderId, CreateBloodOrderDto dto, Guid userId) => _prescriptionService.UpdateBloodOrderAsync(orderId, dto, userId);
    public Task<bool> DeleteBloodOrderAsync(Guid orderId, Guid userId) => _prescriptionService.DeleteBloodOrderAsync(orderId, userId);
    public Task<List<BloodBankDto>> GetBloodBanksAsync() => _prescriptionService.GetBloodBanksAsync();
    public Task<List<BloodProductItemDto>> SearchBloodProductsAsync(Guid bloodBankId, string? bloodType, string? rhFactor) => _prescriptionService.SearchBloodProductsAsync(bloodBankId, bloodType, rhFactor);
    public Task<decimal> GetBloodProductStockAsync(Guid bloodProductId, Guid bloodBankId) => _prescriptionService.GetBloodProductStockAsync(bloodProductId, bloodBankId);

    // 6.6 Consent
    public Task<List<SurgeryConsentDto>> GetSurgeryConsentsAsync(Guid surgeryId) => _prescriptionService.GetSurgeryConsentsAsync(surgeryId);
    public Task<SurgeryConsentDto> SaveSurgeryConsentAsync(SaveSurgeryConsentDto dto, Guid userId) => _prescriptionService.SaveSurgeryConsentAsync(dto, userId);
    public Task<SurgeryConsentDto> SignConsentAsync(Guid consentId, string signerName, string relationship, Guid userId) => _prescriptionService.SignConsentAsync(consentId, signerName, relationship, userId);
    public Task<ConsentValidationResult> ValidateConsentsBeforeSurgeryAsync(Guid surgeryId) => _prescriptionService.ValidateConsentsBeforeSurgeryAsync(surgeryId);
    public Task<byte[]> PrintConsentFormAsync(Guid consentId) => _prescriptionService.PrintConsentFormAsync(consentId);

    #endregion



    #region Helper Methods

    private static string GetStatusName(int status) => status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đang thực hiện",
        3 => "Hoàn thành",
        4 => "Đã hủy",
        5 => "Hoãn",
        _ => "Không xác định"
    };

    private static string GetAnesthesiaTypeName(int anesthesiaType) => anesthesiaType switch
    {
        1 => "Gây tê",
        2 => "Gây mê toàn thân",
        3 => "Gây mê nội khí quản",
        4 => "Gây tê tủy sống",
        5 => "Gây tê ngoài màng cứng",
        _ => "Không xác định"
    };

    private static string GetRoomTypeName(int roomType) => roomType switch
    {
        1 => "Phòng mổ lớn",
        2 => "Phòng mổ nhỏ",
        3 => "Phòng mổ cấp cứu",
        4 => "Phòng mổ chuyên khoa",
        _ => "Phòng mổ"
    };

    private static string GetRoomStatusName(int status) => status switch
    {
        1 => "Sẵn sàng",
        2 => "Đang sử dụng",
        3 => "Bảo trì",
        4 => "Ngừng hoạt động",
        _ => "Không xác định"
    };

    #endregion


    #region NangCap18 - Anesthesia Chart & Profit Calculation
    // K12 POC Step 1 (2026-05-30, Plan B): logic tach sang Services/Surgery/SurgerySpecialServiceImpl.cs.
    // Facade delegate xuong _specialService (constructor-injected).

    public Task<bool> SaveAnesthesiaChartAsync(HIS.Application.DTOs.NangCap18.SaveAnesthesiaChartDto dto, Guid userId)
        => _specialService.SaveAnesthesiaChartAsync(dto, userId);

    public Task<HIS.Application.DTOs.NangCap18.AnesthesiaChartDto> GetAnesthesiaChartAsync(Guid surgeryId)
        => _specialService.GetAnesthesiaChartAsync(surgeryId);

    public Task<HIS.Application.DTOs.NangCap18.SurgeryProfitDto> CalculateSurgeryProfitAsync(Guid surgeryId)
        => _specialService.CalculateSurgeryProfitAsync(surgeryId);

    #endregion
}

internal class SurgeryConsentRaw
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public int ConsentType { get; set; }
    public string? Diagnosis { get; set; }
    public string? PlannedProcedure { get; set; }
    public string? Risks { get; set; }
    public string? Alternatives { get; set; }
    public string? DoctorExplanation { get; set; }
    public string? SignerName { get; set; }
    public string? SignerRelationship { get; set; }
    public DateTime? SignedAt { get; set; }
    public bool IsSigned { get; set; }
    public Guid? DoctorId { get; set; }
    public DateTime CreatedAt { get; set; }
}
