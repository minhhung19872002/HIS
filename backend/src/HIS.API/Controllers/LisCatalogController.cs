using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// LIS admin — 6 danh mục CRUD (N1.10).
/// LabBook / LabBookGroup / LabMeasurementUnit / LabOrganism / LabAntibiotic / LabChemical.
/// </summary>
[ApiController]
[Route("api/lis-catalog")]
[Authorize]
public class LisCatalogController : ControllerBase
{
    private readonly HISDbContext _db;
    public LisCatalogController(HISDbContext db) { _db = db; }

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
    // 1. LabBook (Sổ XN)
    // =====================

    [HttpGet("books")]
    public async Task<IActionResult> GetBooks([FromQuery] string? keyword, [FromQuery] bool? isActive)
    {
        var q = _db.LabBooks.AsQueryable();
        if (isActive.HasValue) q = q.Where(b => b.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(b => b.BookCode.Contains(kw) || b.BookName.Contains(kw));
        }
        return Ok(await q.OrderBy(b => b.SortOrder).ThenBy(b => b.BookName).ToListAsync());
    }

    [HttpPost("books")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveBook([FromBody] LabBook dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BookCode) || string.IsNullOrWhiteSpace(dto.BookName))
            return BadRequest(new { message = "Mã và tên sổ XN là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.LabBooks.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("books/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteBook(Guid id)
    {
        var e = await _db.LabBooks.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 2. LabBookGroup (Nhóm XN / Loại XN)
    // =====================

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups([FromQuery] Guid? labBookId, [FromQuery] string? keyword)
    {
        var q = _db.Set<LabBookGroup>().AsQueryable();
        if (labBookId.HasValue) q = q.Where(g => g.LabBookId == labBookId.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(g => g.GroupCode.Contains(kw) || g.GroupName.Contains(kw));
        }
        return Ok(await q.OrderBy(g => g.LabBookId).ThenBy(g => g.SortOrder).ToListAsync());
    }

    [HttpPost("groups")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveGroup([FromBody] LabBookGroup dto)
    {
        if (string.IsNullOrWhiteSpace(dto.GroupCode) || string.IsNullOrWhiteSpace(dto.GroupName))
            return BadRequest(new { message = "Mã và tên nhóm là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.Set<LabBookGroup>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("groups/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteGroup(Guid id)
    {
        var e = await _db.Set<LabBookGroup>().FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 3. LabMeasurementUnit (Đơn vị đo)
    // =====================

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits([FromQuery] string? keyword, [FromQuery] bool? isActive)
    {
        var q = _db.LabMeasurementUnits.AsQueryable();
        if (isActive.HasValue) q = q.Where(u => u.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(u => u.UnitCode.Contains(kw) || u.UnitName.Contains(kw)
                || (u.UnitSymbol != null && u.UnitSymbol.Contains(kw)));
        }
        return Ok(await q.OrderBy(u => u.SortOrder).ThenBy(u => u.UnitName).ToListAsync());
    }

    [HttpPost("units")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveUnit([FromBody] LabMeasurementUnit dto)
    {
        if (string.IsNullOrWhiteSpace(dto.UnitCode) || string.IsNullOrWhiteSpace(dto.UnitName))
            return BadRequest(new { message = "Mã và tên đơn vị là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.LabMeasurementUnits.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("units/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteUnit(Guid id)
    {
        var e = await _db.LabMeasurementUnits.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 4. LabOrganism (Vi khuẩn)
    // =====================

    [HttpGet("organisms")]
    public async Task<IActionResult> GetOrganisms([FromQuery] string? keyword, [FromQuery] string? category)
    {
        var q = _db.LabOrganisms.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(o => o.Category == category);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(o => o.OrganismCode.Contains(kw) || o.OrganismName.Contains(kw)
                || (o.LatinName != null && o.LatinName.Contains(kw)));
        }
        return Ok(await q.OrderBy(o => o.SortOrder).ThenBy(o => o.OrganismName).ToListAsync());
    }

    [HttpPost("organisms")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveOrganism([FromBody] LabOrganism dto)
    {
        if (string.IsNullOrWhiteSpace(dto.OrganismCode) || string.IsNullOrWhiteSpace(dto.OrganismName))
            return BadRequest(new { message = "Mã và tên vi khuẩn là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.LabOrganisms.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("organisms/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteOrganism(Guid id)
    {
        var e = await _db.LabOrganisms.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 5. LabAntibiotic (Kháng sinh)
    // =====================

    [HttpGet("antibiotics")]
    public async Task<IActionResult> GetAntibiotics([FromQuery] string? keyword, [FromQuery] string? drugClass)
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
        return Ok(await q.OrderBy(a => a.SortOrder).ThenBy(a => a.AntibioticName).ToListAsync());
    }

    [HttpPost("antibiotics")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveAntibiotic([FromBody] LabAntibiotic dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AntibioticCode) || string.IsNullOrWhiteSpace(dto.AntibioticName))
            return BadRequest(new { message = "Mã và tên kháng sinh là bắt buộc" });
        var existing = dto.Id != Guid.Empty ? await _db.LabAntibiotics.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("antibiotics/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteAntibiotic(Guid id)
    {
        var e = await _db.LabAntibiotics.FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =====================
    // 6. LabChemical (Hóa chất tiêu hao theo XN)
    // =====================

    [HttpGet("chemicals")]
    public async Task<IActionResult> GetChemicals([FromQuery] Guid? serviceId, [FromQuery] Guid? supplyId)
    {
        var q = _db.Set<LabChemical>()
            .Include(c => c.Service)
            .Include(c => c.MedicalSupply)
            .AsQueryable();
        if (serviceId.HasValue) q = q.Where(c => c.ServiceId == serviceId.Value);
        if (supplyId.HasValue) q = q.Where(c => c.MedicalSupplyId == supplyId.Value);
        var list = await q.OrderBy(c => c.ServiceId).Take(500).ToListAsync();
        return Ok(list.Select(c => new
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

    [HttpPost("chemicals")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> SaveChemical([FromBody] LabChemical dto)
    {
        if (dto.ServiceId == Guid.Empty || dto.MedicalSupplyId == Guid.Empty)
            return BadRequest(new { message = "Phải chọn dịch vụ và vật tư" });
        var existing = dto.Id != Guid.Empty ? await _db.Set<LabChemical>().FindAsync(dto.Id) : null;
        if (existing == null)
        {
            Stamp(dto, true);
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
            Stamp(existing, false);
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpDelete("chemicals/{id:guid}")]
    [Authorize(Roles = "Admin,LabManager")]
    public async Task<IActionResult> DeleteChemical(Guid id)
    {
        var e = await _db.Set<LabChemical>().FindAsync(id);
        if (e == null) return NotFound();
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
