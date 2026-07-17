using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu HealthCheckupService.cs — F10.5 KSK chuyen biet CRUD (~337 dong).
public partial class HealthCheckupService
{
    // ---- F10.5: KSK chuyen biet CRUD ----

    public async Task<HealthCheckupPagedResult> GetCheckupsAsync(HealthCheckupSearchDto filter)
    {
        var query = _context.HealthCheckups
            .Where(h => !h.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(h =>
                (h.DoctorName != null && h.DoctorName.ToLower().Contains(kw)) ||
                (h.Notes != null && h.Notes.ToLower().Contains(kw)) ||
                (h.FormCode.ToLower().Contains(kw)) ||
                (h.CheckupType.ToLower().Contains(kw)));
        }

        if (!string.IsNullOrWhiteSpace(filter.CheckupType))
            query = query.Where(h => h.CheckupType == filter.CheckupType.Trim());

        if (filter.Status.HasValue)
            query = query.Where(h => h.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.BatchCode))
            query = query.Where(h => h.BatchCode == filter.BatchCode.Trim());

        if (!string.IsNullOrWhiteSpace(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
            query = query.Where(h => h.ExamDate >= from);

        if (!string.IsNullOrWhiteSpace(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
            query = query.Where(h => h.ExamDate <= to.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(h => h.Patient)
            .OrderByDescending(h => h.ExamDate)
            .ThenByDescending(h => h.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(h => new HealthCheckupDto
            {
                Id = h.Id,
                PatientId = h.PatientId,
                PatientName = h.Patient != null ? h.Patient.FullName : null,
                PatientCode = h.Patient != null ? h.Patient.PatientCode : null,
                CheckupType = h.CheckupType,
                FormCode = h.FormCode,
                BatchCode = h.BatchCode,
                OrganizationName = h.OrganizationName,
                Status = h.Status,
                ExamResult = h.ExamResult,
                Classification = h.Classification,
                GeneralConclusion = h.GeneralConclusion,
                Height = h.Height,
                Weight = h.Weight,
                BMI = h.BMI,
                BloodPressure = h.BloodPressure,
                HeartRate = h.HeartRate,
                DoctorName = h.DoctorName,
                ExamDate = h.ExamDate.HasValue ? h.ExamDate.Value.ToString("yyyy-MM-dd") : null,
                CertificateNumber = h.CertificateNumber,
                Notes = h.Notes,
            })
            .ToListAsync();

        return new HealthCheckupPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<HealthCheckupDetailDto?> GetCheckupByIdAsync(Guid id)
    {
        var h = await _context.HealthCheckups
            .Where(x => x.Id == id && !x.IsDeleted)
            .Include(x => x.Patient)
            .FirstOrDefaultAsync();

        if (h == null) return null;

        return MapToDetailDto(h);
    }

    public async Task<HealthCheckupDetailDto> CreateCheckupAsync(CreateHealthCheckupDto dto, string userId)
    {
        var bmi = (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
            ? (float?)(dto.Weight.Value / (dto.Height.Value / 100f * (dto.Height.Value / 100f)))
            : null;

        var entity = new HIS.Core.Entities.HealthCheckup
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            CheckupType = dto.CheckupType,
            FormCode = dto.FormCode,
            BatchCode = dto.BatchCode,
            OrganizationName = dto.OrganizationName,
            Status = 0, // Pending
            ExamDate = string.IsNullOrWhiteSpace(dto.ExamDate) ? null : DateTime.TryParse(dto.ExamDate, out var ed) ? ed : null,
            DoctorName = dto.DoctorName,
            Notes = dto.Notes,
            Classification = dto.Classification,
            GeneralConclusion = dto.GeneralConclusion,
            ExamResult = dto.ExamResult,
            Height = dto.Height,
            Weight = dto.Weight,
            BMI = bmi,
            BloodPressure = dto.BloodPressure,
            HeartRate = dto.HeartRate,
            BloodType = dto.BloodType,
            VisionLeft = dto.VisionLeft,
            VisionRight = dto.VisionRight,
            HearingLeft = dto.HearingLeft,
            HearingRight = dto.HearingRight,
            InternalMedicine = dto.InternalMedicine,
            Surgery = dto.Surgery,
            Ophthalmology = dto.Ophthalmology,
            ENT = dto.ENT,
            Dental = dto.Dental,
            Dermatology = dto.Dermatology,
            Gynecology = dto.Gynecology,
            Psychiatry = dto.Psychiatry,
            LabResults = dto.LabResults,
            XrayResult = dto.XrayResult,
            CertificateNumber = dto.CertificateNumber,
            CertificateDate = string.IsNullOrWhiteSpace(dto.CertificateDate) ? null : DateTime.TryParse(dto.CertificateDate, out var cd) ? cd : null,
            // Driver-specific
            DriverLicenseClass = dto.DriverLicenseClass,
            DriverReactionTest = dto.DriverReactionTest,
            DriverColorVision = dto.DriverColorVision,
            // Child-specific
            AgeMonths = dto.AgeMonths,
            DevelopmentAssessment = dto.DevelopmentAssessment,
            NutritionStatus = dto.NutritionStatus,
            VaccinationStatus = dto.VaccinationStatus,
            // VSATTP-specific
            FoodHandlerRole = dto.FoodHandlerRole,
            FoodSafetyConclusion = dto.FoodSafetyConclusion,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        await _context.HealthCheckups.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        // Reload with patient
        var created = await _context.HealthCheckups
            .Where(x => x.Id == entity.Id)
            .Include(x => x.Patient)
            .FirstOrDefaultAsync();

        return MapToDetailDto(created ?? entity);
    }

    public async Task<HealthCheckupDetailDto> UpdateCheckupAsync(Guid id, UpdateHealthCheckupDto dto, string userId)
    {
        var entity = await _context.HealthCheckups
            .Where(x => x.Id == id && !x.IsDeleted)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException($"HealthCheckup {id} khong ton tai");

        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.ExamResult != null) entity.ExamResult = dto.ExamResult;
        if (dto.Classification != null) entity.Classification = dto.Classification;
        if (dto.GeneralConclusion != null) entity.GeneralConclusion = dto.GeneralConclusion;
        if (dto.InternalMedicine != null) entity.InternalMedicine = dto.InternalMedicine;
        if (dto.Surgery != null) entity.Surgery = dto.Surgery;
        if (dto.Ophthalmology != null) entity.Ophthalmology = dto.Ophthalmology;
        if (dto.ENT != null) entity.ENT = dto.ENT;
        if (dto.Dental != null) entity.Dental = dto.Dental;
        if (dto.Dermatology != null) entity.Dermatology = dto.Dermatology;
        if (dto.Gynecology != null) entity.Gynecology = dto.Gynecology;
        if (dto.Psychiatry != null) entity.Psychiatry = dto.Psychiatry;
        if (dto.Height.HasValue) entity.Height = dto.Height;
        if (dto.Weight.HasValue)
        {
            entity.Weight = dto.Weight;
            if (dto.Height.HasValue && dto.Height.Value > 0)
                entity.BMI = dto.Weight.Value / (dto.Height.Value / 100f * (dto.Height.Value / 100f));
        }
        if (dto.BloodPressure != null) entity.BloodPressure = dto.BloodPressure;
        if (dto.HeartRate.HasValue) entity.HeartRate = dto.HeartRate;
        if (dto.BloodType != null) entity.BloodType = dto.BloodType;
        if (dto.VisionLeft != null) entity.VisionLeft = dto.VisionLeft;
        if (dto.VisionRight != null) entity.VisionRight = dto.VisionRight;
        if (dto.HearingLeft != null) entity.HearingLeft = dto.HearingLeft;
        if (dto.HearingRight != null) entity.HearingRight = dto.HearingRight;
        if (dto.LabResults != null) entity.LabResults = dto.LabResults;
        if (dto.XrayResult != null) entity.XrayResult = dto.XrayResult;
        if (dto.CertificateNumber != null) entity.CertificateNumber = dto.CertificateNumber;
        if (!string.IsNullOrWhiteSpace(dto.CertificateDate) && DateTime.TryParse(dto.CertificateDate, out var cdp))
            entity.CertificateDate = cdp;
        if (dto.DoctorName != null) entity.DoctorName = dto.DoctorName;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        // Driver-specific
        if (dto.DriverLicenseClass != null) entity.DriverLicenseClass = dto.DriverLicenseClass;
        if (dto.DriverReactionTest != null) entity.DriverReactionTest = dto.DriverReactionTest;
        if (dto.DriverColorVision != null) entity.DriverColorVision = dto.DriverColorVision;
        // Child-specific
        if (dto.AgeMonths.HasValue) entity.AgeMonths = dto.AgeMonths;
        if (dto.DevelopmentAssessment != null) entity.DevelopmentAssessment = dto.DevelopmentAssessment;
        if (dto.NutritionStatus != null) entity.NutritionStatus = dto.NutritionStatus;
        if (dto.VaccinationStatus != null) entity.VaccinationStatus = dto.VaccinationStatus;
        // VSATTP-specific
        if (dto.FoodHandlerRole != null) entity.FoodHandlerRole = dto.FoodHandlerRole;
        if (dto.FoodSafetyConclusion != null) entity.FoodSafetyConclusion = dto.FoodSafetyConclusion;

        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _unitOfWork.SaveChangesAsync();

        var updated = await _context.HealthCheckups
            .Where(x => x.Id == entity.Id)
            .Include(x => x.Patient)
            .FirstOrDefaultAsync();

        return MapToDetailDto(updated ?? entity);
    }

    public async Task DeleteCheckupAsync(Guid id)
    {
        var entity = await _context.HealthCheckups
            .Where(x => x.Id == id && !x.IsDeleted)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException($"HealthCheckup {id} khong ton tai");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    public Task<List<CheckupTypeDto>> GetCheckupTypesAsync()
    {
        var types = new List<CheckupTypeDto>
        {
            new() { Code = "General18", Name = "Tong quat >= 18 tuoi", FormCode = "Mau01" },
            new() { Code = "Under18", Name = "Tong quat < 18 tuoi", FormCode = "Mau02" },
            new() { Code = "Periodic", Name = "Dinh ky", FormCode = "Mau03" },
            new() { Code = "Driver", Name = "Lai xe", FormCode = "TT36", Description = "TT 36/2021/TT-BYT" },
            new() { Code = "Student", Name = "Di hoc", FormCode = "TT14", Description = "TT 14/2013/TT-BYT" },
            new() { Code = "FoodSafety", Name = "VSATTP", FormCode = "TT15", Description = "TT 15/2012/TT-BYT" },
            new() { Code = "Elderly", Name = "Nguoi cao tuoi", FormCode = "PL1" },
            new() { Code = "Occupational", Name = "Nghe nghiep", FormCode = "PL6" },
            new() { Code = "ChildUnder24m", Name = "Tre < 24 thang", FormCode = "PL2" },
        };
        return Task.FromResult(types);
    }

    public async Task<HealthCheckupStatsDto> GetCheckupStatisticsAsync()
    {
        var query = _context.HealthCheckups.Where(h => !h.IsDeleted);
        var total = await query.CountAsync();

        var typeBreakdown = await query
            .GroupBy(h => h.CheckupType)
            .Select(g => new CheckupTypeBreakdownDto { Type = g.Key, Count = g.Count() })
            .ToListAsync();

        var classBreakdown = await query
            .Where(h => h.Classification != null)
            .GroupBy(h => h.Classification!)
            .Select(g => new ClassificationBreakdownDto { Classification = g.Key, Count = g.Count() })
            .ToListAsync();

        return new HealthCheckupStatsDto
        {
            TotalCheckups = total,
            PendingCount = await query.CountAsync(h => h.Status == 0),
            CompletedCount = await query.CountAsync(h => h.Status == 2),
            CancelledCount = await query.CountAsync(h => h.Status == 3),
            TypeBreakdown = typeBreakdown,
            ClassificationBreakdown = classBreakdown,
        };
    }

    private static HealthCheckupDetailDto MapToDetailDto(HIS.Core.Entities.HealthCheckup h)
    {
        return new HealthCheckupDetailDto
        {
            Id = h.Id,
            PatientId = h.PatientId,
            PatientName = h.Patient?.FullName,
            PatientCode = h.Patient?.PatientCode,
            CheckupType = h.CheckupType,
            FormCode = h.FormCode,
            BatchCode = h.BatchCode,
            OrganizationName = h.OrganizationName,
            Status = h.Status,
            ExamResult = h.ExamResult,
            Classification = h.Classification,
            GeneralConclusion = h.GeneralConclusion,
            Height = h.Height,
            Weight = h.Weight,
            BMI = h.BMI,
            BloodPressure = h.BloodPressure,
            HeartRate = h.HeartRate,
            DoctorName = h.DoctorName,
            ExamDate = h.ExamDate.HasValue ? h.ExamDate.Value.ToString("yyyy-MM-dd") : null,
            CertificateNumber = h.CertificateNumber,
            Notes = h.Notes,
            // Detail fields
            InternalMedicine = h.InternalMedicine,
            Surgery = h.Surgery,
            Ophthalmology = h.Ophthalmology,
            ENT = h.ENT,
            Dental = h.Dental,
            Dermatology = h.Dermatology,
            Gynecology = h.Gynecology,
            Psychiatry = h.Psychiatry,
            BloodType = h.BloodType,
            VisionLeft = h.VisionLeft,
            VisionRight = h.VisionRight,
            HearingLeft = h.HearingLeft,
            HearingRight = h.HearingRight,
            LabResults = h.LabResults,
            XrayResult = h.XrayResult,
            CertificateDate = h.CertificateDate.HasValue ? h.CertificateDate.Value.ToString("yyyy-MM-dd") : null,
            // Driver-specific
            DriverLicenseClass = h.DriverLicenseClass,
            DriverReactionTest = h.DriverReactionTest,
            DriverColorVision = h.DriverColorVision,
            // Child-specific
            AgeMonths = h.AgeMonths,
            DevelopmentAssessment = h.DevelopmentAssessment,
            NutritionStatus = h.NutritionStatus,
            VaccinationStatus = h.VaccinationStatus,
            // VSATTP-specific
            FoodHandlerRole = h.FoodHandlerRole,
            FoodSafetyConclusion = h.FoodSafetyConclusion,
        };
    }
}
