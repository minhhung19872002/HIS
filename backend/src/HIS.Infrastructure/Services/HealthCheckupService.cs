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
        if (string.IsNullOrWhiteSpace(dto.CampaignName))
            throw new ArgumentException("Tên đợt khám là bắt buộc", nameof(dto.CampaignName));
        if (dto.EndDate != default && dto.EndDate.Date < dto.StartDate.Date)
            throw new ArgumentException("Ngày kết thúc đợt khám không được trước ngày bắt đầu", nameof(dto.EndDate));
        if (dto.ContractAmount < 0)
            throw new ArgumentException("Giá trị hợp đồng không được âm", nameof(dto.ContractAmount)); // QA-R4: cost report went negative
        var code =$"KSK{DateTime.Now:yyyyMMdd}{new Random().Next(100, 999)}";

        var entity = new HealthCheckupCampaign
        {
            Id = Guid.NewGuid(),
            CampaignCode = code,
            CampaignName = dto.CampaignName,
            // FE v2 (HealthCheckup.tsx) sends companyName/servicePackage and may omit endDate.
            OrganizationName = dto.OrganizationName ?? dto.CompanyName,
            ContactPerson = dto.ContactPerson,
            ContactPhone = dto.ContactPhone,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate == default ? dto.StartDate : dto.EndDate,
            Status = 0, // Planning
            Notes = dto.Notes,
            PackageDescription = dto.PackageDescription ?? dto.ServicePackage,
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
        // QA-R4: negative/zero height or weight produced a negative BMI on the checkup record.
        if (dto.Height.HasValue && dto.Height.Value <= 0)
            throw new ArgumentException("Chiều cao phải lớn hơn 0", nameof(dto.Height));
        if (dto.Weight.HasValue && dto.Weight.Value <= 0)
            throw new ArgumentException("Cân nặng phải lớn hơn 0", nameof(dto.Weight));
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

        // Validate campaign first: an unknown CampaignId used to hit the FK and surface as 500.
        var campaign = await _context.HealthCheckupCampaigns
            .FirstOrDefaultAsync(c => c.Id == dto.CampaignId && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt khám");

        await _context.HealthCheckupRecords.AddAsync(entity);

        // Update campaign TotalRegistered count
        campaign.TotalRegistered = await _context.HealthCheckupRecords
            .CountAsync(r => r.CampaignId == dto.CampaignId && !r.IsDeleted) + 1;

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
        // QA-R11: the number was GCN{date}{random 1000-9999} with no uniqueness check — a group campaign issuing a
        // few hundred certificates a day is certain to print duplicate numbers on a legal document, and a double
        // click could issue twice. Serialize issuing, re-read under the lock, number sequentially per day.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, "HIS.HealthCheckup.Certificate",
            "Hệ thống đang cấp số giấy chứng nhận, vui lòng thử lại.");
        var entity = await _context.HealthCheckupRecords
            .Include(r => r.Campaign)
            .Include(r => r.Doctor)
            .FirstOrDefaultAsync(r => r.Id == recordId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu khám sức khỏe");

        if (entity.CertificateIssued)
            throw new InvalidOperationException("Giấy chứng nhận đã được cấp");
        // A health certificate was issuable on a record with no result and no classification.
        if (string.IsNullOrWhiteSpace(entity.Classification) && string.IsNullOrWhiteSpace(entity.ResultSummary))
            throw new InvalidOperationException("Phiếu khám chưa có kết quả / phân loại sức khỏe — không cấp giấy chứng nhận được");

        entity.CertificateIssued = true;
        var certPrefix = $"GCN{DateTime.Now:yyyyMMdd}";
        var certCodes = await _context.HealthCheckupRecords.IgnoreQueryFilters()
            .Where(r => r.CertificateNumber != null && r.CertificateNumber.StartsWith(certPrefix))
            .Select(r => r.CertificateNumber!)
            .ToListAsync();
        var certMax = certCodes
            .Select(c => int.TryParse(c.Substring(certPrefix.Length), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();
        entity.CertificateNumber = $"{certPrefix}{(certMax + 1):D4}";
        entity.UpdatedAt = DateTime.UtcNow;

        // Update campaign TotalCompleted
        var campaign = await _context.HealthCheckupCampaigns.FindAsync(entity.CampaignId);
        if (campaign != null)
        {
            campaign.TotalCompleted = await _context.HealthCheckupRecords
                .CountAsync(r => r.CampaignId == entity.CampaignId && !r.IsDeleted && r.CertificateIssued) + 1;
        }

        await _unitOfWork.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

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
        var campaign = await _context.HealthCheckupCampaigns.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt khám");
        if (string.IsNullOrWhiteSpace(dto.CampaignName))
            throw new ArgumentException("Tên đợt khám là bắt buộc", nameof(dto.CampaignName));
        if (dto.EndDate != default && dto.EndDate.Date < dto.StartDate.Date)
            throw new ArgumentException("Ngày kết thúc đợt khám không được trước ngày bắt đầu", nameof(dto.EndDate));
        if (dto.ContractAmount < 0)
            throw new ArgumentException("Giá trị hợp đồng không được âm", nameof(dto.ContractAmount));
        campaign.CampaignName = dto.CampaignName;
        campaign.OrganizationName = dto.OrganizationName ?? dto.CompanyName;
        campaign.ContactPerson = dto.ContactPerson;
        campaign.ContactPhone = dto.ContactPhone;
        campaign.StartDate = dto.StartDate;
        campaign.EndDate = dto.EndDate == default ? dto.StartDate : dto.EndDate;
        campaign.Notes = dto.Notes;
        // Previously dropped on update (contract money + package silently reverted to create-time values).
        campaign.PackageDescription = dto.PackageDescription ?? dto.ServicePackage;
        campaign.ContractAmount = dto.ContractAmount;
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
            StatusName = StatusNames.GetValueOrDefault(campaign.Status, "Không xác định"),
            TotalRegistered = campaign.TotalRegistered,
            TotalCompleted = campaign.TotalCompleted,
            Notes = campaign.Notes,
            CreatedAt = campaign.CreatedAt,
        };
    }

    public async Task DeleteCampaignAsync(Guid id)
    {
        var campaign = await _context.HealthCheckupCampaigns.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt khám");
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
        if (string.IsNullOrWhiteSpace(dto.GroupName))
            throw new ArgumentException("Tên nhóm là bắt buộc", nameof(dto.GroupName));
        var campaignExists = await _context.HealthCheckupCampaigns
            .AnyAsync(c => c.Id == dto.CampaignId && !c.IsDeleted);
        if (!campaignExists)
            throw new KeyNotFoundException("Không tìm thấy đợt khám");

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
        var campaign = await _context.HealthCheckupCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt khám");

        // QA-R10: a real .xlsx (ZIP bytes) used to be read line-by-line as text and created one junk
        // "employee" per binary line; a quoted "Nguyễn, Văn A" split into two columns; re-importing the
        // same list doubled the campaign. CsvUtil rejects binaries/non-UTF-8 and parses quotes properly.
        var records = Export.CsvUtil.ReadRecords(await Export.CsvUtil.ReadTextAsync(fileStream));
        if (records.Count < 2)
            throw new InvalidOperationException("Tệp rỗng hoặc chỉ có dòng tiêu đề (cột: Họ tên, Mã NV, Phòng ban/Nhóm).");

        static string Fold(string s)
        {
            var d = s.Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(System.Text.NormalizationForm.FormD);
            return new string(d.Where(ch => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch)
                != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
        }

        int nameIndex = -1, codeIndex = -1, groupIndex = -1;
        var header = records[0].Cells;
        for (int i = 0; i < header.Count; i++)
        {
            var h = Fold(header[i]);
            if (codeIndex < 0 && (h.Contains("ma nv") || h.Contains("manv") || h.Contains("ma nhan vien") || h.Contains("employee code") || h == "code")) codeIndex = i;
            else if (groupIndex < 0 && (h.Contains("phong") || h.Contains("ban") || h.Contains("nhom") || h.Contains("group") || h.Contains("department"))) groupIndex = i;
            else if (nameIndex < 0 && (h.Contains("ten") || h.Contains("name"))) nameIndex = i;
        }
        if (nameIndex < 0)
            throw new InvalidOperationException("Không tìm thấy cột Họ tên trong dòng tiêu đề.");

        var existingCodes = (await _context.HealthCheckupRecords
                .Where(r => r.CampaignId == campaignId && !r.IsDeleted && r.EmployeeCode != null)
                .Select(r => r.EmployeeCode!)
                .ToListAsync())
            .Select(c => c.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var (lineNumber, fields) in records.Skip(1))
        {
            result.TotalRows++;
            var employeeName = Export.CsvUtil.Get(fields, nameIndex);
            var employeeCode = Export.CsvUtil.Get(fields, codeIndex);
            if (string.IsNullOrWhiteSpace(employeeName))
            {
                result.ErrorCount++;
                result.Errors.Add($"Dòng {lineNumber}: Thiếu họ tên");
                continue;
            }
            if (employeeCode.Length > 0 && !existingCodes.Add(employeeCode))
            {
                result.ErrorCount++;
                result.Errors.Add($"Dòng {lineNumber}: Mã NV '{employeeCode}' đã có trong đợt khám (hoặc trùng dòng trước)");
                continue;
            }

            _context.HealthCheckupRecords.Add(new HIS.Core.Entities.HealthCheckupRecord
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                EmployeeName = employeeName,
                EmployeeCode = employeeCode.Length > 0 ? employeeCode : null,
                Department = Export.CsvUtil.Get(fields, groupIndex),
                CheckupDate = DateTime.Today,
                CreatedAt = DateTime.UtcNow,
            });
            result.SuccessCount++;
        }

        if (result.SuccessCount > 0)
        {
            campaign.TotalRegistered += result.SuccessCount;
            await _context.SaveChangesAsync();
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
