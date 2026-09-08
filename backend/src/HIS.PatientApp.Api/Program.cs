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

// Bản gửi OTP thật cắm ở đây. Bản ghi-log chỉ được phép ở môi trường phát triển: in mã OTP ra log
// ở production đồng nghĩa ai đọc được log là đăng nhập được vào tài khoản người bệnh.
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<IOtpSender, LoggingOtpSender>();
}
else
{
    // TODO(Phase 1 — tích hợp SMS): thay bằng bản gọi gateway SMS thật của bệnh viện.
    // Cố ý ném ngay lúc khởi động thay vì âm thầm không gửi được mã.
    throw new InvalidOperationException(
        "Chưa cấu hình kênh gửi OTP thật. Đăng ký một IOtpSender gọi gateway SMS trước khi chạy ngoài môi trường phát triển.");
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
    });

builder.Services.AddAuthorization();

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

    options.AddPolicy(RateLimitPolicies.Otp, context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            // Chặt hơn: mỗi lần gọi là một tin nhắn tốn tiền, và cũng là một lần làm phiền chủ số.
            PermitLimit = 5,
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
