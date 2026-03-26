using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ForensicService : IForensicService
{
    private readonly HISDbContext _context;

    public ForensicService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<ForensicCaseDto>> SearchCasesAsync(ForensicCaseSearchDto? filter = null)
    {
        try
        {
            var query = _context.ForensicCases.Where(c => !c.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(c =>
                        c.CaseCode.ToLower().Contains(kw) ||
                        c.PatientName.ToLower().Contains(kw) ||
                        (c.Cccd != null && c.Cccd.Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.CaseType))
                    query = query.Where(c => c.CaseType == filter.CaseType);
                if (filter.Status.HasValue)
                    query = query.Where(c => c.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(c => c.RequestDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(c => c.RequestDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(200)
                .Select(c => new ForensicCaseDto
                {
                    Id = c.Id,
                    CaseCode = c.CaseCode,
                    CaseType = c.CaseType,
                    PatientName = c.PatientName,
                    Cccd = c.Cccd,
                    Gender = c.Gender,
                    DateOfBirth = c.DateOfBirth.HasValue ? c.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    RequestingOrganization = c.RequestingOrganization,
                    RequestDate = c.RequestDate.HasValue ? c.RequestDate.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    ExaminationDate = c.ExaminationDate.HasValue ? c.ExaminationDate.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    Status = c.Status,
                    DisabilityPercentage = c.DisabilityPercentage,
                    Conclusion = c.Conclusion,
                })
                .ToListAsync();
        }
        catch { return new List<ForensicCaseDto>(); }
    }

    public async Task<ForensicCaseDetailDto?> GetCaseByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.ForensicCases
                .Include(x => x.Examinations.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (c == null) return null;

            return new ForensicCaseDetailDto
            {
                Id = c.Id,
                CaseCode = c.CaseCode,
                CaseType = c.CaseType,
                PatientId = c.PatientId,
                PatientName = c.PatientName,
                Cccd = c.Cccd,
                Gender = c.Gender,
                DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
                RequestingOrganization = c.RequestingOrganization,
                RequestDate = c.RequestDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                ExaminationDate = c.ExaminationDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                Status = c.Status,
                DisabilityPercentage = c.DisabilityPercentage,
                Conclusion = c.Conclusion,
                CouncilMembers = c.CouncilMembers,
                Notes = c.Notes,
                Examinations = c.Examinations.Select(e => new ForensicExaminationDto
                {
                    Id = e.Id,
                    ForensicCaseId = e.ForensicCaseId,
                    ExamCategory = e.ExamCategory,
                    Findings = e.Findings,
                    FunctionScore = e.FunctionScore,
                    DisabilityScore = e.DisabilityScore,
                    ExaminerName = e.ExaminerName,
                    Notes = e.Notes,
                }).ToList(),
            };
        }
        catch { return null; }
    }

    public async Task<ForensicCaseDto> CreateCaseAsync(CreateForensicCaseDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.ForensicCases.CountAsync(c => c.CreatedAt.Year == year) + 1;

        var entity = new ForensicCase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"GD-{year}-{count:D4}",
            CaseType = dto.CaseType ?? "disability",
            PatientId = dto.PatientId ?? Guid.Empty,
            PatientName = dto.PatientName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Gender = dto.Gender,
            Cccd = dto.Cccd,
            RequestingOrganization = dto.RequestingOrganization,
            RequestDate = DateTime.TryParse(dto.RequestDate, out var rd) ? rd : DateTime.UtcNow,
            ExaminationDate = DateTime.TryParse(dto.ExaminationDate, out var ed) ? ed : null,
            CouncilMembers = dto.CouncilMembers,
            Notes = dto.Notes,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ForensicCases.Add(entity);
        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
        };
    }

    public async Task<ForensicCaseDto> UpdateCaseAsync(Guid id, CreateForensicCaseDto dto)
    {
        var entity = await _context.ForensicCases.FindAsync(id)
            ?? throw new InvalidOperationException("Forensic case not found");

        if (dto.CaseType != null) entity.CaseType = dto.CaseType;
        if (dto.PatientName != null) entity.PatientName = dto.PatientName;
        if (dto.Cccd != null) entity.Cccd = dto.Cccd;
        if (dto.RequestingOrganization != null) entity.RequestingOrganization = dto.RequestingOrganization;
        if (dto.CouncilMembers != null) entity.CouncilMembers = dto.CouncilMembers;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (DateTime.TryParse(dto.ExaminationDate, out var ed)) entity.ExaminationDate = ed;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
            DisabilityPercentage = entity.DisabilityPercentage,
            Conclusion = entity.Conclusion,
        };
    }

    public async Task<List<ForensicExaminationDto>> GetExaminationsAsync(Guid caseId)
    {
        try
        {
            return await _context.ForensicExaminations
                .Where(e => e.ForensicCaseId == caseId && !e.IsDeleted)
                .OrderBy(e => e.CreatedAt)
                .Select(e => new ForensicExaminationDto
                {
                    Id = e.Id,
                    ForensicCaseId = e.ForensicCaseId,
                    ExamCategory = e.ExamCategory,
                    Findings = e.Findings,
                    FunctionScore = e.FunctionScore,
                    DisabilityScore = e.DisabilityScore,
                    ExaminerName = e.ExaminerName,
                    Notes = e.Notes,
                })
                .ToListAsync();
        }
        catch { return new List<ForensicExaminationDto>(); }
    }

    public async Task<ForensicExaminationDto> AddExaminationAsync(CreateForensicExaminationDto dto)
    {
        var entity = new ForensicExamination
        {
            Id = Guid.NewGuid(),
            ForensicCaseId = dto.ForensicCaseId ?? Guid.Empty,
            ExamCategory = dto.ExamCategory ?? "general",
            Findings = dto.Findings,
            FunctionScore = dto.FunctionScore,
            DisabilityScore = dto.DisabilityScore,
            ExaminerName = dto.ExaminerName,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ForensicExaminations.Add(entity);

        // Update case status to examining
        var forensicCase = await _context.ForensicCases.FindAsync(dto.ForensicCaseId);
        if (forensicCase != null && forensicCase.Status == 0)
        {
            forensicCase.Status = 1;
            forensicCase.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new ForensicExaminationDto
        {
            Id = entity.Id,
            ForensicCaseId = entity.ForensicCaseId,
            ExamCategory = entity.ExamCategory,
            Findings = entity.Findings,
            FunctionScore = entity.FunctionScore,
            DisabilityScore = entity.DisabilityScore,
            ExaminerName = entity.ExaminerName,
            Notes = entity.Notes,
        };
    }

    public async Task<ForensicCaseDto> ApproveCaseAsync(Guid id, decimal? disabilityPercentage, string? conclusion)
    {
        var entity = await _context.ForensicCases.FindAsync(id)
            ?? throw new InvalidOperationException("Forensic case not found");

        entity.Status = 3; // approved
        entity.DisabilityPercentage = disabilityPercentage;
        entity.Conclusion = conclusion;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ForensicCaseDto
        {
            Id = entity.Id,
            CaseCode = entity.CaseCode,
            CaseType = entity.CaseType,
            PatientName = entity.PatientName,
            Status = entity.Status,
            DisabilityPercentage = entity.DisabilityPercentage,
            Conclusion = entity.Conclusion,
        };
    }

    public async Task<ForensicStatsDto> GetStatsAsync()
    {
        try
        {
            var cases = await _context.ForensicCases.Where(c => !c.IsDeleted).ToListAsync();
            return new ForensicStatsDto
            {
                TotalCases = cases.Count,
                PendingCount = cases.Count(c => c.Status == 0),
                CompletedCount = cases.Count(c => c.Status == 2),
                ApprovedCount = cases.Count(c => c.Status == 3),
                CaseTypeBreakdown = cases.GroupBy(c => c.CaseType)
                    .Select(g => new ForensicCaseTypeBreakdownDto { CaseType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new ForensicStatsDto(); }
    }

    public async Task<byte[]> PrintCertificateAsync(Guid caseId)
    {
        try
        {
            var c = await _context.ForensicCases
                .Include(x => x.Examinations.Where(e => !e.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == caseId && !x.IsDeleted);
            if (c == null) return Array.Empty<byte>();

            var genderText = c.Gender == 1 ? "Nam" : c.Gender == 2 ? "Nữ" : "Khác";
            var dob = c.DateOfBirth?.ToString("dd/MM/yyyy") ?? "";
            var examDate = c.ExaminationDate?.ToString("dd/MM/yyyy") ?? "";
            var requestDate = c.RequestDate?.ToString("dd/MM/yyyy") ?? "";

            var examRows = "";
            int idx = 0;
            foreach (var e in c.Examinations)
            {
                idx++;
                examRows += $@"<tr><td style=""text-align:center"">{idx}</td><td>{System.Net.WebUtility.HtmlEncode(e.ExamCategory ?? "")}</td><td>{System.Net.WebUtility.HtmlEncode(e.Findings ?? "")}</td><td style=""text-align:center"">{e.FunctionScore?.ToString() ?? ""}</td><td style=""text-align:center"">{e.DisabilityScore?.ToString() ?? ""}</td><td>{System.Net.WebUtility.HtmlEncode(e.ExaminerName ?? "")}</td></tr>";
            }

            var html = $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><title>Giay chung nhan giam dinh - {System.Net.WebUtility.HtmlEncode(c.CaseCode)}</title>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h1 {{ text-align: center; font-size: 18px; text-transform: uppercase; }}
h2 {{ font-size: 14px; margin-top: 14px; }}
table {{ width: 100%; border-collapse: collapse; margin: 8px 0; }}
th, td {{ border: 1px solid #333; padding: 4px 6px; font-size: 12px; }}
th {{ background: #f0f0f0; text-align: center; }}
.info {{ margin: 4px 0; }}
.label {{ font-weight: bold; display: inline-block; width: 180px; }}
.signature {{ display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }}
.signature div {{ width: 45%; }}
</style></head><body>
<h1>GIAY CHUNG NHAN GIAM DINH</h1>
<p style=""text-align:center;font-style:italic"">So: {System.Net.WebUtility.HtmlEncode(c.CaseCode)}</p>

<h2>I. THONG TIN DOI TUONG GIAM DINH</h2>
<div class=""info""><span class=""label"">Ho va ten:</span> {System.Net.WebUtility.HtmlEncode(c.PatientName)}</div>
<div class=""info""><span class=""label"">Ngay sinh:</span> {dob}</div>
<div class=""info""><span class=""label"">Gioi tinh:</span> {genderText}</div>
<div class=""info""><span class=""label"">CCCD:</span> {System.Net.WebUtility.HtmlEncode(c.Cccd ?? "")}</div>
<div class=""info""><span class=""label"">Co quan yeu cau:</span> {System.Net.WebUtility.HtmlEncode(c.RequestingOrganization ?? "")}</div>
<div class=""info""><span class=""label"">Ngay yeu cau:</span> {requestDate}</div>
<div class=""info""><span class=""label"">Ngay giam dinh:</span> {examDate}</div>
<div class=""info""><span class=""label"">Loai giam dinh:</span> {System.Net.WebUtility.HtmlEncode(c.CaseType ?? "")}</div>

<h2>II. KET QUA KHAM GIAM DINH</h2>
<table><thead><tr><th>STT</th><th>Hang muc</th><th>Ket qua</th><th>Diem CN</th><th>Diem KT</th><th>Nguoi kham</th></tr></thead><tbody>
{examRows}
</tbody></table>

<h2>III. KET LUAN</h2>
<p>{System.Net.WebUtility.HtmlEncode(c.Conclusion ?? "Chua co ket luan")}</p>
<p><b>Ty le khuyet tat/thuong tat:</b> {(c.DisabilityPercentage.HasValue ? $"{c.DisabilityPercentage}%" : "Chua xac dinh")}</p>

{(string.IsNullOrEmpty(c.Notes) ? "" : $"<h2>IV. GHI CHU</h2><p>{System.Net.WebUtility.HtmlEncode(c.Notes)}</p>")}

{(string.IsNullOrEmpty(c.CouncilMembers) ? "" : $"<h2>THANH PHAN HOI DONG</h2><p>{System.Net.WebUtility.HtmlEncode(c.CouncilMembers)}</p>")}

<div class=""signature"">
  <div><p><i>Ngay ... thang ... nam {DateTime.Now:yyyy}</i></p><p><b>CHU TICH HOI DONG</b></p><br/><br/><br/><p>(Ky, ghi ro ho ten)</p></div>
  <div><p><i>Ngay ... thang ... nam {DateTime.Now:yyyy}</i></p><p><b>THU KY HOI DONG</b></p><br/><br/><br/><p>(Ky, ghi ro ho ten)</p></div>
</div>
</body></html>";

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }
}
