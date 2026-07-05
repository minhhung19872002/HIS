using HIS.Application.Common;
using HIS.Application.DTOs.NonDicom;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic Non-DICOM study/image (capture ảnh/video thiết bị không sinh DICOM) — tách khỏi
/// NonDicomController (#202 thin-controller). Trả ServiceOutcome để controller map về
/// IActionResult giữ nguyên status code + body (behavior-preserving); userId truyền từ controller.
/// LƯU Ý: Upload + GetImage KHÔNG tách sang đây được — Upload dùng IFormFileCollection (không
/// tham chiếu được từ HIS.Application) + I/O file streaming, GetImage trả PhysicalFile (không phải
/// shape ServiceOutcome) và không chạm DB. Cả hai ở lại controller; controller vẫn giữ HISDbContext cho Upload.
/// </summary>
public interface INonDicomService
{
    Task<ServiceOutcome> CreateStudyAsync(CreateStudyDto dto, Guid userId);
    Task<ServiceOutcome> GetStudyAsync(Guid studyId);
    Task<ServiceOutcome> UpdateStudyAsync(Guid studyId, UpdateStudyDto dto, Guid userId);
    Task<ServiceOutcome> DeleteImageAsync(Guid imageId);
    Task<ServiceOutcome> WorklistAsync(string? deviceType, DateTime? fromDate, DateTime? toDate);
}
