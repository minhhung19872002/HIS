using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class EpidemiologyService : IEpidemiologyService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public EpidemiologyService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> ClassificationNames = new()
    {
        { 0, "Nghi ngờ" }, { 1, "Có thể" }, { 2, "Xác nhận" }
    };

    private static readonly Dictionary<int, string> OutcomeNames = new()
    {
        { 0, "Đang hồi phục" }, { 1, "Đã hồi phục" }, { 2, "Tử vong" }, { 3, "Không rõ" }
    };

    private static readonly Dictionary<int, string> QuarantineNames = new()
    {
        { 0, "Không" }, { 1, "Cách ly tại nhà" }, { 2, "Cách ly tập trung" }, { 3, "Hoàn thành" }
    };

    public async Task<DiseaseCasePagedResult> GetCasesAsync(DiseaseCaseSearchDto filter)
    {
        var query = _context.DiseaseCases
            .Include(d => d.Investigator)
            .Include(d => d.ContactTraces)
            .Where(d => !d.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(d =>
                d.PatientName.ToLower().Contains(kw) ||
                d.DiseaseName.ToLower().Contains(kw) ||
                (d.IcdCode != null && d.IcdCode.ToLower().Contains(kw)) ||
                (d.Location != null && d.Location.ToLower().Contains(kw)));
        }

        if (filter.Classification.HasValue)
            query = query.Where(d => d.Classification == filter.Classification.Value);

        if (filter.Outcome.HasValue)
            query = query.Where(d => d.Outcome == filter.Outcome.Value);

        if (!string.IsNullOrWhiteSpace(filter.DiseaseName))
            query = query.Where(d => d.DiseaseName.Contains(filter.DiseaseName));

        if (filter.IsOutbreak.HasValue)
            query = query.Where(d => d.IsOutbreak == filter.IsOutbreak.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(d => d.ReportDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(d => d.ReportDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.ReportDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(d => new DiseaseCaseListDto
            {
                Id = d.Id,
                PatientId = d.PatientId,
                PatientName = d.PatientName,
                PatientAge = d.PatientAge,
                PatientGender = d.PatientGender,
                DiseaseName = d.DiseaseName,
                IcdCode = d.IcdCode,
                OnsetDate = d.OnsetDate,
                ReportDate = d.ReportDate,
                Classification = d.Classification,
                Outcome = d.Outcome,
                InvestigatorName = d.Investigator != null ? d.Investigator.FullName : null,
                Location = d.Location,
                IsOutbreak = d.IsOutbreak,
                OutbreakId = d.OutbreakId,
                ContactCount = d.ContactTraces.Count(c => !c.IsDeleted),
                Notes = d.Notes,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.ClassificationName = ClassificationNames.GetValueOrDefault(item.Classification);
            item.OutcomeName = OutcomeNames.GetValueOrDefault(item.Outcome);
        }

        return new DiseaseCasePagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<DiseaseCaseListDto> CreateCaseAsync(CreateDiseaseCaseDto dto)
    {
        var entity = new DiseaseCase
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientAge = dto.PatientAge,
            PatientGender = dto.PatientGender,
            DiseaseName = dto.DiseaseName,
            IcdCode = dto.IcdCode,
            OnsetDate = dto.OnsetDate,
            ReportDate = dto.ReportDate,
            Classification = dto.Classification,
            Outcome = dto.Outcome,
            InvestigatorId = dto.InvestigatorId,
            Location = dto.Location,
            Address = dto.Address,
            Notes = dto.Notes,
            IsOutbreak = dto.IsOutbreak,
            OutbreakId = dto.OutbreakId,
            CreatedAt = DateTime.UtcNow
        };

        await _context.DiseaseCases.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new DiseaseCaseListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            PatientAge = entity.PatientAge,
            PatientGender = entity.PatientGender,
            DiseaseName = entity.DiseaseName,
            IcdCode = entity.IcdCode,
            OnsetDate = entity.OnsetDate,
            ReportDate = entity.ReportDate,
            Classification = entity.Classification,
            ClassificationName = ClassificationNames.GetValueOrDefault(entity.Classification),
            Outcome = entity.Outcome,
            OutcomeName = OutcomeNames.GetValueOrDefault(entity.Outcome),
            Location = entity.Location,
            IsOutbreak = entity.IsOutbreak,
            OutbreakId = entity.OutbreakId,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<DiseaseCaseListDto> UpdateCaseAsync(Guid id, UpdateDiseaseCaseDto dto)
    {
        var entity = await _context.DiseaseCases
            .Include(d => d.Investigator)
            .Include(d => d.ContactTraces)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca bệnh");

        if (dto.Classification.HasValue) entity.Classification = dto.Classification.Value;
        if (dto.Outcome.HasValue) entity.Outcome = dto.Outcome.Value;
        if (dto.LabTestResult != null) entity.LabTestResult = dto.LabTestResult;
        if (dto.LabTestDate.HasValue) entity.LabTestDate = dto.LabTestDate;
        if (dto.TreatmentSummary != null) entity.TreatmentSummary = dto.TreatmentSummary;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (dto.IsOutbreak.HasValue) entity.IsOutbreak = dto.IsOutbreak.Value;
        if (dto.OutbreakId != null) entity.OutbreakId = dto.OutbreakId;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new DiseaseCaseListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            PatientAge = entity.PatientAge,
            PatientGender = entity.PatientGender,
            DiseaseName = entity.DiseaseName,
            IcdCode = entity.IcdCode,
            OnsetDate = entity.OnsetDate,
            ReportDate = entity.ReportDate,
            Classification = entity.Classification,
            ClassificationName = ClassificationNames.GetValueOrDefault(entity.Classification),
            Outcome = entity.Outcome,
            OutcomeName = OutcomeNames.GetValueOrDefault(entity.Outcome),
            InvestigatorName = entity.Investigator?.FullName,
            Location = entity.Location,
            IsOutbreak = entity.IsOutbreak,
            OutbreakId = entity.OutbreakId,
            ContactCount = entity.ContactTraces.Count(c => !c.IsDeleted),
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<ContactTraceDto>> AddContactTraceAsync(Guid caseId, CreateContactTraceDto dto)
    {
        var diseaseCase = await _context.DiseaseCases
            .FirstOrDefaultAsync(d => d.Id == caseId && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca bệnh");

        var entity = new ContactTrace
        {
            Id = Guid.NewGuid(),
            DiseaseCaseId = caseId,
            ContactName = dto.ContactName,
            ContactPhone = dto.ContactPhone,
            Relationship = dto.Relationship,
            ExposureDate = dto.ExposureDate,
            ExposureType = dto.ExposureType,
            QuarantineStatus = dto.QuarantineStatus,
            TestResult = dto.TestResult,
            TestDate = dto.TestDate,
            Address = dto.Address,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactTraces.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return await GetContactsByCaseIdAsync(caseId);
    }

    public async Task<List<ContactTraceDto>> GetContactsByCaseIdAsync(Guid caseId)
    {
        return await _context.ContactTraces
            .Where(c => c.DiseaseCaseId == caseId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ContactTraceDto
            {
                Id = c.Id,
                DiseaseCaseId = c.DiseaseCaseId,
                ContactName = c.ContactName,
                ContactPhone = c.ContactPhone,
                Relationship = c.Relationship,
                ExposureDate = c.ExposureDate,
                ExposureType = c.ExposureType,
                QuarantineStatus = c.QuarantineStatus,
                QuarantineStatusName = QuarantineNames.GetValueOrDefault(c.QuarantineStatus),
                TestResult = c.TestResult,
                TestDate = c.TestDate,
                Address = c.Address,
                Notes = c.Notes,
                IsSymptomDeveloped = c.IsSymptomDeveloped,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<EpidemiologyDashboardDto> GetDashboardAsync()
    {
        var query = _context.DiseaseCases.Where(d => !d.IsDeleted);
        var thisWeek = DateTime.Today.AddDays(-7);
        var thisMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);

        var byDisease = await query
            .GroupBy(d => d.DiseaseName)
            .Select(g => new DiseaseCountDto
            {
                DiseaseName = g.Key,
                TotalCases = g.Count(),
                ConfirmedCases = g.Count(x => x.Classification == 2),
                Deaths = g.Count(x => x.Outcome == 2)
            })
            .OrderByDescending(x => x.TotalCases)
            .Take(15)
            .ToListAsync();

        var activeOutbreaks = await query
            .Where(d => d.IsOutbreak && d.OutbreakId != null)
            .GroupBy(d => d.OutbreakId!)
            .Select(g => new OutbreakSummaryDto
            {
                OutbreakId = g.Key,
                DiseaseName = g.OrderByDescending(x => x.ReportDate).Select(x => x.DiseaseName).FirstOrDefault(),
                Location = g.OrderByDescending(x => x.ReportDate).Select(x => x.Location).FirstOrDefault(),
                CaseCount = g.Count(),
                FirstCaseDate = g.Min(x => x.ReportDate),
                LatestCaseDate = g.Max(x => x.ReportDate)
            })
            .OrderByDescending(x => x.LatestCaseDate)
            .ToListAsync();

        return new EpidemiologyDashboardDto
        {
            TotalCases = await query.CountAsync(),
            SuspectedCases = await query.CountAsync(d => d.Classification == 0),
            ConfirmedCases = await query.CountAsync(d => d.Classification == 2),
            ActiveOutbreaks = activeOutbreaks.Count,
            TotalDeaths = await query.CountAsync(d => d.Outcome == 2),
            CasesThisWeek = await query.CountAsync(d => d.ReportDate >= thisWeek),
            CasesThisMonth = await query.CountAsync(d => d.ReportDate >= thisMonth),
            ByDisease = byDisease,
            ActiveOutbreakList = activeOutbreaks
        };
    }

    public async Task<List<OutbreakSummaryDto>> GetOutbreaksAsync()
    {
        return await _context.DiseaseCases
            .Where(d => !d.IsDeleted && d.IsOutbreak && d.OutbreakId != null)
            .GroupBy(d => d.OutbreakId!)
            .Select(g => new OutbreakSummaryDto
            {
                OutbreakId = g.Key,
                DiseaseName = g.OrderByDescending(x => x.ReportDate).Select(x => x.DiseaseName).FirstOrDefault(),
                Location = g.OrderByDescending(x => x.ReportDate).Select(x => x.Location).FirstOrDefault(),
                CaseCount = g.Count(),
                FirstCaseDate = g.Min(x => x.ReportDate),
                LatestCaseDate = g.Max(x => x.ReportDate)
            })
            .OrderByDescending(x => x.LatestCaseDate)
            .ToListAsync();
    }
}
