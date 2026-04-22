using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/patient-flag")]
[Authorize]
public class PatientFlagController : ControllerBase
{
    private readonly HISDbContext _db;

    public PatientFlagController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public record PatientFlagDto(
        Guid Id, Guid PatientId, int FlagType, string FlagTypeName,
        string Color, string Note, bool IsActive, DateTime? ExpiresAt,
        DateTime CreatedAt, string? CreatedByName);

    public record SavePatientFlagDto(
        Guid? Id, Guid PatientId, int FlagType, string Color, string Note, DateTime? ExpiresAt);

    private static string MapTypeName(int t) => t switch
    {
        1 => "Dị ứng nặng",
        2 => "Nợ viện phí",
        3 => "Lạm dụng BHYT",
        4 => "VIP",
        5 => "Nguy cơ tự tử/bạo hành",
        6 => "Bệnh truyền nhiễm",
        _ => "Cảnh báo khác"
    };

    [HttpGet("by-patient/{patientId:guid}")]
    public async Task<ActionResult<List<PatientFlagDto>>> ByPatient(Guid patientId)
    {
        var now = DateTime.UtcNow;
        var list = await _db.PatientFlags
            .Include(f => f.CreatedByUser)
            .Where(f => f.PatientId == patientId && f.IsActive
                && (f.ExpiresAt == null || f.ExpiresAt > now))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
        return Ok(list.Select(f => new PatientFlagDto(
            f.Id, f.PatientId, f.FlagType, MapTypeName(f.FlagType),
            f.Color, f.Note, f.IsActive, f.ExpiresAt,
            f.CreatedAt, f.CreatedByUser?.FullName)));
    }

    [HttpPost]
    public async Task<ActionResult<PatientFlagDto>> Save([FromBody] SavePatientFlagDto dto)
    {
        var userId = GetUserId();
        PatientFlag entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.PatientFlags.FirstOrDefaultAsync(f => f.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId.ToString();
        }
        else
        {
            entity = new PatientFlag
            {
                Id = Guid.NewGuid(),
                PatientId = dto.PatientId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString()
            };
            _db.PatientFlags.Add(entity);
        }
        entity.FlagType = dto.FlagType;
        entity.Color = string.IsNullOrWhiteSpace(dto.Color) ? "red" : dto.Color;
        entity.Note = dto.Note ?? string.Empty;
        entity.ExpiresAt = dto.ExpiresAt;
        entity.IsActive = true;
        await _db.SaveChangesAsync();
        return Ok(new PatientFlagDto(
            entity.Id, entity.PatientId, entity.FlagType, MapTypeName(entity.FlagType),
            entity.Color, entity.Note, entity.IsActive, entity.ExpiresAt,
            entity.CreatedAt, null));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await _db.PatientFlags.FirstOrDefaultAsync(f => f.Id == id)
            ?? throw new KeyNotFoundException();
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
