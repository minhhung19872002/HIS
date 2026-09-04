using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.NonDicom;
using HIS.Application.Interfaces;
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
    private readonly INonDicomService _svc;
    // #202: HISDbContext giữ lại RIÊNG cho Upload — không tách sang Application/Infrastructure được
    // (IFormFileCollection không tham chiếu được từ HIS.Application + streaming file I/O). Xem INonDicomService.
    private readonly HISDbContext _db;
    private readonly IWebHostEnvironment _env;

    public NonDicomController(INonDicomService svc, HISDbContext db, IWebHostEnvironment env)
    {
        _svc = svc;
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


    [HttpPost("studies")]
    public async Task<IActionResult> CreateStudy([FromBody] CreateStudyDto dto)
        => (await _svc.CreateStudyAsync(dto, GetUserId())).ToActionResult();

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

        if (files.Count == 0) return BadRequest(new { error = "VALIDATION_FAILED", message = "Chưa có file" });

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
        // #181: chống path-traversal — fileName phải là tên file thuần (không chứa thư mục / "..").
        if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName))
            return BadRequest();
        var studyDir = Path.GetFullPath(Path.Combine(GetStorageRoot(), studyId.ToString()));
        var path = Path.GetFullPath(Path.Combine(studyDir, fileName));
        // defense-in-depth: path đã resolve phải nằm TRONG thư mục study.
        if (!path.StartsWith(studyDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return BadRequest();
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
        => (await _svc.GetStudyAsync(studyId)).ToActionResult();


    [HttpPut("studies/{studyId:guid}")]
    public async Task<IActionResult> UpdateStudy(Guid studyId, [FromBody] UpdateStudyDto dto)
        => (await _svc.UpdateStudyAsync(studyId, dto, GetUserId())).ToActionResult();

    [HttpDelete("image/{imageId:guid}")]
    public async Task<IActionResult> DeleteImage(Guid imageId)
        => (await _svc.DeleteImageAsync(imageId)).ToActionResult();

    [HttpGet("worklist")]
    public async Task<IActionResult> Worklist(
        [FromQuery] string? deviceType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
        => (await _svc.WorklistAsync(deviceType, fromDate, toDate)).ToActionResult();
}
