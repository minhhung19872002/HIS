using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;
using HIS.API.Dtos.DevLinkRadiology;

namespace HIS.API.Controllers;

/// <summary>
/// DEV helper: link today's RadiologyRequests with real Orthanc StudyInstanceUIDs
/// so the worklist page shows "has images" + DicomViewer can load real DICOM data.
/// Needed because PopulateData seeds requests but doesn't attach DICOM metadata.
/// #365 REFAC-3: thinned — logic moved to <see cref="IDevLinkRadiologyService"/>.
/// </summary>
[ApiController]
[Route("api/dev/link-radiology")]
[AllowAnonymous]
[DevelopmentOnly] // #180: dev-only linker — 404 in prod
public class DevLinkRadiologyController : ControllerBase
{
    private readonly IDevLinkRadiologyService _service;

    public DevLinkRadiologyController(IDevLinkRadiologyService service)
    {
        _service = service;
    }

    [HttpPost("today")]
    public async Task<ActionResult<LinkResult>> LinkToday()
    {
        var result = await _service.LinkTodayAsync();
        if (result.StatusCode != 200)
            return StatusCode(result.StatusCode, result.Body);

        var r = (DevLinkRadiologyResult)result.Body;
        return Ok(new LinkResult(r.RequestsUpdated, r.ExamsCreated, r.StudiesCreated, r.OrthancUIDs));
    }
}
