using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using HIS.Application;
using HIS.Infrastructure;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.API.Middleware;
using HIS.API.Hubs;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;      // AUTHZ-2 #368: cache SecurityStamp
using Microsoft.EntityFrameworkCore;            // AUTHZ-2 #368: DB lookup trong OnTokenValidated
using System.Security.Claims;                   // AUTHZ-2 #368: ClaimTypes.NameIdentifier

var builder = WebApplication.CreateBuilder(args);

// Avoid Windows EventLog provider (requires elevated rights in this environment).
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Add services
builder.Services.AddHttpContextAccessor();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Worker bơm dữ liệu demo mỗi ngày (Tiếp Đón + các phân hệ rỗng). Mặc định TẮT —
// bật trên Cloud Run bằng env var DailyDemoSeed__Enabled=true. Đặt ở tầng API vì
// reuse trực tiếp DailySeedController/PopulateDataController (Infrastructure không
// được reference API).
builder.Services.AddHostedService<HIS.API.Workers.DailyDemoSeedWorker>();
builder.Services.AddHostedService<HIS.API.Workers.TokenCleanupWorker>(); // #422: dọn RefreshTokens/UserSessions hết hạn
builder.Services.AddHostedService<HIS.API.Workers.DelegationExpiryWorker>(); // #370: auto-expire ủy quyền tạm (gated Auth:DelegationEnabled, mặc định OFF)

// #371 inc-2: Channel<AuditLog> — bounded 2000, DropOldest (giữ bộ nhớ ổn định dưới burst).
// AuditWriterWorker đọc + batch-write; AuditLogMiddleware enqueue qua ChannelWriter (TryWrite, non-blocking).
var auditChannel = System.Threading.Channels.Channel.CreateBounded<HIS.Core.Entities.AuditLog>(
    new System.Threading.Channels.BoundedChannelOptions(2000)
    {
        FullMode = System.Threading.Channels.BoundedChannelFullMode.DropOldest,
        SingleReader = true,
        SingleWriter = false,
    });
builder.Services.AddSingleton(auditChannel);
builder.Services.AddSingleton(auditChannel.Writer);
builder.Services.AddSingleton(auditChannel.Reader);
builder.Services.AddHostedService<HIS.API.Workers.AuditWriterWorker>();
builder.Services.AddHostedService<HIS.API.Workers.AuditRetentionWorker>(); // #371: xóa định kỳ AuditLogs quá retention (bypass trigger via CONTEXT_INFO 'RETE')

// Controllers
builder.Services.AddControllers(options =>
    {
        options.Filters.Add<HIS.API.Filters.ApiResponseWrapperFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Med-New-3: model-binding failures (malformed JSON, missing required field,
        // type mismatch...) trả về cùng shape {error, message, field} với DomainExceptionFilter.
        // FE chỉ phải implement 1 error handler — không phải phân biệt ProblemDetails vs custom.
        options.InvalidModelStateResponseFactory = ctx =>
        {
            var firstErr = ctx.ModelState
                .Where(kv => kv.Value != null && kv.Value.Errors.Count > 0)
                .Select(kv => new
                {
                    Field = kv.Key,
                    Message = kv.Value!.Errors[0].ErrorMessage
                              ?? kv.Value.Errors[0].Exception?.Message
                              ?? "Giá trị không hợp lệ."
                })
                .FirstOrDefault();

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                error = "VALIDATION_FAILED",
                message = firstErr?.Message ?? "Dữ liệu không hợp lệ.",
                field = firstErr?.Field
            });
        };
    });

// CORS
var corsOrigins = GetCorsOrigins(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
if (jwtKey.Length < 32)
    throw new InvalidOperationException($"Jwt:Key too short ({jwtKey.Length} chars). HmacSha256 requires ≥32 chars (256 bits).");
// #182: key mặc định trong appsettings.json đã lộ trong git history — Production BẮT BUỘC set env Jwt__Key riêng
if (builder.Environment.IsProduction() && jwtKey == "HIS_SuperSecretKey_2024_ChangeThisInProduction_MinLength32Chars")
    throw new InvalidOperationException("Jwt:Key is still the default (leaked) value in Production. Set env Jwt__Key.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
// AUTHZ-2 #368: TTL cache SecurityStamp (giây) — staleness tối đa của thu hồi tức thời khi không có Redis.
var secStampCacheSeconds = int.Parse(builder.Configuration["Auth:SecurityStampCacheSeconds"] ?? "30");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    // Allow SignalR to receive JWT via query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            var isHubRequest = path.StartsWithSegments("/hubs");
            var isPrintRequest = path.StartsWithSegments("/api/pdf") || path.StartsWithSegments("/api/reception/print");
            // #402: DICOM viewer nạp ảnh qua <img>/wadouri không gắn được header → nhận JWT qua query
            var isPacsProxy = path.StartsWithSegments("/api/RISComplete/pacs");

            if (!string.IsNullOrEmpty(accessToken) && (isHubRequest || isPrintRequest || isPacsProxy))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        // AUTHZ-2 #368: thu hồi token TỨC THỜI qua SecurityStamp. Chạy trên gần như mọi request (FallbackPolicy),
        // nên đọc stamp qua IMemoryCache TTL ngắn (mặc định 30s) đứng trước DB — staleness ≤ TTL (không có Redis).
        OnTokenValidated = async context =>
        {
            var principal = context.Principal;
            var stampClaim = principal?.FindFirst(HIS.Core.Constants.JwtClaims.SecurityStamp)?.Value;
            // Token cũ phát hành TRƯỚC deploy AUTHZ-2 (không mang claim) → grace-accept, để hết hạn tự nhiên.
            if (string.IsNullOrEmpty(stampClaim)) return;

            var idStr = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idStr, out var userId)) { context.Fail("invalid subject"); return; }

            var services = context.HttpContext.RequestServices;
            try
            {
                var cache = services.GetRequiredService<IMemoryCache>();
                var cacheKey = $"secstamp:{userId}";
                var info = await cache.GetOrCreateAsync(cacheKey, async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(secStampCacheSeconds);
                    var db = services.GetRequiredService<HISDbContext>();
                    return await db.Users.Where(u => u.Id == userId)
                        .Select(u => new UserStampInfo { Stamp = u.SecurityStamp, IsActive = u.IsActive })
                        .FirstOrDefaultAsync();
                });

                if (info != null && info.IsActive && string.Equals(info.Stamp, stampClaim, StringComparison.Ordinal))
                    return; // happy path: cache hit + khớp → pass, không chạm DB

                // Cache lệch: có thể stamp vừa xoay ở instance khác → token MỚI hợp lệ bị từ chối OAN (login-loop).
                // Mismatch hiếm (chỉ token bị thu hồi / vừa đổi mật khẩu) → đọc lại DB TƯƠI trước khi fail:
                // đúng đa-instance, không đụng chiều "chấp nhận token cũ ≤TTL" (chiều đó cache vẫn khớp, đã return).
                var freshDb = services.GetRequiredService<HISDbContext>();
                var fresh = await freshDb.Users.Where(u => u.Id == userId)
                    .Select(u => new UserStampInfo { Stamp = u.SecurityStamp, IsActive = u.IsActive })
                    .FirstOrDefaultAsync();
                cache.Set(cacheKey, fresh, TimeSpan.FromSeconds(secStampCacheSeconds));

                if (fresh == null || !fresh.IsActive) { context.Fail("user inactive"); return; }
                if (!string.Equals(fresh.Stamp, stampClaim, StringComparison.Ordinal))
                {
                    // #384: stamp xoay = phiên bị chấm dứt (login nơi khác last-wins / đổi mật khẩu /
                    // admin terminate) → gắn cờ để OnChallenge trả body SESSION_INVALIDATED cho FE
                    // phân biệt với 401 hết-hạn thường.
                    context.HttpContext.Items["auth_challenge_code"] = "SESSION_INVALIDATED";
                    context.Fail("token revoked");
                    return;
                }
            }
            catch (Exception ex)
            {
                // Fail-OPEN: DB trục trặc KHÔNG nên đánh sập toàn bộ auth (token đã hợp lệ chữ ký + chưa hết hạn).
                services.GetService<ILoggerFactory>()?.CreateLogger("AuthZ2")
                    .LogWarning(ex, "SecurityStamp check failed-open user={UserId}", userId);
            }
        },
        // #384: 401 do phiên bị chấm dứt → body JSON có code để FE hiện thông báo đúng
        // ("đăng nhập nơi khác") thay vì im lặng như hết-hạn thường. Các 401 khác giữ nguyên.
        OnChallenge = async context =>
        {
            if (context.HttpContext.Items.TryGetValue("auth_challenge_code", out var code) && code is string s)
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"code\":\"" + s + "\",\"message\":\"Phiên đăng nhập đã bị chấm dứt (tài khoản vừa đăng nhập ở nơi khác hoặc đổi mật khẩu).\"}");
            }
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    // B3-global (audit bảo mật 2026-06-06, làm 2026-06-09): fallback RequireAuthenticatedUser —
    // endpoint quên [Authorize] mặc định VẪN yêu cầu đăng nhập (chống mở toang). Endpoint công khai
    // phải [AllowAnonymous] tường minh (login · public-emr · appointment-booking · health · payment-IPN ·
    // FHIR · seed/dev · frontend-compat — đã rà đủ). 2 SignalR Hub đã có [Authorize]; Swagger là middleware.
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// AUTHZ-1 #367: policy động perm:{code} cho [RequirePermission] — provider singleton thay default
// (mọi policy khác + FallbackPolicy trên ủy quyền nguyên vẹn về DefaultAuthorizationPolicyProvider);
// handler scoped (resolve IPermissionService per-request).
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, HIS.API.Authorization.PermissionPolicyProvider>();
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, HIS.API.Authorization.PermissionAuthorizationHandler>();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    // AUTHZ-2 #368: /auth/refresh có bucket RIÊNG, partition THEO IP (review: global bucket = attacker
    // ẩn danh 60 req/phút chặn refresh TOÀN VIỆN). 120/phút/IP đủ cho NAT bệnh viện (nhiều máy trạm
    // chung 1 IP công cộng, burst đầu ca) mà vẫn vô nghĩa với brute-force token 256-bit.
    options.AddPolicy("refresh", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 120,
                QueueLimit = 0
            }));
    options.RejectionStatusCode = 429;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// SignalR for real-time notifications
builder.Services.AddSignalR();

// Adapter so the Infrastructure-layer AI worklist worker can push realtime
// updates through SignalR (the Hub lives in HIS.API; Infra can't reference it).
builder.Services.AddSingleton<HIS.Application.Services.IRealtimeNotifier, HIS.API.Realtime.SignalRRealtimeNotifier>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "HIS API",
        Version = "v1",
        Description = "Hospital Information System API"
    });
    c.CustomSchemaIds(type => type.FullName?.Replace('+', '.') ?? type.Name);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Data Protection for column-level encryption of Patient PII (SEC-02)
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<HISDbContext>()
    .SetApplicationName("HIS");

var app = builder.Build();

// #196: cau hinh static logger cho ToBoundedListAsync (log "cham tran" = no silent cap)
QueryBoundExtensions.Configure(app.Services.GetRequiredService<ILoggerFactory>());

// #197(b): probe schema de suy whitelist Guid-audit converter (union voi hand-list trong
// HISDbContext.OnModelCreating). PHAI chay TRUOC lan dung DbContext dau tien (model build 1 lan).
GuidAuditSchemaRegistry.InitializeFromSchema(
    builder.Configuration.GetConnectionString("DefaultConnection")!,
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("GuidAuditSchemaRegistry"));

// Seed database
await DatabaseSeeder.SeedAsync(app.Services);

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HIS API V1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");

// Safety-net toàn cục (2026-06-12, bug thu trùng prod): exception unhandled từ controller CHƯA gắn
// DomainExceptionFilter trước đây rơi thẳng xuống Kestrel → connection abort → Cloud Run edge trả
// 503 TRẦN không CORS → FE không đọc được lỗi ("Failed to fetch") và retry. Đặt SAU UseCors để
// response lỗi vẫn mang Access-Control-Allow-Origin. CHỈ áp ngoài Development — dev giữ
// DeveloperExceptionPage (exception chi tiết cho debug + test harness đọc message thật).
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        await ctx.Response.WriteAsJsonAsync(new
        {
            error = "INTERNAL_ERROR",
            message = "Hệ thống đang gặp sự cố, vui lòng thử lại sau ít phút.",
            traceId = ctx.TraceIdentifier,
        });
    }));
}

// Request metrics middleware (before auth so it captures all requests)
app.UseMiddleware<RequestMetricsMiddleware>();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Audit log middleware (after auth so JWT claims are available)
app.UseMiddleware<AuditLogMiddleware>();
app.UseMiddleware<ProductionReadFallbackMiddleware>();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<RisChatHub>("/hubs/ris-chat");

app.Run();

static string[] GetCorsOrigins(IConfiguration configuration)
{
    var configuredOrigins = configuration.GetSection("CorsOrigins").Get<string[]>() ?? Array.Empty<string>();
    var inlineOrigins = configuration["CorsOriginsCsv"] ?? configuration["CORS_ORIGINS"] ?? configuration["AllowedOrigins"];
    var envOrigins = string.IsNullOrWhiteSpace(inlineOrigins)
        ? Array.Empty<string>()
        : inlineOrigins.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    var mergedOrigins = configuredOrigins
        .Concat(envOrigins)
        .Select(origin => origin.Trim())
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    return mergedOrigins.Length > 0 ? mergedOrigins : ["http://localhost:3000"];
}

// AUTHZ-2 #368: projection nhỏ cho check SecurityStamp trong OnTokenValidated (cache-able).
internal sealed class UserStampInfo
{
    public string? Stamp { get; set; }
    public bool IsActive { get; set; }
}
