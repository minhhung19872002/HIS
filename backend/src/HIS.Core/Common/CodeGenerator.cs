namespace HIS.Core.Common;

/// <summary>
/// Sinh mã nghiệp vụ theo định dạng chuẩn — gom các chỗ interpolate prefix + timestamp rải rác (#349).
/// Mục tiêu: 1 nơi giữ convention sinh mã, để sau này muốn đổi (vd thêm random chống va chạm trong cùng giây)
/// chỉ sửa 1 chỗ. CHỈ gom các call-site có format Y HỆT — KHÔNG đổi output (behavior-preserving).
/// </summary>
public static class CodeGenerator
{
    /// <summary>
    /// Mã dạng <c>"{prefix}{separator}{yyyyMMddHHmmss}"</c> theo giờ server (<see cref="System.DateTime.Now"/>).
    /// Đây là định dạng phổ biến nhất trong các service nghiệp vụ (vd <c>TELE-20260624101530</c>).
    /// Giữ NGUYÊN format cũ — chỉ thay nơi build chuỗi, output không đổi.
    /// </summary>
    /// <param name="prefix">Tiền tố mã (vd "TELE", "INC", "BHYT").</param>
    /// <param name="separator">Ký tự ngăn cách prefix và timestamp; mặc định "-".</param>
    public static string Timestamp(string prefix, string separator = "-")
        => $"{prefix}{separator}{System.DateTime.Now:yyyyMMddHHmmss}";
}
