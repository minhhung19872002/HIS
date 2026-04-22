using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Sổ biên lai khai báo — N1.13.
/// </summary>
[ApiController]
[Route("api/receipt-book")]
[Authorize]
public class ReceiptBookController : ControllerBase
{
    private readonly HISDbContext _db;
    public ReceiptBookController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? keyword,
        [FromQuery] int? receiptType,
        [FromQuery] int? status,
        [FromQuery] int? fiscalYear)
    {
        var q = _db.ReceiptBooks.Include(b => b.Department).AsQueryable();
        if (receiptType.HasValue) q = q.Where(b => b.ReceiptType == receiptType.Value);
        if (status.HasValue) q = q.Where(b => b.Status == status.Value);
        if (fiscalYear.HasValue) q = q.Where(b => b.FiscalYear == fiscalYear.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(b => b.BookCode.Contains(kw) || b.BookName.Contains(kw)
                || (b.Series != null && b.Series.Contains(kw))
                || (b.RegistrationNumber != null && b.RegistrationNumber.Contains(kw)));
        }
        var list = await q.OrderByDescending(b => b.FiscalYear).ThenBy(b => b.BookCode).ToListAsync();
        return Ok(list.Select(b => new
        {
            b.Id, b.BookCode, b.BookName, b.ReceiptType,
            b.Series, b.TemplateCode,
            b.StartNumber, b.EndNumber, b.CurrentNumber,
            Remaining = b.EndNumber - b.CurrentNumber + 1,
            Used = b.CurrentNumber - b.StartNumber,
            b.FiscalYear, b.IssueDate, b.RegisteredDate, b.RegistrationNumber,
            b.Status, b.ClosedDate, b.ClosedReason,
            DepartmentName = b.Department != null ? b.Department.DepartmentName : null,
            b.DepartmentId, b.CashierId,
            b.Notes, b.IsActive,
        }));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var b = await _db.ReceiptBooks.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return b == null ? NotFound() : Ok(b);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Save([FromBody] ReceiptBook dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BookCode) || string.IsNullOrWhiteSpace(dto.BookName))
            return BadRequest(new { message = "Mã và tên sổ là bắt buộc" });
        if (dto.StartNumber <= 0 || dto.EndNumber < dto.StartNumber)
            return BadRequest(new { message = "Dải số bắt đầu/kết thúc không hợp lệ" });

        var uid = GetUserId();
        var existing = dto.Id != Guid.Empty ? await _db.ReceiptBooks.FindAsync(dto.Id) : null;
        if (existing == null)
        {
            dto.Id = Guid.NewGuid();
            if (dto.CurrentNumber <= 0) dto.CurrentNumber = dto.StartNumber;
            dto.CreatedAt = DateTime.Now;
            dto.CreatedBy = uid.ToString();
            _db.ReceiptBooks.Add(dto);
        }
        else
        {
            existing.BookCode = dto.BookCode;
            existing.BookName = dto.BookName;
            existing.ReceiptType = dto.ReceiptType;
            existing.Series = dto.Series;
            existing.TemplateCode = dto.TemplateCode;
            existing.StartNumber = dto.StartNumber;
            existing.EndNumber = dto.EndNumber;
            existing.CurrentNumber = dto.CurrentNumber > 0 ? dto.CurrentNumber : existing.CurrentNumber;
            existing.FiscalYear = dto.FiscalYear;
            existing.IssueDate = dto.IssueDate;
            existing.RegisteredDate = dto.RegisteredDate;
            existing.RegistrationNumber = dto.RegistrationNumber;
            existing.Status = dto.Status;
            existing.ClosedDate = dto.ClosedDate;
            existing.ClosedReason = dto.ClosedReason;
            existing.DepartmentId = dto.DepartmentId;
            existing.CashierId = dto.CashierId;
            existing.Notes = dto.Notes;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = uid.ToString();
        }
        await _db.SaveChangesAsync();
        return Ok(new { id = existing?.Id ?? dto.Id });
    }

    [HttpPost("{id:guid}/close")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Close(Guid id, [FromBody] CloseDto dto)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return NotFound();
        b.Status = 2;
        b.ClosedDate = DateTime.Now;
        b.ClosedReason = dto.Reason;
        b.UpdatedAt = DateTime.Now;
        b.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { b.Id, b.Status });
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Activate(Guid id)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return NotFound();
        b.Status = 1;
        b.UpdatedAt = DateTime.Now;
        b.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { b.Id, b.Status });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return NotFound();
        if (b.CurrentNumber > b.StartNumber)
            return BadRequest(new { message = "Sổ đã có phát hành — không thể xóa, nhấn Đóng sổ." });
        b.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public class CloseDto
    {
        public string? Reason { get; set; }
    }
}
