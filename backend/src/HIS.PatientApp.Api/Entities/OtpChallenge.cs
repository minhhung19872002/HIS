namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Mã OTP gửi qua SMS. HIS hiện chỉ có OTP qua email cho nhân viên, không có OTP SMS công khai
/// (khảo sát §11.2 GAP 7) nên app phải tự quản lý.
///
/// Lưu BĂM của mã, không lưu mã thật — log hay bản sao lưu CSDL rò ra cũng không đăng nhập hộ được ai.
/// </summary>
public class OtpChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Số điện thoại đã chuẩn hoá +84xxxxxxxxx.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>Xem <see cref="OtpPurpose"/>. Mã cấp cho mục đích này không dùng cho mục đích khác được.</summary>
    public string Purpose { get; set; } = string.Empty;

    /// <summary>SHA-256 của mã OTP, hex thường.</summary>
    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Số lần nhập sai. Quá ngưỡng thì huỷ mã, bắt xin mã mới — chặn dò 6 chữ số.</summary>
    public int AttemptCount { get; set; }

    /// <summary>Khác null = đã dùng. Mỗi mã chỉ dùng được một lần.</summary>
    public DateTime? ConsumedAt { get; set; }

    public string? RequestedByIp { get; set; }

    public bool IsUsable(DateTime now) => ConsumedAt is null && ExpiresAt > now;
}

public static class OtpPurpose
{
    /// <summary>Đăng ký tài khoản mới.</summary>
    public const string Register = "register";

    /// <summary>Quên mật khẩu.</summary>
    public const string ResetPassword = "reset_password";

    /// <summary>Liên kết một hồ sơ bệnh nhân vào tài khoản (kể cả thành viên gia đình).</summary>
    public const string LinkPatient = "link_patient";
}
