using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class PublicHealthService : IPublicHealthService
{
    private readonly HISDbContext _context;

    public PublicHealthService(HISDbContext context)
    {
        _context = context;
    }

    // =====================================================================
    // HEALTH CHECKUP
    // =====================================================================

    public async Task<List<HealthCheckupDto>> GetHealthCheckupsAsync(HealthCheckupSearchDto? filter = null)
    {
        var query = _context.HealthCheckups
            .Include(h => h.Patient)
            .Where(h => !h.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(h =>
                    (h.Patient != null && (h.Patient.FullName.ToLower().Contains(kw) || h.Patient.PatientCode.ToLower().Contains(kw))) ||
                    (h.OrganizationName != null && h.OrganizationName.ToLower().Contains(kw)) ||
                    (h.CertificateNumber != null && h.CertificateNumber.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.CheckupType))
                query = query.Where(h => h.CheckupType == filter.CheckupType);
            if (filter.Status.HasValue)
                query = query.Where(h => h.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.BatchCode))
                query = query.Where(h => h.BatchCode == filter.BatchCode);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(h => h.ExamDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(h => h.ExamDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(h => h.ExamDate ?? h.CreatedAt)
            .Skip(skip)
            .Take(pageSize)
            .Select(h => new HealthCheckupDto
            {
                Id = h.Id,
                PatientId = h.PatientId,
                PatientName = h.Patient != null ? h.Patient.FullName : "",
                PatientCode = h.Patient != null ? h.Patient.PatientCode : "",
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
    }

    public async Task<HealthCheckupDetailDto?> GetHealthCheckupByIdAsync(Guid id)
    {
        var h = await _context.HealthCheckups
            .Include(h => h.Patient)
            .FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted);
        if (h == null) return null;

        return new HealthCheckupDetailDto
        {
            Id = h.Id,
            PatientId = h.PatientId,
            PatientName = h.Patient?.FullName ?? "",
            PatientCode = h.Patient?.PatientCode ?? "",
            CheckupType = h.CheckupType,
            FormCode = h.FormCode,
            BatchCode = h.BatchCode,
            OrganizationName = h.OrganizationName,
            Status = h.Status,
            ExamResult = h.ExamResult,
            Classification = h.Classification,
            GeneralConclusion = h.GeneralConclusion,
            InternalMedicine = h.InternalMedicine,
            Surgery = h.Surgery,
            Ophthalmology = h.Ophthalmology,
            ENT = h.ENT,
            Dental = h.Dental,
            Dermatology = h.Dermatology,
            Gynecology = h.Gynecology,
            Psychiatry = h.Psychiatry,
            Height = h.Height,
            Weight = h.Weight,
            BMI = h.BMI,
            BloodPressure = h.BloodPressure,
            HeartRate = h.HeartRate,
            BloodType = h.BloodType,
            VisionLeft = h.VisionLeft,
            VisionRight = h.VisionRight,
            HearingLeft = h.HearingLeft,
            HearingRight = h.HearingRight,
            LabResults = h.LabResults,
            XrayResult = h.XrayResult,
            DoctorName = h.DoctorName,
            ExamDate = h.ExamDate?.ToString("yyyy-MM-dd"),
            CertificateNumber = h.CertificateNumber,
            CertificateDate = h.CertificateDate?.ToString("yyyy-MM-dd"),
            Notes = h.Notes,
            DriverLicenseClass = h.DriverLicenseClass,
            DriverReactionTest = h.DriverReactionTest,
            DriverColorVision = h.DriverColorVision,
            AgeMonths = h.AgeMonths,
            DevelopmentAssessment = h.DevelopmentAssessment,
            NutritionStatus = h.NutritionStatus,
            VaccinationStatus = h.VaccinationStatus,
        };
    }

    public async Task<HealthCheckupDto> CreateHealthCheckupAsync(CreateHealthCheckupDto dto, string? userId)
    {
        var entity = new HealthCheckup
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            CheckupType = dto.CheckupType,
            FormCode = dto.FormCode,
            BatchCode = dto.BatchCode,
            OrganizationName = dto.OrganizationName,
            Status = 0, // Pending
            ExamDate = !string.IsNullOrEmpty(dto.ExamDate) && DateTime.TryParse(dto.ExamDate, out var ed) ? ed : DateTime.UtcNow,
            DoctorName = dto.DoctorName,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };
        _context.HealthCheckups.Add(entity);
        await _context.SaveChangesAsync();

        return new HealthCheckupDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            CheckupType = entity.CheckupType,
            FormCode = entity.FormCode,
            BatchCode = entity.BatchCode,
            OrganizationName = entity.OrganizationName,
            Status = entity.Status,
            ExamDate = entity.ExamDate?.ToString("yyyy-MM-dd"),
            DoctorName = entity.DoctorName,
            Notes = entity.Notes,
        };
    }

    public async Task<HealthCheckupDto> UpdateHealthCheckupAsync(Guid id, UpdateHealthCheckupDto dto)
    {
        var h = await _context.HealthCheckups.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Health checkup not found");

        if (dto.Status.HasValue) h.Status = dto.Status.Value;
        if (dto.ExamResult != null) h.ExamResult = dto.ExamResult;
        if (dto.Classification != null) h.Classification = dto.Classification;
        if (dto.GeneralConclusion != null) h.GeneralConclusion = dto.GeneralConclusion;
        if (dto.InternalMedicine != null) h.InternalMedicine = dto.InternalMedicine;
        if (dto.Surgery != null) h.Surgery = dto.Surgery;
        if (dto.Ophthalmology != null) h.Ophthalmology = dto.Ophthalmology;
        if (dto.ENT != null) h.ENT = dto.ENT;
        if (dto.Dental != null) h.Dental = dto.Dental;
        if (dto.Dermatology != null) h.Dermatology = dto.Dermatology;
        if (dto.Gynecology != null) h.Gynecology = dto.Gynecology;
        if (dto.Psychiatry != null) h.Psychiatry = dto.Psychiatry;
        if (dto.Height.HasValue) h.Height = dto.Height.Value;
        if (dto.Weight.HasValue) h.Weight = dto.Weight.Value;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100f;
            h.BMI = (float)Math.Round(dto.Weight.Value / (heightM * heightM), 1);
        }
        if (dto.BloodPressure != null) h.BloodPressure = dto.BloodPressure;
        if (dto.HeartRate.HasValue) h.HeartRate = dto.HeartRate.Value;
        if (dto.BloodType != null) h.BloodType = dto.BloodType;
        if (dto.VisionLeft != null) h.VisionLeft = dto.VisionLeft;
        if (dto.VisionRight != null) h.VisionRight = dto.VisionRight;
        if (dto.HearingLeft != null) h.HearingLeft = dto.HearingLeft;
        if (dto.HearingRight != null) h.HearingRight = dto.HearingRight;
        if (dto.LabResults != null) h.LabResults = dto.LabResults;
        if (dto.XrayResult != null) h.XrayResult = dto.XrayResult;
        if (dto.CertificateNumber != null) h.CertificateNumber = dto.CertificateNumber;
        if (!string.IsNullOrEmpty(dto.CertificateDate) && DateTime.TryParse(dto.CertificateDate, out var cd))
            h.CertificateDate = cd;
        if (dto.DoctorName != null) h.DoctorName = dto.DoctorName;
        if (dto.Notes != null) h.Notes = dto.Notes;
        if (dto.DriverLicenseClass != null) h.DriverLicenseClass = dto.DriverLicenseClass;
        if (dto.DriverReactionTest != null) h.DriverReactionTest = dto.DriverReactionTest;
        if (dto.DriverColorVision != null) h.DriverColorVision = dto.DriverColorVision;
        if (dto.AgeMonths.HasValue) h.AgeMonths = dto.AgeMonths.Value;
        if (dto.DevelopmentAssessment != null) h.DevelopmentAssessment = dto.DevelopmentAssessment;
        if (dto.NutritionStatus != null) h.NutritionStatus = dto.NutritionStatus;
        if (dto.VaccinationStatus != null) h.VaccinationStatus = dto.VaccinationStatus;
        h.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new HealthCheckupDto
        {
            Id = h.Id,
            PatientId = h.PatientId,
            PatientName = h.Patient?.FullName ?? "",
            PatientCode = h.Patient?.PatientCode ?? "",
            CheckupType = h.CheckupType,
            FormCode = h.FormCode,
            Status = h.Status,
            ExamResult = h.ExamResult,
            Classification = h.Classification,
            ExamDate = h.ExamDate?.ToString("yyyy-MM-dd"),
            DoctorName = h.DoctorName,
        };
    }

    public async Task DeleteHealthCheckupAsync(Guid id)
    {
        var h = await _context.HealthCheckups.FindAsync(id)
            ?? throw new InvalidOperationException("Health checkup not found");
        h.IsDeleted = true;
        h.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<HealthCheckupStatsDto> GetHealthCheckupStatsAsync()
    {
        var items = await _context.HealthCheckups.Where(h => !h.IsDeleted).ToListAsync();
        return new HealthCheckupStatsDto
        {
            TotalCheckups = items.Count,
            PendingCount = items.Count(h => h.Status == 0),
            CompletedCount = items.Count(h => h.Status == 2),
            CancelledCount = items.Count(h => h.Status == 3),
            TypeBreakdown = items.GroupBy(h => h.CheckupType).Select(g => new CheckupTypeBreakdownDto { Type = g.Key, Count = g.Count() }).ToList(),
            ClassificationBreakdown = items.Where(h => !string.IsNullOrEmpty(h.Classification)).GroupBy(h => h.Classification!).Select(g => new ClassificationBreakdownDto { Classification = g.Key, Count = g.Count() }).ToList(),
        };
    }
}
