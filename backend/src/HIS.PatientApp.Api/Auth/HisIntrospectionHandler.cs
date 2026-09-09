using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace HIS.PatientApp.Api.Auth;

/// <summary>
/// Xác thực nhân viên bằng cách <b>hỏi lại HIS</b>, thay vì tự kiểm chữ ký token.
///
/// <para><b>Vì sao không tự kiểm chữ ký.</b> HIS ký token bằng HMAC — thuật toán khoá đối xứng, cùng
/// một khoá dùng để ký và để kiểm. Muốn BFF tự kiểm thì phải đưa cho nó chính khoá ký của HIS, mà
/// như vậy BFF không chỉ *kiểm* được token, nó còn **tự đúc ra token HIS** cho bất kỳ vai trò nào.
/// Với một dịch vụ mở ra Internet, đó là quyền lớn hơn hẳn thứ nó cần.</para>
///
/// <para><b>Và nó chặn đường bán sản phẩm.</b> Ghép app này với HIS của đơn vị khác thì phải đi xin
/// khoá ký JWT của họ — không ai đưa, vì đưa là trao quyền giả mạo mọi nhân viên trong hệ thống của
/// mình. Còn một API kiểu "token này còn hiệu lực không" thì HIS nào cũng có.</para>
///
/// <para><b>Đổi lại:</b> mỗi lần kiểm là một lời gọi mạng. Bù bằng cache ngắn theo token (mặc định
/// 2 phút). Cache đó cũng là chỗ tốt hơn hướng cũ ở một điểm nữa: nhân viên bị khoá tài khoản giữa
/// chừng sẽ mất quyền sau vài phút, thay vì phải đợi token hết hạn.</para>
/// </summary>
public class HisIntrospectionOptions : AuthenticationSchemeOptions
{
    /// <summary>Đường kiểm token trên HIS. Trả 200 kèm thông tin nhân viên, hoặc 401.</summary>
    public string IntrospectPath { get; set; } = "/api/auth/me";

    /// <summary>
    /// Nhớ kết quả bao lâu. Ngắn thôi: đây chính là độ trễ giữa lúc quầy khoá một tài khoản và lúc
    /// người đó mất quyền trên web quản trị.
    /// </summary>
    public int CacheSeconds { get; set; } = 120;
}

public class HisIntrospectionHandler : AuthenticationHandler<HisIntrospectionOptions>
{
    public const string HttpClientName = "his-introspect";

    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;

    public HisIntrospectionHandler(
        IOptionsMonitor<HisIntrospectionOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IHttpClientFactory httpFactory,
        IMemoryCache cache)
        : base(options, logger, encoder)
    {
        _httpFactory = httpFactory;
        _cache = cache;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var header)) return AuthenticateResult.NoResult();

        var raw = header.ToString();
        if (!raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return AuthenticateResult.NoResult();

        var token = raw["Bearer ".Length..].Trim();
        if (token.Length == 0) return AuthenticateResult.NoResult();

        // Khoá cache là BĂM của token, không phải chính token: khoá cache bị lộ qua dump bộ nhớ hay
        // log chẩn đoán thì cũng không đăng nhập được bằng nó.
        var cacheKey = "his-staff:" + Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));

        if (_cache.TryGetValue<StaffIdentity?>(cacheKey, out var cached))
        {
            // Nhớ cả kết quả TỪ CHỐI: không thì một token rác gọi liên tục sẽ nện HIS mỗi lời gọi.
            return cached is null
                ? AuthenticateResult.Fail("Token nhân viên không hợp lệ.")
                : AuthenticateResult.Success(Ticket(cached));
        }

        StaffIdentity? identity;
        try
        {
            identity = await IntrospectAsync(token);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // HIS không gọi được: KHÔNG cache, và KHÔNG coi là token sai. Nói đúng bản chất để người
            // vận hành không đi tìm nhầm sang phía tài khoản.
            Logger.LogWarning(ex, "Không hỏi được HIS để xác thực nhân viên.");
            return AuthenticateResult.Fail("Chưa kết nối được hệ thống bệnh viện. Vui lòng thử lại.");
        }

        _cache.Set(cacheKey, identity, TimeSpan.FromSeconds(Math.Clamp(Options.CacheSeconds, 5, 900)));

        return identity is null
            ? AuthenticateResult.Fail("Token nhân viên không hợp lệ.")
            : AuthenticateResult.Success(Ticket(identity));
    }

    private async Task<StaffIdentity?> IntrospectAsync(string token)
    {
        var client = _httpFactory.CreateClient(HttpClientName);

        using var request = new HttpRequestMessage(HttpMethod.Get, Options.IntrospectPath);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request, Context.RequestAborted);

        if (response.StatusCode is System.Net.HttpStatusCode.Unauthorized
                                or System.Net.HttpStatusCode.Forbidden)
        {
            return null;
        }

        // Mã lạ (500, 502…) không phải là "token sai" — ném để nhánh trên báo đúng nguyên nhân.
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(Context.RequestAborted);
        using var doc = JsonDocument.Parse(body);

        // HIS bọc mọi phản hồi trong {success,data}. Chấp nhận cả hai dạng để đổi bản HIS không gãy.
        var root = doc.RootElement;
        var data = root.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Object ? d : root;

        var id = Str(data, "id");
        if (string.IsNullOrWhiteSpace(id)) return null;

        // Gộp `roles` (tên hiển thị tiếng Việt) và `roleCodes` (mã) — `StaffAuth` nhận cả hai dạng,
        // vì HIS cấp vai trò theo cả hai và bỏ sót một dạng là khoá cửa với chính người có quyền.
        var roles = Arr(data, "roles").Concat(Arr(data, "roleCodes"))
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new StaffIdentity(id, Str(data, "username") ?? "", Str(data, "fullName") ?? "", roles);
    }

    private AuthenticationTicket Ticket(StaffIdentity identity)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, identity.Id),
            new(ClaimTypes.Name, identity.Username),
            new("fullName", identity.FullName),
        };
        claims.AddRange(identity.Roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
        return new AuthenticationTicket(principal, Scheme.Name);
    }

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static IEnumerable<string> Arr(JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.Array) yield break;
        foreach (var item in v.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (s is not null) yield return s;
            }
        }
    }

    private record StaffIdentity(string Id, string Username, string FullName, string[] Roles);
}
