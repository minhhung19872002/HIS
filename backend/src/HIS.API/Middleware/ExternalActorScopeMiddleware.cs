namespace HIS.API.Middleware;

/// <summary>
/// AUTHZ #216/F7 — nhốt token của NGƯỜI NGOÀI trong đúng cổng của họ.
///
/// Cổng giám định BHXH và cổng bệnh nhân tự phát JWT của riêng chúng
/// (BhxhInspectorService.GenerateInspectorToken, PatientPortalController.GeneratePortalToken),
/// nhưng ký cùng key/issuer/audience với token nhân viên. Với mọi endpoint nội bộ chỉ có
/// <c>[Authorize]</c> trần thì "đã đăng nhập" là đủ, nên T1 đợt 2 đo được: token giám định viên
/// gọi <c>GET /api/reception/opd-flow-stats</c> trả <b>200</b> — người ngoài đọc được số liệu
/// điều hành của bệnh viện.
///
/// #216/F2 đã bịt đường GHI (họ không có permission nào nên 403), nhưng đường ĐỌC thì không:
/// gate theo permission chỉ phủ mutation, còn hàng trăm GET vẫn ở mức auth-only.
///
/// Middleware này chặn theo CHỦ THỂ chứ không theo từng endpoint: principal mang role của một
/// cổng ngoài thì chỉ được đi trong tiền tố route của cổng đó, mọi đường khác trả 403. Nhân viên
/// KHÔNG bị ảnh hưởng (không ai mang các role này — chúng chỉ do 2 pipeline token kia phát ra),
/// và nhân viên vẫn vào <c>/api/portal/*</c> hộ bệnh nhân như cũ.
/// </summary>
public sealed class ExternalActorScopeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExternalActorScopeMiddleware> _logger;

    /// <summary>Role của cổng ngoài → tiền tố route DUY NHẤT mà nó được đi.</summary>
    private static readonly (string Role, string[] Prefixes)[] ExternalActors =
    {
        ("BhxhInspector", new[] { "/api/inspector-portal" }),
        ("PortalPatient", new[] { "/api/portal" }),
    };

    public ExternalActorScopeMiddleware(RequestDelegate next, ILogger<ExternalActorScopeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            foreach (var (role, prefixes) in ExternalActors)
            {
                if (!context.User.IsInRole(role)) continue;

                var path = context.Request.Path.Value ?? string.Empty;
                var inScope = prefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
                if (inScope) break;

                _logger.LogWarning("Chặn {Role} ra ngoài phạm vi cổng: {Method} {Path}",
                    role, context.Request.Method, path);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"error\":\"OUT_OF_PORTAL_SCOPE\"," +
                    "\"message\":\"Tài khoản cổng ngoài chỉ được truy cập trong phạm vi cổng của mình.\"}");
                return;
            }
        }

        await _next(context);
    }
}
