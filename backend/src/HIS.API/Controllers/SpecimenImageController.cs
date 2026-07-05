using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.SpecimenImage;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    private readonly ISpecimenImageService _svc;
    private readonly IWebHostEnvironment _env;

    public SpecimenImageController(ISpecimenImageService svc, IWebHostEnvironment env)
    {
        _svc = svc;
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
        var newId = Guid.NewGuid();
        var safeFileName = $"{newId}{safeExt}";
        var fullPath = Path.Combine(storageRoot, safeFileName);

        await using (var fs = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(fs);
        }

        return (await _svc.CreateImageAsync(
            newId,
            $"/api/specimen-image/file/{safeFileName}",
            file.FileName,
            file.ContentType,
            file.Length,
            pathologyResultId,
            serviceRequestDetailId,
            serviceRequestId,
            caption,
            magnification,
            source,
            GetUserId())).ToActionResult();
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

        var newId = Guid.NewGuid();
        var safeFileName = $"{newId}{ext}";
        var storageRoot = GetStorageRoot();
        var fullPath = Path.Combine(storageRoot, safeFileName);

        await System.IO.File.WriteAllBytesAsync(fullPath, bytes);

        return (await _svc.CreateImageAsync(
            newId,
            $"/api/specimen-image/file/{safeFileName}",
            safeFileName,
            dto.MimeType,
            bytes.LongLength,
            dto.PathologyResultId,
            dto.ServiceRequestDetailId,
            dto.ServiceRequestId,
            dto.Caption,
            dto.Magnification,
            dto.Source,
            GetUserId())).ToActionResult();
    }

    // ─── List theo result ─────────────────────────────────────────────

    /// <summary>
    /// Lấy danh sách ảnh theo kết quả GPB.
    /// </summary>
    [HttpGet("by-pathology-result/{resultId:guid}")]
    public async Task<IActionResult> ListByPathologyResult(Guid resultId)
        => (await _svc.ListByPathologyResultAsync(resultId)).ToActionResult();

    /// <summary>
    /// Lấy danh sách ảnh theo chi tiết yêu cầu dịch vụ (XN).
    /// </summary>
    [HttpGet("by-service-detail/{detailId:guid}")]
    public async Task<IActionResult> ListByServiceDetail(Guid detailId)
        => (await _svc.ListByServiceDetailAsync(detailId)).ToActionResult();

    /// <summary>
    /// Lấy danh sách ảnh theo ServiceRequest (đơn XN tổng — tất cả detail).
    /// </summary>
    [HttpGet("by-service-request/{requestId:guid}")]
    public async Task<IActionResult> ListByServiceRequest(Guid requestId)
        => (await _svc.ListByServiceRequestAsync(requestId)).ToActionResult();

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
        => (await _svc.UpdateAsync(id, dto, GetUserId())).ToActionResult();

    // ─── Delete ───────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => (await _svc.DeleteAsync(id, GetUserId())).ToActionResult();
}
