namespace HIS.Infrastructure.Configuration;

/// <summary>
/// Configuration POCO for BHXH Gateway connection.
/// Bound to "BhxhGateway" section in appsettings.json.
/// </summary>
public class BhxhGatewayOptions
{
    public const string SectionName = "BhxhGateway";

    /// <summary>
    /// Base URL for BHXH gateway API. May vary by province.
    /// </summary>
    public string BaseUrl { get; set; } = "https://gdbhyt.baohiemxahoi.gov.vn";

    /// <summary>
    /// BHXH portal username (issued by provincial BHXH office).
    /// </summary>
    public string Username { get; set; } = "";

    /// <summary>
    /// BHXH portal password.
    /// </summary>
    public string Password { get; set; } = "";

    /// <summary>
    /// Ma CSKCB - Healthcare facility code.
    /// </summary>
    public string FacilityCode { get; set; } = "";

    /// <summary>
    /// HTTP request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Use mock client for development/testing. Default true until real credentials are configured.
    /// </summary>
    public bool UseMock { get; set; } = true;

    /// <summary>
    /// Number of retry attempts for transient failures.
    /// </summary>
    public int RetryCount { get; set; } = 3;

    /// <summary>
    /// Number of consecutive failures before circuit breaker opens.
    /// </summary>
    public int CircuitBreakerThreshold { get; set; } = 5;

    /// <summary>
    /// Duration in seconds the circuit breaker stays open.
    /// </summary>
    public int CircuitBreakerDurationSeconds { get; set; } = 30;
}
