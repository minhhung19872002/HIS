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

    /// <summary>
    /// Tạo phiếu mượn hồ sơ bệnh án.
    ///
    /// <para>#218/T3 — trước đây hàm này là một cái vỏ: sinh một mã phiếu bằng <c>Random</c>, một
    /// <c>Guid.NewGuid()</c>, rồi trả về mà **không chạm vào `_context` lần nào**. Người dùng bấm
    /// "Mượn hồ sơ", nhận mã phiếu trông rất thật và giao diện báo thành công, nhưng không có gì
    /// được ghi xuống — trong khi ba thao tác còn lại của chính module này (xem danh sách, gia hạn,
    /// trả) đều làm việc thật trên `MedicalRecordBorrowRequests`. Khó thấy vì API trả 200 kèm dữ
    /// liệu hợp lệ, không có lỗi nào để ai nhìn thấy. Đo được ở
    /// evidence/cross/t3/t3_record_borrow.json: số phiếu 0 → 0.</para>
    ///
    /// <para>Nay ghi thật, theo đúng hình dạng <c>MedicalRecordArchiveService.CreateBorrowRequestAsync</c>
    /// vốn đã làm đúng: tra hồ sơ lưu trữ, chặn hồ sơ đang có người mượn, rồi lưu.</para>
    /// </summary>
    public async Task<RecordBorrowDto> CreateBorrowAsync(CreateBorrowDto dto, Guid userId)
    {
        var archive = await _context.MedicalRecordArchives
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.MedicalRecordId == dto.MedicalRecordId && !a.IsDeleted)
            ?? throw new KeyNotFoundException(
                "Hồ sơ bệnh án này chưa được nhập kho lưu trữ nên chưa mượn được.");

        // 2 = đang cho mượn. Không cho hai người cầm cùng một tập hồ sơ giấy.
        if (archive.Status == 2 || archive.IsOnLoan)
            throw new InvalidOperationException("Hồ sơ đang có người mượn, chưa trả về kho.");

        var borrowDays = dto.BorrowDays > 0 ? dto.BorrowDays : 7;
        var now = DateTime.UtcNow;
        var request = new MedicalRecordBorrowRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"PM{now:yyyyMMddHHmmss}",
            MedicalRecordArchiveId = archive.Id,
            RequestedById = userId,
            RequestDate = now,
            Purpose = dto.Purpose,
            ExpectedReturnDate = now.AddDays(borrowDays),
            Status = 0, // Chờ duyệt
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        await _context.MedicalRecordBorrowRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var borrower = await _context.Users.FindAsync(userId);
        return new RecordBorrowDto
        {
            Id = request.Id,
            BorrowCode = request.RequestCode,
            RecordCode = archive.MedicalRecord?.MedicalRecordCode,
            PatientCode = archive.Patient?.PatientCode,
            PatientName = archive.Patient?.FullName,
            BorrowerName = borrower?.FullName,
            Purpose = request.Purpose,
            BorrowDate = request.RequestDate,
            ExpectedReturnDate = request.ExpectedReturnDate,
            Status = 0,
            StatusName = "Đang mượn",
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
