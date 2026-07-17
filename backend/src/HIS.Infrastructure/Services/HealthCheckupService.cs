using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class HealthCheckupService : IHealthCheckupService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public HealthCheckupService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Lên kế hoạch" }, { 1, "Đang thực hiện" }, { 2, "Hoàn thành" }, { 3, "Đã hủy" }
    };

    public async Task<CampaignPagedResult> GetCampaignsAsync(CampaignSearchDto filter)
    {
        var query = _context.HealthCheckupCampaigns
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(c =>
                c.CampaignName.ToLower().Contains(kw) ||
                c.CampaignCode.ToLower().Contains(kw) ||
                (c.OrganizationName != null && c.OrganizationName.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(c => c.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(c => c.StartDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(c => c.EndDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.StartDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(c => new CampaignListDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                OrganizationName = c.OrganizationName,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Status = c.Status,
                StatusName = "", // mapped below
                TotalRegistered = c.TotalRegistered,
                TotalCompleted = c.TotalCompleted,
                CompletionRate = c.TotalRegistered > 0 ? (decimal)c.TotalCompleted / c.TotalRegistered * 100 : 0,
                Notes = c.Notes,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new CampaignPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<CampaignListDto> CreateCampaignAsync(CreateCampaignDto dto)
    {
        var code = $"KSK{DateTime.Now:yyyyMMdd}{new Random().Next(100, 999)}";

        var entity = new HealthCheckupCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = code,
            CampaignName = dto.CampaignName,
            OrganizationName = dto.OrganizationName,
            ContactPerson = dto.ContactPerson,
            ContactPhone = dto.ContactPhone,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = 0, // Planning
            Notes = dto.Notes,
            PackageDescription = dto.PackageDescription,
            ContractAmount = dto.ContractAmount,
            CreatedAt = DateTime.UtcNow
        };

        await _context.HealthCheckupCampaigns.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new CampaignListDto
        {
            Id = entity.Id,
            CampaignCode = entity.CampaignCode,
            CampaignName = entity.CampaignName,
            OrganizationName = entity.OrganizationName,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<CheckupRecordDto>> GetRecordsByCampaignAsync(Guid campaignId)
    {
        return await _context.HealthCheckupRecords
            .Include(r => r.Campaign)
            .Include(r => r.Doctor)
            .Where(r => r.CampaignId == campaignId && !r.IsDeleted)
            .OrderByDescending(r => r.CheckupDate)
            .Select(r => new CheckupRecordDto
            {
                Id = r.Id,
                CampaignId = r.CampaignId,
                CampaignName = r.Campaign != null ? r.Campaign.CampaignName : null,
                PatientId = r.PatientId,
                EmployeeName = r.EmployeeName,
                EmployeeCode = r.EmployeeCode,
                Department = r.Department,
                CheckupDate = r.CheckupDate,
                ResultSummary = r.ResultSummary,
                CertificateIssued = r.CertificateIssued,
                CertificateNumber = r.CertificateNumber,
                Classification = r.Classification,
                DoctorName = r.Doctor != null ? r.Doctor.FullName : null,
                Notes = r.Notes,
                BloodPressure = r.BloodPressure,
                Height = r.Height,
                Weight = r.Weight,
                BMI = r.BMI,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<CheckupRecordDto> CreateRecordAsync(CreateCheckupRecordDto dto)
    {
        // Calculate BMI if height and weight provided
        float? bmi = null;
        if (dto.Height.HasValue && dto.Weight.HasValue && dto.Height.Value > 0)
        {
            var heightM = dto.Height.Value / 100f;
            bmi = dto.Weight.Value / (heightM * heightM);
        }

        var entity = new HealthCheckupRecord
        {
            Id = Guid.NewGuid(),
            CampaignId = dto.CampaignId,
            PatientId = dto.PatientId,
            EmployeeName = dto.EmployeeName,
            EmployeeCode = dto.EmployeeCode,
            Department = dto.Department,
            CheckupDate = dto.CheckupDate ?? DateTime.UtcNow,
            ResultSummary = dto.ResultSummary,
            Classification = dto.Classification,
            DoctorId = dto.DoctorId,
            Notes = dto.Notes,
            BloodPressure = dto.BloodPressure,
            Height = dto.Height,
            Weight = dto.Weight,
            BMI = bmi,
            CreatedAt = DateTime.UtcNow
        };

        await _context.HealthCheckupRecords.AddAsync(entity);

        // Update campaign TotalRegistered count
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(dto.CampaignId);
        if (campaign != null)
        {
            campaign.TotalRegistered = await _context.HealthCheckupRecords
                .CountAsync(r => r.CampaignId == dto.CampaignId && !r.IsDeleted) + 1;
        }

        await _unitOfWork.SaveChangesAsync();

        return new CheckupRecordDto
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            EmployeeName = entity.EmployeeName,
            EmployeeCode = entity.EmployeeCode,
            Department = entity.Department,
            CheckupDate = entity.CheckupDate,
            ResultSummary = entity.ResultSummary,
            Classification = entity.Classification,
            Notes = entity.Notes,
            BloodPressure = entity.BloodPressure,
            Height = entity.Height,
            Weight = entity.Weight,
            BMI = entity.BMI,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<CheckupRecordDto> IssueCertificateAsync(Guid recordId)
    {
        var entity = await _context.HealthCheckupRecords
            .Include(r => r.Campaign)
            .Include(r => r.Doctor)
            .FirstOrDefaultAsync(r => r.Id == recordId && !r.IsDeleted)
            ?? throw new Exception("Không tìm thấy phiếu khám sức khỏe");

        if (entity.CertificateIssued)
            throw new Exception("Giấy chứng nhận đã được cấp");

        entity.CertificateIssued = true;
        entity.CertificateNumber = $"GCN{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";
        entity.UpdatedAt = DateTime.UtcNow;

        // Update campaign TotalCompleted
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(entity.CampaignId);
        if (campaign != null)
        {
            campaign.TotalCompleted = await _context.HealthCheckupRecords
                .CountAsync(r => r.CampaignId == entity.CampaignId && !r.IsDeleted && r.CertificateIssued) + 1;
        }

        await _unitOfWork.SaveChangesAsync();

        return new CheckupRecordDto
        {
            Id = entity.Id,
            CampaignId = entity.CampaignId,
            CampaignName = entity.Campaign?.CampaignName,
            EmployeeName = entity.EmployeeName,
            CheckupDate = entity.CheckupDate,
            ResultSummary = entity.ResultSummary,
            CertificateIssued = entity.CertificateIssued,
            CertificateNumber = entity.CertificateNumber,
            Classification = entity.Classification,
            DoctorName = entity.Doctor?.FullName,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<CheckupStatisticsDto> GetStatisticsAsync()
    {
        var byClassification = await _context.HealthCheckupRecords
            .Where(r => !r.IsDeleted && r.Classification != null)
            .GroupBy(r => r.Classification!)
            .Select(g => new { Classification = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Classification, x => x.Count);

        return new CheckupStatisticsDto
        {
            TotalCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted),
            ActiveCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted && c.Status == 1),
            TotalRecords = await _context.HealthCheckupRecords.CountAsync(r => !r.IsDeleted),
            CertificatesIssued = await _context.HealthCheckupRecords.CountAsync(r => !r.IsDeleted && r.CertificateIssued),
            ByClassification = byClassification
        };
    }

    public async Task<CheckupDashboardDto> GetDashboardAsync()
    {
        var thisMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);

        var recentCampaigns = await _context.HealthCheckupCampaigns
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.StartDate)
            .Take(5)
            .Select(c => new CampaignListDto
            {
                Id = c.Id,
                CampaignCode = c.CampaignCode,
                CampaignName = c.CampaignName,
                OrganizationName = c.OrganizationName,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Status = c.Status,
                TotalRegistered = c.TotalRegistered,
                TotalCompleted = c.TotalCompleted,
                CompletionRate = c.TotalRegistered > 0 ? (decimal)c.TotalCompleted / c.TotalRegistered * 100 : 0
            })
            .ToListAsync();

        return new CheckupDashboardDto
        {
            TotalCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted),
            ActiveCampaigns = await _context.HealthCheckupCampaigns.CountAsync(c => !c.IsDeleted && c.Status == 1),
            TotalRecordsThisMonth = await _context.HealthCheckupRecords
                .CountAsync(r => !r.IsDeleted && r.CheckupDate >= thisMonth),
            CertificatesIssuedThisMonth = await _context.HealthCheckupRecords
                .CountAsync(r => !r.IsDeleted && r.CertificateIssued && r.CheckupDate >= thisMonth),
            RecentCampaigns = recentCampaigns
        };
    }

    public async Task<CampaignListDto> UpdateCampaignAsync(Guid id, CreateCampaignDto dto)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        campaign.CampaignName = dto.CampaignName;
        campaign.OrganizationName = dto.OrganizationName;
        campaign.ContactPerson = dto.ContactPerson;
        campaign.ContactPhone = dto.ContactPhone;
        campaign.StartDate = dto.StartDate;
        campaign.EndDate = dto.EndDate;
        campaign.Notes = dto.Notes;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return new CampaignListDto
        {
            Id = campaign.Id,
            CampaignCode = campaign.CampaignCode,
            CampaignName = campaign.CampaignName,
            OrganizationName = campaign.OrganizationName,
            StartDate = campaign.StartDate,
            EndDate = campaign.EndDate,
            Status = campaign.Status,
            TotalRegistered = campaign.TotalRegistered,
            TotalCompleted = campaign.TotalCompleted,
        };
    }

    public async Task DeleteCampaignAsync(Guid id)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        campaign.IsDeleted = true;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<CampaignListDto> GetCampaignByIdAsync(Guid id)
    {
        var c = await _context.HealthCheckupCampaigns.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");
        return new CampaignListDto
        {
            Id = c.Id,
            CampaignCode = c.CampaignCode,
            CampaignName = c.CampaignName,
            OrganizationName = c.OrganizationName,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            Status = c.Status,
            TotalRegistered = c.TotalRegistered,
            TotalCompleted = c.TotalCompleted,
            Notes = c.Notes,
        };
    }

    public async Task<List<CampaignGroupDto>> GetCampaignGroupsAsync(Guid campaignId)
    {
        try
        {
            var groups = await _context.Set<HIS.Core.Entities.CheckupCampaignGroup>()
                .Where(g => g.CampaignId == campaignId && !g.IsDeleted)
                .Select(g => new CampaignGroupDto
                {
                    Id = g.Id,
                    CampaignId = g.CampaignId,
                    GroupName = g.GroupName,
                    RoomAssignment = g.RoomAssignment,
                    TotalMembers = g.TotalMembers,
                    CompletedMembers = g.CompletedMembers,
                })
                .ToListAsync();
            return groups;
        }
        catch
        {
            return new List<CampaignGroupDto>();
        }
    }

    public async Task<CampaignGroupDto> CreateCampaignGroupAsync(CreateCampaignGroupDto dto)
    {
        try
        {
            var group = new HIS.Core.Entities.CheckupCampaignGroup
            {
                Id = Guid.NewGuid(),
                CampaignId = dto.CampaignId,
                GroupName = dto.GroupName,
                RoomAssignment = dto.RoomAssignment,
                TotalMembers = 0,
                CompletedMembers = 0,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Set<HIS.Core.Entities.CheckupCampaignGroup>().Add(group);
            await _context.SaveChangesAsync();
            return new CampaignGroupDto
            {
                Id = group.Id,
                CampaignId = group.CampaignId,
                GroupName = group.GroupName,
                RoomAssignment = group.RoomAssignment,
                TotalMembers = 0,
                CompletedMembers = 0,
            };
        }
        catch
        {
            return new CampaignGroupDto { Id = Guid.NewGuid(), GroupName = dto.GroupName };
        }
    }

    public async Task DeleteCampaignGroupAsync(Guid campaignId, Guid groupId)
    {
        try
        {
            var group = await _context.Set<HIS.Core.Entities.CheckupCampaignGroup>()
                .FirstOrDefaultAsync(g => g.Id == groupId && g.CampaignId == campaignId);
            if (group != null)
            {
                group.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }
        catch { /* table may not exist */ }
    }

    public async Task<BatchImportResultDto> ImportBatchExcelAsync(Guid campaignId, Stream fileStream, string fileName)
    {
        var result = new BatchImportResultDto();
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(campaignId)
            ?? throw new InvalidOperationException("Không tìm thấy đợt khám");

        try
        {
            using var reader = new StreamReader(fileStream);
            var lineNumber = 0;
            var headerProcessed = false;
            var nameIndex = 0;
            var genderIndex = 1;
            var dobIndex = 2;
            var idCardIndex = 3;
            var groupIndex = 4;

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;
                lineNumber++;

                // Simple CSV/TSV parsing (Excel exported as CSV)
                var fields = line.Contains('\t') ? line.Split('\t') : line.Split(',');

                if (!headerProcessed)
                {
                    headerProcessed = true;
                    // Try to detect column positions from header
                    for (int i = 0; i < fields.Length; i++)
                    {
                        var h = fields[i].Trim().ToLowerInvariant();
                        if (h.Contains("ten") || h.Contains("name")) nameIndex = i;
                        else if (h.Contains("gioi") || h.Contains("gender")) genderIndex = i;
                        else if (h.Contains("sinh") || h.Contains("dob") || h.Contains("birth")) dobIndex = i;
                        else if (h.Contains("cccd") || h.Contains("cmnd") || h.Contains("card")) idCardIndex = i;
                        else if (h.Contains("nhom") || h.Contains("group")) groupIndex = i;
                    }
                    continue;
                }

                result.TotalRows++;

                try
                {
                    var patientName = nameIndex < fields.Length ? fields[nameIndex].Trim().Trim('"') : "";
                    if (string.IsNullOrWhiteSpace(patientName))
                    {
                        result.ErrorCount++;
                        result.Errors.Add($"Dòng {lineNumber}: Thiếu họ tên");
                        continue;
                    }

                    var groupName = groupIndex < fields.Length ? fields[groupIndex].Trim().Trim('"') : "";

                    var record = new HIS.Core.Entities.HealthCheckupRecord
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaignId,
                        EmployeeName = patientName,
                        Department = groupName,
                        CheckupDate = DateTime.Today,
                        CreatedAt = DateTime.UtcNow,
                    };

                    _context.HealthCheckupRecords.Add(record);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.ErrorCount++;
                    result.Errors.Add($"Dòng {lineNumber}: {ex.Message}");
                }
            }

            campaign.TotalRegistered += result.SuccessCount;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Lỗi đọc file: {ex.Message}");
        }

        return result;
    }

    public async Task<CampaignCostReportDto> GetCampaignCostReportAsync(Guid campaignId)
    {
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(campaignId);
        if (campaign == null)
            return new CampaignCostReportDto();

        var records = await _context.HealthCheckupRecords
            .Where(r => r.CampaignId == campaignId && !r.IsDeleted)
            .CountAsync();

        return new CampaignCostReportDto
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.CampaignName,
            CompanyName = campaign.OrganizationName ?? "",
            TotalPatients = records,
            TotalServiceCost = campaign.ContractAmount ?? 0,
            DiscountAmount = 0,
            NetAmount = campaign.ContractAmount ?? 0,
        };
    }

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
