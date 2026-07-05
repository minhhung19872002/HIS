using HIS.Application.Common;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic danh mục RIS/CĐHA (N1.11) — tách khỏi RisCatalogController (#202 thin-controller).
/// Modality / BodyPart / Protocol / ReportTemplate / ICD→Template / PTTT service mapping.
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IRisCatalogService
{
    // 1. Modality
    Task<ServiceOutcome> GetModalitiesAsync(string? keyword, bool? isActive);
    Task<ServiceOutcome> SaveModalityAsync(RadiologyModality dto, Guid userId);
    Task<ServiceOutcome> DeleteModalityAsync(Guid id);

    // 2. BodyPart
    Task<ServiceOutcome> GetBodyPartsAsync(string? keyword, string? region);
    Task<ServiceOutcome> SaveBodyPartAsync(RadiologyBodyPart dto, Guid userId);
    Task<ServiceOutcome> DeleteBodyPartAsync(Guid id);

    // 3. Protocol
    Task<ServiceOutcome> GetProtocolsAsync(string? keyword, Guid? modalityId, Guid? bodyPartId);
    Task<ServiceOutcome> SaveProtocolAsync(RadiologyProtocol dto, Guid userId);
    Task<ServiceOutcome> DeleteProtocolAsync(Guid id);

    // 4. ReportTemplate
    Task<ServiceOutcome> GetReportTemplatesAsync(string? keyword, Guid? modalityId, Guid? bodyPartId);
    Task<ServiceOutcome> SaveReportTemplateAsync(RadiologyReportTemplate dto, Guid userId);
    Task<ServiceOutcome> DeleteReportTemplateAsync(Guid id);

    // 5. ICD → Template Mapping (G-34c)
    Task<ServiceOutcome> GetIcdTemplateMappingsAsync(string? icdCode, Guid? modalityId, string? keyword);
    Task<ServiceOutcome> SaveIcdTemplateMappingAsync(RisIcdTemplateMapping dto, Guid userId);
    Task<ServiceOutcome> DeleteIcdTemplateMappingAsync(Guid id);

    // 6. PTTT service mapping (Prompt 8 Đợt 2)
    Task<ServiceOutcome> GetPtttMappingByServiceAsync(Guid serviceId);
    Task<ServiceOutcome> CheckBatchPtttMappingAsync(List<Guid> serviceIds);
    Task<ServiceOutcome> GetPtttServiceMappingsAsync(string? keyword, bool? isActive);
    Task<ServiceOutcome> SavePtttServiceMappingAsync(RisSurgeryServiceMapping dto, Guid userId);
    Task<ServiceOutcome> DeletePtttServiceMappingAsync(Guid id);
}
