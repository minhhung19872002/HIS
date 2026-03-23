using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class EnvironmentalHealthService : IEnvironmentalHealthService
{
    private readonly HISDbContext _context;

    public EnvironmentalHealthService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<WasteRecordDto>> SearchWasteRecordsAsync(WasteRecordSearchDto? filter = null)
    {
        try
        {
            var query = _context.WasteRecords.Where(r => !r.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(r =>
                        r.RecordCode.ToLower().Contains(kw) ||
                        (r.DepartmentName != null && r.DepartmentName.ToLower().Contains(kw)) ||
                        (r.CollectorName != null && r.CollectorName.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.WasteType))
                    query = query.Where(r => r.WasteType == filter.WasteType);
                if (filter.Status.HasValue)
                    query = query.Where(r => r.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(r => r.RecordDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(r => r.RecordDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(r => r.RecordDate)
                .Take(200)
                .Select(r => new WasteRecordDto
                {
                    Id = r.Id,
                    RecordCode = r.RecordCode,
                    RecordDate = r.RecordDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                    WasteType = r.WasteType,
                    Quantity = r.Quantity,
                    DisposalMethod = r.DisposalMethod,
                    DisposalDate = r.DisposalDate.HasValue ? r.DisposalDate.Value.ToString("yyyy-MM-dd") : null,
                    DisposedBy = r.DisposedBy,
                    CollectorName = r.CollectorName,
                    CollectorLicense = r.CollectorLicense,
                    DepartmentName = r.DepartmentName,
                    Notes = r.Notes,
                    Status = r.Status,
                })
                .ToListAsync();
        }
        catch { return new List<WasteRecordDto>(); }
    }

    public async Task<WasteRecordDto> CreateWasteRecordAsync(CreateWasteRecordDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.WasteRecords.CountAsync(r => r.CreatedAt.Year == year) + 1;

        var entity = new WasteRecord
        {
            Id = Guid.NewGuid(),
            RecordCode = $"RT-{year}-{count:D4}",
            RecordDate = DateTime.TryParse(dto.RecordDate, out var rd) ? rd : DateTime.UtcNow,
            WasteType = dto.WasteType ?? "general",
            Quantity = dto.Quantity ?? 0,
            DisposalMethod = dto.DisposalMethod,
            CollectorName = dto.CollectorName,
            CollectorLicense = dto.CollectorLicense,
            DepartmentId = dto.DepartmentId,
            DepartmentName = dto.DepartmentName,
            Notes = dto.Notes,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
        };

        _context.WasteRecords.Add(entity);
        await _context.SaveChangesAsync();

        return new WasteRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, WasteType = entity.WasteType, Quantity = entity.Quantity, Status = entity.Status };
    }

    public async Task<WasteRecordDto> UpdateWasteRecordAsync(Guid id, CreateWasteRecordDto dto)
    {
        var entity = await _context.WasteRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Waste record not found");

        if (dto.WasteType != null) entity.WasteType = dto.WasteType;
        if (dto.Quantity.HasValue) entity.Quantity = dto.Quantity.Value;
        if (dto.DisposalMethod != null) entity.DisposalMethod = dto.DisposalMethod;
        if (dto.CollectorName != null) entity.CollectorName = dto.CollectorName;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new WasteRecordDto { Id = entity.Id, RecordCode = entity.RecordCode, WasteType = entity.WasteType, Quantity = entity.Quantity, Status = entity.Status };
    }

    public async Task<List<EnvironmentalMonitoringDto>> SearchMonitoringAsync(EnvironmentalMonitoringSearchDto? filter = null)
    {
        try
        {
            var query = _context.EnvironmentalMonitorings.Where(m => !m.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(m =>
                        m.MonitoringCode.ToLower().Contains(kw) ||
                        (m.Location != null && m.Location.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.MonitoringType))
                    query = query.Where(m => m.MonitoringType == filter.MonitoringType);
                if (filter.IsCompliant.HasValue)
                    query = query.Where(m => m.IsCompliant == filter.IsCompliant.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(m => m.MonitoringDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(m => m.MonitoringDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(m => m.MonitoringDate)
                .Take(200)
                .Select(m => new EnvironmentalMonitoringDto
                {
                    Id = m.Id,
                    MonitoringCode = m.MonitoringCode,
                    MonitoringDate = m.MonitoringDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                    MonitoringType = m.MonitoringType,
                    Location = m.Location,
                    MeasuredValue = m.MeasuredValue,
                    Unit = m.Unit,
                    StandardLimit = m.StandardLimit,
                    IsCompliant = m.IsCompliant,
                    InstrumentUsed = m.InstrumentUsed,
                    MeasuredBy = m.MeasuredBy,
                    Notes = m.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<EnvironmentalMonitoringDto>(); }
    }

    public async Task<EnvironmentalMonitoringDto> CreateMonitoringAsync(CreateEnvironmentalMonitoringDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.EnvironmentalMonitorings.CountAsync(m => m.CreatedAt.Year == year) + 1;

        var measuredValue = dto.MeasuredValue ?? 0;
        var standardLimit = dto.StandardLimit;
        var isCompliant = standardLimit.HasValue ? measuredValue <= standardLimit.Value : true;

        var entity = new EnvironmentalMonitoring
        {
            Id = Guid.NewGuid(),
            MonitoringCode = $"GS-{year}-{count:D4}",
            MonitoringDate = DateTime.TryParse(dto.MonitoringDate, out var md) ? md : DateTime.UtcNow,
            MonitoringType = dto.MonitoringType ?? "air",
            Location = dto.Location,
            MeasuredValue = measuredValue,
            Unit = dto.Unit,
            StandardLimit = standardLimit,
            IsCompliant = isCompliant,
            InstrumentUsed = dto.InstrumentUsed,
            MeasuredBy = dto.MeasuredBy,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.EnvironmentalMonitorings.Add(entity);
        await _context.SaveChangesAsync();

        return new EnvironmentalMonitoringDto
        {
            Id = entity.Id,
            MonitoringCode = entity.MonitoringCode,
            MonitoringType = entity.MonitoringType,
            MeasuredValue = entity.MeasuredValue,
            IsCompliant = entity.IsCompliant,
        };
    }

    public async Task<WasteStatsDto> GetWasteStatsAsync()
    {
        try
        {
            var records = await _context.WasteRecords.Where(r => !r.IsDeleted).ToListAsync();
            return new WasteStatsDto
            {
                TotalRecords = records.Count,
                TotalQuantityKg = records.Sum(r => r.Quantity),
                PendingDisposal = records.Count(r => r.Status <= 1),
                DisposedCount = records.Count(r => r.Status >= 2),
                WasteTypeBreakdown = records.GroupBy(r => r.WasteType)
                    .Select(g => new WasteTypeBreakdownDto { WasteType = g.Key, Count = g.Count(), TotalKg = g.Sum(r => r.Quantity) })
                    .ToList(),
            };
        }
        catch { return new WasteStatsDto(); }
    }

    public async Task<MonitoringStatsDto> GetMonitoringStatsAsync()
    {
        try
        {
            var records = await _context.EnvironmentalMonitorings.Where(m => !m.IsDeleted).ToListAsync();
            var total = records.Count;
            var compliant = records.Count(m => m.IsCompliant);
            return new MonitoringStatsDto
            {
                TotalMeasurements = total,
                CompliantCount = compliant,
                NonCompliantCount = total - compliant,
                ComplianceRate = total > 0 ? Math.Round((double)compliant / total * 100, 1) : 0,
                MonitoringTypeBreakdown = records.GroupBy(m => m.MonitoringType)
                    .Select(g => new MonitoringTypeBreakdownDto { MonitoringType = g.Key, Count = g.Count(), CompliantCount = g.Count(m => m.IsCompliant) })
                    .ToList(),
            };
        }
        catch { return new MonitoringStatsDto(); }
    }

    public async Task<BiosafetyStatusDto> GetBiosafetyStatusAsync()
    {
        try
        {
            var wasteRecords = await _context.WasteRecords.Where(r => !r.IsDeleted).ToListAsync();
            var monitoringRecords = await _context.EnvironmentalMonitorings.Where(m => !m.IsDeleted).ToListAsync();

            var pendingWaste = wasteRecords.Count(r => r.Status <= 1);
            var nonCompliant = monitoringRecords.Count(m => !m.IsCompliant);

            var wasteTotal = wasteRecords.Count;
            var wasteDisposed = wasteRecords.Count(r => r.Status >= 2);
            var wasteRate = wasteTotal > 0 ? Math.Round((double)wasteDisposed / wasteTotal * 100, 1) : 100;

            var monTotal = monitoringRecords.Count;
            var monCompliant = monitoringRecords.Count(m => m.IsCompliant);
            var monRate = monTotal > 0 ? Math.Round((double)monCompliant / monTotal * 100, 1) : 100;

            var overallStatus = (wasteRate >= 90 && monRate >= 90) ? "good"
                : (wasteRate >= 70 && monRate >= 70) ? "warning" : "critical";

            return new BiosafetyStatusDto
            {
                WasteComplianceRate = wasteRate,
                EnvironmentalComplianceRate = monRate,
                PendingWasteDisposal = pendingWaste,
                NonCompliantMonitoring = nonCompliant,
                OverallStatus = overallStatus,
            };
        }
        catch { return new BiosafetyStatusDto { OverallStatus = "unknown" }; }
    }
}
