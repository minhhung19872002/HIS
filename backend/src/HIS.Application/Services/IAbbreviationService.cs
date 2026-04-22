using HIS.Application.DTOs.Abbreviation;

namespace HIS.Application.Services;

public interface IAbbreviationService
{
    Task<AbbreviationDto> SaveAsync(SaveAbbreviationDto dto, Guid userId);
    Task<bool> DeleteAsync(Guid id, Guid userId);
    Task<List<AbbreviationDto>> SearchAsync(int? scope, string? scopeKey, Guid userId);
    Task<AbbreviationDto> IncrementUsageAsync(Guid id);
}
