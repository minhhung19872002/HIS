using System.Security.Claims;
using System.Security.Cryptography;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Quản lý phòng hội chẩn video conference — Sprint 5 Item 1.4.
/// Tích hợp Jitsi Meet (meet.jit.si public hoặc self-host).
/// </summary>
[ApiController]
[Route("api/video-consultation")]
[Authorize]
public class VideoConsultationController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    public VideoConsultationController(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private string JitsiBaseUrl =>
        (_config["Jitsi:BaseUrl"] ?? Environment.GetEnvironmentVariable("JITSI_BASE_URL")
            ?? "https://meet.jit.si").TrimEnd('/');

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private static string GenerateRoomName()
    {
        var bytes = RandomNumberGenerator.GetBytes(8);
        return $"his-{DateTime.Now:yyMMdd}-{Convert.ToHexString(bytes).ToLowerInvariant()}";
    }

    public record CreateRoomDto(
        string Title,
        int RoomType,
        string? Description,
        string? StudyInstanceUID,
        Guid? PatientId,
        Guid? MedicalRecordId,
        DateTime? ScheduledAt,
        bool IsRecorded,
        string? Password,
        string[]? InviteEmails);

    public record RoomDto(
        Guid Id,
        string RoomName,
        string Title,
        int RoomType,
        string? StudyInstanceUID,
        Guid? PatientId,
        string? PatientName,
        Guid HostUserId,
        string? HostName,
        DateTime ScheduledAt,
        DateTime? StartedAt,
        DateTime? EndedAt,
        int Status,
        string StatusText,
        bool IsRecorded,
        string? RecordingUrl,
        bool HasPassword,
        string JitsiUrl,
        string? ConclusionNote,
        DateTime CreatedAt);

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

    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create([FromBody] CreateRoomDto dto)
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
            HostUserId = GetUserId(),
            ScheduledAt = dto.ScheduledAt ?? DateTime.UtcNow,
            Status = 0,
            IsRecorded = dto.IsRecorded,
            Password = dto.Password,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = GetUserId().ToString()
        };

        if (dto.InviteEmails != null && dto.InviteEmails.Length > 0)
        {
            room.ParticipantsJson = System.Text.Json.JsonSerializer.Serialize(
                dto.InviteEmails.Select(e => new { email = e, joined = false }));
        }

        _db.ConsultationRooms.Add(room);
        await _db.SaveChangesAsync();
        return Ok(ToDto(room));
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] int? status,
        [FromQuery] int? roomType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? keyword,
        [FromQuery] int pageSize = 50)
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
        return Ok(rooms.Select(r => ToDto(r, r.Patient?.FullName, r.HostUser?.FullName)));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomDto>> GetById(Guid id)
    {
        var r = await _db.ConsultationRooms
            .Include(x => x.Patient)
            .Include(x => x.HostUser)
            .FirstOrDefaultAsync(x => x.Id == id);
        return r == null ? NotFound() : Ok(ToDto(r, r.Patient?.FullName, r.HostUser?.FullName));
    }

    [HttpPost("{id:guid}/start")]
    public async Task<ActionResult<RoomDto>> Start(Guid id)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.Status != 0) return BadRequest(new { message = "Phòng không ở trạng thái chờ" });
        r.Status = 1;
        r.StartedAt = DateTime.UtcNow;
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(r));
    }

    [HttpPost("{id:guid}/end")]
    public async Task<ActionResult<RoomDto>> End(Guid id, [FromBody] EndRoomDto dto)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.HostUserId != GetUserId())
            return StatusCode(403, new { message = "Chỉ host mới kết thúc được phòng" });
        r.Status = 2;
        r.EndedAt = DateTime.UtcNow;
        r.ConclusionNote = dto.ConclusionNote;
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(r));
    }

    public record EndRoomDto(string? ConclusionNote);

    public record JoinDto(string DisplayName, string? Email, string? Role);

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id, [FromBody] JoinDto dto)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.Status == 2 || r.Status == 3) return BadRequest(new { message = "Phòng đã kết thúc" });

        _db.ConsultationParticipants.Add(new ConsultationParticipant
        {
            Id = Guid.NewGuid(),
            ConsultationRoomId = id,
            UserId = GetUserId(),
            DisplayName = dto.DisplayName,
            Email = dto.Email,
            Role = dto.Role,
            JoinedAt = DateTime.UtcNow,
            JoinIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok(new { jitsiUrl = BuildJitsiUrl(r.RoomName), password = r.Password });
    }

    [HttpGet("{id:guid}/participants")]
    public async Task<IActionResult> Participants(Guid id)
    {
        var list = await _db.ConsultationParticipants
            .Include(p => p.User)
            .Where(p => p.ConsultationRoomId == id)
            .OrderByDescending(p => p.JoinedAt)
            .ToListAsync();
        return Ok(list.Select(p => new
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

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelDto dto)
    {
        var r = await _db.ConsultationRooms.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        if (r.HostUserId != GetUserId())
            return StatusCode(403, new { message = "Chỉ host mới hủy được phòng" });
        r.Status = 3;
        r.UpdatedAt = DateTime.UtcNow;
        r.ConclusionNote = dto.Reason;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    public record CancelDto(string? Reason);
}
