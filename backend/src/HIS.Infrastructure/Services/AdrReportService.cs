using HIS.Application.DTOs.Adr;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// ADR module (#5 #55-59): CRUD phiếu báo cáo phản ứng có hại của thuốc.
/// Soft-delete via IsDeleted. CreatedBy/UpdatedBy = string (NVARCHAR, không cần ValueConverter).
/// Materialize ToListAsync() trước, map in-memory — không gọi custom method trong .Select EF.
/// </summary>
public class AdrReportService : IAdrReportService
{
    private readonly HISDbContext _db;

    public AdrReportService(HISDbContext db) => _db = db;

    // ─── Query helper ────────────────────────────────────────────────────────

    private static AdrReportDto MapToDto(AdrReport e) => new()
    {
        Id                  = e.Id,
        PatientName         = e.PatientName,
        PatientCode         = e.PatientCode,
        PatientAge          = e.PatientAge,
        Gender              = e.Gender,
        Weight              = e.Weight,
        PrescriptionId      = e.PrescriptionId,
        DrugName            = e.DrugName,
        DrugDose            = e.DrugDose,
        DrugRoute           = e.DrugRoute,
        ReactionDescription = e.ReactionDescription,
        ReactionStartDate   = e.ReactionStartDate,
        Severity            = e.Severity,
        Outcome             = e.Outcome,
        ManagementTaken     = e.ManagementTaken,
        Causality           = e.Causality,
        ReporterName        = e.ReporterName,
        ReportDate          = e.ReportDate,
        Notes               = e.Notes,
        CreatedAt           = e.CreatedAt,
    };

    // ─── GetAdrReportsAsync ──────────────────────────────────────────────────

    public async Task<List<AdrReportDto>> GetAdrReportsAsync(DateTime? from, DateTime? to, string? keyword)
    {
        var q = _db.AdrReports.Where(r => !r.IsDeleted);

        if (from.HasValue)
            q = q.Where(r => r.ReportDate >= from.Value);
        if (to.HasValue)
            q = q.Where(r => r.ReportDate <= to.Value.Date.AddDays(1).AddTicks(-1));
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(r =>
                r.PatientName.Contains(kw)     ||
                (r.PatientCode != null && r.PatientCode.Contains(kw)) ||
                r.DrugName.Contains(kw)        ||
                r.ReactionDescription.Contains(kw));
        }

        // Materialize trước, map in-memory (tránh lỗi EF translation với custom method)
        var entities = await q
            .OrderByDescending(r => r.ReportDate)
            .ToBoundedListAsync("AdrReport.GetAdrReports");

        return entities.Select(MapToDto).ToList();
    }

    // ─── SaveAdrReportAsync ──────────────────────────────────────────────────

    public async Task<AdrReportDto> SaveAdrReportAsync(AdrReportDto dto, string? userId)
    {
        // Validate bắt buộc
        if (string.IsNullOrWhiteSpace(dto.DrugName))
            throw new InvalidOperationException("Tên thuốc nghi ngờ (DrugName) là bắt buộc.");
        if (string.IsNullOrWhiteSpace(dto.ReactionDescription))
            throw new InvalidOperationException("Mô tả phản ứng (ReactionDescription) là bắt buộc.");

        AdrReport entity;

        if (dto.Id == Guid.Empty)
        {
            entity = new AdrReport
            {
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };
            _db.AdrReports.Add(entity);
        }
        else
        {
            entity = await _db.AdrReports.FirstAsync(r => r.Id == dto.Id && !r.IsDeleted);
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }

        // Map fields
        entity.PatientName         = dto.PatientName;
        entity.PatientCode         = dto.PatientCode;
        entity.PatientAge          = dto.PatientAge;
        entity.Gender              = dto.Gender;
        entity.Weight              = dto.Weight;
        entity.PrescriptionId      = dto.PrescriptionId;
        entity.DrugName            = dto.DrugName.Trim();
        entity.DrugDose            = dto.DrugDose;
        entity.DrugRoute           = dto.DrugRoute;
        entity.ReactionDescription = dto.ReactionDescription.Trim();
        entity.ReactionStartDate   = dto.ReactionStartDate;
        entity.Severity            = dto.Severity;
        entity.Outcome             = dto.Outcome;
        entity.ManagementTaken     = dto.ManagementTaken;
        entity.Causality           = dto.Causality;
        entity.ReporterName        = dto.ReporterName;
        entity.ReportDate          = dto.ReportDate == default ? DateTime.UtcNow : dto.ReportDate;
        entity.Notes               = dto.Notes;

        await _db.SaveChangesAsync();
        dto.Id        = entity.Id;
        dto.CreatedAt = entity.CreatedAt;
        return dto;
    }

    // ─── DeleteAdrReportAsync ────────────────────────────────────────────────

    public async Task<bool> DeleteAdrReportAsync(Guid id, string? userId)
    {
        var entity = await _db.AdrReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted  = true;
        entity.UpdatedAt  = DateTime.UtcNow;
        entity.UpdatedBy  = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── GetReportSummaryAsync ───────────────────────────────────────────────

    public async Task<AdrReportSummaryDto> GetReportSummaryAsync(DateTime? from, DateTime? to)
    {
        var q = _db.AdrReports.Where(r => !r.IsDeleted);

        if (from.HasValue)
            q = q.Where(r => r.ReportDate >= from.Value);
        if (to.HasValue)
            q = q.Where(r => r.ReportDate <= to.Value.Date.AddDays(1).AddTicks(-1));

        // Materialize, group in-memory
        var rows = await q.Select(r => r.Severity).ToListAsync();

        return new AdrReportSummaryDto
        {
            TotalReports    = rows.Count,
            SeverityMild    = rows.Count(s => s == 1),
            SeverityModerate = rows.Count(s => s == 2),
            SeveritySevere  = rows.Count(s => s == 3),
            SeverityCritical = rows.Count(s => s == 4),
            FromDate        = from,
            ToDate          = to,
        };
    }
}
