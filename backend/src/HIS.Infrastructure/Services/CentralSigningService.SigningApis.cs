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
    // ============ Signing APIs ============

    public async Task<CentralSigningResult> SignHashAsync(Guid userId, byte[] hash, string hashAlgorithm)
    {
        var sw = Stopwatch.StartNew();
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new CentralSigningResult { Success = false, Message = "Chưa mở phiên ký số" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                // CMS/PKCS#7 signing of pre-hashed data
                var contentInfo = new ContentInfo(new Oid("1.2.840.113549.1.7.1"), hash);
                var signedCms = new SignedCms(contentInfo, detached: true);
                var signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, session.X509Certificate);
                signer.DigestAlgorithm = GetHashOid(hashAlgorithm);
                signer.IncludeOption = X509IncludeOption.WholeChain;
                signer.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.Now));
                signedCms.ComputeSignature(signer);

                var signatureBytes = signedCms.Encode();
                sw.Stop();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = "SignHash", DataType = "hash",
                    Success = true, CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = hashAlgorithm,
                    DataSizeBytes = hash.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new CentralSigningResult
                {
                    Success = true, Message = "Ký hash thành công",
                    SignatureBase64 = Convert.ToBase64String(signatureBytes),
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    HashAlgorithm = hashAlgorithm
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = "SignHash", DataType = "hash",
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = hash.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
            return new CentralSigningResult { Success = false, Message = $"Lỗi ký hash: {ex.Message}" };
        }
    }

    public async Task<CentralSigningResult> SignRawAsync(Guid userId, byte[] data, string hashAlgorithm)
    {
        var sw = Stopwatch.StartNew();
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new CentralSigningResult { Success = false, Message = "Chưa mở phiên ký số" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                var contentInfo = new ContentInfo(data);
                var signedCms = new SignedCms(contentInfo, detached: true);
                var signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, session.X509Certificate);
                signer.DigestAlgorithm = GetHashOid(hashAlgorithm);
                signer.IncludeOption = X509IncludeOption.WholeChain;
                signer.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.Now));
                signedCms.ComputeSignature(signer);

                var signatureBytes = signedCms.Encode();
                sw.Stop();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = "SignRaw", DataType = "raw",
                    Success = true, CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = hashAlgorithm,
                    DataSizeBytes = data.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new CentralSigningResult
                {
                    Success = true, Message = "Ký dữ liệu thành công",
                    SignatureBase64 = Convert.ToBase64String(signatureBytes),
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    HashAlgorithm = hashAlgorithm
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = "SignRaw", DataType = "raw",
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = data.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
            return new CentralSigningResult { Success = false, Message = $"Lỗi ký dữ liệu: {ex.Message}" };
        }
    }

    public async Task<PdfSigningResult> SignPdfInvisibleAsync(Guid userId, byte[] pdfBytes, string reason, string location)
    {
        var sw = Stopwatch.StartNew();
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new PdfSigningResult { Success = false, Message = "Chưa mở phiên ký số" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                // Use iText7 PdfSigner for invisible signing (no visible stamp)
                var signResult = await _pdfService.SignPdfBytesInvisibleAsync(
                    pdfBytes, session.Certificate, reason, location, session.CertificateSubject);

                sw.Stop();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = "SignPdfInvisible", DataType = "pdf",
                    Success = signResult.Success, ErrorMessage = signResult.Success ? null : signResult.Message,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = "SHA-256",
                    DataSizeBytes = pdfBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new PdfSigningResult
                {
                    Success = signResult.Success, Message = signResult.Success ? "Ký PDF ẩn thành công" : signResult.Message,
                    SignedPdfBase64 = signResult.SignedPdfBytes != null ? Convert.ToBase64String(signResult.SignedPdfBytes) : null,
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    HashAlgorithm = "SHA-256"
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = "SignPdfInvisible", DataType = "pdf",
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = pdfBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
            return new PdfSigningResult { Success = false, Message = $"Lỗi ký PDF: {ex.Message}" };
        }
    }

    public async Task<PdfSigningResult> SignPdfVisibleAsync(Guid userId, byte[] pdfBytes, SignPdfVisibleRequest config)
    {
        var sw = Stopwatch.StartNew();
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new PdfSigningResult { Success = false, Message = "Chưa mở phiên ký số" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                var signResult = await _pdfService.SignPdfBytesVisibleAsync(
                    pdfBytes, session.Certificate, config.Reason, config.Location,
                    session.CertificateSubject, config.Page, config.X, config.Y,
                    config.Width, config.Height, config.FontSize, config.FontColor,
                    config.SignatureImageBase64);

                sw.Stop();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = "SignPdfVisible", DataType = "pdf",
                    Success = signResult.Success, ErrorMessage = signResult.Success ? null : signResult.Message,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = "SHA-256",
                    DataSizeBytes = pdfBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new PdfSigningResult
                {
                    Success = signResult.Success, Message = signResult.Success ? "Ký PDF hiện vị trí thành công" : signResult.Message,
                    SignedPdfBase64 = signResult.SignedPdfBytes != null ? Convert.ToBase64String(signResult.SignedPdfBytes) : null,
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    HashAlgorithm = "SHA-256"
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = "SignPdfVisible", DataType = "pdf",
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = pdfBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
            return new PdfSigningResult { Success = false, Message = $"Lỗi ký PDF: {ex.Message}" };
        }
    }

    public async Task<XmlSigningResult> SignXmlAsync(Guid userId, string xmlContent, string? signatureNodeXPath)
    {
        var sw = Stopwatch.StartNew();
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new XmlSigningResult { Success = false, Message = "Chưa mở phiên ký số" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                var doc = new XmlDocument { PreserveWhitespace = true };
                doc.LoadXml(xmlContent);

                var signedXml = new SignedXml(doc);
                var rsaKey = session.X509Certificate.GetRSAPrivateKey();
                if (rsaKey == null)
                    return new XmlSigningResult { Success = false, Message = "Không thể lấy RSA private key" };

                signedXml.SigningKey = rsaKey;
                var reference = new Reference("");
                reference.AddTransform(new XmlDsigEnvelopedSignatureTransform());
                reference.AddTransform(new XmlDsigC14NTransform());
                signedXml.AddReference(reference);

                // Add key info with certificate
                var keyInfo = new KeyInfo();
                keyInfo.AddClause(new KeyInfoX509Data(session.X509Certificate));
                signedXml.KeyInfo = keyInfo;

                signedXml.ComputeSignature();
                var xmlDigitalSignature = signedXml.GetXml();

                // Insert signature
                if (!string.IsNullOrEmpty(signatureNodeXPath))
                {
                    var targetNode = doc.SelectSingleNode(signatureNodeXPath);
                    targetNode?.AppendChild(doc.ImportNode(xmlDigitalSignature, true));
                }
                else
                {
                    doc.DocumentElement?.AppendChild(doc.ImportNode(xmlDigitalSignature, true));
                }

                var signedXmlContent = doc.OuterXml;
                sw.Stop();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = "SignXml", DataType = "xml",
                    Success = true, CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = "SHA-256",
                    DataSizeBytes = Encoding.UTF8.GetByteCount(xmlContent),
                    DurationMs = (int)sw.ElapsedMilliseconds, Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new XmlSigningResult
                {
                    Success = true, Message = "Ký XML thành công",
                    SignedXmlContent = signedXmlContent,
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    HashAlgorithm = "SHA-256"
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = "SignXml", DataType = "xml",
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = Encoding.UTF8.GetByteCount(xmlContent),
                DurationMs = (int)sw.ElapsedMilliseconds, Timestamp = DateTime.UtcNow
            });
            return new XmlSigningResult { Success = false, Message = $"Lỗi ký XML: {ex.Message}" };
        }
    }
}
