using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using HIS.PatientApp.Api.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Xác thực nhân viên bằng cách hỏi lại HIS (thay cho việc giữ khoá ký của HIS — xem D21).
///
/// Bốn mệnh đề phải đúng, và ba trong số đó hỏng thì hỏng im lặng:
/// token hợp lệ phải mang đủ vai trò sang (thiếu vai trò = khoá cửa với chính người có quyền);
/// token sai phải bị từ chối; **HIS chết KHÔNG được coi là token sai**; và kết quả phải được nhớ
/// lại, kể cả kết quả từ chối, nếu không một token rác gọi liên tục sẽ nện HIS mỗi lời gọi.
/// </summary>
public class HisIntrospectionHandlerTests
{
    private sealed class StubHandler : HttpMessageHandler
    {
        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) => _respond = respond;
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public int Calls { get; private set; }
        public string? LastAuthorization { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            LastAuthorization = request.Headers.Authorization?.ToString();
            return Task.FromResult(_respond(request));
        }
    }

    private sealed class StubFactory : IHttpClientFactory
    {
        public StubFactory(HttpMessageHandler handler) => _handler = handler;
        private readonly HttpMessageHandler _handler;
        public HttpClient CreateClient(string name) =>
            new(_handler, disposeHandler: false) { BaseAddress = new Uri("https://his.example.vn/") };
    }

    private const string MeOk = """
        {"success":true,"data":{"id":"9e5309dc-ecf9-4d48-9a09-224cd15347b1","username":"admin",
         "fullName":"Administrator","roles":["Quản trị hệ thống"],"roleCodes":["ADMIN"]}}
        """;

    private static (HisIntrospectionHandler handler, HttpContext http, StubHandler stub) Make(
        Func<HttpRequestMessage, HttpResponseMessage> respond,
        string? authorization = "Bearer token-hop-le",
        IMemoryCache? cache = null)
    {
        var stub = new StubHandler(respond);
        var options = new HisIntrospectionOptions();

        var handler = new HisIntrospectionHandler(
            new OptionsMonitorStub(options),
            NullLoggerFactory.Instance,
            UrlEncoder.Default,
            new StubFactory(stub),
            cache ?? new MemoryCache(new MemoryCacheOptions()));

        var http = new DefaultHttpContext();
        if (authorization is not null) http.Request.Headers.Authorization = authorization;

        handler.InitializeAsync(
            new AuthenticationScheme(StaffAuth.Scheme, null, typeof(HisIntrospectionHandler)),
            http).GetAwaiter().GetResult();

        return (handler, http, stub);
    }

    private sealed class OptionsMonitorStub : IOptionsMonitor<HisIntrospectionOptions>
    {
        public OptionsMonitorStub(HisIntrospectionOptions value) => CurrentValue = value;
        public HisIntrospectionOptions CurrentValue { get; }
        public HisIntrospectionOptions Get(string? name) => CurrentValue;
        public IDisposable? OnChange(Action<HisIntrospectionOptions, string?> listener) => null;
    }

    private static HttpResponseMessage Json(HttpStatusCode code, string body) =>
        new(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    [Fact]
    public async Task Token_hop_le_thi_nhan_dien_duoc_nhan_vien()
    {
        var (handler, _, stub) = Make(_ => Json(HttpStatusCode.OK, MeOk));

        var result = await handler.AuthenticateAsync();

        Assert.True(result.Succeeded);
        Assert.Equal("9e5309dc-ecf9-4d48-9a09-224cd15347b1",
            result.Principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        Assert.Equal("Administrator", result.Principal.GetStaffName());
        Assert.Equal("Bearer token-hop-le", stub.LastAuthorization);
    }

    /// <summary>
    /// HIS cấp vai trò theo CẢ HAI dạng: tên hiển thị tiếng Việt và mã. `StaffAuth` nhận cả hai, nên
    /// bỏ sót một dạng là khoá cửa với chính người có quyền.
    /// </summary>
    [Fact]
    public async Task Mang_sang_ca_ten_vai_tro_lan_ma_vai_tro()
    {
        var (handler, _, _) = Make(_ => Json(HttpStatusCode.OK, MeOk));

        var result = await handler.AuthenticateAsync();

        Assert.True(result.Principal!.IsInRole("Quản trị hệ thống"));
        Assert.True(result.Principal.IsInRole("ADMIN"));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    public async Task HIS_tu_choi_token_thi_khong_cho_vao(HttpStatusCode code)
    {
        var (handler, _, _) = Make(_ => Json(code, "{}"));

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
    }

    /// <summary>
    /// Mệnh đề dễ làm sai nhất: HIS sập KHÔNG phải là "token sai". Gộp hai thứ lại thì người vận
    /// hành đi tìm nhầm sang phía tài khoản, trong khi lỗi nằm ở kết nối.
    /// </summary>
    [Fact]
    public async Task HIS_chet_thi_bao_loi_ket_noi_chu_KHONG_bao_token_sai()
    {
        var (handler, _, _) = Make(_ => throw new HttpRequestException("HIS sap"));

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Contains("kết nối", result.Failure!.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task HIS_tra_500_cung_KHONG_bi_coi_la_token_sai()
    {
        var (handler, _, _) = Make(_ => Json(HttpStatusCode.InternalServerError, "loi"));

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Contains("kết nối", result.Failure!.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Khong_co_header_thi_bo_qua_chu_khong_goi_HIS()
    {
        var (handler, _, stub) = Make(_ => Json(HttpStatusCode.OK, MeOk), authorization: null);

        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Equal(0, stub.Calls);
    }

    [Fact]
    public async Task Header_khong_phai_Bearer_thi_cung_khong_goi_HIS()
    {
        var (handler, _, stub) = Make(_ => Json(HttpStatusCode.OK, MeOk), authorization: "Basic abc");

        Assert.False((await handler.AuthenticateAsync()).Succeeded);
        Assert.Equal(0, stub.Calls);
    }

    [Fact]
    public async Task Nho_ket_qua_de_khong_hoi_HIS_o_moi_loi_goi()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var (h1, _, stub) = Make(_ => Json(HttpStatusCode.OK, MeOk), cache: cache);
        await h1.AuthenticateAsync();

        // Lời gọi thứ hai với CÙNG token phải lấy từ cache.
        var (h2, _, stub2) = Make(_ => Json(HttpStatusCode.OK, MeOk), cache: cache);
        var second = await h2.AuthenticateAsync();

        Assert.True(second.Succeeded);
        Assert.Equal(1, stub.Calls);
        Assert.Equal(0, stub2.Calls);
    }

    /// <summary>
    /// Nhớ cả kết quả TỪ CHỐI. Không thì một token rác gọi liên tục sẽ biến web quản trị thành công
    /// cụ nện HIS: mỗi lời gọi là một lượt hỏi.
    /// </summary>
    [Fact]
    public async Task Nho_ca_ket_qua_tu_choi()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var (h1, _, stub) = Make(_ => Json(HttpStatusCode.Unauthorized, "{}"), cache: cache);
        await h1.AuthenticateAsync();

        var (h2, _, stub2) = Make(_ => Json(HttpStatusCode.Unauthorized, "{}"), cache: cache);
        Assert.False((await h2.AuthenticateAsync()).Succeeded);

        Assert.Equal(1, stub.Calls);
        Assert.Equal(0, stub2.Calls);
    }

    /// <summary>HIS chết thì KHÔNG được nhớ — nếu không, HIS sống lại mà nhân viên vẫn bị chặn.</summary>
    [Fact]
    public async Task Loi_ket_noi_thi_KHONG_nho_lai()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var (h1, _, _) = Make(_ => throw new HttpRequestException("HIS sap"), cache: cache);
        await h1.AuthenticateAsync();

        // HIS sống lại: lời gọi sau phải hỏi thật và cho vào.
        var (h2, _, stub2) = Make(_ => Json(HttpStatusCode.OK, MeOk), cache: cache);
        var second = await h2.AuthenticateAsync();

        Assert.True(second.Succeeded);
        Assert.Equal(1, stub2.Calls);
    }

    [Fact]
    public async Task Hai_token_khac_nhau_khong_dung_chung_o_nho()
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var (h1, _, _) = Make(_ => Json(HttpStatusCode.OK, MeOk), cache: cache);
        await h1.AuthenticateAsync();

        var (h2, _, stub2) = Make(_ => Json(HttpStatusCode.Unauthorized, "{}"),
            authorization: "Bearer token-khac", cache: cache);

        Assert.False((await h2.AuthenticateAsync()).Succeeded);
        Assert.Equal(1, stub2.Calls);
    }

    [Fact]
    public async Task Chap_nhan_ca_phan_hoi_KHONG_boc_vo_success_data()
    {
        // Đổi bản HIS hoặc ghép với HIS hãng khác thì hình dạng phản hồi có thể phẳng.
        const string flat = """
            {"id":"11111111-1111-1111-1111-111111111111","username":"le_tan",
             "fullName":"Lễ tân A","roles":["Lễ tân"]}
            """;
        var (handler, _, _) = Make(_ => Json(HttpStatusCode.OK, flat));

        var result = await handler.AuthenticateAsync();

        Assert.True(result.Succeeded);
        Assert.True(result.Principal!.IsInRole("Lễ tân"));
    }

    [Fact]
    public async Task Phan_hoi_thieu_id_thi_khong_cho_vao()
    {
        var (handler, _, _) = Make(_ => Json(HttpStatusCode.OK, "{\"data\":{\"username\":\"x\"}}"));

        Assert.False((await handler.AuthenticateAsync()).Succeeded);
    }
}
