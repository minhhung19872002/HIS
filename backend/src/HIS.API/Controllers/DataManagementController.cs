using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Quản lý chuyển giao dữ liệu (NangCap5 - E-HSMT BV Đa khoa Lai Châu)
/// </summary>
[ApiController]
[Route("api/data-management")]
[Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.QuanTriHeThong)] // B3 RBAC shortlist (#293): chuyển giao/xuất dữ liệu hệ thống chỉ system-admin
public class DataManagementController : ControllerBase
{
    private readonly IDataManagementService _service;

    public DataManagementController(IDataManagementService service)
    {
        _service = service;
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "system";

    /// <summary>
    /// Thống kê tổng quan dữ liệu
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<DataStatsDto>> GetStats()
        => Ok(await _service.GetStatsAsync());

    /// <summary>
    /// Số lượng dữ liệu theo module
    /// </summary>
    [HttpGet("module-counts")]
    public async Task<ActionResult<List<ModuleDataCountDto>>> GetModuleCounts()
        => Ok(await _service.GetModuleCountsAsync());

    /// <summary>
    /// Lịch sử backup (legacy — trả BackupInfoDto từ bảng BackupHistories)
    /// </summary>
    [HttpGet("backups")]
    public async Task<ActionResult<List<BackupInfoDto>>> GetBackups()
        => Ok(await _service.GetBackupsAsync());

    /// <summary>
    /// Tạo backup mới (legacy endpoint, delegate sang CreateBackupWithHistory)
    /// </summary>
    [HttpPost("backups")]
    public async Task<IActionResult> CreateBackup([FromBody] CreateBackupRequest request)
        => Ok(await _service.CreateBackupAsync(request.BackupType, request.Modules, GetUserId()));

    // ── Backup History (mới) ──────────────────────────────────────────────

    /// <summary>
    /// Lịch sử backup chi tiết từ bảng BackupHistories
    /// </summary>
    [HttpGet("backup-history")]
    public async Task<ActionResult<List<BackupHistoryDto>>> GetBackupHistory()
        => Ok(await _service.GetBackupHistoryAsync());

    /// <summary>
    /// Tạo backup thủ công với ghi lịch sử đầy đủ
    /// </summary>
    [HttpPost("backup-history")]
    public async Task<ActionResult<BackupHistoryDto>> CreateBackupWithHistory([FromBody] CreateBackupHistoryRequest request)
        => Ok(await _service.CreateBackupWithHistoryAsync(request, GetUserId()));

    /// <summary>
    /// Yêu cầu restore từ một bản backup.
    ///
    /// QUAN TRỌNG: Endpoint này KHÔNG tự động chạy RESTORE DATABASE trên production.
    /// Nó ghi nhận yêu cầu, kiểm tra tính hợp lệ, và trả về script T-SQL để admin
    /// chạy thủ công trong môi trường kiểm soát (SSMS / sqlcmd).
    /// Cần ConfirmRisk=true và Reason không rỗng.
    /// </summary>
    [HttpPost("backup-history/{id}/restore-request")]
    public async Task<ActionResult<RestoreBackupResultDto>> RequestRestore(
        Guid id, [FromBody] RestoreBackupRequest request)
    {
        request.BackupHistoryId = id;
        var result = await _service.RequestRestoreAsync(request, GetUserId());
        if (result.Status == "Rejected")
            return BadRequest(result);
        return Ok(result);
    }

    // ── Backup Config ─────────────────────────────────────────────────────

    /// <summary>
    /// Lấy cấu hình đích và lịch backup tự động
    /// </summary>
    [HttpGet("backup-config")]
    public async Task<ActionResult<BackupConfigDto>> GetBackupConfig()
        => Ok(await _service.GetBackupConfigAsync());

    /// <summary>
    /// Cập nhật cấu hình đích và lịch backup tự động
    /// </summary>
    [HttpPut("backup-config")]
    public async Task<ActionResult<BackupConfigDto>> SaveBackupConfig([FromBody] BackupConfigDto config)
        => Ok(await _service.SaveBackupConfigAsync(config, GetUserId()));

    /// <summary>
    /// Lịch sử xuất dữ liệu
    /// </summary>
    [HttpGet("exports")]
    public async Task<ActionResult<List<DataExportResultDto>>> GetExports()
        => Ok(await _service.GetExportHistoryAsync());

    /// <summary>
    /// Yêu cầu xuất dữ liệu
    /// </summary>
    [HttpPost("exports")]
    public async Task<ActionResult<DataExportResultDto>> RequestExport([FromBody] DataExportRequestDto request)
        => Ok(await _service.RequestExportAsync(request, GetUserId()));

    /// <summary>
    /// Tải file xuất dữ liệu
    /// </summary>
    [HttpGet("exports/{id}/download")]
    public async Task<IActionResult> DownloadExport(Guid id)
    {
        var data = await _service.DownloadExportAsync(id);
        return File(data, "application/octet-stream", $"export_{id}.zip");
    }

    /// <summary>
    /// Danh sách biên bản bàn giao
    /// </summary>
    [HttpGet("handovers")]
    public async Task<ActionResult<List<DataHandoverDto>>> GetHandovers()
        => Ok(await _service.GetHandoversAsync());

    /// <summary>
    /// Tạo biên bản bàn giao
    /// </summary>
    [HttpPost("handovers")]
    public async Task<ActionResult<DataHandoverDto>> CreateHandover([FromBody] CreateHandoverRequest request)
        => Ok(await _service.CreateHandoverAsync(request, GetUserId()));

    /// <summary>
    /// Xác nhận bàn giao
    /// </summary>
    [HttpPost("handovers/{id}/confirm")]
    public async Task<IActionResult> ConfirmHandover(Guid id)
        => Ok(await _service.ConfirmHandoverAsync(id, GetUserId()));
}
