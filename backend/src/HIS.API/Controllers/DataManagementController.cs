using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Quản lý chuyển giao dữ liệu (NangCap5 - E-HSMT BV Đa khoa Lai Châu)
/// </summary>
[ApiController]
[Route("api/data-management")]
[Authorize]
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
    /// Lịch sử backup
    /// </summary>
    [HttpGet("backups")]
    public async Task<ActionResult<List<BackupInfoDto>>> GetBackups()
        => Ok(await _service.GetBackupsAsync());

    /// <summary>
    /// Tạo backup mới
    /// </summary>
    [HttpPost("backups")]
    public async Task<IActionResult> CreateBackup([FromBody] CreateBackupRequest request)
        => Ok(await _service.CreateBackupAsync(request.BackupType, request.Modules, GetUserId()));

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
