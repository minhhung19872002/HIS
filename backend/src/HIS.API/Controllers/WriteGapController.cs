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
}

public record StoreSampleDto(Guid SampleId, string Location);
public record RetrieveSampleDto(Guid SampleId);
public record RejectSampleDto(Guid SampleId, string Reason);
public record UndoRejectDto(Guid SampleId);
public record InvestigateHaiDto(string? RootCause, string? ContributingFactors, string? PreventiveMeasures);
public record CloseHaiDto(string? Outcome, string? Notes);
public record SaveArchiveDto(Guid? Id, Guid MedicalRecordId, Guid PatientId, string? StorageLocation, string? ShelfNumber, string? BoxNumber);
public record CreateInterHospitalDto(string? RequestType, string? RequestingFacility, string? ReceivingFacility, int Urgency, string? RequestDetails);
