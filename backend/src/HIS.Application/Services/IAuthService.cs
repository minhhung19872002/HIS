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
}
