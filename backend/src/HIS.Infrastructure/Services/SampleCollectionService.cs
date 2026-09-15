using HIS.Application.Common;
using HIS.Application.DTOs.SampleCollection;
using HIS.Application.Interfaces;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Lấy mẫu bệnh phẩm với STT tuần tự theo ngày + thêm XN cùng mẫu — tách khỏi
/// SampleCollectionController (#202 thin-controller). Behavior-preserving: mọi query/
/// projection/business math/status/message giữ nguyên; userId truyền từ controller
/// (thay cho GetUserId() cũ đọc claim). throw giữ nguyên (controller propagate).
/// </summary>
public class SampleCollectionService : ISampleCollectionService
{
    private readonly HISDbContext _db;

    public SampleCollectionService(HISDbContext db) { _db = db; }


    /// <summary>
    /// Cấp STT tuần tự theo ngày cho mẫu bệnh phẩm.
    /// Format: {Prefix}-{yyMMdd}-{NNNN} (VD: XN-250102-0042)
    /// </summary>
    public async Task<ServiceOutcome> AssignSequenceAsync(AssignSequenceDto dto, Guid userId)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException("ServiceRequestDetail không tồn tại");

        // QA-R3: a tube rejected at reception gets a NEW sequence (the old barcode was returned as-is and the tube
        // never re-entered the reception queue). The rejected barcode stays reserved — never re-issued.
        var rejectedBarcode = detail.ReceiveStatus == LisModel1Map.RejectedReceiveStatus ? detail.SampleBarcode : null;
        LisModel1Map.ResetRejectedTubeForRecollection(detail, VnTime.NowVn);

        if (!string.IsNullOrWhiteSpace(detail.SampleBarcode))
        {
            return ServiceOutcome.Ok(new AssignSequenceResultDto(detail.SampleBarcode, 0));
        }

        var prefix = string.IsNullOrWhiteSpace(dto.PreferredPrefix) ? "XN" : dto.PreferredPrefix;
        var todayVn = VnTime.TodayVn;
        var dateStr = todayVn.ToString("yyMMdd");

        // SampleCollectedAt = VN local time — VN day range, sargable (no .Date on the column).
        var (fromUtc, toUtc) = VnTime.DayRangeVn(todayVn);
        var todayCount = await _db.ServiceRequestDetails
            .CountAsync(d => d.SampleCollectedAt != null
                && d.SampleCollectedAt.Value >= fromUtc && d.SampleCollectedAt.Value < toUtc);

        // count+1 alone re-issued a barcode already in use once a number was moved via update-sequence
        // (or a collection was undone) → two samples with one barcode → analyzer result on the wrong row.
        // Never go below the highest number already issued today for this prefix.
        var codePrefix = $"{prefix}-{dateStr}-";
        var usedCodes = await _db.ServiceRequestDetails
            .Where(d => d.SampleBarcode != null && d.SampleBarcode.StartsWith(codePrefix))
            .Select(d => d.SampleBarcode!)
            .ToListAsync();
        if (rejectedBarcode != null && rejectedBarcode.StartsWith(codePrefix)) usedCodes.Add(rejectedBarcode);
        var maxUsed = usedCodes
            .Select(c => int.TryParse(c.Substring(codePrefix.Length), out var n) ? n : 0)
            .DefaultIfEmpty(0).Max();

        var seq = Math.Max(todayCount, maxUsed) + 1;
        var barcode = $"{prefix}-{dateStr}-{seq:D4}";

        detail.SampleBarcode = barcode;
        detail.SampleCollectedAt = VnTime.NowVn; // business timestamp = VN local (same as LIS CollectSample)
        detail.IsSampleCollected = true;
        detail.UpdatedAt = DateTime.UtcNow;
        detail.UpdatedBy = userId.ToString();

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new AssignSequenceResultDto(barcode, seq));
    }


    /// <summary>
    /// Thêm XN bổ sung trên cùng 1 mẫu bệnh phẩm đã lấy — MQ Solutions "Thêm XN cùng mẫu".
    /// Các XN mới dùng lại cùng SampleBarcode → không cần lấy mẫu mới.
    /// </summary>
    public async Task<ServiceOutcome> AddTestsAsync(AddTestsToSampleDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.ExistingBarcode) || dto.AdditionalDetailIds.Count == 0)
            throw new ArgumentException("Thiếu barcode hoặc danh sách XN");

        // Lấy mẫu gốc để copy SampleCollectedAt
        var origin = await _db.ServiceRequestDetails
            .Where(d => d.SampleBarcode == dto.ExistingBarcode && !d.IsDeleted)
            .Select(d => new { d.SampleCollectedAt, d.ServiceRequest.MedicalRecord.PatientId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Không tìm thấy mẫu với barcode {dto.ExistingBarcode}");

        var details = await _db.ServiceRequestDetails
            .Where(d => dto.AdditionalDetailIds.Contains(d.Id) && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        // Patient safety: one physical tube belongs to ONE patient. Sharing a barcode across patients let the
        // analyzer write a result onto whichever patient's row matched first.
        var detailIds = details.Select(d => d.Id).ToList();
        var foreignCount = await _db.ServiceRequestDetails
            .CountAsync(d => detailIds.Contains(d.Id) && d.ServiceRequest.MedicalRecord.PatientId != origin.PatientId);
        if (foreignCount > 0)
            return ServiceOutcome.Bad("Có xét nghiệm thuộc bệnh nhân khác — không được dùng chung mẫu/barcode");

        var uid = userId.ToString();
        int added = 0;
        foreach (var d in details)
        {
            if (!string.IsNullOrWhiteSpace(d.SampleBarcode)) continue;
            d.SampleBarcode = dto.ExistingBarcode;
            d.SampleCollectedAt = origin.SampleCollectedAt;
            d.IsSampleCollected = true;
            d.UpdatedAt = DateTime.UtcNow;
            d.UpdatedBy = uid;
            added++;
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new AddTestsResultDto(added, dto.ExistingBarcode));
    }


    /// <summary>
    /// Sửa STT mẫu — đổi số thứ tự trong ngày (MQ Solutions "Sửa STT").
    /// </summary>
    public async Task<ServiceOutcome> UpdateSequenceAsync(UpdateSequenceDto dto)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException();
        if (dto.NewSequenceNumber <= 0) throw new ArgumentException("STT phải ≥ 1");
        if (string.IsNullOrWhiteSpace(detail.SampleBarcode))
            throw new InvalidOperationException("Mẫu chưa được cấp STT — dùng cấp STT trước");
        var oldBarcode = detail.SampleBarcode;
        // The barcode is what the analyzer / LIS worklist matches on. Once the tube was received or resulted,
        // renumbering orphaned the analyzer result; and only this detail was renamed while the other tests sharing
        // the same tube ("thêm XN cùng mẫu") kept the old code → one physical tube with two barcodes.
        var tube = await _db.ServiceRequestDetails
            .Where(d => d.SampleBarcode == oldBarcode && !d.IsDeleted)
            .ToListAsync();
        if (tube.Any(d => d.ReceiveStatus == 1 || d.Status == 2 || d.ReviewedAt != null))
            throw new InvalidOperationException("Mẫu đã được LIS nhận / đã có kết quả — không sửa STT được");

        // Keep the date segment of the issued barcode: SampleCollectedAt is UTC, so re-deriving it gave the
        // previous day for samples taken 00h-07h VN.
        var parts = detail.SampleBarcode?.Split('-');
        var dateStr = parts is { Length: 3 } ? parts[1] : (detail.SampleCollectedAt ?? DateTime.Today).ToString("yyMMdd");
        var prefix = dto.Prefix ?? detail.SampleBarcode?.Split('-').FirstOrDefault() ?? "XN";
        var newBarcode = $"{prefix}-{dateStr}-{dto.NewSequenceNumber:D4}";

        var clash = await _db.ServiceRequestDetails
            .AnyAsync(d => d.SampleBarcode == newBarcode && d.SampleBarcode != oldBarcode);
        if (clash) throw new InvalidOperationException($"STT {newBarcode} đã bị sử dụng");

        foreach (var d in tube)
        {
            d.SampleBarcode = newBarcode;
            d.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new AssignSequenceResultDto(newBarcode, dto.NewSequenceNumber));
    }

    // ─── Hẹn lấy mẫu / tái XN định kỳ ───────────────────────────────────────


    /// <summary>Tạo hẹn lấy mẫu / tái XN định kỳ.</summary>
    public async Task<ServiceOutcome> CreateAppointmentAsync(CreateAppointmentDto dto, Guid userId)
    {
        if (dto.PatientId == Guid.Empty) return ServiceOutcome.Bad("Thiếu PatientId");
        if (dto.AppointmentAt < DateTime.Now.AddMinutes(-5))
            return ServiceOutcome.Bad("Ngày hẹn phải trong tương lai");

        var uid = userId;
        var appt = new SampleAppointment
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            AppointmentAt = dto.AppointmentAt,
            RecurrenceType = dto.RecurrenceType,
            RecurrenceCount = dto.RecurrenceCount,
            ServiceName = dto.ServiceName,
            Note = dto.Note,
            Status = "Scheduled",
            CreatedByUserId = uid,
            CreatedAt = DateTime.Now,
            CreatedBy = uid.ToString(),
        };
        _db.SampleAppointments.Add(appt);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { appt.Id, appt.AppointmentAt, appt.Status });
    }

    /// <summary>Danh sách hẹn của BN (hoặc toàn hệ thống nếu không truyền patientId).</summary>
    public async Task<ServiceOutcome> GetAppointmentsAsync(
        Guid? patientId,
        string? status,
        DateTime? fromDate,
        DateTime? toDate)
    {
        var q = _db.SampleAppointments
            .Include(a => a.Patient)
            .AsQueryable();
        if (patientId.HasValue) q = q.Where(a => a.PatientId == patientId.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(a => a.Status == status);
        if (fromDate.HasValue) q = q.Where(a => a.AppointmentAt >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(a => a.AppointmentAt <= toDate.Value.AddDays(1));
        var list = await q.OrderBy(a => a.AppointmentAt).Take(200).ToListAsync();
        return ServiceOutcome.Ok(list.Select(a => new
        {
            a.Id,
            a.PatientId,
            PatientName = a.Patient != null ? a.Patient.FullName : null,
            PatientCode = a.Patient != null ? a.Patient.PatientCode : null,
            a.AppointmentAt,
            a.RecurrenceType,
            a.RecurrenceCount,
            a.ServiceName,
            a.Note,
            a.Status,
            a.CreatedAt,
        }));
    }

    /// <summary>
    /// Cập nhật trạng thái hẹn (Complete / Cancel).
    /// Recurrence: khi hẹn định kỳ chuyển sang Completed → tự sinh hẹn KẾ TIẾP
    /// (AppointmentAt + chu kỳ); RecurrenceCount đếm lùi, hết lượt thì hẹn cuối thành None
    /// (0 = không giới hạn → sinh mãi). Hủy hẹn = dừng chuỗi (không sinh tiếp).
    /// </summary>
    public async Task<ServiceOutcome> UpdateAppointmentAsync(Guid id, UpdateAppointmentDto dto, Guid userId)
    {
        var appt = await _db.SampleAppointments.FindAsync(id);
        if (appt == null) return ServiceOutcome.NotFound();
        if (dto.Status is not ("Scheduled" or "Completed" or "Cancelled"))
            return ServiceOutcome.Bad("Trạng thái hẹn không hợp lệ (Scheduled / Completed / Cancelled)");
        // A cancelled chain could be "completed" afterwards and spawn the next recurring appointment again.
        if (appt.Status is "Completed" or "Cancelled" && dto.Status != appt.Status)
            return ServiceOutcome.Bad($"Hẹn đã {(appt.Status == "Completed" ? "hoàn thành" : "hủy")} — không đổi trạng thái được");
        var becameCompleted = dto.Status == "Completed" && appt.Status != "Completed";
        appt.Status = dto.Status;
        appt.Note = dto.Note ?? appt.Note;
        appt.UpdatedAt = DateTime.Now;
        appt.UpdatedBy = userId.ToString();

        object? nextInfo = null;
        if (becameCompleted && appt.RecurrenceType != "None")
        {
            var next = appt.RecurrenceType switch
            {
                "Daily" => appt.AppointmentAt.AddDays(1),
                "Weekly" => appt.AppointmentAt.AddDays(7),
                "Monthly" => appt.AppointmentAt.AddMonths(1),
                _ => (DateTime?)null,
            };
            if (next.HasValue)
            {
                var unlimited = appt.RecurrenceCount == 0;
                var remaining = unlimited ? 0 : appt.RecurrenceCount - 1;
                // Idempotent: không sinh trùng nếu mốc kế đã có hẹn Scheduled cùng BN + dịch vụ
                var exists = await _db.SampleAppointments.AnyAsync(a =>
                    a.PatientId == appt.PatientId
                    && a.AppointmentAt == next.Value
                    && a.Status == "Scheduled"
                    && a.ServiceName == appt.ServiceName);
                if (!exists)
                {
                    var nextAppt = new SampleAppointment
                    {
                        Id = Guid.NewGuid(),
                        PatientId = appt.PatientId,
                        ServiceRequestDetailId = appt.ServiceRequestDetailId,
                        AppointmentAt = next.Value,
                        // Hết lượt lặp → hẹn cuối là None (không sinh tiếp khi complete)
                        RecurrenceType = (unlimited || remaining > 0) ? appt.RecurrenceType : "None",
                        RecurrenceCount = unlimited ? 0 : Math.Max(0, remaining),
                        ServiceName = appt.ServiceName,
                        Note = appt.Note,
                        Status = "Scheduled",
                        CreatedByUserId = userId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = userId.ToString(),
                    };
                    _db.SampleAppointments.Add(nextAppt);
                    nextInfo = new { nextAppt.Id, nextAppt.AppointmentAt, nextAppt.RecurrenceType, nextAppt.RecurrenceCount };
                }
            }
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { appt.Id, appt.Status, nextAppointment = nextInfo });
    }


    /// <summary>Lịch sử lấy mẫu của BN, group theo ngày/đợt</summary>
    public async Task<ServiceOutcome> HistoryAsync(Guid patientId)
    {
        var samples = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord)
            .Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId
                && d.IsSampleCollected)
            .OrderByDescending(d => d.SampleCollectedAt)
            .Take(100)
            .Select(d => new
            {
                d.Id,
                d.SampleBarcode,
                d.SampleCollectedAt,
                ServiceName = d.Service.ServiceName,
                Result = d.Result,
                Status = d.Status,
                RequestCode = d.ServiceRequest.RequestCode,
            })
            .ToListAsync();

        var grouped = samples.GroupBy(s => s.SampleCollectedAt!.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                Count = g.Count(),
                Samples = g.OrderBy(s => s.SampleBarcode).ToList()
            })
            .ToList();
        return ServiceOutcome.Ok(grouped);
    }
}
