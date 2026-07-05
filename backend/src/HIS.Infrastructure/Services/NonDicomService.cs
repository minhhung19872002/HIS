using HIS.Application.Common;
using HIS.Application.DTOs.NonDicom;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic Non-DICOM study/image — tách khỏi NonDicomController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + message giữ nguyên; userId truyền
/// từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// Upload + GetImage vẫn nằm ở controller (dính IFormFileCollection/PhysicalFile + I/O file streaming).
/// </summary>
public class NonDicomService : INonDicomService
{
    private readonly HISDbContext _db;
    public NonDicomService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> CreateStudyAsync(CreateStudyDto dto, Guid userId)
    {
        var study = new NonDicomStudy
        {
            Id = Guid.NewGuid(),
            ServiceRequestDetailId = dto.ServiceRequestDetailId,
            PatientId = dto.PatientId,
            DeviceType = dto.DeviceType,
            DeviceName = dto.DeviceName,
            RoomId = dto.RoomId,
            PerformedByUserId = userId,
            CapturedAt = DateTime.UtcNow,
            Status = 0,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _db.NonDicomStudies.Add(study);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = study.Id, status = study.Status });
    }

    public async Task<ServiceOutcome> GetStudyAsync(Guid studyId)
    {
        var study = await _db.NonDicomStudies
            .Include(s => s.Patient)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(s => s.Id == studyId);
        if (study == null) return ServiceOutcome.NotFound();
        return ServiceOutcome.Ok(new
        {
            study.Id,
            study.PatientId,
            PatientName = study.Patient?.FullName,
            study.DeviceType,
            study.DeviceName,
            study.CapturedAt,
            study.Status,
            study.Description,
            study.Conclusion,
            study.Findings,
            Images = study.Images.OrderBy(i => i.SortOrder).Select(i => new
            {
                i.Id,
                i.MediaType,
                i.FileName,
                i.FilePath,
                i.MimeType,
                i.SortOrder,
                i.Annotation,
                i.IncludeInReport,
            })
        });
    }

    public async Task<ServiceOutcome> UpdateStudyAsync(Guid studyId, UpdateStudyDto dto, Guid userId)
    {
        var study = await _db.NonDicomStudies.FirstOrDefaultAsync(s => s.Id == studyId)
            ?? throw new KeyNotFoundException();
        if (dto.Description != null) study.Description = dto.Description;
        if (dto.Findings != null) study.Findings = dto.Findings;
        if (dto.Conclusion != null) study.Conclusion = dto.Conclusion;
        if (dto.Status.HasValue) study.Status = dto.Status.Value;
        study.UpdatedAt = DateTime.UtcNow;
        study.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> DeleteImageAsync(Guid imageId)
    {
        var img = await _db.NonDicomImages.FirstOrDefaultAsync(i => i.Id == imageId)
            ?? throw new KeyNotFoundException();
        _db.NonDicomImages.Remove(img);
        await _db.SaveChangesAsync();
        // File thực để lại (tránh mất khi rollback), GC background task sẽ dọn sau
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> WorklistAsync(string? deviceType, DateTime? fromDate, DateTime? toDate)
    {
        var q = _db.NonDicomStudies
            .Include(s => s.Patient)
            .Include(s => s.Images)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(deviceType)) q = q.Where(s => s.DeviceType == deviceType);
        if (fromDate.HasValue) q = q.Where(s => s.CapturedAt >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(s => s.CapturedAt <= toDate.Value.AddDays(1));
        var list = await q
            .OrderByDescending(s => s.CapturedAt)
            .Take(200)
            .ToListAsync();
        return ServiceOutcome.Ok(list.Select(s => new
        {
            s.Id,
            PatientName = s.Patient?.FullName,
            PatientCode = s.Patient?.PatientCode,
            s.DeviceType,
            s.DeviceName,
            s.CapturedAt,
            s.Status,
            ImageCount = s.Images.Count,
            HasConclusion = !string.IsNullOrWhiteSpace(s.Conclusion)
        }));
    }
}
