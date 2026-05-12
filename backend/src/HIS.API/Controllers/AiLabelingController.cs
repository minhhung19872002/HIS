using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// AI labeling trên ảnh DICOM — audit + review workflow.
/// Inference chạy client-side (browser ONNX) vì 2 lý do:
///   1. Không gửi ảnh y tế ra server ngoài (tuân thủ TT 54/2017).
///   2. Không phát sinh chi phí GPU server.
/// Backend chỉ chịu trách nhiệm lưu audit + cấu hình model URL.
/// </summary>
[ApiController]
[Route("api/ai-labeling")]
[Authorize]
public class AiLabelingController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public AiLabelingController(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public record SaveAiResultDto(
        string StudyInstanceUID,
        Guid? PatientId,
        Guid? RadiologyRequestId,
        string ModelName,
        string? ModelVersion,
        string? ModelUrl,
        int DurationMs,
        string LabelsJson,
        string? InputImageHash,
        int? InputWidth,
        int? InputHeight,
        string? ErrorMessage);

    public record ReviewDto(
        int ReviewStatus,          // 1=accept all, 2=accept partial, 3=reject
        string? AcceptedLabelsJson,
        string? ReviewNote);

    public record AiResultDto(
        Guid Id,
        string StudyInstanceUID,
        string ModelName,
        string? ModelVersion,
        int DurationMs,
        string LabelsJson,
        int ReviewStatus,
        string ReviewStatusLabel,
        string? AcceptedLabelsJson,
        Guid? ReviewedBy,
        string? ReviewedByName,
        DateTime? ReviewedAt,
        string? ReviewNote,
        string? CreatedBy,
        string? CreatedByName,
        DateTime CreatedAt,
        string? ErrorMessage);

    public record ModelConfigDto(
        string ModelUrl,
        string ModelName,
        string ModelVersion,
        IReadOnlyList<string> Labels,
        IReadOnlyList<string> LabelsVi,
        int InputWidth,
        int InputHeight,
        string Modality,
        bool Available);

    public record ModalitySummaryDto(
        string Modality,
        IReadOnlyList<string> Aliases,
        string ModelName,
        string ModelVersion,
        bool Available,
        string? Note);

    /// <summary>
    /// Phase 1 multi-modality: pick the ONNX model whose `Modalities[]` list
    /// matches the requested DICOM Modality code (case-insensitive). Falls
    /// back to the legacy flat config block (CR/DX) when:
    ///   - the caller passes no modality, or
    ///   - the requested modality has no entry in Models[].
    /// Returns null if neither the requested entry nor the legacy block is
    /// configured (controller will translate to 404).
    /// </summary>
    private (string? ModelFileName, string? ModelUrl, string ModelName,
             string ModelVersion, int InputWidth, int InputHeight,
             string[] Labels, string[] LabelsVi, string Modality, string? Note)?
        ResolveModelConfig(string? modality)
    {
        var root = _config.GetSection("AiLabeling");
        var defaultModality = root["DefaultModality"] ?? "CR";
        var wanted = string.IsNullOrWhiteSpace(modality) ? defaultModality : modality.Trim().ToUpperInvariant();

        var models = root.GetSection("Models").GetChildren().ToList();
        foreach (var m in models)
        {
            var mods = m.GetSection("Modalities").Get<string[]>() ?? Array.Empty<string>();
            if (mods.Any(x => string.Equals(x, wanted, StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    ModelFileName: m["ModelFileName"],
                    ModelUrl: m["ModelUrl"],
                    ModelName: m["ModelName"] ?? "unknown",
                    ModelVersion: m["ModelVersion"] ?? "v1",
                    InputWidth: m.GetValue<int?>("InputWidth") ?? 224,
                    InputHeight: m.GetValue<int?>("InputHeight") ?? 224,
                    Labels: m.GetSection("Labels").Get<string[]>() ?? Array.Empty<string>(),
                    LabelsVi: m.GetSection("LabelsVi").Get<string[]>() ?? Array.Empty<string>(),
                    Modality: mods.FirstOrDefault() ?? wanted,
                    Note: m["_note"]);
            }
        }

        // Fallback to legacy flat keys — only valid for CR/DX equivalents.
        if (string.Equals(wanted, defaultModality, StringComparison.OrdinalIgnoreCase))
        {
            return (
                ModelFileName: root["ModelFileName"],
                ModelUrl: root["ModelUrl"],
                ModelName: root["ModelName"] ?? "TorchXRayVision-DenseNet121",
                ModelVersion: root["ModelVersion"] ?? "NIH14-v1",
                InputWidth: root.GetValue<int?>("InputWidth") ?? 224,
                InputHeight: root.GetValue<int?>("InputHeight") ?? 224,
                Labels: root.GetSection("Labels").Get<string[]>() ?? Array.Empty<string>(),
                LabelsVi: root.GetSection("LabelsVi").Get<string[]>() ?? Array.Empty<string>(),
                Modality: defaultModality,
                Note: null);
        }

        return null;
    }

    /// <summary>True when the ONNX file is present on disk OR an explicit
    /// ModelUrl was configured (admin pointed at R2/CDN). Used by FE to
    /// decide whether "Phân tích AI" should be enabled for that modality.</summary>
    private bool IsModelAvailable(string? modelFileName, string? modelUrl)
    {
        if (!string.IsNullOrWhiteSpace(modelUrl)) return true;
        if (string.IsNullOrWhiteSpace(modelFileName)) return false;
        var safe = Path.GetFileName(modelFileName);
        var primary = Path.Combine(AppContext.BaseDirectory, "wwwroot", "ai-models", safe);
        if (System.IO.File.Exists(primary)) return true;
        var alt = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ai-models", safe);
        return System.IO.File.Exists(alt);
    }

    private static string StatusLabel(int s) => s switch
    {
        0 => "Chờ BS xem xét",
        1 => "Chấp nhận toàn bộ",
        2 => "Chấp nhận một phần",
        3 => "Từ chối",
        _ => "Khác"
    };

    /// <summary>Stream model ONNX kèm trong Docker image tới frontend.</summary>
    [HttpGet("model")]
    [AllowAnonymous]
    public IActionResult GetModel([FromQuery] string? modality = null)
    {
        // ONNX Runtime's fetch() inside the browser doesn't carry JWT, so we
        // expose the model anonymously. Audit trail + ReviewStatus in the
        // POST /ai-labeling endpoint is where accountability lives.
        var cfg = ResolveModelConfig(modality);
        if (cfg == null)
            return NotFound(new { message = $"Modality '{modality}' không hỗ trợ AI" });

        var fileName = Path.GetFileName(cfg.Value.ModelFileName ?? "chestxray_densenet121_res224_all.onnx");
        var path = Path.Combine(AppContext.BaseDirectory, "wwwroot", "ai-models", fileName);
        if (!System.IO.File.Exists(path))
        {
            var alt = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ai-models", fileName);
            if (System.IO.File.Exists(alt)) path = alt;
            else return NotFound(new
            {
                message = $"Model file '{fileName}' chưa cài đặt cho modality '{cfg.Value.Modality}'. " +
                          "Liên hệ admin chạy scripts/convert_*.py hoặc set AiLabeling__Models__N__ModelUrl trỏ về R2/CDN."
            });
        }
        // Use PhysicalFile result — ASP.NET Core streams directly via SendFile,
        // no buffering. Needed for >32MB files on Cloud Run which otherwise hit
        // response-size limits from the ingress proxy.
        return new PhysicalFileResult(path, "application/octet-stream")
        {
            EnableRangeProcessing = true,
            FileDownloadName = fileName,
        };
    }

    /// <summary>
    /// Frontend gọi khi load DicomViewer để biết model URL + labels.
    /// Optional query param `modality` cho phép pick model theo DICOM tag
    /// (CR/DX → CXR model, CT → CT model, US → ultrasound model).
    /// Admin có thể override qua appsettings.json mục AiLabeling.Models[*].
    /// </summary>
    [HttpGet("config")]
    public ActionResult<ModelConfigDto> GetConfig([FromQuery] string? modality = null)
    {
        var cfg = ResolveModelConfig(modality);
        if (cfg == null)
        {
            return NotFound(new ModelConfigDto(
                ModelUrl: string.Empty,
                ModelName: string.Empty,
                ModelVersion: string.Empty,
                Labels: Array.Empty<string>(),
                LabelsVi: Array.Empty<string>(),
                InputWidth: 0,
                InputHeight: 0,
                Modality: modality ?? string.Empty,
                Available: false));
        }

        var resolved = cfg.Value;

        // Build a URL the browser can fetch directly. Admin override (ModelUrl
        // pointing at R2/CDN) takes precedence; otherwise stream via this API.
        var modelUrl = resolved.ModelUrl;
        if (string.IsNullOrEmpty(modelUrl))
            modelUrl = $"{Request.Scheme}://{Request.Host}/api/ai-labeling/model?modality={Uri.EscapeDataString(resolved.Modality)}";

        var available = IsModelAvailable(resolved.ModelFileName, resolved.ModelUrl);

        return Ok(new ModelConfigDto(
            modelUrl,
            resolved.ModelName,
            resolved.ModelVersion,
            resolved.Labels,
            resolved.LabelsVi,
            resolved.InputWidth,
            resolved.InputHeight,
            resolved.Modality,
            available));
    }

    /// <summary>
    /// FE gọi để biết danh sách modality nào server đã cấu hình + sẵn sàng.
    /// Dùng để disable button "Phân tích AI" trên DicomViewer khi modality
    /// chưa có model. Nhanh hơn việc gọi /config riêng cho từng modality.
    /// </summary>
    [HttpGet("modalities")]
    public ActionResult<IReadOnlyList<ModalitySummaryDto>> ListModalities()
    {
        var result = new List<ModalitySummaryDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var section = _config.GetSection("AiLabeling");

        foreach (var m in section.GetSection("Models").GetChildren())
        {
            var mods = m.GetSection("Modalities").Get<string[]>() ?? Array.Empty<string>();
            if (mods.Length == 0) continue;
            var primary = mods[0];
            if (!seen.Add(primary)) continue;
            result.Add(new ModalitySummaryDto(
                Modality: primary,
                Aliases: mods.Skip(1).ToArray(),
                ModelName: m["ModelName"] ?? "",
                ModelVersion: m["ModelVersion"] ?? "",
                Available: IsModelAvailable(m["ModelFileName"], m["ModelUrl"]),
                Note: m["_note"]));
        }

        // Fallback to legacy flat block when Models[] is empty (older deploys).
        if (result.Count == 0)
        {
            var defaultModality = section["DefaultModality"] ?? "CR";
            result.Add(new ModalitySummaryDto(
                Modality: defaultModality,
                Aliases: defaultModality == "CR" ? new[] { "DX" } : Array.Empty<string>(),
                ModelName: section["ModelName"] ?? "TorchXRayVision-DenseNet121",
                ModelVersion: section["ModelVersion"] ?? "v1",
                Available: IsModelAvailable(section["ModelFileName"], section["ModelUrl"]),
                Note: null));
        }

        return Ok(result);
    }

    /// <summary>Frontend gọi sau khi chạy inference xong để lưu audit.</summary>
    [HttpPost]
    public async Task<ActionResult<AiResultDto>> Save([FromBody] SaveAiResultDto dto)
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
            CreatedBy = GetUserId().ToString(),
        };

        _db.AiLabelingResults.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(await MapAsync(entity.Id));
    }

    /// <summary>BS chấp nhận / từ chối kết quả AI.</summary>
    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<AiResultDto>> Review(Guid id, [FromBody] ReviewDto dto)
    {
        var entity = await _db.AiLabelingResults.FirstOrDefaultAsync(a => a.Id == id);
        if (entity == null) return NotFound(new { message = "Không tìm thấy kết quả AI" });

        entity.ReviewStatus = dto.ReviewStatus;
        entity.AcceptedLabelsJson = dto.AcceptedLabelsJson;
        entity.ReviewNote = dto.ReviewNote;
        entity.ReviewedBy = GetUserId();
        entity.ReviewedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await MapAsync(entity.Id));
    }

    /// <summary>Lịch sử AI runs cho 1 ca chụp.</summary>
    [HttpGet("by-study/{studyUid}")]
    public async Task<ActionResult<List<AiResultDto>>> ByStudy(string studyUid)
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

        return Ok(mapped);
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
}
