using HIS.Core.Constants;

namespace HIS.API.Middleware;

/// <summary>
/// #216 TC-PERM-015 — tài khoản đang bị BUỘC đổi mật khẩu thì chỉ được làm đúng việc đó.
///
/// <para>Ẩn nút ở giao diện không phải là chặn ("ẩn nút ≠ chặn API" — acceptance của #216): gõ thẳng
/// URL hoặc gọi API bằng tay vẫn phải bị từ chối ở SERVER. Middleware này đọc claim
/// <see cref="JwtClaims.PasswordChangeRequired"/> mà <c>AuthService</c> đặt lúc phát token — không
/// chạm DB mỗi request. Đổi mật khẩu xong thì SecurityStamp xoay, token cũ chết, token mới không còn
/// claim.</para>
///
/// <para>Danh sách cho qua là những gì màn đổi mật khẩu cần để tồn tại: đổi mật khẩu, đăng xuất,
/// tự đọc hồ sơ mình, hai lời gọi FE thực hiện TRƯỚC khi dựng phiên (<c>/me/permissions</c>,
/// <c>/system/enabled-modules</c> — chặn hai cái này thì <c>AuthContext</c> hiểu là phiên hỏng và
/// xoá token, tạo vòng lặp về trang đăng nhập), và health. Mọi đường <c>/api/*</c> khác → 403.</para>
/// </summary>
public sealed class PasswordChangeRequiredMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PasswordChangeRequiredMiddleware> _logger;

    private static readonly string[] AllowedPrefixes =
    {
        "/api/auth/change-password",
        "/api/auth/logout",
        "/api/auth/logout-by-token",
        "/api/auth/me",
        "/api/auth/refresh",
        "/api/me/permissions",
        "/api/system/enabled-modules",
        "/health",
    };

    public PasswordChangeRequiredMiddleware(RequestDelegate next, ILogger<PasswordChangeRequiredMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        if (user?.Identity?.IsAuthenticated == true
            && user.FindFirst(JwtClaims.PasswordChangeRequired) != null)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            var isApi = path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
            var allowed = AllowedPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

            if (isApi && !allowed)
            {
                _logger.LogInformation("Chặn vì chưa đổi mật khẩu: {Method} {Path}", context.Request.Method, path);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"error\":\"PASSWORD_CHANGE_REQUIRED\"," +
                    "\"message\":\"Bạn phải đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.\"}");
                return;
            }
        }

        await _next(context);
    }
}
