using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Đánh giá kết quả XN so với khoảng tham chiếu — N1.18.
/// Tự động set IsAbnormal / AbnormalType cho từng parameter để UI tô đỏ/xanh.
/// </summary>
[ApiController]
[Route("api/lab-result-evaluation")]
[Authorize]
public class LabResultEvaluationController : ControllerBase
{
    private readonly ILabResultEvaluationService _svc;
    public LabResultEvaluationController(ILabResultEvaluationService svc) { _svc = svc; }

    /// <summary>Re-evaluate tất cả chỉ số con (ServiceRequestDetailParameter) của 1 SRD — #14e: model 1.</summary>
    [HttpPost("request-item/{requestItemId:guid}")]
    public async Task<IActionResult> EvaluateRequestItem(Guid requestItemId)
        => (await _svc.EvaluateRequestItemAsync(requestItemId)).ToActionResult();

    /// <summary>Re-evaluate 1 chỉ số con cụ thể — #14e: model 1.</summary>
    [HttpPost("row/{labResultId:guid}")]
    public async Task<IActionResult> EvaluateRow(Guid labResultId)
        => (await _svc.EvaluateRowAsync(labResultId)).ToActionResult();

    /// <summary>Evaluate 1 giá trị cụ thể — dùng cho preview trước khi lưu.</summary>
    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] decimal value, [FromQuery] decimal? min, [FromQuery] decimal? max)
        => (await _svc.PreviewAsync(value, min, max)).ToActionResult();
}
