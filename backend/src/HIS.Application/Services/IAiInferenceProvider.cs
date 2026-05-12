namespace HIS.Application.Services;

/// <summary>
/// Phase 4 — Vendor adapter pattern. Cho phép tích hợp các nhà cung cấp
/// AI 3rd-party (VinDr, HERA, Aidoc, Lunit, …) qua cùng interface, không
/// phải thay code khi đổi vendor.
///
/// Implementations đăng ký qua `appsettings.AiLabeling.Providers[]` (xem
/// AiProviderRegistry). Khi không có vendor configured, hệ thống vẫn dùng
/// client-side ONNX của Phase 0-3 (LocalBrowserProvider — no-op fake).
/// </summary>
public interface IAiInferenceProvider
{
    /// <summary>Tên hiển thị (vd. "VinDr Lab", "HERA AI", "Local Browser ONNX").</summary>
    string Name { get; }

    /// <summary>Mã định danh duy nhất, dùng làm key trong config (vd. "vindr", "hera", "local").</summary>
    string Id { get; }

    /// <summary>True nếu provider hỗ trợ modality này (CR/DX/CT/US/MG/...).</summary>
    bool SupportsModality(string modality);

    /// <summary>True khi provider sẵn sàng nhận request (api key OK, server up).</summary>
    Task<bool> IsHealthyAsync(CancellationToken ct = default);

    /// <summary>
    /// Gửi ảnh tới vendor và nhận labels. Image có thể là bytes (preview PNG/JPEG
    /// từ Orthanc) hoặc URL (preferred khi vendor self-fetches qua signed URL).
    /// Trả AiInferenceResult với labels chuẩn HIS.
    /// </summary>
    Task<AiInferenceResult> RunInferenceAsync(AiInferenceRequest req, CancellationToken ct = default);
}

public class AiInferenceRequest
{
    public string Modality { get; set; } = string.Empty;
    public string StudyInstanceUid { get; set; } = string.Empty;
    /// <summary>Optional PNG/JPEG bytes (Orthanc preview). Either this or ImageUrl must be set.</summary>
    public byte[]? ImageBytes { get; set; }
    /// <summary>Optional URL pointing at the image (preferred — vendor self-fetches).</summary>
    public string? ImageUrl { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class AiInferenceResult
{
    public List<AiInferenceLabel> Labels { get; set; } = new();
    public int DurationMs { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public string ModelVersion { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

public class AiInferenceLabel
{
    public string Label { get; set; } = string.Empty;
    public string LabelVi { get; set; } = string.Empty;
    public double Score { get; set; }
    /// <summary>Optional bounding box normalized [0..1] (detection models).</summary>
    public AiBbox? Bbox { get; set; }
}

public class AiBbox
{
    public double X { get; set; }
    public double Y { get; set; }
    public double W { get; set; }
    public double H { get; set; }
}
