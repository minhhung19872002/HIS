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
    string GenerateJwtToken(UserDto user, string? securityStamp = null);

    /// <summary>
    /// AUTHZ-2 (#368): xoay vòng refresh token — xác thực token FE gửi, phát hiện reuse (revoke family +
    /// xoay SecurityStamp), cấp access token + refresh token MỚI. Trả null nếu token không hợp lệ/hết hạn/bị thu hồi.
    /// </summary>
    Task<LoginResponseDto?> RefreshTokenAsync(RefreshTokenRequestDto dto);

    /// <summary>
    /// AUTHZ-2 (#368): đăng xuất — thu hồi refresh token của ĐÚNG thiết bị này + đóng UserSession tương ứng.
    /// KHÔNG xoay SecurityStamp (không đá các thiết bị khác của cùng user — phù hợp máy trạm dùng chung).
    /// </summary>
    Task<bool> LogoutAsync(Guid userId, string? refreshToken);

    /// <summary>
    /// Xác thực mật khẩu của một user theo userId — dùng để confirm danh tính người duyệt.
    /// KHÔNG log password. Trả false nếu user không tồn tại hoặc mật khẩu sai.
    /// </summary>
    Task<bool> VerifyPasswordAsync(Guid userId, string password);

    // WebAuthn (NangCap12)
    Task<List<WebAuthnCredentialDto>> GetWebAuthnCredentialsAsync(Guid userId);
    Task<WebAuthnCredentialDto?> RegisterWebAuthnCredentialAsync(Guid userId, WebAuthnRegisterDto dto);
    Task<LoginResponseDto?> AuthenticateWebAuthnAsync(WebAuthnAuthenticateDto dto);
    Task<bool> DeleteWebAuthnCredentialAsync(Guid userId, Guid credentialId);

    /// <summary>
    /// #385 Break-glass: tạo phiên truy cập khẩn cấp (TTL 2h), ghi audit log, gửi alert realtime.
    /// Trả null nếu lý do quá ngắn (&lt;20 ký tự).
    /// </summary>
    Task<BreakGlassResponseDto?> BreakGlassAsync(Guid userId, BreakGlassRequestDto dto, string? ipAddress);
}
