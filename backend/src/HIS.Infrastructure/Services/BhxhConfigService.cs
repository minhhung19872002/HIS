using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.BhxhConfig;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Cấu hình BHXH Gateway + Test tools — N1.19 (tách khỏi BhxhConfigController #202 thin-controller).
/// Persist trong SystemConfig với prefix "BHXH.". Masked password khi trả về. Behavior-preserving:
/// mọi query/projection/response shape + message giữ nguyên; userId truyền từ controller (thay cho
/// GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// </summary>
public class BhxhConfigService : IBhxhConfigService
{
    private readonly HISDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    private readonly SystemConfigSecret _secret;
    public BhxhConfigService(HISDbContext db, IHttpClientFactory httpFactory, SystemConfigSecret secret)
    {
        _db = db;
        _httpFactory = httpFactory;
        _secret = secret;
    }

    private static readonly string[] Keys = new[]
    {
        "BHXH.GatewayUrl",
        "BHXH.TokenUrl",
        "BHXH.Username",
        "BHXH.Password",
        "BHXH.MaCSKCB",   // Mã cơ sở KCB
        "BHXH.MaDVI",     // Mã đơn vị
        "BHXH.Timeout",   // seconds
        "BHXH.Environment", // "sandbox" | "production"
    };


    public async Task<ServiceOutcome> GetAsync()
    {
        var entries = await _db.Set<SystemConfig>()
            .Where(c => Keys.Contains(c.ConfigKey))
            .ToListAsync();
        var dict = entries.ToDictionary(e => e.ConfigKey, e => e.ConfigValue);
        // Giải mã trước khi mask — nếu mask thẳng giá trị đã mã hoá thì "***" + 3 ký tự cuối
        // là đuôi ciphertext, người dùng không nhận ra mật khẩu của mình.
        var pwd = _secret.Reveal(dict.GetValueOrDefault("BHXH.Password"));
        return ServiceOutcome.Ok(new
        {
            gatewayUrl = dict.GetValueOrDefault("BHXH.GatewayUrl"),
            tokenUrl = dict.GetValueOrDefault("BHXH.TokenUrl"),
            username = dict.GetValueOrDefault("BHXH.Username"),
            passwordMasked = string.IsNullOrEmpty(pwd) ? null : "***" + (pwd.Length > 3 ? pwd[^3..] : ""),
            hasPassword = !string.IsNullOrEmpty(pwd),
            maCSKCB = dict.GetValueOrDefault("BHXH.MaCSKCB"),
            maDVI = dict.GetValueOrDefault("BHXH.MaDVI"),
            timeout = int.TryParse(dict.GetValueOrDefault("BHXH.Timeout"), out var t) ? t : 30,
            environment = dict.GetValueOrDefault("BHXH.Environment") ?? "sandbox",
        });
    }

    public async Task<ServiceOutcome> SaveAsync(BhxhConfigDto dto, Guid userId)
    {
        var now = DateTime.Now;
        var uid = userId.ToString();

        async Task Upsert(string key, string? value, string? desc = null)
        {
            if (value == null) return;
            var existing = await _db.Set<SystemConfig>().FirstOrDefaultAsync(c => c.ConfigKey == key);
            if (existing == null)
            {
                _db.Set<SystemConfig>().Add(new SystemConfig
                {
                    Id = Guid.NewGuid(),
                    ConfigKey = key,
                    ConfigValue = value,
                    ConfigType = key == "BHXH.Timeout" ? "Number" : "String",
                    Description = desc,
                    IsActive = true,
                    CreatedAt = now,
                    CreatedBy = uid,
                });
            }
            else
            {
                existing.ConfigValue = value;
                existing.UpdatedAt = now;
                existing.UpdatedBy = uid;
            }
        }

        await Upsert("BHXH.GatewayUrl", dto.GatewayUrl);
        await Upsert("BHXH.TokenUrl", dto.TokenUrl);
        await Upsert("BHXH.Username", dto.Username);
        // Only update password if provided + non-empty. Mật khẩu cổng BHXH lưu dạng mã hoá:
        // dump DB hoặc người có quyền đọc bảng SystemConfig không lấy được credential dùng được.
        if (!string.IsNullOrEmpty(dto.Password)) await Upsert("BHXH.Password", _secret.Protect(dto.Password));
        await Upsert("BHXH.MaCSKCB", dto.MaCSKCB);
        await Upsert("BHXH.MaDVI", dto.MaDVI);
        await Upsert("BHXH.Timeout", dto.Timeout.ToString());
        await Upsert("BHXH.Environment", dto.Environment ?? "sandbox");

        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    /// <summary>Test ping GatewayUrl — không cần auth với BHXH, chỉ kiểm tra reachable.</summary>
    public async Task<ServiceOutcome> TestConnectionAsync()
    {
        var cfg = await LoadDictAsync();
        var url = cfg.GetValueOrDefault("BHXH.GatewayUrl");
        if (string.IsNullOrWhiteSpace(url))
            return ServiceOutcome.Bad("Chưa cấu hình GatewayUrl");

        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(int.TryParse(cfg.GetValueOrDefault("BHXH.Timeout"), out var t) ? t : 30);

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var resp = await client.GetAsync(url);
            sw.Stop();
            return ServiceOutcome.Ok(new
            {
                reachable = true,
                statusCode = (int)resp.StatusCode,
                status = resp.StatusCode.ToString(),
                latencyMs = sw.ElapsedMilliseconds,
            });
        }
        catch (Exception ex)
        {
            return ServiceOutcome.Ok(new { reachable = false, error = ex.Message });
        }
    }

    /// <summary>Test authenticate — lấy access_token từ TokenUrl.</summary>
    public async Task<ServiceOutcome> TestAuthAsync()
    {
        var cfg = await LoadDictAsync();
        var tokenUrl = cfg.GetValueOrDefault("BHXH.TokenUrl");
        var username = cfg.GetValueOrDefault("BHXH.Username");
        var password = _secret.Reveal(cfg.GetValueOrDefault("BHXH.Password"));
        if (string.IsNullOrWhiteSpace(tokenUrl) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return ServiceOutcome.Bad("Chưa cấu hình đầy đủ TokenUrl / Username / Password");

        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(int.TryParse(cfg.GetValueOrDefault("BHXH.Timeout"), out var t) ? t : 30);

        try
        {
            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["username"] = username,
                ["password"] = password,
                ["grant_type"] = "password",
            });
            var resp = await client.PostAsync(tokenUrl, form);
            var body = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                return ServiceOutcome.Ok(new { authenticated = false, statusCode = (int)resp.StatusCode, body });
            }
            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(body);
                var token = json.TryGetProperty("access_token", out var at) ? at.GetString() : null;
                return ServiceOutcome.Ok(new
                {
                    authenticated = !string.IsNullOrEmpty(token),
                    tokenMasked = token != null ? token[..Math.Min(12, token.Length)] + "..." : null,
                    statusCode = (int)resp.StatusCode,
                });
            }
            catch
            {
                return ServiceOutcome.Ok(new { authenticated = false, statusCode = (int)resp.StatusCode, body });
            }
        }
        catch (Exception ex)
        {
            return ServiceOutcome.Ok(new { authenticated = false, error = ex.Message });
        }
    }


    /// <summary>Test submit XML thô tới gateway — dry-run.</summary>
    public async Task<ServiceOutcome> TestSubmitXmlAsync(TestSubmitXmlDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Xml))
            return ServiceOutcome.Bad("Chưa nhập XML");
        var cfg = await LoadDictAsync();
        var baseUrl = cfg.GetValueOrDefault("BHXH.GatewayUrl");
        if (string.IsNullOrWhiteSpace(baseUrl))
            return ServiceOutcome.Bad("Chưa cấu hình GatewayUrl");

        var url = string.IsNullOrWhiteSpace(dto.Endpoint) ? baseUrl : baseUrl.TrimEnd('/') + "/" + dto.Endpoint.TrimStart('/');

        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(int.TryParse(cfg.GetValueOrDefault("BHXH.Timeout"), out var t) ? t : 30);

        try
        {
            var content = new StringContent(dto.Xml, Encoding.UTF8, "application/xml");
            var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var sw = System.Diagnostics.Stopwatch.StartNew();
            var resp = await client.SendAsync(req);
            sw.Stop();
            var body = await resp.Content.ReadAsStringAsync();
            return ServiceOutcome.Ok(new
            {
                statusCode = (int)resp.StatusCode,
                latencyMs = sw.ElapsedMilliseconds,
                success = resp.IsSuccessStatusCode,
                body = body.Length > 4000 ? body[..4000] + "…" : body,
            });
        }
        catch (Exception ex)
        {
            return ServiceOutcome.Ok(new { success = false, error = ex.Message });
        }
    }

    private async Task<Dictionary<string, string>> LoadDictAsync()
    {
        var entries = await _db.Set<SystemConfig>()
            .Where(c => Keys.Contains(c.ConfigKey))
            .ToListAsync();
        return entries.ToDictionary(e => e.ConfigKey, e => e.ConfigValue);
    }
}
