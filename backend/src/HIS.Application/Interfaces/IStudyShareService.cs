using HIS.Application.Common;
using HIS.Application.DTOs.StudyShare;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic chia sẻ study (link xem ảnh DICOM public) — tách khỏi StudyShareController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền từ
/// controller (thay cho GetUserId() cũ đọc claim). Các giá trị phụ thuộc HttpContext (Request.Scheme/
/// Request.Host để dựng URL; RemoteIpAddress để log IP) cũng truyền từ controller vào service.
/// Return map về ServiceOutcome để controller giữ nguyên status code + body.
/// ⚠ Xem concerns: một số return StatusCode(403)/StatusCode(401) không có shape tương ứng trong
/// ServiceOutcome nên bị map về Bad(400) — thay đổi status code (KHÔNG behavior-preserving 100%).
/// </summary>
public interface IStudyShareService
{
    Task<ServiceOutcome> CreateAsync(CreateShareDto dto, string requestScheme, string requestHost, Guid userId);
    Task<ServiceOutcome> MyLinksAsync(string requestScheme, string requestHost, Guid userId);
    Task<ServiceOutcome> RevokeAsync(Guid id, RevokeDto dto, Guid userId);
    Task<ServiceOutcome> AccessAsync(string token, AccessDto dto, string? remoteIp);
    Task<ServiceOutcome> PeekAsync(string token);
}
