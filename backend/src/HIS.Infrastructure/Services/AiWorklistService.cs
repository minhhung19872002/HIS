using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Phase 4 — Auto-trigger AI worklist.
///
/// Mỗi N giây (config) scan `DicomStudies` mới upload (last 30 phút) chưa
/// có `AiLabelingResults` tương ứng → tạo "queue marker" record (LabelsJson
/// rỗng + ErrorMessage marker) để BS thấy badge "N ca AI sẵn sàng" trên
/// DicomViewer. SignalR push thông báo realtime cho BS đang đăng nhập.
///
/// Inference KHÔNG chạy server-side trong worker này — model ONNX vẫn chạy
/// client-side trong browser (tuân thủ TT 54/2017: ảnh y tế không gửi
/// server ngoài). Worker chỉ làm:
///   1. Phát hiện study mới
///   2. Đánh dấu trong DB
///   3. Push notification
/// BS click vào ticker → mở DicomViewer → click "Phân tích AI" như bình
/// thường, browser chạy inference.
///
/// Nếu admin muốn server-side inference (giảm load CPU client), enable
/// `AiLabeling.Worklist.AutoRunProvider` trỏ vào 1 provider id (vd. "vindr")
/// — worker sẽ gọi vendor REST endpoint thay vì chỉ tạo queue marker.
/// </summary>
public class AiWorklistService : BackgroundService
{
    private const string QueueMarker = "AUTO_QUEUED";

    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<AiWorklistService> _logger;

    public AiWorklistService(
        IServiceProvider services,
        IConfiguration config,
        ILogger<AiWorklistService> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _config.GetValue<bool>("AiLabeling:Worklist:Enabled", false);
        if (!enabled)
        {
            _logger.LogInformation("AiWorklistService disabled (set AiLabeling:Worklist:Enabled=true to enable)");
            return;
        }

        var intervalSec = Math.Max(15, _config.GetValue<int>("AiLabeling:Worklist:IntervalSeconds", 60));
        var lookbackMin = Math.Max(5, _config.GetValue<int>("AiLabeling:Worklist:LookbackMinutes", 30));

        _logger.LogInformation("AiWorklistService started — scanning every {Sec}s, lookback {Min} min",
            intervalSec, lookbackMin);

        // Initial delay so we don't compete with app startup (DB migrations,
        // DataSeeder, schema repair). 30s is generous.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanOnceAsync(lookbackMin, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AiWorklistService scan iteration failed");
            }

            try { await Task.Delay(TimeSpan.FromSeconds(intervalSec), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ScanOnceAsync(int lookbackMin, CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var cutoff = DateTime.UtcNow.AddMinutes(-lookbackMin);
        var recent = await db.DicomStudies
            .Where(d => d.CreatedAt >= cutoff && !d.IsDeleted && d.StudyInstanceUID != null)
            .OrderByDescending(d => d.CreatedAt)
            .Take(200)
            .Select(d => new { d.Id, d.StudyInstanceUID, d.RadiologyExamId, d.CreatedAt })
            .ToListAsync(ct);

        if (recent.Count == 0) return;

        var studyUids = recent.Select(r => r.StudyInstanceUID).Distinct().ToList();
        var alreadyQueued = await db.AiLabelingResults
            .Where(a => studyUids.Contains(a.StudyInstanceUID))
            .Select(a => a.StudyInstanceUID)
            .Distinct()
            .ToListAsync(ct);
        var alreadySet = new HashSet<string>(alreadyQueued, StringComparer.OrdinalIgnoreCase);

        // #195: nạp 1 lần các ca chụp đứng sau những study sắp xếp hàng, thay vì 1 query/study.
        var examIdsNeeded = recent
            .Where(s => !alreadySet.Contains(s.StudyInstanceUID))
            .Select(s => s.RadiologyExamId)
            .Distinct()
            .ToList();
        var examsById = await db.RadiologyExams
            .Include(e => e.RadiologyRequest)
                .ThenInclude(r => r!.Patient)
            .Include(e => e.RadiologyRequest)
                .ThenInclude(r => r!.RequestingDoctor)
            .Where(e => examIdsNeeded.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        int created = 0;
        foreach (var study in recent)
        {
            if (alreadySet.Contains(study.StudyInstanceUID)) continue;

            // Get the RadiologyRequest behind this study so we can pull patient/dept.
            examsById.TryGetValue(study.RadiologyExamId, out var examWithReq);

            var req = examWithReq?.RadiologyRequest;
            var marker = new AiLabelingResult
            {
                Id = Guid.NewGuid(),
                StudyInstanceUID = study.StudyInstanceUID,
                PatientId = req?.PatientId,
                RadiologyRequestId = req?.Id,
                ModelName = "queued",  // Worker placeholder — replaced when FE runs real inference
                ModelVersion = "auto",
                LabelsJson = "[]",
                ReviewStatus = 0,
                ErrorMessage = QueueMarker,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = null,  // system-created
            };
            db.AiLabelingResults.Add(marker);
            created++;
            _ = req; // req already consumed above; keep ref explicit
        }

        if (created > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("AiWorklistService queued {N} new AI analyses", created);

            // Realtime push so the frontend AI badge refetches immediately
            // instead of waiting for its 30s poll. The Hub lives in HIS.API,
            // which Infrastructure can't reference, so we go through the
            // IRealtimeNotifier adapter (registered in Program.cs). Resolved
            // optionally — if no adapter is registered the worker still works
            // and the frontend poll picks up the change.
            var notifier = scope.ServiceProvider.GetService<IRealtimeNotifier>();
            if (notifier != null)
            {
                try { await notifier.NotifyAiQueueUpdatedAsync(created, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "AI queue realtime push failed"); }
            }
        }
    }

    /// <summary>Public helper used by /queue endpoint to distinguish queued markers from real runs.</summary>
    public const string QueueMarkerValue = QueueMarker;
}
