namespace HIS.Application.DTOs;

public class LoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = null!;
    public bool RequiresOtp { get; set; } = false;
    public Guid? OtpUserId { get; set; }
    public string? MaskedEmail { get; set; }
    public DateTime? OtpExpiresAt { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? EmployeeCode { get; set; }
    public string? Title { get; set; }
    public string? DepartmentName { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<string> RoleCodes { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public bool IsTwoFactorEnabled { get; set; }
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class VerifyOtpDto
{
    public Guid UserId { get; set; }
    public string OtpCode { get; set; } = string.Empty;
}

public class TwoFactorStatusDto
{
    public bool IsEnabled { get; set; }
    public string? MaskedEmail { get; set; }
}

public class EnableTwoFactorDto
{
    public string Password { get; set; } = string.Empty;
}
