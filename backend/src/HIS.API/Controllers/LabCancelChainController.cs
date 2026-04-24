using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// M3.14 — Hủy chuỗi ngược workflow XN.
/// BN đã có kết quả → muốn hủy mẫu phải:
///   1) Hủy duyệt kết quả (Approved → Completed)
///   2) Hủy kết quả + hủy xác nhận mẫu (Completed/Processing → SampleCollected)
///   3) Hủy lấy mẫu (SampleCollected → Pending)
/// Mỗi endpoint validate bước trước phải được hủy trước.
/// </summary>
[ApiController]
[Route("api/laboratory/cancel-chain")]
[Authorize]
public class LabCancelChainController : ControllerBase
{
    private readonly HISDbContext _db;

    public LabCancelChainController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public record CancelRequest(Guid LabRequestItemId, string Reason);
    public record CancelResponse(bool Success, int NewStatus, string NewStatusLabel, string Message);

    private static string StatusLabel(int s) => s switch
    {
        0 => "Chờ lấy mẫu",
        1 => "Đã lấy mẫu",
        2 => "Đang xử lý",
        3 => "Đã có KQ",
        4 => "Đã duyệt",
        5 => "Bị từ chối",
        _ => "Khác"
    };

    /// <summary>
    /// Step 1: Hủy duyệt kết quả (Approved → Completed).
    /// KTV hoặc Reviewer undo the approval.
    /// </summary>
    [HttpPost("cancel-approval")]
    public async Task<ActionResult<CancelResponse>> CancelApproval([FromBody] CancelRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Phải ghi lý do hủy duyệt" });

        var item = await _db.Set<LabRequestItem>().FirstOrDefaultAsync(i => i.Id == dto.LabRequestItemId);
        if (item == null) return NotFound(new { message = "Không tìm thấy xét nghiệm" });

        if (item.Status != 4)
            return BadRequest(new CancelResponse(false, item.Status, StatusLabel(item.Status),
                $"Chỉ hủy duyệt được khi trạng thái = Đã duyệt. Hiện tại: {StatusLabel(item.Status)}"));

        item.Status = 3; // Completed
        item.ApprovedAt = null;
        item.ApprovedBy = null;
        item.TechnicianNote = (item.TechnicianNote ?? "") + $"\n[Hủy duyệt {DateTime.Now:dd/MM HH:mm} - {GetUserId()}]: {dto.Reason}";
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new CancelResponse(true, item.Status, StatusLabel(item.Status), "Đã hủy duyệt kết quả"));
    }

    /// <summary>
    /// Step 2: Hủy kết quả + hủy xác nhận mẫu (Completed/Processing → SampleCollected).
    /// Xóa LabResults rồi set Status = 1.
    /// </summary>
    [HttpPost("cancel-result")]
    public async Task<ActionResult<CancelResponse>> CancelResult([FromBody] CancelRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Phải ghi lý do hủy kết quả" });

        var item = await _db.Set<LabRequestItem>()
            .Include(i => i.Results)
            .FirstOrDefaultAsync(i => i.Id == dto.LabRequestItemId);
        if (item == null) return NotFound(new { message = "Không tìm thấy xét nghiệm" });

        if (item.Status == 4)
            return BadRequest(new CancelResponse(false, item.Status, StatusLabel(item.Status),
                "KQ đã duyệt. Phải hủy duyệt trước (bước 1)"));
        if (item.Status < 2)
            return BadRequest(new CancelResponse(false, item.Status, StatusLabel(item.Status),
                $"Không có kết quả để hủy. Hiện tại: {StatusLabel(item.Status)}"));

        // Soft-delete results
        foreach (var r in item.Results.Where(r => !r.IsDeleted))
        {
            r.IsDeleted = true;
            r.UpdatedAt = DateTime.UtcNow;
        }

        item.Status = 1; // SampleCollected (giữ mẫu)
        item.ProcessingStartAt = null;
        item.ProcessingEndAt = null;
        item.ProcessedBy = null;
        item.TechnicianNote = (item.TechnicianNote ?? "") + $"\n[Hủy KQ {DateTime.Now:dd/MM HH:mm} - {GetUserId()}]: {dto.Reason}";
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new CancelResponse(true, item.Status, StatusLabel(item.Status),
            $"Đã hủy {item.Results.Count(r => r.IsDeleted)} dòng KQ + rollback sang 'Đã lấy mẫu'"));
    }

    /// <summary>
    /// Step 3: Hủy lấy mẫu (SampleCollected → Pending).
    /// </summary>
    [HttpPost("cancel-collection")]
    public async Task<ActionResult<CancelResponse>> CancelCollection([FromBody] CancelRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Phải ghi lý do hủy lấy mẫu" });

        var item = await _db.Set<LabRequestItem>().FirstOrDefaultAsync(i => i.Id == dto.LabRequestItemId);
        if (item == null) return NotFound(new { message = "Không tìm thấy xét nghiệm" });

        if (item.Status >= 2)
            return BadRequest(new CancelResponse(false, item.Status, StatusLabel(item.Status),
                "Mẫu đã xử lý/có KQ. Phải hủy KQ trước (bước 2)"));
        if (item.Status < 1)
            return BadRequest(new CancelResponse(false, item.Status, StatusLabel(item.Status),
                "Mẫu chưa lấy, không cần hủy"));

        item.Status = 0; // Pending
        item.SampleCollectedAt = null;
        item.SampleCollectedBy = null;
        item.SampleBarcode = null;
        item.SampleLocation = null;
        item.SampleCondition = null;
        item.TechnicianNote = (item.TechnicianNote ?? "") + $"\n[Hủy lấy mẫu {DateTime.Now:dd/MM HH:mm} - {GetUserId()}]: {dto.Reason}";
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new CancelResponse(true, item.Status, StatusLabel(item.Status), "Đã hủy lấy mẫu"));
    }
}
