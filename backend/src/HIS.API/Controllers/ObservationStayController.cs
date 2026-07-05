using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.ObservationStay;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Phòng lưu / Observation ngắn hạn — N1.07.
/// Tiếp nhận → theo dõi sinh hiệu → cho về / chuyển nhập viện.
/// </summary>
[ApiController]
[Route("api/observation")]
[Authorize]
public class ObservationStayController : ControllerBase
{
    private readonly IObservationStayService _svc;
    public ObservationStayController(IObservationStayService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách phiên lưu theo trạng thái.</summary>
    [HttpGet("list")]
    public async Task<IActionResult> List([FromQuery] int? status, [FromQuery] string? keyword)
        => (await _svc.ListAsync(status, keyword)).ToActionResult();

    /// <summary>Tiếp nhận vào phòng lưu.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDto dto)
        => (await _svc.CreateAsync(dto, GetUserId())).ToActionResult();

    /// <summary>Ghi sinh hiệu / diễn biến.</summary>
    [HttpPost("{id:guid}/vitals")]
    public async Task<IActionResult> AddVital(Guid id, [FromBody] VitalDto dto)
        => (await _svc.AddVitalAsync(id, dto, GetUserId())).ToActionResult();

    /// <summary>Lấy timeline sinh hiệu.</summary>
    [HttpGet("{id:guid}/vitals")]
    public async Task<IActionResult> GetVitals(Guid id)
        => (await _svc.GetVitalsAsync(id)).ToActionResult();

    /// <summary>Kết thúc phiên lưu → cho về.</summary>
    [HttpPut("{id:guid}/discharge")]
    public async Task<IActionResult> Discharge(Guid id, [FromBody] DischargeDto dto)
        => (await _svc.DischargeAsync(id, dto, GetUserId())).ToActionResult();

    /// <summary>Chuyển nhập viện (escalate).</summary>
    [HttpPut("{id:guid}/escalate")]
    public async Task<IActionResult> Escalate(Guid id, [FromBody] DischargeDto dto)
        => (await _svc.EscalateAsync(id, dto, GetUserId())).ToActionResult();

    /// <summary>Cập nhật mức triage (nâng/hạ mức ưu tiên) cho phiên lưu — #61.</summary>
    [HttpPut("{id:guid}/triage")]
    public async Task<IActionResult> UpdateTriage(Guid id, [FromBody] UpdateTriageDto dto)
        => (await _svc.UpdateTriageAsync(id, dto, GetUserId())).ToActionResult();
}
