using HIS.Application.DTOs.Surgery;

namespace HIS.Application.Services.Surgery;

/// <summary>
/// Surgery Waiting Service — 6.2 Màn hình chờ phòng mổ.
///
/// K12 POC Step 2a (2026-05-30, Plan B): tách 4 method waiting list/operating room
/// khỏi god interface ISurgeryCompleteService (105 method).
/// Facade vẫn giữ public API stable.
/// </summary>
public interface ISurgeryWaitingService
{
    Task<SurgeryWaitingListDto> GetWaitingListAsync(Guid operatingRoomId, DateTime date);
    Task<List<SurgeryWaitingListDto>> GetAllWaitingListsAsync(DateTime date);
    Task<List<OperatingRoomDto>> GetOperatingRoomsAsync(int? roomType, int? status);
    Task<OperatingRoomDto> UpdateOperatingRoomStatusAsync(Guid roomId, int status, Guid userId);
}
