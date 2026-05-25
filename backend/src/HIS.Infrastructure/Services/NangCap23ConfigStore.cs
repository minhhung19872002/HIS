using System.Data;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Persist NangCap23 config vào <see cref="HISDbContext.SystemConfigs"/>.
///
/// Race-safety contract (Critical-NEW-1):
///   - UNIQUE filtered index <c>UX_SystemConfigs_ConfigKey_Active</c> (migration 45)
///     bảo đảm 1 ConfigKey chỉ có 1 row active. Concurrent INSERT vi phạm index
///     → SQL Server raise error 2601/2627.
///   - <see cref="SaveAsync"/> chạy trong Serializable transaction (range lock đầu SELECT
///     đến cuối INSERT) + retry tối đa 3 lần khi gặp UNIQUE violation. Trong trường hợp
///     2 instance Cloud Run race, instance thua sẽ retry, re-read và UPDATE thay vì INSERT.
///
/// Sensitive value (key chứa "Token", "ApiKey", "Password", "Secret") được encrypt
/// bằng <see cref="IDataProtectionProvider"/> (purpose <c>NangCap23.Config.v1</c>).
/// Data-protection keys persist qua <c>PersistKeysToDbContext&lt;HISDbContext&gt;</c>
/// (xem Program.cs:141) → mã hóa stable qua Cloud Run cold start.
/// </summary>
public sealed class NangCap23ConfigStore : INangCap23ConfigStore
{
    private const string DataProtectionPurpose = "NangCap23.Config.v1";
    private const string EncryptedPrefix = "ENC:";
    private const int MaxConflictRetries = 3;

    // Suffixes nhận diện key nhạy cảm — encrypt khi save, decrypt khi load
    private static readonly string[] SensitiveSuffixes = new[]
    {
        ".ApiKey", ".AccessToken", ".Password", ".Secret", ".Token", ".ClientSecret"
    };

    // Suffixes yêu cầu giá trị là số nguyên — validate trong SaveAsync (Med-New-5)
    private static readonly string[] IntegerSuffixes = new[]
    {
        ".RetryCount", ".TimeoutSeconds", ".CircuitBreakerThreshold", ".CircuitBreakerDurationSeconds"
    };

    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDataProtector _protector;
    private readonly ILogger<NangCap23ConfigStore> _logger;

    public NangCap23ConfigStore(
        HISDbContext db, IConfiguration config,
        IDataProtectionProvider dpp, ILogger<NangCap23ConfigStore> logger)
    {
        _db = db;
        _config = config;
        _protector = dpp.CreateProtector(DataProtectionPurpose);
        _logger = logger;
    }

    public bool IsSensitiveKey(string fullKey)
        => SensitiveSuffixes.Any(s => fullKey.EndsWith(s, StringComparison.OrdinalIgnoreCase));

    private static bool IsIntegerKey(string fullKey)
        => IntegerSuffixes.Any(s => fullKey.EndsWith(s, StringComparison.OrdinalIgnoreCase));

    public async Task<string?> GetOrFallbackAsync(string fullKey, string? fallback = null, CancellationToken ct = default)
    {
        // Memory-allocation note: project thẳng từ DB tránh full-entity tracking
        var raw = await _db.SystemConfigs.AsNoTracking()
            .Where(c => c.ConfigKey == fullKey && c.IsActive && !c.IsDeleted)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        // Row không tồn tại → fall back về appsettings/parameter (chưa bao giờ cấu hình)
        if (raw == null) return fallback ?? GetFromAppsettings(fullKey);

        var v = raw;
        if (IsSensitiveKey(fullKey) && v.StartsWith(EncryptedPrefix, StringComparison.Ordinal))
        {
            try
            {
                v = _protector.Unprotect(v[EncryptedPrefix.Length..]);
            }
            catch (System.Security.Cryptography.CryptographicException ex)
            {
                _logger.LogError(ex, "ConfigStore decrypt fail for {Key} — falling back to appsettings", fullKey);
                return fallback ?? GetFromAppsettings(fullKey);
            }
        }
        // Row tồn tại với value rỗng → admin đã EXPLICIT clear (Med-New-1).
        // KHÔNG fall back đến appsettings — respect admin's intent (disable feature).
        return v ?? string.Empty;
    }

    public async Task<bool> GetBoolAsync(string fullKey, bool fallback, CancellationToken ct = default)
    {
        var raw = await GetOrFallbackAsync(fullKey, null, ct);
        return bool.TryParse(raw, out var b) ? b : fallback;
    }

    public async Task<int> GetIntAsync(string fullKey, int fallback, CancellationToken ct = default)
    {
        var raw = await GetOrFallbackAsync(fullKey, null, ct);
        return int.TryParse(raw, out var i) ? i : fallback;
    }

    /// <summary>
    /// Race-safe upsert. Bao bọc trong Serializable transaction + retry-on-conflict.
    /// Concurrent save cùng key: instance A INSERT thắng → instance B catch UNIQUE
    /// violation, re-read và UPDATE thay vì INSERT. Idempotent.
    /// </summary>
    public async Task<int> SaveAsync(IDictionary<string, string?> keyValues, string? userId, CancellationToken ct = default)
    {
        if (keyValues == null || keyValues.Count == 0) return 0;

        // STEP 1: Validate type trước khi đụng DB (Med-New-5)
        foreach (var (key, val) in keyValues)
        {
            if (val == null) continue;
            if (IsIntegerKey(key) && !int.TryParse(val, out _))
                throw new ArgumentException(
                    $"Giá trị cho '{key}' phải là số nguyên (nhận được: '{val}').", nameof(keyValues));
        }

        // STEP 2: Encrypt sensitive value 1 lần — tránh encrypt lại khi retry (CPU + key rotation)
        var preparedValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, rawValue) in keyValues)
        {
            var value = rawValue ?? string.Empty;
            preparedValues[key] = IsSensitiveKey(key) && !string.IsNullOrEmpty(value)
                ? EncryptedPrefix + _protector.Protect(value)
                : value;
        }

        // STEP 3: Retry loop trên UNIQUE violation. Serializable isolation tránh phantom read
        // giữa SELECT existing và INSERT new. Nếu vẫn race (rất hiếm, 2 instance start tx
        // cùng lúc), instance thua sẽ catch UNIQUE và retry.
        for (int attempt = 1; attempt <= MaxConflictRetries; attempt++)
        {
            try
            {
                return await SaveAttemptAsync(preparedValues, keyValues, userId, ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex) && attempt < MaxConflictRetries)
            {
                _logger.LogWarning(
                    "ConfigStore UNIQUE violation (attempt {Attempt}/{Max}) — re-reading & retrying. Key count: {N}",
                    attempt, MaxConflictRetries, keyValues.Count);
                // Clear change-tracker — entities với same key đã được Add() ở attempt trước
                // sẽ gây "duplicate tracking" exception nếu re-read về cùng instance
                _db.ChangeTracker.Clear();
                await Task.Delay(TimeSpan.FromMilliseconds(50 * attempt), ct);
            }
        }
        // Không nên tới đây — exhausted retries
        throw new InvalidOperationException(
            $"Không lưu được config sau {MaxConflictRetries} lần thử do UNIQUE conflict liên tục.");
    }

    private async Task<int> SaveAttemptAsync(
        IReadOnlyDictionary<string, string> preparedValues,
        IDictionary<string, string?> originalKeyValues,
        string? userId,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var keys = preparedValues.Keys.ToArray();

        // Begin Serializable tx — SQL Server lấy range lock trên index UX_SystemConfigs_ConfigKey_Active
        // bảo đảm SELECT...INSERT atomic. Nếu instance B đang giữ lock, B sẽ wait.
        await using IDbContextTransaction tx = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, ct);
        try
        {
            // Truy vấn 1 lần lấy tất cả row hiện có cho các key cần save (tránh N+1)
            var existing = await _db.SystemConfigs
                .Where(c => keys.Contains(c.ConfigKey) && !c.IsDeleted)
                .ToListAsync(ct);
            var map = existing.ToDictionary(c => c.ConfigKey, StringComparer.OrdinalIgnoreCase);

            int affected = 0;
            foreach (var (key, storedValue) in preparedValues)
            {
                var configType = InferType(originalKeyValues[key] ?? string.Empty);
                if (map.TryGetValue(key, out var row))
                {
                    if (row.ConfigValue != storedValue || row.ConfigType != configType || !row.IsActive)
                    {
                        row.ConfigValue = storedValue;
                        row.ConfigType = configType;
                        row.IsActive = true;
                        row.UpdatedAt = now;
                        row.UpdatedBy = userId;
                        affected++;
                    }
                }
                else
                {
                    _db.SystemConfigs.Add(new SystemConfig
                    {
                        Id = Guid.NewGuid(),
                        ConfigKey = key,
                        ConfigValue = storedValue,
                        ConfigType = configType,
                        IsActive = true,
                        CreatedAt = now,
                        CreatedBy = userId,
                    });
                    affected++;
                }
            }

            if (affected > 0) await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return affected;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    private string? GetFromAppsettings(string fullKey)
    {
        const string p = "NangCap23.";
        var k = fullKey.StartsWith(p, StringComparison.Ordinal) ? fullKey[p.Length..] : fullKey;
        return _config[k.Replace('.', ':')];
    }

    private static string InferType(string value)
    {
        if (bool.TryParse(value, out _)) return "Boolean";
        if (int.TryParse(value, out _)) return "Number";
        if (value.StartsWith('{') || value.StartsWith('[')) return "JSON";
        return "String";
    }

    /// <summary>True khi DbUpdateException là do UNIQUE/PRIMARY constraint (SQL 2601/2627).</summary>
    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
}
