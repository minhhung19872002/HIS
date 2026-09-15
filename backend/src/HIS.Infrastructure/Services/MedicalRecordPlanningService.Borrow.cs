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
                IsOverdue = b.Status == 3 && b.ExpectedReturnDate.HasValue && b.ExpectedReturnDate.Value < DateTime.UtcNow,
            }).ToList();

            return new PagedBorrowResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying borrows");
            throw;
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
        if (archive.Status == 3)
            throw new InvalidOperationException("Hồ sơ lưu trữ đã hủy, không cho mượn được.");
        // QA-R2: phiếu cũ chưa xong (chờ duyệt / đã duyệt / đang mượn) cũng là đang giữ hồ sơ.
        // Trước đây phiếu tạo ở đây để Status=0 và không đổi trạng thái kho ⇒ bấm "Mượn" hai lần
        // trên cùng một hồ sơ ra hai phiếu "Đang mượn" song song.
        if (await _context.MedicalRecordBorrowRequests.AnyAsync(b =>
                b.MedicalRecordArchiveId == archive.Id && !b.IsDeleted && (b.Status == 0 || b.Status == 1 || b.Status == 3)))
            throw new InvalidOperationException("Hồ sơ đang có phiếu mượn chưa trả, không tạo thêm phiếu được.");

        var borrowDays = dto.BorrowDays > 0 ? dto.BorrowDays : 7;
        var now = DateTime.UtcNow;
        // Phòng KHTH lập phiếu tại quầy = giao hồ sơ luôn (màn này không có bước duyệt riêng),
        // nên ghi thẳng trạng thái 3 "Đang mượn" theo bộ mã dùng chung với MedicalRecordArchiveService
        // (0 chờ duyệt · 1 đã duyệt · 2 từ chối · 3 đang mượn · 4 đã trả) và khoá hồ sơ trong kho.
        var request = new MedicalRecordBorrowRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"PM{now:yyyyMMddHHmmss}",
            MedicalRecordArchiveId = archive.Id,
            RequestedById = userId,
            RequestDate = now,
            Purpose = dto.Purpose,
            ExpectedReturnDate = now.AddDays(borrowDays),
            Status = 3, // Đang mượn
            ApprovedById = userId,
            ApprovedDate = now,
            BorrowedDate = now,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        archive.Status = 2; // Đang mượn
        archive.UpdatedAt = now;
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
            Status = request.Status,
            StatusName = GetBorrowStatusName(request.Status),
        };
    }

    /// <summary>
    /// Trả hồ sơ. QA-R2: trước đây không tìm thấy phiếu vẫn trả "Da tra", trả hai lần vẫn thành
    /// công (ghi đè ngày trả), lỗi bị nuốt trong catch rồi cũng báo "Da tra", và hồ sơ trong kho
    /// không được mở khoá lại.
    /// </summary>
    public async Task<RecordBorrowDto> ReturnRecordAsync(ReturnRecordDto dto, Guid userId)
    {
        var borrow = await _context.MedicalRecordBorrowRequests
            .Include(b => b.MedicalRecordArchive)
            .FirstOrDefaultAsync(b => b.Id == dto.BorrowId && !b.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu mượn");
        if (borrow.Status == 4)
            throw new InvalidOperationException("Phiếu mượn này đã trả hồ sơ trước đó.");
        if (borrow.Status != 3)
            throw new InvalidOperationException("Phiếu mượn chưa giao hồ sơ, không có gì để trả.");

        var now = DateTime.UtcNow;
        borrow.ReturnedDate = now;
        borrow.Status = 4; // Đã trả
        if (!string.IsNullOrWhiteSpace(dto.Note))
            borrow.Note = string.IsNullOrWhiteSpace(borrow.Note) ? dto.Note : $"{borrow.Note}\n{dto.Note}";
        borrow.UpdatedAt = now;
        borrow.UpdatedBy = userId.ToString();
        if (borrow.MedicalRecordArchive != null && borrow.MedicalRecordArchive.Status == 2)
        {
            borrow.MedicalRecordArchive.Status = 1; // Đã lưu (trả về kho)
            borrow.MedicalRecordArchive.UpdatedAt = now;
        }
        await _context.SaveChangesAsync();

        return new RecordBorrowDto
        {
            Id = borrow.Id,
            BorrowCode = borrow.RequestCode,
            Purpose = borrow.Purpose,
            BorrowDate = borrow.RequestDate,
            ExpectedReturnDate = borrow.ExpectedReturnDate,
            ActualReturnDate = now,
            Status = borrow.Status,
            StatusName = GetBorrowStatusName(borrow.Status),
        };
    }

    /// <summary>
    /// Gia hạn mượn. QA-R2: trước đây nhận số ngày âm (lùi hạn trả), gia hạn được cả phiếu đã trả,
    /// trả về hạn bịa (<c>now + ngày</c>) thay vì hạn thật, và không tìm thấy phiếu vẫn báo thành công.
    /// </summary>
    public async Task<RecordBorrowDto> ExtendBorrowAsync(ExtendBorrowDto dto, Guid userId)
    {
        if (dto.ExtendDays <= 0)
            throw new InvalidOperationException("Số ngày gia hạn phải lớn hơn 0.");

        var borrow = await _context.MedicalRecordBorrowRequests
            .FirstOrDefaultAsync(b => b.Id == dto.BorrowId && !b.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu mượn");
        if (borrow.Status != 3)
            throw new InvalidOperationException("Chỉ gia hạn được phiếu đang mượn.");

        var now = DateTime.UtcNow;
        borrow.ExpectedReturnDate = (borrow.ExpectedReturnDate ?? now).AddDays(dto.ExtendDays);
        var extendNote = $"Gia han {dto.ExtendDays} ngay. Ly do: {dto.Reason}";
        borrow.Note = string.IsNullOrWhiteSpace(borrow.Note) ? extendNote : $"{borrow.Note}\n{extendNote}";
        borrow.UpdatedAt = now;
        borrow.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new RecordBorrowDto
        {
            Id = borrow.Id,
            BorrowCode = borrow.RequestCode,
            Purpose = borrow.Purpose,
            BorrowDate = borrow.RequestDate,
            ExpectedReturnDate = borrow.ExpectedReturnDate,
            Status = borrow.Status,
            StatusName = GetBorrowStatusName(borrow.Status),
            IsOverdue = borrow.ExpectedReturnDate < now,
        };
    }
}
