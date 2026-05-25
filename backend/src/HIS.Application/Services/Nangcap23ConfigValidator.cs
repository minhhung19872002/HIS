using HIS.Application.DTOs.NangCap23;

namespace HIS.Application.Services;

/// <summary>
/// Validate config DTO trước khi persist. Chặn SSRF qua hostname allowlist +
/// chống admin set BaseUrl tới internal/metadata endpoint.
/// </summary>
public static class Nangcap23ConfigValidator
{
    /// <summary>
    /// Hostname được phép cho cổng QG / Đề án 06 / Zalo. Subdomain allowed qua wildcard match.
    /// Production cố định — admin KHÔNG được mở rộng qua UI để tránh attack vector.
    /// </summary>
    private static readonly string[] AllowedHostSuffixes = new[]
    {
        "donthuocquocgia.vn",
        "duocquocgia.com.vn",
        "baohiemxahoi.gov.vn",
        "zalo.me",
        // sandbox subdomain — match qua wildcard *.donthuocquocgia.vn nếu cổng QG dùng subdomain
        "sandbox.donthuocquocgia.vn",
        "sandbox.duocquocgia.com.vn",
    };

    /// <summary>
    /// Med-New-2: chỉ cho phép localhost khi env=Development.
    /// Production / Staging set ASPNETCORE_ENVIRONMENT khác Development → localhost bị reject.
    /// </summary>
    private static bool LocalhostAllowedInThisEnvironment =>
        string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Development", StringComparison.OrdinalIgnoreCase);

    public static void ValidateNationalGateway(NationalGatewayConfigDto dto)
    {
        if (dto == null) throw new ArgumentNullException(nameof(dto));
        EnsureSafeUrl(dto.NationalPrescriptionBaseUrl, nameof(dto.NationalPrescriptionBaseUrl));
        EnsureSafeUrl(dto.NationalPharmacyBaseUrl, nameof(dto.NationalPharmacyBaseUrl));
        if (dto.RetryCount is < 1 or > 10)
            throw new ArgumentException("RetryCount phải nằm trong khoảng 1..10.", nameof(dto.RetryCount));
        if (dto.TimeoutSeconds is < 1 or > 120)
            throw new ArgumentException("TimeoutSeconds phải nằm trong khoảng 1..120.", nameof(dto.TimeoutSeconds));
        if (string.IsNullOrWhiteSpace(dto.FacilityCode) || dto.FacilityCode.Length > 50)
            throw new ArgumentException("FacilityCode phải 1..50 ký tự.", nameof(dto.FacilityCode));
    }

    public static void ValidateZalo(ZaloConfigDto dto)
    {
        if (dto == null) throw new ArgumentNullException(nameof(dto));
        EnsureSafeUrl(dto.BaseUrl, nameof(dto.BaseUrl));
        if (!string.IsNullOrWhiteSpace(dto.OaId) && dto.OaId.Length > 50)
            throw new ArgumentException("OaId không hợp lệ.", nameof(dto.OaId));
        // AccessToken — không validate format chi tiết (do Zalo có thể đổi), chỉ check length
        if (!string.IsNullOrEmpty(dto.AccessToken) && dto.AccessToken != "***" && dto.AccessToken.Length > 1000)
            throw new ArgumentException("AccessToken quá dài.", nameof(dto.AccessToken));
    }

    /// <summary>
    /// Yêu cầu URL: scheme http/https, hostname thuộc allowlist, không phải IP private.
    /// Block IPv4 link-local (169.254.0.0/16 — AWS/GCP metadata), loopback (127.0.0.0/8),
    /// private RFC 1918 (10/8, 172.16/12, 192.168/16) trừ localhost cho dev.
    /// </summary>
    public static void EnsureSafeUrl(string? url, string paramName)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("URL không được rỗng.", paramName);
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new ArgumentException("URL không hợp lệ.", paramName);
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            throw new ArgumentException("Chỉ chấp nhận scheme http/https.", paramName);

        var host = uri.Host.ToLowerInvariant();

        // localhost / loopback — chỉ Development env mới cho phép
        if (host == "localhost" || host == "127.0.0.1" || host == "::1")
        {
            if (LocalhostAllowedInThisEnvironment) return;
            throw new ArgumentException(
                "Hostname localhost chỉ được phép trong môi trường Development. " +
                "Staging/Production phải dùng hostname thật của cổng QG.", paramName);
        }

        // Block IP literal (không qua DNS allowlist)
        if (System.Net.IPAddress.TryParse(host, out _))
            throw new ArgumentException(
                "Không được trỏ trực tiếp tới IP. Phải dùng hostname trong danh sách cho phép.",
                paramName);

        // Hostname allowlist (suffix match)
        var allowed = AllowedHostSuffixes.Any(s =>
            host.Equals(s, StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith("." + s, StringComparison.OrdinalIgnoreCase));
        if (!allowed)
            throw new ArgumentException(
                $"Hostname '{host}' không thuộc danh sách cho phép. " +
                "Liên hệ admin nếu cần mở rộng allowlist.", paramName);
    }
}
