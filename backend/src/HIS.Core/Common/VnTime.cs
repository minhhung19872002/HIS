namespace HIS.Core.Common;

/// <summary>
/// Quy đổi thời gian giờ Việt Nam (UTC+7) ↔ UTC cho các query "trong ngày".
///
/// Bối cảnh: audit field (CreatedAt/UpdatedAt) lưu <c>DateTime.UtcNow</c> (HISDbContext),
/// còn FE gửi ngày local VN. So sánh kiểu <c>x.CreatedAt.Date == date.Date</c> sẽ sai
/// trong khung 00h–07h sáng VN (bản ghi rơi vào bucket UTC của ngày hôm trước) —
/// ca trực đêm đăng ký BN sẽ không thấy BN trên bảng "hôm nay".
///
/// Cách dùng cho query EF (sargable, không gọi hàm trên cột):
/// <code>
/// var (fromUtc, toUtc) = VnTime.DayRangeUtc(date);
/// query.Where(m => m.CreatedAt >= fromUtc && m.CreatedAt < toUtc);
/// </code>
/// </summary>
public static class VnTime
{
    private static readonly TimeZoneInfo Tz = ResolveTz();

    private static TimeZoneInfo ResolveTz()
    {
        // Linux (Cloud Run) dùng IANA id; Windows dev dùng id Windows.
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"); }
        catch
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
            catch { return TimeZoneInfo.CreateCustomTimeZone("VN+7", TimeSpan.FromHours(7), "VN+7", "VN+7"); }
        }
    }

    /// <summary>Thời điểm hiện tại theo giờ VN.</summary>
    public static DateTime NowVn => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);

    /// <summary>Ngày hôm nay theo giờ VN (00:00 local).</summary>
    public static DateTime TodayVn => NowVn.Date;

    /// <summary>
    /// Khoảng UTC nửa mở [fromUtc, toUtc) tương ứng trọn 1 ngày local VN.
    /// Dùng để so với cột lưu bằng <c>DateTime.UtcNow</c>.
    /// </summary>
    public static (DateTime FromUtc, DateTime ToUtc) DayRangeUtc(DateTime localDate)
    {
        var startLocal = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);
        var fromUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, Tz);
        return (fromUtc, fromUtc.AddDays(1));
    }
}
