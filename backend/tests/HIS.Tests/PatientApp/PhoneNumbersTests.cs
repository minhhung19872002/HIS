using HIS.PatientApp.Api;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Số điện thoại là <b>định danh đăng nhập</b> của app người bệnh, và cũng là chìa dò hồ sơ bên HIS.
///
/// Chuẩn hoá lệch nhau một dạng thì cùng một người tạo được hai tài khoản: một cái thấy kết quả xét
/// nghiệm, một cái trống trơn, và người bệnh gọi lên tổng đài bảo "app mất hết dữ liệu của tôi".
/// </summary>
public class PhoneNumbersTests
{
    [Theory]
    [InlineData("0912345678")]
    [InlineData("+84912345678")]
    [InlineData("84912345678")]
    [InlineData("0084912345678")]
    [InlineData("+84 912 345 678")]
    [InlineData("0912.345.678")]
    [InlineData("0912-345-678")]
    [InlineData("  0912345678  ")]
    public void Moi_cach_go_deu_ra_cung_mot_so(string input)
    {
        Assert.Equal("+84912345678", PhoneNumbers.Normalize(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rong_thi_tra_rong_chu_khong_no(string? input)
    {
        Assert.Equal(string.Empty, PhoneNumbers.Normalize(input));
    }

    [Theory]
    [InlineData("0312345678")]   // đầu 3
    [InlineData("0512345678")]
    [InlineData("0712345678")]
    [InlineData("0812345678")]
    [InlineData("0912345678")]
    public void Cac_dau_so_di_dong_hien_hanh_deu_hop_le(string input)
    {
        Assert.True(PhoneNumbers.IsValidVietnameseMobile(input));
    }

    [Theory]
    [InlineData("0212345678")]    // đầu 2 là số cố định, không nhận OTP được
    [InlineData("091234567")]     // thiếu một chữ số
    [InlineData("09123456789")]   // thừa một chữ số
    [InlineData("khong-phai-so")]
    [InlineData("")]
    [InlineData(null)]
    public void So_khong_phai_di_dong_Viet_Nam_thi_bi_tu_choi(string? input)
    {
        Assert.False(PhoneNumbers.IsValidVietnameseMobile(input));
    }

    /// <summary>
    /// Log của hệ thống y tế không được chứa số điện thoại đầy đủ của người bệnh: log bị gom về máy
    /// giám sát, được nhiều người đọc, và giữ lâu hơn hẳn dữ liệu nghiệp vụ.
    /// </summary>
    [Fact]
    public void Che_so_thi_giau_phan_giua_va_khong_lo_so_day_du()
    {
        var masked = PhoneNumbers.Mask("0912345678");

        Assert.DoesNotContain("912345678", masked);
        Assert.Contains("****", masked);
        Assert.StartsWith("+8491", masked);
        Assert.EndsWith("678", masked);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    public void Che_mot_so_qua_ngan_thi_giau_han_chu_khong_lo_ra(string? input)
    {
        Assert.Equal("***", PhoneNumbers.Mask(input));
    }

    [Fact]
    public void Chuan_hoa_hai_lan_khong_lam_doi_ket_qua()
    {
        // Hàm này bị gọi ở nhiều tầng; không bất biến thì "+84…" sẽ thành "+84+84…" ở đâu đó.
        var once = PhoneNumbers.Normalize("0912345678");
        Assert.Equal(once, PhoneNumbers.Normalize(once));
    }
}
