namespace HIS.Core.Common;

/// <summary>
/// Che bớt họ tên bệnh nhân khi hiển thị trên bề mặt công khai (màn hình TV phòng chờ,
/// tra cứu không đăng nhập) — thực hành chuẩn: không phơi PII đầy đủ ra internet (#406).
/// "Nguyễn Văn An" → "Nguyễn V. An" · "Trần Bình" → "Trần Bình" (≤2 từ giữ nguyên).
/// </summary>
public static class NameMask
{
    public static string Mask(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return string.Empty;
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 2) return string.Join(' ', parts);
        for (var i = 1; i < parts.Length - 1; i++)
            parts[i] = parts[i][0] + ".";
        return string.Join(' ', parts);
    }
}
