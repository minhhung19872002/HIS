using HIS.Application.Common;
using HIS.Application.DTOs.PatientFlag;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Cờ cảnh báo bệnh nhân — tách khỏi PatientFlagController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên; return map về ServiceOutcome.
/// </summary>
public class PatientFlagService : IPatientFlagService
{
    private readonly HISDbContext _db;
    public PatientFlagService(HISDbContext db) { _db = db; }

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

    public async Task<ServiceOutcome> ByPatientAsync(Guid patientId)
    {
        var now = DateTime.UtcNow;
        var list = await _db.PatientFlags
            .Include(f => f.CreatedByUser)
            .Where(f => f.PatientId == patientId && f.IsActive
                && (f.ExpiresAt == null || f.ExpiresAt > now))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
        return ServiceOutcome.Ok(list.Select(f => new PatientFlagDto(
            f.Id, f.PatientId, f.FlagType, MapTypeName(f.FlagType),
            f.Color, f.Note, f.IsActive, f.ExpiresAt,
            f.CreatedAt, f.CreatedByUser?.FullName)).ToList());
    }

    public async Task<ServiceOutcome> SaveAsync(SavePatientFlagDto dto, Guid userId)
    {
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
        return ServiceOutcome.Ok(new PatientFlagDto(
            entity.Id, entity.PatientId, entity.FlagType, MapTypeName(entity.FlagType),
            entity.Color, entity.Note, entity.IsActive, entity.ExpiresAt,
            entity.CreatedAt, null));
    }

    public async Task<ServiceOutcome> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.PatientFlags.FirstOrDefaultAsync(f => f.Id == id)
            ?? throw new KeyNotFoundException();
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }
}
