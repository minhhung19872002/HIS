using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Xml;
using System.Text;
using System.Xml;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class CentralSigningService
{
    // ============ Verification APIs ============

    public Task<DataVerificationResult> VerifyRawSignatureAsync(byte[] data, byte[] signature)
    {
        try
        {
            var contentInfo = new ContentInfo(data);
            var signedCms = new SignedCms(contentInfo, detached: true);
            signedCms.Decode(signature);
            signedCms.CheckSignature(verifySignatureOnly: false);

            var signerInfo = signedCms.SignerInfos[0];
            var cert = signerInfo.Certificate;
            var signingTime = signerInfo.SignedAttributes
                .OfType<CryptographicAttributeObject>()
                .FirstOrDefault(a => a.Oid?.Value == "1.2.840.113549.1.9.5");

            return Task.FromResult(new DataVerificationResult
            {
                Valid = true, Message = "Chữ ký hợp lệ",
                SignerName = cert != null ? GetCN(cert.Subject) : "Unknown",
                CertificateSerial = cert?.SerialNumber ?? "",
                Issuer = cert != null ? GetCN(cert.Issuer) : "",
                CertificateValid = cert != null && DateTime.Now >= cert.NotBefore && DateTime.Now <= cert.NotAfter
            });
        }
        catch (CryptographicException ex)
        {
            return Task.FromResult(new DataVerificationResult
            {
                Valid = false, Message = $"Chữ ký không hợp lệ: {ex.Message}"
            });
        }
    }

    public Task<DataVerificationResult> VerifyHashSignatureAsync(byte[] hash, byte[] signature, string hashAlgorithm)
    {
        // Hash verification uses same CMS/PKCS#7 approach
        return VerifyRawSignatureAsync(hash, signature);
    }

    public Task<PdfVerificationResult> VerifyPdfAsync(byte[] pdfBytes)
    {
        try
        {
            // Use iText7 to extract and verify PDF signatures
            var result = _pdfService.VerifyPdfSignatures(pdfBytes);
            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            return Task.FromResult(new PdfVerificationResult
            {
                Valid = false, Message = $"Lỗi xác thực PDF: {ex.Message}"
            });
        }
    }

    // ============ Signature Image APIs ============

    public async Task<SignatureImageResult> GetSignatureImageAsync(Guid userId)
    {
        // Look for stored signature image from managed certificate
        var cert = await _db.Set<ManagedCertificate>()
            .FirstOrDefaultAsync(c => c.OwnerUserId == userId && c.IsActive && c.SignatureImagePath != null);

        if (cert?.SignatureImagePath != null && File.Exists(cert.SignatureImagePath))
        {
            var imageBytes = await File.ReadAllBytesAsync(cert.SignatureImagePath);
            return new SignatureImageResult
            {
                Success = true,
                ImageBase64 = Convert.ToBase64String(imageBytes),
                SignerName = cert.SubjectName,
                CertificateSerial = cert.SerialNumber,
                Width = 200, Height = 80
            };
        }

        // Generate from certificate subject name
        var session = _sessionManager.GetActiveSession(userId.ToString());
        var signerName = session?.CertificateSubject ?? cert?.SubjectName ?? "Unknown";

        // Generate simple signature image as SVG→Base64
        var svg = GenerateSignatureSvg(signerName, false);
        return new SignatureImageResult
        {
            Success = true,
            ImageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg)),
            SignerName = signerName,
            CertificateSerial = session?.CertificateSerial ?? cert?.SerialNumber ?? "",
            Width = 200, Height = 80
        };
    }

    public async Task<SignatureImageResult> GetAnimatedSignatureImageAsync(Guid userId)
    {
        var staticResult = await GetSignatureImageAsync(userId);
        // Animated version adds SVG animation attributes
        var svg = GenerateSignatureSvg(staticResult.SignerName ?? "Unknown", true);
        return new SignatureImageResult
        {
            Success = true,
            ImageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg)),
            SignerName = staticResult.SignerName,
            CertificateSerial = staticResult.CertificateSerial,
            Width = 200, Height = 80
        };
    }
}
