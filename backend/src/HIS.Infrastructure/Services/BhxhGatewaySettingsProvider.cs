using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Merges the runtime BHXH configuration saved by the admin screen (SystemConfig keys with the
/// "BHXH." prefix — see <see cref="BhxhConfigService"/>) over the appsettings/env section
/// "BhxhGateway". Until this existed the two were disconnected: credentials entered in the admin
/// screen were stored but never read, so every card lookup silently stayed on mock data.
///
/// A real call needs username + password + ma CSKCB together; anything missing keeps the gateway
/// on mock so reception is never shown fabricated card data as if it came from BHXH.
///
/// Scoped — the SystemConfig read is memoised for the lifetime of one request.
/// </summary>
public class BhxhGatewaySettingsProvider : IBhxhGatewaySettingsProvider
{
    private static readonly string[] ConfigKeys =
    {
        "BHXH.GatewayUrl",
        "BHXH.TokenUrl",
        "BHXH.Username",
        "BHXH.Password",
        "BHXH.MaCSKCB",
        "BHXH.Timeout",
        "BHXH.Environment",
    };

    private readonly HISDbContext _db;
    private readonly BhxhGatewayOptions _options;
    private BhxhGatewaySettings? _cached;

    public BhxhGatewaySettingsProvider(HISDbContext db, IOptions<BhxhGatewayOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public async Task<BhxhGatewaySettings> GetAsync(CancellationToken ct = default)
    {
        if (_cached != null) return _cached;

        var stored = await LoadStoredConfigAsync(ct);

        var username = Pick(stored, "BHXH.Username", _options.Username);
        var password = Pick(stored, "BHXH.Password", _options.Password);
        var facilityCode = Pick(stored, "BHXH.MaCSKCB", _options.FacilityCode);

        var credentialsComplete = !string.IsNullOrWhiteSpace(username)
            && !string.IsNullOrWhiteSpace(password)
            && !string.IsNullOrWhiteSpace(facilityCode);

        // Either switch can ask for live calls: the admin screen's "production" environment,
        // or BhxhGateway__UseMock=false in the deployment environment.
        var wantsLiveGateway = !_options.UseMock
            || string.Equals(stored.GetValueOrDefault("BHXH.Environment"), "production", StringComparison.OrdinalIgnoreCase);

        _cached = new BhxhGatewaySettings
        {
            BaseUrl = Pick(stored, "BHXH.GatewayUrl", _options.BaseUrl),
            TokenUrl = Pick(stored, "BHXH.TokenUrl", string.Empty) is { Length: > 0 } tokenUrl ? tokenUrl : null,
            Username = username,
            Password = password,
            FacilityCode = facilityCode,
            TimeoutSeconds = int.TryParse(stored.GetValueOrDefault("BHXH.Timeout"), out var timeout) && timeout > 0
                ? timeout
                : _options.TimeoutSeconds,
            UseMock = !(wantsLiveGateway && credentialsComplete),
            Source = string.IsNullOrWhiteSpace(stored.GetValueOrDefault("BHXH.Username")) ? "AppSettings" : "SystemConfig",
        };
        return _cached;
    }

    private async Task<Dictionary<string, string>> LoadStoredConfigAsync(CancellationToken ct)
    {
        try
        {
            var entries = await _db.Set<SystemConfig>()
                .Where(c => ConfigKeys.Contains(c.ConfigKey))
                .Select(c => new { c.ConfigKey, c.ConfigValue })
                .ToListAsync(ct);
            return entries.ToDictionary(e => e.ConfigKey, e => e.ConfigValue);
        }
        catch (Exception)
        {
            // SystemConfig not reachable yet (fresh database, migration still running) —
            // fall back to appsettings rather than failing the whole lookup.
            return new Dictionary<string, string>();
        }
    }

    private static string Pick(IReadOnlyDictionary<string, string> stored, string key, string fallback)
    {
        var value = stored.GetValueOrDefault(key);
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
