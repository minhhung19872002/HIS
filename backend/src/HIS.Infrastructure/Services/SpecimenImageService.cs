using HIS.Application.Common;
using HIS.Application.DTOs.SpecimenImage;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic gắn ảnh bệnh phẩm / KQ XN / GPB — tách khỏi SpecimenImageController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message + Vietnamese string giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
///
/// Phần ghi/đọc FILE vật lý (IFormFile, IWebHostEnvironment, PhysicalFile) GIỮ Ở CONTROLLER (API concern);
/// service chỉ dựng entity từ metadata đã tính + lưu DB.
/// </summary>
public class SpecimenImageService : ISpecimenImageService
{
    private readonly HISDbContext _db;
    public SpecimenImageService(HISDbContext db) { _db = db; }

    // ─── Create (dùng chung cho Upload + UploadBase64, file đã ghi ở controller) ───

    public async Task<ServiceOutcome> CreateImageAsync(
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
        Guid userId)
    {
        var entity = new SpecimenImage
        {
            Id = newId,
            PathologyResultId = pathologyResultId,
            ServiceRequestDetailId = serviceRequestDetailId,
            ServiceRequestId = serviceRequestId,
            ImagePath = imagePath,
            FileName = fileName,
            MimeType = mimeType,
            FileSize = fileSize,
            Caption = caption,
            Magnification = magnification,
            Source = source,
            CapturedAt = DateTime.UtcNow,
            SortOrder = 0,
            IncludeInReport = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };

        _db.SpecimenImages.Add(entity);
        await _db.SaveChangesAsync();

        return ServiceOutcome.Ok(new
        {
            entity.Id,
            entity.ImagePath,
            entity.FileName,
            entity.FileSize,
            entity.Caption,
            entity.Source,
            entity.CapturedAt,
        });
    }

    // ─── List theo result ─────────────────────────────────────────────

    /// <summary>
    /// Lấy danh sách ảnh theo kết quả GPB.
    /// </summary>
    public async Task<ServiceOutcome> ListByPathologyResultAsync(Guid resultId)
    {
        var images = await _db.SpecimenImages
            .Where(i => i.PathologyResultId == resultId && !i.IsDeleted)
            .OrderBy(i => i.SortOrder).ThenBy(i => i.CapturedAt)
            .Select(i => new
            {
                i.Id,
                i.ImagePath,
                i.FileName,
                i.MimeType,
                i.FileSize,
                i.Caption,
                i.Source,
                i.Magnification,
                i.SortOrder,
                i.IncludeInReport,
                i.CapturedAt,
            })
            .ToListAsync();
        return ServiceOutcome.Ok(images);
    }

    /// <summary>
    /// Lấy danh sách ảnh theo chi tiết yêu cầu dịch vụ (XN).
    /// </summary>
    public async Task<ServiceOutcome> ListByServiceDetailAsync(Guid detailId)
    {
        var images = await _db.SpecimenImages
            .Where(i => i.ServiceRequestDetailId == detailId && !i.IsDeleted)
            .OrderBy(i => i.SortOrder).ThenBy(i => i.CapturedAt)
            .Select(i => new
            {
                i.Id,
                i.ImagePath,
                i.FileName,
                i.MimeType,
                i.FileSize,
                i.Caption,
                i.Source,
                i.Magnification,
                i.SortOrder,
                i.IncludeInReport,
                i.CapturedAt,
            })
            .ToListAsync();
        return ServiceOutcome.Ok(images);
    }

    /// <summary>
    /// Lấy danh sách ảnh theo ServiceRequest (đơn XN tổng — tất cả detail).
    /// </summary>
    public async Task<ServiceOutcome> ListByServiceRequestAsync(Guid requestId)
    {
        var images = await _db.SpecimenImages
            .Where(i => i.ServiceRequestId == requestId && !i.IsDeleted)
            .OrderBy(i => i.SortOrder).ThenBy(i => i.CapturedAt)
            .Select(i => new
            {
                i.Id,
                i.ImagePath,
                i.FileName,
                i.MimeType,
                i.FileSize,
                i.Caption,
                i.Source,
                i.Magnification,
                i.SortOrder,
                i.IncludeInReport,
                i.CapturedAt,
            })
            .ToListAsync();
        return ServiceOutcome.Ok(images);
    }

    // ─── Update metadata ──────────────────────────────────────────────

    public async Task<ServiceOutcome> UpdateAsync(Guid id, UpdateImageDto dto, Guid userId)
    {
        var img = await _db.SpecimenImages.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
        if (img == null) return ServiceOutcome.NotFound();

        if (dto.Caption != null) img.Caption = dto.Caption;
        if (dto.Magnification != null) img.Magnification = dto.Magnification;
        if (dto.IncludeInReport.HasValue) img.IncludeInReport = dto.IncludeInReport.Value;
        if (dto.SortOrder.HasValue) img.SortOrder = dto.SortOrder.Value;
        img.UpdatedAt = DateTime.UtcNow;
        img.UpdatedBy = userId.ToString();

        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ─── Delete ───────────────────────────────────────────────────────

    public async Task<ServiceOutcome> DeleteAsync(Guid id, Guid userId)
    {
        var img = await _db.SpecimenImages.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
        if (img == null) return ServiceOutcome.NotFound();

        img.IsDeleted = true;
        img.UpdatedAt = DateTime.UtcNow;
        img.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();

        // File vật lý: soft-delete chỉ ẩn record. GC task dọn sau.
        return ServiceOutcome.OkEmpty();
    }
}
