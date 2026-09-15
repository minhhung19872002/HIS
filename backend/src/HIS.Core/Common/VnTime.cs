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

    /// <summary>Thời điểm hiện tại theo giờ VN (Kind=Unspecified). Convention for business timestamps.</summary>
    public static DateTime NowVn => DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz), DateTimeKind.Unspecified);

    /// <summary>
    /// A UTC audit value (CreatedAt/UpdatedAt) expressed in VN local time — for arithmetic against
    /// business timestamps (StartTime, PrescriptionDate, ...) which are stored VN local.
    /// </summary>
    public static DateTime UtcToVn(DateTime utc) =>
        DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Tz), DateTimeKind.Unspecified);

    /// <summary>Ngày hôm nay theo giờ VN (00:00 local).</summary>
    public static DateTime TodayVn => NowVn.Date;

    /// <summary>
    /// Half-open local range [from, to) of one VN day, for BUSINESS timestamp columns
    /// (AdmissionDate, RequestDate, ReceiptDate, QueueTickets.IssueDate, SampleCollectedAt, ...)
    /// which are stored as VN local time (<see cref="NowVn"/>). Audit columns
    /// (CreatedAt/UpdatedAt/AuditLogs.Timestamp) stay UTC — use <see cref="DayRangeUtc"/> for those.
    /// </summary>
    public static (DateTime From, DateTime To) DayRangeVn(DateTime localDate)
    {
        var start = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);
        return (start, start.AddDays(1));
    }

    /// <summary>
    /// Khoảng UTC nửa mở [fromUtc, toUtc) tương ứng trọn 1 ngày local VN.
    /// Dùng CHỈ cho cột audit lưu bằng <c>DateTime.UtcNow</c> (CreatedAt/UpdatedAt/AuditLogs.Timestamp).
    /// </summary>
    public static (DateTime FromUtc, DateTime ToUtc) DayRangeUtc(DateTime localDate)
    {
        var startLocal = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);
        var fromUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, Tz);
        return (fromUtc, fromUtc.AddDays(1));
    }
}
