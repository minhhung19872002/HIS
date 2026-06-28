using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Dtos.SpecimenImage;

namespace HIS.API.Controllers;

/// <summary>
/// API gắn ảnh kính hiển vi / upload ảnh vào kết quả XN / giải phẫu bệnh.
/// Issues: #134 (gắn ảnh KQ), #133/#113 (web-upload + webcam fallback).
///
/// Điểm tích hợp camera device-side native (SDK máy kính) sau khi có phần cứng:
/// - POST /api/specimen-image/upload sẽ nhận ảnh từ SDK thay vì form upload
/// - Thêm Source = "microscope" + Magnification cho ảnh từ kính
/// </summary>
[ApiController]
[Route("api/specimen-image")]
[Authorize]
public class SpecimenImageController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IWebHostEnvironment _env;

    public SpecimenImageController(HISDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetStorageRoot()
    {
        var root = Path.Combine(_env.ContentRootPath, "App_Data", "specimen-images");
        Directory.CreateDirectory(root);
        return root;
    }

    // ─── Upload ──────────────────────────────────────────────────────


    /// <summary>
    /// Upload ảnh (file) đính kèm vào KQ XN / GPB.
    /// Form: multipart — field "file" (IFormFile) + JSON metadata fields.
    /// Tự động tạo thumbnail 200×200 nếu là ảnh JPEG/PNG (feature tiếp theo).
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)] // 50MB
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] Guid? pathologyResultId,
        [FromForm] Guid? serviceRequestDetailId,
        [FromForm] Guid? serviceRequestId,
        [FromForm] string? caption,
        [FromForm] string? magnification,
        [FromForm] string source = "manual")
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa có file ảnh" });

        if (pathologyResultId == null && serviceRequestDetailId == null)
            return BadRequest(new { message = "Phải truyền pathologyResultId hoặc serviceRequestDetailId" });

        var ext = Path.GetExtension(file.FileName);
        var safeExt = new[] { ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp" }
            .Contains(ext.ToLowerInvariant()) ? ext.ToLowerInvariant() : ".jpg";

        var storageRoot = GetStorageRoot();
        var userId = GetUserId();
        var newId = Guid.NewGuid();
        var safeFileName = $"{newId}{safeExt}";
        var fullPath = Path.Combine(storageRoot, safeFileName);

        await using (var fs = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(fs);
        }

        var entity = new SpecimenImage
        {
            Id = newId,
            PathologyResultId = pathologyResultId,
            ServiceRequestDetailId = serviceRequestDetailId,
            ServiceRequestId = serviceRequestId,
            ImagePath = $"/api/specimen-image/file/{safeFileName}",
            FileName = file.FileName,
            MimeType = file.ContentType,
            FileSize = file.Length,
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

        return Ok(new
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

    // ─── Upload base64 (từ webcam getUserMedia) ──────────────────────


    /// <summary>
    /// Upload ảnh dưới dạng base64 (từ webcam getUserMedia canvas.toDataURL).
    /// </summary>
    [HttpPost("upload-base64")]
    public async Task<IActionResult> UploadBase64([FromBody] UploadBase64Dto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Base64Data))
            return BadRequest(new { message = "Chưa có dữ liệu ảnh" });

        if (dto.PathologyResultId == null && dto.ServiceRequestDetailId == null)
            return BadRequest(new { message = "Phải truyền pathologyResultId hoặc serviceRequestDetailId" });

        // Strip data URI prefix if present: "data:image/jpeg;base64,..."
        var rawBase64 = dto.Base64Data.Contains(',')
            ? dto.Base64Data.Split(',', 2)[1]
            : dto.Base64Data;

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(rawBase64);
        }
        catch
        {
            return BadRequest(new { message = "Dữ liệu base64 không hợp lệ" });
        }

        var ext = dto.MimeType switch
        {
            "image/jpeg" => ".jpg",
            "image/png"  => ".png",
            "image/webp" => ".webp",
            _ => ".jpg"
        };

        var userId = GetUserId();
        var newId = Guid.NewGuid();
        var safeFileName = $"{newId}{ext}";
        var storageRoot = GetStorageRoot();
        var fullPath = Path.Combine(storageRoot, safeFileName);

        await System.IO.File.WriteAllBytesAsync(fullPath, bytes);

        var entity = new SpecimenImage
        {
            Id = newId,
            PathologyResultId = dto.PathologyResultId,
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            ServiceRequestId = dto.ServiceRequestId,
            ImagePath = $"/api/specimen-image/file/{safeFileName}",
            FileName = safeFileName,
            MimeType = dto.MimeType,
            FileSize = bytes.LongLength,
            Caption = dto.Caption,
            Magnification = dto.Magnification,
            Source = dto.Source,
            CapturedAt = DateTime.UtcNow,
            SortOrder = 0,
            IncludeInReport = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };

        _db.SpecimenImages.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(new
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
    [HttpGet("by-pathology-result/{resultId:guid}")]
    public async Task<IActionResult> ListByPathologyResult(Guid resultId)
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
        return Ok(images);
    }

    /// <summary>
    /// Lấy danh sách ảnh theo chi tiết yêu cầu dịch vụ (XN).
    /// </summary>
    [HttpGet("by-service-detail/{detailId:guid}")]
    public async Task<IActionResult> ListByServiceDetail(Guid detailId)
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
        return Ok(images);
    }

    /// <summary>
    /// Lấy danh sách ảnh theo ServiceRequest (đơn XN tổng — tất cả detail).
    /// </summary>
    [HttpGet("by-service-request/{requestId:guid}")]
    public async Task<IActionResult> ListByServiceRequest(Guid requestId)
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
        return Ok(images);
    }

    // ─── Serve file ───────────────────────────────────────────────────

    [HttpGet("file/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetFile(string fileName)
    {
        // Chống path traversal
        if (fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\'))
            return BadRequest();

        var path = Path.Combine(GetStorageRoot(), fileName);
        if (!System.IO.File.Exists(path)) return NotFound();

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var mime = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"  => "image/png",
            ".webp" => "image/webp",
            ".tif" or ".tiff" => "image/tiff",
            ".bmp"  => "image/bmp",
            _ => "application/octet-stream"
        };
        return PhysicalFile(path, mime);
    }

    // ─── Update metadata ──────────────────────────────────────────────


    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateImageDto dto)
    {
        var img = await _db.SpecimenImages.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
        if (img == null) return NotFound();

        if (dto.Caption != null) img.Caption = dto.Caption;
        if (dto.Magnification != null) img.Magnification = dto.Magnification;
        if (dto.IncludeInReport.HasValue) img.IncludeInReport = dto.IncludeInReport.Value;
        if (dto.SortOrder.HasValue) img.SortOrder = dto.SortOrder.Value;
        img.UpdatedAt = DateTime.UtcNow;
        img.UpdatedBy = GetUserId().ToString();

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ─── Delete ───────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var img = await _db.SpecimenImages.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
        if (img == null) return NotFound();

        img.IsDeleted = true;
        img.UpdatedAt = DateTime.UtcNow;
        img.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();

        // File vật lý: soft-delete chỉ ẩn record. GC task dọn sau.
        return Ok(new { success = true });
    }
}
