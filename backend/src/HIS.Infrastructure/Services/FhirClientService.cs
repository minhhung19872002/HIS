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

    public async Task<FhirCapabilityStatement?> FetchCapabilityStatementAsync(string serverUrl)
    {
        try
        {
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
            var url = $"{serverUrl.TrimEnd('/')}/Patient/{patientId}";
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
            var url = $"{serverUrl.TrimEnd('/')}/Encounter?patient={patientId}";
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
            var url = $"{serverUrl.TrimEnd('/')}/Observation?patient={patientId}";
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
