using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Workers;

/// <summary>
/// #371 AUTHZ-5 inc-6: lưu trữ lạnh AuditLogs vào Cloudflare R2 (cold storage ≥10 năm per NĐ 13/2023).
///
/// Chạy mỗi <AuditArchive:IntervalHours> (mặc định 24h). BẬT bằng AuditArchive:Enabled=true
/// + cấu hình R2 (R2BaseUrl / R2AccessKeyId / R2SecretAccessKey / R2BucketName) — mặc định TẮT.
///
/// Policy archive:
///   DATA / WORKFLOW / ADMIN / SECURITY: archive sau <ArchiveAfterDays> (mặc định 548 = 18 tháng)
///   → upload NDJSON batch lên R2 key: audit/{yyyy}/{MM}/{dd}/{yyyyMMddHHmmss}-{guid}.ndjson
///   → xóa batch khỏi hot DB sau khi upload thành công (bypass trigger via CONTEXT_INFO 'RETE').
///   AUTH / ACCESS: KHÔNG archive ở đây (AuditRetentionWorker đã xóa theo TTL).
///
/// Upload via S3-compatible PUT (Cloudflare R2) với AWS Signature V4 — không cần AWSSDK.
/// Batch TOP(<BatchSize>) để tránh lock escalation và giữ payload nhỏ.
/// Dùng CONTEXT_INFO 'RETE' (0x52455445) để bypass trigger trg_AuditLogs_NoDelete — cùng token với AuditRetentionWorker.
/// </summary>
public sealed class AuditArchiveWorker : BackgroundService
{
    // Action values deleted by AuditRetentionWorker — skip archiving them (they expire on their own).
    private static readonly string[] RetentionManagedActions =
    [
        "Login", "Logout", "RefreshToken", "PasswordChange", "FailedLogin", "Lockout", // AUTH
        "View", "Export", "Print", "Search"                                              // ACCESS
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditArchiveWorker> _logger;
    private readonly IHttpClientFactory _httpFactory;
    private readonly bool _enabled;
    private readonly int _archiveAfterDays;
    private readonly int _batchSize;
    private readonly TimeSpan _interval;
    private readonly string _r2BaseUrl;
    private readonly string _r2AccessKeyId;
    private readonly string _r2SecretAccessKey;
    private readonly string _r2BucketName;
    private readonly string _r2Region;

    // CONTEXT_INFO bypass — reuse same token as AuditRetentionWorker.
    // trigger trg_AuditLogs_NoDelete checks LEFT(CONTEXT_INFO(), 4) = 0x52455445 ('RETE').
    private const string CtxInfoSet = "SET CONTEXT_INFO 0x52455445";
    private const string CtxInfoReset = "SET CONTEXT_INFO 0x0";

    public AuditArchiveWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        ILogger<AuditArchiveWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _httpFactory = httpFactory;

        _enabled = config.GetValue<bool>("AuditArchive:Enabled", false);
        _archiveAfterDays = config.GetValue<int>("AuditArchive:ArchiveAfterDays", 548);
        _batchSize = config.GetValue<int>("AuditArchive:BatchSize", 2000);
        _interval = TimeSpan.FromHours(config.GetValue<int>("AuditArchive:IntervalHours", 24));
        _r2BaseUrl = config.GetValue<string>("AuditArchive:R2BaseUrl") ?? string.Empty;
        _r2AccessKeyId = config.GetValue<string>("AuditArchive:R2AccessKeyId") ?? string.Empty;
        _r2SecretAccessKey = config.GetValue<string>("AuditArchive:R2SecretAccessKey") ?? string.Empty;
        _r2BucketName = config.GetValue<string>("AuditArchive:R2BucketName") ?? string.Empty;
        _r2Region = config.GetValue<string>("AuditArchive:R2Region") ?? "auto";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("AuditArchiveWorker disabled (AuditArchive:Enabled=false)");
            return;
        }

        if (string.IsNullOrEmpty(_r2BaseUrl) || string.IsNullOrEmpty(_r2AccessKeyId) ||
            string.IsNullOrEmpty(_r2SecretAccessKey) || string.IsNullOrEmpty(_r2BucketName))
        {
            _logger.LogWarning(
                "AuditArchiveWorker: R2 credentials not configured — " +
                "set AuditArchive:R2BaseUrl/R2AccessKeyId/R2SecretAccessKey/R2BucketName. Worker exits.");
            return;
        }

        _logger.LogInformation(
            "AuditArchiveWorker started — archiveAfter={Days}d, batch={Batch}, interval={Hours}h, bucket={Bucket}",
            _archiveAfterDays, _batchSize, (int)_interval.TotalHours, _r2BucketName);

        // Delay 15 phút sau startup để tránh contention với các worker khác.
        try { await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RunArchiveAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AuditArchiveWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task RunArchiveAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var cutoff = DateTime.UtcNow.AddDays(-_archiveAfterDays);
        var now = DateTime.UtcNow;
        int totalArchived = 0;

        int archived;
        do
        {
            archived = await ArchiveBatchAsync(db, cutoff, now, ct);
            totalArchived += archived;
        }
        while (archived == _batchSize && !ct.IsCancellationRequested);

        if (totalArchived > 0)
            _logger.LogInformation(
                "AuditArchive: archived {Count} entries (cutoff={Cutoff:yyyy-MM-dd})",
                totalArchived, cutoff);
    }

    private async Task<int> ArchiveBatchAsync(
        HISDbContext db, DateTime cutoff, DateTime runTime, CancellationToken ct)
    {
        // 1. Lấy batch từ hot DB — archive DATA/WORKFLOW/ADMIN/SECURITY.
        var rows = await db.AuditLogs
            .Where(a => a.Timestamp < cutoff && !RetentionManagedActions.Contains(a.Action))
            .OrderBy(a => a.Timestamp)
            .Take(_batchSize)
            .AsNoTracking()
            .ToListAsync(ct);

        if (rows.Count == 0) return 0;

        // 2. Serialize sang NDJSON.
        var sb = new StringBuilder();
        foreach (var row in rows)
            sb.AppendLine(JsonSerializer.Serialize(row));
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());

        // 3. Upload lên R2 — phải thành công trước khi xóa khỏi hot DB.
        var key = $"audit/{runTime:yyyy}/{runTime:MM}/{runTime:dd}/"
                  + $"{runTime:yyyyMMddHHmmss}-{Guid.NewGuid():N}.ndjson";
        await UploadToR2Async(key, bytes, ct);

        // 4. Xóa đúng các row đã upload khỏi hot DB (bypass trigger via CONTEXT_INFO 'RETE').
        // Dùng GUID literal trong raw SQL để không phụ thuộc tham số (tránh kết nối khác nhau
        // giữa SET CONTEXT_INFO và DELETE). GUIDs là hằng nội bộ — không có SQL injection risk.
        var ids = rows.Select(r => r.Id).ToList();
        await db.Database.ExecuteSqlRawAsync(CtxInfoSet, cancellationToken: ct);
        try
        {
            const int chunkSize = 500; // 500 × 38 chars/GUID ≈ 19 KB — an toàn với SQL Server
            int deleted = 0;
            for (int i = 0; i < ids.Count; i += chunkSize)
            {
                if (ct.IsCancellationRequested) break;
                var inClause = string.Join(", ", ids.Skip(i).Take(chunkSize).Select(id => $"'{id:D}'"));
                deleted += await db.Database.ExecuteSqlRawAsync(
                    $"DELETE FROM dbo.AuditLogs WHERE Id IN ({inClause})",
                    cancellationToken: ct);
            }
            return deleted;
        }
        finally
        {
            try { await db.Database.ExecuteSqlRawAsync(CtxInfoReset, cancellationToken: CancellationToken.None); }
            catch { /* best-effort */ }
        }
    }

    private async Task UploadToR2Async(string key, byte[] payload, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var dateStamp = now.ToString("yyyyMMdd");
        var amzDate = now.ToString("yyyyMMddTHHmmssZ");
        var payloadHash = R2Signer.HexSha256(payload);
        var host = new Uri(_r2BaseUrl).Host;
        var url = $"{_r2BaseUrl.TrimEnd('/')}/{_r2BucketName}/{key}";

        var canonicalHeaders =
            $"content-type:application/x-ndjson\n" +
            $"host:{host}\n" +
            $"x-amz-content-sha256:{payloadHash}\n" +
            $"x-amz-date:{amzDate}\n";
        var signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
        var canonicalRequest =
            $"PUT\n/{_r2BucketName}/{key}\n\n{canonicalHeaders}\n{signedHeaders}\n{payloadHash}";

        var credentialScope = $"{dateStamp}/{_r2Region}/s3/aws4_request";
        var stringToSign =
            $"AWS4-HMAC-SHA256\n{amzDate}\n{credentialScope}\n" +
            R2Signer.HexSha256(Encoding.UTF8.GetBytes(canonicalRequest));

        var signingKey = R2Signer.GetSigningKey(_r2SecretAccessKey, dateStamp, _r2Region, "s3");
        var signature = R2Signer.HexHmac(signingKey, stringToSign);
        var authHeader =
            $"AWS4-HMAC-SHA256 Credential={_r2AccessKeyId}/{credentialScope}, " +
            $"SignedHeaders={signedHeaders}, Signature={signature}";

        using var http = _httpFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Put, url);
        request.Content = new ByteArrayContent(payload);
        request.Content.Headers.ContentType = new("application/x-ndjson");
        request.Headers.Add("x-amz-date", amzDate);
        request.Headers.Add("x-amz-content-sha256", payloadHash);
        request.Headers.Authorization = System.Net.Http.Headers.AuthenticationHeaderValue.Parse(authHeader);

        var resp = await http.SendAsync(request, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"R2 PUT failed {(int)resp.StatusCode}: {body[..Math.Min(200, body.Length)]}");
        }
    }
}

/// <summary>Minimal AWS Signature V4 helpers for S3-compatible PUT (no AWSSDK dependency).</summary>
internal static class R2Signer
{
    internal static string HexSha256(byte[] data)
    {
        var hash = SHA256.HashData(data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    internal static string HexSha256(string text) => HexSha256(Encoding.UTF8.GetBytes(text));

    internal static string HexHmac(byte[] key, string data)
    {
        var hash = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    internal static byte[] GetSigningKey(string secretKey, string dateStamp, string region, string service)
    {
        var kDate = HMACSHA256.HashData(Encoding.UTF8.GetBytes("AWS4" + secretKey), Encoding.UTF8.GetBytes(dateStamp));
        var kRegion = HMACSHA256.HashData(kDate, Encoding.UTF8.GetBytes(region));
        var kService = HMACSHA256.HashData(kRegion, Encoding.UTF8.GetBytes(service));
        return HMACSHA256.HashData(kService, "aws4_request"u8.ToArray());
    }
}
