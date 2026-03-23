using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ICommunityHealthService
{
    // Households
    Task<List<HouseholdListDto>> SearchHouseholdsAsync(HouseholdSearchDto? filter = null);
    Task<HouseholdListDto?> GetHouseholdByIdAsync(Guid id);
    Task<HouseholdListDto> CreateHouseholdAsync(HouseholdCreateDto dto);
    Task<HouseholdListDto> UpdateHouseholdAsync(Guid id, HouseholdUpdateDto dto);
    Task DeleteHouseholdAsync(Guid id);
    Task<List<HouseholdListDto>> GetHouseholdsByRiskAsync(int riskLevel);
    Task<List<OverdueVisitDto>> GetOverdueVisitsAsync();

    // NCD Screenings
    Task<List<NcdScreeningListDto>> SearchNcdScreeningsAsync(NcdScreeningSearchDto? filter = null);
    Task<NcdScreeningListDto?> GetNcdScreeningByIdAsync(Guid id);
    Task<NcdScreeningListDto> CreateNcdScreeningAsync(NcdScreeningCreateDto dto);
    Task<NcdScreeningListDto> UpdateNcdScreeningAsync(Guid id, NcdScreeningUpdateDto dto);
    Task<NcdStatsDto> GetNcdStatsAsync();

    // Teams
    Task<List<TeamListDto>> SearchTeamsAsync(TeamSearchDto? filter = null);
    Task<TeamListDto?> GetTeamByIdAsync(Guid id);
    Task<TeamListDto> CreateTeamAsync(TeamCreateDto dto);
    Task<TeamListDto> UpdateTeamAsync(Guid id, TeamUpdateDto dto);
    Task DeleteTeamAsync(Guid id);
}
