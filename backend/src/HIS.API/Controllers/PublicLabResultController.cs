using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HIS.API.Controllers;

/// <summary>
/// Anonymous reader for the lab-result SMS link (<c>{site}/lab-result?token=…</c>, created by
/// POST /api/notification/send-lab-result-link). Before this endpoint existed the SMS pointed at a page with
/// nothing behind it. The 256-bit token is the only credential: expiry is enforced, the reply is limited to the
/// approved results of the one lab request the token was issued for, and the per-IP "public-lookup" bucket
/// (same as the other anonymous identity lookups) stops token guessing at volume.
/// </summary>
[ApiController]
[Route("api/public-lab-result")]
[AllowAnonymous]
public class PublicLabResultController : ControllerBase
{
    private readonly INotificationService _svc;

    public PublicLabResultController(INotificationService svc) => _svc = svc;

    [HttpGet]
    [EnableRateLimiting("public-lookup")]
    public async Task<IActionResult> Get([FromQuery] string? token)
        => (await _svc.GetLabResultByTokenAsync(token)).ToActionResult();
}
