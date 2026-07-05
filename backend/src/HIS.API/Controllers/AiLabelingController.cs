using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.AiLabeling;
using HIS.Application.Interfaces;
using HIS.Application.Services;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    private readonly IAiLabelingService _svc;
    private readonly IConfiguration _config;
    private readonly IAiReportService _reportService;
    private readonly IAiProviderRegistry _providerRegistry;

    public AiLabelingController(
        IAiLabelingService svc,
        IConfiguration config,
        IAiReportService reportService,
        IAiProviderRegistry providerRegistry)
    {
        _svc = svc;
        _config = config;
        _reportService = reportService;
        _providerRegistry = providerRegistry;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

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
    public async Task<IActionResult> Save([FromBody] SaveAiResultDto dto)
        => (await _svc.SaveAsync(dto, GetUserId())).ToActionResult();

    /// <summary>BS chấp nhận / từ chối kết quả AI.</summary>
    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewDto dto)
        => (await _svc.ReviewAsync(id, dto, GetUserId())).ToActionResult();

    // =========================================================================
    // Phase 3 — Export endpoints
    // =========================================================================

    /// <summary>
    /// Sinh HTML báo cáo AI cho 1 lần phân tích. Frontend mở trong popup,
    /// browser `window.print()` để xuất PDF. Same pattern as PdfGenerationService.
    /// </summary>
    [HttpGet("{id:guid}/export/html")]
    public async Task<IActionResult> ExportHtml(Guid id)
    {
        try
        {
            var bytes = await _reportService.GenerateAiReportHtmlAsync(id);
            return File(bytes, "text/html; charset=utf-8", $"ai-report-{id:N}.html");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("không tồn tại"))
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Build HTML → PDF (iText html2pdf) → ký số bằng cert PFX của BV
    /// (hoặc self-signed cert demo). Trả về PDF đã ký số, BS tải về xem
    /// signature trong Adobe Reader.
    /// </summary>
    [HttpGet("{id:guid}/export/pdf")]
    public async Task<IActionResult> ExportSignedPdf(Guid id)
    {
        try
        {
            var bytes = await _reportService.GenerateAiReportSignedPdfAsync(id);
            return File(bytes, "application/pdf", $"ai-report-{id:N}.pdf");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("không tồn tại"))
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sinh DICOM Structured Report (PS3.10) cho 1 lần phân tích. Trả về
    /// `application/dicom` bytes — viewer hoặc admin có thể tải về.
    /// </summary>
    [HttpGet("{id:guid}/export/dicom-sr")]
    public async Task<IActionResult> ExportDicomSr(Guid id)
    {
        try
        {
            var bytes = await _reportService.GenerateDicomSrAsync(id);
            return File(bytes, "application/dicom", $"ai-sr-{id:N}.dcm");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("không tồn tại"))
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Build DICOM SR + đẩy về Orthanc PACS. SR sẽ xuất hiện trong cùng
    /// Study với CR/CT/US gốc, mọi DICOM viewer khác đọc được.
    /// </summary>
    [HttpPost("{id:guid}/export/dicom-sr/upload")]
    public async Task<IActionResult> UploadDicomSr(Guid id)
    {
        try
        {
            var (instanceId, studyUid) = await _reportService.UploadDicomSrToOrthancAsync(id);
            return Ok(new { instanceId, studyInstanceUid = studyUid });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Upload PACS thất bại: {ex.Message}" });
        }
    }

    /// <summary>
    /// Merge accepted AI findings vào field RadiologyReport.Findings của
    /// báo cáo CĐHA hiện có (đi qua RadiologyExam → RadiologyRequest, hoặc
    /// fallback theo StudyInstanceUID). Idempotent — re-call sẽ replace
    /// AI block cũ thay vì duplicate.
    /// </summary>
    [HttpPost("{id:guid}/merge-to-report")]
    public async Task<IActionResult> MergeToReport(Guid id)
    {
        try
        {
            var reportId = await _reportService.MergeToRadiologyReportAsync(id);
            if (reportId == null)
                return Ok(new { merged = false, message = "Không tìm thấy RadiologyReport tương ứng với study này (báo cáo BS chưa tạo, hoặc không có nhãn nào được chấp nhận)." });
            return Ok(new { merged = true, radiologyReportId = reportId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // =========================================================================
    // Phase 4 — Worklist + Vendor adapter
    // =========================================================================

    /// <summary>
    /// Danh sách ca AI đang chờ BS xem xét. Bao gồm:
    ///  - Records được `AiWorklistService` auto-tạo (ErrorMessage = AUTO_QUEUED,
    ///    LabelsJson rỗng) khi study mới upload nhưng chưa chạy inference.
    ///  - Records đã chạy nhưng `ReviewStatus = 0` (BS chưa accept/reject).
    /// </summary>
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue([FromQuery] int limit = 50)
        => (await _svc.GetQueueAsync(limit)).ToActionResult();

    /// <summary>
    /// List các AI vendor đã cấu hình trong appsettings.AiLabeling.Providers[].
    /// Frontend dùng để hiển thị dropdown "Chọn vendor" cho server-side
    /// inference flow (alternative to local browser ONNX).
    /// </summary>
    [HttpGet("providers")]
    public ActionResult<IReadOnlyList<ProviderDto>> GetProviders()
    {
        var providers = _providerRegistry.All;
        var result = providers.Select(p =>
        {
            // Probe a small set of standard modalities to see which the provider claims.
            var supported = new[] { "CR", "DX", "CT", "MR", "US", "MG", "NM" }
                .Where(p.SupportsModality)
                .ToArray();
            return new ProviderDto(p.Id, p.Name, supported);
        }).ToList();
        return Ok(result);
    }

    /// <summary>
    /// Trigger server-side inference qua 1 vendor cụ thể. Vendor nhận ImageUrl
    /// (preferred — vendor self-fetches) hoặc bytes (rarely). Kết quả được lưu
    /// audit y như client-side inference, BS review tiếp như bình thường.
    /// </summary>
    [HttpPost("run-via-provider")]
    public async Task<IActionResult> RunViaProvider([FromBody] RunViaProviderDto dto, CancellationToken ct)
        => (await _svc.RunViaProviderAsync(dto, GetUserId(), ct)).ToActionResult();

    // =========================================================================

    /// <summary>Lịch sử AI runs cho 1 ca chụp.</summary>
    [HttpGet("by-study/{studyUid}")]
    public async Task<IActionResult> ByStudy(string studyUid)
        => (await _svc.ByStudyAsync(studyUid)).ToActionResult();
}
