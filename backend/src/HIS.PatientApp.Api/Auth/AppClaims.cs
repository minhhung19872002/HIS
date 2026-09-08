namespace HIS.PatientApp.Api.Auth;

/// <summary>Tên claim trong token do BFF phát. Đặt tập trung để không gõ sai chuỗi ở nhiều nơi.</summary>
public static class AppClaims
{
    /// <summary>Id tài khoản app (khoá chính bảng app_accounts).</summary>
    public const string AccountId = "accountId";

    /// <summary>Id bệnh nhân bên HIS. Vắng mặt khi tài khoản chưa liên kết hồ sơ.</summary>
    public const string PatientId = "patientId";

    /// <summary>Thiết bị đã phát token này — để đăng xuất từ xa đúng một máy.</summary>
    public const string DeviceId = "deviceId";

    /// <summary>
    /// Con dấu thu hồi. Mỗi request được đối chiếu với giá trị trong CSDL; lệch là token chết ngay.
    /// Đây là thứ làm cho "đăng xuất từ xa" có hiệu lực tức thì thay vì đợi token hết hạn.
    /// </summary>
    public const string SecurityStamp = "securityStamp";

    /// <summary>Có mặt khi tài khoản đang bị buộc đổi mật khẩu (HSMT I.2 #9).</summary>
    public const string PasswordChangeRequired = "pwdChangeRequired";
}

/// <summary>Vai trò trong app.</summary>
public static class AppRoles
{
    /// <summary>Người bệnh dùng app.</summary>
    public const string Patient = "patient";

    /// <summary>Nhân viên CSKH dùng module tra cứu (HSMT I.3 #2). Dùng từ Phase 6.</summary>
    public const string Staff = "staff";
}
