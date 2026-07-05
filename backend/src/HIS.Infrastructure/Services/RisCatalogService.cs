using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic danh mục RIS/CĐHA (N1.11) — tách khỏi RisCatalogController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền
/// từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// </summary>
public class RisCatalogService : IRisCatalogService
{
    private readonly HISDbContext _db;
    public RisCatalogService(HISDbContext db) { _db = db; }

    private void Stamp(BaseEntity e, bool isNew, Guid userId)
    {
        var uid = userId.ToString();
        if (isNew)
        {
            e.Id = Guid.NewGuid();
            e.IsDeleted = false;
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

    public async Task<ServiceOutcome> GetModalitiesAsync(string? keyword, bool? isActive)
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
        return ServiceOutcome.Ok(list.Select(m => new
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

    public async Task<ServiceOutcome> SaveModalityAsync(RadiologyModality dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.ModalityCode) || string.IsNullOrWhiteSpace(dto.ModalityName))
            return ServiceOutcome.Bad("Mã và tên modality là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.Set<RadiologyModality>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteModalityAsync(Guid id)
    {
        var e = await _db.Set<RadiologyModality>().FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 2. BodyPart
    // =====================

    public async Task<ServiceOutcome> GetBodyPartsAsync(string? keyword, string? region)
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
        return ServiceOutcome.Ok(await q.OrderBy(b => b.SortOrder).ThenBy(b => b.BodyPartName).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveBodyPartAsync(RadiologyBodyPart dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.BodyPartCode) || string.IsNullOrWhiteSpace(dto.BodyPartName))
            return ServiceOutcome.Bad("Mã và tên vị trí là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyBodyParts.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteBodyPartAsync(Guid id)
    {
        var e = await _db.RadiologyBodyParts.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 3. Protocol
    // =====================

    public async Task<ServiceOutcome> GetProtocolsAsync(string? keyword,
        Guid? modalityId, Guid? bodyPartId)
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
        return ServiceOutcome.Ok(list.Select(p => new
        {
            p.Id, p.ProtocolCode, p.ProtocolName,
            p.ModalityId, ModalityName = p.Modality != null ? p.Modality.ModalityName : null,
            p.BodyPartId, BodyPartName = p.BodyPart != null ? p.BodyPart.BodyPartName : null,
            p.UseContrast, p.ContrastAgent, p.ContrastDose,
            p.Kvp, p.Mas, p.SliceThickness, p.Position,
            p.Instructions, p.Notes, p.SortOrder, p.IsActive,
        }));
    }

    public async Task<ServiceOutcome> SaveProtocolAsync(RadiologyProtocol dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.ProtocolCode) || string.IsNullOrWhiteSpace(dto.ProtocolName))
            return ServiceOutcome.Bad("Mã và tên giao thức là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyProtocols.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteProtocolAsync(Guid id)
    {
        var e = await _db.RadiologyProtocols.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 4. ReportTemplate
    // =====================

    public async Task<ServiceOutcome> GetReportTemplatesAsync(string? keyword,
        Guid? modalityId, Guid? bodyPartId)
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
        return ServiceOutcome.Ok(list.Select(t => new
        {
            t.Id, t.TemplateCode, t.TemplateName,
            t.ModalityId, ModalityName = t.Modality != null ? t.Modality.ModalityName : null,
            t.BodyPartId, BodyPartName = t.BodyPart != null ? t.BodyPart.BodyPartName : null,
            t.TechniqueText, t.FindingsTemplate, t.ImpressionTemplate,
            t.Note, t.SortOrder, t.IsActive,
        }));
    }

    public async Task<ServiceOutcome> SaveReportTemplateAsync(RadiologyReportTemplate dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.TemplateCode) || string.IsNullOrWhiteSpace(dto.TemplateName))
            return ServiceOutcome.Bad("Mã và tên mẫu là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.RadiologyReportTemplates.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteReportTemplateAsync(Guid id)
    {
        var e = await _db.RadiologyReportTemplates.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 5. ICD → Template Mapping (G-34c)
    // =====================

    public async Task<ServiceOutcome> GetIcdTemplateMappingsAsync(
        string? icdCode,
        Guid? modalityId,
        string? keyword)
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
        return ServiceOutcome.Ok(list.Select(m => new
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

    public async Task<ServiceOutcome> SaveIcdTemplateMappingAsync(RisIcdTemplateMapping dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.IcdCode) || dto.TemplateId == Guid.Empty)
            return ServiceOutcome.Bad("Mã ICD và template là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.RisIcdTemplateMappings.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteIcdTemplateMappingAsync(Guid id)
    {
        var e = await _db.RisIcdTemplateMappings.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
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
    public async Task<ServiceOutcome> GetPtttMappingByServiceAsync(Guid serviceId)
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

        if (mapping == null) return ServiceOutcome.NotFound("Không có mapping PTTT cho dịch vụ này");

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

        return ServiceOutcome.Ok(new
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

    /// <summary>
    /// Batch-check nhiều serviceId xem có mapping PTTT không.
    /// Trả dictionary: serviceId → { hasMappingng, templateId? }.
    /// FE dùng 1 call cho cả trang thay vì N lần by-service/{id}.
    /// </summary>
    public async Task<ServiceOutcome> CheckBatchPtttMappingAsync(List<Guid> serviceIds)
    {
        if (serviceIds == null || serviceIds.Count == 0)
            return ServiceOutcome.Ok(new Dictionary<string, object>());

        var mappings = await _db.RisSurgeryServiceMappings
            .Where(m => serviceIds.Contains(m.RadiologyServiceId) && m.IsActive && !m.IsDeleted)
            .Select(m => new
            {
                m.RadiologyServiceId,
                m.SurgeryNarrativeTemplateId,
                m.SurgeryNarrativeTemplateName,
            })
            .ToListAsync();

        // Kết quả: dict serviceId (string lower) → { hasMapping, templateId? }
        var result = serviceIds.ToDictionary(
            id => id.ToString(),
            id =>
            {
                var m = mappings.FirstOrDefault(x => x.RadiologyServiceId == id);
                return (object)new
                {
                    hasMapping = m != null,
                    templateId = m?.SurgeryNarrativeTemplateId,
                    templateName = m?.SurgeryNarrativeTemplateName,
                };
            });

        return ServiceOutcome.Ok(result);
    }

    public async Task<ServiceOutcome> GetPtttServiceMappingsAsync(
        string? keyword,
        bool? isActive)
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
        return ServiceOutcome.Ok(list.Select(m => new
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

    public async Task<ServiceOutcome> SavePtttServiceMappingAsync(RisSurgeryServiceMapping dto, Guid userId)
    {
        if (dto.RadiologyServiceId == Guid.Empty || string.IsNullOrWhiteSpace(dto.RadiologyServiceName))
            return ServiceOutcome.Bad("RadiologyServiceId và RadiologyServiceName là bắt buộc");

        var existing = dto.Id != Guid.Empty
            ? await _db.RisSurgeryServiceMappings.FindAsync(dto.Id)
            : null;

        if (existing == null)
        {
            Stamp(dto, true, userId);
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
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeletePtttServiceMappingAsync(Guid id)
    {
        var e = await _db.RisSurgeryServiceMappings.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }
}
