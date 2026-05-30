using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;

namespace HIS.Application.Services.Surgery;

/// <summary>
/// Surgery Scheduling Service — 6.1 Quản lý PTTT + 6.1.1 Gói PTTT &amp; Định mức.
///
/// K12 Step 2b (2026-05-30, Plan B): tách 22 method scheduling + packages
/// khỏi god interface ISurgeryCompleteService (105 method).
/// Facade vẫn giữ public API stable.
/// </summary>
public interface ISurgerySchedulingService
{
    // 6.1 Quản lý PTTT
    Task<SurgeryDto> CreateSurgeryRequestAsync(CreateSurgeryRequestDto dto, Guid userId);
    Task<SurgeryDto> ApproveSurgeryAsync(ApproveSurgeryDto dto, Guid userId);
    Task<SurgeryDto> RejectSurgeryAsync(Guid surgeryId, string reason, Guid userId);
    Task<SurgeryDto> ScheduleSurgeryAsync(ScheduleSurgeryDto dto, Guid userId);
    Task<List<SurgeryScheduleDto>> GetSurgeryScheduleAsync(DateTime date, Guid? operatingRoomId);
    Task<SurgeryDto> CheckInPatientAsync(SurgeryCheckInDto dto, Guid userId);
    Task<PagedResultDto<SurgeryDto>> GetSurgeriesAsync(SurgerySearchDto dto);
    Task<SurgeryDto?> GetSurgeryByIdAsync(Guid id);
    Task<SurgeryDto> UpdateSurgeryStatusAsync(Guid surgeryId, int status, Guid userId);
    Task<bool> CancelSurgeryAsync(Guid surgeryId, string reason, Guid userId);
    Task<SurgeryDto> SetTeamFeesAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> teamMembers, Guid userId);
    Task<SurgeryFeeCalculationDto> CalculateTeamFeesAsync(Guid surgeryId);
    Task<SurgeryProfitDto> CalculateProfitAsync(Guid surgeryId);
    Task<SurgeryCostCalculationDto> CalculateCostTT37Async(Guid surgeryId, bool hasTeamChange);
    Task<SurgeryStatisticsDto> GetStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId);

    // 6.1.1 Gói PTTT & Định mức
    Task<List<SurgeryPackageDto>> GetSurgeryPackagesAsync(Guid? surgeryServiceId);
    Task<SurgeryPackageDto?> GetSurgeryPackageByIdAsync(Guid id);
    Task<SurgeryPackageDto> SaveSurgeryPackageAsync(SurgeryPackageDto dto, Guid userId);
    Task<bool> DeleteSurgeryPackageAsync(Guid id, Guid userId);
    Task<List<PackageMedicineNormDto>> GetPackageMedicineNormsAsync(Guid packageId);
    Task<List<PackageSupplyNormDto>> GetPackageSupplyNormsAsync(Guid packageId);
}
