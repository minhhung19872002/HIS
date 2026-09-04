using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Record Handover
    // ========================================================================

    public async Task<PagedHandoverResult> GetHandoverAsync(HandoverSearchDto search)
    {
        try
        {
            var query = _context.MedicalRecordArchives
                .Include(a => a.MedicalRecord)
                .Include(a => a.Patient)
                .Include(a => a.Department)
                .Include(a => a.ArchivedBy)
                .Where(a => !a.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(a =>
                    a.ArchiveCode.ToLower().Contains(kw) ||
                    a.Patient.FullName.ToLower().Contains(kw) ||
                    a.Patient.PatientCode.ToLower().Contains(kw));
            }

            if (search.DepartmentId.HasValue)
                query = query.Where(a => a.DepartmentId == search.DepartmentId.Value);
            // Lọc theo trạng thái BÀN GIAO, không phải trạng thái kho lưu trữ (xem chú thích
            // `HandoverStatus` ở entity). Chưa vào luồng bàn giao ⇒ coi như 0 (nháp).
            if (search.Status.HasValue)
                query = query.Where(a => (a.HandoverStatus ?? 0) == search.Status.Value);

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(a => a.ArchivedDate ?? a.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(a => new
                {
                    a.Id,
                    a.ArchiveCode,
                    RecordCode = a.MedicalRecord.MedicalRecordCode,
                    PatientCode = a.Patient.PatientCode,
                    PatientName = a.Patient.FullName,
                    DepartmentName = a.Department != null ? a.Department.DepartmentName : "",
                    ArchivedByName = a.ArchivedBy != null ? a.ArchivedBy.FullName : "",
                    a.ArchivedDate,
                    a.HandoverStatus,
                    a.HandoverSubmittedAt,
                    a.HandoverApprovedAt,
                    a.HandoverNote,
                })
                .ToListAsync();

            var items = records.Select(a => new HandoverRecordDto
            {
                Id = a.Id,
                HandoverCode = a.ArchiveCode,
                RecordCode = a.RecordCode,
                PatientCode = a.PatientCode,
                PatientName = a.PatientName,
                DepartmentName = a.DepartmentName,
                SubmittedByName = a.ArchivedByName,
                // Hồ sơ chưa vào luồng bàn giao thì HandoverStatus là NULL ⇒ coi như 0 (nháp).
                SubmittedDate = a.HandoverSubmittedAt ?? a.ArchivedDate,
                ApprovedDate = a.HandoverApprovedAt,
                Status = a.HandoverStatus ?? 0,
                StatusName = GetHandoverStatusName(a.HandoverStatus ?? 0),
                Note = a.HandoverNote,
            }).ToList();

            return new PagedHandoverResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying handovers, returning stub data");
            return GetStubHandovers(search);
        }
    }

    /// <summary>
    /// Khoa gửi hồ sơ bệnh án về phòng kế hoạch tổng hợp để bàn giao vào kho lưu trữ.
    ///
    /// <para>#218/T3 — trước đây là hàm rỗng: sinh mã bằng <c>new Random()</c>,
    /// <c>await Task.CompletedTask</c>, rồi trả DTO "Đã gửi" như thể đã lưu. Đo được ở
    /// evidence/cross/t3/t3_record_planning.json: HTTP 200, không dòng nào đổi.</para>
    ///
    /// <para>Ghi vào <c>HandoverStatus</c> — cột RIÊNG của luồng bàn giao (migration 178), KHÔNG
    /// phải <c>Status</c> của kho lưu trữ: hai bộ nghĩa xung đột ở giá trị 2
    /// (kho = "đang mượn", bàn giao = "đã duyệt"), ghi nhầm sẽ đánh dấu hồ sơ thành đang-cho-mượn.</para>
    /// </summary>
    public async Task<HandoverRecordDto> SubmitHandoverAsync(SubmitHandoverDto dto, Guid userId)
    {
        if (dto.MedicalRecordIds == null || dto.MedicalRecordIds.Count == 0)
            throw new InvalidOperationException("Chưa chọn hồ sơ nào để bàn giao.");

        var archives = await _context.MedicalRecordArchives
            .Where(a => !a.IsDeleted && dto.MedicalRecordIds.Contains(a.MedicalRecordId))
            .ToListAsync();

        if (archives.Count == 0)
            throw new KeyNotFoundException(
                "Không tìm thấy hồ sơ lưu trữ tương ứng. Hồ sơ phải được đưa vào kho lưu trữ trước khi bàn giao.");

        // Đã duyệt rồi thì không gửi lại — bài học "một luật thi hành ở một cửa, bỏ trống ở cửa
        // bên cạnh": chặn ngay ở cửa gửi thay vì để cửa duyệt tự xoay xở.
        var daDuyet = archives.Where(a => a.HandoverStatus == 2).ToList();
        if (daDuyet.Count > 0)
            throw new InvalidOperationException(
                $"Có {daDuyet.Count} hồ sơ đã được duyệt bàn giao trước đó, không gửi lại được: "
                + string.Join(", ", daDuyet.Take(5).Select(a => a.ArchiveCode)));

        var now = DateTime.UtcNow;
        foreach (var a in archives)
        {
            a.HandoverStatus = 1; // Đã gửi
            a.HandoverSubmittedAt = now;
            a.HandoverSubmittedById = userId;
            a.HandoverNote = dto.Note;
            a.HandoverRejectReason = null; // gửi lại sau khi bị từ chối thì xoá lý do cũ
            a.UpdatedAt = now;
        }
        await _context.SaveChangesAsync();

        var first = archives[0];
        return new HandoverRecordDto
        {
            Id = first.Id,
            HandoverCode = first.ArchiveCode,
            SubmittedDate = now,
            Status = 1,
            StatusName = GetHandoverStatusName(1),
            TotalForms = dto.MedicalRecordIds.Count,
            CompletedForms = archives.Count,
            Note = dto.Note,
        };
    }

    /// <summary>
    /// Phòng kế hoạch tổng hợp duyệt (hoặc từ chối) một hồ sơ đã gửi bàn giao.
    /// <c>HandoverId</c> là Id của dòng <c>MedicalRecordArchives</c>, khớp với Id mà
    /// <see cref="GetHandoverAsync"/> trả ra.
    ///
    /// <para>#218/T3 — trước đây cũng là hàm rỗng, trả "Đã duyệt" mà không ghi gì.</para>
    /// </summary>
    public async Task<HandoverRecordDto> ApproveHandoverAsync(ApproveHandoverDto dto, Guid userId)
    {
        var archive = await _context.MedicalRecordArchives
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.HandoverId && !a.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bàn giao");

        if ((archive.HandoverStatus ?? 0) == 0)
            throw new InvalidOperationException(
                "Hồ sơ chưa được khoa gửi bàn giao, chưa có gì để duyệt.");
        if (archive.HandoverStatus == 2)
            throw new InvalidOperationException("Hồ sơ này đã được duyệt bàn giao trước đó.");
        if (!dto.Approve && string.IsNullOrWhiteSpace(dto.RejectReason))
            throw new InvalidOperationException("Từ chối bàn giao thì phải ghi lý do.");

        var now = DateTime.UtcNow;
        archive.HandoverStatus = dto.Approve ? 2 : 3;
        archive.HandoverApprovedAt = now;
        archive.HandoverApprovedById = userId;
        // Lý do từ chối đi vào ô của chính nó, KHÔNG đè lên `HandoverNote` của người gửi — cùng
        // bài học với §23/§27/§30/§42 (lý do ghi đè nội dung có sẵn).
        if (!dto.Approve) archive.HandoverRejectReason = dto.RejectReason;
        archive.UpdatedAt = now;

        // `Status` là của kho lưu trữ / mượn-trả. Cố ý KHÔNG đụng vào.
        await _context.SaveChangesAsync();

        return new HandoverRecordDto
        {
            Id = archive.Id,
            HandoverCode = archive.ArchiveCode,
            PatientName = archive.Patient?.FullName,
            ApprovedDate = now,
            Status = archive.HandoverStatus.Value,
            StatusName = GetHandoverStatusName(archive.HandoverStatus.Value),
            Note = archive.HandoverNote,
        };
    }
}
