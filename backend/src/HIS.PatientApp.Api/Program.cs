using System.Text;
using System.Threading.RateLimiting;
using HIS.PatientApp.Api;
using HIS.PatientApp.Api.Auth;
using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Middleware;
using HIS.PatientApp.Api.Push;
using HIS.PatientApp.Api.Services;
using HIS.PatientApp.Api.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- cấu hình

builder.Services.Configure<AppJwtOptions>(builder.Configuration.GetSection(AppJwtOptions.SectionName));
builder.Services.Configure<HisConnectorOptions>(
    builder.Configuration.GetSection(HisConnectorOptions.SectionName));
builder.Services.Configure<PushRelayOptions>(
    builder.Configuration.GetSection(PushRelayOptions.SectionName));
builder.Services.Configure<AppointmentReminderOptions>(
    builder.Configuration.GetSection(AppointmentReminderOptions.SectionName));

var jwtOptions = builder.Configuration.GetSection(AppJwtOptions.SectionName).Get<AppJwtOptions>()
                 ?? new AppJwtOptions();
var hisOptions = builder.Configuration.GetSection(HisConnectorOptions.SectionName).Get<HisConnectorOptions>()
                 ?? new HisConnectorOptions();

// Thà không khởi động được còn hơn chạy với khoá ký yếu hoặc khoá mặc định lọt ra production.
if (!builder.Environment.IsDevelopment() && jwtOptions.Key.Length < 32)
{
    throw new InvalidOperationException(
        "AppJwt:Key phải có tối thiểu 32 ký tự và được đặt qua biến môi trường ở môi trường thật.");
}

// ------------------------------------------------------------------ CSDL

builder.Services.AddDbContext<PatientAppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PatientAppDb")));

// -------------------------------------------------------- kết nối HIS Core

builder.Services.AddSingleton<HisServiceTokenProvider>();
builder.Services.AddScoped<IHisConnector, HisRestConnector>();

builder.Services
    .AddHttpClient(HisRestConnector.HttpClientName, client =>
    {
        client.BaseAddress = new Uri(hisOptions.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromSeconds(hisOptions.TimeoutSeconds);
    })
    // Thử lại lỗi tạm thời: HIS khởi động lại hoặc mạng nội bộ chớp là chuyện thường trong DC.
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(2, attempt => TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt))))
    // Ngắt mạch khi HIS thật sự sập: tiếp tục dội vào chỉ làm nó chết lâu hơn và làm app treo.
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));

// -------------------------------------------------------------- nghiệp vụ

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<PatientAuthService>();
builder.Services.AddScoped<NotificationService>();

// ------------------------------------------------- ví giấy tờ (HSMT I.2 #8)

var vaultOptions = builder.Configuration.GetSection("DocumentVault").Get<DocumentVaultOptions>()
                   ?? new DocumentVaultOptions();

// Khoá mã hoá giấy tờ phải có thật ở môi trường thật. Thiếu khoá thì DocumentVault sinh một khoá
// tạm theo tiến trình — chạy được, nhưng khởi động lại là mọi giấy tờ cũ giải mã hỏng. Thà chết ở
// lúc khởi động còn hơn phát hiện ra khi người bệnh mở giấy tờ của mình.
if (!builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(vaultOptions.Key))
{
    throw new InvalidOperationException(
        "Chưa cấu hình DocumentVault:Key. Sinh khoá: openssl rand -base64 32");
}

Directory.CreateDirectory(vaultOptions.RootPath);
builder.Services.AddSingleton(vaultOptions);
builder.Services.AddSingleton<DocumentVault>();

// ------------------------------------------------------- đẩy thông báo (push)

var pushOptions = builder.Configuration.GetSection(PushRelayOptions.SectionName).Get<PushRelayOptions>()
                  ?? new PushRelayOptions();

if (string.IsNullOrWhiteSpace(pushOptions.BaseUrl))
{
    // Không cấu hình relay thì thông báo vẫn vào hộp thư, chỉ là không đẩy được. Bản này ghi log
    // cảnh báo mỗi lần thay vì im lặng — "app không nhận được thông báo" rất khó truy nếu hệ thống
    // không nói gì.
    builder.Services.AddScoped<IPushSender, DisabledPushSender>();
}
else
{
    // Bẫy cấu hình đã gặp thật khi đo nghiệm thu: đặt BaseUrl là `http://...` trong khi Caddy trên
    // VPS đẩy mọi thứ sang HTTPS (308). `HttpClient` không đi theo chuyển hướng đó, nên MỌI thông
    // báo đều rơi vào nhánh "chưa gửi được, sẽ thử lại" rồi thử mãi — trong CSDL chỉ thấy
    // AttemptCount tăng dần, không có lỗi nào nói rõ nguyên nhân, và người bệnh thì không bao giờ
    // nhận được gì. Nói to ngay lúc khởi động rẻ hơn nhiều so với truy ngược từ triệu chứng đó.
    if (!pushOptions.BaseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
        && !pushOptions.BaseUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        && !pushOptions.BaseUrl.Contains("127.0.0.1", StringComparison.Ordinal))
    {
        Console.Error.WriteLine(
            "[CẢNH BÁO] PushRelay:BaseUrl không phải https — nếu relay nằm sau Caddy thì mọi lời "
            + "gọi sẽ bị chuyển hướng 308 và KHÔNG thông báo nào tới được người bệnh. "
            + $"Giá trị hiện tại: {pushOptions.BaseUrl}");
    }

    builder.Services.AddScoped<IPushSender, RelayPushSender>();
    builder.Services.AddHttpClient(RelayPushSender.HttpClientName, client =>
    {
        client.BaseAddress = new Uri(pushOptions.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromSeconds(pushOptions.TimeoutSeconds);
        // Relay chỉ nhận yêu cầu có khoá này: không có nó thì ai biết địa chỉ relay cũng gửi được
        // thông báo giả mạo tới người bệnh.
        client.DefaultRequestHeaders.Add("X-Relay-Key", pushOptions.ApiKey);
    });
}

builder.Services.AddHostedService<PushDispatcherWorker>();

// Nhắc lịch khám trước 1 ngày và trước 1 giờ (HSMT I.2 #4).
builder.Services.AddHostedService<AppointmentReminderWorker>();

// Gửi các đợt thông báo đã hẹn giờ của bệnh viện (HSMT I.3 #1.4).
builder.Services.AddHostedService<CampaignDispatcherWorker>();

// Kênh gửi OTP: bản THẬT (gọi cổng SMS của bệnh viện) và bản GIẢ (in ra log) chọn bằng cấu hình.
//
// Bản in-log chỉ được phép ở môi trường phát triển: in mã OTP ra log ở môi trường thật đồng nghĩa
// ai đọc được log là đăng nhập được vào tài khoản người bệnh — mà log thì được gom về máy giám sát,
// nhiều người đọc, và giữ lâu hơn hẳn dữ liệu nghiệp vụ.
builder.Services.Configure<OtpSenderOptions>(
    builder.Configuration.GetSection(OtpSenderOptions.SectionName));

var otpOptions = builder.Configuration.GetSection(OtpSenderOptions.SectionName).Get<OtpSenderOptions>()
                 ?? new OtpSenderOptions();

var useRealOtpSender = string.Equals(otpOptions.Provider, "http", StringComparison.OrdinalIgnoreCase);

if (useRealOtpSender)
{
    if (string.IsNullOrWhiteSpace(otpOptions.Url) || string.IsNullOrWhiteSpace(otpOptions.BodyTemplate))
    {
        throw new InvalidOperationException(
            "OtpSender:Provider = http nhưng thiếu Url hoặc BodyTemplate. "
            + "Xem docs/features/patient-app/external-services-setup.md §1.");
    }

    builder.Services.AddScoped<IOtpSender, HttpOtpSender>();
    builder.Services.AddHttpClient(HttpOtpSender.HttpClientName, client =>
    {
        client.Timeout = TimeSpan.FromSeconds(otpOptions.TimeoutSeconds);
    });
}
else if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<IOtpSender, LoggingOtpSender>();
}
else
{
    // Cố ý ném ngay lúc khởi động thay vì âm thầm in mã ra log ở môi trường thật.
    throw new InvalidOperationException(
        "Chưa cấu hình kênh gửi OTP thật: đặt OtpSender:Provider = \"http\" cùng Url/BodyTemplate "
        + "của cổng SMS. Xem docs/features/patient-app/external-services-setup.md §1.");
}

// ---------------------------------------------------------------- xác thực

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            // Không cho lệch giờ 5 phút mặc định: token hết hạn là phải hết hạn.
            ClockSkew = TimeSpan.Zero,
        };

        options.Events = new JwtBearerEvents
        {
            // Đây là thứ làm cho "đăng xuất từ xa" có hiệu lực TỨC THÌ: mỗi request đối chiếu con dấu
            // trong token với con dấu trong CSDL. Đăng xuất từ xa xoay con dấu ⇒ token cũ chết ngay,
            // không phải đợi hết 15 phút.
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;
                var stampInToken = principal?.FindFirst(AppClaims.SecurityStamp)?.Value;
                if (string.IsNullOrEmpty(stampInToken))
                {
                    context.Fail("Token thiếu con dấu bảo mật.");
                    return;
                }

                if (!Guid.TryParse(principal!.FindFirst(AppClaims.AccountId)?.Value, out var accountId))
                {
                    context.Fail("Token thiếu accountId.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<PatientAppDbContext>();
                var current = await db.Accounts
                    .Where(a => a.Id == accountId)
                    .Select(a => new { a.SecurityStamp, a.Status })
                    .FirstOrDefaultAsync();

                if (current is null || current.SecurityStamp != stampInToken)
                {
                    context.Fail("Phiên đăng nhập đã bị thu hồi.");
                    return;
                }

                if (current.Status != AppAccountStatus.Active)
                {
                    context.Fail("Tài khoản đang bị khoá.");
                }
            },
        };
    })
    // ---------------------------------------------- lược đồ thứ hai: nhân viên HIS
    //
    // Nhân viên đã có token do HIS Core cấp; BFF nhận chính token đó thay vì bắt đăng nhập lần hai.
    //
    // BFF **hỏi lại HIS** xem token còn hiệu lực không, thay vì tự kiểm chữ ký. HIS ký bằng HMAC —
    // khoá đối xứng — nên muốn tự kiểm thì phải giữ chính khoá ký của HIS, mà giữ khoá đó nghĩa là
    // BFF tự đúc được token HIS cho bất kỳ vai trò nào. Quyền đó lớn hơn hẳn thứ nó cần, và với một
    // dịch vụ mở ra Internet thì không đáng đánh đổi. Chi tiết: [D21] trong decisions.md.
    .AddScheme<HisIntrospectionOptions, HisIntrospectionHandler>(StaffAuth.Scheme, options =>
    {
        builder.Configuration.GetSection("HisStaffAuth").Bind(options);
    });

// HttpClient riêng cho việc kiểm token: timeout ngắn, vì nó nằm trên đường xử lý của MỌI lời gọi
// API quản trị — HIS chậm một nhịp thì cả web quản trị đứng theo.
builder.Services.AddHttpClient(HisIntrospectionHandler.HttpClientName, client =>
{
    var baseUrl = builder.Configuration["HisConnector:BaseUrl"];
    if (!string.IsNullOrWhiteSpace(baseUrl)) client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddMemoryCache();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(StaffAuth.AdminPolicy, policy => policy
        .AddAuthenticationSchemes(StaffAuth.Scheme)
        .RequireAuthenticatedUser()
        .RequireRole(StaffAuth.AdminRoles));

    options.AddPolicy(StaffAuth.LookupPolicy, policy => policy
        .AddAuthenticationSchemes(StaffAuth.Scheme)
        .RequireAuthenticatedUser()
        .RequireRole(StaffAuth.LookupRoles));
});

// ------------------------------------------------------- giới hạn tần suất

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Giới hạn theo IP. Ở sau reverse proxy phải đọc X-Forwarded-For, nếu không mọi request sẽ trông
    // như đến từ cùng một IP và cả hệ thống dùng chung một hạn mức.
    static string PartitionKey(HttpContext context) =>
        context.GetClientIp() ?? "unknown";

    options.AddPolicy(RateLimitPolicies.Auth, context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
        }));

    // Giới hạn theo IP ở đây chỉ là LỚP CHẶN THỨ HAI. Lớp thật nằm trong `OtpService`: tối đa 3 mã
    // trong 15 phút cho MỖI SỐ ĐIỆN THOẠI — đó mới là thứ chặn được việc dội tin nhắn vào một người.
    //
    // Vì sao không siết chặt theo IP: mạng di động Việt Nam dùng CGNAT dày đặc, hàng nghìn thuê bao
    // chung một địa chỉ công cộng. Đặt 5 lần/10 phút theo IP nghĩa là cả một vùng thuê bao chỉ xin
    // được 5 mã mỗi 10 phút — người bệnh thứ sáu trong ngày sẽ bị chặn mà không hiểu vì sao, còn kẻ
    // lạm dụng thật thì chỉ cần đổi mạng. Con số dưới đây đủ rộng cho một trạm phát sóng đông người,
    // mà vẫn chặn một máy đơn lẻ dội hàng nghìn yêu cầu.
    options.AddPolicy(RateLimitPolicies.Otp, context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(10),
        }));
});

// ----------------------------------------------------------------- MVC/API

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Chỉ mở Swagger ngoài production: đây là bản đồ bề mặt tấn công.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// TLS do Caddy trên VPS đảm nhiệm (HSMT I.4/II); container này chạy HTTP sau proxy.
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Đặt SAU authentication để đọc được claim, và TRƯỚC controller để chặn được đường đi.
app.UseMiddleware<PasswordChangeRequiredMiddleware>();

app.MapControllers();

// Tự áp migration lúc khởi động, giống cách HIS Core đang làm — người vận hành không phải chạy tay.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PatientAppDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();
