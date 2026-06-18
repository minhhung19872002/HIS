namespace HIS.Core.Entities;

/// <summary>
/// Ảnh bệnh phẩm gắn vào kết quả XN / giải phẫu bệnh / yêu cầu dịch vụ.
/// Nguồn: chụp kính hiển vi (microscope), upload thủ công từ web, hoặc webcam (getUserMedia).
/// Tích hợp camera device-side native (SDK máy kính) gắn vào đây sau khi có phần cứng.
/// Issues: #134 (gắn ảnh KQ), #133/#113 (web-upload + webcam fallback).
/// </summary>
public class SpecimenImage : BaseEntity
{
    /// <summary>
    /// ID phiếu yêu cầu GPB (PathologyRequest.Id).
    /// Dùng khi gắn ảnh trực tiếp vào phiếu GPB từ drawer (không cần có kết quả trước).
    /// </summary>
    public Guid? PathologyRequestId { get; set; }

    /// <summary>
    /// ID kết quả giải phẫu bệnh (PathologyResult.Id).
    /// Null nếu gắn vào PathologyRequest hoặc ServiceRequestDetail.
    /// </summary>
    public Guid? PathologyResultId { get; set; }

    /// <summary>
    /// ID chi tiết yêu cầu dịch vụ (ServiceRequestDetail.Id) — dùng cho KQ XN.
    /// Null nếu gắn vào GPB.
    /// </summary>
    public Guid? ServiceRequestDetailId { get; set; }

    /// <summary>
    /// ID yêu cầu dịch vụ cha (ServiceRequest.Id) — cho phép query nhanh theo order.
    /// Denormalized để tránh JOIN khi list ảnh theo đơn.
    /// </summary>
    public Guid? ServiceRequestId { get; set; }

    /// <summary>
    /// Đường dẫn file (tương đối, vd: /api/specimen-image/file/{id}) hoặc URL tuyệt đối (R2).
    /// </summary>
    public string? ImagePath { get; set; }

    /// <summary>
    /// Thumbnail base64 nhỏ (≤200×200 px) để render nhanh trong worklist — KHÔNG lưu ảnh full.
    /// </summary>
    public string? ThumbnailBase64 { get; set; }

    /// <summary>
    /// Chú thích cho ảnh (vd: "Tế bào ung thư biểu mô — x400").
    /// </summary>
    public string? Caption { get; set; }

    /// <summary>
    /// Thời điểm chụp/upload.
    /// </summary>
    public DateTime CapturedAt { get; set; }

    /// <summary>
    /// Nguồn ảnh: microscope | manual | webcam.
    /// - microscope: ảnh từ camera gắn kính hiển vi (device-side, cần SDK — defer đến khi có phần cứng).
    /// - manual: upload file thủ công từ web (đã làm trong #134/#133).
    /// - webcam: chụp từ webcam qua getUserMedia (đã làm trong #133).
    /// </summary>
    public string Source { get; set; } = "manual";

    /// <summary>Tên file gốc khi upload.</summary>
    public string? FileName { get; set; }

    /// <summary>MIME type (image/jpeg, image/png, image/webp...).</summary>
    public string? MimeType { get; set; }

    /// <summary>Kích thước file tính bằng byte.</summary>
    public long FileSize { get; set; }

    /// <summary>Độ phóng đại kính hiển vi (x40, x100, x400...) — điền khi source=microscope.</summary>
    public string? Magnification { get; set; }

    /// <summary>Thứ tự hiển thị trong gallery.</summary>
    public int SortOrder { get; set; }

    /// <summary>Đính kèm vào phiếu in kết quả hay không.</summary>
    public bool IncludeInReport { get; set; } = true;
}
