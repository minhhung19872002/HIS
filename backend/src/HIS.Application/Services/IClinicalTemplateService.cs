using HIS.Application.DTOs.Clinical;

namespace HIS.Application.Services;

public interface IClinicalTemplateService
{
    Task<ClinicalTemplateDto> SaveAsync(SaveClinicalTemplateDto dto, Guid userId);
    Task<bool> DeleteAsync(Guid id, Guid userId);
    Task<ClinicalTemplateDto?> GetByIdAsync(Guid id);
    Task<List<ClinicalTemplateDto>> SearchAsync(ClinicalTemplateSearchDto dto);
    Task<ClinicalTemplateDto> IncrementUsageAsync(Guid id);
}
