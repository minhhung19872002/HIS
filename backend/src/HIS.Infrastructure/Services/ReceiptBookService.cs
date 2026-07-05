using HIS.Application.Common;
using HIS.Application.DTOs.ReceiptBook;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Sổ biên lai khai báo — N1.13.
/// Logic tách khỏi ReceiptBookController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ NGUYÊN;
/// NextNumber dùng UPDLOCK/ROWLOCK transaction giữ nguyên để tránh race condition;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public class ReceiptBookService : IReceiptBookService
{
    private readonly HISDbContext _db;
    public ReceiptBookService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> SearchAsync(string? keyword, int? receiptType, int? status, int? fiscalYear)
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
        return ServiceOutcome.Ok(list.Select(b => new
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
            b.Notes, b.CollectionReason, b.IsActive,
        }));
    }

    public async Task<ServiceOutcome> GetByIdAsync(Guid id)
    {
        var b = await _db.ReceiptBooks.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return b == null ? ServiceOutcome.NotFound() : ServiceOutcome.Ok(b);
    }

    public async Task<ServiceOutcome> SaveAsync(ReceiptBook dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.BookCode) || string.IsNullOrWhiteSpace(dto.BookName))
            return ServiceOutcome.Bad("Mã và tên sổ là bắt buộc");
        if (dto.StartNumber <= 0 || dto.EndNumber < dto.StartNumber)
            return ServiceOutcome.Bad("Dải số bắt đầu/kết thúc không hợp lệ");

        var existing = dto.Id != Guid.Empty ? await _db.ReceiptBooks.FindAsync(dto.Id) : null;
        Guid finalId;
        if (existing == null)
        {
            dto.Id = Guid.NewGuid();
            dto.IsDeleted = false;
            if (dto.CurrentNumber <= 0) dto.CurrentNumber = dto.StartNumber;
            dto.CreatedAt = DateTime.Now;
            dto.CreatedBy = userId.ToString();
            _db.ReceiptBooks.Add(dto);
            finalId = dto.Id;
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
            existing.CollectionReason = dto.CollectionReason;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = userId.ToString();
            finalId = existing.Id;
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = finalId });
    }

    public async Task<ServiceOutcome> CloseAsync(Guid id, CloseDto dto, Guid userId)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return ServiceOutcome.NotFound();
        b.Status = 2;
        b.ClosedDate = DateTime.Now;
        b.ClosedReason = dto.Reason;
        b.UpdatedAt = DateTime.Now;
        b.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { b.Id, b.Status });
    }

    public async Task<ServiceOutcome> ActivateAsync(Guid id, Guid userId)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return ServiceOutcome.NotFound();
        b.Status = 1;
        b.UpdatedAt = DateTime.Now;
        b.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { b.Id, b.Status });
    }

    public async Task<ServiceOutcome> NextNumberAsync(Guid id, Guid userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var b = await _db.ReceiptBooks
                .FromSqlRaw("SELECT * FROM ReceiptBooks WITH (UPDLOCK, ROWLOCK) WHERE Id = {0}", id)
                .FirstOrDefaultAsync();
            if (b == null) { await tx.RollbackAsync(); return ServiceOutcome.NotFound(); }
            if (b.Status != 1)
                return ServiceOutcome.Bad("Sổ biên lai chưa được kích hoạt");
            if (b.CurrentNumber > b.EndNumber)
                return ServiceOutcome.Bad("Sổ biên lai đã hết số — vui lòng đóng sổ và mở sổ mới");

            var number = b.CurrentNumber;
            b.CurrentNumber++;
            b.UpdatedAt = DateTime.Now;
            b.UpdatedBy = userId.ToString();
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return ServiceOutcome.Ok(new
            {
                receiptBookId = b.Id,
                series = b.Series,
                number,
                formatted = $"{b.Series}{number:D7}",
                remaining = b.EndNumber - b.CurrentNumber + 1,
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ServiceOutcome> DeleteAsync(Guid id)
    {
        var b = await _db.ReceiptBooks.FindAsync(id);
        if (b == null) return ServiceOutcome.NotFound();
        if (b.CurrentNumber > b.StartNumber)
            return ServiceOutcome.Bad("Sổ đã có phát hành — không thể xóa, nhấn Đóng sổ.");
        b.IsDeleted = true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.NoContent();
    }
}
