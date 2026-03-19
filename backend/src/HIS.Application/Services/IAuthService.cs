using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto);
    Task<LoginResponseDto?> VerifyOtpAsync(VerifyOtpDto dto);
    Task<bool> ResendOtpAsync(Guid userId);
    Task<bool> EnableTwoFactorAsync(Guid userId, string password);
    Task<bool> DisableTwoFactorAsync(Guid userId, string password);
    Task<TwoFactorStatusDto?> GetTwoFactorStatusAsync(Guid userId);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
    string GenerateJwtToken(UserDto user);

    // WebAuthn (NangCap12)
    Task<List<WebAuthnCredentialDto>> GetWebAuthnCredentialsAsync(Guid userId);
    Task<WebAuthnCredentialDto?> RegisterWebAuthnCredentialAsync(Guid userId, WebAuthnRegisterDto dto);
    Task<LoginResponseDto?> AuthenticateWebAuthnAsync(WebAuthnAuthenticateDto dto);
    Task<bool> DeleteWebAuthnCredentialAsync(Guid userId, Guid credentialId);
}
