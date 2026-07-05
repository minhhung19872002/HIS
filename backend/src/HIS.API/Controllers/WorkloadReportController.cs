using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// QW3.10 — Thống kê khối lượng công việc theo BS/KTV.
/// Đếm exam/prescription per doctor, studies per radiologist/tech,
/// lab tests per ordering doctor, in a date range.
/// </summary>
[ApiController]
[Route("api/reports/workload")]
[Authorize]
public class WorkloadReportController : ControllerBase
{
    private readonly IWorkloadReportService _svc;

    public WorkloadReportController(IWorkloadReportService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> GetWorkload(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
        => (await _svc.GetWorkloadAsync(fromDate, toDate)).ToActionResult();
}
