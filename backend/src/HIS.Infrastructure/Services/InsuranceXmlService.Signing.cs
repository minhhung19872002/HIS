using System.IO.Compression;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Insurance;
using HIS.Core.Entities;

using HIS.Core.Constants;

namespace HIS.Infrastructure.Services;

// #441: ký số đợt XML BHYT theo mô hình **client-side USB-token** (quyết định user 2026-08-02).
//
// Luồng:
//   1. Client GET sign-payload  → nhận ZIP các file XML của đợt (base64) + digest SHA-256.
//   2. Plugin ký bằng khóa nằm TRONG USB-token của kế toán — khóa KHÔNG rời token,
//      backend KHÔNG BAO GIỜ giữ khóa bí mật (khác hẳn hướng PFX server-side).
//   3. Client POST signature + chứng thư công khai.
//   4. Backend **verify** chữ ký bằng public key trong chứng thư + kiểm hiệu lực chứng thư,
//      rồi mới lưu. Nhận chữ ký mà không verify thì bản ghi "đã ký" là vô nghĩa.
//
// Backend KHÔNG tự sinh chữ ký ở bất kỳ đâu.
public partial class InsuranceXmlService
{
    private const string XmlBatchDocumentType = "InsuranceXmlBatch";

    /// <summary>
    /// Gói các file XML của đợt thành ZIP — dùng chung cho KÝ và GỬI BHXH (ký cái gì thì gửi đúng cái đó).
    ///
    /// **PHẢI deterministic**: cùng tập file → cùng byte. Mặc định `ZipArchive.CreateEntry` gắn
    /// `LastWriteTime = now` nên mỗi lần đóng gói ra bytes khác nhau → chữ ký ký ở lần đóng gói này
    /// không verify được ở lần sau (phát hiện khi smoke #441). Vì vậy: sắp xếp file theo thứ tự cố định
    /// + đóng băng timestamp entry.
    /// </summary>
    private static readonly DateTimeOffset ZipFixedTimestamp = new(1980, 1, 1, 0, 0, 0, TimeSpan.Zero);

    internal static async Task<byte[]> PackBatchAsync(string batchPath)
    {
        using var zip = new MemoryStream();
        using (var archive = new ZipArchive(zip, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var f in Directory.GetFiles(batchPath, "*.xml")
                         .OrderBy(f => Path.GetFileName(f), StringComparer.Ordinal))
            {
                var entry = archive.CreateEntry(Path.GetFileName(f), CompressionLevel.Optimal);
                entry.LastWriteTime = ZipFixedTimestamp; // đóng băng để bytes ổn định
                using var es = entry.Open();
                await es.WriteAsync(await File.ReadAllBytesAsync(f));
            }
        }
        return zip.ToArray();
    }

    public async Task<XmlSignPayloadDto?> GetXmlSignPayloadAsync(Guid batchId)
    {
        var batch = await _context.Set<InsuranceXmlBatch>()
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId && !b.IsDeleted);

        if (batch == null || string.IsNullOrWhiteSpace(batch.FilePath) || !Directory.Exists(batch.FilePath))
        {
            _logger.LogWarning("Sign payload unavailable for batch {BatchId}", batchId);
            return null;
        }

        var content = await PackBatchAsync(batch.FilePath);
        if (content.Length == 0) return null;

        return new XmlSignPayloadDto
        {
            BatchId = batch.Id,
            BatchCode = batch.BatchCode,
            FileName = $"{batch.BatchCode}.zip",
            ContentBase64 = Convert.ToBase64String(content),
            DigestBase64 = Convert.ToBase64String(SHA256.HashData(content)),
            HashAlgorithm = "SHA-256",
        };
    }

    public async Task<XmlSignatureResultDto> ApplyXmlSignatureAsync(Guid batchId, SubmitXmlSignatureDto dto, Guid userId)
    {
        var fail = (string msg) => new XmlSignatureResultDto { Success = false, Message = msg };

        var batch = await _context.Set<InsuranceXmlBatch>()
            .FirstOrDefaultAsync(b => b.Id == batchId && !b.IsDeleted);
        if (batch == null) return fail("Không tìm thấy đợt xuất XML.");

        // #218/T3 (2026-09-04): ký lại một đợt ĐÃ GỬI sẽ đặt `Status = 1` đè lên `2`, tức lặng lẽ
        // xoá dấu vết rằng đợt đó đã được truyền lên cơ quan bảo hiểm. Đặt guard ở NGAY ĐÂY, trước
        // mọi việc đọc chứng thư — nếu đặt sau, người dùng nhận được lỗi mật mã và không hiểu vì sao.
        InsuranceXmlBatchStatus.EnsureNotSubmitted(batch.Status, "ký lại");

        if (string.IsNullOrWhiteSpace(batch.FilePath) || !Directory.Exists(batch.FilePath))
            return fail($"Đợt {batch.BatchCode} không còn file XML trên máy chủ. Vui lòng xuất lại.");

        if (string.IsNullOrWhiteSpace(dto.SignatureValue)) return fail("Thiếu giá trị chữ ký.");
        if (string.IsNullOrWhiteSpace(dto.CertificateBase64)) return fail("Thiếu chứng thư số.");

        byte[] sigBytes, certBytes;
        try { sigBytes = Convert.FromBase64String(dto.SignatureValue); }
        catch { return fail("Giá trị chữ ký không phải base64 hợp lệ."); }
        try { certBytes = Convert.FromBase64String(StripPem(dto.CertificateBase64)); }
        catch { return fail("Chứng thư số không phải base64 hợp lệ."); }

        X509Certificate2 cert;
        try { cert = X509CertificateLoader.LoadCertificate(certBytes); }
        catch (Exception ex) { return fail($"Không đọc được chứng thư số: {ex.Message}"); }

        using (cert)
        {
            var now = DateTime.Now;
            if (now < cert.NotBefore || now > cert.NotAfter)
                return fail($"Chứng thư số hết hiệu lực (từ {cert.NotBefore:dd/MM/yyyy} đến {cert.NotAfter:dd/MM/yyyy}).");

            var content = await PackBatchAsync(batch.FilePath);
            if (content.Length == 0) return fail("Đợt không có file XML nào để ký.");

            if (!VerifySignature(cert, content, sigBytes))
            {
                // Ghi cảnh báo: chữ ký không khớp = client ký nhầm đợt, hoặc dữ liệu đã đổi sau khi ký.
                _logger.LogWarning("XML signature verification FAILED for batch {BatchCode} (cert {Subject})",
                    batch.BatchCode, cert.Subject);
                return fail("Chữ ký không khớp với nội dung đợt XML. Có thể đợt đã được xuất lại sau khi ký — vui lòng ký lại.");
            }

            // Ký lại đợt → thu hồi chữ ký cũ để chỉ còn 1 chữ ký hiệu lực.
            var old = await _context.DocumentSignatures
                .Where(s => s.DocumentId == batchId && s.DocumentType == XmlBatchDocumentType
                            && s.Status == 0 && !s.IsDeleted)
                .ToListAsync();
            foreach (var o in old)
            {
                o.Status = 1;
                o.RevokeReason = "Ký lại đợt XML";
                o.RevokedAt = DateTime.Now;
                o.RevokedByUserId = userId;
                o.UpdatedAt = DateTime.UtcNow;
            }

            var signature = new DocumentSignature
            {
                Id = Guid.NewGuid(),
                DocumentId = batchId,
                DocumentType = XmlBatchDocumentType,
                DocumentCode = batch.BatchCode,
                SignedByUserId = userId,
                SignedAt = DateTime.Now,
                CertificateSubject = cert.Subject,
                CertificateIssuer = cert.Issuer,
                CertificateSerial = cert.SerialNumber,
                CertificateValidFrom = cert.NotBefore,
                CertificateValidTo = cert.NotAfter,
                CaProvider = dto.CaProvider ?? string.Empty,
                TokenSerial = dto.TokenSerial ?? string.Empty,
                SignatureValue = dto.SignatureValue,
                HashAlgorithm = string.IsNullOrWhiteSpace(dto.HashAlgorithm) ? "SHA-256" : dto.HashAlgorithm,
                Status = 0,
                CreatedAt = DateTime.UtcNow,
            };
            _context.DocumentSignatures.Add(signature);

            batch.Status = 1; // đã ký số
            batch.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("XML batch {BatchCode} signed by user {UserId} (cert {Subject})",
                batch.BatchCode, userId, cert.Subject);

            return new XmlSignatureResultDto
            {
                Success = true,
                Message = "Đã ghi nhận chữ ký số cho đợt XML.",
                SignatureId = signature.Id,
                CertificateSubject = cert.Subject,
                SignedAt = signature.SignedAt,
            };
        }
    }

    /// <summary>Bỏ header/footer PEM nếu client gửi dạng PEM thay vì base64 DER thuần.</summary>
    private static string StripPem(string value)
        => value.Replace("-----BEGIN CERTIFICATE-----", string.Empty)
                .Replace("-----END CERTIFICATE-----", string.Empty)
                .Replace("\r", string.Empty).Replace("\n", string.Empty).Trim();

    /// <summary>Verify bằng PUBLIC key trong chứng thư — hỗ trợ RSA (PKCS#1 v1.5) và ECDSA.</summary>
    private static bool VerifySignature(X509Certificate2 cert, byte[] content, byte[] signature)
    {
        try
        {
            using var rsa = cert.GetRSAPublicKey();
            if (rsa != null)
                return rsa.VerifyData(content, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            using var ecdsa = cert.GetECDsaPublicKey();
            if (ecdsa != null)
                return ecdsa.VerifyData(content, signature, HashAlgorithmName.SHA256);

            return false;
        }
        catch
        {
            return false;
        }
    }
}
