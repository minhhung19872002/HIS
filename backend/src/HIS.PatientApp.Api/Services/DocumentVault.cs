using System.Security.Cryptography;

namespace HIS.PatientApp.Api.Services;

/// <summary>
/// Kho giấy tờ có mã hoá (HSMT I.2 #8).
///
/// <para>Nội dung tệp <b>không</b> nằm trong CSDL và <b>không</b> nằm dạng thô trên đĩa: mỗi tệp được
/// mã hoá AES-256-GCM với một nonce ngẫu nhiên riêng. Ảnh chụp CCCD và thẻ BHYT của cả bệnh viện nằm
/// chung một thư mục — một bản sao lưu bị rò rỉ hay một ổ đĩa bị vứt đi không được phép trở thành một
/// vụ lộ dữ liệu.</para>
///
/// <para>Chọn GCM chứ không phải CBC vì GCM vừa mã hoá vừa xác thực: sửa một byte trong tệp là giải
/// mã hỏng ngay, không ra dữ liệu rác lặng lẽ.</para>
/// </summary>
public class DocumentVault
{
    private readonly DocumentVaultOptions _options;
    private readonly byte[] _key;
    private readonly ILogger<DocumentVault> _logger;

    public DocumentVault(DocumentVaultOptions options, ILogger<DocumentVault> logger)
    {
        _options = options;
        _logger = logger;
        _key = ResolveKey(options.Key);
    }

    public long MaxFileBytes => _options.MaxFileMegabytes * 1024L * 1024L;
    public long QuotaBytes => _options.QuotaMegabytesPerAccount * 1024L * 1024L;

    /// <summary>
    /// Ghi một tệp đã mã hoá. Trả về đường dẫn tương đối, nonce và thẻ xác thực để lưu vào CSDL.
    /// </summary>
    public async Task<StoredFile> WriteAsync(Guid accountId, byte[] content, CancellationToken ct)
    {
        // Mỗi tài khoản một thư mục con: dọn dẹp khi xoá tài khoản chỉ là xoá một thư mục, và không
        // có thư mục nào phình tới hàng trăm nghìn tệp.
        var relativeDir = Path.Combine(accountId.ToString("N")[..2], accountId.ToString("N"));
        var fileName = Guid.NewGuid().ToString("N") + ".bin";
        var relativePath = Path.Combine(relativeDir, fileName).Replace('\\', '/');

        var absoluteDir = Path.Combine(_options.RootPath, relativeDir);
        Directory.CreateDirectory(absoluteDir);

        var nonce = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];
        var cipher = new byte[content.Length];

        using (var aes = new AesGcm(_key, tag.Length))
        {
            aes.Encrypt(nonce, content, cipher, tag);
        }

        await File.WriteAllBytesAsync(Path.Combine(_options.RootPath, relativePath), cipher, ct);

        return new StoredFile(
            relativePath,
            nonce,
            tag,
            Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant());
    }

    /// <summary>Đọc và giải mã. Null khi tệp đã biến mất khỏi đĩa.</summary>
    public async Task<byte[]?> ReadAsync(string relativePath, byte[] nonce, byte[] tag, CancellationToken ct)
    {
        var absolutePath = Path.Combine(_options.RootPath, relativePath);
        if (!File.Exists(absolutePath))
        {
            _logger.LogError("Tệp giấy tờ {Path} không còn trên đĩa.", relativePath);
            return null;
        }

        var cipher = await File.ReadAllBytesAsync(absolutePath, ct);
        var plain = new byte[cipher.Length];

        using var aes = new AesGcm(_key, tag.Length);
        aes.Decrypt(nonce, cipher, tag, plain);
        return plain;
    }

    public void Delete(string relativePath)
    {
        var absolutePath = Path.Combine(_options.RootPath, relativePath);
        if (File.Exists(absolutePath)) File.Delete(absolutePath);
    }

    /// <summary>
    /// Khoá 32 byte từ chuỗi base64 trong cấu hình.
    ///
    /// Ở môi trường phát triển, thiếu khoá thì sinh tạm một khoá theo tiến trình để chạy demo được
    /// ngay. Ở môi trường thật, <c>Program.cs</c> đã chặn khởi động từ trước — nên nhánh đó không
    /// bao giờ chạm tới dữ liệu thật.
    /// </summary>
    private static byte[] ResolveKey(string? configured)
    {
        if (string.IsNullOrWhiteSpace(configured)) return RandomNumberGenerator.GetBytes(32);

        var raw = Convert.FromBase64String(configured);
        if (raw.Length != 32)
            throw new InvalidOperationException(
                "DocumentVault:Key phải là 32 byte mã hoá base64. Sinh khoá: openssl rand -base64 32");

        return raw;
    }

    public record StoredFile(string RelativePath, byte[] Nonce, byte[] Tag, string Sha256);
}

public class DocumentVaultOptions
{
    /// <summary>Thư mục gốc chứa tệp đã mã hoá. Nên nằm trên volume riêng, có sao lưu.</summary>
    public string RootPath { get; set; } = "vault";

    /// <summary>Khoá AES-256 mã hoá base64. Bắt buộc ngoài môi trường phát triển.</summary>
    public string? Key { get; set; }

    /// <summary>Ảnh chụp giấy tờ bằng điện thoại hiếm khi vượt 10 MB.</summary>
    public int MaxFileMegabytes { get; set; } = 10;

    /// <summary>Hạn mức mỗi tài khoản — đủ cho vài chục giấy tờ, không đủ để biến app thành ổ lưu trữ.</summary>
    public int QuotaMegabytesPerAccount { get; set; } = 100;
}
