using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// LIS admin — 6 danh mục CRUD (N1.10) tách khỏi LisCatalogController (#202 thin-controller).
/// LabBook / LabBookGroup / LabMeasurementUnit / LabOrganism / LabAntibiotic / LabChemical.
/// Behavior-preserving: mọi query/projection/validation/response shape giữ nguyên; userId
/// truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public class LisCatalogService : ILisCatalogService
{
    private readonly HISDbContext _db;
    public LisCatalogService(HISDbContext db) { _db = db; }

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
    // 1. LabBook (Sổ XN)
    // =====================

    public async Task<ServiceOutcome> GetBooksAsync(string? keyword, bool? isActive)
    {
        var q = _db.LabBooks.AsQueryable();
        if (isActive.HasValue) q = q.Where(b => b.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(b => b.BookCode.Contains(kw) || b.BookName.Contains(kw));
        }
        return ServiceOutcome.Ok(await q.OrderBy(b => b.SortOrder).ThenBy(b => b.BookName).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveBookAsync(LabBook dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.BookCode) || string.IsNullOrWhiteSpace(dto.BookName))
            return ServiceOutcome.Bad("Mã và tên sổ XN là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.LabBooks.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.LabBooks.Add(dto);
        }
        else
        {
            existing.BookCode = dto.BookCode;
            existing.BookName = dto.BookName;
            existing.SortOrder = dto.SortOrder;
            existing.BarcodePrefix = dto.BarcodePrefix;
            existing.Description = dto.Description;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteBookAsync(Guid id)
    {
        var e = await _db.LabBooks.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 2. LabBookGroup (Nhóm XN / Loại XN)
    // =====================

    public async Task<ServiceOutcome> GetGroupsAsync(Guid? labBookId, string? keyword)
    {
        var q = _db.Set<LabBookGroup>().AsQueryable();
        if (labBookId.HasValue) q = q.Where(g => g.LabBookId == labBookId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(g => g.GroupCode.Contains(kw) || g.GroupName.Contains(kw));
        }
        return ServiceOutcome.Ok(await q.OrderBy(g => g.LabBookId).ThenBy(g => g.SortOrder).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveGroupAsync(LabBookGroup dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.GroupCode) || string.IsNullOrWhiteSpace(dto.GroupName))
            return ServiceOutcome.Bad("Mã và tên nhóm là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.Set<LabBookGroup>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.Set<LabBookGroup>().Add(dto);
        }
        else
        {
            existing.LabBookId = dto.LabBookId;
            existing.GroupCode = dto.GroupCode;
            existing.GroupName = dto.GroupName;
            existing.SortOrder = dto.SortOrder;
            existing.ServiceIdsJson = dto.ServiceIdsJson;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteGroupAsync(Guid id)
    {
        var e = await _db.Set<LabBookGroup>().FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 3. LabMeasurementUnit (Đơn vị đo)
    // =====================

    public async Task<ServiceOutcome> GetUnitsAsync(string? keyword, bool? isActive)
    {
        var q = _db.LabMeasurementUnits.AsQueryable();
        if (isActive.HasValue) q = q.Where(u => u.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(u => u.UnitCode.Contains(kw) || u.UnitName.Contains(kw)
                || (u.UnitSymbol != null && u.UnitSymbol.Contains(kw)));
        }
        return ServiceOutcome.Ok(await q.OrderBy(u => u.SortOrder).ThenBy(u => u.UnitName).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveUnitAsync(LabMeasurementUnit dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.UnitCode) || string.IsNullOrWhiteSpace(dto.UnitName))
            return ServiceOutcome.Bad("Mã và tên đơn vị là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.LabMeasurementUnits.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.LabMeasurementUnits.Add(dto);
        }
        else
        {
            existing.UnitCode = dto.UnitCode;
            existing.UnitName = dto.UnitName;
            existing.UnitSymbol = dto.UnitSymbol;
            existing.Description = dto.Description;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteUnitAsync(Guid id)
    {
        var e = await _db.LabMeasurementUnits.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 4. LabOrganism (Vi khuẩn)
    // =====================

    public async Task<ServiceOutcome> GetOrganismsAsync(string? keyword, string? category)
    {
        var q = _db.LabOrganisms.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(o => o.Category == category);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(o => o.OrganismCode.Contains(kw) || o.OrganismName.Contains(kw)
                || (o.LatinName != null && o.LatinName.Contains(kw)));
        }
        return ServiceOutcome.Ok(await q.OrderBy(o => o.SortOrder).ThenBy(o => o.OrganismName).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveOrganismAsync(LabOrganism dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.OrganismCode) || string.IsNullOrWhiteSpace(dto.OrganismName))
            return ServiceOutcome.Bad("Mã và tên vi khuẩn là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.LabOrganisms.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.LabOrganisms.Add(dto);
        }
        else
        {
            existing.OrganismCode = dto.OrganismCode;
            existing.OrganismName = dto.OrganismName;
            existing.LatinName = dto.LatinName;
            existing.GramType = dto.GramType;
            existing.MorphologyType = dto.MorphologyType;
            existing.Category = dto.Category;
            existing.Notes = dto.Notes;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteOrganismAsync(Guid id)
    {
        var e = await _db.LabOrganisms.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 5. LabAntibiotic (Kháng sinh)
    // =====================

    public async Task<ServiceOutcome> GetAntibioticsAsync(string? keyword, string? drugClass)
    {
        var q = _db.LabAntibiotics.AsQueryable();
        if (!string.IsNullOrWhiteSpace(drugClass)) q = q.Where(a => a.DrugClass == drugClass);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(a => a.AntibioticCode.Contains(kw) || a.AntibioticName.Contains(kw)
                || (a.GenericName != null && a.GenericName.Contains(kw))
                || (a.AtcCode != null && a.AtcCode.Contains(kw)));
        }
        return ServiceOutcome.Ok(await q.OrderBy(a => a.SortOrder).ThenBy(a => a.AntibioticName).ToListAsync());
    }

    public async Task<ServiceOutcome> SaveAntibioticAsync(LabAntibiotic dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.AntibioticCode) || string.IsNullOrWhiteSpace(dto.AntibioticName))
            return ServiceOutcome.Bad("Mã và tên kháng sinh là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.LabAntibiotics.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.LabAntibiotics.Add(dto);
        }
        else
        {
            existing.AntibioticCode = dto.AntibioticCode;
            existing.AntibioticName = dto.AntibioticName;
            existing.GenericName = dto.GenericName;
            existing.AtcCode = dto.AtcCode;
            existing.DrugClass = dto.DrugClass;
            existing.Route = dto.Route;
            existing.Notes = dto.Notes;
            existing.SortOrder = dto.SortOrder;
            existing.IsRestricted = dto.IsRestricted;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteAntibioticAsync(Guid id)
    {
        var e = await _db.LabAntibiotics.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 6. LabChemical (Hóa chất tiêu hao theo XN)
    // =====================

    public async Task<ServiceOutcome> GetChemicalsAsync(Guid? serviceId, Guid? supplyId)
    {
        var q = _db.Set<LabChemical>()
            .Include(c => c.Service)
            .Include(c => c.MedicalSupply)
            .AsQueryable();
        if (serviceId.HasValue) q = q.Where(c => c.ServiceId == serviceId.Value);
        if (supplyId.HasValue) q = q.Where(c => c.MedicalSupplyId == supplyId.Value);
        var list = await q.OrderBy(c => c.ServiceId).Take(500).ToListAsync();
        return ServiceOutcome.Ok(list.Select(c => new
        {
            c.Id,
            c.ServiceId,
            ServiceCode = c.Service != null ? c.Service.ServiceCode : null,
            ServiceName = c.Service != null ? c.Service.ServiceName : null,
            c.MedicalSupplyId,
            SupplyCode = c.MedicalSupply != null ? c.MedicalSupply.SupplyCode : null,
            SupplyName = c.MedicalSupply != null ? c.MedicalSupply.SupplyName : null,
            c.QuantityPerTest,
            c.Unit,
            c.ObjectType,
            c.IsActive,
            c.Note,
        }));
    }

    public async Task<ServiceOutcome> SaveChemicalAsync(LabChemical dto, Guid userId)
    {
        if (dto.ServiceId == Guid.Empty || dto.MedicalSupplyId == Guid.Empty)
            return ServiceOutcome.Bad("Phải chọn dịch vụ và vật tư");
        var existing = dto.Id != Guid.Empty ? await _db.Set<LabChemical>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.Set<LabChemical>().Add(dto);
        }
        else
        {
            existing.ServiceId = dto.ServiceId;
            existing.MedicalSupplyId = dto.MedicalSupplyId;
            existing.QuantityPerTest = dto.QuantityPerTest;
            existing.Unit = dto.Unit;
            existing.ObjectType = dto.ObjectType;
            existing.IsActive = dto.IsActive;
            existing.Note = dto.Note;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteChemicalAsync(Guid id)
    {
        var e = await _db.Set<LabChemical>().FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 7. LisTestParameter (Chỉ số XN) — G-22 / G-23
    // =====================

    public async Task<ServiceOutcome> GetTestsAsync(
        string? keyword,
        Guid? groupId,
        bool? isActive)
    {
        var q = _db.LisTestParameters
            .Include(t => t.Group)
            .Include(t => t.Service)
            .Include(t => t.SampleType)
            .AsQueryable();
        if (isActive.HasValue) q = q.Where(t => t.IsActive == isActive.Value);
        if (groupId.HasValue) q = q.Where(t => t.GroupId == groupId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(t => t.Code.Contains(kw) || t.Name.Contains(kw)
                || (t.Hl7Code != null && t.Hl7Code.Contains(kw)));
        }
        var list = await q.OrderBy(t => t.SortOrder).ThenBy(t => t.Code).Take(500).ToListAsync();
        return ServiceOutcome.Ok(list.Select(t => new
        {
            t.Id,
            t.Code,
            t.Name,
            t.Unit,
            t.PrintUnit,
            t.Hl7Code,
            t.GroupId,
            GroupName = t.Group != null ? t.Group.Name : null,
            t.ServiceId,
            ServiceCode = t.Service != null ? t.Service.ServiceCode : null,
            ServiceName = t.Service != null ? t.Service.ServiceName : null,
            t.SampleTypeId,
            SampleTypeName = t.SampleType != null ? t.SampleType.Name : null,
            t.NormalMinMale,
            t.NormalMaxMale,
            t.NormalMinFemale,
            t.NormalMaxFemale,
            t.ReferenceLow,
            t.ReferenceHigh,
            t.CriticalLow,
            t.CriticalHigh,
            t.DataType,
            t.EnumValues,
            t.Description,
            t.SortOrder,
            t.IsActive,
        }));
    }

    public async Task<ServiceOutcome> SaveTestAsync(LisTestParameter dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.Name))
            return ServiceOutcome.Bad("Mã và tên chỉ số là bắt buộc");
        var existing = dto.Id != Guid.Empty ? await _db.LisTestParameters.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true, userId);
            _db.LisTestParameters.Add(dto);
        }
        else
        {
            existing.Code = dto.Code;
            existing.Name = dto.Name;
            existing.Unit = dto.Unit;
            existing.Hl7Code = dto.Hl7Code;
            existing.GroupId = dto.GroupId;
            existing.ServiceId = dto.ServiceId;
            existing.NormalMinMale = dto.NormalMinMale;
            existing.NormalMaxMale = dto.NormalMaxMale;
            existing.NormalMinFemale = dto.NormalMinFemale;
            existing.NormalMaxFemale = dto.NormalMaxFemale;
            existing.ReferenceLow = dto.ReferenceLow;
            existing.ReferenceHigh = dto.ReferenceHigh;
            existing.CriticalLow = dto.CriticalLow;
            existing.CriticalHigh = dto.CriticalHigh;
            existing.DataType = dto.DataType;
            existing.EnumValues = dto.EnumValues;
            existing.SampleTypeId = dto.SampleTypeId;
            existing.PrintUnit = dto.PrintUnit;
            existing.Description = dto.Description;
            existing.SortOrder = dto.SortOrder;
            existing.IsActive = dto.IsActive;
            Stamp(existing, false, userId);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = existing?.Id ?? dto.Id });
    }

    public async Task<ServiceOutcome> DeleteTestAsync(Guid id)
    {
        var e = await _db.LisTestParameters.FindAsync(id);
        if (e == null) return ServiceOutcome.NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }

    // =====================
    // 8. LabSampleType (Loại bệnh phẩm) — read-only catalog endpoint cho form tests
    // =====================

    public async Task<ServiceOutcome> GetSampleTypesAsync(string? keyword, bool? isActive)
    {
        var q = _db.LabSampleTypes.AsQueryable();
        if (isActive.HasValue) q = q.Where(s => s.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(s => s.Code.Contains(kw) || s.Name.Contains(kw));
        }
        return ServiceOutcome.Ok(await q.OrderBy(s => s.Code).Select(s => new { s.Id, s.Code, s.Name, s.IsActive }).ToListAsync());
    }
}
