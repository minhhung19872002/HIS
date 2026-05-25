namespace HIS.Application.Services;

/// <summary>
/// External gateway clients for NangCap23 — abstracted so the service layer can be unit-tested
/// without spinning up real HttpClient. DI binds the InMemory implementations when
/// <c>NationalGateway:MockMode=true</c> or <c>Zalo:MockMode=true</c>, otherwise the HTTP
/// implementations are bound (production default).
/// </summary>
public sealed class GatewaySubmissionResult
{
    public bool Acknowledged { get; init; }
    public string? TransactionId { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public string RawResponse { get; init; } = string.Empty;
}

/// <summary>Cổng Đơn thuốc Quốc Gia (donthuocquocgia.vn) — QĐ 808/QĐ-BYT 2022.</summary>
public interface INationalPrescriptionGatewayClient
{
    Task<GatewaySubmissionResult> SubmitAsync(string payloadJson, CancellationToken ct = default);
    Task<bool> PingAsync(CancellationToken ct = default);
}

/// <summary>Cổng Dược Quốc Gia (duocquocgia.com.vn) — CV 2406/QLD-Ttra 2018.</summary>
public interface INationalPharmacyGatewayClient
{
    Task<GatewaySubmissionResult> SubmitReportAsync(string payloadXml, string reportType, CancellationToken ct = default);
    Task<bool> PingAsync(CancellationToken ct = default);
}

/// <summary>Đề án 06 — cổng gdbhyt.baohiemxahoi.gov.vn cho GCS / GBT / KSK lái xe.</summary>
public interface IDeAn06GatewayClient
{
    Task<GatewaySubmissionResult> SubmitBirthCertificateAsync(string payloadJson, CancellationToken ct = default);
    Task<GatewaySubmissionResult> SubmitDeathCertificateAsync(string payloadJson, CancellationToken ct = default);
    Task<GatewaySubmissionResult> SubmitDrivingLicenseCheckAsync(string payloadJson, CancellationToken ct = default);
}

/// <summary>Zalo OA / ZNS — https://business.openapi.zalo.me/message/template</summary>
public interface IZaloOaClient
{
    Task<GatewaySubmissionResult> SendTemplateMessageAsync(string targetPhone, string templateId, string payloadJson, CancellationToken ct = default);
    Task<bool> PingAsync(CancellationToken ct = default);
}
