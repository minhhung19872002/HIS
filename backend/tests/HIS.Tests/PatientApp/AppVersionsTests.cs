using HIS.PatientApp.Api.Common;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Cổng buộc-cập-nhật của app người bệnh (HSMT I.2 #1).
///
/// Đây là chỗ hỏng thì <b>im lặng và toàn diện</b>: so sánh sai một chiều là toàn bộ người bệnh thấy
/// màn "vui lòng cập nhật" trong khi kho ứng dụng không có bản nào mới hơn, và họ không vào được app
/// của chính mình. Không có log nào báo, vì về mặt kỹ thuật chẳng có gì lỗi cả.
/// </summary>
public class AppVersionsTests
{
    [Theory]
    [InlineData("1.0.0", "1.0.1")]
    [InlineData("1.0.9", "1.1.0")]
    [InlineData("1.9.9", "2.0.0")]
    [InlineData("2.3.4", "10.0.0")]   // so theo số, không so theo chữ: "10" phải mới hơn "2"
    public void Ban_cu_hon_thi_tra_so_am(string current, string newer)
    {
        Assert.True(AppVersions.Compare(current, newer) < 0);
        Assert.True(AppVersions.Compare(newer, current) > 0);
    }

    [Theory]
    [InlineData("1.2.3", "1.2.3")]
    [InlineData("1.2", "1.2.0")]        // thiếu đoạn cuối = 0
    [InlineData("1.2.3+45", "1.2.3")]   // phần build không tính vào phiên bản
    [InlineData("1.2.3+45", "1.2.3+99")]
    public void Hai_ban_tuong_duong_thi_tra_khong(string a, string b)
    {
        Assert.Equal(0, AppVersions.Compare(a, b));
    }

    /// <summary>
    /// Bẫy chính, và là lỗi đã thật sự xảy ra một lần: chuỗi không đọc được từng bị quy về phiên bản
    /// 0, tức là cũ hơn mọi mốc, tức là <b>khoá hết mọi người dùng</b>. Hướng đúng phải ngược lại.
    /// </summary>
    [Theory]
    [InlineData("khong-phai-phien-ban")]
    [InlineData("abc")]
    [InlineData("1.2.x")]
    [InlineData("v1.2.3")]      // tiền tố "v" cũng là không đọc được — thà không chặn còn hơn chặn oan
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Phien_ban_khong_doc_duoc_thi_KHONG_chan_ai(string? unparseable)
    {
        // 0 = "đủ mới" ⇒ UpdateRequired = false.
        Assert.Equal(0, AppVersions.Compare(unparseable, "9.9.9"));
    }

    [Fact]
    public void Moc_toi_thieu_khong_doc_duoc_cung_KHONG_chan_ai()
    {
        // Cấu hình trên máy chủ gõ nhầm thì cũng không được phép khoá người bệnh ra ngoài.
        Assert.Equal(0, AppVersions.Compare("1.0.0", "khong-phai-phien-ban"));
    }

    [Fact]
    public void Phien_ban_am_coi_nhu_khong_doc_duoc()
    {
        Assert.Equal(0, AppVersions.Compare("1.-2.3", "9.9.9"));
    }

    [Fact]
    public void So_sanh_co_tinh_bac_cau_tren_mot_day_that()
    {
        var releases = new[] { "1.0.0", "1.0.1", "1.1.0", "1.10.0", "2.0.0", "10.0.0" };

        for (var i = 0; i + 1 < releases.Length; i++)
        {
            Assert.True(AppVersions.Compare(releases[i], releases[i + 1]) < 0,
                $"{releases[i]} phải cũ hơn {releases[i + 1]}");
        }
    }
}
