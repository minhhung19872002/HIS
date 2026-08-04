namespace HIS.Application.Services;

/// <summary>
/// BHXH gateway settings actually in force for a call, after the runtime configuration
/// entered in the admin screen is merged over appsettings/environment variables.
/// </summary>
public class BhxhGatewaySettings
{
    public string BaseUrl { get; init; } = string.Empty;

    /// <summary>Separate token endpoint when the province issues one; otherwise BaseUrl + /api/token.</summary>
    public string? TokenUrl { get; init; }

    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;

    /// <summary>Ma CSKCB of this facility.</summary>
    public string FacilityCode { get; init; } = string.Empty;

    public int TimeoutSeconds { get; init; } = 30;

    /// <summary>True while the gateway returns simulated data instead of calling BHXH.</summary>
    public bool UseMock { get; init; } = true;

    /// <summary>"SystemConfig" when the admin screen supplied the credentials, otherwise "AppSettings".</summary>
    public string Source { get; init; } = "AppSettings";
}

/// <summary>
/// Resolves <see cref="BhxhGatewaySettings"/> at call time so credentials saved in the
/// "Cấu hình BHXH" admin screen take effect without a redeploy.
/// </summary>
public interface IBhxhGatewaySettingsProvider
{
    Task<BhxhGatewaySettings> GetAsync(CancellationToken ct = default);
}
