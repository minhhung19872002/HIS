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

// WebAuthn DTOs (NangCap12)
public class WebAuthnRegisterOptionsDto
{
    public string Challenge { get; set; } = string.Empty;
    public string RpId { get; set; } = string.Empty;
    public string RpName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public int Timeout { get; set; } = 60000;
    public string Attestation { get; set; } = "none";
    public List<string> ExcludeCredentials { get; set; } = new();
}

public class WebAuthnRegisterDto
{
    public string CredentialId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string AttestationObject { get; set; } = string.Empty;
    public string ClientDataJSON { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
}

public class WebAuthnAuthOptionsDto
{
    public string Challenge { get; set; } = string.Empty;
    public string RpId { get; set; } = string.Empty;
    public int Timeout { get; set; } = 60000;
    public List<WebAuthnAllowCredentialDto> AllowCredentials { get; set; } = new();
}

public class WebAuthnAllowCredentialDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "public-key";
}

public class WebAuthnAuthenticateDto
{
    public Guid UserId { get; set; }
    public string CredentialId { get; set; } = string.Empty;
    public string AuthenticatorData { get; set; } = string.Empty;
    public string ClientDataJSON { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
}

public class WebAuthnCredentialDto
{
    public Guid Id { get; set; }
    public string CredentialId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
    public bool IsActive { get; set; }
}
