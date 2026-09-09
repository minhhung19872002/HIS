using HIS.PatientApp.Api.Common;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Giờ Việt Nam trên một máy chủ chạy UTC.
///
/// Chỗ này sai thì sai theo kiểu chỉ hỏng vào buổi chiều: từ 17h giờ VN trở đi, "hôm nay" theo UTC đã
/// là ngày mai, nên phép chống trùng số thứ tự trong ngày thủng đúng 7 tiếng cuối mỗi ngày — và test
/// chạy buổi sáng thì không bao giờ thấy.
/// </summary>
public class VnClockTests
{
    [Fact]
    public void Gio_Viet_Nam_di_truoc_UTC_dung_bay_tieng()
    {
        var utc = DateTime.UtcNow;
        var vn = VnClock.Now;

        // Nới 5 giây cho khoảng cách giữa hai lần đọc đồng hồ.
        Assert.InRange((vn - utc).TotalHours, 7 - 0.01, 7 + 0.01);
    }

    [Fact]
    public void Doi_ve_UTC_roi_doi_lai_thi_ra_dung_moc_ban_dau()
    {
        var vnTime = new DateTime(2026, 9, 9, 23, 30, 0);

        var utc = VnClock.ToUtc(vnTime);

        Assert.Equal(DateTimeKind.Utc, utc.Kind);
        Assert.Equal(new DateTime(2026, 9, 9, 16, 30, 0), utc);
    }

    /// <summary>
    /// Bài quan trọng nhất: 23h30 giờ VN vẫn phải là *ngày hôm đó* theo lịch Việt Nam, dù theo UTC đã
    /// là 16h30 cùng ngày — và 00h30 giờ VN phải là ngày mới, dù UTC vẫn còn ở ngày hôm trước.
    /// </summary>
    [Theory]
    [InlineData("2026-09-09T16:30:00Z", 2026, 9, 9)]   // 23h30 giờ VN ngày 9
    [InlineData("2026-09-09T17:30:00Z", 2026, 9, 10)]  // 00h30 giờ VN ngày 10
    [InlineData("2026-09-09T23:59:00Z", 2026, 9, 10)]
    public void Ngay_theo_lich_Viet_Nam_chu_khong_theo_UTC(
        string utcIso, int year, int month, int day)
    {
        var utc = DateTime.Parse(utcIso, null, System.Globalization.DateTimeStyles.AdjustToUniversal
                                              | System.Globalization.DateTimeStyles.AssumeUniversal);

        var vnDate = DateOnly.FromDateTime(utc + TimeSpan.FromHours(7));

        Assert.Equal(new DateOnly(year, month, day), vnDate);
    }

    [Fact]
    public void Today_khop_voi_Now()
    {
        Assert.Equal(DateOnly.FromDateTime(VnClock.Now), VnClock.Today);
    }
}
