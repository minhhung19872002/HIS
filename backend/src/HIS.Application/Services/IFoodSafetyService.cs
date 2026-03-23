using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IFoodSafetyService
{
    // Incidents
    Task<List<FoodIncidentListDto>> SearchIncidentsAsync(FoodIncidentSearchDto? filter = null);
    Task<FoodIncidentListDto?> GetIncidentByIdAsync(Guid id);
    Task<FoodIncidentListDto> CreateIncidentAsync(FoodIncidentCreateDto dto);
    Task<FoodIncidentListDto> UpdateIncidentAsync(Guid id, FoodIncidentUpdateDto dto);
    Task<FoodIncidentStatsDto> GetIncidentStatsAsync();

    // Samples
    Task<FoodSampleListDto> AddSampleAsync(FoodSampleCreateDto dto);
    Task<FoodSampleListDto> UpdateSampleAsync(Guid id, FoodSampleUpdateDto dto);
    Task<List<FoodSampleListDto>> GetSamplesByIncidentAsync(Guid incidentId);

    // Inspections
    Task<List<FoodInspectionListDto>> SearchInspectionsAsync(FoodInspectionSearchDto? filter = null);
    Task<FoodInspectionListDto> CreateInspectionAsync(FoodInspectionCreateDto dto);
    Task<FoodInspectionListDto> UpdateInspectionAsync(Guid id, FoodInspectionUpdateDto dto);
    Task<FoodInspectionStatsDto> GetInspectionStatsAsync();
}
