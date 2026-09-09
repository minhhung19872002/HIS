using System.Security.Cryptography;
using System.Text;
using HIS.PatientApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Ví giấy tờ của người bệnh (HSMT I.2 #8) — ảnh CCCD, thẻ BHYT, giấy ra viện.
///
/// Cả bệnh viện dùng chung một thư mục trên đĩa, nên chỗ này hỏng thì hỏng theo kiểu tệ nhất: một bản
/// sao lưu rò rỉ hoặc một ổ đĩa vứt đi thành một vụ lộ giấy tờ tuỳ thân hàng loạt. Bộ test dưới đây
/// kiểm đúng những mệnh đề mà nếu sai thì không ai phát hiện được bằng mắt — tệp vẫn mở được, app vẫn
/// chạy, chỉ có điều dữ liệu không thật sự được bảo vệ.
/// </summary>
public class DocumentVaultTests : IDisposable
{
    private readonly string _root;
    private readonly string _keyBase64 = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public DocumentVaultTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "his-vault-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
        GC.SuppressFinalize(this);
    }

    private DocumentVault MakeVault(string? key = null) => new(
        new DocumentVaultOptions { RootPath = _root, Key = key ?? _keyBase64 },
        NullLogger<DocumentVault>.Instance);

    private static byte[] SampleDocument() =>
        Encoding.UTF8.GetBytes("CCCD 001075000001 — Nguyễn Văn Demo — 12/04/1975");

    [Fact]
    public async Task Ghi_roi_doc_lai_ra_dung_noi_dung_ban_dau()
    {
        var vault = MakeVault();
        var content = SampleDocument();

        var stored = await vault.WriteAsync(Guid.NewGuid(), content, default);
        var read = await vault.ReadAsync(stored.RelativePath, stored.Nonce, stored.Tag, default);

        Assert.Equal(content, read);
    }

    /// <summary>
    /// Mệnh đề quan trọng nhất: <b>tệp trên đĩa không được chứa nội dung gốc</b>. Nếu một lần refactor
    /// nào đó vô tình ghi thẳng bản rõ, mọi test khác vẫn xanh — chỉ bài này đỏ.
    /// </summary>
    [Fact]
    public async Task Tep_tren_dia_KHONG_chua_noi_dung_goc()
    {
        var vault = MakeVault();
        var content = SampleDocument();

        var stored = await vault.WriteAsync(Guid.NewGuid(), content, default);
        var onDisk = await File.ReadAllBytesAsync(Path.Combine(_root, stored.RelativePath));

        Assert.NotEqual(content, onDisk);
        Assert.DoesNotContain("001075000001", Encoding.UTF8.GetString(onDisk));
        Assert.DoesNotContain("Nguyễn Văn Demo", Encoding.UTF8.GetString(onDisk));
    }

    [Fact]
    public async Task Sai_khoa_thi_KHONG_giai_ma_duoc()
    {
        var stored = await MakeVault().WriteAsync(Guid.NewGuid(), SampleDocument(), default);

        var otherKeyVault = MakeVault(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));

        await Assert.ThrowsAsync<AuthenticationTagMismatchException>(
            () => otherKeyVault.ReadAsync(stored.RelativePath, stored.Nonce, stored.Tag, default));
    }

    /// <summary>
    /// Vì sao chọn GCM chứ không phải CBC: sửa một byte phải hỏng ngay chứ không được ra dữ liệu rác
    /// một cách lặng lẽ — app sẽ hiển thị "ảnh giấy tờ" méo mó mà không ai biết nó đã bị can thiệp.
    /// </summary>
    [Fact]
    public async Task Sua_mot_byte_trong_tep_thi_bi_phat_hien()
    {
        var vault = MakeVault();
        var stored = await vault.WriteAsync(Guid.NewGuid(), SampleDocument(), default);

        var path = Path.Combine(_root, stored.RelativePath);
        var cipher = await File.ReadAllBytesAsync(path);
        cipher[0] ^= 0xFF;
        await File.WriteAllBytesAsync(path, cipher);

        await Assert.ThrowsAsync<AuthenticationTagMismatchException>(
            () => vault.ReadAsync(stored.RelativePath, stored.Nonce, stored.Tag, default));
    }

    [Fact]
    public async Task Sua_the_xac_thuc_cung_bi_phat_hien()
    {
        var vault = MakeVault();
        var stored = await vault.WriteAsync(Guid.NewGuid(), SampleDocument(), default);

        var forgedTag = (byte[])stored.Tag.Clone();
        forgedTag[0] ^= 0xFF;

        await Assert.ThrowsAsync<AuthenticationTagMismatchException>(
            () => vault.ReadAsync(stored.RelativePath, stored.Nonce, forgedTag, default));
    }

    /// <summary>
    /// Dùng lại nonce với cùng một khoá là lỗi kinh điển làm sập hoàn toàn AES-GCM. Hai tệp giống hệt
    /// nhau phải ra hai bản mã khác nhau — nếu không, chỉ nhìn thư mục đã biết ai nộp cùng một giấy.
    /// </summary>
    [Fact]
    public async Task Moi_tep_mot_nonce_rieng_du_noi_dung_giong_het()
    {
        var vault = MakeVault();
        var account = Guid.NewGuid();
        var content = SampleDocument();

        var a = await vault.WriteAsync(account, content, default);
        var b = await vault.WriteAsync(account, content, default);

        Assert.NotEqual(a.Nonce, b.Nonce);
        Assert.NotEqual(a.RelativePath, b.RelativePath);

        var cipherA = await File.ReadAllBytesAsync(Path.Combine(_root, a.RelativePath));
        var cipherB = await File.ReadAllBytesAsync(Path.Combine(_root, b.RelativePath));
        Assert.NotEqual(cipherA, cipherB);
    }

    [Fact]
    public async Task Ma_bam_ghi_kem_la_cua_noi_dung_GOC_khong_phai_ban_ma()
    {
        var vault = MakeVault();
        var content = SampleDocument();

        var stored = await vault.WriteAsync(Guid.NewGuid(), content, default);

        var expected = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant();
        Assert.Equal(expected, stored.Sha256);
    }

    [Fact]
    public async Task Giay_to_cua_hai_tai_khoan_nam_o_hai_thu_muc_khac_nhau()
    {
        var vault = MakeVault();

        var a = await vault.WriteAsync(Guid.NewGuid(), SampleDocument(), default);
        var b = await vault.WriteAsync(Guid.NewGuid(), SampleDocument(), default);

        Assert.NotEqual(Path.GetDirectoryName(a.RelativePath), Path.GetDirectoryName(b.RelativePath));
    }

    [Fact]
    public async Task Xoa_thi_tep_bien_khoi_dia_va_doc_lai_tra_null()
    {
        var vault = MakeVault();
        var stored = await vault.WriteAsync(Guid.NewGuid(), SampleDocument(), default);

        vault.Delete(stored.RelativePath);

        Assert.False(File.Exists(Path.Combine(_root, stored.RelativePath)));
        Assert.Null(await vault.ReadAsync(stored.RelativePath, stored.Nonce, stored.Tag, default));
    }

    [Fact]
    public void Xoa_mot_tep_khong_ton_tai_thi_im_lang_chu_khong_no()
    {
        // Xoá tài khoản chạy qua đây; một tệp đã mất không được phép làm hỏng cả thao tác xoá.
        MakeVault().Delete("khong/co/that.bin");
    }

    [Fact]
    public void Khoa_sai_do_dai_thi_bao_loi_ngay_luc_dung_vault()
    {
        var shortKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));

        var error = Assert.Throws<InvalidOperationException>(() => MakeVault(shortKey));
        Assert.Contains("32 byte", error.Message);
    }

    [Fact]
    public async Task Han_muc_doc_ra_dung_don_vi_megabyte()
    {
        var vault = new DocumentVault(
            new DocumentVaultOptions
            {
                RootPath = _root, Key = _keyBase64,
                MaxFileMegabytes = 10, QuotaMegabytesPerAccount = 100,
            },
            NullLogger<DocumentVault>.Instance);

        Assert.Equal(10L * 1024 * 1024, vault.MaxFileBytes);
        Assert.Equal(100L * 1024 * 1024, vault.QuotaBytes);

        await Task.CompletedTask;
    }
}
