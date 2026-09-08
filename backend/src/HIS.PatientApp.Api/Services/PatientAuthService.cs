using System.Security.Cryptography;
using System.Text;
using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Dtos;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Services;

/// <summary>Kết quả một thao tác xác thực: hoặc ra bộ token, hoặc ra lý do từ chối.</summary>
public record AuthOutcome(bool Success, AuthResultDto? Result, string? Message, string? Error = null)
{
    public static AuthOutcome Ok(AuthResultDto result) => new(true, result, null);
    public static AuthOutcome Fail(string message, string? error = null) => new(false, null, message, error);
}

/// <summary>
/// Nghiệp vụ xác thực của app người bệnh.
///
/// Ba nguyên tắc xuyên suốt:
/// 1. <b>Không tiết lộ tài khoản nào tồn tại.</b> Sai số điện thoại và sai mật khẩu trả về cùng một
///    thông điệp — nếu khác nhau, kẻ tấn công dò được ai đang là bệnh nhân của bệnh viện.
/// 2. <b>Khoá theo bậc thang</b> khi nhập sai nhiều lần, giống chính sách HIS đang dùng cho nhân viên.
/// 3. <b>Thu hồi tức thì</b> qua SecurityStamp mỗi khi có sự kiện đáng ngờ hoặc đổi mật khẩu.
/// </summary>
public class PatientAuthService
{
    private readonly PatientAppDbContext _db;
    private readonly TokenService _tokens;
    private readonly OtpService _otp;
    private readonly IHisConnector _his;
    private readonly ILogger<PatientAuthService> _logger;

    /// <summary>Thông điệp DÙNG CHUNG cho mọi kiểu đăng nhập thất bại. Xem nguyên tắc 1.</summary>
    private const string InvalidCredentials = "Số điện thoại hoặc mật khẩu không đúng.";

    public PatientAuthService(
        PatientAppDbContext db,
        TokenService tokens,
        OtpService otp,
        IHisConnector his,
        ILogger<PatientAuthService> logger)
    {
        _db = db;
        _tokens = tokens;
        _otp = otp;
        _his = his;
        _logger = logger;
    }

    // ---------------------------------------------------------------- đăng ký

    public async Task<AuthOutcome> RegisterAsync(RegisterDto dto, string? ip, CancellationToken ct)
    {
        var phone = PhoneNumbers.Normalize(dto.PhoneNumber);
        if (!PhoneNumbers.IsValidVietnameseMobile(phone))
            return AuthOutcome.Fail("Số điện thoại không hợp lệ.");

        var otpResult = await _otp.VerifyAsync(phone, OtpPurpose.Register, dto.OtpCode, ct);
        if (!otpResult.Success) return AuthOutcome.Fail(otpResult.Error!);

        if (await _db.Accounts.AnyAsync(a => a.PhoneNumber == phone, ct))
            return AuthOutcome.Fail("Số điện thoại này đã có tài khoản. Vui lòng đăng nhập hoặc dùng chức năng quên mật khẩu.");

        var account = new AppAccount
        {
            PhoneNumber = phone,
            FullName = dto.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PasswordChangedAt = DateTime.UtcNow,
            // Người bệnh tự đặt mật khẩu ngay lúc đăng ký nên không cần buộc đổi lại.
            MustChangePassword = false,
        };

        // Liên kết hồ sơ HIS nếu có mã bệnh nhân. Bắt buộc số điện thoại trên hồ sơ phải khớp —
        // nếu không, ai biết mã bệnh nhân của người khác cũng gắn được hồ sơ đó vào tài khoản mình.
        if (!string.IsNullOrWhiteSpace(dto.PatientCode))
        {
            var linkError = await TryLinkPatientAsync(account, dto.PatientCode!, phone, ct);
            if (linkError is not null) return AuthOutcome.Fail(linkError);
        }

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync(ct);

        var device = await UpsertDeviceAsync(account.Id, dto.Device, ip, ct);
        var issued = await _tokens.IssueAsync(account, device, ip, ct);

        _logger.LogInformation("Tài khoản app mới cho {Phone}", PhoneNumbers.Mask(phone));
        return AuthOutcome.Ok(BuildResult(account, issued));
    }

    /// <summary>Trả về thông điệp lỗi, hoặc null nếu liên kết thành công.</summary>
    private async Task<string?> TryLinkPatientAsync(
        AppAccount account, string patientCode, string phone, CancellationToken ct)
    {
        HisPatient? patient;
        try
        {
            patient = await _his.GetPatientByCodeAsync(patientCode.Trim(), ct);
        }
        catch (HisConnectorException ex)
        {
            _logger.LogError(ex, "Không tra được hồ sơ bệnh nhân khi đăng ký.");
            return "Hiện chưa kết nối được tới hệ thống bệnh viện. Bạn vẫn có thể đăng ký và liên kết hồ sơ sau.";
        }

        if (patient is null)
            return "Không tìm thấy hồ sơ với mã bệnh nhân này.";

        if (PhoneNumbers.Normalize(patient.PhoneNumber) != phone)
        {
            // Không nói rõ "số điện thoại trên hồ sơ là …" — đó cũng là rò rỉ thông tin.
            _logger.LogWarning(
                "Từ chối liên kết hồ sơ {Code}: số điện thoại đăng ký không khớp hồ sơ.", patientCode);
            return "Số điện thoại chưa khớp với hồ sơ này. Vui lòng liên hệ quầy tiếp đón để cập nhật.";
        }

        account.HisPatientId = patient.Id;
        account.HisPatientCode = patient.PatientCode;
        if (string.IsNullOrWhiteSpace(account.FullName)) account.FullName = patient.FullName;
        return null;
    }

    // -------------------------------------------------------------- đăng nhập

    public async Task<AuthOutcome> LoginAsync(LoginDto dto, string? ip, CancellationToken ct)
    {
        var phone = PhoneNumbers.Normalize(dto.PhoneNumber);
        var now = DateTime.UtcNow;

        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.PhoneNumber == phone, ct);

        if (account is null)
        {
            // Vẫn tốn thời gian băm một chuỗi giả để thời gian phản hồi không tiết lộ tài khoản có
            // tồn tại hay không.
            BCrypt.Net.BCrypt.Verify(dto.Password, BCrypt.Net.BCrypt.HashPassword("dummy"));
            return AuthOutcome.Fail(InvalidCredentials);
        }

        if (account.Status == AppAccountStatus.Locked || account.Status == AppAccountStatus.Suspended)
            return AuthOutcome.Fail("Tài khoản đang bị khoá. Vui lòng liên hệ bệnh viện.", "ACCOUNT_LOCKED");

        if (account.IsLockedOut(now))
        {
            var minutes = Math.Max(1, (int)Math.Ceiling((account.LockoutEndAt!.Value - now).TotalMinutes));
            return AuthOutcome.Fail(
                $"Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau {minutes} phút.", "ACCOUNT_LOCKED");
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
        {
            ApplyFailedLogin(account, now);
            await _db.SaveChangesAsync(ct);
            return AuthOutcome.Fail(InvalidCredentials);
        }

        account.FailedLoginCount = 0;
        account.LockoutEndAt = null;
        account.LastLoginAt = now;

        var device = await UpsertDeviceAsync(account.Id, dto.Device, ip, ct);
        var issued = await _tokens.IssueAsync(account, device, ip, ct);
        await _db.SaveChangesAsync(ct);

        return AuthOutcome.Ok(BuildResult(account, issued));
    }

    /// <summary>
    /// Bậc thang khoá giống chính sách HIS đang dùng cho nhân viên: càng sai nhiều càng khoá lâu.
    /// </summary>
    private static void ApplyFailedLogin(AppAccount account, DateTime now)
    {
        account.FailedLoginCount++;
        account.LockoutEndAt = account.FailedLoginCount switch
        {
            >= 20 => now.AddMinutes(30),
            >= 15 => now.AddMinutes(15),
            >= 10 => now.AddMinutes(10),
            >= 5 => now.AddMinutes(5),
            _ => null,
        };
    }

    public Task<IssuedTokensResult?> RefreshAsync(string refreshToken, string? ip, CancellationToken ct) =>
        RefreshInternalAsync(refreshToken, ip, ct);

    private async Task<IssuedTokensResult?> RefreshInternalAsync(
        string refreshToken, string? ip, CancellationToken ct)
    {
        var issued = await _tokens.RefreshAsync(refreshToken, ip, ct);
        if (issued is null) return null;

        // Đọc lại tài khoản để trả về trạng thái mới nhất (ví dụ admin vừa bật buộc đổi mật khẩu).
        var hash = TokenService.HashToken(issued.RefreshToken);
        var account = await _db.RefreshTokens
            .Where(t => t.TokenHash == hash)
            .Select(t => t.Account!)
            .FirstOrDefaultAsync(ct);

        return account is null ? null : new IssuedTokensResult(BuildResult(account, issued));
    }

    // ------------------------------------------------------------- mật khẩu

    public async Task<(bool Success, string? Message, AuthResultDto? Result)> ChangePasswordAsync(
        Guid accountId, Guid deviceId, ChangePasswordDto dto, string? ip, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return (false, "Không tìm thấy tài khoản.", null);

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, account.PasswordHash))
            return (false, "Mật khẩu hiện tại không đúng.", null);

        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, account.PasswordHash))
            return (false, "Mật khẩu mới phải khác mật khẩu hiện tại.", null);

        var now = DateTime.UtcNow;
        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        account.PasswordChangedAt = now;
        account.MustChangePassword = false;
        account.UpdatedAt = now;

        // Đổi mật khẩu thì mọi phiên cũ phải chết — kể cả trên máy khác. Đây chính là cách người dùng
        // đá kẻ đang chiếm tài khoản ra ngoài.
        await _tokens.RevokeAllForAccountAsync(accountId, now, ct);
        await _db.SaveChangesAsync(ct);

        // Cấp lại token cho chính máy đang thao tác để người dùng không bị văng ra ngay sau khi đổi.
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.AccountId == accountId, ct);
        if (device is null) return (true, "Đã đổi mật khẩu. Vui lòng đăng nhập lại.", null);

        device.RevokedAt = null;
        var issued = await _tokens.IssueAsync(account, device, ip, ct);
        return (true, "Đã đổi mật khẩu.", BuildResult(account, issued));
    }

    public async Task<(bool Success, string Message)> ResetPasswordAsync(
        ResetPasswordDto dto, CancellationToken ct)
    {
        var phone = PhoneNumbers.Normalize(dto.PhoneNumber);

        var otpResult = await _otp.VerifyAsync(phone, OtpPurpose.ResetPassword, dto.OtpCode, ct);
        if (!otpResult.Success) return (false, otpResult.Error!);

        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.PhoneNumber == phone, ct);
        if (account is null)
        {
            // OTP đã đúng nghĩa là người này giữ số điện thoại đó; vẫn không xác nhận có tài khoản
            // hay không, và trả về như thành công để không dùng được luồng này để dò danh sách.
            _logger.LogInformation(
                "Đặt lại mật khẩu cho số chưa có tài khoản: {Phone}", PhoneNumbers.Mask(phone));
            return (true, "Nếu số điện thoại đã đăng ký, mật khẩu đã được đặt lại.");
        }

        var now = DateTime.UtcNow;
        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        account.PasswordChangedAt = now;
        account.MustChangePassword = false;
        account.FailedLoginCount = 0;
        account.LockoutEndAt = null;
        account.UpdatedAt = now;

        await _tokens.RevokeAllForAccountAsync(account.Id, now, ct);
        await _db.SaveChangesAsync(ct);

        return (true, "Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.");
    }

    // ------------------------------------------------------------------ PIN

    public async Task<(bool Success, string Message)> SetPinAsync(
        Guid accountId, SetPinDto dto, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return (false, "Không tìm thấy tài khoản.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
            return (false, "Mật khẩu không đúng.");

        if (IsWeakPin(dto.Pin))
            return (false, "Mã PIN quá dễ đoán. Tránh dùng dãy liên tiếp hoặc sáu số giống nhau.");

        account.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.Pin);
        account.PinFailedCount = 0;
        account.PinLockedUntil = null;
        account.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return (true, "Đã đặt mã PIN.");
    }

    /// <summary>
    /// PIN 6 số chỉ có một triệu khả năng; loại bỏ những mã mà người ta đoán đầu tiên.
    /// </summary>
    private static bool IsWeakPin(string pin)
    {
        if (pin.Distinct().Count() == 1) return true;                    // 000000, 111111…

        var ascending = true;
        var descending = true;
        for (var i = 1; i < pin.Length; i++)
        {
            if (pin[i] != pin[i - 1] + 1) ascending = false;
            if (pin[i] != pin[i - 1] - 1) descending = false;
        }
        return ascending || descending;                                   // 123456, 654321
    }

    public async Task<(bool Success, string Message)> VerifyPinAsync(
        Guid accountId, string pin, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account?.PinHash is null) return (false, "Bạn chưa đặt mã PIN.");

        var now = DateTime.UtcNow;
        if (account.IsPinLocked(now))
        {
            var minutes = Math.Max(1, (int)Math.Ceiling((account.PinLockedUntil!.Value - now).TotalMinutes));
            return (false, $"Đã nhập sai mã PIN nhiều lần. Vui lòng thử lại sau {minutes} phút.");
        }

        if (!BCrypt.Net.BCrypt.Verify(pin, account.PinHash))
        {
            account.PinFailedCount++;
            // Ngưỡng chặt hơn mật khẩu vì không gian PIN nhỏ hơn nhiều.
            if (account.PinFailedCount >= 5) account.PinLockedUntil = now.AddMinutes(15);
            await _db.SaveChangesAsync(ct);
            return (false, "Mã PIN không đúng.");
        }

        account.PinFailedCount = 0;
        account.PinLockedUntil = null;
        await _db.SaveChangesAsync(ct);
        return (true, "Đúng mã PIN.");
    }

    // ---------------------------------------------------------- sinh trắc học

    public async Task<(bool Success, string Message)> EnrollBiometricAsync(
        Guid accountId, Guid deviceId, EnrollBiometricDto dto, CancellationToken ct)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null) return (false, "Không tìm thấy tài khoản.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
            return (false, "Mật khẩu không đúng.");

        var device = await _db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.AccountId == accountId, ct);
        if (device is null) return (false, "Không tìm thấy thiết bị.");

        // Từ chối khoá không đọc được NGAY tại đây: để tới lúc đăng nhập mới phát hiện thì người dùng
        // tưởng đã bật xong sinh trắc mà thực ra không dùng được.
        if (!TryImportPublicKey(dto.PublicKey, out _))
            return (false, "Khoá sinh trắc học không hợp lệ.");

        device.BiometricPublicKey = dto.PublicKey;
        device.BiometricEnabledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return (true, "Đã bật đăng nhập bằng sinh trắc học trên thiết bị này.");
    }

    public async Task<BiometricChallengeDto?> CreateBiometricChallengeAsync(
        BiometricChallengeRequestDto dto, CancellationToken ct)
    {
        var phone = PhoneNumbers.Normalize(dto.PhoneNumber);

        var device = await _db.Devices
            .Include(d => d.Account)
            .FirstOrDefaultAsync(d =>
                d.DeviceKey == dto.DeviceKey &&
                d.RevokedAt == null &&
                d.BiometricPublicKey != null &&
                d.Account!.PhoneNumber == phone, ct);

        if (device is null) return null;

        var challenge = new BiometricChallenge
        {
            DeviceId = device.Id,
            Nonce = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
            // Chỉ đủ cho một lần quét vân tay — càng ngắn càng ít cửa cho tấn công phát lại.
            ExpiresAt = DateTime.UtcNow.AddMinutes(2),
        };
        _db.BiometricChallenges.Add(challenge);
        await _db.SaveChangesAsync(ct);

        return new BiometricChallengeDto
        {
            ChallengeId = challenge.Id,
            Nonce = challenge.Nonce,
            ExpiresAt = challenge.ExpiresAt,
        };
    }

    public async Task<AuthOutcome> BiometricLoginAsync(
        BiometricLoginDto dto, string? ip, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var phone = PhoneNumbers.Normalize(dto.PhoneNumber);

        var challenge = await _db.BiometricChallenges
            .Include(c => c.Device).ThenInclude(d => d!.Account)
            .FirstOrDefaultAsync(c => c.Id == dto.ChallengeId, ct);

        if (challenge is null || !challenge.IsUsable(now))
            return AuthOutcome.Fail("Phiên xác thực sinh trắc học đã hết hạn. Vui lòng thử lại.");

        // Dùng một lần, đánh dấu ngay kể cả khi chữ ký sai — không cho thử nhiều chữ ký trên cùng nonce.
        challenge.ConsumedAt = now;
        await _db.SaveChangesAsync(ct);

        var device = challenge.Device;
        var account = device?.Account;
        if (device is null || account is null) return AuthOutcome.Fail(InvalidCredentials);
        if (device.DeviceKey != dto.DeviceKey || account.PhoneNumber != phone)
            return AuthOutcome.Fail(InvalidCredentials);
        if (!device.IsActive || device.BiometricPublicKey is null)
            return AuthOutcome.Fail("Thiết bị này không còn được phép đăng nhập bằng sinh trắc học.");
        if (account.Status != AppAccountStatus.Active)
            return AuthOutcome.Fail("Tài khoản đang bị khoá. Vui lòng liên hệ bệnh viện.", "ACCOUNT_LOCKED");

        if (!VerifySignature(device.BiometricPublicKey, challenge.Nonce, dto.Signature))
        {
            _logger.LogWarning("Chữ ký sinh trắc học không hợp lệ trên thiết bị {DeviceId}.", device.Id);
            return AuthOutcome.Fail(InvalidCredentials);
        }

        account.LastLoginAt = now;
        device.LastSeenAt = now;
        device.LastIp = ip;

        var issued = await _tokens.IssueAsync(account, device, ip, ct);
        await _db.SaveChangesAsync(ct);

        return AuthOutcome.Ok(BuildResult(account, issued));
    }

    private static bool TryImportPublicKey(string base64PublicKey, out ECDsa? key)
    {
        key = null;
        try
        {
            var ecdsa = ECDsa.Create();
            ecdsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(base64PublicKey), out _);
            key = ecdsa;
            return true;
        }
        catch (Exception ex) when (ex is FormatException or CryptographicException)
        {
            return false;
        }
    }

    private static bool VerifySignature(string base64PublicKey, string nonce, string base64Signature)
    {
        if (!TryImportPublicKey(base64PublicKey, out var key) || key is null) return false;

        using (key)
        {
            try
            {
                return key.VerifyData(
                    Encoding.UTF8.GetBytes(nonce),
                    Convert.FromBase64String(base64Signature),
                    HashAlgorithmName.SHA256,
                    // Nền tảng di động (Keychain iOS, Keystore Android) ký ra DER, không phải IEEE P1363.
                    DSASignatureFormat.Rfc3279DerSequence);
            }
            catch (Exception ex) when (ex is FormatException or CryptographicException)
            {
                return false;
            }
        }
    }

    // -------------------------------------------------------------- thiết bị

    /// <summary>
    /// Tạo mới hoặc cập nhật thiết bị. Cùng <c>DeviceKey</c> thì tái dùng bản ghi cũ — nếu không,
    /// danh sách thiết bị sẽ phình ra một dòng mỗi lần đăng nhập và trở nên vô dụng.
    /// </summary>
    private async Task<AppDevice> UpsertDeviceAsync(
        Guid accountId, DeviceInfoDto info, string? ip, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var device = await _db.Devices
            .FirstOrDefaultAsync(d => d.AccountId == accountId && d.DeviceKey == info.DeviceKey, ct);

        if (device is null)
        {
            device = new AppDevice { AccountId = accountId, DeviceKey = info.DeviceKey };
            _db.Devices.Add(device);
        }

        device.DeviceName = info.DeviceName;
        device.Platform = info.Platform;
        device.OsVersion = info.OsVersion;
        device.AppVersion = info.AppVersion;
        if (!string.IsNullOrWhiteSpace(info.PushToken)) device.PushToken = info.PushToken;
        device.LastSeenAt = now;
        device.LastIp = ip;
        // Đăng nhập lại thành công trên máy đã bị đăng xuất từ xa thì máy đó sống lại — người dùng
        // vừa chứng minh được danh tính.
        device.RevokedAt = null;

        await _db.SaveChangesAsync(ct);
        return device;
    }

    private static AuthResultDto BuildResult(AppAccount account, IssuedTokens issued) => new()
    {
        Token = issued.AccessToken,
        RefreshToken = issued.RefreshToken,
        ExpiresAt = issued.AccessExpiresAt,
        Account = ToDto(account),
    };

    public static AccountDto ToDto(AppAccount account) => new()
    {
        Id = account.Id,
        PhoneNumber = account.PhoneNumber,
        FullName = account.FullName,
        IsLinked = account.HisPatientId.HasValue,
        PatientCode = account.HisPatientCode,
        MustChangePassword = account.MustChangePassword,
        HasPin = account.PinHash is not null,
        BiometricEnabled = account.Devices.Any(d => d.BiometricPublicKey is not null && d.RevokedAt is null),
    };
}

/// <summary>Bọc kết quả làm mới token để phân biệt "không hợp lệ" (null) với "thành công".</summary>
public record IssuedTokensResult(AuthResultDto Result);
