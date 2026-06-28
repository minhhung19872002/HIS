using System.Security.Claims;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Dtos.SampleCollection;

namespace HIS.API.Controllers;

/// <summary>
/// Lấy mẫu bệnh phẩm với STT tuần tự theo ngày + thêm XN cùng mẫu.
/// Bổ sung LISCompleteController với các tính năng MQ Solutions yêu cầu.
/// </summary>
[ApiController]
[Route("api/sample-collection")]
[Authorize]
public class SampleCollectionController : ControllerBase
{
    private readonly HISDbContext _db;

    public SampleCollectionController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;


    /// <summary>
    /// Cấp STT tuần tự theo ngày cho mẫu bệnh phẩm.
    /// Format: {Prefix}-{yyMMdd}-{NNNN} (VD: XN-250102-0042)
    /// </summary>
    [HttpPost("assign-sequence")]
    public async Task<ActionResult<AssignSequenceResultDto>> AssignSequence([FromBody] AssignSequenceDto dto)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException("ServiceRequestDetail không tồn tại");

        if (!string.IsNullOrWhiteSpace(detail.SampleBarcode))
        {
            return Ok(new AssignSequenceResultDto(detail.SampleBarcode, 0));
        }

        var prefix = string.IsNullOrWhiteSpace(dto.PreferredPrefix) ? "XN" : dto.PreferredPrefix;
        var todayVn = VnTime.TodayVn;
        var dateStr = todayVn.ToString("yyMMdd");

        // SampleCollectedAt lưu UTC — dùng DayRangeUtc để so sánh sargable (tránh .Date trên cột).
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(todayVn);
        var todayCount = await _db.ServiceRequestDetails
            .CountAsync(d => d.SampleCollectedAt != null
                && d.SampleCollectedAt.Value >= fromUtc && d.SampleCollectedAt.Value < toUtc);

        var seq = todayCount + 1;
        var barcode = $"{prefix}-{dateStr}-{seq:D4}";

        detail.SampleBarcode = barcode;
        detail.SampleCollectedAt = DateTime.UtcNow;
        detail.IsSampleCollected = true;
        detail.UpdatedAt = DateTime.UtcNow;
        detail.UpdatedBy = GetUserId().ToString();

        await _db.SaveChangesAsync();
        return Ok(new AssignSequenceResultDto(barcode, seq));
    }


    /// <summary>
    /// Thêm XN bổ sung trên cùng 1 mẫu bệnh phẩm đã lấy — MQ Solutions "Thêm XN cùng mẫu".
    /// Các XN mới dùng lại cùng SampleBarcode → không cần lấy mẫu mới.
    /// </summary>
    [HttpPost("add-tests")]
    public async Task<ActionResult<AddTestsResultDto>> AddTests([FromBody] AddTestsToSampleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ExistingBarcode) || dto.AdditionalDetailIds.Count == 0)
            throw new ArgumentException("Thiếu barcode hoặc danh sách XN");

        // Lấy mẫu gốc để copy SampleCollectedAt
        var origin = await _db.ServiceRequestDetails
            .FirstOrDefaultAsync(d => d.SampleBarcode == dto.ExistingBarcode)
            ?? throw new KeyNotFoundException($"Không tìm thấy mẫu với barcode {dto.ExistingBarcode}");

        var details = await _db.ServiceRequestDetails
            .Where(d => dto.AdditionalDetailIds.Contains(d.Id))
            .ToListAsync();

        var userId = GetUserId().ToString();
        int added = 0;
        foreach (var d in details)
        {
            if (!string.IsNullOrWhiteSpace(d.SampleBarcode)) continue;
            d.SampleBarcode = dto.ExistingBarcode;
            d.SampleCollectedAt = origin.SampleCollectedAt;
            d.IsSampleCollected = true;
            d.UpdatedAt = DateTime.UtcNow;
            d.UpdatedBy = userId;
            added++;
        }
        await _db.SaveChangesAsync();
        return Ok(new AddTestsResultDto(added, dto.ExistingBarcode));
    }


    /// <summary>
    /// Sửa STT mẫu — đổi số thứ tự trong ngày (MQ Solutions "Sửa STT").
    /// </summary>
    [HttpPost("update-sequence")]
    public async Task<ActionResult<AssignSequenceResultDto>> UpdateSequence([FromBody] UpdateSequenceDto dto)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException();

        var dateStr = (detail.SampleCollectedAt ?? DateTime.Today).ToString("yyMMdd");
        var prefix = dto.Prefix ?? detail.SampleBarcode?.Split('-').FirstOrDefault() ?? "XN";
        var newBarcode = $"{prefix}-{dateStr}-{dto.NewSequenceNumber:D4}";

        var clash = await _db.ServiceRequestDetails
            .AnyAsync(d => d.Id != detail.Id && d.SampleBarcode == newBarcode);
        if (clash) throw new InvalidOperationException($"STT {newBarcode} đã bị sử dụng");

        detail.SampleBarcode = newBarcode;
        detail.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new AssignSequenceResultDto(newBarcode, dto.NewSequenceNumber));
    }

    // ─── Hẹn lấy mẫu / tái XN định kỳ ───────────────────────────────────────


    /// <summary>Tạo hẹn lấy mẫu / tái XN định kỳ.</summary>
    [HttpPost("appointments")]
    public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentDto dto)
    {
        if (dto.PatientId == Guid.Empty) return BadRequest(new { message = "Thiếu PatientId" });
        if (dto.AppointmentAt < DateTime.Now.AddMinutes(-5))
            return BadRequest(new { message = "Ngày hẹn phải trong tương lai" });

        var uid = GetUserId();
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
        return Ok(new { appt.Id, appt.AppointmentAt, appt.Status });
    }

    /// <summary>Danh sách hẹn của BN (hoặc toàn hệ thống nếu không truyền patientId).</summary>
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments(
        [FromQuery] Guid? patientId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var q = _db.SampleAppointments
            .Include(a => a.Patient)
            .AsQueryable();
        if (patientId.HasValue) q = q.Where(a => a.PatientId == patientId.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(a => a.Status == status);
        if (fromDate.HasValue) q = q.Where(a => a.AppointmentAt >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(a => a.AppointmentAt <= toDate.Value.AddDays(1));
        var list = await q.OrderBy(a => a.AppointmentAt).Take(200).ToListAsync();
        return Ok(list.Select(a => new
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
    [HttpPatch("appointments/{id:guid}")]
    public async Task<IActionResult> UpdateAppointment(Guid id, [FromBody] UpdateAppointmentDto dto)
    {
        var appt = await _db.SampleAppointments.FindAsync(id);
        if (appt == null) return NotFound();
        var becameCompleted = dto.Status == "Completed" && appt.Status != "Completed";
        appt.Status = dto.Status;
        appt.Note = dto.Note ?? appt.Note;
        appt.UpdatedAt = DateTime.Now;
        appt.UpdatedBy = GetUserId().ToString();

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
                        CreatedByUserId = GetUserId(),
                        CreatedAt = DateTime.Now,
                        CreatedBy = GetUserId().ToString(),
                    };
                    _db.SampleAppointments.Add(nextAppt);
                    nextInfo = new { nextAppt.Id, nextAppt.AppointmentAt, nextAppt.RecurrenceType, nextAppt.RecurrenceCount };
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { appt.Id, appt.Status, nextAppointment = nextInfo });
    }


    /// <summary>Lịch sử lấy mẫu của BN, group theo ngày/đợt</summary>
    [HttpGet("history/{patientId:guid}")]
    public async Task<IActionResult> History(Guid patientId)
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
        return Ok(grouped);
    }
}
