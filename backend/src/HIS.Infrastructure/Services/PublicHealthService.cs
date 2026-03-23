using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class PublicHealthService : IPublicHealthService
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

    public async Task<HealthCheckupDto> CreateHealthCheckupAsync(CreateHealthCheckupDto dto)
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

    // =====================================================================
    // VACCINATION
    // =====================================================================

    public async Task<List<VaccinationRecordDto>> GetVaccinationRecordsAsync(VaccinationSearchDto? filter = null)
    {
        var query = _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => !v.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(v =>
                    v.VaccineName.ToLower().Contains(kw) ||
                    (v.Patient != null && (v.Patient.FullName.ToLower().Contains(kw) || v.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (filter.Status.HasValue)
                query = query.Where(v => v.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.VaccineName))
                query = query.Where(v => v.VaccineName == filter.VaccineName);
            if (!string.IsNullOrEmpty(filter.CampaignCode))
                query = query.Where(v => v.CampaignCode == filter.CampaignCode);
            if (filter.IsEPI.HasValue)
                query = query.Where(v => v.IsEPI == filter.IsEPI.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(v => v.VaccinationDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(v => v.VaccinationDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(v => v.VaccinationDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(v => MapVaccinationDto(v))
            .ToListAsync();
    }

    public async Task<VaccinationRecordDto?> GetVaccinationRecordByIdAsync(Guid id)
    {
        var v = await _context.VaccinationRecords
            .Include(v => v.Patient)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
        return v == null ? null : MapVaccinationDto(v);
    }

    public async Task<VaccinationRecordDto> RecordVaccinationAsync(CreateVaccinationRecordDto dto)
    {
        var entity = new VaccinationRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            VaccineName = dto.VaccineName,
            VaccineCode = dto.VaccineCode,
            LotNumber = dto.LotNumber,
            Manufacturer = dto.Manufacturer,
            VaccinationDate = !string.IsNullOrEmpty(dto.VaccinationDate) && DateTime.TryParse(dto.VaccinationDate, out var vd) ? vd : DateTime.UtcNow,
            DoseNumber = dto.DoseNumber,
            InjectionSite = dto.InjectionSite,
            Route = dto.Route,
            DoseMl = dto.DoseMl,
            AdministeredBy = dto.AdministeredBy,
            FacilityName = dto.FacilityName,
            Status = 1, // Completed
            NextDoseDate = !string.IsNullOrEmpty(dto.NextDoseDate) && DateTime.TryParse(dto.NextDoseDate, out var nd) ? nd : null,
            CampaignCode = dto.CampaignCode,
            IsEPI = dto.IsEPI,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.VaccinationRecords.Add(entity);

        // Update campaign completed count if linked
        if (!string.IsNullOrEmpty(dto.CampaignCode))
        {
            var campaign = await _context.VaccinationCampaigns
                .FirstOrDefaultAsync(c => c.CampaignCode == dto.CampaignCode && !c.IsDeleted);
            if (campaign != null)
            {
                campaign.CompletedCount++;
                campaign.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return MapVaccinationDto(entity);
    }

    public async Task<VaccinationRecordDto> UpdateVaccinationRecordAsync(Guid id, UpdateVaccinationRecordDto dto)
    {
        var v = await _context.VaccinationRecords.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Vaccination record not found");
        if (dto.Status.HasValue) v.Status = dto.Status.Value;
        if (dto.AefiReport != null) v.AefiReport = dto.AefiReport;
        if (dto.AefiSeverity.HasValue) v.AefiSeverity = dto.AefiSeverity.Value;
        if (!string.IsNullOrEmpty(dto.NextDoseDate) && DateTime.TryParse(dto.NextDoseDate, out var nd))
            v.NextDoseDate = nd;
        if (dto.Notes != null) v.Notes = dto.Notes;
        v.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapVaccinationDto(v);
    }

    public async Task DeleteVaccinationRecordAsync(Guid id)
    {
        var v = await _context.VaccinationRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Vaccination record not found");
        v.IsDeleted = true;
        v.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<VaccinationScheduleDto>> GetVaccinationScheduleAsync(Guid patientId)
    {
        return await _context.VaccinationRecords
            .Include(v => v.Patient)
            .Where(v => v.PatientId == patientId && !v.IsDeleted && v.Status == 0 && v.NextDoseDate != null)
            .OrderBy(v => v.NextDoseDate)
            .Select(v => new VaccinationScheduleDto
            {
                PatientId = v.PatientId,
                PatientName = v.Patient != null ? v.Patient.FullName : "",
                VaccineName = v.VaccineName,
                DoseNumber = v.DoseNumber + 1,
                ScheduledDate = v.NextDoseDate!.Value.ToString("yyyy-MM-dd"),
                Status = v.NextDoseDate.Value < DateTime.UtcNow ? 2 : 0,
            })
            .ToListAsync();
    }

    public async Task<List<VaccinationCampaignDto>> GetVaccinationCampaignsAsync()
    {
        return await _context.VaccinationCampaigns
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.StartDate)
            .Select(c => new VaccinationCampaignDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                VaccineName = c.VaccineName,
                StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                EndDate = c.EndDate.ToString("yyyy-MM-dd"),
                TargetGroup = c.TargetGroup,
                TargetCount = c.TargetCount,
                CompletedCount = c.CompletedCount,
                Status = c.Status,
                Description = c.Description,
                Areas = c.Areas,
            })
            .ToListAsync();
    }

    public async Task<VaccinationCampaignDto> CreateVaccinationCampaignAsync(CreateVaccinationCampaignDto dto)
    {
        var entity = new VaccinationCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = dto.CampaignCode,
            CampaignName = dto.CampaignName,
            VaccineName = dto.VaccineName,
            StartDate = !string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var sd) ? sd : DateTime.UtcNow,
            EndDate = !string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var ed) ? ed : DateTime.UtcNow.AddMonths(3),
            TargetGroup = dto.TargetGroup,
            TargetCount = dto.TargetCount,
            CompletedCount = 0,
            Status = 0, // Planning
            Description = dto.Description,
            Areas = dto.Areas,
            CreatedAt = DateTime.UtcNow,
        };
        _context.VaccinationCampaigns.Add(entity);
        await _context.SaveChangesAsync();

        return new VaccinationCampaignDto
        {
            Id = entity.Id,
            CampaignCode = entity.CampaignCode,
            CampaignName = entity.CampaignName,
            VaccineName = entity.VaccineName,
            StartDate = entity.StartDate.ToString("yyyy-MM-dd"),
            EndDate = entity.EndDate.ToString("yyyy-MM-dd"),
            TargetGroup = entity.TargetGroup,
            TargetCount = entity.TargetCount,
            CompletedCount = entity.CompletedCount,
            Status = entity.Status,
            Description = entity.Description,
            Areas = entity.Areas,
        };
    }

    public async Task<VaccinationStatsDto> GetVaccinationStatsAsync()
    {
        var records = await _context.VaccinationRecords.Where(v => !v.IsDeleted).ToListAsync();
        var campaigns = await _context.VaccinationCampaigns.Where(c => !c.IsDeleted && c.Status == 1).CountAsync();

        return new VaccinationStatsDto
        {
            TotalRecords = records.Count,
            CompletedCount = records.Count(v => v.Status == 1),
            ScheduledCount = records.Count(v => v.Status == 0),
            MissedCount = records.Count(v => v.Status == 2),
            AefiCount = records.Count(v => v.AefiSeverity.HasValue && v.AefiSeverity.Value > 0),
            EPICount = records.Count(v => v.IsEPI),
            ActiveCampaigns = campaigns,
            VaccineBreakdown = records.GroupBy(v => v.VaccineName).Select(g => new VaccineBreakdownDto { VaccineName = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(10).ToList(),
        };
    }

    // =====================================================================
    // DISEASE SURVEILLANCE
    // =====================================================================

    public async Task<List<DiseaseReportDto>> GetDiseaseReportsAsync(DiseaseReportSearchDto? filter = null)
    {
        var query = _context.DiseaseReports
            .Where(d => !d.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(d =>
                    d.PatientName.ToLower().Contains(kw) ||
                    d.DiseaseName.ToLower().Contains(kw) ||
                    d.DiseaseCode.ToLower().Contains(kw)
                );
            }
            if (filter.Status.HasValue)
                query = query.Where(d => d.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.DiseaseGroup))
                query = query.Where(d => d.DiseaseGroup == filter.DiseaseGroup);
            if (filter.IsNotifiable.HasValue)
                query = query.Where(d => d.IsNotifiable == filter.IsNotifiable.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(d => d.ReportDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(d => d.ReportDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(d => d.ReportDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(d => new DiseaseReportDto
            {
                Id = d.Id,
                PatientId = d.PatientId,
                PatientName = d.PatientName,
                PatientAge = d.PatientAge,
                PatientGender = d.PatientGender,
                PatientAddress = d.PatientAddress,
                DiseaseCode = d.DiseaseCode,
                DiseaseName = d.DiseaseName,
                DiseaseGroup = d.DiseaseGroup,
                OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
                ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
                DiagnosisDate = d.DiagnosisDate.HasValue ? d.DiagnosisDate.Value.ToString("yyyy-MM-dd") : null,
                ReportedBy = d.ReportedBy,
                FacilityName = d.FacilityName,
                Status = d.Status,
                IsNotifiable = d.IsNotifiable,
                Outcome = d.Outcome,
                QuarantineStatus = d.QuarantineStatus,
                ContactCount = d.ContactCount,
                Notes = d.Notes,
            })
            .ToListAsync();
    }

    public async Task<DiseaseReportDetailDto?> GetDiseaseReportByIdAsync(Guid id)
    {
        var d = await _context.DiseaseReports.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (d == null) return null;

        return new DiseaseReportDetailDto
        {
            Id = d.Id,
            PatientId = d.PatientId,
            PatientName = d.PatientName,
            PatientAge = d.PatientAge,
            PatientGender = d.PatientGender,
            PatientAddress = d.PatientAddress,
            DiseaseCode = d.DiseaseCode,
            DiseaseName = d.DiseaseName,
            DiseaseGroup = d.DiseaseGroup,
            OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
            DiagnosisDate = d.DiagnosisDate?.ToString("yyyy-MM-dd"),
            ReportedBy = d.ReportedBy,
            FacilityName = d.FacilityName,
            Status = d.Status,
            IsNotifiable = d.IsNotifiable,
            Outcome = d.Outcome,
            QuarantineStatus = d.QuarantineStatus,
            ContactCount = d.ContactCount,
            ContactTracingNotes = d.ContactTracingNotes,
            TravelHistory = d.TravelHistory,
            ExposureSource = d.ExposureSource,
            LabConfirmation = d.LabConfirmation,
            Notes = d.Notes,
        };
    }

    public async Task<DiseaseReportDto> ReportDiseaseAsync(CreateDiseaseReportDto dto)
    {
        var entity = new DiseaseReport
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientAge = dto.PatientAge,
            PatientGender = dto.PatientGender,
            PatientAddress = dto.PatientAddress,
            DiseaseCode = dto.DiseaseCode,
            DiseaseName = dto.DiseaseName,
            DiseaseGroup = dto.DiseaseGroup,
            OnsetDate = !string.IsNullOrEmpty(dto.OnsetDate) && DateTime.TryParse(dto.OnsetDate, out var od) ? od : DateTime.UtcNow,
            ReportDate = DateTime.UtcNow,
            IsNotifiable = dto.IsNotifiable,
            ReportedBy = dto.ReportedBy,
            FacilityName = dto.FacilityName,
            Status = 0, // Reported
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.DiseaseReports.Add(entity);
        await _context.SaveChangesAsync();

        return new DiseaseReportDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            DiseaseCode = entity.DiseaseCode,
            DiseaseName = entity.DiseaseName,
            DiseaseGroup = entity.DiseaseGroup,
            OnsetDate = entity.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = entity.ReportDate.ToString("yyyy-MM-dd"),
            Status = entity.Status,
            IsNotifiable = entity.IsNotifiable,
        };
    }

    public async Task<DiseaseReportDto> UpdateDiseaseReportAsync(Guid id, UpdateDiseaseReportDto dto)
    {
        var d = await _context.DiseaseReports.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Disease report not found");
        if (dto.Status.HasValue) d.Status = dto.Status.Value;
        if (dto.Outcome != null) d.Outcome = dto.Outcome;
        if (dto.QuarantineStatus != null) d.QuarantineStatus = dto.QuarantineStatus;
        if (dto.ContactTracingNotes != null) d.ContactTracingNotes = dto.ContactTracingNotes;
        if (dto.ContactCount.HasValue) d.ContactCount = dto.ContactCount.Value;
        if (dto.TravelHistory != null) d.TravelHistory = dto.TravelHistory;
        if (dto.ExposureSource != null) d.ExposureSource = dto.ExposureSource;
        if (dto.LabConfirmation != null) d.LabConfirmation = dto.LabConfirmation;
        if (!string.IsNullOrEmpty(dto.DiagnosisDate) && DateTime.TryParse(dto.DiagnosisDate, out var dd))
            d.DiagnosisDate = dd;
        if (dto.Notes != null) d.Notes = dto.Notes;
        d.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new DiseaseReportDto
        {
            Id = d.Id,
            PatientName = d.PatientName,
            DiseaseCode = d.DiseaseCode,
            DiseaseName = d.DiseaseName,
            DiseaseGroup = d.DiseaseGroup,
            OnsetDate = d.OnsetDate.ToString("yyyy-MM-dd"),
            ReportDate = d.ReportDate.ToString("yyyy-MM-dd"),
            Status = d.Status,
            IsNotifiable = d.IsNotifiable,
            Outcome = d.Outcome,
        };
    }

    public async Task DeleteDiseaseReportAsync(Guid id)
    {
        var d = await _context.DiseaseReports.FindAsync(id)
            ?? throw new InvalidOperationException("Disease report not found");
        d.IsDeleted = true;
        d.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<OutbreakEventDto>> GetOutbreakEventsAsync()
    {
        return await _context.OutbreakEvents
            .Where(o => !o.IsDeleted)
            .OrderByDescending(o => o.DetectedDate)
            .Select(o => new OutbreakEventDto
            {
                Id = o.Id,
                OutbreakCode = o.OutbreakCode,
                DiseaseName = o.DiseaseName,
                DiseaseCode = o.DiseaseCode,
                DetectedDate = o.DetectedDate.ToString("yyyy-MM-dd"),
                ResolvedDate = o.ResolvedDate.HasValue ? o.ResolvedDate.Value.ToString("yyyy-MM-dd") : null,
                Location = o.Location,
                AffectedArea = o.AffectedArea,
                CaseCount = o.CaseCount,
                DeathCount = o.DeathCount,
                Status = o.Status,
                ResponseActions = o.ResponseActions,
                RiskLevel = o.RiskLevel,
                Notes = o.Notes,
            })
            .ToListAsync();
    }

    public async Task<OutbreakEventDto> CreateOutbreakEventAsync(CreateOutbreakEventDto dto)
    {
        var entity = new OutbreakEvent
        {
            Id = Guid.NewGuid(),
            OutbreakCode = dto.OutbreakCode,
            DiseaseName = dto.DiseaseName,
            DiseaseCode = dto.DiseaseCode,
            DetectedDate = !string.IsNullOrEmpty(dto.DetectedDate) && DateTime.TryParse(dto.DetectedDate, out var dd) ? dd : DateTime.UtcNow,
            Location = dto.Location,
            AffectedArea = dto.AffectedArea,
            RiskLevel = dto.RiskLevel,
            Status = 0, // Detected
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.OutbreakEvents.Add(entity);
        await _context.SaveChangesAsync();

        return new OutbreakEventDto
        {
            Id = entity.Id,
            OutbreakCode = entity.OutbreakCode,
            DiseaseName = entity.DiseaseName,
            DiseaseCode = entity.DiseaseCode,
            DetectedDate = entity.DetectedDate.ToString("yyyy-MM-dd"),
            Location = entity.Location,
            Status = entity.Status,
            RiskLevel = entity.RiskLevel,
        };
    }

    public async Task<OutbreakEventDto> UpdateOutbreakEventAsync(Guid id, UpdateOutbreakEventDto dto)
    {
        var o = await _context.OutbreakEvents.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Outbreak event not found");
        if (dto.Status.HasValue) o.Status = dto.Status.Value;
        if (dto.CaseCount.HasValue) o.CaseCount = dto.CaseCount.Value;
        if (dto.DeathCount.HasValue) o.DeathCount = dto.DeathCount.Value;
        if (dto.ResponseActions != null) o.ResponseActions = dto.ResponseActions;
        if (dto.RiskLevel != null) o.RiskLevel = dto.RiskLevel;
        if (!string.IsNullOrEmpty(dto.ResolvedDate) && DateTime.TryParse(dto.ResolvedDate, out var rd))
            o.ResolvedDate = rd;
        if (dto.Notes != null) o.Notes = dto.Notes;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new OutbreakEventDto
        {
            Id = o.Id,
            OutbreakCode = o.OutbreakCode,
            DiseaseName = o.DiseaseName,
            DiseaseCode = o.DiseaseCode,
            DetectedDate = o.DetectedDate.ToString("yyyy-MM-dd"),
            ResolvedDate = o.ResolvedDate?.ToString("yyyy-MM-dd"),
            Location = o.Location,
            AffectedArea = o.AffectedArea,
            CaseCount = o.CaseCount,
            DeathCount = o.DeathCount,
            Status = o.Status,
            ResponseActions = o.ResponseActions,
            RiskLevel = o.RiskLevel,
            Notes = o.Notes,
        };
    }

    public async Task<DiseaseStatsDto> GetDiseaseStatsAsync()
    {
        var reports = await _context.DiseaseReports.Where(d => !d.IsDeleted).ToListAsync();
        var outbreaks = await _context.OutbreakEvents.Where(o => !o.IsDeleted && o.Status < 3).CountAsync();

        return new DiseaseStatsDto
        {
            TotalReports = reports.Count,
            ActiveInvestigations = reports.Count(d => d.Status == 1),
            ConfirmedCases = reports.Count(d => d.Status == 2),
            NotifiableCases = reports.Count(d => d.IsNotifiable),
            ActiveOutbreaks = outbreaks,
            TotalDeaths = reports.Count(d => d.Outcome == "Deceased"),
            GroupBreakdown = reports.Where(d => !string.IsNullOrEmpty(d.DiseaseGroup)).GroupBy(d => d.DiseaseGroup!).Select(g => new DiseaseGroupBreakdownDto { Group = g.Key, Count = g.Count() }).ToList(),
        };
    }

    // =====================================================================
    // SCHOOL HEALTH
    // =====================================================================

    public async Task<List<SchoolHealthExamDto>> GetSchoolHealthExamsAsync(SchoolHealthSearchDto? filter = null)
    {
        var query = _context.SchoolHealthExams
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s =>
                    s.StudentName.ToLower().Contains(kw) ||
                    s.SchoolName.ToLower().Contains(kw) ||
                    (s.StudentCode != null && s.StudentCode.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.SchoolName))
                query = query.Where(s => s.SchoolName == filter.SchoolName);
            if (!string.IsNullOrEmpty(filter.AcademicYear))
                query = query.Where(s => s.AcademicYear == filter.AcademicYear);
            if (!string.IsNullOrEmpty(filter.GradeLevel))
                query = query.Where(s => s.GradeLevel == filter.GradeLevel);
            if (filter.Status.HasValue)
                query = query.Where(s => s.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(s => s.ExamDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(s => s.ExamDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(s => s.ExamDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(s => MapSchoolHealthDto(s))
            .ToListAsync();
    }

    public async Task<SchoolHealthExamDto?> GetSchoolHealthExamByIdAsync(Guid id)
    {
        var s = await _context.SchoolHealthExams.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        return s == null ? null : MapSchoolHealthDto(s);
    }

    public async Task<SchoolHealthExamDto> CreateSchoolHealthExamAsync(CreateSchoolHealthExamDto dto)
    {
        var entity = new SchoolHealthExam
        {
            Id = Guid.NewGuid(),
            SchoolName = dto.SchoolName,
            SchoolCode = dto.SchoolCode,
            AcademicYear = dto.AcademicYear,
            GradeLevel = dto.GradeLevel,
            StudentName = dto.StudentName,
            StudentCode = dto.StudentCode,
            DateOfBirth = !string.IsNullOrEmpty(dto.DateOfBirth) && DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            ExamDate = !string.IsNullOrEmpty(dto.ExamDate) && DateTime.TryParse(dto.ExamDate, out var ed) ? ed : DateTime.UtcNow,
            DoctorName = dto.DoctorName,
            Notes = dto.Notes,
            Status = 0, // Pending
            CreatedAt = DateTime.UtcNow,
        };
        _context.SchoolHealthExams.Add(entity);
        await _context.SaveChangesAsync();
        return MapSchoolHealthDto(entity);
    }

    public async Task<SchoolHealthExamDto> UpdateSchoolHealthExamAsync(Guid id, UpdateSchoolHealthExamDto dto)
    {
        var s = await _context.SchoolHealthExams.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("School health exam not found");
        if (dto.Status.HasValue) s.Status = dto.Status.Value;
        if (dto.Height.HasValue) s.Height = dto.Height.Value;
        if (dto.Weight.HasValue) s.Weight = dto.Weight.Value;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var hm = dto.Height.Value / 100f;
            s.BMI = (float)Math.Round(dto.Weight.Value / (hm * hm), 1);
        }
        if (dto.NutritionStatus != null) s.NutritionStatus = dto.NutritionStatus;
        if (dto.VisionLeft != null) s.VisionLeft = dto.VisionLeft;
        if (dto.VisionRight != null) s.VisionRight = dto.VisionRight;
        if (dto.HasVisionProblem.HasValue) s.HasVisionProblem = dto.HasVisionProblem.Value;
        if (dto.HearingResult != null) s.HearingResult = dto.HearingResult;
        if (dto.DentalResult != null) s.DentalResult = dto.DentalResult;
        if (dto.DentalCavityCount.HasValue) s.DentalCavityCount = dto.DentalCavityCount.Value;
        if (dto.SpineResult != null) s.SpineResult = dto.SpineResult;
        if (dto.SkinResult != null) s.SkinResult = dto.SkinResult;
        if (dto.HeartLungResult != null) s.HeartLungResult = dto.HeartLungResult;
        if (dto.MentalHealthResult != null) s.MentalHealthResult = dto.MentalHealthResult;
        if (dto.OverallResult != null) s.OverallResult = dto.OverallResult;
        if (dto.Recommendations != null) s.Recommendations = dto.Recommendations;
        if (dto.DoctorName != null) s.DoctorName = dto.DoctorName;
        if (dto.Notes != null) s.Notes = dto.Notes;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapSchoolHealthDto(s);
    }

    public async Task DeleteSchoolHealthExamAsync(Guid id)
    {
        var s = await _context.SchoolHealthExams.FindAsync(id)
            ?? throw new InvalidOperationException("School health exam not found");
        s.IsDeleted = true;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<SchoolHealthStatsDto> GetSchoolHealthStatsAsync()
    {
        var items = await _context.SchoolHealthExams.Where(s => !s.IsDeleted).ToListAsync();
        return new SchoolHealthStatsDto
        {
            TotalExams = items.Count,
            PendingCount = items.Count(s => s.Status == 0),
            CompletedCount = items.Count(s => s.Status == 1),
            VisionProblemCount = items.Count(s => s.HasVisionProblem == true),
            DentalProblemCount = items.Count(s => s.DentalCavityCount.HasValue && s.DentalCavityCount.Value > 0),
            MalnutritionCount = items.Count(s => s.NutritionStatus == "Suy dinh dưỡng"),
            OverweightCount = items.Count(s => s.NutritionStatus == "Thừa cân" || s.NutritionStatus == "Béo phì"),
            SchoolBreakdown = items.GroupBy(s => s.SchoolName).Select(g => new SchoolBreakdownDto { SchoolName = g.Key, ExamCount = g.Count(), CompletedCount = g.Count(x => x.Status == 1) }).OrderByDescending(x => x.ExamCount).Take(10).ToList(),
        };
    }

    // =====================================================================
    // OCCUPATIONAL HEALTH
    // =====================================================================

    public async Task<List<OccupationalHealthExamDto>> GetOccupationalHealthExamsAsync(OccupationalHealthSearchDto? filter = null)
    {
        var query = _context.OccupationalHealthExams
            .Where(o => !o.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(o =>
                    o.EmployeeName.ToLower().Contains(kw) ||
                    o.CompanyName.ToLower().Contains(kw) ||
                    (o.EmployeeCode != null && o.EmployeeCode.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.CompanyName))
                query = query.Where(o => o.CompanyName == filter.CompanyName);
            if (!string.IsNullOrEmpty(filter.ExamType))
                query = query.Where(o => o.ExamType == filter.ExamType);
            if (filter.Status.HasValue)
                query = query.Where(o => o.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.HazardExposure))
                query = query.Where(o => o.HazardExposure != null && o.HazardExposure.Contains(filter.HazardExposure));
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(o => o.ExamDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(o => o.ExamDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(o => o.ExamDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(o => MapOccupationalHealthDto(o))
            .ToListAsync();
    }

    public async Task<OccupationalHealthExamDto?> GetOccupationalHealthExamByIdAsync(Guid id)
    {
        var o = await _context.OccupationalHealthExams.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        return o == null ? null : MapOccupationalHealthDto(o);
    }

    public async Task<OccupationalHealthExamDto> CreateOccupationalHealthExamAsync(CreateOccupationalHealthExamDto dto)
    {
        var entity = new OccupationalHealthExam
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            EmployeeName = dto.EmployeeName,
            EmployeeCode = dto.EmployeeCode,
            CompanyName = dto.CompanyName,
            CompanyTaxCode = dto.CompanyTaxCode,
            Department = dto.Department,
            JobTitle = dto.JobTitle,
            HazardExposure = dto.HazardExposure,
            ExposureYears = dto.ExposureYears,
            ExamType = dto.ExamType,
            ExamDate = !string.IsNullOrEmpty(dto.ExamDate) && DateTime.TryParse(dto.ExamDate, out var ed) ? ed : DateTime.UtcNow,
            DoctorName = dto.DoctorName,
            Status = 0, // Pending
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.OccupationalHealthExams.Add(entity);
        await _context.SaveChangesAsync();
        return MapOccupationalHealthDto(entity);
    }

    public async Task<OccupationalHealthExamDto> UpdateOccupationalHealthExamAsync(Guid id, UpdateOccupationalHealthExamDto dto)
    {
        var o = await _context.OccupationalHealthExams.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Occupational health exam not found");
        if (dto.Status.HasValue) o.Status = dto.Status.Value;
        if (dto.GeneralHealth != null) o.GeneralHealth = dto.GeneralHealth;
        if (dto.RespiratoryResult != null) o.RespiratoryResult = dto.RespiratoryResult;
        if (dto.HearingResult != null) o.HearingResult = dto.HearingResult;
        if (dto.VisionResult != null) o.VisionResult = dto.VisionResult;
        if (dto.SkinResult != null) o.SkinResult = dto.SkinResult;
        if (dto.LabResults != null) o.LabResults = dto.LabResults;
        if (dto.XrayResult != null) o.XrayResult = dto.XrayResult;
        if (dto.OccupationalDisease != null) o.OccupationalDisease = dto.OccupationalDisease;
        if (dto.DiseaseCode != null) o.DiseaseCode = dto.DiseaseCode;
        if (dto.Classification != null) o.Classification = dto.Classification;
        if (dto.Recommendations != null) o.Recommendations = dto.Recommendations;
        if (dto.DoctorName != null) o.DoctorName = dto.DoctorName;
        if (dto.Notes != null) o.Notes = dto.Notes;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapOccupationalHealthDto(o);
    }

    public async Task DeleteOccupationalHealthExamAsync(Guid id)
    {
        var o = await _context.OccupationalHealthExams.FindAsync(id)
            ?? throw new InvalidOperationException("Occupational health exam not found");
        o.IsDeleted = true;
        o.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<OccupationalHealthStatsDto> GetOccupationalHealthStatsAsync()
    {
        var items = await _context.OccupationalHealthExams.Where(o => !o.IsDeleted).ToListAsync();
        return new OccupationalHealthStatsDto
        {
            TotalExams = items.Count,
            PendingCount = items.Count(o => o.Status == 0),
            CompletedCount = items.Count(o => o.Status == 1),
            OccupationalDiseaseCount = items.Count(o => !string.IsNullOrEmpty(o.OccupationalDisease)),
            NeedFollowUpCount = items.Count(o => o.Status == 2),
            CompanyBreakdown = items.GroupBy(o => o.CompanyName).Select(g => new CompanyBreakdownDto { CompanyName = g.Key, ExamCount = g.Count() }).OrderByDescending(x => x.ExamCount).Take(10).ToList(),
            HazardBreakdown = items.Where(o => !string.IsNullOrEmpty(o.HazardExposure)).GroupBy(o => o.HazardExposure!).Select(g => new HazardBreakdownDto { Hazard = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(10).ToList(),
        };
    }

    // =====================================================================
    // METHADONE TREATMENT
    // =====================================================================

    public async Task<List<MethadonePatientDto>> GetMethadonePatientsAsync(MethadonePatientSearchDto? filter = null)
    {
        var query = _context.MethadonePatients
            .Include(m => m.Patient)
            .Where(m => !m.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(m =>
                    m.PatientCode.ToLower().Contains(kw) ||
                    (m.Patient != null && (m.Patient.FullName.ToLower().Contains(kw) || m.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (!string.IsNullOrEmpty(filter.Phase))
                query = query.Where(m => m.Phase == filter.Phase);
            if (filter.Status.HasValue)
                query = query.Where(m => m.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(m => m.EnrollmentDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(m => m.EnrollmentDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 20;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(m => m.EnrollmentDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(m => new MethadonePatientDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                PatientName = m.Patient != null ? m.Patient.FullName : "",
                PatientCodeHIS = m.Patient != null ? m.Patient.PatientCode : "",
                PatientCode = m.PatientCode,
                EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
                DischargeDate = m.DischargeDate.HasValue ? m.DischargeDate.Value.ToString("yyyy-MM-dd") : null,
                DischargeReason = m.DischargeReason,
                CurrentDoseMg = m.CurrentDoseMg,
                Phase = m.Phase,
                Status = m.Status,
                TransferredFrom = m.TransferredFrom,
                TransferredTo = m.TransferredTo,
                MissedDoseCount = m.MissedDoseCount,
                LastDosingDate = m.LastDosingDate.HasValue ? m.LastDosingDate.Value.ToString("yyyy-MM-dd") : null,
                Notes = m.Notes,
                DosingRecordCount = m.DosingRecords.Count(dr => !dr.IsDeleted),
                UrineTestCount = m.UrineTests.Count(ut => !ut.IsDeleted),
            })
            .ToListAsync();
    }

    public async Task<MethadonePatientDto?> GetMethadonePatientByIdAsync(Guid id)
    {
        var m = await _context.MethadonePatients
            .Include(m => m.Patient)
            .Include(m => m.DosingRecords.Where(d => !d.IsDeleted))
            .Include(m => m.UrineTests.Where(u => !u.IsDeleted))
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        if (m == null) return null;

        return new MethadonePatientDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            PatientName = m.Patient?.FullName ?? "",
            PatientCodeHIS = m.Patient?.PatientCode ?? "",
            PatientCode = m.PatientCode,
            EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
            DischargeDate = m.DischargeDate?.ToString("yyyy-MM-dd"),
            DischargeReason = m.DischargeReason,
            CurrentDoseMg = m.CurrentDoseMg,
            Phase = m.Phase,
            Status = m.Status,
            TransferredFrom = m.TransferredFrom,
            TransferredTo = m.TransferredTo,
            MissedDoseCount = m.MissedDoseCount,
            LastDosingDate = m.LastDosingDate?.ToString("yyyy-MM-dd"),
            Notes = m.Notes,
            DosingRecordCount = m.DosingRecords.Count,
            UrineTestCount = m.UrineTests.Count,
        };
    }

    public async Task<MethadonePatientDto> CreateMethadonePatientAsync(CreateMethadonePatientDto dto)
    {
        var entity = new MethadonePatient
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientCode = dto.PatientCode,
            EnrollmentDate = !string.IsNullOrEmpty(dto.EnrollmentDate) && DateTime.TryParse(dto.EnrollmentDate, out var ed) ? ed : DateTime.UtcNow,
            CurrentDoseMg = dto.CurrentDoseMg,
            Phase = dto.Phase,
            Status = 0, // Active
            TransferredFrom = dto.TransferredFrom,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.MethadonePatients.Add(entity);
        await _context.SaveChangesAsync();

        return new MethadonePatientDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientCode = entity.PatientCode,
            EnrollmentDate = entity.EnrollmentDate.ToString("yyyy-MM-dd"),
            CurrentDoseMg = entity.CurrentDoseMg,
            Phase = entity.Phase,
            Status = entity.Status,
        };
    }

    public async Task<MethadonePatientDto> UpdateMethadonePatientAsync(Guid id, UpdateMethadonePatientDto dto)
    {
        var m = await _context.MethadonePatients.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Methadone patient not found");
        if (dto.Status.HasValue) m.Status = dto.Status.Value;
        if (dto.CurrentDoseMg.HasValue) m.CurrentDoseMg = dto.CurrentDoseMg.Value;
        if (dto.Phase != null) m.Phase = dto.Phase;
        if (!string.IsNullOrEmpty(dto.DischargeDate) && DateTime.TryParse(dto.DischargeDate, out var dd))
            m.DischargeDate = dd;
        if (dto.DischargeReason != null) m.DischargeReason = dto.DischargeReason;
        if (dto.TransferredTo != null) m.TransferredTo = dto.TransferredTo;
        if (dto.Notes != null) m.Notes = dto.Notes;
        m.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new MethadonePatientDto
        {
            Id = m.Id,
            PatientId = m.PatientId,
            PatientName = m.Patient?.FullName ?? "",
            PatientCode = m.PatientCode,
            EnrollmentDate = m.EnrollmentDate.ToString("yyyy-MM-dd"),
            CurrentDoseMg = m.CurrentDoseMg,
            Phase = m.Phase,
            Status = m.Status,
        };
    }

    public async Task<List<MethadoneDosingRecordDto>> GetDosingHistoryAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneDosingRecords
            .Where(d => d.MethadonePatientId == methadonePatientId && !d.IsDeleted)
            .OrderByDescending(d => d.DosingDate)
            .Take(100)
            .Select(d => new MethadoneDosingRecordDto
            {
                Id = d.Id,
                MethadonePatientId = d.MethadonePatientId,
                DosingDate = d.DosingDate.ToString("yyyy-MM-dd"),
                DoseMg = d.DoseMg,
                Witnessed = d.Witnessed,
                TakeHome = d.TakeHome,
                AdministeredBy = d.AdministeredBy,
                Notes = d.Notes,
                Status = d.Status,
            })
            .ToListAsync();
    }

    public async Task<MethadoneDosingRecordDto> RecordDoseAsync(CreateMethadoneDosingDto dto)
    {
        var patient = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        var entity = new MethadoneDosingRecord
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            DosingDate = !string.IsNullOrEmpty(dto.DosingDate) && DateTime.TryParse(dto.DosingDate, out var dd) ? dd : DateTime.UtcNow,
            DoseMg = dto.DoseMg,
            Witnessed = dto.Witnessed,
            TakeHome = dto.TakeHome,
            AdministeredBy = dto.AdministeredBy,
            Status = dto.Status,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.MethadoneDosingRecords.Add(entity);

        // Update patient's last dosing date and missed count
        patient.LastDosingDate = entity.DosingDate;
        if (dto.Status == 1) // Missed
            patient.MissedDoseCount++;
        patient.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new MethadoneDosingRecordDto
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            DosingDate = entity.DosingDate.ToString("yyyy-MM-dd"),
            DoseMg = entity.DoseMg,
            Witnessed = entity.Witnessed,
            TakeHome = entity.TakeHome,
            AdministeredBy = entity.AdministeredBy,
            Notes = entity.Notes,
            Status = entity.Status,
        };
    }

    public async Task<List<MethadoneUrineTestDto>> GetUrineTestsAsync(Guid methadonePatientId)
    {
        return await _context.MethadoneUrineTests
            .Where(u => u.MethadonePatientId == methadonePatientId && !u.IsDeleted)
            .OrderByDescending(u => u.TestDate)
            .Take(50)
            .Select(u => new MethadoneUrineTestDto
            {
                Id = u.Id,
                MethadonePatientId = u.MethadonePatientId,
                TestDate = u.TestDate.ToString("yyyy-MM-dd"),
                IsRandom = u.IsRandom,
                Morphine = u.Morphine,
                Amphetamine = u.Amphetamine,
                Methamphetamine = u.Methamphetamine,
                THC = u.THC,
                Benzodiazepine = u.Benzodiazepine,
                Methadone = u.Methadone,
                OverallResult = u.OverallResult,
                Notes = u.Notes,
            })
            .ToListAsync();
    }

    public async Task<MethadoneUrineTestDto> RecordUrineTestAsync(CreateMethadoneUrineTestDto dto)
    {
        _ = await _context.MethadonePatients.FindAsync(dto.MethadonePatientId)
            ?? throw new InvalidOperationException("Methadone patient not found");

        var entity = new MethadoneUrineTest
        {
            Id = Guid.NewGuid(),
            MethadonePatientId = dto.MethadonePatientId,
            TestDate = !string.IsNullOrEmpty(dto.TestDate) && DateTime.TryParse(dto.TestDate, out var td) ? td : DateTime.UtcNow,
            IsRandom = dto.IsRandom,
            Morphine = dto.Morphine,
            Amphetamine = dto.Amphetamine,
            Methamphetamine = dto.Methamphetamine,
            THC = dto.THC,
            Benzodiazepine = dto.Benzodiazepine,
            Methadone = dto.Methadone,
            OverallResult = dto.OverallResult,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.MethadoneUrineTests.Add(entity);
        await _context.SaveChangesAsync();

        return new MethadoneUrineTestDto
        {
            Id = entity.Id,
            MethadonePatientId = entity.MethadonePatientId,
            TestDate = entity.TestDate.ToString("yyyy-MM-dd"),
            IsRandom = entity.IsRandom,
            Morphine = entity.Morphine,
            Amphetamine = entity.Amphetamine,
            Methamphetamine = entity.Methamphetamine,
            THC = entity.THC,
            Benzodiazepine = entity.Benzodiazepine,
            Methadone = entity.Methadone,
            OverallResult = entity.OverallResult,
            Notes = entity.Notes,
        };
    }

    public async Task<MethadoneStatsDto> GetMethadoneStatsAsync()
    {
        var patients = await _context.MethadonePatients.Where(m => !m.IsDeleted).ToListAsync();
        var today = DateTime.UtcNow.Date;
        var missedToday = await _context.MethadoneDosingRecords
            .Where(d => !d.IsDeleted && d.Status == 1 && d.DosingDate.Date == today)
            .CountAsync();
        var positiveTests = await _context.MethadoneUrineTests
            .Where(u => !u.IsDeleted && u.OverallResult == "Positive")
            .CountAsync();

        var activePatients = patients.Where(m => m.Status == 0).ToList();

        return new MethadoneStatsDto
        {
            TotalPatients = patients.Count,
            ActiveCount = patients.Count(m => m.Status == 0),
            SuspendedCount = patients.Count(m => m.Status == 1),
            DischargedCount = patients.Count(m => m.Status == 2),
            TransferredCount = patients.Count(m => m.Status == 3),
            AverageDoseMg = activePatients.Count > 0 ? (float)Math.Round(activePatients.Average(m => m.CurrentDoseMg), 1) : 0,
            MissedDosesToday = missedToday,
            PositiveUrineTests = positiveTests,
            PhaseBreakdown = activePatients.GroupBy(m => m.Phase).Select(g => new PhaseBreakdownDto { Phase = g.Key, Count = g.Count() }).ToList(),
        };
    }

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    private static VaccinationRecordDto MapVaccinationDto(VaccinationRecord v) => new()
    {
        Id = v.Id,
        PatientId = v.PatientId,
        PatientName = v.Patient?.FullName ?? "",
        PatientCode = v.Patient?.PatientCode ?? "",
        VaccineName = v.VaccineName,
        VaccineCode = v.VaccineCode,
        LotNumber = v.LotNumber,
        Manufacturer = v.Manufacturer,
        VaccinationDate = v.VaccinationDate.ToString("yyyy-MM-dd"),
        DoseNumber = v.DoseNumber,
        InjectionSite = v.InjectionSite,
        Route = v.Route,
        DoseMl = v.DoseMl,
        AdministeredBy = v.AdministeredBy,
        FacilityName = v.FacilityName,
        Status = v.Status,
        AefiReport = v.AefiReport,
        AefiSeverity = v.AefiSeverity,
        NextDoseDate = v.NextDoseDate?.ToString("yyyy-MM-dd"),
        CampaignCode = v.CampaignCode,
        Notes = v.Notes,
        IsEPI = v.IsEPI,
    };

    private static SchoolHealthExamDto MapSchoolHealthDto(SchoolHealthExam s) => new()
    {
        Id = s.Id,
        SchoolName = s.SchoolName,
        SchoolCode = s.SchoolCode,
        AcademicYear = s.AcademicYear,
        GradeLevel = s.GradeLevel,
        StudentName = s.StudentName,
        StudentCode = s.StudentCode,
        DateOfBirth = s.DateOfBirth?.ToString("yyyy-MM-dd"),
        Gender = s.Gender,
        ExamDate = s.ExamDate.ToString("yyyy-MM-dd"),
        Height = s.Height,
        Weight = s.Weight,
        BMI = s.BMI,
        NutritionStatus = s.NutritionStatus,
        VisionLeft = s.VisionLeft,
        VisionRight = s.VisionRight,
        HasVisionProblem = s.HasVisionProblem,
        HearingResult = s.HearingResult,
        DentalResult = s.DentalResult,
        DentalCavityCount = s.DentalCavityCount,
        SpineResult = s.SpineResult,
        SkinResult = s.SkinResult,
        HeartLungResult = s.HeartLungResult,
        MentalHealthResult = s.MentalHealthResult,
        OverallResult = s.OverallResult,
        Recommendations = s.Recommendations,
        DoctorName = s.DoctorName,
        Notes = s.Notes,
        Status = s.Status,
    };

    private static OccupationalHealthExamDto MapOccupationalHealthDto(OccupationalHealthExam o) => new()
    {
        Id = o.Id,
        PatientId = o.PatientId,
        EmployeeName = o.EmployeeName,
        EmployeeCode = o.EmployeeCode,
        CompanyName = o.CompanyName,
        CompanyTaxCode = o.CompanyTaxCode,
        Department = o.Department,
        JobTitle = o.JobTitle,
        HazardExposure = o.HazardExposure,
        ExposureYears = o.ExposureYears,
        ExamDate = o.ExamDate.ToString("yyyy-MM-dd"),
        ExamType = o.ExamType,
        GeneralHealth = o.GeneralHealth,
        RespiratoryResult = o.RespiratoryResult,
        HearingResult = o.HearingResult,
        VisionResult = o.VisionResult,
        SkinResult = o.SkinResult,
        LabResults = o.LabResults,
        XrayResult = o.XrayResult,
        OccupationalDisease = o.OccupationalDisease,
        DiseaseCode = o.DiseaseCode,
        Classification = o.Classification,
        Recommendations = o.Recommendations,
        DoctorName = o.DoctorName,
        Status = o.Status,
        Notes = o.Notes,
    };
}
