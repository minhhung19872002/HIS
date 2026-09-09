namespace HIS.PatientApp.Api.Common;

/// <summary>
/// So sánh chuỗi phiên bản app dạng <c>"1.2.3"</c> để quyết định có buộc cập nhật hay không.
///
/// <para>Tách riêng khỏi controller vì đây là chỗ **một lỗi nhỏ khoá được cả người bệnh ra ngoài app
/// của họ**, mà lại không có gì báo: người dùng chỉ thấy màn "vui lòng cập nhật" trong khi trên kho
/// ứng dụng không có bản nào mới hơn. Logic loại đó phải kiểm được bằng test, không phải bằng cách
/// dựng cả một máy chủ lên rồi bắn HTTP vào.</para>
/// </summary>
public static class AppVersions
{
    /// <summary>
    /// Trả &lt;0 nếu <paramref name="current"/> cũ hơn <paramref name="other"/>, 0 nếu bằng,
    /// &gt;0 nếu mới hơn.
    ///
    /// <para><b>Thiếu hoặc sai định dạng thì trả 0 — coi như đủ mới.</b> Cố ý nghiêng về phía không
    /// chặn: cách làm ngược lại (chuỗi rác → phiên bản 0 → cũ hơn mọi mốc) biến một lỗi đọc chuỗi
    /// thành lệnh khoá cửa với toàn bộ người dùng.</para>
    /// </summary>
    public static int Compare(string? current, string? other)
    {
        if (string.IsNullOrWhiteSpace(current) || string.IsNullOrWhiteSpace(other)) return 0;

        var left = Parse(current);
        var right = Parse(other);

        if (left is null || right is null) return 0;

        for (var i = 0; i < Math.Max(left.Length, right.Length); i++)
        {
            // Thiếu đoạn nào coi như 0: "1.2" và "1.2.0" là cùng một phiên bản.
            var a = i < left.Length ? left[i] : 0;
            var b = i < right.Length ? right[i] : 0;
            if (a != b) return a.CompareTo(b);
        }

        return 0;
    }

    /// <summary>null khi có bất kỳ đoạn nào không phải số — bên gọi hiểu là "không đọc được".</summary>
    private static int[]? Parse(string value)
    {
        var parts = value.Split('+')[0].Split('.');   // bỏ phần build của "1.2.3+45"
        var numbers = new int[parts.Length];

        for (var i = 0; i < parts.Length; i++)
        {
            if (!int.TryParse(parts[i], out numbers[i]) || numbers[i] < 0) return null;
        }

        return numbers;
    }
}
