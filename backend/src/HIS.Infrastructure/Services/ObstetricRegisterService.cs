using HIS.Application.DTOs.ObstetricRegister;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// F1.8 #154: Sổ sinh đẻ + Sổ theo dõi nạo phá thai (register pháp lý khoa Sản) + báo cáo BYT.
/// Soft-delete via IsDeleted. CreatedBy/UpdatedBy = string (NVARCHAR, không cần ValueConverter).
/// </summary>
public class ObstetricRegisterService : IObstetricRegisterService
{
    private readonly HISDbContext _db;

    public ObstetricRegisterService(HISDbContext db) => _db = db;

    // ─── Sổ sinh đẻ ────────────────────────────────────────────────────────────

    public async Task<List<BirthRegisterDto>> GetBirthRegistersAsync(DateTime? from, DateTime? to, string? keyword)
    {
        var q = _db.BirthRegisters.Where(b => !b.IsDeleted);
        if (from.HasValue) q = q.Where(b => b.DeliveryDate >= from.Value);
        if (to.HasValue) q = q.Where(b => b.DeliveryDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(b => b.MotherName.Contains(keyword) || (b.MotherIdNumber != null && b.MotherIdNumber.Contains(keyword)));

        var list = await q.OrderByDescending(b => b.DeliveryDate).ThenByDescending(b => b.RegisterNo).ToListAsync();
        return list.Select(MapBirth).ToList();
    }

    public async Task<BirthRegisterDto> SaveBirthRegisterAsync(BirthRegisterDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.MotherName))
            throw new InvalidOperationException("Chua nhap ten san phu.");

        BirthRegister entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new BirthRegister { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.BirthRegisters.Add(entity);
        }
        else
        {
            entity = await _db.BirthRegisters.FirstAsync(b => b.Id == dto.Id);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }

        entity.RegisterNo       = dto.RegisterNo;
        entity.DeliveryDate     = dto.DeliveryDate;
        entity.MotherName       = dto.MotherName;
        entity.MotherAge        = dto.MotherAge;
        entity.MotherIdNumber   = dto.MotherIdNumber;
        entity.MotherAddress    = dto.MotherAddress;
        entity.GestationalWeeks = dto.GestationalWeeks;
        entity.ParaInfo         = dto.ParaInfo;
        entity.DeliveryMethod   = dto.DeliveryMethod;
        entity.BabyCount        = dto.BabyCount <= 0 ? 1 : dto.BabyCount;
        entity.BabyGender       = dto.BabyGender;
        entity.BabyWeight       = dto.BabyWeight;
        entity.BabyCondition    = dto.BabyCondition;
        entity.Attendant        = dto.Attendant;
        entity.Notes            = dto.Notes;

        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteBirthRegisterAsync(Guid id, string? userId)
    {
        var e = await _db.BirthRegisters.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);
        if (e == null) return false;
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Sổ theo dõi nạo phá thai ──────────────────────────────────────────────

    public async Task<List<AbortionRegisterDto>> GetAbortionRegistersAsync(DateTime? from, DateTime? to, string? keyword)
    {
        var q = _db.AbortionRegisters.Where(a => !a.IsDeleted);
        if (from.HasValue) q = q.Where(a => a.ProcedureDate >= from.Value);
        if (to.HasValue) q = q.Where(a => a.ProcedureDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(a => a.PatientName.Contains(keyword) || (a.PatientIdNumber != null && a.PatientIdNumber.Contains(keyword)));

        var list = await q.OrderByDescending(a => a.ProcedureDate).ThenByDescending(a => a.RegisterNo).ToListAsync();
        return list.Select(MapAbortion).ToList();
    }

    public async Task<AbortionRegisterDto> SaveAbortionRegisterAsync(AbortionRegisterDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            throw new InvalidOperationException("Chua nhap ten nguoi benh.");

        AbortionRegister entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new AbortionRegister { CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.AbortionRegisters.Add(entity);
        }
        else
        {
            entity = await _db.AbortionRegisters.FirstAsync(a => a.Id == dto.Id);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }

        entity.RegisterNo       = dto.RegisterNo;
        entity.ProcedureDate    = dto.ProcedureDate;
        entity.PatientName      = dto.PatientName;
        entity.PatientAge       = dto.PatientAge;
        entity.PatientIdNumber  = dto.PatientIdNumber;
        entity.PatientAddress   = dto.PatientAddress;
        entity.GestationalWeeks = dto.GestationalWeeks;
        entity.Method           = dto.Method;
        entity.Reason           = dto.Reason;
        entity.Performer        = dto.Performer;
        entity.Complications    = dto.Complications;
        entity.Notes            = dto.Notes;

        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteAbortionRegisterAsync(Guid id, string? userId)
    {
        var e = await _db.AbortionRegisters.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (e == null) return false;
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Báo cáo BYT ───────────────────────────────────────────────────────────

    public async Task<ObstetricReportDto> GetReportAsync(DateTime from, DateTime to)
    {
        var births = await _db.BirthRegisters.AsNoTracking()
            .Where(b => !b.IsDeleted && b.DeliveryDate >= from && b.DeliveryDate <= to)
            .ToListAsync();
        var abortions = await _db.AbortionRegisters.AsNoTracking()
            .Where(a => !a.IsDeleted && a.ProcedureDate >= from && a.ProcedureDate <= to)
            .ToListAsync();

        var report = new ObstetricReportDto
        {
            From = from,
            To = to,
            TotalDeliveries = births.Count,
            TotalBabies = births.Sum(b => b.BabyCount <= 0 ? 1 : b.BabyCount),
            BabiesAlive = births.Count(b => (b.BabyCondition ?? "").Contains("Sống", StringComparison.OrdinalIgnoreCase)),
            BabiesDead = births.Count(b => (b.BabyCondition ?? "").Contains("Chết", StringComparison.OrdinalIgnoreCase)),
            MaleBabies = births.Count(b => b.BabyGender == 1),
            FemaleBabies = births.Count(b => b.BabyGender == 2),
            DeliveriesByMethod = births
                .GroupBy(b => string.IsNullOrWhiteSpace(b.DeliveryMethod) ? "Khác" : b.DeliveryMethod!)
                .ToDictionary(g => g.Key, g => g.Count()),
            TotalAbortions = abortions.Count,
            AbortionsByMethod = abortions
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Method) ? "Khác" : a.Method!)
                .ToDictionary(g => g.Key, g => g.Count()),
            AbortionComplications = abortions.Count(a => !string.IsNullOrWhiteSpace(a.Complications)),
        };

        return report;
    }

    // ─── Mappers ───────────────────────────────────────────────────────────────

    private static BirthRegisterDto MapBirth(BirthRegister b) => new()
    {
        Id = b.Id,
        RegisterNo = b.RegisterNo,
        DeliveryDate = b.DeliveryDate,
        MotherName = b.MotherName,
        MotherAge = b.MotherAge,
        MotherIdNumber = b.MotherIdNumber,
        MotherAddress = b.MotherAddress,
        GestationalWeeks = b.GestationalWeeks,
        ParaInfo = b.ParaInfo,
        DeliveryMethod = b.DeliveryMethod,
        BabyCount = b.BabyCount,
        BabyGender = b.BabyGender,
        BabyWeight = b.BabyWeight,
        BabyCondition = b.BabyCondition,
        Attendant = b.Attendant,
        Notes = b.Notes,
    };

    private static AbortionRegisterDto MapAbortion(AbortionRegister a) => new()
    {
        Id = a.Id,
        RegisterNo = a.RegisterNo,
        ProcedureDate = a.ProcedureDate,
        PatientName = a.PatientName,
        PatientAge = a.PatientAge,
        PatientIdNumber = a.PatientIdNumber,
        PatientAddress = a.PatientAddress,
        GestationalWeeks = a.GestationalWeeks,
        Method = a.Method,
        Reason = a.Reason,
        Performer = a.Performer,
        Complications = a.Complications,
        Notes = a.Notes,
    };
}
