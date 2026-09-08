using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Ví giấy tờ — HSMT I.2 #8: lưu CCCD, thẻ BHYT, giấy chuyển tuyến, giấy hẹn, giấy ra viện, toa
/// thuốc, hoá đơn.
///
/// <para>Giấy tờ là của riêng từng tài khoản. Không có đường nào để một tài khoản chạm vào tệp của
/// tài khoản khác: mọi truy vấn đều kèm điều kiện <c>AccountId</c>, và tệp trên đĩa mang tên ngẫu
/// nhiên nên đoán đường dẫn cũng vô nghĩa.</para>
/// </summary>
[ApiController]
[Route("api/v1/patient/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly DocumentVault _vault;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(
        PatientAppDbContext db, DocumentVault vault, ILogger<DocumentsController> logger)
    {
        _db = db;
        _vault = vault;
        _logger = logger;
    }

    /// <summary>Danh sách giấy tờ, kèm dung lượng đã dùng để app hiện thanh hạn mức.</summary>
    [HttpGet]
    [Produces("application/json")]
    public async Task<IActionResult> List([FromQuery] string? category, CancellationToken ct)
    {
        var accountId = User.GetAccountId();

        var query = _db.Documents.AsNoTracking().Where(d => d.AccountId == accountId);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);

        var documents = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DocumentDto
            {
                Id = d.Id,
                Category = d.Category,
                Title = d.Title,
                FileName = d.FileName,
                ContentType = d.ContentType,
                SizeBytes = d.SizeBytes,
                Source = d.Source,
                Note = d.Note,
                CreatedAt = d.CreatedAt,
            })
            .ToListAsync(ct);

        var used = await _db.Documents
            .Where(d => d.AccountId == accountId)
            .SumAsync(d => (long?)d.SizeBytes, ct) ?? 0;

        return Ok(ApiResponse<DocumentListDto>.Ok(new DocumentListDto
        {
            Items = documents,
            UsedBytes = used,
            QuotaBytes = _vault.QuotaBytes,
            MaxFileBytes = _vault.MaxFileBytes,
        }));
    }

    /// <summary>Thêm một giấy tờ. Nhận multipart để app gửi thẳng ảnh chụp hoặc tệp PDF.</summary>
    [HttpPost]
    [Produces("application/json")]
    [RequestSizeLimit(32 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] string? category,
        [FromForm] string? title,
        [FromForm] string? note,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse.Fail("Vui lòng chọn tệp cần lưu."));

        if (file.Length > _vault.MaxFileBytes)
            return BadRequest(ApiResponse.Fail(
                $"Tệp vượt quá {_vault.MaxFileBytes / 1024 / 1024} MB. "
                + "Vui lòng chụp lại với chất lượng thấp hơn hoặc tách thành nhiều tệp."));

        if (!IsAllowedType(file.ContentType))
            return BadRequest(ApiResponse.Fail(
                "Chỉ nhận ảnh (JPG, PNG, HEIC) hoặc tệp PDF."));

        var accountId = User.GetAccountId();

        var used = await _db.Documents
            .Where(d => d.AccountId == accountId)
            .SumAsync(d => (long?)d.SizeBytes, ct) ?? 0;

        if (used + file.Length > _vault.QuotaBytes)
            return BadRequest(ApiResponse.Fail(
                "Ví giấy tờ đã đầy. Vui lòng xoá bớt giấy tờ cũ trước khi thêm mới.",
                "QUOTA_EXCEEDED"));

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        var content = stream.ToArray();

        var stored = await _vault.WriteAsync(accountId, content, ct);

        var document = new AppDocument
        {
            AccountId = accountId,
            Category = AppDocumentCategory.IsValid(category) ? category! : AppDocumentCategory.Other,
            Title = string.IsNullOrWhiteSpace(title) ? file.FileName : title!.Trim(),
            FileName = file.FileName,
            ContentType = file.ContentType,
            SizeBytes = content.Length,
            StoragePath = stored.RelativePath,
            Nonce = stored.Nonce,
            Tag = stored.Tag,
            Sha256 = stored.Sha256,
            Note = note?.Trim(),
        };

        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Đã lưu giấy tờ {DocumentId} ({Bytes} byte).", document.Id, content.Length);

        return Ok(ApiResponse<DocumentDto>.Ok(new DocumentDto
        {
            Id = document.Id,
            Category = document.Category,
            Title = document.Title,
            FileName = document.FileName,
            ContentType = document.ContentType,
            SizeBytes = document.SizeBytes,
            Source = document.Source,
            Note = document.Note,
            CreatedAt = document.CreatedAt,
        }, "Đã lưu vào ví giấy tờ."));
    }

    /// <summary>Tải nội dung một giấy tờ. Giải mã tại máy chủ rồi trả thẳng byte cho app.</summary>
    [HttpGet("{documentId:guid}/content")]
    public async Task<IActionResult> Content(Guid documentId, CancellationToken ct)
    {
        var document = await _db.Documents.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId && d.AccountId == User.GetAccountId(), ct);

        if (document is null) return NotFound(ApiResponse.Fail("Không tìm thấy giấy tờ."));

        var content = await _vault.ReadAsync(document.StoragePath, document.Nonce, document.Tag, ct);
        if (content is null)
            return StatusCode(StatusCodes.Status410Gone,
                ApiResponse.Fail("Tệp không còn trên hệ thống. Vui lòng tải lại giấy tờ này."));

        return File(content, document.ContentType, document.FileName);
    }

    [HttpDelete("{documentId:guid}")]
    [Produces("application/json")]
    public async Task<IActionResult> Delete(Guid documentId, CancellationToken ct)
    {
        var document = await _db.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.AccountId == User.GetAccountId(), ct);

        if (document is null) return NotFound(ApiResponse.Fail("Không tìm thấy giấy tờ."));

        // Xoá bản ghi trước, tệp sau. Ngược lại thì lỡ hỏng giữa chừng sẽ còn một bản ghi trỏ vào
        // tệp không tồn tại — người dùng bấm vào chỉ thấy lỗi mà không xoá đi được.
        _db.Documents.Remove(document);
        await _db.SaveChangesAsync(ct);
        _vault.Delete(document.StoragePath);

        return Ok(ApiResponse.Ok("Đã xoá giấy tờ."));
    }

    /// <summary>
    /// Chỉ nhận ảnh và PDF. Không nhận tệp tuỳ ý vì ví giấy tờ không phải nơi chứa dữ liệu bất kỳ,
    /// và một tệp thực thi nằm trong đó chỉ tạo thêm bề mặt tấn công.
    /// </summary>
    private static bool IsAllowedType(string? contentType) => (contentType ?? "").ToLowerInvariant()
        is "image/jpeg" or "image/jpg" or "image/png" or "image/heic" or "image/heif"
        or "image/webp" or "application/pdf";
}

public class DocumentDto
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DocumentListDto
{
    public List<DocumentDto> Items { get; set; } = new();
    public long UsedBytes { get; set; }
    public long QuotaBytes { get; set; }
    public long MaxFileBytes { get; set; }
}
