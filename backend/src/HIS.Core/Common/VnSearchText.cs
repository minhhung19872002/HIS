using System.Globalization;
using System.Text;

namespace HIS.Core.Common;

/// <summary>
/// So khớp tìm kiếm tiếng Việt KHÔNG DẤU, không phân biệt hoa/thường, trong bộ nhớ.
///
/// <para>Tìm bệnh nhân phải chạy trong bộ nhớ vì các cột PII được mã hoá, nên collation
/// <c>Latin1_General_CI_AI</c> của script 143/172 (#403, lễ tân gõ "nguyen" ra "Nguyễn") không còn
/// tác dụng: so <c>OrdinalIgnoreCase</c> khiến "duc" không ra "Đức" (QA vòng 6).</para>
///
/// <para>Cách bỏ dấu khớp script 192 (cột <c>NameNoDiacritics</c> của ICD): Đ/đ → D/d trước, rồi tách
/// tổ hợp Unicode (NFD) và bỏ các dấu. Chỉ dùng để SO SÁNH, không ghi đè dữ liệu gốc.</para>
/// </summary>
public static class VnSearchText
{
    /// <summary>Chuỗi đã bỏ dấu và viết thường; rỗng khi đầu vào rỗng.</summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var normalized = value.Replace('Đ', 'D').Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(char.ToLowerInvariant(ch));
        }
        return sb.ToString();
    }

    /// <summary>QA-R15: bỏ dấu tiếng Việt, GIỮ hoa/thường ("Nguyễn Đức" → "Nguyen Duc") — cho kênh không Unicode (SMS IsUnicode=0).</summary>
    public static string Unsign(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var normalized = value.Replace('Đ', 'D').Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>
    /// QA-R15: Unicode NFC (dựng sẵn). Bàn phím macOS/iOS và chữ copy từ PDF gửi tiếng Việt dạng NFD
    /// (chữ gốc + dấu rời): "Nguyễn" NFD ≠ NFC dưới collation Vietnamese_CI_AS, và iText in dấu chồng lệch.
    /// Chuỗi có ký tự không chuẩn hoá được (surrogate lẻ) giữ nguyên.
    /// </summary>
    public static string? ToNfc(string? value)
    {
        if (string.IsNullOrEmpty(value)) return value;
        try { return value.IsNormalized(NormalizationForm.FormC) ? value : value.Normalize(NormalizationForm.FormC); }
        catch (ArgumentException) { return value; }
    }

    /// <summary><paramref name="value"/> có chứa <paramref name="term"/> (đã cắt khoảng trắng) không, bỏ qua dấu
    /// và hoa/thường. Từ khoá rỗng không khớp gì.</summary>
    public static bool Contains(string? value, string? term)
    {
        var t = Fold(term?.Trim());
        return t.Length > 0 && Fold(value).Contains(t, StringComparison.Ordinal);
    }
}
