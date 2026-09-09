using System.Net;
using System.Text;
using HIS.PatientApp.Api.Auth;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Bản gửi OTP thật qua cổng SMS của bệnh viện.
///
/// Chỗ này hỏng thì hỏng theo kiểu người bệnh chịu: họ bấm "gửi mã", màn hình báo đã gửi, rồi ngồi
/// chờ một tin nhắn không bao giờ tới. Ba mệnh đề quan trọng nhất — và cả ba đều im lặng nếu sai:
/// mã OTP <b>không</b> được lọt vào log; cổng SMS trả lỗi thì phải NÉM chứ không được coi là đã gửi;
/// và số điện thoại phải đúng dạng cổng đó nhận.
/// </summary>
public class HttpOtpSenderTests
{
    /// <summary>Bắt lại yêu cầu HTTP để soi, và trả về phản hồi dựng sẵn.</summary>
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public CapturingHandler(HttpStatusCode status = HttpStatusCode.OK, string body = "{\"status\":\"ok\"}")
        {
            _status = status;
            _body = body;
        }

        private readonly HttpStatusCode _status;
        private readonly string _body;

        public HttpRequestMessage? Request { get; private set; }
        public string? RequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            RequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, Encoding.UTF8, "application/json"),
            };
        }
    }

    private sealed class SingleClientFactory : IHttpClientFactory
    {
        public SingleClientFactory(HttpMessageHandler handler) => _handler = handler;
        private readonly HttpMessageHandler _handler;
        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    private static (HttpOtpSender sender, CapturingHandler handler) Make(
        Action<OtpSenderOptions>? tweak = null,
        HttpStatusCode status = HttpStatusCode.OK,
        string responseBody = "{\"status\":\"ok\"}")
    {
        var options = new OtpSenderOptions
        {
            Provider = "http",
            Url = "https://sms.example.vn/send",
            BodyTemplate = "{\"to\":\"{phone}\",\"content\":\"{message}\",\"brandname\":\"BENHVIEN\"}",
            Headers = { ["Authorization"] = "Bearer khoa-cong-sms" },
            CodeLifetimeMinutes = 5,
        };
        tweak?.Invoke(options);

        var handler = new CapturingHandler(status, responseBody);
        var sender = new HttpOtpSender(
            new SingleClientFactory(handler),
            Options.Create(options),
            NullLogger<HttpOtpSender>.Instance);

        return (sender, handler);
    }

    [Fact]
    public async Task Gui_thanh_cong_thi_goi_dung_URL_va_dung_header_xac_thuc()
    {
        var (sender, handler) = Make();

        await sender.SendAsync("0912345678", "123456", "register");

        Assert.Equal("https://sms.example.vn/send", handler.Request!.RequestUri!.ToString());
        Assert.Equal(HttpMethod.Post, handler.Request.Method);
        Assert.Equal("Bearer khoa-cong-sms", handler.Request.Headers.GetValues("Authorization").Single());
    }

    [Fact]
    public async Task Noi_dung_tin_nhan_mang_dung_ma_va_thoi_han()
    {
        var (sender, handler) = Make();

        await sender.SendAsync("0912345678", "246810", "register");

        Assert.Contains("246810", handler.RequestBody);
        Assert.Contains("5 phut", handler.RequestBody);
    }

    /// <summary>
    /// Cổng SMS trong nước phần lớn không nhận "+84". Sai dạng số thì tin nhắn không đi, mà cổng
    /// vẫn có thể trả 200 — nên đây là loại lỗi không ai phát hiện cho tới khi người bệnh gọi lên.
    /// </summary>
    [Theory]
    [InlineData(OtpPhoneFormat.NoPlus, "84912345678")]
    [InlineData(OtpPhoneFormat.Local, "0912345678")]
    [InlineData(OtpPhoneFormat.E164, "+84912345678")]
    public async Task Dinh_dang_so_dien_thoai_theo_dung_cong_SMS(OtpPhoneFormat format, string expected)
    {
        var (sender, handler) = Make(o => o.PhoneFormat = format);

        await sender.SendAsync("0912345678", "123456", "register");

        Assert.Contains($"\"to\":\"{expected}\"", handler.RequestBody);
    }

    [Fact]
    public async Task Mọi_cach_go_so_deu_ra_cung_mot_so_gui_di()
    {
        foreach (var input in new[] { "0912345678", "+84 912 345 678", "84912345678", "0912.345.678" })
        {
            var (sender, handler) = Make(o => o.PhoneFormat = OtpPhoneFormat.NoPlus);
            await sender.SendAsync(input, "123456", "register");
            Assert.Contains("\"to\":\"84912345678\"", handler.RequestBody);
        }
    }

    [Fact]
    public async Task Cong_SMS_tra_loi_HTTP_thi_NEM_chu_khong_coi_la_da_gui()
    {
        var (sender, _) = Make(status: HttpStatusCode.BadGateway);

        await Assert.ThrowsAsync<OtpSendFailedException>(
            () => sender.SendAsync("0912345678", "123456", "register"));
    }

    /// <summary>
    /// Nhiều cổng SMS trả HTTP 200 kèm mã lỗi trong thân phản hồi. Không xét thân thì hệ thống
    /// tưởng đã gửi, người bệnh thì không nhận được gì, và không có dấu vết nào để lần.
    /// </summary>
    [Fact]
    public async Task HTTP_200_nhung_than_phan_hoi_bao_loi_van_tinh_la_HONG()
    {
        var (sender, _) = Make(
            o => o.SuccessContains = "\"status\":\"ok\"",
            responseBody: "{\"status\":\"error\",\"message\":\"het han muc tin nhan\"}");

        await Assert.ThrowsAsync<OtpSendFailedException>(
            () => sender.SendAsync("0912345678", "123456", "register"));
    }

    [Fact]
    public async Task Khong_dat_SuccessContains_thi_chi_xet_ma_HTTP()
    {
        var (sender, _) = Make(responseBody: "bat ky thu gi");

        await sender.SendAsync("0912345678", "123456", "register");   // không được ném
    }

    /// <summary>
    /// Nội dung tin nhắn được nhét vào một khuôn mẫu JSON. Dấu nháy kép trong đó mà không thoát là
    /// thân yêu cầu hỏng cấu trúc — cổng SMS từ chối, và triệu chứng là "OTP thỉnh thoảng không gửi
    /// được" tuỳ theo bệnh viện đặt lời nhắn thế nào.
    /// </summary>
    [Fact]
    public async Task Dau_nhay_trong_loi_nhan_khong_lam_hong_JSON()
    {
        var (sender, handler) = Make(o =>
            o.MessageTemplate = "Benh vien \"Bluestar\": ma {code}\nKhong chia se.");

        await sender.SendAsync("0912345678", "123456", "register");

        // Thân phải vẫn là JSON đọc được.
        using var parsed = System.Text.Json.JsonDocument.Parse(handler.RequestBody!);
        Assert.Contains("Bluestar", parsed.RootElement.GetProperty("content").GetString());
        Assert.Equal("84912345678", parsed.RootElement.GetProperty("to").GetString());
    }

    [Fact]
    public async Task Duoc_phep_gui_form_urlencoded_chu_khong_chi_JSON()
    {
        // Vài cổng cũ chỉ nhận form. Khuôn mẫu phải phục vụ được cả hai mà không sửa mã nguồn.
        var (sender, handler) = Make(o =>
        {
            o.ContentType = "application/x-www-form-urlencoded";
            o.BodyTemplate = "phone={phone}&content={message}&apikey=abc";
        });

        await sender.SendAsync("0912345678", "123456", "register");

        Assert.StartsWith("phone=84912345678&content=", handler.RequestBody);
        Assert.Equal("application/x-www-form-urlencoded",
            handler.Request!.Content!.Headers.ContentType!.MediaType);
    }
}
