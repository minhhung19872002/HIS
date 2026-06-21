using System.Security.Cryptography;
using HIS.Application.DTOs.PublicEmr;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Tra cứu công khai HSBA đã ký số (CCCD + ngày sinh). KHÔNG đụng USB token —
/// chỉ đọc lại file PDF đã ký từ bản ghi DocumentSignature (đĩa hoặc base64).
/// </summary>
public class PublicEmrLookupService : IPublicEmrLookupService
{
    private readonly HISDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IAuditLogService _audit;
    private readonly ILogger<PublicEmrLookupService> _logger;

    // Rate-limit chống brute-force (cố định cửa sổ theo IP).
    private const int LookupMaxPerWindow = 8;
    private const int DownloadMaxPerWindow = 40;
    private const int RateWindowMinutes = 10;

    // Token tra cứu ngắn hạn.
    private const int TokenTtlMinutes = 15;
    private const int MaxOwnedDocsPerType = 500;

    public PublicEmrLookupService(
        HISDbContext db,
        IMemoryCache cache,
        IAuditLogService audit,
        ILogger<PublicEmrLookupService> logger)
    {
        _db = db;
        _cache = cache;
        _audit = audit;
        _logger = logger;
    }

    private sealed class RateCounter { public int Count; }

    private sealed class LookupSession
    {
        public HashSet<Guid> AllowedDocumentIds { get; init; } = new();
        public List<Guid> PatientIds { get; init; } = new();
    }

    /// <summary>true nếu IP đã vượt ngưỡng trong cửa sổ hiện tại.</summary>
    private bool IsRateLimited(string ip, string scope, int max)
    {
        var key = $"pubemr:rl:{scope}:{ip}";
        var counter = _cache.GetOrCreate(key, e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(RateWindowMinutes);
            return new RateCounter();
        })!;
        int current;
        lock (counter) { current = ++counter.Count; }
        return current > max;
    }

    private static string MaskName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return string.Empty;
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
            p.Length <= 1 ? p : p[0] + new string('*', p.Length - 1)));
    }

    private static string DocumentTypeName(string type) => type switch
    {
        "EMR" => "Bệnh án điện tử",
        "Examination" => "Phiếu khám bệnh",
        "Prescription" => "Đơn thuốc",
        "LabResult" => "Phiếu kết quả xét nghiệm",
        "Discharge" => "Giấy ra viện",
        "Referral" => "Giấy chuyển viện",
        "Radiology" => "Phiếu chẩn đoán hình ảnh",
        _ => "Tài liệu hồ sơ bệnh án"
    };

    /// <summary>Lấy O= (tên tổ chức) hoặc CN= từ CertificateSubject làm tên người ký.</summary>
    private static string? SignerFromSubject(string? subject)
    {
        if (string.IsNullOrEmpty(subject)) return null;
        var cn = System.Text.RegularExpressions.Regex.Match(subject, @"CN=([^,]+)");
        if (cn.Success) return cn.Groups[1].Value.Trim();
        var o = System.Text.RegularExpressions.Regex.Match(subject, @"O=([^,]+)");
        return o.Success ? o.Groups[1].Value.Trim() : null;
    }

    public async Task<PublicEmrLookupResponse> LookupAsync(
        PublicEmrLookupRequest request, string? ipAddress, string? userAgent, string? requestPath)
    {
        var ip = string.IsNullOrWhiteSpace(ipAddress) ? "unknown" : ipAddress;

        if (IsRateLimited(ip, "lookup", LookupMaxPerWindow))
        {
            _logger.LogWarning("Public EMR lookup rate-limited for IP {Ip}", ip);
            return new PublicEmrLookupResponse
            {
                Success = false,
                Message = "Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau ít phút."
            };
        }

        var idNumber = request.IdentityNumber?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(idNumber) || string.IsNullOrWhiteSpace(request.DateOfBirth))
        {
            return new PublicEmrLookupResponse
            {
                Success = false,
                Message = "Vui lòng nhập đầy đủ số CCCD/CMND và ngày sinh."
            };
        }

        if (!DateTime.TryParse(request.DateOfBirth, out var dob))
        {
            return new PublicEmrLookupResponse
            {
                Success = false,
                Message = "Ngày sinh không hợp lệ."
            };
        }
        var dobDate = dob.Date;

        // Xác thực 2 yếu tố: CCCD + ngày sinh phải khớp cùng 1 bệnh nhân.
        var patientIds = await _db.Patients
            .Where(p => !p.IsDeleted
                        && p.IdentityNumber == idNumber
                        && p.DateOfBirth != null
                        && p.DateOfBirth.Value.Date == dobDate)
            .Select(p => p.Id)
            .Take(20)
            .ToListAsync();

        // Thông điệp trung lập khi không khớp đủ 2 yếu tố (không lộ CCCD có tồn tại hay không).
        var notFound = new PublicEmrLookupResponse
        {
            Success = true,
            Message = "Không tìm thấy hồ sơ bệnh án đã ký số khớp với thông tin đã nhập.",
            Documents = new List<PublicEmrDocumentDto>()
        };

        if (patientIds.Count == 0)
        {
            await _audit.LogAsync("public", "public-emr", "PublicEmrLookupNoMatch",
                "Patient", idNumber, "Không khớp CCCD + ngày sinh", ip, userAgent,
                "PublicEmr", requestPath, "POST", 200);
            return notFound;
        }

        // Tập tài liệu thuộc về bệnh nhân (DocumentId là GUID toàn cục → chỉ cần thuộc tập sở hữu).
        var medicalRecordIds = await _db.MedicalRecords
            .Where(m => !m.IsDeleted && patientIds.Contains(m.PatientId))
            .Select(m => m.Id)
            .Take(MaxOwnedDocsPerType)
            .ToListAsync();

        var examIds = await _db.Examinations
            .Where(e => !e.IsDeleted && medicalRecordIds.Contains(e.MedicalRecordId))
            .Select(e => e.Id)
            .Take(MaxOwnedDocsPerType)
            .ToListAsync();

        var prescriptionIds = await _db.Prescriptions
            .Where(p => !p.IsDeleted && medicalRecordIds.Contains(p.MedicalRecordId))
            .Select(p => p.Id)
            .Take(MaxOwnedDocsPerType)
            .ToListAsync();

        // #14e: model 1 ServiceRequests (RequestType=1) — model 2 LabRequests đã gỡ
        var labRequestIds = await _db.ServiceRequests
            .Where(r => !r.IsDeleted && r.RequestType == 1 && medicalRecordIds.Contains(r.MedicalRecordId))
            .Select(r => r.Id)
            .Take(MaxOwnedDocsPerType)
            .ToListAsync();

        var admissionIds = await _db.Admissions
            .Where(a => !a.IsDeleted && patientIds.Contains(a.PatientId))
            .Select(a => a.Id)
            .Take(MaxOwnedDocsPerType)
            .ToListAsync();

        var ownedDocIds = new HashSet<Guid>(examIds);
        ownedDocIds.UnionWith(prescriptionIds);
        ownedDocIds.UnionWith(labRequestIds);
        ownedDocIds.UnionWith(admissionIds);

        if (ownedDocIds.Count == 0)
        {
            await _audit.LogAsync("public", "public-emr", "PublicEmrLookupNoDocs",
                "Patient", string.Join(',', patientIds), "Khớp BN nhưng chưa có tài liệu",
                ip, userAgent, "PublicEmr", requestPath, "POST", 200);
            return notFound;
        }

        var ownedList = ownedDocIds.ToList();

        // Chỉ tài liệu ĐÃ KÝ SỐ còn hiệu lực (Status == 0), lấy chữ ký mới nhất mỗi tài liệu.
        var signatures = await _db.DocumentSignatures
            .AsNoTracking()
            .Where(ds => ds.Status == 0 && ownedList.Contains(ds.DocumentId))
            .GroupBy(ds => ds.DocumentId)
            .Select(g => g.OrderByDescending(x => x.SignedAt).First())
            .ToListAsync();

        if (signatures.Count == 0)
        {
            await _audit.LogAsync("public", "public-emr", "PublicEmrLookupNoSigned",
                "Patient", string.Join(',', patientIds), "Khớp BN nhưng chưa có tài liệu ký số",
                ip, userAgent, "PublicEmr", requestPath, "POST", 200);
            return notFound;
        }

        var documents = signatures
            .OrderByDescending(s => s.SignedAt)
            .Select(s => new PublicEmrDocumentDto
            {
                DocumentId = s.DocumentId,
                DocumentType = s.DocumentType,
                DocumentTypeName = DocumentTypeName(s.DocumentType),
                DocumentCode = s.DocumentCode,
                SignedAt = s.SignedAt.ToString("dd/MM/yyyy HH:mm"),
                FileName = !string.IsNullOrEmpty(s.SignedDocumentPath)
                    ? Path.GetFileName(s.SignedDocumentPath)
                    : $"{s.DocumentType}_{s.DocumentId.ToString()[..8]}.pdf",
                SignerName = SignerFromSubject(s.CertificateSubject),
                CaProvider = string.IsNullOrEmpty(s.CaProvider) ? null : s.CaProvider
            })
            .ToList();

        // Cấp token ngắn hạn — chỉ cho tải đúng các tài liệu đã trả về.
        var token = GenerateToken();
        var session = new LookupSession
        {
            AllowedDocumentIds = new HashSet<Guid>(documents.Select(d => d.DocumentId)),
            PatientIds = patientIds
        };
        _cache.Set($"pubemr:tok:{token}", session, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(TokenTtlMinutes)
        });

        var patientName = await _db.Patients
            .Where(p => p.Id == patientIds[0])
            .Select(p => p.FullName)
            .FirstOrDefaultAsync();

        await _audit.LogAsync("public", "public-emr", "PublicEmrLookup",
            "Patient", string.Join(',', patientIds),
            $"Tra cứu công khai: {documents.Count} tài liệu đã ký số", ip, userAgent,
            "PublicEmr", requestPath, "POST", 200);

        return new PublicEmrLookupResponse
        {
            Success = true,
            Message = $"Tìm thấy {documents.Count} tài liệu đã ký số.",
            Token = token,
            PatientNameMasked = MaskName(patientName),
            Documents = documents
        };
    }

    public async Task<PublicEmrDocumentFileDto?> GetDocumentPdfAsync(
        Guid documentId, string? token, string? ipAddress, string? userAgent, string? requestPath)
    {
        var ip = string.IsNullOrWhiteSpace(ipAddress) ? "unknown" : ipAddress;

        if (IsRateLimited(ip, "download", DownloadMaxPerWindow))
        {
            _logger.LogWarning("Public EMR download rate-limited for IP {Ip}", ip);
            return null;
        }

        if (string.IsNullOrWhiteSpace(token)
            || !_cache.TryGetValue($"pubemr:tok:{token}", out LookupSession? session)
            || session is null
            || !session.AllowedDocumentIds.Contains(documentId))
        {
            await _audit.LogAsync("public", "public-emr", "PublicEmrDownloadDenied",
                "DocumentSignature", documentId.ToString(),
                "Token sai/hết hạn hoặc tài liệu ngoài phiên", ip, userAgent,
                "PublicEmr", requestPath, "GET", 403);
            return null;
        }

        var signature = await _db.DocumentSignatures
            .AsNoTracking()
            .Where(ds => ds.DocumentId == documentId && ds.Status == 0)
            .OrderByDescending(ds => ds.SignedAt)
            .FirstOrDefaultAsync();

        if (signature == null)
            return null;

        byte[]? bytes = null;
        string fileName;

        if (!string.IsNullOrEmpty(signature.SignedDocumentPath)
            && File.Exists(signature.SignedDocumentPath))
        {
            bytes = await File.ReadAllBytesAsync(signature.SignedDocumentPath);
            fileName = Path.GetFileName(signature.SignedDocumentPath);
        }
        else if (!string.IsNullOrEmpty(signature.SignatureValue))
        {
            try { bytes = Convert.FromBase64String(signature.SignatureValue); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode SignatureValue for document {DocumentId}", documentId);
            }
            fileName = $"{signature.DocumentType}_{signature.DocumentId:N}_{signature.SignedAt:yyyyMMddHHmmss}.pdf";
        }
        else
        {
            fileName = $"{signature.DocumentType}_{signature.DocumentId:N}.pdf";
        }

        if (bytes == null || bytes.Length == 0)
            return null;

        await _audit.LogAsync("public", "public-emr", "PublicEmrDownload",
            "DocumentSignature", documentId.ToString(),
            $"Tải tài liệu đã ký số ({signature.DocumentType})", ip, userAgent,
            "PublicEmr", requestPath, "GET", 200);

        return new PublicEmrDocumentFileDto
        {
            Content = bytes,
            FileName = fileName,
            ContentType = "application/pdf"
        };
    }

    private static string GenerateToken()
    {
        var raw = RandomNumberGenerator.GetBytes(24);
        return Convert.ToHexString(raw).ToLowerInvariant();
    }
}
