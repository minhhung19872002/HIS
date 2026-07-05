using HIS.Application.Common;
using HIS.Application.DTOs.SpecimenImage;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic gắn ảnh bệnh phẩm / KQ XN / GPB — tách khỏi SpecimenImageController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message + Vietnamese string giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
///
/// LƯU Ý phạm vi (xem concerns): phần ghi/đọc FILE vật lý (IFormFile, IWebHostEnvironment, PhysicalFile)
/// là mối quan tâm tầng API nên GIỮ Ở CONTROLLER; service chỉ nhận metadata đã tính để dựng entity + lưu DB.
/// </summary>
public interface ISpecimenImageService
{
    /// <summary>
    /// Dựng SpecimenImage entity từ metadata (file đã được controller ghi ra đĩa) + lưu DB.
    /// Dùng chung cho cả Upload (multipart) và UploadBase64. Trả Ok(projection ảnh vừa tạo).
    /// </summary>
    Task<ServiceOutcome> CreateImageAsync(
        Guid newId,
        string imagePath,
        string fileName,
        string? mimeType,
        long fileSize,
        Guid? pathologyResultId,
        Guid? serviceRequestDetailId,
        Guid? serviceRequestId,
        string? caption,
        string? magnification,
        string source,
        Guid userId);

    Task<ServiceOutcome> ListByPathologyResultAsync(Guid resultId);

    Task<ServiceOutcome> ListByServiceDetailAsync(Guid detailId);

    Task<ServiceOutcome> ListByServiceRequestAsync(Guid requestId);

    Task<ServiceOutcome> UpdateAsync(Guid id, UpdateImageDto dto, Guid userId);

    Task<ServiceOutcome> DeleteAsync(Guid id, Guid userId);
}
