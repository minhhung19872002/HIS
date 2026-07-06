using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// Issue #202 (2026-07-06): tách 5 method dùng service-locator GetRequiredService<HISDbContext>()
// khỏi InpatientCompleteController.Operations.cs sang service layer (Clean Arch). Logic verbatim.
public partial class InpatientCompleteService
{
    #region Nurse Shift Handover + Medical Record Archive (moved from controller)

    public async Task<Guid> CreateShiftHandoverAsync(CreateShiftHandoverRequest request, Guid userId)
    {
        // Get user info
        var user = await _context.Users.FindAsync(userId);

        // Get department info
        var dept = await _context.Departments.FindAsync(request.DepartmentId);

        // Count current patients in department
        var activeAdmissions = await _context.Admissions
            .Where(a => a.DepartmentId == request.DepartmentId && a.Status < 3 && !a.IsDeleted)
            .CountAsync();

        var criticalCount = await _context.Admissions
            .Where(a => a.DepartmentId == request.DepartmentId && a.Status < 3 && !a.IsDeleted)
            .Join(_context.ServiceRequests, a => a.MedicalRecordId, sr => sr.MedicalRecordId, (a, sr) => sr)
            .Where(sr => sr.IsEmergency && sr.Status < 2)
            .Select(sr => sr.MedicalRecordId)
            .Distinct()
            .CountAsync();

        var handover = new NurseShiftHandover
        {
            Id = Guid.NewGuid(),
            DepartmentId = request.DepartmentId,
            DepartmentName = dept?.DepartmentName,
            ShiftType = request.ShiftType,
            ShiftDate = request.ShiftDate,
            HandoverFromUserId = userId,
            HandoverFromName = user?.FullName,
            HandoverToUserId = request.HandoverToUserId,
            TotalPatients = activeAdmissions,
            CriticalPatients = criticalCount,
            NewAdmissions = request.NewAdmissions,
            Discharges = request.Discharges,
            PendingOrders = request.PendingOrders,
            SpecialNotes = request.SpecialNotes,
            IncidentNotes = request.IncidentNotes,
            Status = 1, // Submitted
            CreatedAt = DateTime.UtcNow
        };

        // Get receiving nurse name
        if (request.HandoverToUserId.HasValue)
        {
            var toUser = await _context.Users.FindAsync(request.HandoverToUserId.Value);
            handover.HandoverToName = toUser?.FullName;
        }

        await _context.NurseShiftHandovers.AddAsync(handover);
        await _context.SaveChangesAsync();

        return handover.Id;
    }

    public async Task<object> GetShiftHandoversAsync(Guid? departmentId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.NurseShiftHandovers.Where(h => !h.IsDeleted);

        if (departmentId.HasValue)
            query = query.Where(h => h.DepartmentId == departmentId.Value);
        if (fromDate.HasValue)
            query = query.Where(h => h.ShiftDate >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(h => h.ShiftDate <= toDate.Value);

        return await query
            .OrderByDescending(h => h.ShiftDate)
            .ThenByDescending(h => h.CreatedAt)
            .Take(100)
            .Select(h => new
            {
                h.Id, h.DepartmentName, h.ShiftType, h.ShiftDate,
                h.HandoverFromName, h.HandoverToName,
                h.TotalPatients, h.CriticalPatients, h.NewAdmissions, h.Discharges,
                h.PendingOrders, h.SpecialNotes, h.IncidentNotes,
                h.IsAcknowledged, h.AcknowledgedAt, h.Status, h.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<bool> AcknowledgeShiftHandoverAsync(Guid id, Guid userId)
    {
        var handover = await _context.NurseShiftHandovers.FindAsync(id);
        if (handover == null) return false;

        var user = await _context.Users.FindAsync(userId);
        handover.HandoverToUserId = userId;
        handover.HandoverToName = user?.FullName;
        handover.IsAcknowledged = true;
        handover.AcknowledgedAt = DateTime.UtcNow;
        handover.Status = 2; // Acknowledged
        handover.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<object> GetMedicalRecordArchiveListAsync(
        string? keyword, string? format, DateTime? fromDate, DateTime? toDate, int? status, int pageIndex, int pageSize)
    {
        var q = _context.MedicalRecordArchives.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            q = q.Where(a => a.ArchiveCode.Contains(keyword) || (a.Diagnosis != null && a.Diagnosis.Contains(keyword)));
        }
        if (status.HasValue) q = q.Where(a => a.Status == status.Value);
        if (fromDate.HasValue) q = q.Where(a => a.ArchivedDate >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(a => a.ArchivedDate <= toDate.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                id = a.Id,
                archiveCode = a.ArchiveCode,
                medicalRecordId = a.MedicalRecordId,
                medicalRecordCode = (string?)null,
                patientId = a.PatientId,
                patientName = (string?)null,
                diagnosis = a.Diagnosis,
                treatmentResult = a.TreatmentResult,
                admissionDate = a.AdmissionDate,
                dischargeDate = a.DischargeDate,
                storageLocation = a.StorageLocation,
                shelfNumber = a.ShelfNumber,
                boxNumber = a.BoxNumber,
                status = a.Status,
                archivedDate = a.ArchivedDate,
                archiveYear = a.ArchiveYear
            })
            .ToListAsync();

        return new { totalCount = total, items };
    }

    public async Task<object> GetMedicalRecordArchiveSummaryAsync()
    {
        var total = await _context.MedicalRecordArchives.CountAsync();
        var archived = await _context.MedicalRecordArchives.CountAsync(a => a.Status == 1);
        var borrowing = await _context.MedicalRecordArchives.CountAsync(a => a.Status == 2);
        var currentYear = DateTime.UtcNow.Year;
        var thisYear = await _context.MedicalRecordArchives.CountAsync(a => a.ArchiveYear == currentYear);

        var byLocation = await _context.MedicalRecordArchives
            .Where(a => a.StorageLocation != null)
            .GroupBy(a => a.StorageLocation)
            .Select(g => new { location = g.Key, count = g.Count() })
            .ToListAsync();

        var recent = await _context.MedicalRecordArchives
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new
            {
                id = a.Id,
                archiveCode = a.ArchiveCode,
                diagnosis = a.Diagnosis,
                storageLocation = a.StorageLocation,
                shelfNumber = a.ShelfNumber,
                boxNumber = a.BoxNumber,
                archivedDate = a.ArchivedDate,
                status = a.Status
            })
            .ToListAsync();

        return new
        {
            totalArchived = total,
            activeCount = archived,
            borrowedCount = borrowing,
            thisYearCount = thisYear,
            byLocation,
            recent
        };
    }

    #endregion
}
