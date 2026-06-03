using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Authorize]
public class WriteGapController : ControllerBase
{
    private readonly HISDbContext _db;
    public WriteGapController(HISDbContext db) => _db = db;
    private Guid Uid() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== 1. Sample Storage (store/retrieve) ==========

    [HttpPost("api/liscomplete/sample-storage/store")]
    public async Task<IActionResult> StoreSample([FromBody] StoreSampleDto dto)
    {
        var item = await _db.LabRequestItems.FirstOrDefaultAsync(i => i.Id == dto.SampleId);
        if (item == null) return NotFound(new { message = "Mẫu không tồn tại" });
        item.SampleLocation = dto.Location;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã lưu trữ mẫu tại {dto.Location}" });
    }

    [HttpPost("api/liscomplete/sample-storage/retrieve")]
    public async Task<IActionResult> RetrieveSample([FromBody] RetrieveSampleDto dto)
    {
        var item = await _db.LabRequestItems.FirstOrDefaultAsync(i => i.Id == dto.SampleId);
        if (item == null) return NotFound(new { message = "Mẫu không tồn tại" });
        item.SampleLocation = null;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã lấy mẫu ra khỏi kho" });
    }

    // ========== 2. Sample Tracking (reject/undo) ==========

    [HttpPost("api/liscomplete/sample-tracking/reject")]
    public async Task<IActionResult> RejectSample([FromBody] RejectSampleDto dto)
    {
        var item = await _db.LabRequestItems.FirstOrDefaultAsync(i => i.Id == dto.SampleId);
        if (item == null) return NotFound();
        item.Status = 5;
        item.RejectionReason = dto.Reason;
        item.RejectedAt = DateTime.Now;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/liscomplete/sample-tracking/undo-reject")]
    public async Task<IActionResult> UndoRejectSample([FromBody] UndoRejectDto dto)
    {
        var item = await _db.LabRequestItems.FirstOrDefaultAsync(i => i.Id == dto.SampleId);
        if (item == null) return NotFound();
        item.Status = 1;
        item.RejectionReason = null;
        item.RejectedAt = null;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== 3. Epidemiology (create disease report) ==========

    [HttpPost("api/epidemiology/reports/create")]
    public async Task<IActionResult> CreateDiseaseReport([FromBody] DiseaseReport dto)
    {
        dto.Id = Guid.NewGuid();
        dto.ReportDate = DateTime.Now;
        dto.CreatedAt = DateTime.Now;
        dto.CreatedBy = Uid().ToString();
        _db.DiseaseReports.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(new { dto.Id });
    }

    // ========== 4. Infection Control (update/close HAI case) ==========

    [HttpPut("api/infectioncontrol/hai-reports/{id:guid}/investigate")]
    public async Task<IActionResult> InvestigateHAI(Guid id, [FromBody] InvestigateHaiDto dto)
    {
        var hai = await _db.HAICases.FirstOrDefaultAsync(h => h.Id == id);
        if (hai == null) return NotFound();
        hai.IsInvestigated = true;
        hai.RootCause = dto.RootCause;
        hai.ContributingFactors = dto.ContributingFactors;
        hai.PreventiveMeasures = dto.PreventiveMeasures;
        hai.UpdatedAt = DateTime.Now;
        hai.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("api/infectioncontrol/hai-reports/{id:guid}/close")]
    public async Task<IActionResult> CloseHAI(Guid id, [FromBody] CloseHaiDto dto)
    {
        var hai = await _db.HAICases.FirstOrDefaultAsync(h => h.Id == id);
        if (hai == null) return NotFound();
        hai.Status = "Closed";
        hai.Outcome = dto.Outcome;
        hai.ResolvedDate = DateTime.Now;
        hai.Notes = dto.Notes;
        hai.UpdatedAt = DateTime.Now;
        hai.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== 5. Medical Record Archive (save) ==========

    [HttpPost("api/inpatient/medical-record-archive/save")]
    public async Task<IActionResult> SaveArchive([FromBody] SaveArchiveDto dto)
    {
        if (dto.Id.HasValue)
        {
            var existing = await _db.MedicalRecordArchives.FindAsync(dto.Id.Value);
            if (existing == null) return NotFound();
            existing.StorageLocation = dto.StorageLocation;
            existing.ShelfNumber = dto.ShelfNumber;
            existing.BoxNumber = dto.BoxNumber;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = Uid().ToString();
        }
        else
        {
            var archive = new MedicalRecordArchive
            {
                Id = Guid.NewGuid(),
                ArchiveCode = $"HS{DateTime.Now:yyyyMMddHHmmss}",
                MedicalRecordId = dto.MedicalRecordId,
                PatientId = dto.PatientId,
                StorageLocation = dto.StorageLocation,
                ShelfNumber = dto.ShelfNumber,
                BoxNumber = dto.BoxNumber,
                Status = 1,
                ArchivedDate = DateTime.Now,
                ArchivedById = Uid(),
                CreatedAt = DateTime.Now,
                CreatedBy = Uid().ToString(),
            };
            _db.MedicalRecordArchives.Add(archive);
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== 6. Inter-Hospital Sharing (create) ==========

    [HttpPost("api/inter-hospital/requests/create")]
    public async Task<IActionResult> CreateInterHospitalRequest([FromBody] CreateInterHospitalDto dto)
    {
        var entity = new InterHospitalRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"LV{DateTime.Now:yyyyMMddHHmmss}",
            RequestType = dto.RequestType ?? "Consultation",
            RequestingFacility = dto.RequestingFacility ?? "",
            ReceivingFacility = dto.ReceivingFacility ?? "",
            Urgency = dto.Urgency.ToString(),
            RequestDetails = dto.RequestDetails,
            Status = 0,
            RequestDate = DateTime.Now,
            CreatedAt = DateTime.Now,
            CreatedBy = Uid().ToString(),
        };
        _db.InterHospitalRequests.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(new { entity.Id });
    }

    // ========== 7. Medical Record Planning (borrow/return) ==========

    [HttpPost("api/medical-record-planning/borrow")]
    public async Task<IActionResult> BorrowRecord([FromBody] BorrowRecordDto dto)
    {
        var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
        if (archive == null) return NotFound();
        archive.IsOnLoan = true;
        archive.BorrowedByUserId = Uid();
        archive.BorrowedAt = DateTime.Now;
        archive.BorrowReason = dto.Reason;
        archive.Status = 2; // Đang mượn
        archive.UpdatedAt = DateTime.Now;
        archive.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/medical-record-planning/return")]
    public async Task<IActionResult> ReturnRecord([FromBody] ReturnArchiveDto dto)
    {
        var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
        if (archive == null) return NotFound();
        archive.IsOnLoan = false;
        archive.ReturnedAt = DateTime.Now;
        archive.Status = 1; // Đã lưu
        archive.UpdatedAt = DateTime.Now;
        archive.UpdatedBy = Uid().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== 8. Booking Management (doctor schedule) ==========

    [HttpPost("api/booking/doctor-schedule")]
    public async Task<IActionResult> SaveDoctorSchedule([FromBody] DoctorScheduleDto dto)
    {
        var existing = await _db.DutySchedules
            .FirstOrDefaultAsync(d => d.DoctorId == dto.DoctorId && d.Date.Date == dto.Date.Date);
        if (existing != null)
        {
            existing.ShiftType = dto.ShiftType;
            existing.RoomId = dto.RoomId;
            existing.Notes = dto.Notes;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = Uid().ToString();
        }
        else
        {
            _db.DutySchedules.Add(new DutySchedule
            {
                Id = Guid.NewGuid(),
                DoctorId = dto.DoctorId,
                DepartmentId = dto.DepartmentId,
                Date = dto.Date,
                ShiftType = dto.ShiftType,
                RoomId = dto.RoomId,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = Uid().ToString(),
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("api/booking/doctor-schedule")]
    public async Task<IActionResult> GetDoctorSchedules([FromQuery] Guid? doctorId, [FromQuery] Guid? departmentId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var q = _db.DutySchedules.Where(d => !d.IsDeleted);
        if (doctorId.HasValue) q = q.Where(d => d.DoctorId == doctorId);
        if (departmentId.HasValue) q = q.Where(d => d.DepartmentId == departmentId);
        if (fromDate.HasValue) q = q.Where(d => d.Date >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(d => d.Date <= toDate.Value);
        var items = await q.OrderBy(d => d.Date).Take(200)
            .Select(d => new { d.Id, d.DoctorId, DoctorName = d.Doctor != null ? d.Doctor.FullName : "", d.DepartmentId, d.Date, d.ShiftType, d.RoomId, d.Notes })
            .ToListAsync();
        return Ok(items);
    }

    // ========== 9. BHXH Audit (run audit session) ==========

    [HttpPost("api/bhxh-audit/sessions/create")]
    public async Task<IActionResult> CreateAuditSession([FromBody] CreateBhxhAuditDto dto)
    {
        var session = new BhxhAuditSession
        {
            Id = Guid.NewGuid(),
            SessionCode = $"GD{DateTime.Now:yyyyMMddHHmmss}",
            PeriodMonth = dto.PeriodMonth,
            PeriodYear = dto.PeriodYear,
            Status = 0,
            AuditorId = Uid(),
            Notes = dto.Notes,
            CreatedAt = DateTime.Now,
            CreatedBy = Uid().ToString(),
        };
        _db.BhxhAuditSessions.Add(session);
        await _db.SaveChangesAsync();
        return Ok(new { session.Id, session.SessionCode });
    }
}

public record StoreSampleDto(Guid SampleId, string Location);
public record RetrieveSampleDto(Guid SampleId);
public record RejectSampleDto(Guid SampleId, string Reason);
public record UndoRejectDto(Guid SampleId);
public record InvestigateHaiDto(string? RootCause, string? ContributingFactors, string? PreventiveMeasures);
public record CloseHaiDto(string? Outcome, string? Notes);
public record SaveArchiveDto(Guid? Id, Guid MedicalRecordId, Guid PatientId, string? StorageLocation, string? ShelfNumber, string? BoxNumber);
public record CreateInterHospitalDto(string? RequestType, string? RequestingFacility, string? ReceivingFacility, int Urgency, string? RequestDetails);
public record BorrowRecordDto(Guid ArchiveId, string? Reason);
public record ReturnArchiveDto(Guid ArchiveId);
public record DoctorScheduleDto(Guid DoctorId, Guid? DepartmentId, DateTime Date, int ShiftType, Guid? RoomId, string? Notes);
public record CreateBhxhAuditDto(int PeriodMonth, int PeriodYear, string? Notes);
