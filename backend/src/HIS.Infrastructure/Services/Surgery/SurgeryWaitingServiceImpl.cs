using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 POC Step 2a (2026-05-30, Plan B): Implementation ISurgeryWaitingService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.2 (4 method).
/// </summary>
public class SurgeryWaitingServiceImpl : ISurgeryWaitingService
{
    private readonly HISDbContext _context;

    public SurgeryWaitingServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<SurgeryWaitingListDto> GetWaitingListAsync(Guid operatingRoomId, DateTime date)
    {
        var room = await _context.Set<OperatingRoom>().FindAsync(operatingRoomId);
        var schedules = await _context.Set<SurgerySchedule>()
            .Include(s => s.SurgeryRequest)
            .ThenInclude(r => r.Patient)
            .Where(s => s.OperatingRoomId == operatingRoomId && s.ScheduledDate.Date == date.Date && !s.IsDeleted)
            .OrderBy(s => s.ScheduledTime)
            .ToListAsync();

        return new SurgeryWaitingListDto
        {
            OperatingRoomId = operatingRoomId,
            OperatingRoomName = room?.RoomName ?? "",
            Date = date,
            WaitingPatients = schedules.Select((s, i) => new SurgeryWaitingItemDto
            {
                SurgeryId = s.SurgeryRequestId,
                QueueNumber = i + 1,
                PatientCode = s.SurgeryRequest?.Patient?.PatientCode ?? "",
                PatientName = s.SurgeryRequest?.Patient?.FullName ?? "",
                SurgeryServiceName = s.SurgeryRequest?.PlannedProcedure ?? "",
                Status = s.Status,
                StatusName = GetStatusName(s.Status),
                ScheduledTime = s.ScheduledDateTime,
                EstimatedDuration = s.EstimatedDuration ?? 60
            }).ToList()
        };
    }

    public async Task<List<SurgeryWaitingListDto>> GetAllWaitingListsAsync(DateTime date)
    {
        var rooms = await _context.Set<OperatingRoom>().Where(r => r.IsActive).ToListAsync();
        var result = new List<SurgeryWaitingListDto>();

        foreach (var room in rooms)
        {
            result.Add(await GetWaitingListAsync(room.Id, date));
        }

        return result;
    }

    public async Task<List<OperatingRoomDto>> GetOperatingRoomsAsync(int? roomType, int? status)
    {
        try
        {
            var query = _context.Set<OperatingRoom>().Where(r => r.IsActive);

            if (roomType.HasValue)
                query = query.Where(r => r.RoomType == roomType.Value);

            if (status.HasValue)
                query = query.Where(r => r.Status == status.Value);

            return await query.Select(r => new OperatingRoomDto
            {
                Id = r.Id,
                Code = r.RoomCode,
                Name = r.RoomName,
                RoomType = r.RoomType,
                RoomTypeName = GetRoomTypeName(r.RoomType),
                Status = r.Status,
                StatusName = GetRoomStatusName(r.Status),
                IsActive = r.IsActive
            }).ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetOperatingRoomsAsync: missing table/column - {ex.Message}");
            return new List<OperatingRoomDto>();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetOperatingRoomsAsync error: {ex.Message}");
            return new List<OperatingRoomDto>();
        }
    }

    public async Task<OperatingRoomDto> UpdateOperatingRoomStatusAsync(Guid roomId, int status, Guid userId)
    {
        var room = await _context.Set<OperatingRoom>().FindAsync(roomId);
        if (room != null)
        {
            room.Status = status;
            room.UpdatedAt = DateTime.Now;
            room.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }

        return new OperatingRoomDto
        {
            Id = roomId,
            Status = status,
            StatusName = GetRoomStatusName(status)
        };
    }

    // Helper copy từ SurgeryCompleteService cũ (private static, không lệ thuộc state).
    // TODO refactor: extract sang shared utility nếu nhiều service dùng.
    private static string GetRoomStatusName(int status) => status switch
    {
        1 => "Sẵn sàng",
        2 => "Đang sử dụng",
        3 => "Bảo trì",
        4 => "Ngừng hoạt động",
        _ => "Không xác định"
    };

    private static string GetStatusName(int status) => status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đang thực hiện",
        3 => "Hoàn thành",
        4 => "Đã hủy",
        5 => "Hoãn",
        _ => "Không xác định"
    };

    private static string GetRoomTypeName(int roomType) => roomType switch
    {
        1 => "Phòng mổ lớn",
        2 => "Phòng mổ nhỏ",
        3 => "Phòng mổ cấp cứu",
        4 => "Phòng mổ chuyên khoa",
        _ => "Phòng mổ"
    };
}
