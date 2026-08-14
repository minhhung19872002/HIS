using HIS.Application.DTOs;
using HIS.Application.DTOs.BhytFullCoverage;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// F3.4: CRUD + lookup cho danh sach BN BHYT chi tra 100% thuoc dac tri.
/// </summary>
public class BhytFullCoverageService : IBhytFullCoverageService
{
    private readonly HISDbContext _db;
    private readonly ILogger<BhytFullCoverageService> _logger;

    public BhytFullCoverageService(HISDbContext db, ILogger<BhytFullCoverageService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PagedResultDto<BhytFullCoveragePatientDto>> SearchAsync(BhytFullCoverageSearchDto dto)
    {
        var page = dto.Page > 0 ? dto.Page : 1;
        var pageSize = dto.PageSize > 0 ? dto.PageSize : 50;

        var q = _db.BhytFullCoveragePatients
            .Include(x => x.Patient)
            .Where(x => !x.IsDeleted);

        if (dto.PatientId.HasValue)
            q = q.Where(x => x.PatientId == dto.PatientId.Value);

        if (dto.IsActive.HasValue)
            q = q.Where(x => x.IsActive == dto.IsActive.Value);

        List<BhytFullCoveragePatient> rows;
        int total;
        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            var candidates = await q.AsNoTracking().ToListAsync();
            var matched = candidates
                .Where(x =>
                    x.Patient.FullName.Contains(kw, StringComparison.OrdinalIgnoreCase)
                    || x.Patient.PatientCode.Contains(kw, StringComparison.OrdinalIgnoreCase)
                    || (x.Patient.InsuranceNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false))
                .OrderByDescending(x => x.CreatedAt)
                .ToList();
            total = matched.Count;
            rows = matched.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        }
        else
        {
            total = await q.CountAsync();
            rows = await q.AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        return new PagedResultDto<BhytFullCoveragePatientDto>
        {
            Items = rows.Select(MapToDto).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BhytFullCoveragePatientDto?> GetByIdAsync(Guid id)
    {
        var x = await _db.BhytFullCoveragePatients
            .Include(e => e.Patient)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        return x == null ? null : MapToDto(x);
    }

    public async Task<BhytFullCoveragePatientDto> CreateAsync(CreateBhytFullCoverageDto dto, Guid userId)
    {
        ValidateDates(dto.EffectiveFrom, dto.EffectiveTo);

        var patient = await _db.Patients.FindAsync(dto.PatientId)
            ?? throw new InvalidOperationException("Khong tim thay benh nhan");

        var entity = new BhytFullCoveragePatient
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            EffectiveFrom = dto.EffectiveFrom.Date,
            EffectiveTo = dto.EffectiveTo.Date,
            MedicineScopeJson = dto.MedicineScopeJson,
            Note = dto.Note,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        _db.BhytFullCoveragePatients.Add(entity);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "BhytFullCoverage created: PatientId={PatientId} From={From} To={To} By={UserId}",
            dto.PatientId, dto.EffectiveFrom, dto.EffectiveTo, userId);

        entity.Patient = patient;
        return MapToDto(entity);
    }

    public async Task<BhytFullCoveragePatientDto> UpdateAsync(Guid id, CreateBhytFullCoverageDto dto, Guid userId)
    {
        ValidateDates(dto.EffectiveFrom, dto.EffectiveTo);

        var entity = await _db.BhytFullCoveragePatients
            .Include(e => e.Patient)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted)
            ?? throw new InvalidOperationException("Ban ghi khong ton tai hoac da bi xoa");

        entity.EffectiveFrom = dto.EffectiveFrom.Date;
        entity.EffectiveTo = dto.EffectiveTo.Date;
        entity.MedicineScopeJson = dto.MedicineScopeJson;
        entity.Note = dto.Note;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();

        await _db.SaveChangesAsync();
        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _db.BhytFullCoveragePatients.FindAsync(id)
            ?? throw new InvalidOperationException("Ban ghi khong ton tai");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsFullCoverageActiveAsync(Guid patientId, DateTime? asOf = null)
    {
        var today = (asOf ?? DateTime.UtcNow).Date;
        return await _db.BhytFullCoveragePatients
            .AnyAsync(x =>
                x.PatientId == patientId
                && x.IsActive
                && !x.IsDeleted
                && x.EffectiveFrom <= today
                && x.EffectiveTo >= today);
    }

    // ── private helpers ──

    private static void ValidateDates(DateTime from, DateTime to)
    {
        if (from.Date > to.Date)
            throw new InvalidOperationException("Ngay hieu luc den phai >= ngay hieu luc tu");
    }

    private static BhytFullCoveragePatientDto MapToDto(BhytFullCoveragePatient x) =>
        new BhytFullCoveragePatientDto
        {
            Id = x.Id,
            PatientId = x.PatientId,
            PatientCode = x.Patient?.PatientCode ?? string.Empty,
            PatientName = x.Patient?.FullName ?? string.Empty,
            InsuranceNumber = x.Patient?.InsuranceNumber ?? string.Empty,
            EffectiveFrom = x.EffectiveFrom,
            EffectiveTo = x.EffectiveTo,
            MedicineScopeJson = x.MedicineScopeJson,
            Note = x.Note,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt,
            CreatedBy = x.CreatedBy
        };
}
