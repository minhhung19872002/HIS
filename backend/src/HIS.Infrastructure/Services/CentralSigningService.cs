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

    // #111 — Office/text file signing (hash-envelope approach)
    // Lý do dùng hash-envelope: iText7 chỉ hỗ trợ PAdES (PDF). OOXML signing (docx/xlsx)
    // cần Open Packaging Conventions — không có lib sẵn trong project. Giải pháp được chọn:
    // tính SHA-256 hash của file, tạo CMS/PKCS#7 detached signature, lưu DocumentSignatures
    // với SignatureValue = base64(cms), trả về base64 của {hash, cms} cho client có thể verify.
    // Equivalent "ký bao bì/hash" — đảm bảo toàn vẹn tài liệu + truy vết pháp lý.
    Task<FileSigningResult> SignDocxAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode);
    Task<FileSigningResult> SignXlsxAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode);
    Task<FileSigningResult> SignTxtAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode);

    // Signature appearance
    Task<SignatureAppearanceDto> GetAppearanceConfigAsync();
    Task<bool> SaveAppearanceConfigAsync(SignatureAppearanceDto config);
}

public partial class CentralSigningService : ICentralSigningService
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

}
