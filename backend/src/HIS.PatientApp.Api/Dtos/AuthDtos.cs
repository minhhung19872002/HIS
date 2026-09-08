using System.ComponentModel.DataAnnotations;

namespace HIS.PatientApp.Api.Dtos;

/// <summary>Thông tin thiết bị gửi kèm mỗi lần đăng nhập (HSMT I.2 #9 quản lý thiết bị).</summary>
public class DeviceInfoDto
{
    /// <summary>Khoá thiết bị do app sinh và giữ lại — cùng máy phải luôn gửi cùng giá trị.</summary>
    [Required, MaxLength(128)]
    public string DeviceKey { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string DeviceName { get; set; } = string.Empty;

    /// <summary>ios | android</summary>
    [Required, MaxLength(20)]
    public string Platform { get; set; } = string.Empty;

    [MaxLength(50)] public string? OsVersion { get; set; }
    [MaxLength(50)] public string? AppVersion { get; set; }

    /// <summary>Token FCM, nếu người dùng đã cho phép nhận thông báo.</summary>
    [MaxLength(512)] public string? PushToken { get; set; }
}

public class RequestOtpDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>register | reset_password | link_patient</summary>
    [Required] public string Purpose { get; set; } = string.Empty;
}

public class RegisterDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string OtpCode { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Mã bệnh nhân in trên thẻ khám — có thì liên kết hồ sơ ngay khi đăng ký.</summary>
    [MaxLength(50)] public string? PatientCode { get; set; }

    [Required] public DeviceInfoDto Device { get; set; } = new();
}

public class LoginDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
    [Required] public DeviceInfoDto Device { get; set; } = new();
}

public class RefreshDto
{
    [Required] public string RefreshToken { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required] public string CurrentPassword { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string OtpCode { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class SetPinDto
{
    /// <summary>Xác thực lại bằng mật khẩu trước khi đặt PIN — PIN 6 số yếu hơn mật khẩu nhiều.</summary>
    [Required] public string Password { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Mã PIN phải gồm đúng 6 chữ số.")]
    public string Pin { get; set; } = string.Empty;
}

public class VerifyPinDto
{
    [Required, RegularExpression(@"^\d{6}$")]
    public string Pin { get; set; } = string.Empty;
}

public class EnrollBiometricDto
{
    /// <summary>Khoá công khai ECDSA P-256, mã hoá base64 theo định dạng SubjectPublicKeyInfo (DER).</summary>
    [Required, MaxLength(1024)]
    public string PublicKey { get; set; } = string.Empty;

    /// <summary>Xác thực lại bằng mật khẩu: bật sinh trắc là mở thêm một đường vào tài khoản.</summary>
    [Required] public string Password { get; set; } = string.Empty;
}

public class BiometricChallengeRequestDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string DeviceKey { get; set; } = string.Empty;
}

public class BiometricLoginDto
{
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    [Required] public string DeviceKey { get; set; } = string.Empty;
    [Required] public Guid ChallengeId { get; set; }

    /// <summary>Chữ ký DER của nonce, base64.</summary>
    [Required] public string Signature { get; set; } = string.Empty;
}

// ---------- Phản hồi ----------

public class AuthResultDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public AccountDto Account { get; set; } = new();
}

public class AccountDto
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    /// <summary>Đã liên kết hồ sơ bệnh nhân bên HIS hay chưa.</summary>
    public bool IsLinked { get; set; }

    public string? PatientCode { get; set; }

    /// <summary>App phải đưa thẳng tới màn đổi mật khẩu; server cũng chặn độc lập (HSMT I.2 #9).</summary>
    public bool MustChangePassword { get; set; }

    public bool HasPin { get; set; }
    public bool BiometricEnabled { get; set; }
}

public class DeviceDto
{
    public Guid Id { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }
    public string? LastIp { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool BiometricEnabled { get; set; }

    /// <summary>Chính là máy đang gọi API — app tô đậm để người dùng khỏi tự đăng xuất mình.</summary>
    public bool IsCurrent { get; set; }
}

public class BiometricChallengeDto
{
    public Guid ChallengeId { get; set; }
    public string Nonce { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
