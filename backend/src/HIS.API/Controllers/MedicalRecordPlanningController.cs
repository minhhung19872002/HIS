using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/medical-record-planning")]
[Authorize]
public class MedicalRecordPlanningController : ControllerBase
{
    private readonly IMedicalRecordPlanningService _planningService;

    public MedicalRecordPlanningController(IMedicalRecordPlanningService planningService)
    {
        _planningService = planningService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    // ========================================================================
    // Record Code Management
    // ========================================================================

    /// <summary>
    /// Danh sach ma ho so benh an
    /// </summary>
    [HttpGet("record-codes")]
    public async Task<ActionResult<PagedRecordCodeResult>> GetRecordCodes([FromQuery] RecordCodeSearchDto search)
    {
        var result = await _planningService.GetRecordCodesAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Cap ma ho so cho luot kham
    /// </summary>
    [HttpPost("record-codes/assign")]
    public async Task<ActionResult<RecordCodeDto>> AssignRecordCode([FromBody] AssignRecordCodeDto dto)
    {
        var result = await _planningService.AssignRecordCodeAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Huy cap ma ho so
    /// </summary>
    [HttpPost("record-codes/cancel")]
    public async Task<ActionResult<bool>> CancelRecordCode([FromBody] CancelRecordCodeDto dto)
    {
        var result = await _planningService.CancelRecordCodeAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Transfer Management
    // ========================================================================

    /// <summary>
    /// Danh sach chuyen vien
    /// </summary>
    [HttpGet("transfers")]
    public async Task<ActionResult<PagedTransferResult>> GetTransfers([FromQuery] TransferSearchDto search)
    {
        var result = await _planningService.GetTransfersAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Duyet chuyen vien
    /// </summary>
    [HttpPost("transfers/approve")]
    public async Task<ActionResult<TransferRecordDto>> ApproveTransfer([FromBody] ApproveTransferDto dto)
    {
        var result = await _planningService.ApproveTransferAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cap so chuyen vien
    /// </summary>
    [HttpPost("transfers/assign-number")]
    public async Task<ActionResult<TransferRecordDto>> AssignTransferNumber([FromBody] AssignTransferNumberDto dto)
    {
        var result = await _planningService.AssignTransferNumberAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Record Borrowing
    // ========================================================================

    /// <summary>
    /// Danh sach muon tra ho so
    /// </summary>
    [HttpGet("borrowing")]
    public async Task<ActionResult<PagedBorrowResult>> GetBorrowing([FromQuery] BorrowSearchDto search)
    {
        var result = await _planningService.GetBorrowingAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Tao phieu muon ho so
    /// </summary>
    [HttpPost("borrowing/borrow")]
    public async Task<ActionResult<RecordBorrowDto>> CreateBorrow([FromBody] CreateBorrowDto dto)
    {
        var result = await _planningService.CreateBorrowAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tra ho so
    /// </summary>
    [HttpPost("borrowing/return")]
    public async Task<ActionResult<RecordBorrowDto>> ReturnRecord([FromBody] ReturnRecordDto dto)
    {
        var result = await _planningService.ReturnRecordAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Gia han muon ho so
    /// </summary>
    [HttpPost("borrowing/extend")]
    public async Task<ActionResult<RecordBorrowDto>> ExtendBorrow([FromBody] ExtendBorrowDto dto)
    {
        var result = await _planningService.ExtendBorrowAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Record Handover
    // ========================================================================

    /// <summary>
    /// Danh sach ban giao ho so
    /// </summary>
    [HttpGet("handover")]
    public async Task<ActionResult<PagedHandoverResult>> GetHandover([FromQuery] HandoverSearchDto search)
    {
        var result = await _planningService.GetHandoverAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Gui ban giao ho so
    /// </summary>
    [HttpPost("handover/submit")]
    public async Task<ActionResult<HandoverRecordDto>> SubmitHandover([FromBody] SubmitHandoverDto dto)
    {
        var result = await _planningService.SubmitHandoverAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Duyet ban giao ho so
    /// </summary>
    [HttpPost("handover/approve")]
    public async Task<ActionResult<HandoverRecordDto>> ApproveHandover([FromBody] ApproveHandoverDto dto)
    {
        var result = await _planningService.ApproveHandoverAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Outpatient Records
    // ========================================================================

    /// <summary>
    /// Danh sach ho so ngoai tru
    /// </summary>
    [HttpGet("outpatient-records")]
    public async Task<ActionResult<PagedOutpatientRecordResult>> GetOutpatientRecords([FromQuery] OutpatientRecordSearchDto search)
    {
        var result = await _planningService.GetOutpatientRecordsAsync(search);
        return Ok(result);
    }

    // ========================================================================
    // Record Copying
    // ========================================================================

    /// <summary>
    /// Tao yeu cau sao ho so
    /// </summary>
    [HttpPost("record-copy")]
    public async Task<ActionResult<RecordCopyDto>> CreateRecordCopy([FromBody] CreateRecordCopyDto dto)
    {
        var result = await _planningService.CreateRecordCopyAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Department Attendance
    // ========================================================================

    /// <summary>
    /// Thong ke cham cong khoa
    /// </summary>
    [HttpGet("attendance")]
    public async Task<ActionResult<AttendanceSummaryDto>> GetAttendance([FromQuery] AttendanceSearchDto search)
    {
        var result = await _planningService.GetAttendanceAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Cham cong khoa
    /// </summary>
    [HttpPost("attendance/check-in")]
    public async Task<ActionResult<AttendanceCheckInDto>> CheckIn([FromBody] CheckInDto dto)
    {
        var result = await _planningService.CheckInAsync(dto, GetUserId());
        return Ok(result);
    }

    // ========================================================================
    // Stats
    // ========================================================================

    /// <summary>
    /// Thong ke ke hoach tong hop
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<PlanningStatsDto>> GetStats()
    {
        var result = await _planningService.GetStatsAsync();
        return Ok(result);
    }
}
