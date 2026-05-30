using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;

namespace HIS.Application.Services.Surgery;

/// <summary>
/// Surgery Operation Service — 6.3 Thực hiện PTTT + 6.3.1 In ấn + 6.4 Chỉ định DV + 6.4.1 Nhóm DV + 6.4.2 In chỉ định.
///
/// K12 Step 3 (2026-05-30, Plan B): tách 45 method execution/printing/service-orders/groups
/// khỏi god interface ISurgeryCompleteService (105 method).
/// </summary>
public interface ISurgeryOperationService
{
    // 6.3 Thực hiện PTTT
    Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId);
    Task<SurgeryDto> CompleteSurgeryAsync(CompleteSurgeryDto dto, Guid userId);
    Task<SurgeryDto> UpdateExecutionInfoAsync(SurgeryExecutionDto dto, Guid userId);
    Task<SurgeryDto> UpdatePreOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId);
    Task<SurgeryDto> UpdatePostOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId);
    Task<SurgeryDto> UpdateTT50InfoAsync(Guid surgeryId, SurgeryTT50InfoDto dto, Guid userId);
    Task<SurgeryDto> UpdateDescriptionAsync(Guid surgeryId, string description, Guid userId);
    Task<SurgeryDto> UpdateConclusionAsync(Guid surgeryId, string conclusion, Guid userId);
    Task<SurgeryDto> UpdateTeamMembersAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> members, Guid userId);
    Task<SurgeryDto> ChangeTeamMemberAsync(Guid surgeryId, Guid oldMemberId, SurgeryTeamMemberRequestDto newMember, DateTime changeTime, Guid userId);

    // 6.3.1 In ấn PTTT
    Task<byte[]> PrintSurgeryCertificateAsync(Guid surgeryId);
    Task<byte[]> PrintSurgeryReportAsync(Guid surgeryId);
    Task<byte[]> PrintSafetyChecklistAsync(Guid surgeryId);
    Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId);
    Task<byte[]> PrintPathologyFormAsync(Guid surgeryId);
    Task<byte[]> PrintConsultationMinutesAsync(Guid surgeryId);
    Task<byte[]> PrintPreOpChecklistAsync(Guid surgeryId);
    Task<byte[]> PrintPreOpQuestionnaireAsync(Guid surgeryId);
    Task<byte[]> PrintAnesthesiaFormAsync(Guid surgeryId);
    Task<byte[]> PrintPostOpCareFormAsync(Guid surgeryId);
    Task<byte[]> PrintMedicineDisclosureAsync(Guid surgeryId);
    Task<byte[]> ExportXml4210Async(Guid surgeryId);

    // 6.4 Chỉ định dịch vụ
    Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId);
    Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode);
    Task<List<SurgeryServiceDto>> SearchServicesAsync(string keyword, int? serviceType);
    Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId);
    Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId);
    Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId);
    Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId);
    Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId);
    Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId);
    Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId);
    Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId);
    Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId);
    Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId);
    Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId);

    // 6.4.1 Nhóm dịch vụ nhanh
    Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId);
    Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId);
    Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId);
    Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId);
    Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId);

    // 6.4.2 In chỉ định
    Task<byte[]> PrintServiceOrderAsync(Guid orderId);
    Task<byte[]> PrintOrdersByPaymentObjectAsync(Guid surgeryId, int paymentObject);
    Task<byte[]> PrintOrdersByGroupAsync(Guid surgeryId, string serviceGroup);
    Task<byte[]> PrintMultipleOrdersAsync(List<Guid> orderIds);
}
