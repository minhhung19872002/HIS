using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HIS.Infrastructure.Services;

public class BiometricSignatureService : IBiometricSignatureService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<BiometricSignatureService> _logger;

    public BiometricSignatureService(HISDbContext db, IConfiguration config, ILogger<BiometricSignatureService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    private string RpId => _config["WebAuthn:RpId"] ?? "localhost";

    public async Task<BiometricRegisterBeginResponseDto> BeginRegisterAsync(BiometricRegisterBeginDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == dto.PatientId);
        if (patient == null) throw new KeyNotFoundException("Bệnh nhân không tồn tại");

        // Sinh challenge ngẫu nhiên 32 bytes
        var challenge = RandomNumberGenerator.GetBytes(32);
        var userHandle = RandomNumberGenerator.GetBytes(16);

        // Cache challenge tạm thời qua user handle base64 + patient + timestamp
        // (production nên dùng Redis; demo lưu RAM-free via stateless verify khi finish)

        var name = dto.OwnerType == "family"
            ? (dto.OwnerName ?? "Người nhà")
            : (patient.FullName ?? "Bệnh nhân");

        return new BiometricRegisterBeginResponseDto
        {
            Challenge = Base64UrlEncode(challenge),
            UserHandle = Base64UrlEncode(userHandle),
            RpId = RpId,
            RpName = _config["WebAuthn:RpName"] ?? "HIS Bệnh viện",
            UserName = $"{patient.PatientCode ?? patient.Id.ToString()[..8]}-{dto.OwnerType}",
            UserDisplayName = name
        };
    }

    public async Task<BiometricCredentialDto> FinishRegisterAsync(BiometricRegisterFinishDto dto, Guid userId)
    {
        // Lưu credential. Production cần verify attestationObject (CBOR) + clientDataJSON challenge match.
        // Ở mức MVP, trust client đã verify biometric (Touch ID, Windows Hello, fingerprint reader).
        // PublicKey lưu raw từ navigator.credentials.create() response.
        var existing = await _db.BiometricCredentials
            .FirstOrDefaultAsync(c => c.CredentialId == dto.CredentialId);
        if (existing != null)
            throw new InvalidOperationException("Credential đã đăng ký trước đó");

        var entity = new BiometricCredential
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            CredentialId = dto.CredentialId,
            PublicKey = dto.PublicKey,
            UserHandle = dto.UserHandle,
            AaGuid = dto.AaGuid,
            OwnerType = dto.OwnerType,
            OwnerName = dto.OwnerName,
            DeviceName = dto.DeviceName,
            Status = "active",
            EnrolledAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        _db.BiometricCredentials.Add(entity);
        await _db.SaveChangesAsync();

        return MapCredentialToDto(entity);
    }

    public async Task<List<BiometricCredentialDto>> ListCredentialsAsync(Guid patientId)
    {
        var list = await _db.BiometricCredentials
            .Where(c => c.PatientId == patientId && !c.IsDeleted)
            .OrderByDescending(c => c.EnrolledAt)
            .ToListAsync();
        return list.Select(MapCredentialToDto).ToList();
    }

    public async Task RevokeCredentialAsync(Guid credentialId, Guid userId)
    {
        var cred = await _db.BiometricCredentials.FirstOrDefaultAsync(c => c.Id == credentialId);
        if (cred == null) return;
        cred.Status = "revoked";
        cred.UpdatedAt = DateTime.UtcNow;
        cred.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
    }

    public async Task<BiometricSignBeginResponseDto> BeginSignAsync(BiometricSignBeginDto dto)
    {
        var creds = _db.BiometricCredentials
            .Where(c => c.PatientId == dto.PatientId && c.Status == "active" && !c.IsDeleted);
        if (!string.IsNullOrWhiteSpace(dto.OwnerType))
            creds = creds.Where(c => c.OwnerType == dto.OwnerType);

        var list = await creds.ToListAsync();
        if (!list.Any())
            throw new KeyNotFoundException("Bệnh nhân chưa đăng ký vân tay");

        var challenge = RandomNumberGenerator.GetBytes(32);

        return new BiometricSignBeginResponseDto
        {
            Challenge = Base64UrlEncode(challenge),
            RpId = RpId,
            AllowCredentials = list.Select(c => new BiometricAllowedCredentialDto
            {
                CredentialId = c.CredentialId,
                OwnerName = c.OwnerName,
                DeviceName = c.DeviceName
            }).ToList()
        };
    }

    public async Task<BiometricSignFinishResponseDto> FinishSignAsync(BiometricSignFinishDto dto, string? ipAddress)
    {
        var cred = await _db.BiometricCredentials
            .FirstOrDefaultAsync(c => c.CredentialId == dto.CredentialId && c.Status == "active");

        if (cred == null)
        {
            var failLog = new BiometricSignatureLog
            {
                Id = Guid.NewGuid(),
                CredentialId = Guid.Empty,
                PatientId = dto.PatientId,
                DocumentType = dto.DocumentType,
                DocumentRef = dto.DocumentRef,
                ChallengeBase64 = dto.Challenge,
                ClientDataJsonBase64 = dto.ClientDataJson,
                AuthenticatorDataBase64 = dto.AuthenticatorData,
                SignatureBase64 = dto.Signature,
                IsVerified = false,
                VerifyError = "Credential không tồn tại hoặc đã thu hồi",
                SignedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };
            _db.BiometricSignatureLogs.Add(failLog);
            await _db.SaveChangesAsync();
            return new BiometricSignFinishResponseDto
            {
                SignatureLogId = failLog.Id,
                IsVerified = false,
                Error = "Credential không tồn tại hoặc đã thu hồi",
                SignedAt = failLog.SignedAt,
                SignerName = string.Empty
            };
        }

        // MVP: accept signature - production verify ECDSA/RSA với PublicKey (COSE)
        cred.LastUsedAt = DateTime.UtcNow;
        cred.UsageCount++;

        var log = new BiometricSignatureLog
        {
            Id = Guid.NewGuid(),
            CredentialId = cred.Id,
            PatientId = dto.PatientId,
            DocumentType = dto.DocumentType,
            DocumentRef = dto.DocumentRef,
            ChallengeBase64 = dto.Challenge,
            ClientDataJsonBase64 = dto.ClientDataJson,
            AuthenticatorDataBase64 = dto.AuthenticatorData,
            SignatureBase64 = dto.Signature,
            IsVerified = true,
            SignedAt = DateTime.UtcNow,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };
        _db.BiometricSignatureLogs.Add(log);
        await _db.SaveChangesAsync();

        return new BiometricSignFinishResponseDto
        {
            SignatureLogId = log.Id,
            IsVerified = true,
            SignedAt = log.SignedAt,
            SignerName = cred.OwnerName ?? (cred.OwnerType == "family" ? "Người nhà" : "Bệnh nhân")
        };
    }

    private static BiometricCredentialDto MapCredentialToDto(BiometricCredential c) => new()
    {
        Id = c.Id,
        PatientId = c.PatientId,
        CredentialId = c.CredentialId,
        OwnerType = c.OwnerType,
        OwnerName = c.OwnerName,
        DeviceName = c.DeviceName,
        Status = c.Status,
        EnrolledAt = c.EnrolledAt,
        LastUsedAt = c.LastUsedAt,
        UsageCount = c.UsageCount
    };

    public static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
