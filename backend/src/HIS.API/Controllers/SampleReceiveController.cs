using System.Security.Claims;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Sample Receive + Review workflow — N1.16 + N1.17.
/// Tách: Collect (lấy mẫu) → Receive (LIS nhận) → Technician run → Reviewer duyệt.
/// Review bắt buộc ReviewerUserId ≠ TechnicianUserId (4-eyes principle).
/// </summary>
[ApiController]
[Route("api/sample-receive")]
[Authorize]
public class SampleReceiveController : ControllerBase
{
    private readonly HISDbContext _db;
    public SampleReceiveController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách mẫu chờ nhận tại LIS.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] string? keyword)
    {
        var q = _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(d => d.IsSampleCollected
                && d.ReceiveStatus == 0
                && d.Status != 3);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(d => (d.SampleBarcode != null && d.SampleBarcode.Contains(kw))
                || d.ServiceRequest.MedicalRecord.Patient.FullName.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.PatientCode.Contains(kw)
                || d.ServiceRequest.RequestCode.Contains(kw));
        }
        var list = await q.OrderBy(d => d.SampleCollectedAt).Take(300).ToListAsync();
        return Ok(list.Select(d => new
        {
            d.Id,
            d.SampleBarcode,
            d.ServiceRequestId,
            RequestCode = d.ServiceRequest.RequestCode,
            PatientCode = d.ServiceRequest.MedicalRecord.Patient.PatientCode,
            PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName,
            ServiceCode = d.Service.ServiceCode,
            ServiceName = d.Service.ServiceName,
            d.SampleCollectedAt,
            d.CollectedByUserId,
            d.Status,
        }));
    }

    public class ReceiveDto
    {
        public List<Guid> DetailIds { get; set; } = new();
        public string? Note { get; set; }
    }

    /// <summary>Nhận mẫu — đánh dấu ReceiveStatus=1.</summary>
    [HttpPost("accept")]
    [Authorize(Roles = "Admin,LabReceptionist,LabManager,Technician")]
    public async Task<IActionResult> Accept([FromBody] ReceiveDto dto)
    {
        if (dto.DetailIds.Count == 0) return BadRequest(new { message = "Chưa chọn mẫu" });
        var items = await _db.ServiceRequestDetails
            .Where(d => dto.DetailIds.Contains(d.Id) && d.ReceiveStatus == 0)
            .ToListAsync();
        var now = DateTime.Now;
        var uid = GetUserId();
        foreach (var d in items)
        {
            d.ReceiveStatus = 1;
            d.ReceivedByUserId = uid;
            d.ReceivedAt = now;
            d.Status = 1; // Đang thực hiện
            d.UpdatedAt = now;
            d.UpdatedBy = uid.ToString();
        }
        await _db.SaveChangesAsync();
        return Ok(new { received = items.Count });
    }

    public class RejectDto
    {
        public Guid DetailId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    /// <summary>Từ chối mẫu (mẫu không đạt).</summary>
    [HttpPost("reject")]
    [Authorize(Roles = "Admin,LabReceptionist,LabManager,Technician")]
    public async Task<IActionResult> Reject([FromBody] RejectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Phải nhập lý do từ chối" });
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return NotFound();
        d.ReceiveStatus = 2;
        d.RejectReason = dto.Reason;
        d.ReceivedByUserId = GetUserId();
        d.ReceivedAt = DateTime.Now;
        d.UpdatedAt = DateTime.Now;
        d.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { d.Id, d.ReceiveStatus });
    }

    public class RunDto
    {
        public Guid DetailId { get; set; }
        public string? Result { get; set; }
        public string? ResultDescription { get; set; }
    }

    /// <summary>KTV nhập kết quả (chưa duyệt).</summary>
    [HttpPost("technician-run")]
    [Authorize(Roles = "Admin,Technician,LabManager")]
    public async Task<IActionResult> TechnicianRun([FromBody] RunDto dto)
    {
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return NotFound();
        if (d.ReceiveStatus != 1) return BadRequest(new { message = "Mẫu chưa được nhận" });
        var uid = GetUserId();
        d.TechnicianUserId = uid;
        d.TechnicianRunAt = DateTime.Now;
        d.Result = dto.Result;
        d.ResultDescription = dto.ResultDescription;
        d.ResultDate = DateTime.Now;
        d.ResultUserId = uid;
        d.Status = 2; // Có KQ (chờ duyệt)
        d.UpdatedAt = DateTime.Now;
        d.UpdatedBy = uid.ToString();
        await _db.SaveChangesAsync();
        return Ok(new { d.Id, d.TechnicianUserId, d.TechnicianRunAt });
    }

    public class ReviewDto
    {
        public Guid DetailId { get; set; }
        public string? Conclusion { get; set; }
    }

    /// <summary>Reviewer duyệt kết quả. Bắt buộc ReviewerUserId ≠ TechnicianUserId.</summary>
    [HttpPost("review")]
    [Authorize(Roles = "Admin,LabReviewer,LabManager,Radiologist")]
    public async Task<IActionResult> Review([FromBody] ReviewDto dto)
    {
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return NotFound();
        if (d.Status != 2) return BadRequest(new { message = "Mẫu chưa có kết quả để duyệt" });
        var uid = GetUserId();
        if (d.TechnicianUserId.HasValue && d.TechnicianUserId.Value == uid)
            return BadRequest(new { message = "Reviewer phải khác KTV (4-eyes principle)" });
        d.ReviewerUserId = uid;
        d.ReviewedAt = DateTime.Now;
        d.Conclusion = dto.Conclusion ?? d.Conclusion;
        d.UpdatedAt = DateTime.Now;
        d.UpdatedBy = uid.ToString();
        await _db.SaveChangesAsync();
        return Ok(new { d.Id, d.ReviewerUserId, d.ReviewedAt });
    }

    /// <summary>Trạng thái của 1 detail (cho tracking).</summary>
    [HttpGet("status/{detailId:guid}")]
    public async Task<IActionResult> Status(Guid detailId)
    {
        var d = await _db.ServiceRequestDetails
            .Include(x => x.Service)
            .Include(x => x.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(x => x.Id == detailId);
        if (d == null) return NotFound();
        return Ok(new
        {
            d.Id, d.SampleBarcode,
            ServiceName = d.Service.ServiceName,
            PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName,
            d.IsSampleCollected, d.SampleCollectedAt, d.CollectedByUserId,
            d.ReceiveStatus, d.ReceivedByUserId, d.ReceivedAt, d.RejectReason,
            d.TechnicianUserId, d.TechnicianRunAt,
            d.ReviewerUserId, d.ReviewedAt,
            d.Status, d.Result, d.Conclusion,
        });
    }
}
