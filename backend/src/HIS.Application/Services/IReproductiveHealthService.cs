using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IReproductiveHealthService
{
    Task<List<PrenatalRecordDto>> SearchPrenatalAsync(PrenatalSearchDto? filter = null);
    Task<PrenatalRecordDetailDto?> GetPrenatalByIdAsync(Guid id);
    Task<PrenatalRecordDto> CreatePrenatalAsync(CreatePrenatalRecordDto dto);
    Task<PrenatalRecordDto> UpdatePrenatalAsync(Guid id, CreatePrenatalRecordDto dto);
    Task<List<FamilyPlanningRecordDto>> SearchFamilyPlanningAsync(FamilyPlanningSearchDto? filter = null);
    Task<FamilyPlanningRecordDto> CreateFamilyPlanningAsync(CreateFamilyPlanningRecordDto dto);
    Task<FamilyPlanningRecordDto> UpdateFamilyPlanningAsync(Guid id, CreateFamilyPlanningRecordDto dto);
    Task<ReproductiveHealthStatsDto> GetStatsAsync();
    Task<List<PrenatalRecordDto>> GetHighRiskPregnanciesAsync();
}
