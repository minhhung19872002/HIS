using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// "Quản lý tất cả thiết bị đăng nhập" — HSMT I.2 #9.
///
/// Người bệnh xem được máy nào đang có phiên và đăng xuất từ xa từng máy hoặc tất cả. Việc thu hồi có
/// hiệu lực NGAY nhờ xoay con dấu bảo mật, chứ không đợi access token hết hạn.
/// </summary>
[ApiController]
[Route("api/v1/patient/devices")]
[Authorize]
[Produces("application/json")]
public class DevicesController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly TokenService _tokens;
    private readonly ILogger<DevicesController> _logger;

    public DevicesController(
        PatientAppDbContext db, TokenService tokens, ILogger<DevicesController> logger)
    {
        _db = db;
        _tokens = tokens;
        _logger = logger;
    }

    /// <summary>Danh sách thiết bị đang đăng nhập, mới hoạt động nhất lên đầu.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var accountId = User.GetAccountId();
        var currentDeviceId = User.GetDeviceId();

        var devices = await _db.Devices
            .Where(d => d.AccountId == accountId && d.RevokedAt == null)
            .OrderByDescending(d => d.LastSeenAt)
            .Select(d => new DeviceDto
            {
                Id = d.Id,
                DeviceName = d.DeviceName,
                Platform = d.Platform,
                OsVersion = d.OsVersion,
                AppVersion = d.AppVersion,
                LastIp = d.LastIp,
                LastSeenAt = d.LastSeenAt,
                CreatedAt = d.CreatedAt,
                BiometricEnabled = d.BiometricPublicKey != null,
                IsCurrent = d.Id == currentDeviceId,
            })
            .ToListAsync(ct);

        return Ok(ApiResponse<List<DeviceDto>>.Ok(devices));
    }

    /// <summary>Đăng xuất từ xa một thiết bị.</summary>
    [HttpDelete("{deviceId:guid}")]
    public async Task<IActionResult> Revoke(Guid deviceId, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var device = await _db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.AccountId == accountId, ct);
        if (device is null) return NotFound(ApiResponse.Fail("Không tìm thấy thiết bị."));

        await _tokens.RevokeDeviceAsync(accountId, deviceId, DateTime.UtcNow, ct);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Tài khoản {AccountId} đăng xuất từ xa thiết bị {DeviceId}.", accountId, deviceId);
        return Ok(ApiResponse.Ok("Đã đăng xuất thiết bị."));
    }

    /// <summary>
    /// Đăng xuất tất cả thiết bị khác, giữ lại máy đang dùng — thao tác người ta cần khi nghi ngờ
    /// tài khoản bị người khác truy cập.
    /// </summary>
    [HttpDelete("others")]
    public async Task<IActionResult> RevokeOthers(CancellationToken ct)
    {
        var accountId = User.GetAccountId();
        var currentDeviceId = User.GetDeviceId();
        var now = DateTime.UtcNow;

        var others = await _db.Devices
            .Where(d => d.AccountId == accountId && d.Id != currentDeviceId && d.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var device in others) device.RevokedAt = now;

        var tokens = await _db.RefreshTokens
            .Where(t => t.AccountId == accountId && t.DeviceId != currentDeviceId && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var token in tokens) token.RevokedAt = now;

        // Xoay con dấu để access token của các máy kia chết ngay. Máy hiện tại cũng phải làm mới
        // token một lần — chấp nhận, vì đây là thao tác người dùng chủ động chọn khi nghi bị lộ.
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is not null) account.SecurityStamp = Guid.NewGuid().ToString("N");

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Tài khoản {AccountId} đăng xuất {Count} thiết bị khác.", accountId, others.Count);
        return Ok(ApiResponse.Ok($"Đã đăng xuất {others.Count} thiết bị khác."));
    }

    /// <summary>Cập nhật token nhận thông báo của máy hiện tại (FCM xoay token định kỳ).</summary>
    [HttpPut("push-token")]
    public async Task<IActionResult> UpdatePushToken(
        [FromBody] UpdatePushTokenDto dto, CancellationToken ct)
    {
        var accountId = User.GetAccountId();
        var deviceId = User.GetDeviceId();

        var device = await _db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.AccountId == accountId, ct);
        if (device is null) return NotFound(ApiResponse.Fail("Không tìm thấy thiết bị."));

        device.PushToken = dto.PushToken;
        device.LastSeenAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse.Ok("Đã cập nhật thiết lập thông báo."));
    }
}

public class UpdatePushTokenDto
{
    /// <summary>Token FCM mới; để trống nghĩa là người dùng đã tắt thông báo.</summary>
    public string? PushToken { get; set; }
}
