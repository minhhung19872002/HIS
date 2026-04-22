using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/radiology-dispatch")]
[Authorize]
public class RadiologyDispatchController : ControllerBase
{
    private readonly HISDbContext _db;
    public RadiologyDispatchController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ==================== Dispatch ====================

    public record CreateDispatchDto(
        Guid ServiceRequestDetailId,
        Guid RoomId,
        int? Priority,
        string? Note);

    [HttpPost]
    public async Task<IActionResult> Dispatch([FromBody] CreateDispatchDto dto)
    {
        var detail = await _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord)
            .FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException("Dịch vụ không tồn tại");

        var room = await _db.Rooms.FindAsync(dto.RoomId)
            ?? throw new KeyNotFoundException("Phòng không tồn tại");

        var existing = await _db.RadiologyDispatches
            .FirstOrDefaultAsync(d => d.ServiceRequestDetailId == dto.ServiceRequestDetailId && !d.IsPerformed);

        if (existing != null)
        {
            existing.RoomId = dto.RoomId;
            existing.Priority = dto.Priority ?? existing.Priority;
            existing.Note = dto.Note ?? existing.Note;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, id = existing.Id, updated = true });
        }

        var dispatch = new RadiologyDispatch
        {
            Id = Guid.NewGuid(),
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            PatientId = detail.ServiceRequest.MedicalRecord.PatientId,
            RoomId = dto.RoomId,
            DispatchedByUserId = GetUserId(),
            DispatchedAt = DateTime.UtcNow,
            Priority = dto.Priority ?? 1,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow
        };
        _db.RadiologyDispatches.Add(dispatch);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, id = dispatch.Id, updated = false });
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var dispatch = await _db.RadiologyDispatches.FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new KeyNotFoundException();
        if (dispatch.IsPerformed) return BadRequest(new { message = "Đã thực hiện, không hủy được" });
        dispatch.IsDeleted = true;
        dispatch.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/mark-arrived")]
    public async Task<IActionResult> MarkArrived(Guid id)
    {
        var d = await _db.RadiologyDispatches.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        d.IsArrived = true;
        d.ArrivedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/mark-performed")]
    public async Task<IActionResult> MarkPerformed(Guid id)
    {
        var d = await _db.RadiologyDispatches.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        d.IsPerformed = true;
        d.PerformedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("queue/{roomId:guid}")]
    public async Task<IActionResult> RoomQueue(Guid roomId)
    {
        var queue = await _db.RadiologyDispatches
            .Include(d => d.Patient)
            .Include(d => d.ServiceRequestDetail).ThenInclude(s => s!.Service)
            .Where(d => d.RoomId == roomId && !d.IsPerformed)
            .OrderByDescending(d => d.Priority)
            .ThenBy(d => d.DispatchedAt)
            .Select(d => new
            {
                d.Id,
                d.PatientId,
                PatientName = d.Patient!.FullName,
                PatientCode = d.Patient!.PatientCode,
                ServiceName = d.ServiceRequestDetail!.Service.ServiceName,
                d.Priority,
                d.IsArrived,
                d.ArrivedAt,
                d.DispatchedAt,
                d.Note
            })
            .ToListAsync();
        return Ok(queue);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> PendingServices()
    {
        // Danh sách BN có chỉ định CĐHA nhưng chưa được điều phối
        var pending = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(d => d.Service.ServiceType == 3
                && d.Status < 2
                && !_db.RadiologyDispatches.Any(x => x.ServiceRequestDetailId == d.Id && !x.IsPerformed))
            .OrderBy(d => d.CreatedAt)
            .Take(200)
            .Select(d => new
            {
                ServiceRequestDetailId = d.Id,
                PatientId = d.ServiceRequest.MedicalRecord.PatientId,
                PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName,
                PatientCode = d.ServiceRequest.MedicalRecord.Patient.PatientCode,
                ServiceName = d.Service.ServiceName,
                ServiceCode = d.Service.ServiceCode,
                d.CreatedAt,
                d.SampleBarcode
            })
            .ToListAsync();
        return Ok(pending);
    }

    // ==================== Permissions ====================

    public record SavePermissionDto(
        Guid UserId,
        Guid? RoomId,
        string? ModalityType,
        int Permissions,
        string? RoleTemplate);

    [HttpPost("permissions")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<IActionResult> SavePermission([FromBody] SavePermissionDto dto)
    {
        var existing = await _db.RadiologyPermissions
            .FirstOrDefaultAsync(p => p.UserId == dto.UserId && p.RoomId == dto.RoomId);
        if (existing != null)
        {
            existing.Permissions = dto.Permissions;
            existing.ModalityType = dto.ModalityType;
            existing.RoleTemplate = dto.RoleTemplate;
            existing.IsActive = true;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = GetUserId().ToString();
        }
        else
        {
            _db.RadiologyPermissions.Add(new RadiologyPermission
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                RoomId = dto.RoomId,
                ModalityType = dto.ModalityType,
                Permissions = dto.Permissions,
                RoleTemplate = dto.RoleTemplate,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = GetUserId().ToString()
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("permissions/copy")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<IActionResult> CopyPermissions([FromQuery] Guid fromUserId, [FromQuery] Guid toUserId)
    {
        var sourcePerms = await _db.RadiologyPermissions
            .Where(p => p.UserId == fromUserId && p.IsActive)
            .ToListAsync();
        // Xóa perm cũ của toUser
        var existing = await _db.RadiologyPermissions.Where(p => p.UserId == toUserId).ToListAsync();
        _db.RadiologyPermissions.RemoveRange(existing);
        foreach (var p in sourcePerms)
        {
            _db.RadiologyPermissions.Add(new RadiologyPermission
            {
                Id = Guid.NewGuid(),
                UserId = toUserId,
                RoomId = p.RoomId,
                ModalityType = p.ModalityType,
                Permissions = p.Permissions,
                RoleTemplate = p.RoleTemplate,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = GetUserId().ToString()
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true, copied = sourcePerms.Count });
    }

    [HttpGet("permissions/user/{userId:guid}")]
    public async Task<IActionResult> UserPermissions(Guid userId)
    {
        var perms = await _db.RadiologyPermissions
            .Include(p => p.Room)
            .Where(p => p.UserId == userId && p.IsActive)
            .Select(p => new
            {
                p.Id,
                p.RoomId,
                RoomName = p.Room != null ? p.Room.RoomName : "Tất cả máy",
                p.ModalityType,
                p.Permissions,
                p.RoleTemplate,
            })
            .ToListAsync();
        return Ok(perms);
    }

    [HttpDelete("permissions/{id:guid}")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<IActionResult> DeletePermission(Guid id)
    {
        var p = await _db.RadiologyPermissions.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException();
        p.IsActive = false;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
