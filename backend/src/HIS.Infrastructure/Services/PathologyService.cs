using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class PathologyService : IPathologyService
{
    private readonly HISDbContext _context;

    public PathologyService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<PathologyRequestDto>> GetPathologyRequestsAsync(PathologySearchDto? filter = null)
    {
        var query = _context.PathologyRequests
            .Include(r => r.Patient)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Department)
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(r =>
                    r.RequestCode.ToLower().Contains(kw) ||
                    (r.Patient != null && (r.Patient.FullName.ToLower().Contains(kw) || r.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (filter.Status.HasValue)
            {
                query = query.Where(r => r.Status == filter.Status.Value);
            }
            if (!string.IsNullOrEmpty(filter.SpecimenType))
            {
                query = query.Where(r => r.SpecimenType == filter.SpecimenType);
            }
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
            {
                query = query.Where(r => r.RequestDate >= from);
            }
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
            {
                query = query.Where(r => r.RequestDate <= to.AddDays(1));
            }
        }

        return await query
            .OrderByDescending(r => r.RequestDate)
            .Take(200)
            .Select(r => new PathologyRequestDto
            {
                Id = r.Id,
                RequestCode = r.RequestCode,
                PatientName = r.Patient != null ? r.Patient.FullName : "",
                PatientCode = r.Patient != null ? r.Patient.PatientCode : "",
                PatientId = r.PatientId,
                Gender = r.Patient != null ? r.Patient.Gender : null,
                DateOfBirth = r.Patient != null && r.Patient.DateOfBirth.HasValue ? r.Patient.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                RequestDate = r.RequestDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                SpecimenType = r.SpecimenType,
                SpecimenSite = r.SpecimenSite,
                ClinicalDiagnosis = r.ClinicalDiagnosis,
                RequestingDoctor = r.RequestingDoctor != null ? r.RequestingDoctor.FullName : "",
                DepartmentName = r.Department != null ? r.Department.DepartmentName : "",
                Status = r.Status,
                Priority = r.Priority,
            })
            .ToListAsync();
    }

    public async Task<PathologyRequestDetailDto?> GetPathologyRequestByIdAsync(Guid id)
    {
        var r = await _context.PathologyRequests
            .Include(r => r.Patient)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Department)
            .Include(r => r.Results)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (r == null) return null;

        var latestResult = r.Results.OrderByDescending(x => x.CreatedAt).FirstOrDefault();

        return new PathologyRequestDetailDto
        {
            Id = r.Id,
            RequestCode = r.RequestCode,
            PatientName = r.Patient?.FullName ?? "",
            PatientCode = r.Patient?.PatientCode ?? "",
            PatientId = r.PatientId,
            Gender = r.Patient?.Gender,
            DateOfBirth = r.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
            RequestDate = r.RequestDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            SpecimenType = r.SpecimenType,
            SpecimenSite = r.SpecimenSite,
            SpecimenDescription = r.SpecimenDescription,
            SpecimenCount = r.SpecimenCount,
            ClinicalDiagnosis = r.ClinicalDiagnosis,
            ClinicalHistory = r.ClinicalHistory,
            RequestingDoctor = r.RequestingDoctor?.FullName ?? "",
            DepartmentName = r.Department?.DepartmentName ?? "",
            Status = r.Status,
            Priority = r.Priority,
            Notes = r.Notes,
            TotalAmount = r.TotalAmount,
            IsPaid = r.IsPaid,
            Result = latestResult != null ? MapResultDto(latestResult) : null,
        };
    }

    public async Task<PathologyResultDto> CreatePathologyResultAsync(CreatePathologyResultDto dto)
    {
        var result = new PathologyResult
        {
            Id = Guid.NewGuid(),
            RequestId = dto.RequestId ?? Guid.Empty,
            GrossDescription = dto.GrossDescription,
            MicroscopicDescription = dto.MicroscopicDescription,
            Diagnosis = dto.Diagnosis,
            IcdCode = dto.IcdCode,
            StainingMethods = dto.StainingMethods != null ? JsonSerializer.Serialize(dto.StainingMethods) : null,
            SlideCount = dto.SlideCount,
            BlockCount = dto.BlockCount,
            SpecialStains = dto.SpecialStains,
            Immunohistochemistry = dto.Immunohistochemistry,
            MolecularTests = dto.MolecularTests,
            Pathologist = dto.Pathologist,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PathologyResults.Add(result);

        // Update request status to Completed
        var request = await _context.PathologyRequests.FindAsync(dto.RequestId);
        if (request != null)
        {
            request.Status = 3; // Completed
            request.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return MapResultDto(result);
    }

    public async Task<PathologyResultDto> UpdatePathologyResultAsync(Guid id, UpdatePathologyResultDto dto)
    {
        var result = await _context.PathologyResults.FindAsync(id)
            ?? throw new InvalidOperationException("Result not found");

        if (dto.GrossDescription != null) result.GrossDescription = dto.GrossDescription;
        if (dto.MicroscopicDescription != null) result.MicroscopicDescription = dto.MicroscopicDescription;
        if (dto.Diagnosis != null) result.Diagnosis = dto.Diagnosis;
        if (dto.IcdCode != null) result.IcdCode = dto.IcdCode;
        if (dto.StainingMethods != null) result.StainingMethods = JsonSerializer.Serialize(dto.StainingMethods);
        if (dto.SlideCount.HasValue) result.SlideCount = dto.SlideCount.Value;
        if (dto.BlockCount.HasValue) result.BlockCount = dto.BlockCount.Value;
        if (dto.SpecialStains != null) result.SpecialStains = dto.SpecialStains;
        if (dto.Immunohistochemistry != null) result.Immunohistochemistry = dto.Immunohistochemistry;
        if (dto.MolecularTests != null) result.MolecularTests = dto.MolecularTests;
        if (dto.Pathologist != null) result.Pathologist = dto.Pathologist;
        result.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapResultDto(result);
    }

    public async Task<PathologyStatsDto> GetPathologyStatisticsAsync()
    {
        var requests = await _context.PathologyRequests
            .Where(r => !r.IsDeleted)
            .ToListAsync();

        var total = requests.Count;
        var pending = requests.Count(r => r.Status <= 1);
        var completed = requests.Count(r => r.Status >= 3);

        var completedWithResults = requests
            .Where(r => r.Status >= 3 && r.UpdatedAt.HasValue)
            .Select(r => (r.UpdatedAt!.Value - r.RequestDate).TotalDays)
            .ToList();
        var avgTat = completedWithResults.Count > 0 ? completedWithResults.Average() : 0;

        var breakdown = requests
            .GroupBy(r => r.SpecimenType)
            .Select(g => new SpecimenTypeBreakdownDto { Type = g.Key, Count = g.Count() })
            .ToList();

        return new PathologyStatsDto
        {
            TotalRequests = total,
            PendingCount = pending,
            CompletedCount = completed,
            AvgTurnaroundDays = Math.Round(avgTat, 1),
            SpecimenTypeBreakdown = breakdown,
        };
    }

    public Task<List<SpecimenTypeDto>> GetSpecimenTypesAsync()
    {
        var types = new List<SpecimenTypeDto>
        {
            new() { Code = "biopsy", Name = "Sinh thiết" },
            new() { Code = "cytology", Name = "Tế bào học" },
            new() { Code = "pap", Name = "Pap smear" },
            new() { Code = "frozenSection", Name = "Cắt lạnh" },
        };
        return Task.FromResult(types);
    }

    public async Task<byte[]> PrintPathologyReportAsync(Guid resultId)
    {
        var result = await _context.PathologyResults
            .Include(r => r.Request)
                .ThenInclude(req => req!.Patient)
            .Include(r => r.Request)
                .ThenInclude(req => req!.RequestingDoctor)
            .Include(r => r.Request)
                .ThenInclude(req => req!.Department)
            .FirstOrDefaultAsync(r => r.Id == resultId);

        if (result?.Request == null)
            return System.Text.Encoding.UTF8.GetBytes("<html><body><p>Không tìm thấy kết quả</p></body></html>");

        var req = result.Request;
        var patient = req.Patient;
        var html = $@"<!DOCTYPE html>
<html><head><meta charset='utf-8'/>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20mm; }}
h2 {{ text-align: center; }}
table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
td, th {{ border: 1px solid #000; padding: 5px; }}
.header {{ text-align: center; margin-bottom: 20px; }}
.label {{ font-weight: bold; width: 160px; }}
.signature {{ display: flex; justify-content: space-between; margin-top: 40px; }}
.signature div {{ text-align: center; width: 45%; }}
</style></head>
<body>
<div class='header'>
<p><strong>BỆNH VIỆN ĐA KHOA</strong></p>
<p>Khoa: {req.Department?.DepartmentName ?? ""}</p>
<h2>PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH</h2>
<p>Mã phiếu: {req.RequestCode}</p>
</div>
<table>
<tr><td class='label'>Họ tên bệnh nhân</td><td>{patient?.FullName ?? ""}</td><td class='label'>Mã BN</td><td>{patient?.PatientCode ?? ""}</td></tr>
<tr><td class='label'>Ngày yêu cầu</td><td>{req.RequestDate:dd/MM/yyyy HH:mm}</td><td class='label'>BS yêu cầu</td><td>{req.RequestingDoctor?.FullName ?? ""}</td></tr>
<tr><td class='label'>Loại mẫu</td><td>{req.SpecimenType}</td><td class='label'>Vị trí lấy mẫu</td><td>{req.SpecimenSite ?? ""}</td></tr>
<tr><td class='label'>Chẩn đoán LS</td><td colspan='3'>{req.ClinicalDiagnosis ?? ""}</td></tr>
</table>
<h3>I. MÔ TẢ ĐẠI THỂ</h3>
<p>{result.GrossDescription ?? ""}</p>
<p>Số block: {result.BlockCount} &nbsp; Số lam kính: {result.SlideCount}</p>
<h3>II. MÔ TẢ VI THỂ</h3>
<p>{result.MicroscopicDescription ?? ""}</p>
<h3>III. PHƯƠNG PHÁP NHUỘM</h3>
<p>{result.StainingMethods ?? ""}</p>
{(string.IsNullOrEmpty(result.SpecialStains) ? "" : $"<h3>IV. NHUỘM ĐẶC BIỆT</h3><p>{result.SpecialStains}</p>")}
{(string.IsNullOrEmpty(result.Immunohistochemistry) ? "" : $"<h3>V. HÓA MÔ MIỄN DỊCH (IHC)</h3><p>{result.Immunohistochemistry}</p>")}
{(string.IsNullOrEmpty(result.MolecularTests) ? "" : $"<h3>VI. XÉT NGHIỆM PHÂN TỬ</h3><p>{result.MolecularTests}</p>")}
<h3>KẾT LUẬN</h3>
<p><strong>{result.Diagnosis ?? ""}</strong></p>
{(string.IsNullOrEmpty(result.IcdCode) ? "" : $"<p>Mã ICD: {result.IcdCode}</p>")}
<div class='signature'>
<div><p>BS Giải phẫu bệnh</p><br/><br/><p>{result.Pathologist ?? ""}</p></div>
<div><p>Ngày ký: {(result.CompletedAt ?? DateTime.UtcNow):dd/MM/yyyy}</p></div>
</div>
</body></html>";

        return System.Text.Encoding.UTF8.GetBytes(html);
    }

    public async Task<CancelledPathologyRequestDto> CancelPathologyRequestAsync(Guid id, string reason, string cancelledBy)
    {
        var request = await _context.PathologyRequests.FindAsync(id)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu GPB");

        if (request.Status == 4)
            throw new InvalidOperationException("Không thể hủy phiếu GPB đã duyệt");
        if (request.Status == 5)
            throw new InvalidOperationException("Phiếu GPB đã được hủy trước đó");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Lý do hủy là bắt buộc");

        request.Status = 5; // Cancelled
        request.CancelledBy = cancelledBy;
        request.CancelledAt = DateTime.UtcNow;
        request.CancellationReason = reason;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new CancelledPathologyRequestDto
        {
            Id = request.Id,
            Status = request.Status,
            CancelledBy = request.CancelledBy,
            CancelledAt = request.CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
            CancellationReason = request.CancellationReason,
        };
    }

    public async Task<PathologyResultDto> VerifyPathologyResultAsync(Guid resultId, Guid verifiedById, string verifiedByName)
    {
        var result = await _context.PathologyResults
            .Include(r => r.Request)
            .FirstOrDefaultAsync(r => r.Id == resultId)
            ?? throw new InvalidOperationException("Không tìm thấy kết quả GPB");

        if (result.Request == null)
            throw new InvalidOperationException("Kết quả không gắn với phiếu GPB hợp lệ");
        if (result.Request.Status != 3)
            throw new InvalidOperationException("Chỉ duyệt được kết quả phiếu GPB đã hoàn thành (Status=Completed)");
        if (result.VerifiedAt.HasValue)
            throw new InvalidOperationException("Kết quả GPB này đã được duyệt");

        result.VerifiedBy = verifiedById;
        result.VerifiedByName = verifiedByName;
        result.VerifiedAt = DateTime.UtcNow;
        result.UpdatedAt = DateTime.UtcNow;

        result.Request.Status = 4; // Verified
        result.Request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapResultDto(result);
    }

    private static readonly HashSet<(int from, int to)> _allowedTransitions = new()
    {
        (0, 1), // Pending → Grossing
        (1, 2), // Grossing → Processing
        (2, 3), // Processing → Completed
    };

    public async Task<PathologyRequestDetailDto> TransitionPathologyStatusAsync(Guid id, int newStatus)
    {
        var request = await _context.PathologyRequests
            .Include(r => r.Patient)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Department)
            .Include(r => r.Results)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu GPB");

        if (!_allowedTransitions.Contains((request.Status, newStatus)))
            throw new InvalidOperationException(
                $"Không cho phép chuyển trạng thái từ {request.Status} sang {newStatus}. " +
                "Dùng endpoint cancel để hủy, endpoint verify để duyệt kết quả.");

        request.Status = newStatus;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var latestResult = request.Results.OrderByDescending(x => x.CreatedAt).FirstOrDefault();
        return new PathologyRequestDetailDto
        {
            Id = request.Id,
            RequestCode = request.RequestCode,
            PatientName = request.Patient?.FullName ?? "",
            PatientCode = request.Patient?.PatientCode ?? "",
            PatientId = request.PatientId,
            Gender = request.Patient?.Gender,
            DateOfBirth = request.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
            RequestDate = request.RequestDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            SpecimenType = request.SpecimenType,
            SpecimenSite = request.SpecimenSite,
            SpecimenDescription = request.SpecimenDescription,
            SpecimenCount = request.SpecimenCount,
            ClinicalDiagnosis = request.ClinicalDiagnosis,
            ClinicalHistory = request.ClinicalHistory,
            RequestingDoctor = request.RequestingDoctor?.FullName ?? "",
            DepartmentName = request.Department?.DepartmentName ?? "",
            Status = request.Status,
            Priority = request.Priority,
            Notes = request.Notes,
            TotalAmount = request.TotalAmount,
            IsPaid = request.IsPaid,
            Result = latestResult != null ? MapResultDto(latestResult) : null,
        };
    }

    private static PathologyResultDto MapResultDto(PathologyResult r)
    {
        List<string> stainingMethods = new();
        if (!string.IsNullOrEmpty(r.StainingMethods))
        {
            try { stainingMethods = JsonSerializer.Deserialize<List<string>>(r.StainingMethods) ?? new(); }
            catch { /* ignore parse errors */ }
        }

        List<string> images = new();
        if (!string.IsNullOrEmpty(r.Images))
        {
            try { images = JsonSerializer.Deserialize<List<string>>(r.Images) ?? new(); }
            catch { /* ignore parse errors */ }
        }

        return new PathologyResultDto
        {
            Id = r.Id,
            RequestId = r.RequestId,
            GrossDescription = r.GrossDescription,
            MicroscopicDescription = r.MicroscopicDescription,
            Diagnosis = r.Diagnosis,
            IcdCode = r.IcdCode,
            StainingMethods = stainingMethods,
            SlideCount = r.SlideCount,
            BlockCount = r.BlockCount,
            SpecialStains = r.SpecialStains,
            Immunohistochemistry = r.Immunohistochemistry,
            MolecularTests = r.MolecularTests,
            Pathologist = r.Pathologist,
            VerifiedBy = r.VerifiedByName,
            VerifiedAt = r.VerifiedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
            Images = images,
        };
    }
}
