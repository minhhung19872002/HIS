using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IForensicService
{
    Task<List<ForensicCaseDto>> SearchCasesAsync(ForensicCaseSearchDto? filter = null);
    Task<ForensicCaseDetailDto?> GetCaseByIdAsync(Guid id);
    Task<ForensicCaseDto> CreateCaseAsync(CreateForensicCaseDto dto);
    Task<ForensicCaseDto> UpdateCaseAsync(Guid id, CreateForensicCaseDto dto);
    Task<List<ForensicExaminationDto>> GetExaminationsAsync(Guid caseId);
    Task<ForensicExaminationDto> AddExaminationAsync(CreateForensicExaminationDto dto);
    Task<ForensicCaseDto> ApproveCaseAsync(Guid id, decimal? disabilityPercentage, string? conclusion);
    Task<ForensicStatsDto> GetStatsAsync();
    Task<byte[]> PrintCertificateAsync(Guid caseId);
}
