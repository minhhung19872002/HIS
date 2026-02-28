using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/archives")]
[Authorize]
public class MedicalRecordArchiveController : ControllerBase
{
    private readonly IMedicalRecordArchiveService _archiveService;

    public MedicalRecordArchiveController(IMedicalRecordArchiveService archiveService)
    {
        _archiveService = archiveService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    /// <summary>
    /// Tìm kiếm hồ sơ lưu trữ
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedArchiveResult>> Search([FromQuery] ArchiveSearchDto search)
    {
        var result = await _archiveService.SearchArchivesAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hồ sơ lưu trữ
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ArchiveDto>> Create([FromBody] CreateArchiveDto dto)
    {
        var result = await _archiveService.CreateArchiveAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật vị trí lưu trữ
    /// </summary>
    [HttpPut("{archiveId}/location")]
    public async Task<ActionResult<ArchiveDto>> UpdateLocation(Guid archiveId, [FromBody] UpdateArchiveLocationDto dto)
    {
        var result = await _archiveService.UpdateArchiveLocationAsync(archiveId, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tự động lưu trữ hồ sơ hoàn thành > N ngày
    /// </summary>
    [HttpPost("auto-archive")]
    public async Task<ActionResult<List<ArchiveDto>>> AutoArchive([FromQuery] int inactiveDays = 30)
    {
        var result = await _archiveService.AutoArchiveCompletedRecordsAsync(inactiveDays, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thống kê lưu trữ
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ArchiveStatsDto>> Stats()
    {
        var result = await _archiveService.GetArchiveStatsAsync();
        return Ok(result);
    }

    // === Borrow Requests ===

    /// <summary>
    /// Tạo phiếu mượn
    /// </summary>
    [HttpPost("borrow")]
    public async Task<ActionResult<BorrowRequestDto>> CreateBorrowRequest([FromBody] CreateArchiveBorrowDto dto)
    {
        var result = await _archiveService.CreateBorrowRequestAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Duyệt/từ chối phiếu mượn
    /// </summary>
    [HttpPut("borrow/{requestId}/approve")]
    public async Task<ActionResult<BorrowRequestDto>> ApproveBorrowRequest(Guid requestId, [FromQuery] bool approve, [FromQuery] string? rejectReason)
    {
        var result = await _archiveService.ApproveBorrowRequestAsync(requestId, approve, rejectReason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận giao hồ sơ
    /// </summary>
    [HttpPut("borrow/{requestId}/borrow")]
    public async Task<ActionResult<BorrowRequestDto>> RecordBorrow(Guid requestId)
    {
        var result = await _archiveService.RecordBorrowAsync(requestId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận trả hồ sơ
    /// </summary>
    [HttpPut("borrow/{requestId}/return")]
    public async Task<ActionResult<BorrowRequestDto>> RecordReturn(Guid requestId)
    {
        var result = await _archiveService.RecordReturnAsync(requestId, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Danh sách phiếu mượn
    /// </summary>
    [HttpGet("borrow")]
    public async Task<ActionResult<List<BorrowRequestDto>>> GetBorrowRequests([FromQuery] Guid? archiveId, [FromQuery] int? status)
    {
        var result = await _archiveService.GetBorrowRequestsAsync(archiveId, status);
        return Ok(result);
    }

    /// <summary>
    /// Phiếu mượn quá hạn
    /// </summary>
    [HttpGet("borrow/overdue")]
    public async Task<ActionResult<List<BorrowRequestDto>>> GetOverdueBorrows()
    {
        var result = await _archiveService.GetOverdueBorrowsAsync();
        return Ok(result);
    }
}
