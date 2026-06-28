using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Dtos.ServiceVolumeReport;

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
    private readonly HISDbContext _db;

    public ServiceVolumeReportController(HISDbContext db) { _db = db; }


    /// <summary>Gom số phiếu chỉ định theo phòng thực hiện (ExecuteRoomId) trong [fromDate, toDate].</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomServiceVolumeDto>>> Get(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var from = fromDate?.Date ?? DateTime.Today.AddDays(-30);
        var to = (toDate?.Date ?? DateTime.Today).AddDays(1).AddSeconds(-1);

        var grouped = await _db.ServiceRequests
            .Where(s => !s.IsDeleted && s.ExecuteRoomId != null
                        && s.RequestDate >= from && s.RequestDate <= to)
            .GroupBy(s => s.ExecuteRoomId!.Value)
            .Select(g => new { RoomId = g.Key, Count = g.Count() })
            .ToListAsync();

        var roomIds = grouped.Select(x => x.RoomId).ToList();
        var rooms = await _db.Rooms
            .Where(r => roomIds.Contains(r.Id))
            .Select(r => new { r.Id, r.RoomCode, r.RoomName, r.RoomType })
            .ToListAsync();

        var result = grouped
            .Select(g =>
            {
                var room = rooms.FirstOrDefault(r => r.Id == g.RoomId);
                return new RoomServiceVolumeDto(
                    g.RoomId,
                    room?.RoomCode ?? "",
                    room?.RoomName ?? "",
                    room?.RoomType ?? 0,
                    g.Count);
            })
            .OrderByDescending(x => x.ServiceCount)
            .ToList();

        return Ok(result);
    }
}
