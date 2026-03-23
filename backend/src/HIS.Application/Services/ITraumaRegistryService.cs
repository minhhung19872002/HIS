using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ITraumaRegistryService
{
    Task<List<TraumaCaseDto>> SearchCasesAsync(TraumaCaseSearchDto? filter = null);
    Task<TraumaCaseDto?> GetByIdAsync(Guid id);
    Task<TraumaCaseDto> CreateCaseAsync(CreateTraumaCaseDto dto);
    Task<TraumaCaseDto> UpdateCaseAsync(Guid id, CreateTraumaCaseDto dto);
    Task<TraumaStatsDto> GetStatsAsync();
    Task<TraumaOutcomeReportDto> GetOutcomeReportAsync();
}
