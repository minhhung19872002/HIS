using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Thống kê số lượt thực hiện dịch vụ theo phòng/máy (ExecuteRoom) trong khoảng thời gian.
/// Phục vụ tích hợp phân tích hiệu suất máy móc cho hệ thống quản lý tài sản (IMS).
/// </summary>
[ApiController]
[Route("api/reports/service-volume-by-room")]
[Authorize]
public class ServiceVolumeReportController : ControllerBase
{
    private readonly IServiceVolumeReportService _svc;

    public ServiceVolumeReportController(IServiceVolumeReportService svc) { _svc = svc; }


    /// <summary>Gom số phiếu chỉ định theo phòng thực hiện (ExecuteRoomId) trong [fromDate, toDate].</summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
        => (await _svc.GetAsync(fromDate, toDate)).ToActionResult();
}
