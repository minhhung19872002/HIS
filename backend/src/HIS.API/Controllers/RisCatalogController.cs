using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    private readonly HISDbContext _db;
    public RisCatalogController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private void Stamp(BaseEntity e, bool isNew)
    {
        var uid = GetUserId().ToString();
        if (isNew)
        {
            if (e.Id == Guid.Empty) e.Id = Guid.NewGuid();
            e.CreatedAt = DateTime.Now;
            e.CreatedBy = uid;
        }
        else
        {
            e.UpdatedAt = DateTime.Now;
            e.UpdatedBy = uid;
        }
    }

    // =====================
    // 1. Modality
    // =====================

    [HttpGet("modalities")]
    public async Task<IActionResult> GetModalities([FromQuery] string? keyword, [FromQuery] bool? isActive)
    {
        var q = _db.Set<RadiologyModality>()
            .Include(m => m.DefaultResultTemplate)
            .AsQueryable();
        if (isActive.HasValue) q = q.Where(m => m.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(m => m.ModalityCode.Contains(kw) || m.ModalityName.Contains(kw));
        }
        var list = await q.OrderBy(m => m.ModalityCode).ToListAsync();
        return Ok(list.Select(m => new
        {
            m.Id, m.ModalityCode, m.ModalityName, m.ModalityType,
            m.AETitle, m.IPAddress, m.Port, m.RoomId,
            m.Status, m.IsActive,
            m.Manufacturer, m.ModelName, m.SerialNumber,
            m.InstallationDate, m.LastMaintenanceDate, m.Notes,
            // G-34a/b fields
            m.MaxImagesPerReport,
            m.MaxImagesToStore,
            m.DefaultResultTemplateId,
            DefaultResultTemplateName = m.DefaultResultTemplate != null ? m.DefaultResultTemplate.TemplateName : null,
        }));
    }

    [HttpPost("modalities")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> SaveModality([FromBody] RadiologyModality dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ModalityCode) || string.IsNullOrWhiteSpace(dto.ModalityName))
            return BadRequest(new { message = "Mã và tên modality là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.Set<RadiologyModality>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
            _db.Set<RadiologyModality>().Add(dto);
        }
        else
        {
            existing.ModalityCode = dto.ModalityCode;
            existing.ModalityName = dto.ModalityName;
            existing.ModalityType = dto.ModalityType;
            existing.IsActive = dto.IsActive;
            // G-34a/b
            existing.MaxImagesPerReport = dto.MaxImagesPerReport;
            existing.MaxImagesToStore = dto.MaxImagesToStore;
            existing.DefaultResultTemplateId = dto.DefaultResultTemplateId;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("modalities/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeleteModality(Guid id)
    {
        var e = await _db.Set<RadiologyModality>().FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 2. BodyPart
    // =====================

    [HttpGet("body-parts")]
    public async Task<IActionResult> GetBodyParts([FromQuery] string? keyword, [FromQuery] string? region)
    {
        var q = _db.RadiologyBodyParts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(region)) q = q.Where(b => b.Region == region);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(b => b.BodyPartCode.Contains(kw) || b.BodyPartName.Contains(kw)
                || (b.EnglishName != null && b.EnglishName.Contains(kw))
                || (b.DicomCode != null && b.DicomCode.Contains(kw)));
        }
        return Ok(await q.OrderBy(b => b.SortOrder).ThenBy(b => b.BodyPartName).ToListAsync());
    }

    [HttpPost("body-parts")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> SaveBodyPart([FromBody] RadiologyBodyPart dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BodyPartCode) || string.IsNullOrWhiteSpace(dto.BodyPartName))
            return BadRequest(new { message = "Mã và tên vị trí là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyBodyParts.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
            _db.RadiologyBodyParts.Add(dto);
        }
        else
        {
            existing.BodyPartCode = dto.BodyPartCode;
            existing.BodyPartName = dto.BodyPartName;
            existing.EnglishName = dto.EnglishName;
            existing.DicomCode = dto.DicomCode;
            existing.Region = dto.Region;
            existing.Description = dto.Description;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("body-parts/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeleteBodyPart(Guid id)
    {
        var e = await _db.RadiologyBodyParts.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 3. Protocol
    // =====================

    [HttpGet("protocols")]
    public async Task<IActionResult> GetProtocols([FromQuery] string? keyword,
        [FromQuery] Guid? modalityId, [FromQuery] Guid? bodyPartId)
    {
        var q = _db.RadiologyProtocols
            .Include(p => p.Modality)
            .Include(p => p.BodyPart)
            .AsQueryable();
        if (modalityId.HasValue) q = q.Where(p => p.ModalityId == modalityId.Value);
        if (bodyPartId.HasValue) q = q.Where(p => p.BodyPartId == bodyPartId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(p => p.ProtocolCode.Contains(kw) || p.ProtocolName.Contains(kw));
        }
        var list = await q.OrderBy(p => p.SortOrder).ThenBy(p => p.ProtocolName).Take(300).ToListAsync();
        return Ok(list.Select(p => new
        {
            p.Id, p.ProtocolCode, p.ProtocolName,
            p.ModalityId, ModalityName = p.Modality != null ? p.Modality.ModalityName : null,
            p.BodyPartId, BodyPartName = p.BodyPart != null ? p.BodyPart.BodyPartName : null,
            p.UseContrast, p.ContrastAgent, p.ContrastDose,
            p.Kvp, p.Mas, p.SliceThickness, p.Position,
            p.Instructions, p.Notes, p.SortOrder, p.IsActive,
        }));
    }

    [HttpPost("protocols")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> SaveProtocol([FromBody] RadiologyProtocol dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ProtocolCode) || string.IsNullOrWhiteSpace(dto.ProtocolName))
            return BadRequest(new { message = "Mã và tên giao thức là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyProtocols.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
            _db.RadiologyProtocols.Add(dto);
        }
        else
        {
            existing.ProtocolCode = dto.ProtocolCode;
            existing.ProtocolName = dto.ProtocolName;
            existing.ModalityId = dto.ModalityId;
            existing.BodyPartId = dto.BodyPartId;
            existing.UseContrast = dto.UseContrast;
            existing.ContrastAgent = dto.ContrastAgent;
            existing.ContrastDose = dto.ContrastDose;
            existing.Kvp = dto.Kvp;
            existing.Mas = dto.Mas;
            existing.SliceThickness = dto.SliceThickness;
            existing.Position = dto.Position;
            existing.Instructions = dto.Instructions;
            existing.Notes = dto.Notes;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("protocols/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeleteProtocol(Guid id)
    {
        var e = await _db.RadiologyProtocols.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 4. ReportTemplate
    // =====================

    [HttpGet("report-templates")]
    public async Task<IActionResult> GetReportTemplates([FromQuery] string? keyword,
        [FromQuery] Guid? modalityId, [FromQuery] Guid? bodyPartId)
    {
        var q = _db.RadiologyReportTemplates
            .Include(t => t.Modality)
            .Include(t => t.BodyPart)
            .AsQueryable();
        if (modalityId.HasValue) q = q.Where(t => t.ModalityId == modalityId.Value);
        if (bodyPartId.HasValue) q = q.Where(t => t.BodyPartId == bodyPartId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(t => t.TemplateCode.Contains(kw) || t.TemplateName.Contains(kw));
        }
        var list = await q.OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName).Take(300).ToListAsync();
        return Ok(list.Select(t => new
        {
            t.Id, t.TemplateCode, t.TemplateName,
            t.ModalityId, ModalityName = t.Modality != null ? t.Modality.ModalityName : null,
            t.BodyPartId, BodyPartName = t.BodyPart != null ? t.BodyPart.BodyPartName : null,
            t.TechniqueText, t.FindingsTemplate, t.ImpressionTemplate,
            t.Note, t.SortOrder, t.IsActive,
        }));
    }

    [HttpPost("report-templates")]
    [Authorize(Roles = "Admin,RadiologyManager,Radiologist")]
    public async Task<IActionResult> SaveReportTemplate([FromBody] RadiologyReportTemplate dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TemplateCode) || string.IsNullOrWhiteSpace(dto.TemplateName))
            return BadRequest(new { message = "Mã và tên mẫu là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyReportTemplates.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
            _db.RadiologyReportTemplates.Add(dto);
        }
        else
        {
            existing.TemplateCode = dto.TemplateCode;
            existing.TemplateName = dto.TemplateName;
            existing.ModalityId = dto.ModalityId;
            existing.BodyPartId = dto.BodyPartId;
            existing.TechniqueText = dto.TechniqueText;
            existing.FindingsTemplate = dto.FindingsTemplate;
            existing.ImpressionTemplate = dto.ImpressionTemplate;
            existing.Note = dto.Note;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("report-templates/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeleteReportTemplate(Guid id)
    {
        var e = await _db.RadiologyReportTemplates.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 5. ICD → Template Mapping (G-34c)
    // =====================

    [HttpGet("icd-templates")]
    public async Task<IActionResult> GetIcdTemplateMappings(
        [FromQuery] string? icdCode,
        [FromQuery] Guid? modalityId,
        [FromQuery] string? keyword)
    {
        var q = _db.RisIcdTemplateMappings
            .Include(m => m.Template)
            .Include(m => m.Modality)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(icdCode)) q = q.Where(m => m.IcdCode == icdCode);
        if (modalityId.HasValue) q = q.Where(m => m.ModalityId == modalityId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(m => m.IcdCode.Contains(kw) || (m.IcdName != null && m.IcdName.Contains(kw)));
        }
        var list = await q.OrderBy(m => m.SortOrder).ThenBy(m => m.IcdCode).Take(500).ToListAsync();
        return Ok(list.Select(m => new
        {
            m.Id,
            m.IcdCode,
            m.IcdName,
            m.TemplateId,
            TemplateName = m.Template != null ? m.Template.TemplateName : null,
            m.ModalityId,
            ModalityName = m.Modality != null ? m.Modality.ModalityName : null,
            m.SortOrder,
            m.IsActive,
        }));
    }

    [HttpPost("icd-templates")]
    [Authorize(Roles = "Admin,RadiologyManager,Radiologist")]
    public async Task<IActionResult> SaveIcdTemplateMapping([FromBody] RisIcdTemplateMapping dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IcdCode) || dto.TemplateId == Guid.Empty)
            return BadRequest(new { message = "Mã ICD và template là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.RisIcdTemplateMappings.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
            _db.RisIcdTemplateMappings.Add(dto);
        }
        else
        {
            existing.IcdCode = dto.IcdCode;
            existing.IcdName = dto.IcdName;
            existing.TemplateId = dto.TemplateId;
            existing.ModalityId = dto.ModalityId;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("icd-templates/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeleteIcdTemplateMapping(Guid id)
    {
        var e = await _db.RisIcdTemplateMappings.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

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
    {
        var mapping = await _db.RisSurgeryServiceMappings
            .Where(m => m.RadiologyServiceId == serviceId && m.IsActive && !m.IsDeleted)
            .OrderBy(m => m.SortOrder)
            .Select(m => new
            {
                m.Id,
                m.RadiologyServiceId,
                m.RadiologyServiceName,
                m.SurgeryNarrativeTemplateId,
                m.SurgeryNarrativeTemplateName,
                m.Notes,
            })
            .FirstOrDefaultAsync();

        if (mapping == null) return NotFound(new { message = "Không có mapping PTTT cho dịch vụ này" });

        // Nếu có templateId, trả thêm nội dung template để FE prefill
        object? templateDetail = null;
        if (mapping.SurgeryNarrativeTemplateId.HasValue)
        {
            templateDetail = await _db.SurgeryNarrativeTemplates
                .Where(t => t.Id == mapping.SurgeryNarrativeTemplateId.Value && t.IsActive && !t.IsDeleted)
                .Select(t => new
                {
                    t.Id,
                    t.TemplateCode,
                    t.TemplateName,
                    t.PreOpDiagnosis,
                    t.PostOpDiagnosis,
                    t.SurgeryMethod,
                    t.AnesthesiaMethod,
                    t.NarrativeBody,
                    t.Complications,
                    t.PostOpOrders,
                })
                .FirstOrDefaultAsync();
        }

        return Ok(new
        {
            mapping.Id,
            mapping.RadiologyServiceId,
            mapping.RadiologyServiceName,
            mapping.SurgeryNarrativeTemplateId,
            mapping.SurgeryNarrativeTemplateName,
            mapping.Notes,
            Template = templateDetail,
        });
    }

    [HttpGet("pttt-service-mappings")]
    public async Task<IActionResult> GetPtttServiceMappings(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive)
    {
        var q = _db.RisSurgeryServiceMappings.AsQueryable();
        if (isActive.HasValue) q = q.Where(m => m.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(m => m.RadiologyServiceName.Contains(kw)
                || (m.SurgeryNarrativeTemplateName != null && m.SurgeryNarrativeTemplateName.Contains(kw)));
        }
        var list = await q
            .Where(m => !m.IsDeleted)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.RadiologyServiceName)
            .ToListAsync();
        return Ok(list.Select(m => new
        {
            m.Id,
            m.RadiologyServiceId,
            m.RadiologyServiceName,
            m.SurgeryNarrativeTemplateId,
            m.SurgeryNarrativeTemplateName,
            m.Notes,
            m.SortOrder,
            m.IsActive,
        }));
    }

    [HttpPost("pttt-service-mappings")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> SavePtttServiceMapping([FromBody] RisSurgeryServiceMapping dto)
    {
        if (dto.RadiologyServiceId == Guid.Empty || string.IsNullOrWhiteSpace(dto.RadiologyServiceName))
            return BadRequest(new { message = "RadiologyServiceId và RadiologyServiceName là bắt buộc" });

        var existing = dto.Id != Guid.Empty
            ? await _db.RisSurgeryServiceMappings.FindAsync(dto.Id)
            : null;

        if (existing == null)
        {
            Stamp(dto, true);
            _db.RisSurgeryServiceMappings.Add(dto);
        }
        else
        {
            existing.RadiologyServiceId = dto.RadiologyServiceId;
            existing.RadiologyServiceName = dto.RadiologyServiceName;
            existing.SurgeryNarrativeTemplateId = dto.SurgeryNarrativeTemplateId;
            existing.SurgeryNarrativeTemplateName = dto.SurgeryNarrativeTemplateName;
            existing.Notes = dto.Notes;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("pttt-service-mappings/{id:guid}")]
    [Authorize(Roles = "Admin,RadiologyManager")]
    public async Task<IActionResult> DeletePtttServiceMapping(Guid id)
    {
        var e = await _db.RisSurgeryServiceMappings.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
