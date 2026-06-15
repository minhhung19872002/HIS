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

        // #8 + #14d (audit luồng nghiệp vụ 2026-06-06): cập nhật ServiceRequestDetail (model 1)
        // sang "Đang thực hiện" + BRIDGE sang model 4 (RadiologyRequest) để radiologist tường trình.
        // Trước đây CĐHA order qua ServiceRequest không sinh model 4 → KQ CĐHA không nhập/hiện được.
        var srd = await _db.ServiceRequestDetails
            .Include(s => s.ServiceRequest)
            .FirstOrDefaultAsync(s => s.Id == d.ServiceRequestDetailId);
        if (srd != null)
        {
            if (srd.Status < 1) srd.Status = 1; // Đang TH

            // Idempotent: chỉ tạo phiếu CĐHA model 4 nếu chưa có (theo link SourceServiceRequestDetailId).
            var alreadyBridged = await _db.RadiologyRequests
                .AnyAsync(r => r.SourceServiceRequestDetailId == srd.Id);
            if (!alreadyBridged)
            {
                var sr = srd.ServiceRequest;
                _db.RadiologyRequests.Add(new RadiologyRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"CDHA{DateTime.Now:yyyyMMddHHmmss}",
                    PatientId = d.PatientId,
                    ExaminationId = sr?.ExaminationId,
                    MedicalRecordId = sr?.MedicalRecordId,
                    RequestDate = sr?.RequestDate ?? DateTime.UtcNow, // dot16: chuẩn UTC
                    ServiceId = srd.ServiceId,
                    RequestingDoctorId = sr?.DoctorId ?? Guid.Empty,
                    Priority = d.Priority,
                    Status = 2, // InProgress — vừa thực hiện
                    ClinicalInfo = sr?.Diagnosis,
                    PatientType = srd.PatientType == 0 ? 2 : srd.PatientType,
                    TotalAmount = srd.Amount,
                    InsuranceAmount = srd.InsuranceAmount,
                    PatientAmount = srd.PatientAmount,
                    IsPaid = false,
                    ScheduledDate = DateTime.Now,
                    SourceServiceRequestDetailId = srd.Id,
                    Notes = "Tạo tự động từ điều phối CĐHA (model 1)",
                    CreatedAt = DateTime.Now,
                    CreatedBy = GetUserId().ToString(),
                });
            }
        }

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
    public async Task<IActionResult> PendingServices([FromQuery] bool overdueOnly = false)
    {
        // Đọc ngưỡng TAT từ SystemConfig (key: RIS.TAT.DefaultThresholdMinutes, mặc định 60 phút)
        var tatThresholdMinutes = 60;
        var tatConfig = await _db.SystemConfigs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConfigKey == "RIS.TAT.DefaultThresholdMinutes" && c.IsActive);
        if (tatConfig != null && int.TryParse(tatConfig.ConfigValue, out var parsed) && parsed > 0)
            tatThresholdMinutes = parsed;

        var nowUtc = DateTime.UtcNow;

        // Danh sách BN có chỉ định CĐHA nhưng chưa được điều phối
        var rawPending = await _db.ServiceRequestDetails
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

        // Tính TAT (CreatedAt lưu UTC bằng DateTime.UtcNow — SpecifyKind để tránh ToUniversalTime() convert sai khi Kind=Unspecified)
        var pending = rawPending.Select(d =>
        {
            var createdAtUtc = DateTime.SpecifyKind(d.CreatedAt, DateTimeKind.Utc);
            var tatMinutes = (int)(nowUtc - createdAtUtc).TotalMinutes;
            if (tatMinutes < 0) tatMinutes = 0;
            return new
            {
                d.ServiceRequestDetailId,
                d.PatientId,
                d.PatientName,
                d.PatientCode,
                d.ServiceName,
                d.ServiceCode,
                d.CreatedAt,
                d.SampleBarcode,
                TATMinutes = tatMinutes,
                IsOverdue = tatMinutes > tatThresholdMinutes,
            };
        }).ToList();

        return Ok(overdueOnly ? pending.Where(x => x.IsOverdue).ToList() : pending);
    }

    // ==================== Permissions ====================

    public record SavePermissionDto(
        Guid UserId,
        Guid? RoomId,
        /// <summary>G-36: FK sang RadiologyModalities.Id — null = áp dụng mọi loại máy</summary>
        Guid? ModalityId,
        string? ModalityType,
        int Permissions,
        string? RoleTemplate);

    [HttpPost("permissions")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<IActionResult> SavePermission([FromBody] SavePermissionDto dto)
    {
        // G-36: unique key = (UserId, RoomId, ModalityId) — phân biệt quyền theo máy cụ thể
        var existing = await _db.RadiologyPermissions
            .FirstOrDefaultAsync(p => p.UserId == dto.UserId && p.RoomId == dto.RoomId && p.ModalityId == dto.ModalityId);
        if (existing != null)
        {
            existing.Permissions = dto.Permissions;
            existing.ModalityType = dto.ModalityType;
            existing.ModalityId = dto.ModalityId;
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
                ModalityId = dto.ModalityId,
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
            .Include(p => p.Modality) // G-36: per-modality permission
            .Where(p => p.UserId == userId && p.IsActive)
            .Select(p => new
            {
                p.Id,
                p.RoomId,
                RoomName = p.Room != null ? p.Room.RoomName : "Tất cả máy",
                p.ModalityId,
                ModalityCode = p.Modality != null ? p.Modality.ModalityCode : null,
                ModalityName = p.Modality != null ? p.Modality.ModalityName : null,
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
