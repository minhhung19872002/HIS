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
        int InputHeight);

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
    public IActionResult GetModel()
    {
        // ONNX Runtime's fetch() inside the browser doesn't carry JWT, so we
        // expose the model anonymously. Audit trail + ReviewStatus in the
        // POST /ai-labeling endpoint is where accountability lives.
        var section = _config.GetSection("AiLabeling");
        var fileName = section["ModelFileName"] ?? "chestxray_densenet121_res224_all.onnx";
        fileName = Path.GetFileName(fileName);

        var path = Path.Combine(AppContext.BaseDirectory, "wwwroot", "ai-models", fileName);
        if (!System.IO.File.Exists(path))
        {
            var alt = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ai-models", fileName);
            if (System.IO.File.Exists(alt)) path = alt;
            else return NotFound(new { message = $"Model file '{fileName}' not found on server" });
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
    /// Admin có thể override qua appsettings.json mục AiLabeling.
    /// </summary>
    [HttpGet("config")]
    public ActionResult<ModelConfigDto> GetConfig()
    {
        var section = _config.GetSection("AiLabeling");
        // Defaults: TorchXRayVision NIH14 labels, 224x224 input.
        var labels = section.GetSection("Labels").Get<string[]>() ?? new[]
        {
            "Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion",
            "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass",
            "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"
        };
        var labelsVi = section.GetSection("LabelsVi").Get<string[]>() ?? new[]
        {
            "Xẹp phổi", "Tim to", "Đông đặc phổi", "Phù phổi", "Tràn dịch màng phổi",
            "Khí phế thũng", "Xơ phổi", "Thoát vị", "Thâm nhiễm", "Khối u",
            "Nốt phổi", "Dày màng phổi", "Viêm phổi", "Tràn khí màng phổi"
        };

        // Default to the embedded model endpoint if admin hasn't overridden via env var.
        var modelUrl = section["ModelUrl"];
        if (string.IsNullOrEmpty(modelUrl))
            modelUrl = $"{Request.Scheme}://{Request.Host}/api/ai-labeling/model";

        return Ok(new ModelConfigDto(
            modelUrl,
            section["ModelName"] ?? "TorchXRayVision-DenseNet121",
            section["ModelVersion"] ?? "NIH14-v1",
            labels,
            labelsVi,
            section.GetValue<int?>("InputWidth") ?? 224,
            section.GetValue<int?>("InputHeight") ?? 224));
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
