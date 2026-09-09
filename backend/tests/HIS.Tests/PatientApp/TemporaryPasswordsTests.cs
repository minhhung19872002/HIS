using HIS.PatientApp.Api.Controllers;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Mật khẩu tạm do quầy/tổng đài cấp khi người bệnh quên mật khẩu (HSMT I.3 #1).
///
/// Ràng buộc thật của nó không phải "thật ngẫu nhiên" mà là <b>đọc được qua điện thoại</b>: nhân viên
/// đọc, người bệnh gõ. Lẫn 0 với O hay 1 với l là người bệnh gõ sai, gọi lại, và nhân viên cấp thêm
/// một mật khẩu nữa — vòng lặp đó mới là thứ làm hỏng quy trình.
/// </summary>
public class TemporaryPasswordsTests
{
    [Fact]
    public void Khong_chua_ky_tu_de_nghe_nham_khi_doc_qua_dien_thoai()
    {
        foreach (var _ in Enumerable.Range(0, 500))
        {
            var password = TemporaryPasswords.Generate();

            Assert.DoesNotContain('0', password);
            Assert.DoesNotContain('O', password);
            Assert.DoesNotContain('1', password);
            Assert.DoesNotContain('I', password);
            Assert.DoesNotContain('l', password);
        }
    }

    [Fact]
    public void Dung_dinh_dang_ba_chu_bon_so_mot_ky_tu_dac_biet()
    {
        var password = TemporaryPasswords.Generate();

        Assert.Equal(8, password.Length);
        Assert.All(password[..3], c => Assert.True(char.IsAsciiLetterUpper(c), $"'{c}' phải là chữ hoa"));
        Assert.All(password[3..7], c => Assert.True(char.IsAsciiDigit(c), $"'{c}' phải là chữ số"));
        Assert.EndsWith("@", password);
    }

    /// <summary>
    /// Sinh trùng nhau nghĩa là nguồn ngẫu nhiên hỏng — và mật khẩu tạm đoán được thì ai gọi tổng đài
    /// trước sẽ vào được tài khoản của người khác.
    /// </summary>
    [Fact]
    public void Sinh_nhieu_lan_thi_khong_trung_nhau()
    {
        var generated = Enumerable.Range(0, 200).Select(_ => TemporaryPasswords.Generate()).ToList();

        Assert.Equal(generated.Count, generated.Distinct().Count());
    }

    [Fact]
    public void Dat_duoc_ca_hai_dau_cua_moi_bang_chu_cai()
    {
        // Nếu chỉ số ngẫu nhiên bị lệch (vd luôn bỏ ký tự cuối), 2000 lần sinh sẽ lộ ra ngay.
        var all = string.Concat(Enumerable.Range(0, 2000).Select(_ => TemporaryPasswords.Generate()));

        Assert.Contains('A', all);
        Assert.Contains('Z', all);
        Assert.Contains('2', all);
        Assert.Contains('9', all);
    }
}
