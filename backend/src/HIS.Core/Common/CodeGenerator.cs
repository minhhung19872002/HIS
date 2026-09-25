namespace HIS.Core.Common;

/// <summary>
/// Sinh mã nghiệp vụ theo định dạng chuẩn — gom các chỗ interpolate prefix + timestamp rải rác (#349).
/// Mục tiêu: 1 nơi giữ convention sinh mã, để sau này muốn đổi (vd thêm random chống va chạm trong cùng giây)
/// chỉ sửa 1 chỗ. CHỈ gom các call-site có format Y HỆT — KHÔNG đổi output (behavior-preserving).
/// </summary>
public static class CodeGenerator
{
    private static long _lastTicks;

    /// <summary>
    /// Mã dạng <c>"{prefix}{separator}{yyyyMMddHHmmssfff}"</c> theo giờ server (<see cref="System.DateTime.Now"/>).
    /// QA-R11: bản cũ chỉ tới giây — hai bản ghi tạo trong cùng một giây trùng mã (vd hai lịch hẹn cùng mã).
    /// Nay thêm mili-giây và mỗi lần gọi trong process lấy mốc tăng dần nghiêm ngặt (≥ lần trước + 1 ms),
    /// nên hai lần gọi liền nhau không bao giờ ra cùng một mã.
    /// </summary>
    /// <param name="prefix">Tiền tố mã (vd "TELE", "INC", "BHYT").</param>
    /// <param name="separator">Ký tự ngăn cách prefix và timestamp; mặc định "-".</param>
    public static string Timestamp(string prefix, string separator = "-")
        => $"{prefix}{separator}{NextUniqueNow():yyyyMMddHHmmssfff}";

    /// <summary>Current server time, strictly increasing by at least 1 ms per call within this process.</summary>
    public static System.DateTime NextUniqueNow()
    {
        const long tick = System.TimeSpan.TicksPerMillisecond;
        while (true)
        {
            var last = System.Threading.Interlocked.Read(ref _lastTicks);
            var now = System.DateTime.Now.Ticks / tick * tick;
            var next = now > last ? now : last + tick;
            if (System.Threading.Interlocked.CompareExchange(ref _lastTicks, next, last) == last)
                return new System.DateTime(next);
        }
    }
}
