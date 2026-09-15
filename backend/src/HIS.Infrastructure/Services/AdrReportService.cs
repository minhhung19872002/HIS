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
        // QA-R3: the pharmacy ADR tab only asks for the patient code — take name/age/gender from the
        // patient record when the code matches one (never overrides what the user typed).
        if (string.IsNullOrWhiteSpace(dto.PatientName) && !string.IsNullOrWhiteSpace(dto.PatientCode))
        {
            var code = dto.PatientCode.Trim();
            var p = await _db.Patients.AsNoTracking()
                .Where(x => x.PatientCode == code && !x.IsDeleted)
                .Select(x => new { x.FullName, x.DateOfBirth, x.YearOfBirth, x.Gender })
                .FirstOrDefaultAsync();
            if (p != null)
            {
                dto.PatientName = p.FullName;
                var birthYear = p.DateOfBirth?.Year ?? p.YearOfBirth;
                if (string.IsNullOrWhiteSpace(dto.PatientAge) && birthYear.HasValue)
                    dto.PatientAge = (DateTime.Now.Year - birthYear.Value).ToString();
                if (dto.Gender == 0 && (p.Gender == 1 || p.Gender == 2)) dto.Gender = p.Gender;
            }
        }
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            throw new InvalidOperationException("Tên bệnh nhân là bắt buộc (hoặc nhập đúng mã bệnh nhân có trong hệ thống).");
        // Severity outside 1-4 was stored and then silently dropped from every bucket of the summary report.
        if (dto.Severity < 1 || dto.Severity > 4)
            throw new InvalidOperationException("Mức độ nghiêm trọng phải từ 1 đến 4.");

        // The v2 form sends toISOString() (UTC 'Z'); the rest of HIS stores VN local time and the from/to filters
        // compare local calendar days, so a report made at 06:30 on the 15th landed on the 14th.
        static DateTime ToLocal(DateTime d) => d.Kind == DateTimeKind.Utc ? d.ToLocalTime() : d;
        dto.ReactionStartDate = ToLocal(dto.ReactionStartDate);
        dto.ReportDate = dto.ReportDate == default ? DateTime.Now : ToLocal(dto.ReportDate);
        if (dto.ReactionStartDate > DateTime.Now.AddMinutes(5))
            throw new InvalidOperationException("Ngày khởi phát phản ứng không được ở tương lai.");

        // Guard against linking the report to the wrong patient: a PatientCode that exists in HIS must belong
        // to the entered patient name, and a PrescriptionId must be a prescription of that same patient.
        if (!string.IsNullOrWhiteSpace(dto.PatientCode))
        {
            var code = dto.PatientCode.Trim();
            var patient = await _db.Patients.AsNoTracking()
                .Where(p => p.PatientCode == code)
                .Select(p => new { p.Id, p.FullName })
                .FirstOrDefaultAsync();
            if (patient != null && !string.Equals(patient.FullName?.Trim(), dto.PatientName.Trim(), StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Mã BN {code} thuộc bệnh nhân khác ({patient.FullName}) — kiểm tra lại mã/tên bệnh nhân.");
            if (patient != null && dto.PrescriptionId.HasValue)
            {
                var rxOfPatient = await _db.Prescriptions.AsNoTracking()
                    .AnyAsync(rx => rx.Id == dto.PrescriptionId.Value && rx.MedicalRecord != null && rx.MedicalRecord.PatientId == patient.Id);
                if (!rxOfPatient)
                    throw new InvalidOperationException("Đơn thuốc không thuộc bệnh nhân này.");
            }
        }

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
            entity = await _db.AdrReports.FirstOrDefaultAsync(r => r.Id == dto.Id && !r.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu ADR");
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
        entity.ReportDate          = dto.ReportDate;
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
