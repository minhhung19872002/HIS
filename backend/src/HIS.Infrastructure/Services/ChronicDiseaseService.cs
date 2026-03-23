using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class ChronicDiseaseService : IChronicDiseaseService
{
    private readonly HISDbContext _context;

    public ChronicDiseaseService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<ChronicDiseaseListDto>> SearchRecordsAsync(ChronicDiseaseSearchDto filter)
    {
        try
        {
            var query = _context.ChronicDiseaseRecords
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Department)
                .Include(r => r.FollowUps)
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(r =>
                    r.IcdCode.ToLower().Contains(kw) ||
                    r.IcdName.ToLower().Contains(kw) ||
                    (r.Patient != null && (r.Patient.FullName.ToLower().Contains(kw) || r.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(r => r.Status == filter.Status);
            if (!string.IsNullOrEmpty(filter.IcdCode))
                query = query.Where(r => r.IcdCode == filter.IcdCode);
            if (filter.DoctorId.HasValue)
                query = query.Where(r => r.DoctorId == filter.DoctorId.Value);
            if (filter.DepartmentId.HasValue)
                query = query.Where(r => r.DepartmentId == filter.DepartmentId.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(r => r.DiagnosisDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(r => r.DiagnosisDate <= to.AddDays(1));

            var skip = filter.PageIndex * filter.PageSize;

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .Select(r => new ChronicDiseaseListDto
                {
                    Id = r.Id,
                    PatientId = r.PatientId,
                    PatientName = r.Patient != null ? r.Patient.FullName : "",
                    PatientCode = r.Patient != null ? r.Patient.PatientCode : "",
                    Gender = r.Patient != null ? r.Patient.Gender : null,
                    DateOfBirth = r.Patient != null && r.Patient.DateOfBirth.HasValue ? r.Patient.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    IcdCode = r.IcdCode,
                    IcdName = r.IcdName,
                    DiagnosisDate = r.DiagnosisDate.ToString("yyyy-MM-dd"),
                    Status = r.Status,
                    DoctorName = r.Doctor != null ? r.Doctor.FullName : null,
                    DepartmentName = r.Department != null ? r.Department.DepartmentName : null,
                    FollowUpIntervalDays = r.FollowUpIntervalDays,
                    NextFollowUpDate = r.NextFollowUpDate.HasValue ? r.NextFollowUpDate.Value.ToString("yyyy-MM-dd") : null,
                    TotalFollowUps = r.FollowUps.Count(f => !f.IsDeleted),
                    LastFollowUpDate = r.FollowUps.Where(f => !f.IsDeleted).OrderByDescending(f => f.FollowUpDate).Select(f => f.FollowUpDate.ToString("yyyy-MM-dd")).FirstOrDefault(),
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ChronicDiseaseListDto>();
        }
    }

    public async Task<ChronicDiseaseDetailDto?> GetRecordByIdAsync(Guid id)
    {
        try
        {
            var r = await _context.ChronicDiseaseRecords
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Department)
                .Include(r => r.FollowUps.Where(f => !f.IsDeleted))
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (r == null) return null;

            return new ChronicDiseaseDetailDto
            {
                Id = r.Id,
                PatientId = r.PatientId,
                PatientName = r.Patient?.FullName ?? "",
                PatientCode = r.Patient?.PatientCode ?? "",
                Gender = r.Patient?.Gender,
                DateOfBirth = r.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
                IcdCode = r.IcdCode,
                IcdName = r.IcdName,
                DiagnosisDate = r.DiagnosisDate.ToString("yyyy-MM-dd"),
                Status = r.Status,
                DoctorId = r.DoctorId,
                DoctorName = r.Doctor?.FullName,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department?.DepartmentName,
                FollowUpIntervalDays = r.FollowUpIntervalDays,
                NextFollowUpDate = r.NextFollowUpDate?.ToString("yyyy-MM-dd"),
                Notes = r.Notes,
                ClosedDate = r.ClosedDate?.ToString("yyyy-MM-dd"),
                ClosedReason = r.ClosedReason,
                RemovedDate = r.RemovedDate?.ToString("yyyy-MM-dd"),
                RemovedReason = r.RemovedReason,
                CreatedAt = r.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                TotalFollowUps = r.FollowUps.Count,
                LastFollowUpDate = r.FollowUps.OrderByDescending(f => f.FollowUpDate).Select(f => f.FollowUpDate.ToString("yyyy-MM-dd")).FirstOrDefault(),
                FollowUps = r.FollowUps.OrderByDescending(f => f.FollowUpDate).Select(f => new ChronicDiseaseFollowUpDto
                {
                    Id = f.Id,
                    ChronicDiseaseRecordId = f.ChronicDiseaseRecordId,
                    FollowUpDate = f.FollowUpDate.ToString("yyyy-MM-dd"),
                    Status = f.Status,
                    ExaminationId = f.ExaminationId,
                    Notes = f.Notes,
                    VitalSigns = f.VitalSigns,
                    MedicationChanges = f.MedicationChanges,
                    LabResults = f.LabResults,
                }).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<ChronicDiseaseDetailDto> CreateRecordAsync(CreateChronicDiseaseDto dto)
    {
        var diagnosisDate = DateTime.TryParse(dto.DiagnosisDate, out var dd) ? dd : DateTime.UtcNow;
        var record = new ChronicDiseaseRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            IcdCode = dto.IcdCode,
            IcdName = dto.IcdName,
            DiagnosisDate = diagnosisDate,
            Status = "Active",
            DoctorId = dto.DoctorId,
            DepartmentId = dto.DepartmentId,
            Notes = dto.Notes,
            FollowUpIntervalDays = dto.FollowUpIntervalDays > 0 ? dto.FollowUpIntervalDays : 30,
            NextFollowUpDate = diagnosisDate.AddDays(dto.FollowUpIntervalDays > 0 ? dto.FollowUpIntervalDays : 30),
            CreatedAt = DateTime.UtcNow,
        };

        _context.ChronicDiseaseRecords.Add(record);

        // Auto-create first follow-up schedule
        var followUp = new ChronicDiseaseFollowUp
        {
            Id = Guid.NewGuid(),
            ChronicDiseaseRecordId = record.Id,
            FollowUpDate = record.NextFollowUpDate.Value,
            Status = "Scheduled",
            CreatedAt = DateTime.UtcNow,
        };
        _context.ChronicDiseaseFollowUps.Add(followUp);

        await _context.SaveChangesAsync();
        return (await GetRecordByIdAsync(record.Id))!;
    }

    public async Task<ChronicDiseaseDetailDto> UpdateRecordAsync(Guid id, UpdateChronicDiseaseDto dto)
    {
        var record = await _context.ChronicDiseaseRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Record not found");

        if (dto.IcdCode != null) record.IcdCode = dto.IcdCode;
        if (dto.IcdName != null) record.IcdName = dto.IcdName;
        if (dto.DoctorId.HasValue) record.DoctorId = dto.DoctorId.Value;
        if (dto.DepartmentId.HasValue) record.DepartmentId = dto.DepartmentId.Value;
        if (dto.Notes != null) record.Notes = dto.Notes;
        if (dto.FollowUpIntervalDays.HasValue && dto.FollowUpIntervalDays.Value > 0)
        {
            record.FollowUpIntervalDays = dto.FollowUpIntervalDays.Value;
            // Recalculate next follow-up from last completed or today
            var lastCompleted = await _context.ChronicDiseaseFollowUps
                .Where(f => f.ChronicDiseaseRecordId == id && f.Status == "Completed" && !f.IsDeleted)
                .OrderByDescending(f => f.FollowUpDate)
                .FirstOrDefaultAsync();
            var baseDate = lastCompleted?.FollowUpDate ?? DateTime.UtcNow;
            record.NextFollowUpDate = baseDate.AddDays(dto.FollowUpIntervalDays.Value);
        }
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetRecordByIdAsync(id))!;
    }

    public async Task<bool> CloseRecordAsync(Guid id, CloseChronicDiseaseDto dto)
    {
        var record = await _context.ChronicDiseaseRecords.FindAsync(id);
        if (record == null || record.IsDeleted) return false;

        record.Status = "Closed";
        record.ClosedDate = DateTime.UtcNow;
        record.ClosedReason = dto.Reason;
        record.UpdatedAt = DateTime.UtcNow;

        // Cancel pending follow-ups
        var pendingFollowUps = await _context.ChronicDiseaseFollowUps
            .Where(f => f.ChronicDiseaseRecordId == id && f.Status == "Scheduled" && !f.IsDeleted)
            .ToListAsync();
        foreach (var f in pendingFollowUps)
        {
            f.Status = "Cancelled";
            f.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveRecordAsync(Guid id, RemoveChronicDiseaseDto dto)
    {
        var record = await _context.ChronicDiseaseRecords.FindAsync(id);
        if (record == null || record.IsDeleted) return false;

        record.Status = "Removed";
        record.RemovedDate = DateTime.UtcNow;
        record.RemovedReason = dto.Reason;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReopenRecordAsync(Guid id)
    {
        var record = await _context.ChronicDiseaseRecords.FindAsync(id);
        if (record == null || record.IsDeleted) return false;
        if (record.Status != "Closed" && record.Status != "Removed") return false;

        record.Status = "Active";
        record.ClosedDate = null;
        record.ClosedReason = null;
        record.RemovedDate = null;
        record.RemovedReason = null;
        record.NextFollowUpDate = DateTime.UtcNow.AddDays(record.FollowUpIntervalDays);
        record.UpdatedAt = DateTime.UtcNow;

        // Schedule a new follow-up
        var followUp = new ChronicDiseaseFollowUp
        {
            Id = Guid.NewGuid(),
            ChronicDiseaseRecordId = record.Id,
            FollowUpDate = record.NextFollowUpDate.Value,
            Status = "Scheduled",
            CreatedAt = DateTime.UtcNow,
        };
        _context.ChronicDiseaseFollowUps.Add(followUp);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<ChronicDiseaseFollowUpDto>> GetFollowUpsAsync(Guid recordId)
    {
        try
        {
            return await _context.ChronicDiseaseFollowUps
                .Where(f => f.ChronicDiseaseRecordId == recordId && !f.IsDeleted)
                .OrderByDescending(f => f.FollowUpDate)
                .Select(f => new ChronicDiseaseFollowUpDto
                {
                    Id = f.Id,
                    ChronicDiseaseRecordId = f.ChronicDiseaseRecordId,
                    FollowUpDate = f.FollowUpDate.ToString("yyyy-MM-dd"),
                    Status = f.Status,
                    ExaminationId = f.ExaminationId,
                    Notes = f.Notes,
                    VitalSigns = f.VitalSigns,
                    MedicationChanges = f.MedicationChanges,
                    LabResults = f.LabResults,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<ChronicDiseaseFollowUpDto>();
        }
    }

    public async Task<ChronicDiseaseFollowUpDto> CreateFollowUpAsync(Guid recordId, CreateChronicDiseaseFollowUpDto dto)
    {
        var record = await _context.ChronicDiseaseRecords.FindAsync(recordId)
            ?? throw new InvalidOperationException("Record not found");

        var followUpDate = DateTime.TryParse(dto.FollowUpDate, out var fd) ? fd : DateTime.UtcNow;

        var followUp = new ChronicDiseaseFollowUp
        {
            Id = Guid.NewGuid(),
            ChronicDiseaseRecordId = recordId,
            FollowUpDate = followUpDate,
            Status = dto.Status ?? "Completed",
            ExaminationId = dto.ExaminationId,
            Notes = dto.Notes,
            VitalSigns = dto.VitalSigns,
            MedicationChanges = dto.MedicationChanges,
            LabResults = dto.LabResults,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ChronicDiseaseFollowUps.Add(followUp);

        // Update next follow-up date on the record
        if (followUp.Status == "Completed")
        {
            record.NextFollowUpDate = followUpDate.AddDays(record.FollowUpIntervalDays);
            record.UpdatedAt = DateTime.UtcNow;

            // Auto-schedule next follow-up
            var nextFollowUp = new ChronicDiseaseFollowUp
            {
                Id = Guid.NewGuid(),
                ChronicDiseaseRecordId = recordId,
                FollowUpDate = record.NextFollowUpDate.Value,
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow,
            };
            _context.ChronicDiseaseFollowUps.Add(nextFollowUp);
        }

        await _context.SaveChangesAsync();

        return new ChronicDiseaseFollowUpDto
        {
            Id = followUp.Id,
            ChronicDiseaseRecordId = followUp.ChronicDiseaseRecordId,
            FollowUpDate = followUp.FollowUpDate.ToString("yyyy-MM-dd"),
            Status = followUp.Status,
            ExaminationId = followUp.ExaminationId,
            Notes = followUp.Notes,
            VitalSigns = followUp.VitalSigns,
            MedicationChanges = followUp.MedicationChanges,
            LabResults = followUp.LabResults,
        };
    }

    public async Task<ChronicDiseaseStatsDto> GetStatisticsAsync()
    {
        try
        {
            var records = await _context.ChronicDiseaseRecords
                .Where(r => !r.IsDeleted)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var overdue = records.Count(r => r.Status == "Active" && r.NextFollowUpDate.HasValue && r.NextFollowUpDate.Value < now);
            var upcoming = records.Count(r => r.Status == "Active" && r.NextFollowUpDate.HasValue && r.NextFollowUpDate.Value >= now && r.NextFollowUpDate.Value <= now.AddDays(7));

            var icdBreakdown = records
                .Where(r => r.Status == "Active")
                .GroupBy(r => new { r.IcdCode, r.IcdName })
                .Select(g => new ChronicDiseaseIcdBreakdownDto
                {
                    IcdCode = g.Key.IcdCode,
                    IcdName = g.Key.IcdName,
                    Count = g.Count(),
                })
                .OrderByDescending(x => x.Count)
                .Take(20)
                .ToList();

            return new ChronicDiseaseStatsDto
            {
                TotalActive = records.Count(r => r.Status == "Active"),
                TotalRemission = records.Count(r => r.Status == "Remission"),
                TotalClosed = records.Count(r => r.Status == "Closed"),
                TotalRemoved = records.Count(r => r.Status == "Removed"),
                OverdueFollowUps = overdue,
                UpcomingFollowUps7Days = upcoming,
                IcdBreakdown = icdBreakdown,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new ChronicDiseaseStatsDto();
        }
    }
}
