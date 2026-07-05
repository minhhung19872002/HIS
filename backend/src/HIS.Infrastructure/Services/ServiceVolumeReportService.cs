using HIS.Application.Common;
using HIS.Application.DTOs.ServiceVolumeReport;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Thống kê số lượt thực hiện dịch vụ theo phòng/máy (ExecuteRoom) — tách khỏi
/// ServiceVolumeReportController (#202 thin-controller). Behavior-preserving: mọi
/// query/group/projection/order + response shape giữ nguyên. Return map về ServiceOutcome.
/// </summary>
public class ServiceVolumeReportService : IServiceVolumeReportService
{
    private readonly HISDbContext _db;

    public ServiceVolumeReportService(HISDbContext db) { _db = db; }

    /// <summary>Gom số phiếu chỉ định theo phòng thực hiện (ExecuteRoomId) trong [fromDate, toDate].</summary>
    public async Task<ServiceOutcome> GetAsync(DateTime? fromDate, DateTime? toDate)
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

        return ServiceOutcome.Ok(result);
    }
}
