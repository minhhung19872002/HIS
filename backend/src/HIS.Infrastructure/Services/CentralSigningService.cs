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

namespace HIS.Infrastructure.Services;

/// <summary>
/// Centralized signing service implementing 12 API functions required by NangCap6 (BV Xanh Pon).
/// Supports: sign hash, sign raw, sign PDF (invisible/visible), sign XML, verify all formats.
/// </summary>
public interface ICentralSigningService
{
    // Signing APIs
    Task<CentralSigningResult> SignHashAsync(Guid userId, byte[] hash, string hashAlgorithm);
    Task<CentralSigningResult> SignRawAsync(Guid userId, byte[] data, string hashAlgorithm);
    Task<PdfSigningResult> SignPdfInvisibleAsync(Guid userId, byte[] pdfBytes, string reason, string location);
    Task<PdfSigningResult> SignPdfVisibleAsync(Guid userId, byte[] pdfBytes, SignPdfVisibleRequest config);
    Task<XmlSigningResult> SignXmlAsync(Guid userId, string xmlContent, string? signatureNodeXPath);

    // Verification APIs
    Task<DataVerificationResult> VerifyRawSignatureAsync(byte[] data, byte[] signature);
    Task<DataVerificationResult> VerifyHashSignatureAsync(byte[] hash, byte[] signature, string hashAlgorithm);
    Task<PdfVerificationResult> VerifyPdfAsync(byte[] pdfBytes);

    // Signature image APIs
    Task<SignatureImageResult> GetSignatureImageAsync(Guid userId);
    Task<SignatureImageResult> GetAnimatedSignatureImageAsync(Guid userId);

    // Admin APIs
    Task<List<ManagedCertificateDto>> GetManagedCertificatesAsync(string? keyword, bool? isActive);
    Task<ManagedCertificateDto?> SaveManagedCertificateAsync(SaveManagedCertificateRequest request);
    Task<bool> DeleteManagedCertificateAsync(Guid id);
    Task<List<SigningTransactionDto>> GetTransactionsAsync(SigningTransactionSearchDto search);
    Task<int> GetTransactionCountAsync(SigningTransactionSearchDto search);
    Task<SigningStatisticsDto> GetStatisticsAsync();
    Task LogTransactionAsync(SigningTransaction transaction);

    // HSM APIs
    Task<HsmInfoDto> GetHsmInfoAsync();
    Task<CsrResult> CreateCsrAsync(CreateCsrRequest request);
    Task<bool> UploadSignatureImageAsync(string cccd, byte[] imageBytes);
    Task<List<string>> ExportCertificateSerialListAsync();

    // TOTP APIs
    Task<SigningTotpSetupDto> SetupTotpAsync(Guid userId);
    Task<bool> VerifyTotpAsync(Guid userId, string otpCode);
    Task<bool> DisableTotpAsync(Guid userId);

    // Signature appearance
    Task<SignatureAppearanceDto> GetAppearanceConfigAsync();
    Task<bool> SaveAppearanceConfigAsync(SignatureAppearanceDto config);
}

public class CentralSigningService : ICentralSigningService
{
    private readonly Pkcs11SessionManager _sessionManager;
    private readonly IPdfSignatureService _pdfService;
    private readonly HISDbContext _db;
    private readonly ILogger<CentralSigningService> _logger;

    public CentralSigningService(
        Pkcs11SessionManager sessionManager,
        IPdfSignatureService pdfService,
        HISDbContext db,
        ILogger<CentralSigningService> logger)
    {
        _sessionManager = sessionManager;
        _pdfService = pdfService;
        _db = db;
        _logger = logger;
    }

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

    // ============ Admin APIs ============

    public async Task<List<ManagedCertificateDto>> GetManagedCertificatesAsync(string? keyword, bool? isActive)
    {
        var query = _db.Set<ManagedCertificate>().Include(c => c.OwnerUser).AsQueryable();

        if (isActive.HasValue) query = query.Where(c => c.IsActive == isActive.Value);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.SubjectName.Contains(keyword) || c.SerialNumber.Contains(keyword)
                || c.Cccd != null && c.Cccd.Contains(keyword));

        return await query.OrderByDescending(c => c.CreatedAt).Select(c => new ManagedCertificateDto
        {
            Id = c.Id, SerialNumber = c.SerialNumber, SubjectName = c.SubjectName,
            IssuerName = c.IssuerName, CaProvider = c.CaProvider,
            ValidFrom = c.ValidFrom, ValidTo = c.ValidTo, IsActive = c.IsActive,
            OwnerUserId = c.OwnerUserId.HasValue ? c.OwnerUserId.Value.ToString() : null,
            OwnerFullName = c.OwnerUser != null ? c.OwnerUser.FullName : null,
            Cccd = c.Cccd, SignatureImagePath = c.SignatureImagePath,
            StorageType = c.StorageType, CreatedAt = c.CreatedAt
        }).ToListAsync();
    }

    public async Task<ManagedCertificateDto?> SaveManagedCertificateAsync(SaveManagedCertificateRequest request)
    {
        ManagedCertificate entity;
        if (request.Id.HasValue)
        {
            entity = await _db.Set<ManagedCertificate>().FindAsync(request.Id.Value) ?? new ManagedCertificate();
        }
        else
        {
            entity = new ManagedCertificate();
            _db.Set<ManagedCertificate>().Add(entity);
        }

        entity.SerialNumber = request.SerialNumber;
        entity.SubjectName = request.SubjectName;
        entity.IssuerName = request.IssuerName;
        entity.CaProvider = request.CaProvider;
        entity.ValidFrom = request.ValidFrom;
        entity.ValidTo = request.ValidTo;
        entity.IsActive = request.IsActive;
        entity.Cccd = request.Cccd;
        entity.StorageType = request.StorageType;
        if (!string.IsNullOrEmpty(request.OwnerUserId) && Guid.TryParse(request.OwnerUserId, out var ownerId))
            entity.OwnerUserId = ownerId;

        await _db.SaveChangesAsync();

        return new ManagedCertificateDto
        {
            Id = entity.Id, SerialNumber = entity.SerialNumber, SubjectName = entity.SubjectName,
            IssuerName = entity.IssuerName, CaProvider = entity.CaProvider,
            ValidFrom = entity.ValidFrom, ValidTo = entity.ValidTo, IsActive = entity.IsActive,
            StorageType = entity.StorageType, Cccd = entity.Cccd, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteManagedCertificateAsync(Guid id)
    {
        var entity = await _db.Set<ManagedCertificate>().FindAsync(id);
        if (entity == null) return false;
        _db.Set<ManagedCertificate>().Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<SigningTransactionDto>> GetTransactionsAsync(SigningTransactionSearchDto search)
    {
        var query = _db.Set<SigningTransaction>().Include(t => t.User).AsQueryable();

        if (!string.IsNullOrEmpty(search.UserId)) query = query.Where(t => t.UserId.ToString() == search.UserId);
        if (!string.IsNullOrEmpty(search.Action)) query = query.Where(t => t.Action == search.Action);
        if (!string.IsNullOrEmpty(search.DataType)) query = query.Where(t => t.DataType == search.DataType);
        if (search.Success.HasValue) query = query.Where(t => t.Success == search.Success.Value);
        if (search.DateFrom.HasValue) query = query.Where(t => t.Timestamp >= search.DateFrom.Value);
        if (search.DateTo.HasValue) query = query.Where(t => t.Timestamp <= search.DateTo.Value);
        if (!string.IsNullOrEmpty(search.Keyword))
            query = query.Where(t => (t.User != null && t.User.FullName.Contains(search.Keyword)) || t.CertificateSerial != null && t.CertificateSerial.Contains(search.Keyword));

        return await query.OrderByDescending(t => t.Timestamp)
            .Skip(search.PageIndex * search.PageSize).Take(search.PageSize)
            .Select(t => new SigningTransactionDto
            {
                Id = t.Id, UserId = t.UserId.ToString(),
                UserFullName = t.User != null ? t.User.FullName : "",
                Action = t.Action, DataType = t.DataType, Success = t.Success,
                ErrorMessage = t.ErrorMessage, CertificateSerial = t.CertificateSerial,
                CaProvider = t.CaProvider, HashAlgorithm = t.HashAlgorithm,
                DataSizeBytes = t.DataSizeBytes, DurationMs = t.DurationMs,
                IpAddress = t.IpAddress, Timestamp = t.Timestamp
            }).ToListAsync();
    }

    public async Task<int> GetTransactionCountAsync(SigningTransactionSearchDto search)
    {
        var query = _db.Set<SigningTransaction>().AsQueryable();
        if (!string.IsNullOrEmpty(search.UserId)) query = query.Where(t => t.UserId.ToString() == search.UserId);
        if (!string.IsNullOrEmpty(search.Action)) query = query.Where(t => t.Action == search.Action);
        if (search.Success.HasValue) query = query.Where(t => t.Success == search.Success.Value);
        if (search.DateFrom.HasValue) query = query.Where(t => t.Timestamp >= search.DateFrom.Value);
        if (search.DateTo.HasValue) query = query.Where(t => t.Timestamp <= search.DateTo.Value);
        return await query.CountAsync();
    }

    public async Task<SigningStatisticsDto> GetStatisticsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var thirtyDaysAgo = today.AddDays(-30);

        var stats = new SigningStatisticsDto
        {
            TotalTransactions = await _db.Set<SigningTransaction>().CountAsync(),
            TotalSuccess = await _db.Set<SigningTransaction>().CountAsync(t => t.Success),
            TotalFailed = await _db.Set<SigningTransaction>().CountAsync(t => !t.Success),
            ActiveCertificates = await _db.Set<ManagedCertificate>().CountAsync(c => c.IsActive && c.ValidTo > DateTime.UtcNow),
            ExpiringSoon = await _db.Set<ManagedCertificate>().CountAsync(c => c.IsActive && c.ValidTo > DateTime.UtcNow && c.ValidTo <= DateTime.UtcNow.AddDays(30)),
            ExpiredCertificates = await _db.Set<ManagedCertificate>().CountAsync(c => c.ValidTo <= DateTime.UtcNow),
            ActiveUsers = await _db.Set<SigningTransaction>().Where(t => t.Timestamp >= thirtyDaysAgo).Select(t => t.UserId).Distinct().CountAsync(),
            TodayTransactions = await _db.Set<SigningTransaction>().CountAsync(t => t.Timestamp >= today),
        };

        // Daily trend (last 7 days) - materialize then group in memory
        var sevenDaysAgo = today.AddDays(-7);
        var recentTx = await _db.Set<SigningTransaction>()
            .Where(t => t.Timestamp >= sevenDaysAgo)
            .Select(t => t.Timestamp)
            .ToListAsync();
        stats.DailyTrend = recentTx
            .GroupBy(ts => ts.Date)
            .Select(g => new SigningDailyCount { Date = g.Key.ToString("dd/MM"), Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToList();

        // By type - materialize then group
        var allTypes = await _db.Set<SigningTransaction>()
            .Select(t => t.DataType)
            .ToListAsync();
        stats.ByType = allTypes
            .GroupBy(dt => dt)
            .Select(g => new SigningByTypeCount { DataType = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        // Top users (last 30 days) - materialize then group
        var recentUserTx = await _db.Set<SigningTransaction>()
            .Where(t => t.Timestamp >= thirtyDaysAgo)
            .Include(t => t.User)
            .Select(t => new { t.UserId, UserName = t.User != null ? t.User.FullName : "Unknown" })
            .ToListAsync();
        stats.TopUsers = recentUserTx
            .GroupBy(t => new { t.UserId, t.UserName })
            .Select(g => new SigningByUserCount { UserFullName = g.Key.UserName, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(10)
            .ToList();

        return stats;
    }

    public async Task LogTransactionAsync(SigningTransaction transaction)
    {
        try
        {
            _db.Set<SigningTransaction>().Add(transaction);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log signing transaction");
        }
    }

    // ============ HSM APIs (stub - requires hardware) ============

    public Task<HsmInfoDto> GetHsmInfoAsync()
    {
        // HSM hardware connectivity stub
        return Task.FromResult(new HsmInfoDto
        {
            Connected = false,
            Model = "HSM chưa được kết nối",
            FirmwareVersion = "N/A",
            TotalSlots = 0, UsedSlots = 0, AvailableSlots = 0,
            Slots = new List<HsmSlotDto>()
        });
    }

    public Task<CsrResult> CreateCsrAsync(CreateCsrRequest request)
    {
        try
        {
            using var rsa = RSA.Create(request.KeySize);
            var subjectName = $"CN={request.CommonName},O={request.Organization},OU={request.OrganizationUnit},C={request.Country},ST={request.Province}";
            var certRequest = new CertificateRequest(subjectName, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            var csrDer = certRequest.CreateSigningRequest();
            var csrPem = "-----BEGIN CERTIFICATE REQUEST-----\n" +
                Convert.ToBase64String(csrDer, Base64FormattingOptions.InsertLineBreaks) +
                "\n-----END CERTIFICATE REQUEST-----";

            return Task.FromResult(new CsrResult { Success = true, CsrPem = csrPem });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new CsrResult { Success = false, Message = ex.Message });
        }
    }

    public async Task<bool> UploadSignatureImageAsync(string cccd, byte[] imageBytes)
    {
        var cert = await _db.Set<ManagedCertificate>().FirstOrDefaultAsync(c => c.Cccd == cccd);
        if (cert == null) return false;

        var dir = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "SignatureImages");
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"{cccd}.png");
        await File.WriteAllBytesAsync(filePath, imageBytes);
        cert.SignatureImagePath = filePath;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<string>> ExportCertificateSerialListAsync()
    {
        return await _db.Set<ManagedCertificate>()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SerialNumber)
            .Select(c => c.SerialNumber)
            .ToListAsync();
    }

    // ============ TOTP APIs ============

    public async Task<SigningTotpSetupDto> SetupTotpAsync(Guid userId)
    {
        var existing = await _db.Set<SigningTotpSecret>().FirstOrDefaultAsync(t => t.UserId == userId);
        if (existing != null && existing.IsEnabled)
        {
            return new SigningTotpSetupDto { Enabled = true };
        }

        // Generate new TOTP secret (Base32)
        var secretBytes = new byte[20];
        RandomNumberGenerator.Fill(secretBytes);
        var secretBase32 = Base32Encode(secretBytes);

        if (existing == null)
        {
            existing = new SigningTotpSecret { UserId = userId, SecretKey = secretBase32, IsEnabled = false };
            _db.Set<SigningTotpSecret>().Add(existing);
        }
        else
        {
            existing.SecretKey = secretBase32;
            existing.IsEnabled = false;
        }
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var issuer = "HIS-CKS";
        var account = user?.Username ?? userId.ToString();
        var otpauthUri = $"otpauth://totp/{issuer}:{account}?secret={secretBase32}&issuer={issuer}&digits=6&period=30";

        return new SigningTotpSetupDto
        {
            Enabled = false,
            SecretKey = secretBase32,
            QrCodeUri = otpauthUri,
            ManualEntryKey = secretBase32
        };
    }

    public async Task<bool> VerifyTotpAsync(Guid userId, string otpCode)
    {
        var secret = await _db.Set<SigningTotpSecret>().FirstOrDefaultAsync(t => t.UserId == userId);
        if (secret == null) return false;

        if (secret.LockedUntil.HasValue && DateTime.UtcNow < secret.LockedUntil.Value)
            return false;

        var secretBytes = Base32Decode(secret.SecretKey);
        var timeStep = (long)(DateTime.UtcNow - DateTime.UnixEpoch).TotalSeconds / 30;

        // Check current and adjacent time steps (±1 for clock drift)
        for (var i = -1; i <= 1; i++)
        {
            var expectedCode = GenerateTotpCode(secretBytes, timeStep + i);
            if (expectedCode == otpCode)
            {
                secret.IsEnabled = true;
                secret.LastVerifiedAt = DateTime.UtcNow;
                secret.FailedAttempts = 0;
                secret.LockedUntil = null;
                await _db.SaveChangesAsync();
                return true;
            }
        }

        secret.FailedAttempts++;
        if (secret.FailedAttempts >= 5)
            secret.LockedUntil = DateTime.UtcNow.AddMinutes(5);
        await _db.SaveChangesAsync();
        return false;
    }

    public async Task<bool> DisableTotpAsync(Guid userId)
    {
        var secret = await _db.Set<SigningTotpSecret>().FirstOrDefaultAsync(t => t.UserId == userId);
        if (secret == null) return false;
        secret.IsEnabled = false;
        await _db.SaveChangesAsync();
        return true;
    }

    // ============ Signature Appearance Config ============

    public async Task<SignatureAppearanceDto> GetAppearanceConfigAsync()
    {
        var config = await _db.Set<SystemConfig>()
            .FirstOrDefaultAsync(c => c.ConfigKey == "SignatureAppearance");

        if (config?.ConfigValue != null)
        {
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<SignatureAppearanceDto>(config.ConfigValue)
                    ?? new SignatureAppearanceDto();
            }
            catch { }
        }
        return new SignatureAppearanceDto();
    }

    public async Task<bool> SaveAppearanceConfigAsync(SignatureAppearanceDto dto)
    {
        var config = await _db.Set<SystemConfig>()
            .FirstOrDefaultAsync(c => c.ConfigKey == "SignatureAppearance");

        var json = System.Text.Json.JsonSerializer.Serialize(dto);

        if (config == null)
        {
            _db.Set<SystemConfig>().Add(new SystemConfig
            {
                ConfigKey = "SignatureAppearance",
                ConfigValue = json,
                Description = "Cấu hình hiển thị chữ ký số trên PDF"
            });
        }
        else
        {
            config.ConfigValue = json;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    // ============ Private Helpers ============

    private static Oid GetHashOid(string algorithm) => algorithm.ToUpper() switch
    {
        "SHA1" => new Oid("1.3.14.3.2.26"),
        "SHA256" or "SHA-256" => new Oid("2.16.840.1.101.3.4.2.1"),
        "SHA384" or "SHA-384" => new Oid("2.16.840.1.101.3.4.2.2"),
        "SHA512" or "SHA-512" => new Oid("2.16.840.1.101.3.4.2.3"),
        _ => new Oid("2.16.840.1.101.3.4.2.1") // default SHA-256
    };

    private static string GetCN(string dn)
    {
        foreach (var part in dn.Split(','))
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
                return trimmed[3..].Trim();
        }
        return dn;
    }

    private static string GenerateSignatureSvg(string signerName, bool animated)
    {
        var animAttr = animated ? @" opacity=""0""><animate attributeName=""opacity"" from=""0"" to=""1"" dur=""1s"" fill=""freeze""/>" : ">";
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" width=""200"" height=""80"" viewBox=""0 0 200 80"">
  <rect width=""200"" height=""80"" fill=""none"" stroke=""#ccc"" stroke-width=""1""/>
  <text x=""100"" y=""25"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""12"" fill=""#000080""{animAttr}Đã ký số</text>
  <text x=""100"" y=""45"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""11"" fill=""#000080"">{System.Security.SecurityElement.Escape(signerName)}</text>
  <text x=""100"" y=""65"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""9"" fill=""#666"">{DateTime.UtcNow:dd/MM/yyyy HH:mm}</text>
</svg>";
    }

    // TOTP Helpers
    private static string GenerateTotpCode(byte[] secret, long timeStep)
    {
        var timeBytes = BitConverter.GetBytes(timeStep);
        if (BitConverter.IsLittleEndian) Array.Reverse(timeBytes);
        using var hmac = new HMACSHA1(secret);
        var hash = hmac.ComputeHash(timeBytes);
        var offset = hash[^1] & 0x0F;
        var code = ((hash[offset] & 0x7F) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
        return (code % 1000000).ToString("D6");
    }

    private static string Base32Encode(byte[] data)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5) { bitsLeft -= 5; sb.Append(chars[(buffer >> bitsLeft) & 0x1F]); }
        }
        if (bitsLeft > 0) sb.Append(chars[(buffer << (5 - bitsLeft)) & 0x1F]);
        return sb.ToString();
    }

    private static byte[] Base32Decode(string encoded)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var output = new List<byte>();
        int buffer = 0, bitsLeft = 0;
        foreach (var c in encoded.ToUpper())
        {
            var val = chars.IndexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) { bitsLeft -= 8; output.Add((byte)(buffer >> bitsLeft)); }
        }
        return output.ToArray();
    }
}
