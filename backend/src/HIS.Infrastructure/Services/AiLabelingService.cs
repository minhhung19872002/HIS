using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.AiLabeling;
using HIS.Application.Interfaces;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// DB-backed AI labeling operations (#202 thin-controller). Extracted from
/// AiLabelingController — behavior-preserving verbatim copy of all _db logic.
/// Config/filesystem/provider-only methods remain in the controller.
/// </summary>
public class AiLabelingService : IAiLabelingService
{
    private readonly HISDbContext _db;
    private readonly IAiProviderRegistry _providerRegistry;

    public AiLabelingService(HISDbContext db, IAiProviderRegistry providerRegistry)
    {
        _db = db;
        _providerRegistry = providerRegistry;
    }

    public async Task<ServiceOutcome> SaveAsync(SaveAiResultDto dto, Guid userId)
    {
        var entity = new AiLabelingResult
        {
            Id = Guid.NewGuid(),
            StudyInstanceUID = dto.StudyInstanceUID,
            PatientId = dto.PatientId,
            RadiologyRequestId = dto.RadiologyRequestId,
            ModelName = dto.ModelName,
            ModelVersion = dto.ModelVersion,
            ModelUrl = dto.ModelUrl,
            DurationMs = dto.DurationMs,
            LabelsJson = dto.LabelsJson,
            InputImageHash = dto.InputImageHash,
            InputWidth = dto.InputWidth,
            InputHeight = dto.InputHeight,
            ErrorMessage = dto.ErrorMessage,
            ReviewStatus = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };

        _db.AiLabelingResults.Add(entity);
        await _db.SaveChangesAsync();

        return ServiceOutcome.Ok((await MapAsync(entity.Id))!);
    }

    public async Task<ServiceOutcome> ReviewAsync(Guid id, ReviewDto dto, Guid userId)
    {
        var entity = await _db.AiLabelingResults.FirstOrDefaultAsync(a => a.Id == id);
        if (entity == null) return ServiceOutcome.NotFound("Không tìm thấy kết quả AI");

        entity.ReviewStatus = dto.ReviewStatus;
        entity.AcceptedLabelsJson = dto.AcceptedLabelsJson;
        entity.ReviewNote = dto.ReviewNote;
        entity.ReviewedBy = userId;
        entity.ReviewedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok((await MapAsync(entity.Id))!);
    }

    public async Task<ServiceOutcome> GetQueueAsync(int limit)
    {
        var rows = await _db.AiLabelingResults
            .Where(a => a.ReviewStatus == 0)
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .Select(a => new
            {
                a.Id,
                a.StudyInstanceUID,
                a.PatientId,
                a.RadiologyRequestId,
                a.CreatedAt,
                a.ErrorMessage,
            })
            .ToListAsync();

        // Enrich with patient name + request code (single round-trip per type).
        var patientIds = rows.Where(r => r.PatientId.HasValue).Select(r => r.PatientId!.Value).Distinct().ToList();
        var requestIds = rows.Where(r => r.RadiologyRequestId.HasValue).Select(r => r.RadiologyRequestId!.Value).Distinct().ToList();

        var patients = patientIds.Count == 0 ? new Dictionary<Guid, string>()
            : await _db.Patients
                .Where(p => patientIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.FullName);

        var requests = requestIds.Count == 0
            ? new Dictionary<Guid, (string Code, string? Modality)>()
            : (await _db.RadiologyRequests
                .Include(r => r.Service)
                .Where(r => requestIds.Contains(r.Id))
                .ToListAsync())
                .ToDictionary(r => r.Id, r => (Code: r.RequestCode, Modality: r.Service?.ServiceCode));

        var dtos = rows.Select(r => new QueueItemDto(
            Id: r.Id,
            StudyInstanceUID: r.StudyInstanceUID,
            PatientId: r.PatientId,
            PatientName: r.PatientId.HasValue && patients.TryGetValue(r.PatientId.Value, out var pn) ? pn : null,
            RadiologyRequestId: r.RadiologyRequestId,
            RequestCode: r.RadiologyRequestId.HasValue && requests.TryGetValue(r.RadiologyRequestId.Value, out var rq) ? rq.Code : null,
            Modality: r.RadiologyRequestId.HasValue && requests.TryGetValue(r.RadiologyRequestId.Value, out var rq2) ? rq2.Modality : null,
            QueuedAt: r.CreatedAt,
            AutoQueued: r.ErrorMessage == AiWorklistService.QueueMarkerValue
        )).ToList();

        return ServiceOutcome.Ok(dtos);
    }

    public async Task<ServiceOutcome> ByStudyAsync(string studyUid)
    {
        var results = await _db.AiLabelingResults
            .Where(a => a.StudyInstanceUID == studyUid)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id, a.StudyInstanceUID, a.ModelName, a.ModelVersion,
                a.DurationMs, a.LabelsJson, a.ReviewStatus, a.AcceptedLabelsJson,
                a.ReviewedBy, a.ReviewedAt, a.ReviewNote,
                a.CreatedBy, a.CreatedAt, a.ErrorMessage
            })
            .ToListAsync();

        // Collect user IDs from both string CreatedBy and Guid ReviewedBy
        var userIds = new List<Guid>();
        foreach (var r in results)
        {
            if (Guid.TryParse(r.CreatedBy, out var cb)) userIds.Add(cb);
            if (r.ReviewedBy.HasValue) userIds.Add(r.ReviewedBy.Value);
        }
        userIds = userIds.Distinct().ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync();
        var nameMap = users.ToDictionary(u => u.Id, u => u.FullName ?? "");

        var mapped = results.Select(r =>
        {
            string? createdByName = null;
            if (Guid.TryParse(r.CreatedBy, out var cb))
                createdByName = nameMap.GetValueOrDefault(cb);
            string? reviewedByName = r.ReviewedBy.HasValue
                ? nameMap.GetValueOrDefault(r.ReviewedBy.Value)
                : null;
            return new AiResultDto(
                r.Id, r.StudyInstanceUID, r.ModelName, r.ModelVersion,
                r.DurationMs, r.LabelsJson, r.ReviewStatus, StatusLabel(r.ReviewStatus),
                r.AcceptedLabelsJson,
                r.ReviewedBy, reviewedByName, r.ReviewedAt, r.ReviewNote,
                r.CreatedBy, createdByName, r.CreatedAt,
                r.ErrorMessage);
        }).ToList();

        return ServiceOutcome.Ok(mapped);
    }

    public async Task<ServiceOutcome> RunViaProviderAsync(RunViaProviderDto dto, Guid userId, CancellationToken ct)
    {
        var provider = _providerRegistry.GetById(dto.ProviderId);
        if (provider == null)
            return ServiceOutcome.Bad($"Provider '{dto.ProviderId}' không có trong cấu hình");
        if (!provider.SupportsModality(dto.Modality))
            return ServiceOutcome.Bad($"Provider '{provider.Name}' không hỗ trợ modality '{dto.Modality}'");

        var req = new AiInferenceRequest
        {
            Modality = dto.Modality,
            StudyInstanceUid = dto.StudyInstanceUID,
            ImageUrl = dto.ImageUrl,
        };
        var infResult = await provider.RunInferenceAsync(req, ct);

        // Persist as a regular AiLabelingResult — frontend reads via the same endpoints.
        var labelsJson = JsonSerializer.Serialize(infResult.Labels.Select(l => new
        {
            label = l.Label,
            labelVi = l.LabelVi,
            score = l.Score,
            bbox = l.Bbox,
        }));

        var entity = new AiLabelingResult
        {
            Id = Guid.NewGuid(),
            StudyInstanceUID = dto.StudyInstanceUID,
            PatientId = dto.PatientId,
            RadiologyRequestId = dto.RadiologyRequestId,
            ModelName = infResult.ModelName + " (via " + provider.Name + ")",
            ModelVersion = infResult.ModelVersion,
            LabelsJson = labelsJson,
            DurationMs = infResult.DurationMs,
            ReviewStatus = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            ErrorMessage = infResult.ErrorMessage,
        };
        _db.AiLabelingResults.Add(entity);
        await _db.SaveChangesAsync(ct);

        return ServiceOutcome.Ok((await MapAsync(entity.Id))!);
    }

    private async Task<AiResultDto?> MapAsync(Guid id)
    {
        var r = await _db.AiLabelingResults.FirstOrDefaultAsync(a => a.Id == id);
        if (r == null) return null;
        string? createdName = null;
        if (Guid.TryParse(r.CreatedBy, out var cb))
        {
            createdName = await _db.Users.Where(u => u.Id == cb)
                .Select(u => u.FullName).FirstOrDefaultAsync();
        }
        var reviewedName = r.ReviewedBy.HasValue
            ? (await _db.Users.Where(u => u.Id == r.ReviewedBy.Value).Select(u => u.FullName).FirstOrDefaultAsync()) : null;
        return new AiResultDto(
            r.Id, r.StudyInstanceUID, r.ModelName, r.ModelVersion,
            r.DurationMs, r.LabelsJson, r.ReviewStatus, StatusLabel(r.ReviewStatus),
            r.AcceptedLabelsJson,
            r.ReviewedBy, reviewedName, r.ReviewedAt, r.ReviewNote,
            r.CreatedBy, createdName, r.CreatedAt, r.ErrorMessage);
    }

    private static string StatusLabel(int s) => s switch
    {
        0 => "Chờ BS xem xét",
        1 => "Chấp nhận toàn bộ",
        2 => "Chấp nhận một phần",
        3 => "Từ chối",
        _ => "Khác"
    };
}
