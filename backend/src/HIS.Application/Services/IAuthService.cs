using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
    string GenerateJwtToken(UserDto user);
}
