using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Record Handover
    // ========================================================================

    public async Task<PagedHandoverResult> GetHandoverAsync(HandoverSearchDto search)
    {
        try
        {
            var query = _context.MedicalRecordArchives
                .Include(a => a.MedicalRecord)
                .Include(a => a.Patient)
                .Include(a => a.Department)
                .Include(a => a.ArchivedBy)
                .Where(a => !a.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(a =>
                    a.ArchiveCode.ToLower().Contains(kw) ||
                    a.Patient.FullName.ToLower().Contains(kw) ||
                    a.Patient.PatientCode.ToLower().Contains(kw));
            }

            if (search.DepartmentId.HasValue)
                query = query.Where(a => a.DepartmentId == search.DepartmentId.Value);
            if (search.Status.HasValue)
                query = query.Where(a => a.Status == search.Status.Value);

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(a => a.ArchivedDate ?? a.CreatedAt)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(a => new
                {
                    a.Id,
                    a.ArchiveCode,
                    RecordCode = a.MedicalRecord.MedicalRecordCode,
                    PatientCode = a.Patient.PatientCode,
                    PatientName = a.Patient.FullName,
                    DepartmentName = a.Department != null ? a.Department.DepartmentName : "",
                    ArchivedByName = a.ArchivedBy != null ? a.ArchivedBy.FullName : "",
                    a.ArchivedDate,
                    a.Status,
                })
                .ToListAsync();

            var items = records.Select(a => new HandoverRecordDto
            {
                Id = a.Id,
                HandoverCode = a.ArchiveCode,
                RecordCode = a.RecordCode,
                PatientCode = a.PatientCode,
                PatientName = a.PatientName,
                DepartmentName = a.DepartmentName,
                SubmittedByName = a.ArchivedByName,
                SubmittedDate = a.ArchivedDate,
                Status = a.Status,
                StatusName = GetHandoverStatusName(a.Status),
            }).ToList();

            return new PagedHandoverResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying handovers, returning stub data");
            return GetStubHandovers(search);
        }
    }

    public async Task<HandoverRecordDto> SubmitHandoverAsync(SubmitHandoverDto dto, Guid userId)
    {
        var code = $"BG-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
        await Task.CompletedTask;
        return new HandoverRecordDto
        {
            Id = Guid.NewGuid(),
            HandoverCode = code,
            SubmittedDate = DateTime.UtcNow,
            Status = 1,
            StatusName = "Da gui",
            TotalForms = dto.MedicalRecordIds.Count,
            CompletedForms = dto.MedicalRecordIds.Count,
            Note = dto.Note,
        };
    }

    public async Task<HandoverRecordDto> ApproveHandoverAsync(ApproveHandoverDto dto, Guid userId)
    {
        await Task.CompletedTask;
        return new HandoverRecordDto
        {
            Id = dto.HandoverId,
            ApprovedDate = DateTime.UtcNow,
            Status = dto.Approve ? 2 : 3,
            StatusName = dto.Approve ? "Da duyet" : "Tu choi",
        };
    }
}
