using HIS.Application.Common;
using HIS.Application.DTOs.VideoConsultation;

namespace HIS.Application.Interfaces;

/// <summary>
/// Phòng hội chẩn video conference (Sprint 5 Item 1.4, Jitsi Meet). Logic tách khỏi
/// VideoConsultationController (#202) — controller chỉ điều phối HTTP, service giữ DbContext + IConfiguration.
/// Behavior-preserving: giữ nguyên projection/response shape + message + Jitsi URL; userId thay GetUserId(),
/// joinIp thay HttpContext.Connection.RemoteIpAddress. throw KeyNotFoundException giữ nguyên (controller propagate).
/// </summary>
public interface IVideoConsultationService
{
    Task<ServiceOutcome> CreateAsync(CreateRoomDto dto, Guid userId);

    Task<ServiceOutcome> SearchAsync(int? status, int? roomType, DateTime? fromDate,
        DateTime? toDate, string? keyword, int pageSize);

    Task<ServiceOutcome> GetByIdAsync(Guid id);

    Task<ServiceOutcome> StartAsync(Guid id);

    Task<ServiceOutcome> EndAsync(Guid id, EndRoomDto dto, Guid userId);

    Task<ServiceOutcome> JoinAsync(Guid id, JoinDto dto, Guid userId, string? joinIp);

    Task<ServiceOutcome> ParticipantsAsync(Guid id);

    Task<ServiceOutcome> CancelAsync(Guid id, CancelDto dto, Guid userId);
}
