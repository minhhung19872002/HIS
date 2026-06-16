using HIS.Application.DTOs.FunctionalDiagnostic;

namespace HIS.Application.Interfaces;

public interface IFunctionalDiagnosticCatalogService
{
    // ─── TestType ─────────────────────────────────────────────────────────────
    Task<List<FunctionalDiagnosticTestTypeDto>> GetTestTypesAsync(string? keyword);
    Task<FunctionalDiagnosticTestTypeDto> SaveTestTypeAsync(SaveFunctionalDiagnosticTestTypeDto dto, string? userId);
    Task<bool> DeleteTestTypeAsync(Guid id);

    // ─── Template ─────────────────────────────────────────────────────────────
    Task<List<FunctionalDiagnosticTemplateDto>> GetTemplatesAsync(Guid? testTypeId, string? keyword);
    Task<FunctionalDiagnosticTemplateDto> SaveTemplateAsync(SaveFunctionalDiagnosticTemplateDto dto, string? userId);
    Task<bool> DeleteTemplateAsync(Guid id);
}
