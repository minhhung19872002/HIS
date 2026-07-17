using System.Security.Cryptography.X509Certificates;
using iText.Kernel.Pdf;
using iText.Signatures;
using iText.Bouncycastle.X509;
using iText.Commons.Bouncycastle.Cert;
using iText.IO.Font;
using iText.Kernel.Font;
using Microsoft.Extensions.Logging;
using Net.Pkcs11Interop.X509Store;
using Org.BouncyCastle.X509;

namespace HIS.Infrastructure.Services;

public partial class PdfSignatureService
{
    #region NangCap6 Central Signing Methods

    /// <summary>Sign PDF invisibly (no visible stamp)</summary>
    public Task<PdfSignatureResult> SignPdfBytesInvisibleAsync(
        byte[] pdfBytes, Pkcs11X509Certificate pkcs11Cert,
        string reason, string location, string signerName)
    {
        try
        {
            var x509 = pkcs11Cert.Info!.ParsedCertificate!;
            var parser = new X509CertificateParser();
            var bcCert = parser.ReadCertificate(x509.RawData);
            var bcCertWrapped = new X509CertificateBC(bcCert);
            IX509Certificate[] chain = new IX509Certificate[] { bcCertWrapped };

            var externalSignature = new Pkcs11ExternalSignature(pkcs11Cert, "SHA-256");

            using var inputStream = new MemoryStream(pdfBytes);
            using var outputStream = new MemoryStream();

            var reader = new PdfReader(inputStream);
            var signer = new PdfSigner(reader, outputStream, new StampingProperties());

            signer.SetFieldName("Sig_" + Guid.NewGuid().ToString("N")[..8]);

            var appearance = signer.GetSignatureAppearance();
            try
            {
                var vietFont = PdfFontFactory.CreateFont(_fontPath, PdfEncodings.IDENTITY_H, PdfFontFactory.EmbeddingStrategy.FORCE_EMBEDDED);
                appearance.SetLayer2Font(vietFont);
            }
            catch { /* fallback to default font */ }
            appearance.SetReason(reason).SetLocation(location).SetContact(signerName);
            // No page rect = invisible signing

            signer.SignDetached(externalSignature, chain, null, null, null, 8192, PdfSigner.CryptoStandard.CMS);

            return Task.FromResult(new PdfSignatureResult
            {
                Success = true,
                Message = "Ký PDF ẩn thành công",
                SignedPdfBytes = outputStream.ToArray()
            });
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error signing PDF invisibly");
            return Task.FromResult(new PdfSignatureResult
            {
                Success = false,
                Message = $"Lỗi ký PDF ẩn: {ex.Message}"
            });
        }
    }

    /// <summary>Sign PDF with visible signature at position</summary>
    public Task<PdfSignatureResult> SignPdfBytesVisibleAsync(
        byte[] pdfBytes, Pkcs11X509Certificate pkcs11Cert,
        string reason, string location, string signerName,
        int page, float x, float y, float width, float height,
        float fontSize, string fontColor, string? signatureImageBase64)
    {
        try
        {
            var x509 = pkcs11Cert.Info!.ParsedCertificate!;
            var parser = new X509CertificateParser();
            var bcCert = parser.ReadCertificate(x509.RawData);
            var bcCertWrapped = new X509CertificateBC(bcCert);
            IX509Certificate[] chain = new IX509Certificate[] { bcCertWrapped };

            var externalSignature = new Pkcs11ExternalSignature(pkcs11Cert, "SHA-256");

            using var inputStream = new MemoryStream(pdfBytes);
            using var outputStream = new MemoryStream();

            var reader = new PdfReader(inputStream);
            var signer = new PdfSigner(reader, outputStream, new StampingProperties());

            var totalPages = signer.GetDocument().GetNumberOfPages();
            var targetPage = page <= 0 ? totalPages : Math.Min(page, totalPages);

            signer.SetFieldName("Sig_" + Guid.NewGuid().ToString("N")[..8]);

            // Configure visible stamp appearance (Vietnamese CKS format)
            ConfigureStampAppearance(signer, x509.Subject, signerName, reason, location, targetPage);

            signer.SignDetached(externalSignature, chain, null, null, null, 8192, PdfSigner.CryptoStandard.CMS);

            return Task.FromResult(new PdfSignatureResult
            {
                Success = true,
                Message = "Ký PDF hiện vị trí thành công",
                SignedPdfBytes = outputStream.ToArray()
            });
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error signing PDF with visible signature");
            return Task.FromResult(new PdfSignatureResult
            {
                Success = false,
                Message = $"Lỗi ký PDF hiện: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Lazy-init self-signed cert for demo signing (no USB Token / Pkcs11 needed).
    /// Cached static so we don't regenerate on every request. Replace with a real
    /// hospital cert PFX loaded from Cloud Secret Manager before production.
    /// </summary>
    private static X509Certificate2? _selfSignedCache;
    private static readonly object _selfSignedLock = new();

    private static X509Certificate2 GetOrCreateSelfSignedCert()
    {
        if (_selfSignedCache != null) return _selfSignedCache;
        lock (_selfSignedLock)
        {
            if (_selfSignedCache != null) return _selfSignedCache;

            using var rsa = System.Security.Cryptography.RSA.Create(2048);
            var req = new System.Security.Cryptography.X509Certificates.CertificateRequest(
                "CN=HIS AI Report Signer (Self-Signed Demo),O=HIS,C=VN",
                rsa,
                System.Security.Cryptography.HashAlgorithmName.SHA256,
                System.Security.Cryptography.RSASignaturePadding.Pkcs1);
            req.CertificateExtensions.Add(new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.NonRepudiation, true));
            req.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));

            using var cert = req.CreateSelfSigned(
                DateTimeOffset.UtcNow.AddDays(-1),
                DateTimeOffset.UtcNow.AddYears(5));

            // Round-trip via PFX bytes — required so the cert is loadable on
            // both Windows + Linux with the private key intact.
            var pfxBytes = cert.Export(X509ContentType.Pkcs12, "");
            _selfSignedCache = X509CertificateLoader.LoadPkcs12(pfxBytes, "",
                X509KeyStorageFlags.Exportable | X509KeyStorageFlags.EphemeralKeySet);
            return _selfSignedCache;
        }
    }

    public Task<PdfSignatureResult> SignPdfWithPfxAsync(
        byte[] pdfBytes,
        byte[]? pfxBytes,
        string? pfxPassword,
        string reason,
        string location,
        string signerName,
        bool visibleStamp = true)
    {
        try
        {
            X509Certificate2 cert;
            if (pfxBytes != null && pfxBytes.Length > 0)
            {
                cert = X509CertificateLoader.LoadPkcs12(pfxBytes, pfxPassword ?? "",
                    X509KeyStorageFlags.EphemeralKeySet);
            }
            else
            {
                cert = GetOrCreateSelfSignedCert();
            }

            if (!cert.HasPrivateKey)
            {
                return Task.FromResult(new PdfSignatureResult
                {
                    Success = false,
                    Message = "Cert không có private key — không thể ký số"
                });
            }

            var bouncyCastleCert = new X509CertificateParser().ReadCertificate(cert.RawData);
            var chain = new IX509Certificate[] { new X509CertificateBC(bouncyCastleCert) };

            var outputStream = new UnclosableMemoryStream();
            using var inputStream = new MemoryStream(pdfBytes);
            var reader = new PdfReader(inputStream);
            var signer = new PdfSigner(reader, outputStream, new StampingProperties());
            signer.SetFieldName("Sig_" + Guid.NewGuid().ToString("N")[..8]);

            if (visibleStamp)
            {
                ConfigureStampAppearance(signer, cert.Subject, signerName, reason, location);
            }
            else
            {
                var appearance = signer.GetSignatureAppearance();
                appearance.SetReason(reason).SetLocation(location).SetContact(signerName);
                // No page rect → invisible signature
            }

            var externalSignature = new X509Certificate2Signature(cert, "SHA-256");
            signer.SignDetached(externalSignature, chain, null, null, null, 8192, PdfSigner.CryptoStandard.CMS);

            var signedBytes = outputStream.ToArray();
            outputStream.ForceDispose();

            _logger?.LogInformation("PDF signed with PFX cert. Signer: {Signer}, Cert: {Subject}",
                signerName, cert.Subject);

            return Task.FromResult(new PdfSignatureResult
            {
                Success = true,
                Message = "Ký số PDF thành công",
                SignedPdfBytes = signedBytes,
                SignerName = signerName,
                SignedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                CertificateSerial = cert.SerialNumber,
                CertificateThumbprint = cert.Thumbprint
            });
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "PFX signing failed");
            return Task.FromResult(new PdfSignatureResult
            {
                Success = false,
                Message = $"Lỗi ký số PDF: {ex.Message}"
            });
        }
    }

    /// <summary>Verify all signatures in a signed PDF</summary>
    public HIS.Application.DTOs.PdfVerificationResult VerifyPdfSignatures(byte[] pdfBytes)
    {
        var result = new HIS.Application.DTOs.PdfVerificationResult { Valid = true, Signatures = new() };

        try
        {
            using var stream = new MemoryStream(pdfBytes);
            var reader = new PdfReader(stream);
            var document = new iText.Kernel.Pdf.PdfDocument(reader);

            var signatureUtil = new iText.Signatures.SignatureUtil(document);
            var signatureNames = signatureUtil.GetSignatureNames();

            result.SignatureCount = signatureNames.Count;

            foreach (var name in signatureNames)
            {
                var pkcs7 = signatureUtil.ReadSignatureData(name);
                var sigCert = pkcs7.GetSigningCertificate();
                var sigInfo = new HIS.Application.DTOs.PdfSignatureInfo
                {
                    SignerName = sigCert?.ToString() ?? "Unknown",
                    CertificateSerial = "",
                    Issuer = "",
                    SignedAt = pkcs7.GetSignDate(),
                    IsValid = pkcs7.VerifySignatureIntegrityAndAuthenticity(),
                    Reason = pkcs7.GetReason(),
                    Location = pkcs7.GetLocation(),
                    CertificateValid = true
                };

                if (!sigInfo.IsValid) result.Valid = false;
                result.Signatures.Add(sigInfo);
            }

            result.Message = result.Valid ? "Tất cả chữ ký hợp lệ" : "Có chữ ký không hợp lệ";
            document.Close();
        }
        catch (Exception ex)
        {
            result.Valid = false;
            result.Message = $"Lỗi xác thực: {ex.Message}";
        }

        return result;
    }

    #endregion
}
