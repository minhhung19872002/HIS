using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/non-dicom")]
[Authorize]
public class NonDicomController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IWebHostEnvironment _env;

    public NonDicomController(HISDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetStorageRoot()
    {
        var root = Path.Combine(_env.ContentRootPath, "App_Data", "non-dicom");
        Directory.CreateDirectory(root);
        return root;
    }

    public record CreateStudyDto(
        Guid ServiceRequestDetailId,
        Guid PatientId,
        string DeviceType,
        string? DeviceName,
        Guid? RoomId,
        string? Description);

    [HttpPost("studies")]
    public async Task<IActionResult> CreateStudy([FromBody] CreateStudyDto dto)
    {
        var study = new NonDicomStudy
        {
            Id = Guid.NewGuid(),
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            PatientId = dto.PatientId,
            DeviceType = dto.DeviceType,
            DeviceName = dto.DeviceName,
            RoomId = dto.RoomId,
            PerformedByUserId = GetUserId(),
            CapturedAt = DateTime.UtcNow,
            Status = 0,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = GetUserId().ToString()
        };
        _db.NonDicomStudies.Add(study);
        await _db.SaveChangesAsync();
        return Ok(new { id = study.Id, status = study.Status });
    }

    /// <summary>
    /// Upload ảnh/video capture từ camera web.
    /// Body: multipart/form-data, field "files[]" + "thumbnails[]" (base64 JSON).
    /// </summary>
    [HttpPost("studies/{studyId:guid}/upload")]
    [RequestSizeLimit(500_000_000)] // 500MB cho video
    public async Task<IActionResult> Upload(Guid studyId, [FromForm] IFormFileCollection files)
    {
        var study = await _db.NonDicomStudies.FirstOrDefaultAsync(s => s.Id == studyId)
            ?? throw new KeyNotFoundException();

        if (files.Count == 0) return BadRequest(new { message = "Chưa có file" });

        var storageRoot = GetStorageRoot();
        var studyDir = Path.Combine(storageRoot, studyId.ToString());
        Directory.CreateDirectory(studyDir);

        var saved = new List<object>();
        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName);
            var safeName = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(studyDir, safeName);
            await using (var fs = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(fs);
            }

            var mediaType = file.ContentType?.StartsWith("video") == true ? "video"
                : file.ContentType?.StartsWith("image") == true ? "image"
                : file.ContentType == "application/pdf" ? "pdf" : "other";

            var image = new NonDicomImage
            {
                Id = Guid.NewGuid(),
                NonDicomStudyId = studyId,
                MediaType = mediaType,
                FileName = file.FileName,
                FilePath = $"/api/non-dicom/image/{studyId}/{safeName}",
                FileSize = file.Length,
                MimeType = file.ContentType,
                SortOrder = saved.Count,
                IncludeInReport = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = GetUserId().ToString()
            };
            _db.NonDicomImages.Add(image);
            saved.Add(new { image.Id, image.MediaType, image.FilePath });
        }
        await _db.SaveChangesAsync();
        return Ok(new { uploaded = saved.Count, images = saved });
    }

    [HttpGet("image/{studyId:guid}/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetImage(Guid studyId, string fileName)
    {
        var path = Path.Combine(GetStorageRoot(), studyId.ToString(), fileName);
        if (!System.IO.File.Exists(path)) return NotFound();
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var mime = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
        return PhysicalFile(path, mime);
    }

    [HttpGet("studies/{studyId:guid}")]
    public async Task<IActionResult> GetStudy(Guid studyId)
    {
        var study = await _db.NonDicomStudies
            .Include(s => s.Patient)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(s => s.Id == studyId);
        if (study == null) return NotFound();
        return Ok(new
        {
            study.Id,
            study.PatientId,
            PatientName = study.Patient?.FullName,
            study.DeviceType,
            study.DeviceName,
            study.CapturedAt,
            study.Status,
            study.Description,
            study.Conclusion,
            study.Findings,
            Images = study.Images.OrderBy(i => i.SortOrder).Select(i => new
            {
                i.Id,
                i.MediaType,
                i.FileName,
                i.FilePath,
                i.MimeType,
                i.SortOrder,
                i.Annotation,
                i.IncludeInReport,
            })
        });
    }

    public record UpdateStudyDto(string? Description, string? Findings, string? Conclusion, int? Status);

    [HttpPut("studies/{studyId:guid}")]
    public async Task<IActionResult> UpdateStudy(Guid studyId, [FromBody] UpdateStudyDto dto)
    {
        var study = await _db.NonDicomStudies.FirstOrDefaultAsync(s => s.Id == studyId)
            ?? throw new KeyNotFoundException();
        if (dto.Description != null) study.Description = dto.Description;
        if (dto.Findings != null) study.Findings = dto.Findings;
        if (dto.Conclusion != null) study.Conclusion = dto.Conclusion;
        if (dto.Status.HasValue) study.Status = dto.Status.Value;
        study.UpdatedAt = DateTime.UtcNow;
        study.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("image/{imageId:guid}")]
    public async Task<IActionResult> DeleteImage(Guid imageId)
    {
        var img = await _db.NonDicomImages.FirstOrDefaultAsync(i => i.Id == imageId)
            ?? throw new KeyNotFoundException();
        _db.NonDicomImages.Remove(img);
        await _db.SaveChangesAsync();
        // File thực để lại (tránh mất khi rollback), GC background task sẽ dọn sau
        return Ok(new { success = true });
    }

    [HttpGet("worklist")]
    public async Task<IActionResult> Worklist(
        [FromQuery] string? deviceType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var q = _db.NonDicomStudies
            .Include(s => s.Patient)
            .Include(s => s.Images)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(deviceType)) q = q.Where(s => s.DeviceType == deviceType);
        if (fromDate.HasValue) q = q.Where(s => s.CapturedAt >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(s => s.CapturedAt <= toDate.Value.AddDays(1));
        var list = await q
            .OrderByDescending(s => s.CapturedAt)
            .Take(200)
            .ToListAsync();
        return Ok(list.Select(s => new
        {
            s.Id,
            PatientName = s.Patient?.FullName,
            PatientCode = s.Patient?.PatientCode,
            s.DeviceType,
            s.DeviceName,
            s.CapturedAt,
            s.Status,
            ImageCount = s.Images.Count,
            HasConclusion = !string.IsNullOrWhiteSpace(s.Conclusion)
        }));
    }
}
