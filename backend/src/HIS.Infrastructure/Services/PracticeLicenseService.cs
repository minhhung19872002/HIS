using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class PracticeLicenseService : IPracticeLicenseService
{
    private readonly HISDbContext _context;

    public PracticeLicenseService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<PracticeLicenseDto>> SearchLicensesAsync(PracticeLicenseSearchDto? filter = null)
    {
        try
        {
            var query = _context.PracticeLicenses.Where(l => !l.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(l =>
                        l.LicenseCode.ToLower().Contains(kw) ||
                        l.HolderName.ToLower().Contains(kw) ||
                        (l.Cccd != null && l.Cccd.Contains(kw)) ||
                        (l.Specialty != null && l.Specialty.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.LicenseType))
                    query = query.Where(l => l.LicenseType == filter.LicenseType);
                if (filter.Status.HasValue)
                    query = query.Where(l => l.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(l => l.IssueDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(l => l.IssueDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(l => l.CreatedAt)
                .Take(200)
                .Select(l => new PracticeLicenseDto
                {
                    Id = l.Id,
                    LicenseCode = l.LicenseCode,
                    LicenseType = l.LicenseType,
                    HolderName = l.HolderName,
                    DateOfBirth = l.DateOfBirth.HasValue ? l.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Cccd = l.Cccd,
                    Specialty = l.Specialty,
                    IssuingAuthority = l.IssuingAuthority,
                    IssueDate = l.IssueDate.HasValue ? l.IssueDate.Value.ToString("yyyy-MM-dd") : null,
                    ExpiryDate = l.ExpiryDate.HasValue ? l.ExpiryDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = l.Status,
                    FacilityName = l.FacilityName,
                    CertificateNumber = l.CertificateNumber,
                    TrainingInstitution = l.TrainingInstitution,
                    GraduationYear = l.GraduationYear,
                    Notes = l.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<PracticeLicenseDto>(); }
    }

    public async Task<PracticeLicenseDetailDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var l = await _context.PracticeLicenses.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (l == null) return null;

            var now = DateTime.UtcNow;
            int? daysUntilExpiry = l.ExpiryDate.HasValue ? (int)(l.ExpiryDate.Value - now).TotalDays : null;

            return new PracticeLicenseDetailDto
            {
                Id = l.Id,
                LicenseCode = l.LicenseCode,
                LicenseType = l.LicenseType,
                HolderName = l.HolderName,
                DateOfBirth = l.DateOfBirth?.ToString("yyyy-MM-dd"),
                Cccd = l.Cccd,
                Specialty = l.Specialty,
                IssuingAuthority = l.IssuingAuthority,
                IssueDate = l.IssueDate?.ToString("yyyy-MM-dd"),
                ExpiryDate = l.ExpiryDate?.ToString("yyyy-MM-dd"),
                Status = l.Status,
                FacilityId = l.FacilityId,
                FacilityName = l.FacilityName,
                CertificateNumber = l.CertificateNumber,
                TrainingInstitution = l.TrainingInstitution,
                GraduationYear = l.GraduationYear,
                Notes = l.Notes,
                DaysUntilExpiry = daysUntilExpiry,
            };
        }
        catch { return null; }
    }

    public async Task<PracticeLicenseDto> CreateLicenseAsync(CreatePracticeLicenseDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.PracticeLicenses.CountAsync(l => l.CreatedAt.Year == year) + 1;

        var entity = new PracticeLicense
        {
            Id = Guid.NewGuid(),
            LicenseCode = $"CCHN-{year}-{count:D4}",
            LicenseType = dto.LicenseType ?? "doctor",
            HolderName = dto.HolderName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Cccd = dto.Cccd,
            Specialty = dto.Specialty,
            IssuingAuthority = dto.IssuingAuthority,
            IssueDate = DateTime.TryParse(dto.IssueDate, out var isd) ? isd : null,
            ExpiryDate = DateTime.TryParse(dto.ExpiryDate, out var exd) ? exd : null,
            Status = 0,
            FacilityId = dto.FacilityId,
            FacilityName = dto.FacilityName,
            CertificateNumber = dto.CertificateNumber,
            TrainingInstitution = dto.TrainingInstitution,
            GraduationYear = dto.GraduationYear,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PracticeLicenses.Add(entity);
        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status };
    }

    public async Task<PracticeLicenseDto> UpdateLicenseAsync(Guid id, CreatePracticeLicenseDto dto)
    {
        var entity = await _context.PracticeLicenses.FindAsync(id)
            ?? throw new InvalidOperationException("Practice license not found");

        if (dto.LicenseType != null) entity.LicenseType = dto.LicenseType;
        if (dto.HolderName != null) entity.HolderName = dto.HolderName;
        if (dto.Specialty != null) entity.Specialty = dto.Specialty;
        if (dto.IssuingAuthority != null) entity.IssuingAuthority = dto.IssuingAuthority;
        if (DateTime.TryParse(dto.ExpiryDate, out var exd)) entity.ExpiryDate = exd;
        if (dto.FacilityName != null) entity.FacilityName = dto.FacilityName;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status };
    }

    public async Task<List<PracticeLicenseDto>> GetExpiringLicensesAsync(int withinDays = 90)
    {
        try
        {
            var deadline = DateTime.UtcNow.AddDays(withinDays);
            var now = DateTime.UtcNow;

            return await _context.PracticeLicenses
                .Where(l => !l.IsDeleted && l.Status == 0 && l.ExpiryDate.HasValue && l.ExpiryDate.Value <= deadline && l.ExpiryDate.Value >= now)
                .OrderBy(l => l.ExpiryDate)
                .Take(100)
                .Select(l => new PracticeLicenseDto
                {
                    Id = l.Id,
                    LicenseCode = l.LicenseCode,
                    LicenseType = l.LicenseType,
                    HolderName = l.HolderName,
                    Specialty = l.Specialty,
                    ExpiryDate = l.ExpiryDate!.Value.ToString("yyyy-MM-dd"),
                    Status = l.Status,
                })
                .ToListAsync();
        }
        catch { return new List<PracticeLicenseDto>(); }
    }

    public async Task<PracticeLicenseStatsDto> GetStatsAsync()
    {
        try
        {
            var licenses = await _context.PracticeLicenses.Where(l => !l.IsDeleted).ToListAsync();
            var now = DateTime.UtcNow;
            var expiryThreshold = now.AddDays(90);

            return new PracticeLicenseStatsDto
            {
                TotalLicenses = licenses.Count,
                ActiveCount = licenses.Count(l => l.Status == 0),
                ExpiredCount = licenses.Count(l => l.Status == 1),
                ExpiringSoon = licenses.Count(l => l.Status == 0 && l.ExpiryDate.HasValue && l.ExpiryDate.Value <= expiryThreshold && l.ExpiryDate.Value >= now),
                SuspendedCount = licenses.Count(l => l.Status == 2),
                LicenseTypeBreakdown = licenses.GroupBy(l => l.LicenseType)
                    .Select(g => new LicenseTypeBreakdownDto { LicenseType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new PracticeLicenseStatsDto(); }
    }

    public async Task<PracticeLicenseDto> RenewLicenseAsync(Guid id, string? newExpiryDate)
    {
        var entity = await _context.PracticeLicenses.FindAsync(id)
            ?? throw new InvalidOperationException("Practice license not found");

        if (DateTime.TryParse(newExpiryDate, out var exd))
            entity.ExpiryDate = exd;
        else
            entity.ExpiryDate = DateTime.UtcNow.AddYears(5);

        entity.Status = 0; // active
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status, ExpiryDate = entity.ExpiryDate?.ToString("yyyy-MM-dd") };
    }
}
