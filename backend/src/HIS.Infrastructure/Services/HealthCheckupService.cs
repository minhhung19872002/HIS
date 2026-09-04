using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K-wave5: tach F10.5 KSK chuyen biet CRUD sang HealthCheckupService.Checkups.cs (~337 dong).
public partial class HealthCheckupService : IHealthCheckupService
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
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu khám sức khỏe");

        if (entity.CertificateIssued)
            throw new InvalidOperationException("Giấy chứng nhận đã được cấp");

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

    // ---- F10.5: KSK chuyen biet CRUD -> HealthCheckupService.Checkups.cs ----
}
