using System.Net.Http.Json;
using System.Text.Json;
using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Connector;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Đăng nhập cho nhân viên dùng module tra cứu trên điện thoại (HSMT I.3 #2.2).
///
/// <para>BFF chuyển tiếp thông tin đăng nhập sang HIS Core rồi trả lại token của HIS. Làm vậy để giữ
/// đúng nguyên tắc <b>app chỉ nói chuyện với BFF</b>: app không cần biết địa chỉ HIS Core, và đổi
/// địa chỉ HIS về sau không phải phát hành lại app.</para>
///
/// <para>BFF <b>không</b> cấp token riêng cho nhân viên và <b>không</b> lưu mật khẩu: nó chỉ là đường
/// ống. Danh tính nhân viên vẫn do HIS quản, thu hồi ở HIS là mất quyền ở đây.</para>
/// </summary>
[ApiController]
[Route("api/v1/staff/auth")]
[AllowAnonymous]
[Produces("application/json")]
public class StaffAuthController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<StaffAuthController> _logger;

    public StaffAuthController(IHttpClientFactory httpFactory, ILogger<StaffAuthController> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<IActionResult> Login([FromBody] StaffLoginDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(ApiResponse.Fail("Vui lòng nhập tài khoản và mật khẩu."));

        var client = _httpFactory.CreateClient(HisRestConnector.HttpClientName);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new { username = dto.Username.Trim(), password = dto.Password },
                ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(ex, "Không kết nối được HIS khi nhân viên đăng nhập.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
                "HIS_UNAVAILABLE"));
        }

        if (!response.IsSuccessStatusCode)
        {
            // Không chuyển tiếp nguyên văn thông điệp của HIS: nó có thể phân biệt "sai mật khẩu" với
            // "không có tài khoản", và đó là cách dò xem ai đang làm ở bệnh viện.
            _logger.LogWarning(
                "HIS từ chối đăng nhập nhân viên {Username}: HTTP {Status}.",
                dto.Username, (int)response.StatusCode);

            return Unauthorized(ApiResponse.Fail("Tài khoản hoặc mật khẩu không đúng."));
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = document.RootElement;
        var payload = root.TryGetProperty("data", out var data) ? data : root;

        var token = payload.TryGetProperty("token", out var t) ? t.GetString() : null;
        if (string.IsNullOrEmpty(token))
            return Unauthorized(ApiResponse.Fail("Tài khoản hoặc mật khẩu không đúng."));

        // Đọc vai trò TỪ CHÍNH TOKEN, không đọc từ thân phản hồi: thân phản hồi của HIS đặt vai trò
        // ở những chỗ khác nhau tuỳ endpoint, còn claim trong token là thứ mà chính sách phân quyền
        // sẽ dùng ở mọi lời gọi sau đó. Lấy đúng nguồn ấy thì không bao giờ có cảnh "đăng nhập bảo
        // đủ quyền, gọi API lại bị từ chối".
        var roles = ReadRolesFromToken(token);
        var allowed = roles.Any(r => StaffAuth.LookupRoles.Contains(r, StringComparer.OrdinalIgnoreCase));

        if (!allowed)
        {
            // Trả 403 chứ không 401: mật khẩu đúng, chỉ là chưa được cấp quyền. Nói rõ để nhân viên
            // biết phải đi xin quyền chứ không ngồi thử lại mật khẩu.
            _logger.LogWarning(
                "Nhân viên {Username} đăng nhập đúng nhưng không có vai trò tra cứu.", dto.Username);

            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Fail(
                "Tài khoản của bạn chưa được cấp quyền dùng module tra cứu. "
                + "Vui lòng liên hệ quản trị hệ thống.",
                "LOOKUP_NOT_ALLOWED"));
        }

        return Ok(ApiResponse<StaffLoginResultDto>.Ok(new StaffLoginResultDto
        {
            Token = token,
            FullName = payload.TryGetProperty("fullName", out var n) ? n.GetString() ?? "" : "",
            Roles = roles,
        }));
    }

    /// <summary>
    /// Vai trò lấy từ claim của token.
    ///
    /// KHÔNG kiểm chữ ký ở đây, và không cần: token vừa do chính HIS cấp qua lời gọi ngay phía trên,
    /// còn mọi request tra cứu sau đó đều được lược đồ <c>HisStaff</c> kiểm chữ ký đầy đủ. Việc đọc
    /// claim ở đây chỉ để trả lời sớm một câu hỏi trải nghiệm: "bạn có quyền dùng màn này không".
    /// </summary>
    private static List<string> ReadRolesFromToken(string token)
    {
        const string roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

        var roles = new List<string>();
        var parts = token.Split('.');
        if (parts.Length < 2) return roles;

        try
        {
            using var document = JsonDocument.Parse(DecodeSegment(parts[1]));

            if (!document.RootElement.TryGetProperty(roleClaim, out var claim)
                && !document.RootElement.TryGetProperty("role", out claim))
                return roles;

            if (claim.ValueKind == JsonValueKind.String)
            {
                var value = claim.GetString();
                if (!string.IsNullOrEmpty(value)) roles.Add(value);
            }
            else if (claim.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in claim.EnumerateArray())
                {
                    var value = item.GetString();
                    if (!string.IsNullOrEmpty(value)) roles.Add(value);
                }
            }
        }
        catch (Exception ex) when (ex is JsonException or FormatException)
        {
            // Token lạ hình dạng: coi như không có vai trò nào. Lời gọi sau đó vẫn bị lược đồ
            // HisStaff chặn, nên không có gì lọt qua.
        }

        return roles;
    }

    /// <summary>Giải mã một phân đoạn base64url của JWT (không có dấu "=" đệm).</summary>
    private static byte[] DecodeSegment(string segment)
    {
        var padded = segment.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }
}

public class StaffLoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class StaffLoginResultDto
{
    /// <summary>Token do HIS Core cấp — dùng cho mọi lời gọi tra cứu sau đó.</summary>
    public string Token { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
}
