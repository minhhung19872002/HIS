using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.VideoConsultation;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Quản lý phòng hội chẩn video conference — Sprint 5 Item 1.4.
/// Tích hợp Jitsi Meet (meet.jit.si public hoặc self-host).
/// </summary>
[ApiController]
[Route("api/video-consultation")]
[Authorize]
public class VideoConsultationController : ControllerBase
{
    private readonly IVideoConsultationService _svc;
    public VideoConsultationController(IVideoConsultationService svc)
    {
        _svc = svc;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomDto dto)
        => (await _svc.CreateAsync(dto, GetUserId())).ToActionResult();

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] int? status,
        [FromQuery] int? roomType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? keyword,
        [FromQuery] int pageSize = 50)
        => (await _svc.SearchAsync(status, roomType, fromDate, toDate, keyword, pageSize)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => (await _svc.GetByIdAsync(id)).ToActionResult();

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
        => (await _svc.StartAsync(id)).ToActionResult();

    [HttpPost("{id:guid}/end")]
    public async Task<IActionResult> End(Guid id, [FromBody] EndRoomDto dto)
        => (await _svc.EndAsync(id, dto, GetUserId())).ToActionResult();

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id, [FromBody] JoinDto dto)
        => (await _svc.JoinAsync(id, dto, GetUserId(), HttpContext.Connection.RemoteIpAddress?.ToString())).ToActionResult();

    [HttpGet("{id:guid}/participants")]
    public async Task<IActionResult> Participants(Guid id)
        => (await _svc.ParticipantsAsync(id)).ToActionResult();

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelDto dto)
        => (await _svc.CancelAsync(id, dto, GetUserId())).ToActionResult();

}
