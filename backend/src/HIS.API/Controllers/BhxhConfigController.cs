using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Cấu hình BHXH Gateway + Test tools — N1.19.
/// Persist trong SystemConfig với prefix "BHXH.". Masked password khi trả về.
/// </summary>
[ApiController]
[Route("api/bhxh-config")]
[Authorize]
public class BhxhConfigController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    public BhxhConfigController(HISDbContext db, IHttpClientFactory httpFactory)
    {
        _db = db;
        _httpFactory = httpFactory;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

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

    public class BhxhConfigDto
    {
        public string? GatewayUrl { get; set; }
        public string? TokenUrl { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string? MaCSKCB { get; set; }
        public string? MaDVI { get; set; }
        public int Timeout { get; set; } = 30;
        public string? Environment { get; set; } = "sandbox";
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Accountant,InsuranceManager")]
    public async Task<IActionResult> Get()
    {
        var entries = await _db.Set<SystemConfig>()
            .Where(c => Keys.Contains(c.ConfigKey))
            .ToListAsync();
        var dict = entries.ToDictionary(e => e.ConfigKey, e => e.ConfigValue);
        var pwd = dict.GetValueOrDefault("BHXH.Password") ?? string.Empty;
        return Ok(new
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

    [HttpPost]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<IActionResult> Save([FromBody] BhxhConfigDto dto)
    {
        var now = DateTime.Now;
        var uid = GetUserId().ToString();

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
        // Only update password if provided + non-empty
        if (!string.IsNullOrEmpty(dto.Password)) await Upsert("BHXH.Password", dto.Password);
        await Upsert("BHXH.MaCSKCB", dto.MaCSKCB);
        await Upsert("BHXH.MaDVI", dto.MaDVI);
        await Upsert("BHXH.Timeout", dto.Timeout.ToString());
        await Upsert("BHXH.Environment", dto.Environment ?? "sandbox");

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>Test ping GatewayUrl — không cần auth với BHXH, chỉ kiểm tra reachable.</summary>
    [HttpPost("test-connection")]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<IActionResult> TestConnection()
    {
        var cfg = await LoadDictAsync();
        var url = cfg.GetValueOrDefault("BHXH.GatewayUrl");
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new { message = "Chưa cấu hình GatewayUrl" });

        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(int.TryParse(cfg.GetValueOrDefault("BHXH.Timeout"), out var t) ? t : 30);

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var resp = await client.GetAsync(url);
            sw.Stop();
            return Ok(new
            {
                reachable = true,
                statusCode = (int)resp.StatusCode,
                status = resp.StatusCode.ToString(),
                latencyMs = sw.ElapsedMilliseconds,
            });
        }
        catch (Exception ex)
        {
            return Ok(new { reachable = false, error = ex.Message });
        }
    }

    /// <summary>Test authenticate — lấy access_token từ TokenUrl.</summary>
    [HttpPost("test-auth")]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<IActionResult> TestAuth()
    {
        var cfg = await LoadDictAsync();
        var tokenUrl = cfg.GetValueOrDefault("BHXH.TokenUrl");
        var username = cfg.GetValueOrDefault("BHXH.Username");
        var password = cfg.GetValueOrDefault("BHXH.Password");
        if (string.IsNullOrWhiteSpace(tokenUrl) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return BadRequest(new { message = "Chưa cấu hình đầy đủ TokenUrl / Username / Password" });

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
                return Ok(new { authenticated = false, statusCode = (int)resp.StatusCode, body });
            }
            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(body);
                var token = json.TryGetProperty("access_token", out var at) ? at.GetString() : null;
                return Ok(new
                {
                    authenticated = !string.IsNullOrEmpty(token),
                    tokenMasked = token != null ? token[..Math.Min(12, token.Length)] + "..." : null,
                    statusCode = (int)resp.StatusCode,
                });
            }
            catch
            {
                return Ok(new { authenticated = false, statusCode = (int)resp.StatusCode, body });
            }
        }
        catch (Exception ex)
        {
            return Ok(new { authenticated = false, error = ex.Message });
        }
    }

    public class TestSubmitXmlDto
    {
        public string Xml { get; set; } = string.Empty;
        public string? Endpoint { get; set; } // phần path vd "/api/bhxh/xml"
    }

    /// <summary>Test submit XML thô tới gateway — dry-run.</summary>
    [HttpPost("test-submit-xml")]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<IActionResult> TestSubmitXml([FromBody] TestSubmitXmlDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Xml))
            return BadRequest(new { message = "Chưa nhập XML" });
        var cfg = await LoadDictAsync();
        var baseUrl = cfg.GetValueOrDefault("BHXH.GatewayUrl");
        if (string.IsNullOrWhiteSpace(baseUrl))
            return BadRequest(new { message = "Chưa cấu hình GatewayUrl" });

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
            return Ok(new
            {
                statusCode = (int)resp.StatusCode,
                latencyMs = sw.ElapsedMilliseconds,
                success = resp.IsSuccessStatusCode,
                body = body.Length > 4000 ? body[..4000] + "…" : body,
            });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, error = ex.Message });
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
