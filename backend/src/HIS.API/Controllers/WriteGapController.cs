using System.Security.Claims;
using HIS.Application.DTOs.WriteGap;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/write-gap")]
[Authorize]
public class WriteGapController : ControllerBase
{
    private readonly IWriteGapService _svc;
    public WriteGapController(IWriteGapService svc) => _svc = svc;
    private Guid Uid() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== 1. Sample Storage (store/retrieve) ==========

    [HttpPost("sample/sample-storage/store")]
    public async Task<IActionResult> StoreSample([FromBody] StoreSampleDto dto)
        => (await _svc.StoreSampleAsync(dto, Uid())).ToActionResult();

    [HttpPost("sample/sample-storage/retrieve")]
    public async Task<IActionResult> RetrieveSample([FromBody] RetrieveSampleDto dto)
        => (await _svc.RetrieveSampleAsync(dto, Uid())).ToActionResult();

    // ========== 2. Sample Tracking (reject/undo) ==========

    [HttpPost("sample/sample-tracking/reject")]
    public async Task<IActionResult> RejectSample([FromBody] RejectSampleDto dto)
        => (await _svc.RejectSampleAsync(dto, Uid())).ToActionResult();

    [HttpPost("sample/sample-tracking/undo-reject")]
    public async Task<IActionResult> UndoRejectSample([FromBody] UndoRejectDto dto)
        => (await _svc.UndoRejectSampleAsync(dto, Uid())).ToActionResult();

    // ========== 3. Epidemiology (create disease report) ==========

    [HttpPost("epidemiology/reports")]
    public async Task<IActionResult> CreateDiseaseReport([FromBody] DiseaseReport dto)
        => (await _svc.CreateDiseaseReportAsync(dto, Uid())).ToActionResult();

    // ========== 4. Infection Control (update/close HAI case) ==========

    [HttpPut("hai/hai-reports/{id:guid}/investigate")]
    public async Task<IActionResult> InvestigateHAI(Guid id, [FromBody] InvestigateHaiDto dto)
        => (await _svc.InvestigateHAIAsync(id, dto, Uid())).ToActionResult();

    [HttpPut("hai/hai-reports/{id:guid}/close")]
    public async Task<IActionResult> CloseHAI(Guid id, [FromBody] CloseHaiDto dto)
        => (await _svc.CloseHAIAsync(id, dto, Uid())).ToActionResult();

    // ========== 5. Medical Record Archive (save) ==========

    [HttpPost("archive/medical-record-archive/save")]
    public async Task<IActionResult> SaveArchive([FromBody] SaveArchiveDto dto)
        => (await _svc.SaveArchiveAsync(dto, Uid())).ToActionResult();

    // ========== 6. Inter-Hospital Sharing (create) ==========

    [HttpPost("inter-hospital/requests")]
    public async Task<IActionResult> CreateInterHospitalRequest([FromBody] CreateInterHospitalDto dto)
        => (await _svc.CreateInterHospitalRequestAsync(dto, Uid())).ToActionResult();

    // ========== 7. Medical Record Planning (borrow/return) ==========

    [HttpPost("record-planning/borrow")]
    public async Task<IActionResult> BorrowRecord([FromBody] BorrowRecordDto dto)
        => (await _svc.BorrowRecordAsync(dto, Uid())).ToActionResult();

    [HttpPost("record-planning/return")]
    public async Task<IActionResult> ReturnRecord([FromBody] ReturnArchiveDto dto)
        => (await _svc.ReturnRecordAsync(dto, Uid())).ToActionResult();

    // ========== 8. Booking Management (doctor schedule) ==========

    [HttpPost("booking/doctor-schedule")]
    public async Task<IActionResult> SaveDoctorSchedule([FromBody] DoctorScheduleDto dto)
        => (await _svc.SaveDoctorScheduleAsync(dto, Uid())).ToActionResult();

    [HttpGet("booking/doctor-schedule")]
    public async Task<IActionResult> GetDoctorSchedules(
        [FromQuery] Guid? doctorId, [FromQuery] Guid? departmentId,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.GetDoctorSchedulesAsync(doctorId, departmentId, fromDate, toDate)).ToActionResult();

    // ========== 9. BHXH Audit (run audit session) ==========

    [HttpPost("bhxh-audit/sessions")]
    public async Task<IActionResult> CreateAuditSession([FromBody] CreateBhxhAuditDto dto)
        => (await _svc.CreateAuditSessionAsync(dto, Uid())).ToActionResult();
}
