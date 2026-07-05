using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// RIS admin — danh mục CĐHA (N1.11).
/// Modality / BodyPart / Protocol / ReportTemplate.
/// </summary>
[ApiController]
[Route("api/ris-catalog")]
[Authorize]
public class RisCatalogController : ControllerBase
{
    private readonly IRisCatalogService _svc;
    public RisCatalogController(IRisCatalogService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // =====================
    // 1. Modality
    // =====================

    [HttpGet("modalities")]
    public async Task<IActionResult> GetModalities([FromQuery] string? keyword, [FromQuery] bool? isActive)
        => (await _svc.GetModalitiesAsync(keyword, isActive)).ToActionResult();

    [HttpPost("modalities")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> SaveModality([FromBody] RadiologyModality dto)
        => (await _svc.SaveModalityAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("modalities/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteModality(Guid id)
        => (await _svc.DeleteModalityAsync(id)).ToActionResult();

    // =====================
    // 2. BodyPart
    // =====================

    [HttpGet("body-parts")]
    public async Task<IActionResult> GetBodyParts([FromQuery] string? keyword, [FromQuery] string? region)
        => (await _svc.GetBodyPartsAsync(keyword, region)).ToActionResult();

    [HttpPost("body-parts")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> SaveBodyPart([FromBody] RadiologyBodyPart dto)
        => (await _svc.SaveBodyPartAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("body-parts/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteBodyPart(Guid id)
        => (await _svc.DeleteBodyPartAsync(id)).ToActionResult();

    // =====================
    // 3. Protocol
    // =====================

    [HttpGet("protocols")]
    public async Task<IActionResult> GetProtocols([FromQuery] string? keyword,
        [FromQuery] Guid? modalityId, [FromQuery] Guid? bodyPartId)
        => (await _svc.GetProtocolsAsync(keyword, modalityId, bodyPartId)).ToActionResult();

    [HttpPost("protocols")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> SaveProtocol([FromBody] RadiologyProtocol dto)
        => (await _svc.SaveProtocolAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("protocols/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteProtocol(Guid id)
        => (await _svc.DeleteProtocolAsync(id)).ToActionResult();

    // =====================
    // 4. ReportTemplate
    // =====================

    [HttpGet("report-templates")]
    public async Task<IActionResult> GetReportTemplates([FromQuery] string? keyword,
        [FromQuery] Guid? modalityId, [FromQuery] Guid? bodyPartId)
        => (await _svc.GetReportTemplatesAsync(keyword, modalityId, bodyPartId)).ToActionResult();

    [HttpPost("report-templates")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
    public async Task<IActionResult> SaveReportTemplate([FromBody] RadiologyReportTemplate dto)
        => (await _svc.SaveReportTemplateAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("report-templates/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteReportTemplate(Guid id)
        => (await _svc.DeleteReportTemplateAsync(id)).ToActionResult();

    // =====================
    // 5. ICD → Template Mapping (G-34c)
    // =====================

    [HttpGet("icd-templates")]
    public async Task<IActionResult> GetIcdTemplateMappings(
        [FromQuery] string? icdCode,
        [FromQuery] Guid? modalityId,
        [FromQuery] string? keyword)
        => (await _svc.GetIcdTemplateMappingsAsync(icdCode, modalityId, keyword)).ToActionResult();

    [HttpPost("icd-templates")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
    public async Task<IActionResult> SaveIcdTemplateMapping([FromBody] RisIcdTemplateMapping dto)
        => (await _svc.SaveIcdTemplateMappingAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("icd-templates/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeleteIcdTemplateMapping(Guid id)
        => (await _svc.DeleteIcdTemplateMappingAsync(id)).ToActionResult();

    // =====================
    // 6. PTTT service mapping (Prompt 8 Đợt 2)
    // Khai báo dịch vụ CĐHA ↔ mẫu tường trình PTTT
    // =====================

    /// <summary>
    /// Resolve mẫu tường trình PTTT theo radiologyServiceId.
    /// FE gọi để biết dịch vụ đang trả KQ có mapping hay không và prefill template.
    /// Trả null/404 nếu không có mapping active.
    /// </summary>
    [HttpGet("pttt-service-mappings/by-service/{serviceId:guid}")]
    public async Task<IActionResult> GetPtttMappingByService(Guid serviceId)
        => (await _svc.GetPtttMappingByServiceAsync(serviceId)).ToActionResult();

    /// <summary>
    /// Batch-check nhiều serviceId xem có mapping PTTT không.
    /// Trả dictionary: serviceId → { hasMappingng, templateId? }.
    /// FE dùng 1 call cho cả trang thay vì N lần by-service/{id}.
    /// </summary>
    [HttpPost("pttt-service-mappings/check-batch")]
    public async Task<IActionResult> CheckBatchPtttMapping([FromBody] List<Guid> serviceIds)
        => (await _svc.CheckBatchPtttMappingAsync(serviceIds)).ToActionResult();

    [HttpGet("pttt-service-mappings")]
    public async Task<IActionResult> GetPtttServiceMappings(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive)
        => (await _svc.GetPtttServiceMappingsAsync(keyword, isActive)).ToActionResult();

    [HttpPost("pttt-service-mappings")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> SavePtttServiceMapping([FromBody] RisSurgeryServiceMapping dto)
        => (await _svc.SavePtttServiceMappingAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("pttt-service-mappings/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.RadiologistManager)]
    public async Task<IActionResult> DeletePtttServiceMapping(Guid id)
        => (await _svc.DeletePtttServiceMappingAsync(id)).ToActionResult();
}
