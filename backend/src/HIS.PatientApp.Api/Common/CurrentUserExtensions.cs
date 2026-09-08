using System.Security.Claims;
using HIS.PatientApp.Api.Auth;

namespace HIS.PatientApp.Api;

/// <summary>
/// Đọc danh tính từ token. Controller LUÔN lấy accountId/patientId từ đây, KHÔNG bao giờ nhận từ
/// query string hay body — đó chính là lỗi IDOR mà khảo sát tìm thấy ở HIS Core (§11.1).
/// </summary>
public static class CurrentUserExtensions
{
    public static Guid GetAccountId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AppClaims.AccountId), out var id)
            ? id
            : throw new UnauthorizedAccessException("Token thiếu accountId.");

    public static Guid GetDeviceId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AppClaims.DeviceId), out var id)
            ? id
            : throw new UnauthorizedAccessException("Token thiếu deviceId.");

    /// <summary>Id bệnh nhân bên HIS; null khi tài khoản chưa liên kết hồ sơ.</summary>
    public static Guid? GetPatientId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AppClaims.PatientId), out var id) ? id : null;

    /// <summary>IP người gọi, có tính tới reverse proxy phía trước.</summary>
    public static string? GetClientIp(this HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();
        return context.Connection.RemoteIpAddress?.ToString();
    }
}
