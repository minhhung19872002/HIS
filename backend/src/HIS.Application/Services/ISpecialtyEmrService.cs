using HIS.Application.DTOs.SpecialtyEmr;

namespace HIS.Application.Services;

public interface ISpecialtyEmrService
{
    Task<SpecialtyEmrPagedResult> SearchAsync(SpecialtyEmrSearchDto dto);
    Task<SpecialtyEmrDto?> GetByIdAsync(Guid id);
    Task<SpecialtyEmrDto> SaveAsync(SpecialtyEmrSaveDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<byte[]> ExportPdfAsync(Guid id);
    Task<byte[]> ExportXmlAsync(Guid id);
}
