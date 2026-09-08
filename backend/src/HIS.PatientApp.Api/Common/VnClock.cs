namespace HIS.PatientApp.Api.Common;

/// <summary>
/// Giờ Việt Nam (UTC+7, không có giờ mùa hè).
///
/// Máy chủ chạy Docker gần như luôn đặt UTC, nên "hôm nay" theo máy chủ lệch một múi so với "hôm nay"
/// của người bệnh: từ 17h giờ VN trở đi là đã sang ngày hôm sau theo UTC. Với chuyện chống trùng số
/// thứ tự trong ngày, lệch một ngày nghĩa là 7 tiếng cuối mỗi ngày ai cũng xin lại được số mới.
/// </summary>
public static class VnClock
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(7);

    public static DateTime Now => DateTime.UtcNow + Offset;

    public static DateOnly Today => DateOnly.FromDateTime(Now);

    /// <summary>Đổi một mốc giờ Việt Nam sang UTC để lưu vào CSDL.</summary>
    public static DateTime ToUtc(DateTime vnTime) =>
        DateTime.SpecifyKind(vnTime - Offset, DateTimeKind.Utc);
}
