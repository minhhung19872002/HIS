using System.Security.Cryptography;
using HIS.Application.Common;
using HIS.Application.DTOs.VideoConsultation;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic phòng hội chẩn video conference (Sprint 5 Item 1.4, Jitsi Meet) — tách khỏi
/// VideoConsultationController (#202 thin-controller). Behavior-preserving: mọi query/projection/response
/// shape + message + Jitsi URL giữ nguyên; userId thay GetUserId(), joinIp thay HttpContext cũ. throw
/// KeyNotFoundException giữ nguyên (controller propagate). Return map về ServiceOutcome.
/// </summary>
public class VideoConsultationService : IVideoConsultationService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    public VideoConsultationService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private string JitsiBaseUrl =>
        (_config["Jitsi:BaseUrl"] ?? Environment.GetEnvironmentVariable("JITSI_BASE_URL")
            ?? "https://meet.jit.si").TrimEnd('/');

    private static string GenerateRoomName()
    {
        var bytes = RandomNumberGenerator.GetBytes(8);
        return $"his-{DateTime.Now:yyMMdd}-{Convert.ToHexString(bytes).ToLowerInvariant()}";
    }



    private string BuildJitsiUrl(string roomName) => $"{JitsiBaseUrl}/{roomName}";

    private RoomDto ToDto(ConsultationRoom r, string? patientName = null, string? hostName = null)
        => new(
            r.Id, r.RoomName, r.Title, r.RoomType,
            r.StudyInstanceUID, r.PatientId, patientName,
            r.HostUserId, hostName,
            r.ScheduledAt, r.StartedAt, r.EndedAt,
            r.Status,
            r.Status switch { 0 => "Đã lên lịch", 1 => "Đang diễn ra", 2 => "Đã kết thúc", 3 => "Đã hủy", _ => "?" },
            r.IsRecorded, r.RecordingUrl,
            !string.IsNullOrEmpty(r.Password),
            BuildJitsiUrl(r.RoomName),
            r.ConclusionNote,
            r.CreatedAt);

    public async Task<ServiceOutcome> CreateAsync(CreateRoomDto dto, Guid userId)
    {
        var room = new ConsultationRoom
        {
            Id = Guid.NewGuid(),
            RoomName = GenerateRoomName(),
            Title = dto.Title,
            Description = dto.Description,
            RoomType = dto.RoomType,
            StudyInstanceUID = dto.StudyInstanceUID,
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            HostUserId = userId,
            ScheduledAt = dto.ScheduledAt ?? DateTime.UtcNow,
            Status = 0,
            IsRecorded = dto.IsRecorded,
            Password = dto.Password,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        if (dto.InviteEmails != null && dto.InviteEmails.Length > 0)
        {
            room.ParticipantsJson = System.Text.Json.JsonSerializer.Serialize(
                dto.InviteEmails.Select(e => new { email = e, joined = false }));
        }

        _db.ConsultationRooms.Add(room);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(ToDto(room));
    }

    public async Task<ServiceOutcome> SearchAsync(
        int? status,
        int? roomType,
        DateTime? fromDate,
        DateTime? toDate,
        string? keyword,
        int pageSize)
    {
        var q = _db.ConsultationRooms
            .Include(r => r.Patient)
            .Include(r => r.HostUser)
            .AsQueryable();
        if (status.HasValue) q = q.Where(r => r.Status == status.Value);
        if (roomType.HasValue) q = q.Where(r => r.RoomType == roomType.Value);
        if (fromDate.HasValue) q = q.Where(r => r.ScheduledAt >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(r => r.ScheduledAt <= toDate.Value.AddDays(1));
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(r => r.Title.Contains(keyword) || r.RoomName.Contains(keyword));

        var rooms = await q.OrderByDescending(r => r.CreatedAt).Take(pageSize).ToListAsync();
        return ServiceOutcome.Ok(rooms.Select(r => ToDto(r, r.Patient?.FullName, r.HostUser?.FullName)));
    }

    public async Task<ServiceOutcome> GetByIdAsync(Guid id)
    {
        var r = await _db.ConsultationRooms
            .Include(x => x.Patient)
            .Include(x => x.HostUser)
            .FirstOrDefaultAsync(x => x.Id == id);
        return r == null ? ServiceOutcome.NotFound() : ServiceOutcome.Ok(ToDto(r, r.Patient?.FullName, r.HostUser?.FullName));
    }

    public async Task<ServiceOutcome> StartAsync(Guid id)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.Status != 0) return ServiceOutcome.Bad("Phòng không ở trạng thái chờ");
        r.Status = 1;
        r.StartedAt = DateTime.UtcNow;
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(ToDto(r));
    }

    public async Task<ServiceOutcome> EndAsync(Guid id, EndRoomDto dto, Guid userId)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.HostUserId != userId)
            return ServiceOutcome.Forbidden(new { message = "Chỉ host mới kết thúc được phòng" });
        r.Status = 2;
        r.EndedAt = DateTime.UtcNow;
        r.ConclusionNote = dto.ConclusionNote;
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(ToDto(r));
    }



    public async Task<ServiceOutcome> JoinAsync(Guid id, JoinDto dto, Guid userId, string? joinIp)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.Status == 2 || r.Status == 3) return ServiceOutcome.Bad("Phòng đã kết thúc");

        _db.ConsultationParticipants.Add(new ConsultationParticipant
        {
            Id = Guid.NewGuid(),
            ConsultationRoomId = id,
            UserId = userId,
            DisplayName = dto.DisplayName,
            Email = dto.Email,
            Role = dto.Role,
            JoinedAt = DateTime.UtcNow,
            JoinIp = joinIp,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { jitsiUrl = BuildJitsiUrl(r.RoomName), password = r.Password });
    }

    public async Task<ServiceOutcome> ParticipantsAsync(Guid id)
    {
        var list = await _db.ConsultationParticipants
            .Include(p => p.User)
            .Where(p => p.ConsultationRoomId == id)
            .OrderByDescending(p => p.JoinedAt)
            .ToListAsync();
        return ServiceOutcome.Ok(list.Select(p => new
        {
            p.Id,
            p.DisplayName,
            p.Email,
            p.Role,
            p.JoinedAt,
            p.LeftAt,
            UserName = p.User?.FullName
        }));
    }

    public async Task<ServiceOutcome> CancelAsync(Guid id, CancelDto dto, Guid userId)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.HostUserId != userId)
            return ServiceOutcome.Forbidden(new { message = "Chỉ host mới hủy được phòng" });
        r.Status = 3;
        r.UpdatedAt = DateTime.UtcNow;
        r.ConclusionNote = dto.Reason;
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

}
