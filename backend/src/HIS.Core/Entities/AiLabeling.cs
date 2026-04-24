namespace HIS.Core.Entities;

/// <summary>
/// AI labeling — kết quả phân tích tự động trên ảnh DICOM.
/// Mỗi lần BS click "Phân tích AI" trong viewer → 1 record này.
/// Yêu cầu audit trail theo TT 54/2017 và TT 32/2023:
/// mọi quyết định AI phải lưu ai chạy, khi nào, model gì, kết quả gì,
/// BS chấp nhận hay từ chối.
/// </summary>
public class AiLabelingResult : BaseEntity
{
    /// <summary>Study Instance UID của ca chụp được phân tích.</summary>
    public string StudyInstanceUID { get; set; } = string.Empty;

    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public Guid? RadiologyRequestId { get; set; }
    public virtual RadiologyRequest? RadiologyRequest { get; set; }

    /// <summary>Tên model (vd: TorchXRayVision-DenseNet121-NIH14).</summary>
    public string ModelName { get; set; } = string.Empty;
    public string? ModelVersion { get; set; }
    public string? ModelUrl { get; set; }

    /// <summary>Inference time in ms.</summary>
    public int DurationMs { get; set; }

    /// <summary>
    /// JSON array of { label, labelVi, score (0-1), bbox? (x,y,w,h) }.
    /// Example:
    ///   [{"label":"Pneumonia","labelVi":"Viêm phổi","score":0.87},
    ///    {"label":"Effusion","labelVi":"Tràn dịch","score":0.62}]
    /// </summary>
    public string LabelsJson { get; set; } = "[]";

    /// <summary>
    /// 0 = Chờ BS xem xét
    /// 1 = BS chấp nhận toàn bộ (copy vào báo cáo)
    /// 2 = BS chấp nhận một phần (xem AcceptedLabelsJson)
    /// 3 = BS từ chối toàn bộ (không ý nghĩa)
    /// </summary>
    public int ReviewStatus { get; set; }
    public string? AcceptedLabelsJson { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }

    /// <summary>Image input info for reproducibility.</summary>
    public string? InputImageHash { get; set; }
    public int? InputWidth { get; set; }
    public int? InputHeight { get; set; }

    /// <summary>Error message if inference failed.</summary>
    public string? ErrorMessage { get; set; }
}
