namespace HIS.Infrastructure.Configuration;

/// <summary>
/// Strongly-typed configuration for PKCS#11 digital signature infrastructure.
/// Bound to the "DigitalSignature" section in appsettings.json.
/// </summary>
public class Pkcs11Configuration
{
    /// <summary>Session timeout in minutes before requiring PIN re-entry. Default: 30</summary>
    public int SessionTimeoutMinutes { get; set; } = 30;

    /// <summary>Grace period in seconds after token removal before invalidating session. Default: 60</summary>
    public int TokenRemovalGraceSeconds { get; set; } = 60;

    /// <summary>Maximum documents per batch signing operation. Default: 50</summary>
    public int MaxBatchSize { get; set; } = 50;

    /// <summary>Default hash algorithm for signatures. Default: SHA-256</summary>
    public string DefaultHashAlgorithm { get; set; } = "SHA-256";

    /// <summary>TSA (Timestamp Authority) server URLs, tried in order as fallback chain</summary>
    public List<string> TsaUrls { get; set; } = new()
    {
        "http://timestamp.digicert.com",
        "http://rfc3161.ai.moda",
        "http://timestamp.sectigo.com"
    };

    /// <summary>Enable OCSP revocation checking</summary>
    public bool EnableOcsp { get; set; } = true;

    /// <summary>Enable CRL revocation checking</summary>
    public bool EnableCrl { get; set; } = true;

    /// <summary>Vietnamese CA provider configurations keyed by provider name</summary>
    public Dictionary<string, CaProviderConfig> CaProviders { get; set; } = new();

    /// <summary>Signature visual appearance settings for PDF stamps</summary>
    public SignatureAppearanceConfig SignatureAppearance { get; set; } = new();
}

/// <summary>Configuration for a single CA provider's PKCS#11 library</summary>
public class CaProviderConfig
{
    /// <summary>Full path to the PKCS#11 DLL (e.g., C:\Windows\System32\eTPKCS11.dll)</summary>
    public string Pkcs11LibraryPath { get; set; } = string.Empty;

    /// <summary>Display label for this CA provider</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Human-readable description</summary>
    public string Description { get; set; } = string.Empty;
}

/// <summary>Visual appearance settings for the PDF signature stamp</summary>
public class SignatureAppearanceConfig
{
    /// <summary>Position on the page: "bottom-right", "bottom-left", "top-right", "top-left"</summary>
    public string PagePosition { get; set; } = "bottom-right";

    /// <summary>Stamp width in points</summary>
    public int Width { get; set; } = 200;

    /// <summary>Stamp height in points</summary>
    public int Height { get; set; } = 80;

    /// <summary>Font size in points</summary>
    public int FontSize { get; set; } = 8;

    /// <summary>Show signer name in stamp</summary>
    public bool ShowSignerName { get; set; } = true;

    /// <summary>Show signing date/time in stamp</summary>
    public bool ShowDateTime { get; set; } = true;

    /// <summary>Show certificate serial number in stamp</summary>
    public bool ShowCertificateSerial { get; set; } = true;

    /// <summary>Show CA provider logo in stamp</summary>
    public bool ShowCALogo { get; set; } = true;
}
