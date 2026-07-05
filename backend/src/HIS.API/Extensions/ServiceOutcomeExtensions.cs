using HIS.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Extensions;

/// <summary>
/// Map <see cref="ServiceOutcome"/> (#202 thin-controller) → IActionResult, giữ nguyên
/// status code + body y hệt controller cũ. Dùng: <c>return (await _svc.X(...)).ToActionResult();</c>
/// </summary>
public static class ServiceOutcomeExtensions
{
    public static IActionResult ToActionResult(this ServiceOutcome o) => o.ResultKind switch
    {
        ServiceOutcome.Kind.Ok          => new OkObjectResult(o.Payload),
        ServiceOutcome.Kind.OkEmpty     => new OkResult(),
        ServiceOutcome.Kind.NoContent   => new NoContentResult(),
        ServiceOutcome.Kind.NotFound    => new NotFoundResult(),
        ServiceOutcome.Kind.NotFoundMsg => new NotFoundObjectResult(new { message = o.Message }),
        ServiceOutcome.Kind.BadRequest  => new BadRequestObjectResult(new { message = o.Message }),
        ServiceOutcome.Kind.Status      => o.Payload is null
            ? new StatusCodeResult(o.StatusCode)
            : new ObjectResult(o.Payload) { StatusCode = o.StatusCode },
        _                               => new OkResult(),
    };
}
