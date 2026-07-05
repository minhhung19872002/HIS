using HIS.Application.Common;
using HIS.Application.DTOs.SampleReceive;

namespace HIS.Application.Interfaces;

/// <summary>
/// Sample Receive + Review workflow — N1.16 + N1.17. Logic tách khỏi
/// SampleReceiveController (#202 thin-controller). Collect → Receive → Technician run → Reviewer duyệt.
/// Behavior-preserving: giữ nguyên query/projection/response shape + message; userId truyền từ
/// controller (thay cho GetUserId() cũ đọc claim). Trả ServiceOutcome để controller map về IActionResult.
/// </summary>
public interface ISampleReceiveService
{
    Task<ServiceOutcome> PendingAsync(string? keyword);
    Task<ServiceOutcome> AcceptAsync(ReceiveDto dto, Guid userId);
    Task<ServiceOutcome> RejectAsync(RejectDto dto, Guid userId);
    Task<ServiceOutcome> TechnicianRunAsync(RunDto dto, Guid userId);
    Task<ServiceOutcome> ReviewAsync(ReviewDto dto, Guid userId);
    Task<ServiceOutcome> CancelReceiveAsync(CancelReceiveDto dto, Guid userId);
    Task<ServiceOutcome> AcceptedAsync(string? keyword);
    Task<ServiceOutcome> StatusAsync(Guid detailId);
}
