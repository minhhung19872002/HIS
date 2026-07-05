using HIS.Application.Common;
using HIS.Application.DTOs.AiLabeling;

namespace HIS.Application.Interfaces;

/// <summary>
/// AI labeling audit + review — DB-backed operations extracted from
/// AiLabelingController (#202 thin-controller). Config/filesystem/provider
/// methods remain in the controller.
/// </summary>
public interface IAiLabelingService
{
    Task<ServiceOutcome> SaveAsync(SaveAiResultDto dto, Guid userId);
    Task<ServiceOutcome> ReviewAsync(Guid id, ReviewDto dto, Guid userId);
    Task<ServiceOutcome> GetQueueAsync(int limit);
    Task<ServiceOutcome> ByStudyAsync(string studyUid);
    Task<ServiceOutcome> RunViaProviderAsync(RunViaProviderDto dto, Guid userId, CancellationToken ct);
}
