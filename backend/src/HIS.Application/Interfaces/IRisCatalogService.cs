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
    Task<ServiceOutcome> SaveProtocolAsync(SaveRadiologyProtocolDto dto, Guid userId);
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

/// <summary>
/// QA-R7: body of POST /api/ris-catalog/protocols. The endpoint used to bind the EF entity, so a payload
/// carrying navigation objects (e.g. "modality": {}) inserted blank Modality rows and odd values reached EF.
/// Same fields the v2 RisCatalogAdmin form sends.
/// </summary>
public class SaveRadiologyProtocolDto
{
    public Guid Id { get; set; }
    public string? ProtocolCode { get; set; }
    public string? ProtocolName { get; set; }
    public Guid? ModalityId { get; set; }
    public Guid? BodyPartId { get; set; }
    public bool UseContrast { get; set; }
    public string? ContrastAgent { get; set; }
    public string? ContrastDose { get; set; }
    public decimal? Kvp { get; set; }
    public decimal? Mas { get; set; }
    public decimal? SliceThickness { get; set; }
    public string? Position { get; set; }
    public string? Instructions { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
