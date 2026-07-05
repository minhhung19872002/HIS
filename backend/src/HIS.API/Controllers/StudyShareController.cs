using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.StudyShare;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/study-share")]
public class StudyShareController : ControllerBase
{
    private readonly IStudyShareService _svc;

    public StudyShareController(IStudyShareService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateShareDto dto)
        => (await _svc.CreateAsync(dto, Request.Scheme, Request.Host.ToString(), GetUserId())).ToActionResult();

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> MyLinks()
        => (await _svc.MyLinksAsync(Request.Scheme, Request.Host.ToString(), GetUserId())).ToActionResult();

    [HttpPost("{id:guid}/revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke(Guid id, [FromBody] RevokeDto dto)
        => (await _svc.RevokeAsync(id, dto, GetUserId())).ToActionResult();

    /// <summary>
    /// Public access endpoint. Không yêu cầu authentication — chỉ cần token + password.
    /// </summary>
    [HttpPost("access/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> Access(string token, [FromBody] AccessDto dto)
        => (await _svc.AccessAsync(token, dto, HttpContext.Connection.RemoteIpAddress?.ToString())).ToActionResult();

    /// <summary>Peek metadata — không tăng view count, dùng để render UI trước khi hỏi password.</summary>
    [HttpGet("peek/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> Peek(string token)
        => (await _svc.PeekAsync(token)).ToActionResult();
}
