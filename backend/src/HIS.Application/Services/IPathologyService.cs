using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IPathologyService
{
    Task<List<PathologyRequestDto>> GetPathologyRequestsAsync(PathologySearchDto? filter = null);
    Task<PathologyRequestDetailDto?> GetPathologyRequestByIdAsync(Guid id);
    Task<PathologyResultDto> CreatePathologyResultAsync(CreatePathologyResultDto dto);
    Task<PathologyResultDto> UpdatePathologyResultAsync(Guid id, UpdatePathologyResultDto dto);
    Task<PathologyStatsDto> GetPathologyStatisticsAsync();
    Task<List<SpecimenTypeDto>> GetSpecimenTypesAsync();
    Task<byte[]> PrintPathologyReportAsync(Guid resultId);
}
