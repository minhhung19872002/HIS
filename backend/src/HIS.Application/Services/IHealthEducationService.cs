using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IHealthEducationService
{
    Task<List<HealthCampaignDto>> SearchCampaignsAsync(HealthCampaignSearchDto? filter = null);
    Task<HealthCampaignDto> CreateCampaignAsync(CreateHealthCampaignDto dto);
    Task<HealthCampaignDto> UpdateCampaignAsync(Guid id, CreateHealthCampaignDto dto);
    Task<List<HealthEducationMaterialDto>> SearchMaterialsAsync(HealthEducationMaterialSearchDto? filter = null);
    Task<HealthEducationMaterialDto> CreateMaterialAsync(CreateHealthEducationMaterialDto dto);
    Task<CampaignStatsDto> GetCampaignStatsAsync();
}
