namespace HIS.Core.Common;

/// <summary>
/// Chính sách mật khẩu — thuần, không phụ thuộc DB/DI để test thẳng bằng xunit (#216 TC-PERM-015).
///
/// <para>Hai câu hỏi tách bạch: (1) <see cref="Validate"/> — mật khẩu MỚI có đủ mạnh không;
/// (2) <see cref="MustChange"/> — tài khoản này có đang bị BUỘC đổi không (cờ admin đặt, hoặc mật
/// khẩu đã quá tuổi). Cái thứ hai được tính lúc phát token và đặt vào JWT claim, để middleware chặn
/// mà không phải chạm DB mỗi request.</para>
/// </summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    public const string ReasonFirstLogin = "first_login";
    public const string ReasonExpired = "expired";

    /// <summary>
    /// Kiểm mật khẩu mới. Trả <c>null</c> khi đạt, ngược lại là câu tiếng Việt để hiện thẳng cho
    /// người dùng. Cố ý KHÔNG đòi ký tự đặc biệt: luật đó khiến người ta viết mật khẩu ra giấy dán
    /// màn hình; độ dài + chữ lẫn số là đủ cho môi trường máy trạm bệnh viện.
    /// </summary>
    public static string? Validate(string? newPassword, string? currentPassword, string? username)
    {
        if (string.IsNullOrWhiteSpace(newPassword))
            return "Chưa nhập mật khẩu mới.";
        if (newPassword.Length < MinLength)
            return $"Mật khẩu phải có ít nhất {MinLength} ký tự.";
        if (!newPassword.Any(char.IsLetter) || !newPassword.Any(char.IsDigit))
            return "Mật khẩu phải có cả chữ và số.";
        if (!string.IsNullOrEmpty(currentPassword) && newPassword == currentPassword)
            return "Mật khẩu mới phải khác mật khẩu hiện tại.";
        if (!string.IsNullOrEmpty(username)
            && newPassword.Contains(username, StringComparison.OrdinalIgnoreCase))
            return "Mật khẩu không được chứa tên đăng nhập.";
        return null;
    }

    /// <summary>Mật khẩu quá tuổi chưa? <paramref name="maxAgeDays"/> ≤ 0 = tắt hết hạn.
    /// <paramref name="changedAt"/> null = chưa biết mốc → KHÔNG coi là hết hạn (migration 183
    /// đã backfill, null chỉ còn ở dữ liệu lạ; chặn nhầm tệ hơn bỏ sót).</summary>
    public static bool IsExpired(DateTime? changedAt, int maxAgeDays, DateTime nowUtc)
    {
        if (maxAgeDays <= 0 || !changedAt.HasValue) return false;
        return changedAt.Value.AddDays(maxAgeDays) <= nowUtc;
    }

    /// <summary>Lý do buộc đổi, hoặc <c>null</c> nếu không bị buộc. Cờ admin đặt ưu tiên hơn hết hạn.</summary>
    public static string? MustChange(bool mustChangeFlag, DateTime? changedAt, int maxAgeDays, DateTime nowUtc)
    {
        if (mustChangeFlag) return ReasonFirstLogin;
        return IsExpired(changedAt, maxAgeDays, nowUtc) ? ReasonExpired : null;
    }
}
