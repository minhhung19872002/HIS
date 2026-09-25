using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class PopulationHealthServiceImpl : IPopulationHealthService
{
    private readonly HISDbContext _context;

    public PopulationHealthServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<PopulationRecordDto>> SearchRecordsAsync(PopulationRecordSearchDto? filter = null)
    {
        try
        {
            var query = _context.PopulationRecords.Where(r => !r.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(r =>
                        r.RecordCode.ToLower().Contains(kw) ||
                        (r.PatientName != null && r.PatientName.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.RecordType))
                    query = query.Where(r => r.RecordType == filter.RecordType);
                if (filter.Status.HasValue)
                    query = query.Where(r => r.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(r => r.ServiceDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                {
                    var toExclusive = to.Date.AddDays(1); // QA-R11: inclusive end day, no next-midnight leak
                    query = query.Where(r => r.ServiceDate < toExclusive);
                }
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .ThenBy(r => r.Id)
                .Take(200)
                .Select(r => new PopulationRecordDto
                {
                    Id = r.Id,
                    RecordCode = r.RecordCode,
                    RecordType = r.RecordType,
                    PatientId = r.PatientId,
                    PatientName = r.PatientName,
                    DateOfBirth = r.DateOfBirth.HasValue ? r.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Gender = r.Gender,
                    Ward = r.Ward,
                    District = r.District,
                    ServiceDate = r.ServiceDate.HasValue ? r.ServiceDate.Value.ToString("yyyy-MM-dd") : null,
                    ServiceType = r.ServiceType,
                    Provider = r.Provider,
                    FacilityName = r.FacilityName,
                    FollowUpDate = r.FollowUpDate.HasValue ? r.FollowUpDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = r.Status,
                    Notes = r.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<PopulationRecordDto>(); }
    }

    public async Task<PopulationRecordDto> CreateRecordAsync(CreatePopulationRecordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            throw new ArgumentException("Chưa nhập họ tên.", nameof(dto.PatientName));
        if (dto.Status is < 0 or > 2)
            throw new ArgumentException("Trạng thái hồ sơ không hợp lệ.", nameof(dto.Status));
        var year = DateTime.UtcNow.Year;
        var count = await _context.PopulationRecords.CountAsync(r => r.CreatedAt.Year == year) + 1;

        var entity = new PopulationRecord
        {
            Id = Guid.NewGuid(),
            RecordCode = $"DS-{year}-{count:D4}",
            RecordType = dto.RecordType ?? "population_survey",
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            Ward = dto.Ward,
            District = dto.District,
            ServiceDate = DateTime.TryParse(dto.ServiceDate, out var sd) ? sd : DateTime.UtcNow,
            ServiceType = dto.ServiceType,
            Provider = dto.Provider,
            FacilityName = dto.FacilityName,
            FollowUpDate = DateTime.TryParse(dto.FollowUpDate, out var fd) ? fd : null,
            Notes = dto.Notes,
            Status = dto.Status ?? 0,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PopulationRecords.Add(entity);
        await _context.SaveChangesAsync();

        return new PopulationRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, RecordType = entity.RecordType, PatientName = entity.PatientName, Status = entity.Status };
    }

    public async Task<PopulationRecordDto> UpdateRecordAsync(Guid id, CreatePopulationRecordDto dto)
    {
        var entity = await _context.PopulationRecords.FindAsync(id);
        if (entity == null || entity.IsDeleted) throw new KeyNotFoundException("Không tìm thấy hồ sơ dân số.");
        if (dto.Status is < 0 or > 2)
            throw new ArgumentException("Trạng thái hồ sơ không hợp lệ.", nameof(dto.Status));
        if (dto.PatientName != null && dto.PatientName.Trim().Length == 0)
            throw new ArgumentException("Họ tên không được để trống.", nameof(dto.PatientName));

        if (dto.RecordType != null) entity.RecordType = dto.RecordType;
        if (dto.PatientName != null) entity.PatientName = dto.PatientName;
        if (dto.ServiceType != null) entity.ServiceType = dto.ServiceType;
        if (dto.Provider != null) entity.Provider = dto.Provider;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (DateTime.TryParse(dto.FollowUpDate, out var fd)) entity.FollowUpDate = fd;
        // QA-R11: the v2 edit form sends these, but only the fields above were saved (silent no-op on
        // trạng thái / giới / ngày sinh / địa chỉ / đơn vị QL / ngày khám).
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.Gender.HasValue) entity.Gender = dto.Gender.Value;
        if (DateTime.TryParse(dto.DateOfBirth, out var dob)) entity.DateOfBirth = dob;
        if (dto.Ward != null) entity.Ward = dto.Ward;
        if (dto.District != null) entity.District = dto.District;
        if (dto.FacilityName != null) entity.FacilityName = dto.FacilityName;
        if (DateTime.TryParse(dto.ServiceDate, out var sd)) entity.ServiceDate = sd;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PopulationRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, RecordType = entity.RecordType, PatientName = entity.PatientName, Status = entity.Status };
    }

    public async Task<PopulationHealthStatsDto> GetStatsAsync()
    {
        try
        {
            var records = await _context.PopulationRecords.Where(r => !r.IsDeleted).ToListAsync();
            var todayVn = HIS.Core.Common.VnTime.TodayVn;
            var monthStart = new DateTime(todayVn.Year, todayVn.Month, 1);
            return new PopulationHealthStatsDto
            {
                TotalRecords = records.Count,
                FamilyPlanningActive = records.Count(r => r.RecordType == "family_planning" && r.Status == 0),
                BirthReportsThisMonth = records.Count(r => (r.RecordType == "birth_report" || r.RecordType == "birth")
                    && r.ServiceDate.HasValue && r.ServiceDate.Value >= monthStart && r.ServiceDate.Value < monthStart.AddMonths(1)),
                FamilyPlanningCount = records.Count(r => r.RecordType == "family_planning"),
                ElderlyCareCount = records.Count(r => r.RecordType == "elderly_care"),
                BirthReportCount = records.Count(r => r.RecordType == "birth_report"),
                SurveyCount = records.Count(r => r.RecordType == "population_survey"),
                RecordTypeBreakdown = records.GroupBy(r => r.RecordType)
                    .Select(g => new PopulationRecordTypeBreakdownDto { RecordType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new PopulationHealthStatsDto(); }
    }

    public async Task<ElderlyStatsDto> GetElderlyStatsAsync()
    {
        try
        {
            var records = await _context.PopulationRecords
                .Where(r => !r.IsDeleted && r.RecordType == "elderly_care")
                .ToListAsync();
            var now = DateTime.UtcNow;

            return new ElderlyStatsDto
            {
                TotalElderlyRecords = records.Count,
                ActiveCount = records.Count(r => r.Status == 0),
                CompletedCount = records.Count(r => r.Status == 1),
                OverdueFollowUp = records.Count(r => r.Status == 0 && r.FollowUpDate.HasValue && r.FollowUpDate.Value < now),
            };
        }
        catch { return new ElderlyStatsDto(); }
    }
}
