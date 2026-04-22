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
        var q = _db.Set<RadiologyModality>().AsQueryable();
        if (isActive.HasValue) q = q.Where(m => m.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(m => m.ModalityCode.Contains(kw) || m.ModalityName.Contains(kw));
        }
        return Ok(await q.OrderBy(m => m.ModalityCode).ToListAsync());
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
}
