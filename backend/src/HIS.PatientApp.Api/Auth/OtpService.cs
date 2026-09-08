using System.Security.Cryptography;
using System.Text;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Auth;

/// <summary>
/// Kênh gửi OTP. Tách thành interface để đổi nhà cung cấp SMS mà không đụng vào nghiệp vụ, và để
/// môi trường phát triển không phải tốn tin nhắn thật.
/// </summary>
public interface IOtpSender
{
    Task SendAsync(string phoneNumber, string code, string purpose, CancellationToken ct = default);
}

/// <summary>
/// Bản dùng cho môi trường phát triển: in mã ra log thay vì gửi SMS.
///
/// ⚠️ TỰ TỪ CHỐI CHẠY Ở PRODUCTION (xem <see cref="OtpService"/> đăng ký trong Program.cs). In mã OTP
/// ra log ở môi trường thật đồng nghĩa ai đọc được log là đăng nhập được vào tài khoản người bệnh.
/// </summary>
public class LoggingOtpSender : IOtpSender
{
    private readonly ILogger<LoggingOtpSender> _logger;
    public LoggingOtpSender(ILogger<LoggingOtpSender> logger) => _logger = logger;

    public Task SendAsync(string phoneNumber, string code, string purpose, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[DEV] OTP cho {Phone} ({Purpose}): {Code} — bản gửi giả lập, KHÔNG dùng ở production.",
            PhoneNumbers.Mask(phoneNumber), purpose, code);
        return Task.CompletedTask;
    }
}

public record OtpVerifyResult(bool Success, string? Error);

/// <summary>
/// Cấp và kiểm tra mã OTP.
///
/// Ba lớp chống lạm dụng, vì OTP 6 chữ số vốn dễ dò:
/// 1. Giới hạn số lần XIN mã trong một khoảng thời gian cho mỗi số điện thoại.
/// 2. Giới hạn số lần NHẬP SAI cho mỗi mã; quá ngưỡng thì huỷ mã, bắt xin lại.
/// 3. Mã sống ngắn và chỉ dùng được một lần.
/// </summary>
public class OtpService
{
    private readonly PatientAppDbContext _db;
    private readonly IOtpSender _sender;
    private readonly ILogger<OtpService> _logger;

    public const int CodeLength = 6;
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);
    public const int MaxAttempts = 5;

    /// <summary>Tối đa 3 mã trong 15 phút cho mỗi số — chặn dùng hệ thống để dội tin nhắn.</summary>
    public const int MaxRequestsPerWindow = 3;
    public static readonly TimeSpan RequestWindow = TimeSpan.FromMinutes(15);

    public OtpService(PatientAppDbContext db, IOtpSender sender, ILogger<OtpService> logger)
    {
        _db = db;
        _sender = sender;
        _logger = logger;
    }

    private static string Hash(string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();

    /// <summary>Sinh mã 6 số bằng nguồn ngẫu nhiên mật mã, không dùng <c>Random</c>.</summary>
    private static string NewCode() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    /// <summary>
    /// Cấp và gửi mã mới. Trả false khi số này đã xin quá nhiều lần trong cửa sổ thời gian.
    /// </summary>
    public async Task<bool> IssueAsync(
        string phoneNumber, string purpose, string? ip, CancellationToken ct = default)
    {
        var normalized = PhoneNumbers.Normalize(phoneNumber);
        var now = DateTime.UtcNow;
        var windowStart = now - RequestWindow;

        var recentCount = await _db.OtpChallenges.CountAsync(
            o => o.PhoneNumber == normalized && o.Purpose == purpose && o.CreatedAt >= windowStart, ct);

        if (recentCount >= MaxRequestsPerWindow)
        {
            _logger.LogWarning(
                "Chặn cấp OTP cho {Phone} ({Purpose}): đã xin {Count} lần trong {Minutes} phút.",
                PhoneNumbers.Mask(normalized), purpose, recentCount, RequestWindow.TotalMinutes);
            return false;
        }

        // Huỷ các mã cũ còn hiệu lực: chỉ mã mới nhất được dùng, tránh việc nhiều mã cùng sống làm
        // rộng không gian đoán.
        var pending = await _db.OtpChallenges
            .Where(o => o.PhoneNumber == normalized && o.Purpose == purpose
                        && o.ConsumedAt == null && o.ExpiresAt > now)
            .ToListAsync(ct);
        foreach (var old in pending) old.ConsumedAt = now;

        var code = NewCode();
        _db.OtpChallenges.Add(new OtpChallenge
        {
            PhoneNumber = normalized,
            Purpose = purpose,
            CodeHash = Hash(code),
            ExpiresAt = now.Add(Lifetime),
            RequestedByIp = ip,
        });
        await _db.SaveChangesAsync(ct);

        await _sender.SendAsync(normalized, code, purpose, ct);
        return true;
    }

    /// <summary>Kiểm tra mã. Đúng thì đánh dấu đã dùng để không dùng lại được.</summary>
    public async Task<OtpVerifyResult> VerifyAsync(
        string phoneNumber, string purpose, string code, CancellationToken ct = default)
    {
        var normalized = PhoneNumbers.Normalize(phoneNumber);
        var now = DateTime.UtcNow;

        var challenge = await _db.OtpChallenges
            .Where(o => o.PhoneNumber == normalized && o.Purpose == purpose && o.ConsumedAt == null)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (challenge is null) return new OtpVerifyResult(false, "Chưa có mã xác thực. Vui lòng bấm gửi mã.");
        if (challenge.ExpiresAt <= now) return new OtpVerifyResult(false, "Mã xác thực đã hết hạn. Vui lòng bấm gửi lại mã.");

        if (challenge.CodeHash != Hash(code))
        {
            challenge.AttemptCount++;
            if (challenge.AttemptCount >= MaxAttempts)
            {
                challenge.ConsumedAt = now;
                await _db.SaveChangesAsync(ct);
                return new OtpVerifyResult(false, "Bạn đã nhập sai quá số lần cho phép. Vui lòng bấm gửi lại mã.");
            }
            await _db.SaveChangesAsync(ct);
            return new OtpVerifyResult(false, "Mã xác thực không đúng.");
        }

        challenge.ConsumedAt = now;
        await _db.SaveChangesAsync(ct);
        return new OtpVerifyResult(true, null);
    }
}
