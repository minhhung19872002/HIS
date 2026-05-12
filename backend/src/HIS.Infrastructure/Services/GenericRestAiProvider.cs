using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Phase 4 — Reference adapter cho mọi AI vendor "HTTP-based JSON".
///
/// Cấu hình qua `appsettings.AiLabeling.Providers[]`:
/// {
///   "Id": "vindr",
///   "Name": "VinDr Lab",
///   "Endpoint": "https://api.vindr.ai/v1/inference",
///   "ApiKey": "...",
///   "AuthHeader": "Authorization" | "X-API-Key",
///   "AuthPrefix": "Bearer " | "",
///   "Modalities": [ "CR", "DX" ],
///   "RequestFormat": "multipart" | "json-base64" | "json-url",
///   "ResponseLabelsField": "predictions" | "labels" | "results",
///   "ResponseLabelField": "label" | "class",
///   "ResponseScoreField": "score" | "confidence" | "probability",
///   "LabelToVi": { "Pneumonia": "Viêm phổi", ... }   // optional translation map
/// }
///
/// Vendor concrete (VinDrLabProvider, HeraMIProvider, …) chỉ cần extend
/// class này và override DTO mapping nếu schema khác hẳn (rare — most vendors
/// converged on similar JSON shape since 2024).
/// </summary>
public class GenericRestAiProvider : IAiInferenceProvider
{
    public string Id { get; }
    public string Name { get; }

    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _authHeader;
    private readonly string _authPrefix;
    private readonly string _modelName;
    private readonly string _modelVersion;
    private readonly string[] _modalities;
    private readonly string _requestFormat;
    private readonly string _labelsField;
    private readonly string _labelField;
    private readonly string _scoreField;
    private readonly Dictionary<string, string> _labelToVi;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<GenericRestAiProvider> _logger;

    public GenericRestAiProvider(
        Microsoft.Extensions.Configuration.IConfigurationSection section,
        IHttpClientFactory httpFactory,
        ILogger<GenericRestAiProvider> logger)
    {
        Id = section["Id"] ?? throw new ArgumentException("Provider config thiếu Id");
        Name = section["Name"] ?? Id;
        var endpoint = section["Endpoint"];
        if (string.IsNullOrWhiteSpace(endpoint))
            throw new ArgumentException($"Provider {Id} có Endpoint rỗng — skip (chưa cấu hình)");
        _endpoint = endpoint;
        _apiKey = section["ApiKey"] ?? "";
        _authHeader = section["AuthHeader"] ?? "Authorization";
        _authPrefix = section["AuthPrefix"] ?? "Bearer ";
        _modelName = section["ModelName"] ?? Name;
        _modelVersion = section["ModelVersion"] ?? "v1";
        _modalities = section.GetSection("Modalities").Get<string[]>() ?? Array.Empty<string>();
        _requestFormat = (section["RequestFormat"] ?? "json-url").ToLowerInvariant();
        _labelsField = section["ResponseLabelsField"] ?? "predictions";
        _labelField = section["ResponseLabelField"] ?? "label";
        _scoreField = section["ResponseScoreField"] ?? "score";
        _labelToVi = section.GetSection("LabelToVi").Get<Dictionary<string, string>>()
                     ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public bool SupportsModality(string modality) =>
        _modalities.Length == 0 ||
        _modalities.Any(m => string.Equals(m, modality, StringComparison.OrdinalIgnoreCase));

    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        // Heuristic: GET on the endpoint host root or a /health subpath if
        // available. Vendors rarely standardize this so we just check that
        // DNS resolves + TCP connect works.
        try
        {
            using var http = _httpFactory.CreateClient($"AiProvider-{Id}");
            using var req = new HttpRequestMessage(HttpMethod.Head, _endpoint);
            // 5s timeout — health checks shouldn't block AppStart
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(5));
            var resp = await http.SendAsync(req, timeoutCts.Token);
            // Even a 405 / 401 means the server is reachable.
            return resp.StatusCode < System.Net.HttpStatusCode.InternalServerError;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Provider {Id} health check failed", Id);
            return false;
        }
    }

    public async Task<AiInferenceResult> RunInferenceAsync(AiInferenceRequest req, CancellationToken ct = default)
    {
        var start = DateTime.UtcNow;
        using var http = _httpFactory.CreateClient($"AiProvider-{Id}");
        if (!string.IsNullOrEmpty(_apiKey))
        {
            if (string.Equals(_authHeader, "Authorization", StringComparison.OrdinalIgnoreCase))
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(_authPrefix.Trim(), _apiKey);
            else
                http.DefaultRequestHeaders.TryAddWithoutValidation(_authHeader, _authPrefix + _apiKey);
        }

        try
        {
            HttpResponseMessage resp;
            switch (_requestFormat)
            {
                case "multipart":
                {
                    using var content = new MultipartFormDataContent();
                    if (req.ImageBytes != null)
                    {
                        var img = new ByteArrayContent(req.ImageBytes);
                        img.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
                        content.Add(img, "image", "image.png");
                    }
                    content.Add(new StringContent(req.Modality), "modality");
                    content.Add(new StringContent(req.StudyInstanceUid), "studyInstanceUid");
                    resp = await http.PostAsync(_endpoint, content, ct);
                    break;
                }
                case "json-base64":
                {
                    var payload = new
                    {
                        modality = req.Modality,
                        studyInstanceUid = req.StudyInstanceUid,
                        imageBase64 = req.ImageBytes != null ? Convert.ToBase64String(req.ImageBytes) : null,
                        metadata = req.Metadata,
                    };
                    resp = await http.PostAsJsonAsync(_endpoint, payload, ct);
                    break;
                }
                default: // "json-url"
                {
                    var payload = new
                    {
                        modality = req.Modality,
                        studyInstanceUid = req.StudyInstanceUid,
                        imageUrl = req.ImageUrl,
                        metadata = req.Metadata,
                    };
                    resp = await http.PostAsJsonAsync(_endpoint, payload, ct);
                    break;
                }
            }

            var bodyText = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                return new AiInferenceResult
                {
                    ProviderId = Id,
                    ModelName = _modelName,
                    ModelVersion = _modelVersion,
                    DurationMs = (int)(DateTime.UtcNow - start).TotalMilliseconds,
                    ErrorMessage = $"Provider {Name} trả {(int)resp.StatusCode}: {Truncate(bodyText, 300)}",
                };
            }

            var labels = ParseLabels(bodyText);
            return new AiInferenceResult
            {
                Labels = labels,
                ProviderId = Id,
                ModelName = _modelName,
                ModelVersion = _modelVersion,
                DurationMs = (int)(DateTime.UtcNow - start).TotalMilliseconds,
            };
        }
        catch (Exception ex)
        {
            return new AiInferenceResult
            {
                ProviderId = Id,
                ModelName = _modelName,
                ModelVersion = _modelVersion,
                DurationMs = (int)(DateTime.UtcNow - start).TotalMilliseconds,
                ErrorMessage = $"{Name} lỗi: {ex.Message}",
            };
        }
    }

    private List<AiInferenceLabel> ParseLabels(string json)
    {
        var list = new List<AiInferenceLabel>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            JsonElement arr;
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
                arr = doc.RootElement;
            else if (doc.RootElement.TryGetProperty(_labelsField, out var p) && p.ValueKind == JsonValueKind.Array)
                arr = p;
            else
                return list;

            foreach (var item in arr.EnumerateArray())
            {
                var label = item.TryGetProperty(_labelField, out var lEl) ? lEl.GetString() ?? "" : "";
                double score = 0;
                if (item.TryGetProperty(_scoreField, out var sEl) && sEl.ValueKind == JsonValueKind.Number)
                    score = sEl.GetDouble();

                AiBbox? bbox = null;
                if (item.TryGetProperty("bbox", out var bbEl) && bbEl.ValueKind == JsonValueKind.Object)
                {
                    bbox = new AiBbox
                    {
                        X = bbEl.TryGetProperty("x", out var x) ? x.GetDouble() : 0,
                        Y = bbEl.TryGetProperty("y", out var y) ? y.GetDouble() : 0,
                        W = bbEl.TryGetProperty("w", out var w) ? w.GetDouble() : 0,
                        H = bbEl.TryGetProperty("h", out var h) ? h.GetDouble() : 0,
                    };
                }

                list.Add(new AiInferenceLabel
                {
                    Label = label,
                    LabelVi = _labelToVi.TryGetValue(label, out var vi) ? vi : label,
                    Score = score,
                    Bbox = bbox,
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Provider {Id} response không parse được", Id);
        }
        return list;
    }

    private static string Truncate(string? s, int max) =>
        string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s[..max] + "...");
}
