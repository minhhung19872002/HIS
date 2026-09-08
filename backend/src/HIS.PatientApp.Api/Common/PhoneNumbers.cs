using System.Text.RegularExpressions;

namespace HIS.PatientApp.Api;

/// <summary>
/// Chuẩn hoá số điện thoại Việt Nam về một dạng duy nhất <c>+84…</c>.
///
/// Số điện thoại là định danh đăng nhập của app, nên "0912345678", "84912345678", "+84 912 345 678"
/// và "0912.345.678" phải ra cùng một giá trị. Không chuẩn hoá thì cùng một người sẽ tạo được nhiều
/// tài khoản, và việc dò tìm hồ sơ bên HIS theo số điện thoại sẽ trượt.
/// </summary>
public static class PhoneNumbers
{
    private static readonly Regex NonDigits = new(@"[^\d+]", RegexOptions.Compiled);

    /// <summary>
    /// Trả về dạng chuẩn <c>+84XXXXXXXXX</c>, hoặc chuỗi rỗng nếu đầu vào rỗng.
    /// Số không nhận dạng được thì trả lại phần chữ số đã dọn, để so sánh vẫn nhất quán.
    /// </summary>
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var cleaned = NonDigits.Replace(input.Trim(), string.Empty);

        // "+84…" giữ nguyên; "0084…" và "84…" quy về cùng dạng.
        if (cleaned.StartsWith("+84")) return cleaned;
        if (cleaned.StartsWith("0084")) return "+84" + cleaned[4..];
        if (cleaned.StartsWith("84") && cleaned.Length >= 11) return "+" + cleaned;
        if (cleaned.StartsWith("0")) return "+84" + cleaned[1..];

        return cleaned;
    }

    /// <summary>
    /// Có phải số di động Việt Nam hợp lệ không: +84 rồi 9 chữ số, bắt đầu bằng 3/5/7/8/9 theo
    /// quy hoạch đầu số hiện hành.
    /// </summary>
    public static bool IsValidVietnameseMobile(string? input)
    {
        var normalized = Normalize(input);
        return Regex.IsMatch(normalized, @"^\+84[35789]\d{8}$");
    }

    /// <summary>
    /// Che số để hiển thị và ghi log: <c>+84912345678</c> → <c>+8491****678</c>.
    /// Log của hệ thống y tế không nên chứa số điện thoại đầy đủ của người bệnh.
    /// </summary>
    public static string Mask(string? input)
    {
        var normalized = Normalize(input);
        if (normalized.Length < 8) return "***";
        return string.Concat(normalized.AsSpan(0, 6), "****", normalized.AsSpan(normalized.Length - 3));
    }
}
