using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Loads `appsettings.AiLabeling.Providers[]` at startup and exposes the list
/// of `IAiInferenceProvider` instances. Singleton — provider instances reuse
/// HttpClientFactory pools so registration once is fine.
///
/// Frontend can list available providers via `GET /api/ai-labeling/providers`
/// to pick a specific vendor when triggering server-side inference (Phase 4
/// run-via-provider endpoint).
/// </summary>
public interface IAiProviderRegistry
{
    IReadOnlyList<IAiInferenceProvider> All { get; }
    IAiInferenceProvider? GetById(string id);
    IReadOnlyList<IAiInferenceProvider> ForModality(string modality);
}

public class AiProviderRegistry : IAiProviderRegistry
{
    public IReadOnlyList<IAiInferenceProvider> All { get; }

    public AiProviderRegistry(
        IConfiguration config,
        IHttpClientFactory httpFactory,
        ILoggerFactory loggerFactory)
    {
        var list = new List<IAiInferenceProvider>();
        var providersSection = config.GetSection("AiLabeling:Providers");
        foreach (var p in providersSection.GetChildren())
        {
            try
            {
                var logger = loggerFactory.CreateLogger<GenericRestAiProvider>();
                list.Add(new GenericRestAiProvider(p, httpFactory, logger));
            }
            catch (Exception ex)
            {
                loggerFactory.CreateLogger<AiProviderRegistry>()
                    .LogWarning(ex, "Bỏ qua provider config không hợp lệ");
            }
        }
        All = list;
    }

    public IAiInferenceProvider? GetById(string id) =>
        All.FirstOrDefault(p => string.Equals(p.Id, id, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyList<IAiInferenceProvider> ForModality(string modality) =>
        All.Where(p => p.SupportsModality(modality)).ToList();
}
