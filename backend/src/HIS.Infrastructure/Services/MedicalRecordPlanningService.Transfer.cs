using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Transfer Management
    // ========================================================================

    public async Task<PagedTransferResult> GetTransfersAsync(TransferSearchDto search)
    {
        try
        {
            // Query from Discharge table (DischargeType = 2 means transfer)
            var query = _context.Set<Discharge>()
                .Include(d => d.Admission).ThenInclude(a => a.Patient)
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => !d.IsDeleted && d.DischargeType == 2)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(d =>
                    d.Admission.Patient.FullName.ToLower().Contains(kw) ||
                    d.Admission.Patient.PatientCode.ToLower().Contains(kw));
            }

            if (search.FromDate.HasValue)
                query = query.Where(d => d.DischargeDate >= search.FromDate.Value);
            if (search.ToDate.HasValue)
                query = query.Where(d => d.DischargeDate <= search.ToDate.Value.AddDays(1));

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(d => d.DischargeDate)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(d => new
                {
                    d.Id,
                    PatientCode = d.Admission.Patient.PatientCode,
                    PatientName = d.Admission.Patient.FullName,
                    FromDepartment = d.Admission.Department != null ? d.Admission.Department.DepartmentName : "",
                    Reason = d.DischargeInstructions ?? "",
                    Diagnosis = d.DischargeDiagnosis ?? "",
                    d.DischargeDate,
                    d.TransferStatus,
                    d.TransferNumber,
                    d.TransferApprovedAt,
                })
                .ToListAsync();

            var items = records.Select(d => new TransferRecordDto
            {
                Id = d.Id,
                TransferNumber = d.TransferNumber,
                PatientCode = d.PatientCode,
                PatientName = d.PatientName,
                FromDepartment = d.FromDepartment,
                Reason = d.Reason,
                Diagnosis = d.Diagnosis,
                TransferDate = d.DischargeDate,
                // Đọc trạng thái DUYỆT HỒ SƠ, không đọc `DischargeCondition` (kết cục điều trị
                // của người bệnh) — xem chú thích `TransferStatus` ở entity `Discharge`. Trước
                // đây người bệnh tử vong (DischargeCondition = 5) hiện ở đây thành "Hoàn thành".
                Status = d.TransferStatus ?? 0,
                StatusName = GetTransferStatusName(d.TransferStatus ?? 0),
                ApprovedDate = d.TransferApprovedAt,
            }).ToList();

            return new PagedTransferResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying transfers, returning stub data");
            return GetStubTransfers(search);
        }
    }

    /// <summary>
    /// Duyệt (hoặc từ chối) một hồ sơ chuyển tuyến.
    ///
    /// <para>#218/T3 — hàm này vốn CÓ ghi thật, nhưng ghi vào hai chỗ sai, cả hai đều là nội dung
    /// lâm sàng của người bệnh:</para>
    /// <code>
    /// discharge.DischargeCondition   = dto.Approve ? 1 : 2;                 // kết cục điều trị
    /// discharge.DischargeInstructions = ... : dto.RejectReason;             // hướng dẫn sau xuất viện
    /// </code>
    /// <para>Cột thứ nhất là kết cục điều trị, được các báo cáo bệnh viện đọc để đếm số ca
    /// khỏi/đỡ/nặng hơn/TỬ VONG ⇒ duyệt một phiếu chuyển tuyến lại ghi kết cục người bệnh thành
    /// "khỏi". Cột thứ hai là hướng dẫn cho người bệnh sau khi ra viện ⇒ từ chối một phiếu thì
    /// xoá mất hướng dẫn đó. Nay mỗi thứ có ô của mình (migration 178).</para>
    ///
    /// <para>Bỏ luôn khối <c>catch</c> cũ: nó nuốt lỗi rồi trả DTO "Đã duyệt" — người dùng thấy
    /// báo thành công cho một việc chưa hề xảy ra.</para>
    /// </summary>
    public async Task<TransferRecordDto> ApproveTransferAsync(ApproveTransferDto dto, Guid userId)
    {
        var discharge = await _context.Set<Discharge>()
            .Include(d => d.Admission).ThenInclude(a => a.Patient)
            .FirstOrDefaultAsync(d => d.Id == dto.TransferId && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ chuyển tuyến");

        if (discharge.DischargeType != 2)
            throw new InvalidOperationException(
                "Phiếu này không phải hồ sơ chuyển tuyến, không duyệt ở đây được.");
        if (discharge.TransferStatus == 1)
            throw new InvalidOperationException("Hồ sơ chuyển tuyến này đã được duyệt trước đó.");
        if (discharge.TransferStatus == 3)
            throw new InvalidOperationException("Hồ sơ chuyển tuyến này đã hoàn thành.");
        if (!dto.Approve && string.IsNullOrWhiteSpace(dto.RejectReason))
            throw new InvalidOperationException("Từ chối chuyển tuyến thì phải ghi lý do.");

        var now = DateTime.UtcNow;
        discharge.TransferStatus = dto.Approve ? 1 : 2;
        discharge.TransferApprovedAt = now;
        discharge.TransferApprovedById = userId;
        if (!dto.Approve) discharge.TransferRejectReason = dto.RejectReason;
        discharge.UpdatedAt = now;

        // `DischargeCondition` và `DischargeInstructions` là nội dung lâm sàng. Duyệt hồ sơ là
        // việc hành chính. Cố ý KHÔNG đụng vào.
        await _context.SaveChangesAsync();

        return new TransferRecordDto
        {
            Id = discharge.Id,
            TransferNumber = discharge.TransferNumber,
            PatientName = discharge.Admission?.Patient?.FullName,
            Status = discharge.TransferStatus.Value,
            StatusName = GetTransferStatusName(discharge.TransferStatus.Value),
            ApprovedDate = now,
        };
    }

    /// <summary>
    /// Cấp số công văn cho hồ sơ chuyển tuyến.
    ///
    /// <para>#218/T3 — trước đây là hàm rỗng: <c>await Task.CompletedTask</c> rồi trả lại chính
    /// số người dùng vừa nhập kèm "Đã cấp số". Số ấy không được lưu ở đâu cả; mở lại màn hình là
    /// mất. Bảng <c>Discharges</c> khi đó cũng chưa có ô nào để giữ (migration 178 thêm).</para>
    /// </summary>
    public async Task<TransferRecordDto> AssignTransferNumberAsync(AssignTransferNumberDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.TransferNumber))
            throw new InvalidOperationException("Chưa nhập số chuyển tuyến.");

        var so = dto.TransferNumber.Trim();
        var discharge = await _context.Set<Discharge>()
            .Include(d => d.Admission).ThenInclude(a => a.Patient)
            .FirstOrDefaultAsync(d => d.Id == dto.TransferId && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ chuyển tuyến");

        if (discharge.DischargeType != 2)
            throw new InvalidOperationException(
                "Phiếu này không phải hồ sơ chuyển tuyến, không cấp số ở đây được.");

        // Số công văn phải là duy nhất — trùng số thì hai hồ sơ cùng một số hiệu văn bản.
        var trung = await _context.Set<Discharge>().AnyAsync(d =>
            d.Id != discharge.Id && !d.IsDeleted && d.TransferNumber == so);
        if (trung)
            throw new InvalidOperationException($"Số chuyển tuyến {so} đã được cấp cho hồ sơ khác.");

        discharge.TransferNumber = so;
        discharge.TransferNumberAssignedAt = DateTime.UtcNow;
        discharge.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new TransferRecordDto
        {
            Id = discharge.Id,
            TransferNumber = discharge.TransferNumber,
            PatientName = discharge.Admission?.Patient?.FullName,
            Status = discharge.TransferStatus ?? 0,
            StatusName = GetTransferStatusName(discharge.TransferStatus ?? 0),
            ApprovedDate = discharge.TransferApprovedAt,
        };
    }
}
