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

    // ============ #111 — Office/Text file signing (hash-envelope) ============
    // Strategy: CMS/PKCS#7 detached signature trên SHA-256 hash của file.
    // Native OOXML signing (Open Packaging Conventions) không có lib sẵn trong project —
    // defer sang phiên có Aspose.Words/Open-XML-SDK nếu cần nhúng vào file gốc.
    // OTP offline: reuse VerifyTotpAsync trước khi ký.

    public Task<FileSigningResult> SignDocxAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode)
        => SignOfficeFileInternalAsync(userId, fileBytes, fileName, otpCode, "docx");

    public Task<FileSigningResult> SignXlsxAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode)
        => SignOfficeFileInternalAsync(userId, fileBytes, fileName, otpCode, "xlsx");

    public Task<FileSigningResult> SignTxtAsync(Guid userId, byte[] fileBytes, string fileName, string otpCode)
        => SignOfficeFileInternalAsync(userId, fileBytes, fileName, otpCode, "txt");

    private async Task<FileSigningResult> SignOfficeFileInternalAsync(
        Guid userId, byte[] fileBytes, string fileName, string otpCode, string fileExt)
    {
        var sw = Stopwatch.StartNew();

        // 1. Xác thực OTP offline (TOTP)
        if (!string.IsNullOrEmpty(otpCode))
        {
            var otpValid = await VerifyTotpAsync(userId, otpCode);
            if (!otpValid)
                return new FileSigningResult { Success = false, Message = "Mã OTP không hợp lệ hoặc đã hết hạn" };
        }

        // 2. Lấy signing session (USB Token hoặc Windows Store)
        var session = _sessionManager.GetActiveSession(userId.ToString());
        if (session == null)
            return new FileSigningResult { Success = false, Message = "Chưa mở phiên ký số (cần PIN hoặc TOTP)" };

        try
        {
            await session.SigningSemaphore.WaitAsync();
            try
            {
                // 3. Tính SHA-256 hash của nội dung file
                using var sha256 = SHA256.Create();
                var fileHash = sha256.ComputeHash(fileBytes);

                // 4. Tạo CMS/PKCS#7 detached signature trên hash
                var contentInfo = new ContentInfo(new Oid("1.2.840.113549.1.7.1"), fileHash);
                var signedCms = new SignedCms(contentInfo, detached: true);
                var signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, session.X509Certificate);
                signer.DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"); // SHA-256
                signer.IncludeOption = X509IncludeOption.WholeChain;
                signer.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.Now));
                signedCms.ComputeSignature(signer);
                var cmsSignature = signedCms.Encode();
                sw.Stop();

                // 5. Lưu bản ghi DocumentSignature
                var docId = Guid.NewGuid();
                var sig = new DocumentSignature
                {
                    DocumentId = docId,
                    // DocumentType phân loại theo extension cho dễ query
                    DocumentType = fileExt.ToUpper() switch { "DOCX" => "OfficeDocx", "XLSX" => "OfficeXlsx", _ => "OfficeTxt" },
                    DocumentCode = Path.GetFileNameWithoutExtension(fileName),
                    SignedByUserId = userId,
                    SignedAt = DateTime.UtcNow,
                    CertificateSubject = session.CertificateSubject,
                    CertificateIssuer = session.CertificateIssuer,
                    CertificateSerial = session.CertificateSerial,
                    CertificateValidFrom = session.CertificateValidFrom,
                    CertificateValidTo = session.CertificateValidTo,
                    CaProvider = session.CaProvider,
                    TokenSerial = session.TokenSerial,
                    HashAlgorithm = "SHA-256",
                    // SignatureValue = base64(cmsDetached) — đây là PKCS#7 detached, KHÔNG phải nội dung file
                    SignatureValue = Convert.ToBase64String(cmsSignature),
                    Status = 0
                };
                _db.DocumentSignatures.Add(sig);
                await _db.SaveChangesAsync();

                await LogTransactionAsync(new SigningTransaction
                {
                    UserId = userId, Action = $"Sign{fileExt.ToUpper()}", DataType = fileExt,
                    Success = true, CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider, HashAlgorithm = "SHA-256",
                    DataSizeBytes = fileBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                });

                _sessionManager.RefreshSession(userId.ToString());

                return new FileSigningResult
                {
                    Success = true,
                    Message = $"Ký {fileExt.ToUpper()} thành công (hash-envelope CMS/PKCS#7 detached)",
                    FileHashBase64 = Convert.ToBase64String(fileHash),
                    SignatureBase64 = Convert.ToBase64String(cmsSignature),
                    SignatureRecordId = sig.Id,
                    SignerName = session.CertificateSubject,
                    CertificateSerial = session.CertificateSerial,
                    CaProvider = session.CaProvider,
                    SignedAt = DateTime.UtcNow.ToString("o"),
                    // Ghi chú kỹ thuật cho caller
                    Note = $"Chữ ký PKCS#7 detached trên SHA-256 hash của file {fileName}. " +
                           $"File gốc KHÔNG bị nhúng chữ ký — lưu SignatureBase64 kèm file để xác thực sau. " +
                           $"Verify: tính SHA256(file) rồi so với FileHashBase64, sau đó verify CMS với SignatureBase64."
                };
            }
            finally { session.SigningSemaphore.Release(); }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await LogTransactionAsync(new SigningTransaction
            {
                UserId = userId, Action = $"Sign{fileExt.ToUpper()}", DataType = fileExt,
                Success = false, ErrorMessage = ex.Message,
                DataSizeBytes = fileBytes.Length, DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
            return new FileSigningResult { Success = false, Message = $"Lỗi ký {fileExt}: {ex.Message}" };
        }
    }
}
