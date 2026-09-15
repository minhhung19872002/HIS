using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.ProvincialHealth;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class ProvincialHealthService : IProvincialHealthService
{
    private readonly HISDbContext _db;

    public ProvincialHealthService(HISDbContext db)
    {
        _db = db;
    }

    public async Task<ProvincialReportPagedResult> SearchReportsAsync(ProvincialReportSearchDto search)
    {
        // Build reports from actual hospital data aggregation
        var now = DateTime.Now;
        var reports = new List<ProvincialReportDto>();

        // #195: 4 query gom theo tháng cho cả 6 tháng, thay vì 24 query (mỗi tháng 4 count).
        // Ngăn vẫn đúng bằng tháng dương lịch nên GroupBy(Year, Month) cho kết quả y hệt.
        var windowStart = new DateTime(now.AddMonths(-5).Year, now.AddMonths(-5).Month, 1);
        var windowEnd = new DateTime(now.Year, now.Month, 1).AddMonths(1);

        var outpatientsByMonth = (await _db.Examinations
                .Where(e => e.CreatedAt >= windowStart && e.CreatedAt < windowEnd)
                .GroupBy(e => new { e.CreatedAt.Year, e.CreatedAt.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync())
            .ToDictionary(x => (x.Year, x.Month), x => x.Count);

        var inpatientsByMonth = (await _db.Admissions
                .Where(a => a.AdmissionDate >= windowStart && a.AdmissionDate < windowEnd)
                .GroupBy(a => new { a.AdmissionDate.Year, a.AdmissionDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync())
            .ToDictionary(x => (x.Year, x.Month), x => x.Count);

        // Hai nguồn dưới vẫn bọc try/catch như trước: bảng có thể chưa tồn tại ở môi trường cũ.
        var labTestsByMonth = new Dictionary<(int, int), int>();
        try
        {
            labTestsByMonth = (await _db.ServiceRequests // #14e: model 1
                    .Where(l => l.RequestType == 1 && !l.IsDeleted && l.CreatedAt >= windowStart && l.CreatedAt < windowEnd)
                    .GroupBy(l => new { l.CreatedAt.Year, l.CreatedAt.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => (x.Year, x.Month), x => x.Count);
        }
        catch { }

        var radiologyExamsByMonth = new Dictionary<(int, int), int>();
        try
        {
            radiologyExamsByMonth = (await _db.Set<HIS.Core.Entities.RadiologyRequest>()
                    .Where(r => r.CreatedAt >= windowStart && r.CreatedAt < windowEnd)
                    .GroupBy(r => new { r.CreatedAt.Year, r.CreatedAt.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                    .ToListAsync())
                .ToDictionary(x => (x.Year, x.Month), x => x.Count);
        }
        catch { }

        // Get real data counts for recent months
        for (int i = 0; i < 6; i++)
        {
            var month = now.AddMonths(-i);
            var startOfMonth = new DateTime(month.Year, month.Month, 1);

            var bucket = (month.Year, month.Month);
            outpatientsByMonth.TryGetValue(bucket, out var outpatients);
            inpatientsByMonth.TryGetValue(bucket, out var inpatients);
            labTestsByMonth.TryGetValue(bucket, out var labTests);
            radiologyExamsByMonth.TryGetValue(bucket, out var radiologyExams);

            var report = new ProvincialReportDto
            {
                // Deterministic id per period so GET reports/{id} can find the row again (was a new Guid per call).
                Id = MonthlyReportId(month.Year, month.Month),
                ReportCode = $"BC-{month:yyyyMM}-{(i + 1):D3}",
                ReportType = 3, // Monthly
                ReportPeriod = $"{month:MM/yyyy}",
                FacilityCode = "BV-LC",
                FacilityName = "Bệnh viện Đa khoa",
                TotalOutpatients = outpatients,
                TotalInpatients = inpatients,
                TotalLabTests = labTests,
                TotalRadiologyExams = radiologyExams,
                // No provincial gateway is connected, so nothing has ever been submitted/acknowledged.
                // (Past months used to be reported as "Acknowledged" — a fabricated submission status.)
                Status = 0,
                CreatedAt = startOfMonth.AddDays(25)
            };
            reports.Add(report);
        }

        // Apply filters
        if (search.ReportType.HasValue)
            reports = reports.Where(r => r.ReportType == search.ReportType.Value).ToList();
        if (search.Status.HasValue)
            reports = reports.Where(r => r.Status == search.Status.Value).ToList();
        if (!string.IsNullOrEmpty(search.Keyword))
            reports = reports.Where(r => r.ReportCode.Contains(search.Keyword, StringComparison.OrdinalIgnoreCase)).ToList();

        var totalCount = reports.Count;
        var items = reports.Skip(search.PageIndex * search.PageSize).Take(search.PageSize).ToList();

        return new ProvincialReportPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = search.PageIndex,
            PageSize = search.PageSize
        };
    }

    public async Task<ProvincialReportDto?> GetReportByIdAsync(Guid id)
    {
        var result = await SearchReportsAsync(new ProvincialReportSearchDto { PageIndex = 0, PageSize = 100 });
        return result.Items.FirstOrDefault(r => r.Id == id);
    }

    // Not a real provincial gateway integration yet — every "send/connect" path reports that honestly.
    private const string NotConnectedMessage =
        "Chưa kết nối cổng báo cáo Sở Y tế: báo cáo CHƯA được gửi. Vui lòng xuất báo cáo và nộp theo kênh thủ công.";

    private static Guid MonthlyReportId(int year, int month) =>
        Guid.Parse($"00000000-0000-0000-0000-000000{year:D4}{month:D2}");

    public async Task<ProvincialReportDto> GenerateReportAsync(int reportType, string period, string userId)
    {
        var now = DateTime.Now;
        // Honour the requested period ("MM/yyyy"); it used to be ignored in favour of the current month.
        if (!string.IsNullOrWhiteSpace(period) &&
            DateTime.TryParseExact(period.Trim(), new[] { "MM/yyyy", "M/yyyy", "yyyy-MM" },
                System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var p))
            now = p;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1);

        var outpatients = await _db.Examinations.CountAsync(e => e.CreatedAt >= startOfMonth && e.CreatedAt < endOfMonth);
        var inpatients = await _db.Admissions.CountAsync(a => a.AdmissionDate >= startOfMonth && a.AdmissionDate < endOfMonth);

        return new ProvincialReportDto
        {
            Id = MonthlyReportId(startOfMonth.Year, startOfMonth.Month),
            ReportCode = $"BC-{startOfMonth:yyyyMM}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            ReportType = reportType,
            ReportPeriod = string.IsNullOrWhiteSpace(period) ? $"{startOfMonth:MM/yyyy}" : period,
            FacilityCode = "BV-LC",
            FacilityName = "Bệnh viện Đa khoa",
            TotalOutpatients = outpatients,
            TotalInpatients = inpatients,
            Status = 0,
            CreatedAt = now
        };
    }

    public Task<object> SubmitReportAsync(Guid id, string userId)
    {
        // Was a hard-coded "sent successfully" with nothing transmitted or recorded (fake legal submission).
        throw new InvalidOperationException(NotConnectedMessage);
    }

    public async Task<ProvincialStatsDto> GetStatsAsync()
    {
        // Real figures only: no report has been transmitted (no gateway); alerts = notifiable cases this month
        // that have not been recorded as reported. Previously hard-coded 5 submitted / 4 acknowledged / "Connected".
        var now = DateTime.Now;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        var alerts = 0;
        try
        {
            var codes = await _db.IcdCodes.Where(i => i.IsNotifiable && i.IsActive).Select(i => i.Code).ToListAsync();
            if (codes.Count > 0)
            {
                var reported = _db.Set<InfectiousReportSubmission>().Where(x => !x.IsDeleted).Select(x => x.ExaminationId);
                alerts = await _db.Examinations.CountAsync(e => e.MainIcdCode != null && codes.Contains(e.MainIcdCode)
                    && e.CreatedAt >= startOfMonth && !reported.Contains(e.Id));
            }
        }
        catch (Microsoft.Data.SqlClient.SqlException) { alerts = 0; }

        return new ProvincialStatsDto
        {
            TotalReportsThisMonth = 1, // the auto-aggregated monthly report for the current period
            TotalSubmitted = 0,
            TotalAcknowledged = 0,
            TotalPending = 1,
            LastReportDate = null,
            ConnectionStatus = "NotConfigured",
            InfectiousDiseaseAlerts = alerts
        };
    }

    public Task<object> TestConnectionAsync()
    {
        // No endpoint is configured, so there is nothing to ping (was connected=true with a random latency).
        return Task.FromResult<object>(new
        {
            connected = false,
            status = "NotConfigured",
            message = "Chưa cấu hình kết nối cổng báo cáo Sở Y tế",
            latencyMs = 0
        });
    }

    public Task<ProvincialConnectionDto> GetConnectionInfoAsync()
    {
        return Task.FromResult(new ProvincialConnectionDto
        {
            Endpoint = string.Empty,
            Status = "NotConfigured",
            LastSync = string.Empty,
            Protocol = "HL7 FHIR R4",
            CertificateExpiry = null
        });
    }

    public async Task<List<InfectiousDiseaseReportDto>> GetInfectiousDiseaseReportsAsync(string? dateFrom, string? dateTo)
    {
        // #156: aggregate THẬT ca có ICD bệnh truyền nhiễm phải báo cáo (IcdCode.IsNotifiable) — không còn stub rỗng.
        var from = DateTime.TryParse(dateFrom, out var f) ? f.Date : DateTime.UtcNow.Date.AddMonths(-1);
        var to = DateTime.TryParse(dateTo, out var t) ? t.Date.AddDays(1) : DateTime.UtcNow.Date.AddDays(1);

        var notifiable = await _db.IcdCodes.Where(i => i.IsNotifiable && i.IsActive)
            .ToDictionaryAsync(i => i.Code, i => i.Name);
        if (notifiable.Count == 0) return new List<InfectiousDiseaseReportDto>();
        var codes = notifiable.Keys.ToList();

        var rows = await _db.Examinations
            .Where(e => e.MainIcdCode != null && codes.Contains(e.MainIcdCode)
                && e.CreatedAt >= from && e.CreatedAt < to)
            .Select(e => new
            {
                e.Id,
                e.MainIcdCode,
                e.MainDiagnosis,
                e.StartTime,
                e.CreatedAt,
                FullName = e.MedicalRecord.Patient.FullName,
                Dob = e.MedicalRecord.Patient.DateOfBirth,
                Gender = e.MedicalRecord.Patient.Gender,
                Address = e.MedicalRecord.Patient.Address,
            })
            .ToBoundedListAsync("ProvincialHealth.GetInfectiousDiseaseReports");

        var submittedSet = (await _db.Set<InfectiousReportSubmission>()
            .Where(s => !s.IsDeleted).Select(s => s.ExaminationId).ToListAsync()).ToHashSet();

        return rows.Select(r => new InfectiousDiseaseReportDto
        {
            Id            = r.Id,
            DiseaseCode   = r.MainIcdCode ?? string.Empty,
            DiseaseName   = notifiable.TryGetValue(r.MainIcdCode ?? string.Empty, out var n) ? n : (r.MainDiagnosis ?? string.Empty),
            PatientName   = r.FullName,
            PatientAge    = r.Dob.HasValue ? Math.Max(0, (int)((DateTime.UtcNow - r.Dob.Value).TotalDays / 365)) : 0,
            PatientGender = r.Gender == 1 ? "Nam" : r.Gender == 2 ? "Nữ" : "Khác",
            PatientAddress = r.Address ?? string.Empty,
            OnsetDate     = r.StartTime ?? r.CreatedAt,
            DiagnosisDate = r.CreatedAt,
            ReportDate    = r.CreatedAt,
            Severity      = string.Empty,
            Outcome       = string.Empty,
            Status        = submittedSet.Contains(r.Id) ? 1 : 0,
        }).OrderByDescending(x => x.DiagnosisDate).ToList();
    }

    public async Task<object> SubmitInfectiousReportAsync(Guid id, string userId)
    {
        // #156: id = ExaminationId của ca bệnh; persist THẬT việc đã gửi báo cáo Sở Y tế (không còn fake success).
        var exists = await _db.Examinations.AnyAsync(e => e.Id == id);
        if (!exists) return new { success = false, message = "Không tìm thấy ca bệnh để gửi báo cáo" };

        var already = await _db.Set<InfectiousReportSubmission>().AnyAsync(s => s.ExaminationId == id && !s.IsDeleted);
        if (!already)
        {
            _db.Set<InfectiousReportSubmission>().Add(new InfectiousReportSubmission
            {
                Id = Guid.NewGuid(),
                ExaminationId = id,
                SubmittedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            });
            await _db.SaveChangesAsync();
        }
        // Recorded locally only — there is no provincial gateway, so do not claim it reached Sở Y tế.
        return new { success = true, transmitted = false, message = "Đã ghi nhận đã báo cáo ca bệnh truyền nhiễm (lưu nội bộ; chưa kết nối cổng Sở Y tế — cần nộp theo kênh thủ công)" };
    }

    // ─── Chỉ đạo tuyến (Provincial Directives) — persist thật ─────────────────

    public async Task<ProvincialDirectivePagedResult> GetDirectivesAsync(ProvincialDirectiveSearchDto search)
    {
        var q = _db.ProvincialDirectives.Where(d => !d.IsDeleted);

        if (search.Status.HasValue)
            q = q.Where(d => d.Status == search.Status.Value);

        if (!string.IsNullOrWhiteSpace(search.Keyword))
        {
            var kw = search.Keyword.Trim();
            q = q.Where(d =>
                d.Title.Contains(kw) ||
                (d.DirectiveNo != null && d.DirectiveNo.Contains(kw)) ||
                (d.FromLevel != null && d.FromLevel.Contains(kw)));
        }

        if (!string.IsNullOrWhiteSpace(search.DateFrom) &&
            DateTime.TryParse(search.DateFrom, out var dtFrom))
            q = q.Where(d => d.IssueDate >= dtFrom);

        if (!string.IsNullOrWhiteSpace(search.DateTo) &&
            DateTime.TryParse(search.DateTo, out var dtTo))
            q = q.Where(d => d.IssueDate <= dtTo.AddDays(1));

        var totalCount = await q.CountAsync();
        var items = await q
            .OrderByDescending(d => d.IssueDate)
            .ThenByDescending(d => d.CreatedAt)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .Select(d => new ProvincialDirectiveDto
            {
                Id          = d.Id,
                Title       = d.Title,
                DirectiveNo = d.DirectiveNo,
                Content     = d.Content,
                IssueDate   = d.IssueDate,
                FromLevel   = d.FromLevel,
                ToLevel     = d.ToLevel,
                Status      = d.Status,
                Notes       = d.Notes,
                CreatedAt   = d.CreatedAt,
                CreatedBy   = d.CreatedBy,
            })
            .ToListAsync();

        return new ProvincialDirectivePagedResult
        {
            Items      = items,
            TotalCount = totalCount,
            PageIndex  = search.PageIndex,
            PageSize   = search.PageSize,
        };
    }

    public async Task<ProvincialDirectiveDto?> GetDirectiveByIdAsync(Guid id)
    {
        var d = await _db.ProvincialDirectives
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (d == null) return null;
        return new ProvincialDirectiveDto
        {
            Id          = d.Id,
            Title       = d.Title,
            DirectiveNo = d.DirectiveNo,
            Content     = d.Content,
            IssueDate   = d.IssueDate,
            FromLevel   = d.FromLevel,
            ToLevel     = d.ToLevel,
            Status      = d.Status,
            Notes       = d.Notes,
            CreatedAt   = d.CreatedAt,
            CreatedBy   = d.CreatedBy,
        };
    }

    public async Task<ProvincialDirectiveDto> SaveDirectiveAsync(SaveProvincialDirectiveRequest req, string userId)
    {
        ProvincialDirective entity;
        if (req.Id.HasValue && req.Id.Value != Guid.Empty)
        {
            entity = await _db.ProvincialDirectives.FirstAsync(d => d.Id == req.Id.Value && !d.IsDeleted);
            entity.UpdatedAt  = DateTime.UtcNow;
            entity.UpdatedBy  = userId;
        }
        else
        {
            entity = new ProvincialDirective
            {
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };
            _db.ProvincialDirectives.Add(entity);
        }

        entity.Title       = req.Title;
        entity.DirectiveNo = req.DirectiveNo;
        entity.Content     = req.Content;
        entity.IssueDate   = req.IssueDate;
        entity.FromLevel   = req.FromLevel;
        entity.ToLevel     = req.ToLevel;
        entity.Status      = req.Status;
        entity.Notes       = req.Notes;

        await _db.SaveChangesAsync();

        return new ProvincialDirectiveDto
        {
            Id          = entity.Id,
            Title       = entity.Title,
            DirectiveNo = entity.DirectiveNo,
            Content     = entity.Content,
            IssueDate   = entity.IssueDate,
            FromLevel   = entity.FromLevel,
            ToLevel     = entity.ToLevel,
            Status      = entity.Status,
            Notes       = entity.Notes,
            CreatedAt   = entity.CreatedAt,
            CreatedBy   = entity.CreatedBy,
        };
    }

    public async Task<bool> DeleteDirectiveAsync(Guid id, string userId)
    {
        var entity = await _db.ProvincialDirectives
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (entity == null) return false;

        entity.IsDeleted  = true;
        entity.UpdatedAt  = DateTime.UtcNow;
        entity.UpdatedBy  = userId;
        await _db.SaveChangesAsync();
        return true;
    }
}
