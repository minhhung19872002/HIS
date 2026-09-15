using System.Text.Json;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services;

/// <summary>
/// FHIR Client Service for fetching data from external FHIR R4 servers
/// Used for health information exchange with other hospitals
/// </summary>
public class FhirClientService : IFhirClientService
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public FhirClientService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/fhir+json"));
    }

    /// <summary>
    /// QA-R2 (SSRF): serverUrl comes straight from the query string, so any signed-in user could make
    /// the API call loopback / cloud-metadata endpoints (e.g. 127.0.0.1, 169.254.169.254 on EC2).
    /// Only absolute http(s) URLs whose host does not resolve to loopback, link-local or unspecified
    /// addresses are allowed. Private LAN ranges stay allowed (partner hospital FHIR servers).
    /// </summary>
    private static async Task<bool> IsAllowedServerUrlAsync(string serverUrl)
    {
        if (!Uri.TryCreate(serverUrl, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
        if (uri.IsLoopback) return false;

        System.Net.IPAddress[] addresses;
        try
        {
            addresses = System.Net.IPAddress.TryParse(uri.DnsSafeHost, out var literal)
                ? new[] { literal }
                : await System.Net.Dns.GetHostAddressesAsync(uri.DnsSafeHost);
        }
        catch (Exception)
        {
            return false;
        }

        foreach (var ip in addresses)
        {
            var addr = ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip;
            if (System.Net.IPAddress.IsLoopback(addr)) return false;
            if (addr.Equals(System.Net.IPAddress.Any) || addr.Equals(System.Net.IPAddress.IPv6Any)) return false;
            if (addr.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
            {
                var b = addr.GetAddressBytes();
                if (b[0] == 169 && b[1] == 254) return false; // link-local incl. cloud metadata
                if (b[0] == 0) return false;
            }
            else if (addr.IsIPv6LinkLocal)
            {
                return false;
            }
        }
        return addresses.Length > 0;
    }

    public async Task<FhirCapabilityStatement?> FetchCapabilityStatementAsync(string serverUrl)
    {
        try
        {
            if (!await IsAllowedServerUrlAsync(serverUrl)) return null;
            var url = $"{serverUrl.TrimEnd('/')}/metadata";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<FhirCapabilityStatement>(json, JsonOptions);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<FhirPatient?> FetchPatientAsync(string serverUrl, string patientId)
    {
        try
        {
            if (!await IsAllowedServerUrlAsync(serverUrl)) return null;
            var url = $"{serverUrl.TrimEnd('/')}/Patient/{Uri.EscapeDataString(patientId)}";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<FhirPatient>(json, JsonOptions);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<FhirBundle?> FetchEncountersAsync(string serverUrl, string patientId)
    {
        try
        {
            if (!await IsAllowedServerUrlAsync(serverUrl)) return null;
            var url = $"{serverUrl.TrimEnd('/')}/Encounter?patient={Uri.EscapeDataString(patientId)}";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<FhirBundle>(json, JsonOptions);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<FhirBundle?> FetchObservationsAsync(string serverUrl, string patientId)
    {
        try
        {
            if (!await IsAllowedServerUrlAsync(serverUrl)) return null;
            var url = $"{serverUrl.TrimEnd('/')}/Observation?patient={Uri.EscapeDataString(patientId)}";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<FhirBundle>(json, JsonOptions);
        }
        catch (Exception)
        {
            return null;
        }
    }
}
