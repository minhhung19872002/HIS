using System.Collections.Concurrent;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using HIS.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Net.Pkcs11Interop.Common;
using Net.Pkcs11Interop.HighLevelAPI;
using Net.Pkcs11Interop.X509Store;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Manages PKCS#11 sessions for USB Token signing.
/// Singleton service with ConcurrentDictionary-based session caching.
/// Sessions expire after configurable timeout (default 30 min).
/// </summary>
public class Pkcs11SessionManager : IDisposable
{
    private readonly ILogger<Pkcs11SessionManager> _logger;
    private readonly Pkcs11Configuration _config;
    private readonly ConcurrentDictionary<string, Pkcs11SessionEntry> _sessions = new();
    private readonly Timer _cleanupTimer;

    public Pkcs11SessionManager(
        ILogger<Pkcs11SessionManager> logger,
        IOptions<Pkcs11Configuration> config)
    {
        _logger = logger;
        _config = config.Value;
        // Cleanup expired sessions every 60 seconds
        _cleanupTimer = new Timer(CleanupExpiredSessions, null, TimeSpan.FromSeconds(60), TimeSpan.FromSeconds(60));
    }

    /// <summary>
    /// Open a PKCS#11 session with PIN for the given user.
    /// Tries all configured CA provider DLLs until one works.
    /// </summary>
    public async Task<Pkcs11SessionEntry> OpenSessionAsync(string userId, string pin)
    {
        // Check if user already has an active session
        if (_sessions.TryGetValue(userId, out var existing) && existing.ExpiresAt > DateTime.UtcNow)
        {
            _logger.LogInformation("Reusing existing session for user {UserId}, expires at {ExpiresAt}", userId, existing.ExpiresAt);
            existing.ExpiresAt = DateTime.UtcNow.AddMinutes(_config.SessionTimeoutMinutes);
            return existing;
        }

        // Try each configured CA provider
        foreach (var (providerName, providerConfig) in _config.CaProviders)
        {
            if (string.IsNullOrEmpty(providerConfig.Pkcs11LibraryPath))
                continue;

            if (!File.Exists(providerConfig.Pkcs11LibraryPath))
            {
                _logger.LogDebug("PKCS#11 library not found at {Path} for {Provider}", providerConfig.Pkcs11LibraryPath, providerName);
                continue;
            }

            try
            {
                var entry = await TryOpenSessionWithProvider(userId, pin, providerName, providerConfig);
                if (entry != null)
                    return entry;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to open PKCS#11 session with {Provider}", providerName);
            }
        }

        throw new InvalidOperationException("Không tìm thấy USB Token. Vui lòng kiểm tra đã cắm USB Token và cài đặt driver.");
    }

    private Task<Pkcs11SessionEntry?> TryOpenSessionWithProvider(
        string userId, string pin, string providerName, CaProviderConfig providerConfig)
    {
        _logger.LogInformation("Trying PKCS#11 provider: {Provider} at {Path}", providerName, providerConfig.Pkcs11LibraryPath);

        var pinProvider = new FixedPinProvider(pin);
        var store = new Pkcs11X509Store(providerConfig.Pkcs11LibraryPath, pinProvider);
        var certs = store.Slots;

        foreach (var slot in certs)
        {
            if (slot.Token == null) continue;

            foreach (var cert in slot.Token.Certificates)
            {
                if (cert.Info?.ParsedCertificate == null) continue;

                var x509 = cert.Info.ParsedCertificate;

                // Check validity
                if (DateTime.Now < x509.NotBefore || DateTime.Now > x509.NotAfter)
                {
                    _logger.LogWarning("Certificate expired or not yet valid: {Subject}, Valid: {From} - {To}",
                        x509.Subject, x509.NotBefore, x509.NotAfter);
                    continue;
                }

                // Check for signing capability
                if (!x509.HasPrivateKey) continue;

                var tokenSerial = slot.Token.Info?.SerialNumber?.Trim() ?? "unknown";
                var tokenLabel = slot.Token.Info?.Label?.Trim() ?? "unknown";

                var entry = new Pkcs11SessionEntry
                {
                    UserId = userId,
                    Certificate = cert,
                    X509Certificate = x509,
                    Store = store,
                    CaProvider = providerName,
                    TokenSerial = tokenSerial,
                    TokenLabel = tokenLabel,
                    CertificateSubject = x509.Subject,
                    CertificateIssuer = x509.Issuer,
                    CertificateSerial = x509.SerialNumber,
                    CertificateValidFrom = x509.NotBefore,
                    CertificateValidTo = x509.NotAfter,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(_config.SessionTimeoutMinutes),
                    SigningSemaphore = new SemaphoreSlim(1, 1)
                };

                _sessions[userId] = entry;

                _logger.LogInformation(
                    "PKCS#11 session opened for user {UserId} with {Provider}, token {Serial}, cert {Subject}",
                    userId, providerName, tokenSerial, x509.Subject);

                return Task.FromResult<Pkcs11SessionEntry?>(entry);
            }
        }

        // No usable certificate found with this provider
        store.Dispose();
        return Task.FromResult<Pkcs11SessionEntry?>(null);
    }

    /// <summary>
    /// Get active session for user. Returns null if no session or expired.
    /// </summary>
    public Pkcs11SessionEntry? GetActiveSession(string userId)
    {
        if (_sessions.TryGetValue(userId, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
        {
            return entry;
        }
        return null;
    }

    /// <summary>
    /// Refresh session expiry (called after each successful sign operation).
    /// </summary>
    public void RefreshSession(string userId)
    {
        if (_sessions.TryGetValue(userId, out var entry))
        {
            entry.ExpiresAt = DateTime.UtcNow.AddMinutes(_config.SessionTimeoutMinutes);
        }
    }

    /// <summary>
    /// Close and invalidate session for user.
    /// </summary>
    public void InvalidateSession(string userId)
    {
        if (_sessions.TryRemove(userId, out var entry))
        {
            try
            {
                entry.Store?.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error disposing PKCS#11 store for user {UserId}", userId);
            }
            _logger.LogInformation("Session invalidated for user {UserId}", userId);
        }
    }

    /// <summary>
    /// Get all connected tokens (for admin/discovery).
    /// </summary>
    public List<(string Serial, string Label, string Provider)> GetAllTokens()
    {
        var tokens = new List<(string, string, string)>();

        foreach (var (providerName, providerConfig) in _config.CaProviders)
        {
            if (string.IsNullOrEmpty(providerConfig.Pkcs11LibraryPath) ||
                !File.Exists(providerConfig.Pkcs11LibraryPath))
                continue;

            try
            {
                var factory = new Pkcs11InteropFactories();
                var pkcs11Library = factory.Pkcs11LibraryFactory.LoadPkcs11Library(
                    factory, providerConfig.Pkcs11LibraryPath, AppType.MultiThreaded);

                try
                {
                    foreach (var slot in pkcs11Library.GetSlotList(SlotsType.WithTokenPresent))
                    {
                        var tokenInfo = slot.GetTokenInfo();
                        tokens.Add((
                            tokenInfo.SerialNumber?.Trim() ?? "unknown",
                            tokenInfo.Label?.Trim() ?? "unknown",
                            providerName
                        ));
                    }
                }
                finally
                {
                    pkcs11Library.Dispose();
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error enumerating tokens for {Provider}", providerName);
            }
        }

        return tokens;
    }

    private void CleanupExpiredSessions(object? state)
    {
        var now = DateTime.UtcNow;
        foreach (var (userId, entry) in _sessions)
        {
            if (entry.ExpiresAt < now)
            {
                InvalidateSession(userId);
            }
        }
    }

    public void Dispose()
    {
        _cleanupTimer?.Dispose();
        foreach (var (_, entry) in _sessions)
        {
            try { entry.Store?.Dispose(); } catch { }
        }
        _sessions.Clear();
    }
}

/// <summary>
/// Cached PKCS#11 session entry for a user.
/// </summary>
public class Pkcs11SessionEntry
{
    public string UserId { get; set; } = string.Empty;
    public Pkcs11X509Certificate Certificate { get; set; } = null!;
    public X509Certificate2 X509Certificate { get; set; } = null!;
    public Pkcs11X509Store Store { get; set; } = null!;
    public string CaProvider { get; set; } = string.Empty;
    public string TokenSerial { get; set; } = string.Empty;
    public string TokenLabel { get; set; } = string.Empty;
    public string CertificateSubject { get; set; } = string.Empty;
    public string CertificateIssuer { get; set; } = string.Empty;
    public string CertificateSerial { get; set; } = string.Empty;
    public DateTime CertificateValidFrom { get; set; }
    public DateTime CertificateValidTo { get; set; }
    public DateTime ExpiresAt { get; set; }
    public SemaphoreSlim SigningSemaphore { get; set; } = new(1, 1);
}

/// <summary>
/// Fixed PIN provider for Pkcs11Interop.X509Store.
/// Avoids Windows PIN dialog by providing PIN programmatically.
/// </summary>
public class FixedPinProvider : IPinProvider
{
    private readonly byte[] _pin;

    public FixedPinProvider(string pin)
    {
        // WINCA and most PKCS#11 tokens expect ASCII-encoded PIN.
        // UTF-8 is identical for ASCII characters but may differ for extended chars.
        // Try ASCII first; fall back to UTF-8 for non-ASCII PINs.
        _pin = pin.All(c => c < 128)
            ? System.Text.Encoding.ASCII.GetBytes(pin)
            : System.Text.Encoding.UTF8.GetBytes(pin);
    }

    public GetPinResult GetKeyPin(Pkcs11X509StoreInfo storeInfo, Pkcs11SlotInfo slotInfo,
        Pkcs11TokenInfo tokenInfo, Pkcs11X509CertificateInfo certificateInfo)
    {
        return new GetPinResult(false, _pin);
    }

    public GetPinResult GetTokenPin(Pkcs11X509StoreInfo storeInfo, Pkcs11SlotInfo slotInfo,
        Pkcs11TokenInfo tokenInfo)
    {
        return new GetPinResult(false, _pin);
    }
}
