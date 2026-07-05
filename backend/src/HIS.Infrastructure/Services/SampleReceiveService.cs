using HIS.Application.Common;
using HIS.Application.DTOs.SampleReceive;
using HIS.Application.Interfaces;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Sample Receive + Review workflow — N1.16 + N1.17 — tách khỏi SampleReceiveController (#202 thin-controller).
/// Tách: Collect (lấy mẫu) → Receive (LIS nhận) → Technician run → Reviewer duyệt.
/// Review bắt buộc ReviewerUserId ≠ TechnicianUserId (4-eyes principle).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền
/// từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// </summary>
public class SampleReceiveService : ISampleReceiveService
{
    private readonly HISDbContext _db;
    public SampleReceiveService(HISDbContext db) { _db = db; }

    /// <summary>Danh sách mẫu chờ nhận tại LIS.</summary>
    public async Task<ServiceOutcome> PendingAsync(string? keyword)
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
        return ServiceOutcome.Ok(list.Select(d => new
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


    /// <summary>Nhận mẫu — đánh dấu ReceiveStatus=1.</summary>
    public async Task<ServiceOutcome> AcceptAsync(ReceiveDto dto, Guid userId)
    {
        if (dto.DetailIds.Count == 0) return ServiceOutcome.Bad("Chưa chọn mẫu");
        var items = await _db.ServiceRequestDetails
            .Where(d => dto.DetailIds.Contains(d.Id) && d.ReceiveStatus == 0)
            .ToListAsync();
        var now = DateTime.UtcNow; // dot16: chuẩn UTC — ReceivedAt bị query DayRangeUtc (:264)
        var uid = userId;
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
        return ServiceOutcome.Ok(new { received = items.Count });
    }


    /// <summary>Từ chối mẫu (mẫu không đạt).</summary>
    public async Task<ServiceOutcome> RejectAsync(RejectDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return ServiceOutcome.Bad("Phải nhập lý do từ chối");
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return ServiceOutcome.NotFound();
        d.ReceiveStatus = 2;
        d.RejectReason = dto.Reason;
        d.ReceivedByUserId = userId;
        d.ReceivedAt = DateTime.UtcNow; // dot16: chuẩn UTC
        d.UpdatedAt = DateTime.UtcNow;
        d.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { d.Id, d.ReceiveStatus });
    }


    /// <summary>KTV nhập kết quả (chưa duyệt).</summary>
    public async Task<ServiceOutcome> TechnicianRunAsync(RunDto dto, Guid userId)
    {
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return ServiceOutcome.NotFound();
        if (d.ReceiveStatus != 1) return ServiceOutcome.Bad("Mẫu chưa được nhận");
        var uid = userId;
        d.TechnicianUserId = uid;
        d.TechnicianRunAt = DateTime.Now;
        d.Result = dto.Result;
        d.ResultDescription = dto.ResultDescription;
        d.ResultDate = DateTime.Now;
        d.ResultUserId = uid;
        d.Status = 2; // Có KQ (chờ duyệt)
        d.UpdatedAt = DateTime.Now;
        d.UpdatedBy = uid.ToString();

        // R1: ghi KQ per-parameter nếu có (giữ d.Result làm tóm tắt/legacy). Min/Max/cờ suy từ catalog
        // LisTestParameter theo ServiceId, fallback range truyền trực tiếp trong input.
        if (dto.Parameters is { Count: > 0 })
        {
            var oldParams = await _db.ServiceRequestDetailParameters
                .Where(x => x.ServiceRequestDetailId == d.Id && !x.IsDeleted).ToListAsync();
            if (oldParams.Count > 0) _db.ServiceRequestDetailParameters.RemoveRange(oldParams); // re-run idempotent

            var catalog = await _db.LisTestParameters
                .Where(p => p.ServiceId == d.ServiceId && p.IsActive && !p.IsDeleted).ToListAsync();
            int seq = 0;
            foreach (var p in dto.Parameters)
            {
                var cat = catalog.FirstOrDefault(c => c.Code == p.ParameterCode || c.Hl7Code == p.ParameterCode);
                var min = p.ReferenceMin ?? cat?.ReferenceLow ?? cat?.NormalMinMale;
                var max = p.ReferenceMax ?? cat?.ReferenceHigh ?? cat?.NormalMaxMale;
                var num = LabFlagEvaluator.TryParse(p.Value);
                var flag = LabFlagEvaluator.EvaluateFlag(num, min, max, cat?.CriticalLow, cat?.CriticalHigh);
                _db.ServiceRequestDetailParameters.Add(new ServiceRequestDetailParameter
                {
                    Id = Guid.NewGuid(),
                    ServiceRequestDetailId = d.Id,
                    ParameterCode = p.ParameterCode,
                    ParameterName = p.ParameterName,
                    Value = p.Value,
                    NumericValue = num,
                    Unit = string.IsNullOrEmpty(p.Unit) ? cat?.Unit : p.Unit,
                    ReferenceMin = min,
                    ReferenceMax = max,
                    ReferenceRange = LabFlagEvaluator.BuildReferenceRange(min, max),
                    Flag = flag,
                    SequenceNumber = seq++,
                    CreatedAt = DateTime.Now,
                    CreatedBy = uid.ToString(),
                });
            }
            if (string.IsNullOrWhiteSpace(d.Result))
                d.Result = string.Join("; ", dto.Parameters.Select(p => $"{p.ParameterName} {p.Value}"));
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { d.Id, d.TechnicianUserId, d.TechnicianRunAt });
    }


    /// <summary>Reviewer duyệt kết quả. Bắt buộc ReviewerUserId ≠ TechnicianUserId.</summary>
    public async Task<ServiceOutcome> ReviewAsync(ReviewDto dto, Guid userId)
    {
        var d = await _db.ServiceRequestDetails.FindAsync(dto.DetailId);
        if (d == null) return ServiceOutcome.NotFound();
        if (d.Status != 2) return ServiceOutcome.Bad("Mẫu chưa có kết quả để duyệt");
        var uid = userId;
        if (d.TechnicianUserId.HasValue && d.TechnicianUserId.Value == uid)
            return ServiceOutcome.Bad("Reviewer phải khác KTV (4-eyes principle)");
        d.ReviewerUserId = uid;
        d.ReviewedAt = DateTime.Now;
        d.Conclusion = dto.Conclusion ?? d.Conclusion;
        d.UpdatedAt = DateTime.Now;
        d.UpdatedBy = uid.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { d.Id, d.ReviewerUserId, d.ReviewedAt });
    }


    /// <summary>Hủy nhận mẫu — đảo ReceiveStatus 1→0, clear ReceivedByUserId/At, Status về 0.</summary>
    public async Task<ServiceOutcome> CancelReceiveAsync(CancelReceiveDto dto, Guid userId)
    {
        if (dto.DetailIds.Count == 0) return ServiceOutcome.Bad("Chưa chọn mẫu cần hủy nhận");
        var items = await _db.ServiceRequestDetails
            .Where(d => dto.DetailIds.Contains(d.Id) && d.ReceiveStatus == 1)
            .ToListAsync();
        if (items.Count == 0) return ServiceOutcome.Bad("Không có mẫu nào đang ở trạng thái đã nhận");
        var now = DateTime.Now;
        var uid = userId;
        foreach (var d in items)
        {
            // Chỉ hủy nhận nếu chưa có KTV ghi KQ (bảo vệ dữ liệu đã xử lý)
            if (d.TechnicianUserId.HasValue)
                return ServiceOutcome.Bad($"Mẫu {d.SampleBarcode} đã có KTV ghi KQ — không thể hủy nhận. Dùng hủy ngược chuỗi.");
            d.ReceiveStatus = 0;
            d.ReceivedByUserId = null;
            d.ReceivedAt = null;
            d.Status = 0; // Trả về Pending
            d.UpdatedAt = now;
            d.UpdatedBy = uid.ToString();
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { cancelled = items.Count, reason = dto.Reason });
    }

    /// <summary>
    /// Danh sách mẫu đã nhận hôm nay (ReceiveStatus=1, trong ngày VN).
    /// Dùng VnTime.DayRangeUtc để tránh lệch bucket UTC trong khung 00h–07h.
    /// </summary>
    public async Task<ServiceOutcome> AcceptedAsync(string? keyword)
    {
        var today = VnTime.TodayVn;
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(today);

        var q = _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(d => d.ReceiveStatus == 1
                && d.ReceivedAt >= fromUtc && d.ReceivedAt < toUtc);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(d => (d.SampleBarcode != null && d.SampleBarcode.Contains(kw))
                || d.ServiceRequest.MedicalRecord.Patient.FullName.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.PatientCode.Contains(kw)
                || d.ServiceRequest.RequestCode.Contains(kw));
        }

        var list = await q.OrderByDescending(d => d.ReceivedAt).Take(300).ToListAsync();
        return ServiceOutcome.Ok(list.Select(d => new
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
            d.ReceivedAt,
            d.ReceivedByUserId,
            d.Status,
            ReceiveStatus = d.ReceiveStatus,
        }));
    }

    /// <summary>Trạng thái của 1 detail (cho tracking).</summary>
    public async Task<ServiceOutcome> StatusAsync(Guid detailId)
    {
        var d = await _db.ServiceRequestDetails
            .Include(x => x.Service)
            .Include(x => x.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(x => x.Id == detailId);
        if (d == null) return ServiceOutcome.NotFound();
        return ServiceOutcome.Ok(new
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
