using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// M3.13 — Lịch sử lấy mẫu phân theo đợt (morning/afternoon/evening/emergency).
/// Dùng cho KTV xem báo cáo trong ca của mình.
/// </summary>
[ApiController]
[Route("api/sample-batches")]
[Authorize]
public class SampleBatchController : ControllerBase
{
    private readonly ISampleBatchService _svc;

    public SampleBatchController(ISampleBatchService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> GetBatches([FromQuery] DateTime? date)
        => (await _svc.GetBatchesAsync(date)).ToActionResult();
}
