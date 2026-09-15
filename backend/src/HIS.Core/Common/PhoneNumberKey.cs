namespace HIS.Core.Common;

/// <summary>
/// Khoá so sánh số điện thoại Việt Nam: mọi cách viết của cùng một số quy về một chuỗi chữ số
/// dạng nội địa <c>0XXXXXXXXX</c>.
///
/// <para>"0901234567", "+84901234567", "84901234567" và "0901 234.567" là CÙNG một số. HIS lưu
/// dạng nào tuỳ người nhập (quầy gõ "09…", app hỗ trợ người bệnh gửi "+84…"), nên so bằng chuỗi
/// thô sẽ trượt — và mỗi lần trượt ở luồng đặt lịch là một hồ sơ bệnh nhân trùng được tạo ra.</para>
///
/// <para>Chỉ dùng để SO SÁNH. Không ghi khoá này đè lên dữ liệu gốc.</para>
/// </summary>
public static class PhoneNumberKey
{
    /// <summary>Khoá so sánh, hoặc chuỗi rỗng khi đầu vào không có chữ số nào.</summary>
    public static string Of(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var digits = new string(value.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("0084", StringComparison.Ordinal))
            digits = digits[4..];
        else if (digits.StartsWith("84", StringComparison.Ordinal) && digits.Length == 11)
            digits = digits[2..];

        // Số di động 9 chữ số còn lại sau khi bỏ mã quốc gia → thêm lại số 0 đầu.
        if (digits.Length == 9 && digits[0] != '0')
            digits = "0" + digits;

        return digits;
    }

    /// <summary>Hai giá trị có phải cùng một số không. Rỗng không bao giờ khớp với rỗng.</summary>
    public static bool Same(string? a, string? b)
    {
        var ka = Of(a);
        return ka.Length > 0 && ka == Of(b);
    }
}
