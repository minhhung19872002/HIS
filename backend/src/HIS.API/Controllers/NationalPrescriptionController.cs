using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.NationalPrescription;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Cổng đơn thuốc quốc gia - Cục Quản lý Khám chữa bệnh (CQLKCB)
/// </summary>
[ApiController]
[Route("api/national-prescription")]
[Authorize]
public class NationalPrescriptionController : ControllerBase
{
    private readonly INationalPrescriptionService _service;

    public NationalPrescriptionController(INationalPrescriptionService service)
    {
        _service = service;
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "system";

    /// <summary>
    /// Tìm kiếm đơn thuốc
    /// </summary>
    [HttpPost("search")]
    public async Task<ActionResult<NationalPrescriptionPagedResult>> Search([FromBody] NationalPrescriptionSearchDto search)
        => Ok(await _service.SearchAsync(search));

    /// <summary>
    /// Chi tiết đơn thuốc
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Gửi đơn thuốc lên Cổng ĐTQG
    /// </summary>
    [HttpPost("submit/{prescriptionId}")]
    public async Task<IActionResult> Submit(Guid prescriptionId)
        => Ok(await _service.SubmitAsync(prescriptionId, GetUserId()));

    /// <summary>
    /// Gửi hàng loạt đơn thuốc
    /// </summary>
    [HttpPost("submit-batch")]
    public async Task<ActionResult<SubmitBatchResult>> SubmitBatch([FromBody] SubmitBatchRequest request)
        => Ok(await _service.SubmitBatchAsync(request.PrescriptionIds, GetUserId()));

    /// <summary>
    /// Thống kê tổng quan
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<NationalPrescriptionStatsDto>> GetStats()
        => Ok(await _service.GetStatsAsync());

    /// <summary>
    /// Kiểm tra kết nối
    /// </summary>
    [HttpGet("test-connection")]
    public async Task<IActionResult> TestConnection()
        => Ok(await _service.TestConnectionAsync());

    /// <summary>
    /// Gửi lại đơn thuốc bị lỗi
    /// </summary>
    [HttpPost("retry/{id}")]
    public async Task<IActionResult> Retry(Guid id)
        => Ok(await _service.RetrySubmissionAsync(id, GetUserId()));

    /// <summary>
    /// Hủy gửi đơn thuốc
    /// </summary>
    [HttpPost("cancel/{id}")]
    public async Task<IActionResult> Cancel(Guid id)
        => Ok(await _service.CancelSubmissionAsync(id, GetUserId()));
}
