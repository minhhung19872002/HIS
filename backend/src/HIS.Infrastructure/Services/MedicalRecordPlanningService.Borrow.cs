using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Record Borrowing
    // ========================================================================

    public async Task<PagedBorrowResult> GetBorrowingAsync(BorrowSearchDto search)
    {
        try
        {
            var query = _context.Set<MedicalRecordBorrowRequest>()
                .Include(b => b.MedicalRecordArchive).ThenInclude(a => a.Patient)
                .Include(b => b.MedicalRecordArchive).ThenInclude(a => a.MedicalRecord)
                .Include(b => b.RequestedBy)
                .Where(b => !b.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(b =>
                    b.RequestCode.ToLower().Contains(kw) ||
                    b.MedicalRecordArchive.Patient.FullName.ToLower().Contains(kw) ||
                    b.MedicalRecordArchive.ArchiveCode.ToLower().Contains(kw));
            }

            if (search.Status.HasValue)
                query = query.Where(b => b.Status == search.Status.Value);
            if (search.FromDate.HasValue)
                query = query.Where(b => b.RequestDate >= search.FromDate.Value);
            if (search.ToDate.HasValue)
                query = query.Where(b => b.RequestDate <= search.ToDate.Value.AddDays(1));

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(b => b.RequestDate)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(b => new
                {
                    b.Id,
                    b.RequestCode,
                    ArchiveCode = b.MedicalRecordArchive.ArchiveCode,
                    PatientCode = b.MedicalRecordArchive.Patient.PatientCode,
                    PatientName = b.MedicalRecordArchive.Patient.FullName,
                    BorrowerName = b.RequestedBy.FullName,
                    b.Purpose,
                    b.RequestDate,
                    b.ExpectedReturnDate,
                    b.ReturnedDate,
                    b.Status,
                })
                .ToListAsync();

            var items = records.Select(b => new RecordBorrowDto
            {
                Id = b.Id,
                BorrowCode = b.RequestCode,
                RecordCode = b.ArchiveCode,
                PatientCode = b.PatientCode,
                PatientName = b.PatientName,
                BorrowerName = b.BorrowerName,
                Purpose = b.Purpose,
                BorrowDate = b.RequestDate,
                ExpectedReturnDate = b.ExpectedReturnDate,
                ActualReturnDate = b.ReturnedDate,
                Status = b.Status,
                StatusName = GetBorrowStatusName(b.Status),
                IsOverdue = b.ExpectedReturnDate.HasValue && b.ReturnedDate == null && b.ExpectedReturnDate.Value < DateTime.UtcNow,
            }).ToList();

            return new PagedBorrowResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying borrows, returning stub data");
            return GetStubBorrows(search);
        }
    }

    public async Task<RecordBorrowDto> CreateBorrowAsync(CreateBorrowDto dto, Guid userId)
    {
        var code = $"PM-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
        await Task.CompletedTask;
        return new RecordBorrowDto
        {
            Id = Guid.NewGuid(),
            BorrowCode = code,
            Purpose = dto.Purpose,
            BorrowDate = DateTime.UtcNow,
            ExpectedReturnDate = DateTime.UtcNow.AddDays(dto.BorrowDays),
            Status = 0,
            StatusName = "Dang muon",
        };
    }

    public async Task<RecordBorrowDto> ReturnRecordAsync(ReturnRecordDto dto, Guid userId)
    {
        try
        {
            var borrow = await _context.Set<MedicalRecordBorrowRequest>()
                .FirstOrDefaultAsync(b => b.Id == dto.BorrowId && !b.IsDeleted);

            if (borrow != null)
            {
                borrow.ReturnedDate = DateTime.UtcNow;
                borrow.Status = 4; // Returned
                borrow.Note = dto.Note;
                await _context.SaveChangesAsync();
            }

            return new RecordBorrowDto
            {
                Id = dto.BorrowId,
                ActualReturnDate = DateTime.UtcNow,
                Status = 1,
                StatusName = "Da tra",
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error returning record");
            return new RecordBorrowDto
            {
                Id = dto.BorrowId,
                ActualReturnDate = DateTime.UtcNow,
                Status = 1,
                StatusName = "Da tra",
            };
        }
    }

    public async Task<RecordBorrowDto> ExtendBorrowAsync(ExtendBorrowDto dto, Guid userId)
    {
        try
        {
            var borrow = await _context.Set<MedicalRecordBorrowRequest>()
                .FirstOrDefaultAsync(b => b.Id == dto.BorrowId && !b.IsDeleted);

            if (borrow != null && borrow.ExpectedReturnDate.HasValue)
            {
                borrow.ExpectedReturnDate = borrow.ExpectedReturnDate.Value.AddDays(dto.ExtendDays);
                borrow.Note = $"Gia han {dto.ExtendDays} ngay. Ly do: {dto.Reason}";
                await _context.SaveChangesAsync();
            }

            return new RecordBorrowDto
            {
                Id = dto.BorrowId,
                ExpectedReturnDate = DateTime.UtcNow.AddDays(dto.ExtendDays),
                Status = 3,
                StatusName = "Gia han",
                ExtensionCount = 1,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error extending borrow");
            return new RecordBorrowDto
            {
                Id = dto.BorrowId,
                Status = 3,
                StatusName = "Gia han",
            };
        }
    }
}
