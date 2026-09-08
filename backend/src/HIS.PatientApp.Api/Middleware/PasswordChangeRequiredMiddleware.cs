using HIS.PatientApp.Api.Auth;

namespace HIS.PatientApp.Api.Middleware;

/// <summary>
/// Chặn mọi đường đi khi tài khoản đang bị buộc đổi mật khẩu (HSMT I.2 #9), trừ chính đường đổi mật
/// khẩu và đăng xuất.
///
/// Vì sao cần ở server: app hoàn toàn có thể bị sửa để bỏ qua màn đổi mật khẩu. Ẩn nút không phải là
/// chặn. Cùng cách làm với <c>PasswordChangeRequiredMiddleware</c> của HIS Core.
/// </summary>
public class PasswordChangeRequiredMiddleware
{
    private readonly RequestDelegate _next;

    /// <summary>Những đường vẫn cho đi khi đang bị buộc đổi mật khẩu.</summary>
    private static readonly string[] AllowedPaths =
    {
        "/api/v1/patient/auth/change-password",
        "/api/v1/patient/auth/logout",
        "/api/v1/patient/auth/me",
        "/health",
    };

    public PasswordChangeRequiredMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated == true &&
            user.HasClaim(c => c.Type == AppClaims.PasswordChangeRequired))
        {
            var path = context.Request.Path.Value ?? string.Empty;
            var allowed = AllowedPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(ApiResponse.Fail(
                    "Vui lòng đổi mật khẩu trước khi tiếp tục sử dụng ứng dụng.",
                    "PASSWORD_CHANGE_REQUIRED"));
                return;
            }
        }

        await _next(context);
    }
}
