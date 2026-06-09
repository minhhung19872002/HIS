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
using HIS.API.Middleware;
using HIS.API.Hubs;

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
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

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

            if (!string.IsNullOrEmpty(accessToken) && (isHubRequest || isPrintRequest))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
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

// Request metrics middleware (before auth so it captures all requests)
app.UseMiddleware<RequestMetricsMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

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
