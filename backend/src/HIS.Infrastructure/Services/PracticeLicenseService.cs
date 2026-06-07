using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class PracticeLicenseService : IPracticeLicenseService
{
    private readonly HISDbContext _context;
    private readonly ILogger<PracticeLicenseService> _logger;

    public PracticeLicenseService(HISDbContext context, ILogger<PracticeLicenseService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<PracticeLicenseDto>> SearchLicensesAsync(PracticeLicenseSearchDto? filter = null)
    {
        try
        {
            var query = _context.PracticeLicenses.Where(l => !l.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(l =>
                        l.LicenseCode.ToLower().Contains(kw) ||
                        l.HolderName.ToLower().Contains(kw) ||
                        (l.Cccd != null && l.Cccd.Contains(kw)) ||
                        (l.Specialty != null && l.Specialty.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.LicenseType))
                    query = query.Where(l => l.LicenseType == filter.LicenseType);
                if (filter.Status.HasValue)
                    query = query.Where(l => l.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(l => l.IssueDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(l => l.IssueDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(l => l.CreatedAt)
                .Take(200)
                .Select(l => new PracticeLicenseDto
                {
                    Id = l.Id,
                    LicenseCode = l.LicenseCode,
                    LicenseType = l.LicenseType,
                    HolderName = l.HolderName,
                    DateOfBirth = l.DateOfBirth.HasValue ? l.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    Cccd = l.Cccd,
                    Specialty = l.Specialty,
                    IssuingAuthority = l.IssuingAuthority,
                    IssueDate = l.IssueDate.HasValue ? l.IssueDate.Value.ToString("yyyy-MM-dd") : null,
                    ExpiryDate = l.ExpiryDate.HasValue ? l.ExpiryDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = l.Status,
                    FacilityName = l.FacilityName,
                    CertificateNumber = l.CertificateNumber,
                    TrainingInstitution = l.TrainingInstitution,
                    GraduationYear = l.GraduationYear,
                    Notes = l.Notes,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "PracticeLicenseService thao tác thất bại, trả giá trị mặc định"); return new List<PracticeLicenseDto>(); }
    }

    public async Task<PracticeLicenseDetailDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var l = await _context.PracticeLicenses.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (l == null) return null;

            var now = DateTime.UtcNow;
            int? daysUntilExpiry = l.ExpiryDate.HasValue ? (int)(l.ExpiryDate.Value - now).TotalDays : null;

            return new PracticeLicenseDetailDto
            {
                Id = l.Id,
                LicenseCode = l.LicenseCode,
                LicenseType = l.LicenseType,
                HolderName = l.HolderName,
                DateOfBirth = l.DateOfBirth?.ToString("yyyy-MM-dd"),
                Cccd = l.Cccd,
                Specialty = l.Specialty,
                IssuingAuthority = l.IssuingAuthority,
                IssueDate = l.IssueDate?.ToString("yyyy-MM-dd"),
                ExpiryDate = l.ExpiryDate?.ToString("yyyy-MM-dd"),
                Status = l.Status,
                FacilityId = l.FacilityId,
                FacilityName = l.FacilityName,
                CertificateNumber = l.CertificateNumber,
                TrainingInstitution = l.TrainingInstitution,
                GraduationYear = l.GraduationYear,
                Notes = l.Notes,
                DaysUntilExpiry = daysUntilExpiry,
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "PracticeLicenseService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    public async Task<PracticeLicenseDto> CreateLicenseAsync(CreatePracticeLicenseDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.PracticeLicenses.CountAsync(l => l.CreatedAt.Year == year) + 1;

        var entity = new PracticeLicense
        {
            Id = Guid.NewGuid(),
            LicenseCode = $"CCHN-{year}-{count:D4}",
            LicenseType = dto.LicenseType ?? "doctor",
            HolderName = dto.HolderName ?? "",
            DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null,
            Cccd = dto.Cccd,
            Specialty = dto.Specialty,
            IssuingAuthority = dto.IssuingAuthority,
            IssueDate = DateTime.TryParse(dto.IssueDate, out var isd) ? isd : null,
            ExpiryDate = DateTime.TryParse(dto.ExpiryDate, out var exd) ? exd : null,
            Status = 0,
            FacilityId = dto.FacilityId,
            FacilityName = dto.FacilityName,
            CertificateNumber = dto.CertificateNumber,
            TrainingInstitution = dto.TrainingInstitution,
            GraduationYear = dto.GraduationYear,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PracticeLicenses.Add(entity);
        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status };
    }

    public async Task<PracticeLicenseDto> UpdateLicenseAsync(Guid id, CreatePracticeLicenseDto dto)
    {
        var entity = await _context.PracticeLicenses.FindAsync(id)
            ?? throw new InvalidOperationException("Practice license not found");

        if (dto.LicenseType != null) entity.LicenseType = dto.LicenseType;
        if (dto.HolderName != null) entity.HolderName = dto.HolderName;
        if (dto.Specialty != null) entity.Specialty = dto.Specialty;
        if (dto.IssuingAuthority != null) entity.IssuingAuthority = dto.IssuingAuthority;
        if (DateTime.TryParse(dto.ExpiryDate, out var exd)) entity.ExpiryDate = exd;
        if (dto.FacilityName != null) entity.FacilityName = dto.FacilityName;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status };
    }

    public async Task<List<PracticeLicenseDto>> GetExpiringLicensesAsync(int withinDays = 90)
    {
        try
        {
            var deadline = DateTime.UtcNow.AddDays(withinDays);
            var now = DateTime.UtcNow;

            return await _context.PracticeLicenses
                .Where(l => !l.IsDeleted && l.Status == 0 && l.ExpiryDate.HasValue && l.ExpiryDate.Value <= deadline && l.ExpiryDate.Value >= now)
                .OrderBy(l => l.ExpiryDate)
                .Take(100)
                .Select(l => new PracticeLicenseDto
                {
                    Id = l.Id,
                    LicenseCode = l.LicenseCode,
                    LicenseType = l.LicenseType,
                    HolderName = l.HolderName,
                    Specialty = l.Specialty,
                    ExpiryDate = l.ExpiryDate!.Value.ToString("yyyy-MM-dd"),
                    Status = l.Status,
                })
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "PracticeLicenseService thao tác thất bại, trả giá trị mặc định"); return new List<PracticeLicenseDto>(); }
    }

    public async Task<PracticeLicenseStatsDto> GetStatsAsync()
    {
        try
        {
            var licenses = await _context.PracticeLicenses.Where(l => !l.IsDeleted).ToListAsync();
            var now = DateTime.UtcNow;
            var expiryThreshold = now.AddDays(90);

            return new PracticeLicenseStatsDto
            {
                TotalLicenses = licenses.Count,
                ActiveCount = licenses.Count(l => l.Status == 0),
                ExpiredCount = licenses.Count(l => l.Status == 1),
                ExpiringSoon = licenses.Count(l => l.Status == 0 && l.ExpiryDate.HasValue && l.ExpiryDate.Value <= expiryThreshold && l.ExpiryDate.Value >= now),
                SuspendedCount = licenses.Count(l => l.Status == 2),
                LicenseTypeBreakdown = licenses.GroupBy(l => l.LicenseType)
                    .Select(g => new LicenseTypeBreakdownDto { LicenseType = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "PracticeLicenseService thao tác thất bại, trả giá trị mặc định"); return new PracticeLicenseStatsDto(); }
    }

    public async Task<PracticeLicenseDto> RenewLicenseAsync(Guid id, string? newExpiryDate)
    {
        var entity = await _context.PracticeLicenses.FindAsync(id)
            ?? throw new InvalidOperationException("Practice license not found");

        if (DateTime.TryParse(newExpiryDate, out var exd))
            entity.ExpiryDate = exd;
        else
            entity.ExpiryDate = DateTime.UtcNow.AddYears(5);

        entity.Status = 0; // active
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PracticeLicenseDto { Id = entity.Id, LicenseCode = entity.LicenseCode, LicenseType = entity.LicenseType, HolderName = entity.HolderName, Status = entity.Status, ExpiryDate = entity.ExpiryDate?.ToString("yyyy-MM-dd") };
    }

    public async Task<byte[]> PrintLicenseAsync(Guid licenseId)
    {
        var dto = await GetByIdAsync(licenseId)
            ?? throw new InvalidOperationException("Không tìm thấy chứng chỉ hành nghề");

        var licenseTypeLabel = dto.LicenseType switch
        {
            "doctor" => "Bác sĩ",
            "pharmacist" => "Dược sĩ",
            "nurse" => "Điều dưỡng",
            "midwife" => "Hộ sinh",
            "technician" => "Kỹ thuật viên",
            "dentist" => "Nha sĩ",
            "traditional_medicine" => "Y học cổ truyền",
            _ => dto.LicenseType ?? ""
        };

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
        sb.AppendLine("<style>");
        sb.AppendLine("body{font-family:'Times New Roman',Times,serif;font-size:13pt;margin:20mm 15mm;}");
        sb.AppendLine(".header{text-align:center;margin-bottom:8px;font-size:11pt;}");
        sb.AppendLine(".title{text-align:center;font-weight:bold;font-size:16pt;text-transform:uppercase;margin:16px 0 4px;}");
        sb.AppendLine(".subtitle{text-align:center;font-size:11pt;margin-bottom:20px;}");
        sb.AppendLine(".field-row{display:flex;margin-bottom:8px;}");
        sb.AppendLine(".field-label{min-width:220px;font-weight:bold;}");
        sb.AppendLine(".field-value{flex:1;border-bottom:1px dotted #555;padding-left:4px;}");
        sb.AppendLine(".section-title{font-weight:bold;margin:14px 0 6px;text-decoration:underline;}");
        sb.AppendLine(".sig-row{display:flex;justify-content:space-between;margin-top:50px;}");
        sb.AppendLine(".sig-box{text-align:center;width:45%;}");
        sb.AppendLine(".sig-name{margin-top:60px;font-weight:bold;}");
        sb.AppendLine(".code-box{border:2px solid #333;padding:6px 12px;display:inline-block;font-size:11pt;font-family:monospace;margin-bottom:8px;}");
        sb.AppendLine("@media print{body{margin:10mm;}}");
        sb.AppendLine("</style></head><body>");

        sb.AppendLine("<div class='header'>");
        sb.AppendLine("<div>BỘ Y TẾ</div>");
        sb.AppendLine("</div>");

        sb.AppendLine("<div class='title'>CHỨNG CHỈ HÀNH NGHỀ</div>");
        sb.AppendLine($"<div class='subtitle'>{System.Web.HttpUtility.HtmlEncode(licenseTypeLabel)}</div>");
        sb.AppendLine($"<div style='text-align:center;margin-bottom:16px'><span class='code-box'>{System.Web.HttpUtility.HtmlEncode(dto.LicenseCode)}</span></div>");

        sb.AppendLine("<div class='section-title'>I. THÔNG TIN NGƯỜI ĐƯỢC CẤP CHỨNG CHỈ</div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Họ và tên:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.HolderName)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.Cccd))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Số CCCD/CMND:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.Cccd)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.DateOfBirth))
        {
            var dobDisplay = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob.ToString("dd/MM/yyyy") : dto.DateOfBirth;
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Ngày sinh:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dobDisplay)}</span></div>");
        }

        sb.AppendLine("<div class='section-title'>II. NỘI DUNG CHỨNG CHỈ</div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Loại chứng chỉ:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(licenseTypeLabel)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.Specialty))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Chuyên khoa:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.Specialty)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.CertificateNumber))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Số chứng chỉ:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.CertificateNumber)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.FacilityName))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Cơ sở hành nghề:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.FacilityName)}</span></div>");

        sb.AppendLine("<div class='section-title'>III. THỜI HẠN</div>");
        var issueDateDisplay = !string.IsNullOrWhiteSpace(dto.IssueDate) && DateTime.TryParse(dto.IssueDate, out var isd) ? isd.ToString("dd/MM/yyyy") : (dto.IssueDate ?? "");
        var expiryDateDisplay = !string.IsNullOrWhiteSpace(dto.ExpiryDate) && DateTime.TryParse(dto.ExpiryDate, out var exd) ? exd.ToString("dd/MM/yyyy") : (dto.ExpiryDate ?? "Không thời hạn");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Ngày cấp:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(issueDateDisplay)}</span></div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Có giá trị đến:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(expiryDateDisplay)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.IssuingAuthority))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Cơ quan cấp:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.IssuingAuthority)}</span></div>");

        var printDate = DateTime.Now;
        sb.AppendLine($"<div style='text-align:right;margin-top:20px;font-style:italic'>Ngày {printDate:dd/MM/yyyy}</div>");

        sb.AppendLine("<div class='sig-row'>");
        sb.AppendLine("<div class='sig-box'><div>NGƯỜI ĐƯỢC CẤP CHỨNG CHỈ</div><div style='font-size:10pt;font-style:italic'>(Ký, ghi rõ họ tên)</div><div class='sig-name'>&nbsp;</div></div>");
        sb.AppendLine($"<div class='sig-box'><div>{System.Web.HttpUtility.HtmlEncode(dto.IssuingAuthority ?? "CƠ QUAN CẤP")}</div><div style='font-size:10pt;font-style:italic'>(Ký, đóng dấu, ghi rõ họ tên)</div><div class='sig-name'>&nbsp;</div></div>");
        sb.AppendLine("</div>");

        sb.AppendLine("</body></html>");
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }
}
