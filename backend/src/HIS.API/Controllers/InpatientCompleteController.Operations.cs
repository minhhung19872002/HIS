using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.InpatientComplete;

namespace HIS.API.Controllers;

public partial class InpatientCompleteController
{
    #region Nurse Shift Handover

    /// <summary>
    /// Tạo biên bản bàn giao ca trực
    /// </summary>
    [HttpPost("shift-handover")]
    public async Task<IActionResult> CreateShiftHandover([FromBody] CreateShiftHandoverRequest request)
    {
        var userId = GetCurrentUserId();
        var db = HttpContext.RequestServices.GetRequiredService<HIS.Infrastructure.Data.HISDbContext>();

        // Get user info
        var user = await db.Users.FindAsync(userId);

        // Get department info
        var dept = await db.Departments.FindAsync(request.DepartmentId);

        // Count current patients in department
        var activeAdmissions = await db.Admissions
            .Where(a => a.DepartmentId == request.DepartmentId && a.Status < 3 && !a.IsDeleted)
            .CountAsync();

        var criticalCount = await db.Admissions
            .Where(a => a.DepartmentId == request.DepartmentId && a.Status < 3 && !a.IsDeleted)
            .Join(db.ServiceRequests, a => a.MedicalRecordId, sr => sr.MedicalRecordId, (a, sr) => sr)
            .Where(sr => sr.IsEmergency && sr.Status < 2)
            .Select(sr => sr.MedicalRecordId)
            .Distinct()
            .CountAsync();

        var handover = new HIS.Core.Entities.NurseShiftHandover
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
            var toUser = await db.Users.FindAsync(request.HandoverToUserId.Value);
            handover.HandoverToName = toUser?.FullName;
        }

        await db.NurseShiftHandovers.AddAsync(handover);
        await db.SaveChangesAsync();

        return Ok(new { handover.Id, message = "Tạo biên bản bàn giao thành công" });
    }

    /// <summary>
    /// Lấy danh sách biên bản bàn giao theo khoa
    /// </summary>
    [HttpGet("shift-handover")]
    public async Task<IActionResult> GetShiftHandovers([FromQuery] Guid? departmentId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        try
        {
            var db = HttpContext.RequestServices.GetRequiredService<HIS.Infrastructure.Data.HISDbContext>();

            var query = db.NurseShiftHandovers.Where(h => !h.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(h => h.DepartmentId == departmentId.Value);
            if (fromDate.HasValue)
                query = query.Where(h => h.ShiftDate >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(h => h.ShiftDate <= toDate.Value);

            var handovers = await query
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

            return Ok(handovers);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting shift handovers");
            return Ok(Array.Empty<object>());
        }
    }

    /// <summary>
    /// Xác nhận bàn giao (ĐD nhận ca ký)
    /// </summary>
    [HttpPut("shift-handover/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeShiftHandover(Guid id)
    {
        var userId = GetCurrentUserId();
        var db = HttpContext.RequestServices.GetRequiredService<HIS.Infrastructure.Data.HISDbContext>();

        var handover = await db.NurseShiftHandovers.FindAsync(id);
        if (handover == null) return NotFound();

        var user = await db.Users.FindAsync(userId);
        handover.HandoverToUserId = userId;
        handover.HandoverToName = user?.FullName;
        handover.IsAcknowledged = true;
        handover.AcknowledgedAt = DateTime.UtcNow;
        handover.Status = 2; // Acknowledged
        handover.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Xác nhận bàn giao thành công" });
    }

#endregion

    #region NangCap18 - Diagnosis Interruption, Medicine Rules, Service Compatibility

    /// <summary>
    /// Tạo gián đoạn chẩn đoán
    /// </summary>
    [HttpPost("diagnosis-interruption")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto>> CreateDiagnosisInterruption(
        [FromBody] HIS.Application.DTOs.NangCap18.CreateDiagnosisInterruptionDto dto)
    {
        var result = await _inpatientService.CreateDiagnosisInterruptionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách gián đoạn chẩn đoán theo đợt nhập viện
    /// </summary>
    [HttpGet("{admissionId}/diagnosis-interruptions")]
    public async Task<ActionResult<List<HIS.Application.DTOs.NangCap18.DiagnosisInterruptionDto>>> GetDiagnosisInterruptions(Guid admissionId)
    {
        var result = await _inpatientService.GetDiagnosisInterruptionsAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc kê đơn thuốc nội trú (cảnh báo/chặn)
    /// </summary>
    [HttpPost("check-medicine-rules")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesResultDto>> CheckMedicineOrderRules(
        [FromBody] HIS.Application.DTOs.NangCap18.CheckMedicineOrderRulesDto dto)
    {
        var result = await _inpatientService.CheckMedicineOrderRulesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra tương thích chỉ định dịch vụ với chẩn đoán
    /// </summary>
    [HttpPost("check-service-compatibility")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.ServiceCompatibilityResultDto>> CheckServiceOrderCompatibility(
        [FromBody] HIS.Application.DTOs.NangCap18.CheckServiceCompatibilityDto dto)
    {
        var result = await _inpatientService.CheckServiceOrderCompatibilityAsync(dto);
        return Ok(result);
    }

    #endregion

    #region Medical Record Archive Summary (dashboard for /medical-record-archive page)

    [HttpGet("medical-record-archive/list")]
    public async Task<ActionResult> GetMedicalRecordArchiveList(
        [FromQuery] string? keyword = null,
        [FromQuery] string? format = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 20)
    {
        var db = HttpContext.RequestServices.GetRequiredService<HIS.Infrastructure.Data.HISDbContext>();
        var q = db.MedicalRecordArchives.AsNoTracking().AsQueryable();
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

        return Ok(new { totalCount = total, items });
    }

    [HttpGet("medical-record-archive/summary")]
    public async Task<ActionResult> GetMedicalRecordArchiveSummary()
    {
        var db = HttpContext.RequestServices.GetRequiredService<HIS.Infrastructure.Data.HISDbContext>();
        var total = await db.MedicalRecordArchives.CountAsync();
        var archived = await db.MedicalRecordArchives.CountAsync(a => a.Status == 1);
        var borrowing = await db.MedicalRecordArchives.CountAsync(a => a.Status == 2);
        var currentYear = DateTime.UtcNow.Year;
        var thisYear = await db.MedicalRecordArchives.CountAsync(a => a.ArchiveYear == currentYear);

        var byLocation = await db.MedicalRecordArchives
            .Where(a => a.StorageLocation != null)
            .GroupBy(a => a.StorageLocation)
            .Select(g => new { location = g.Key, count = g.Count() })
            .ToListAsync();

        var recent = await db.MedicalRecordArchives
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

        return Ok(new
        {
            totalArchived = total,
            activeCount = archived,
            borrowedCount = borrowing,
            thisYearCount = thisYear,
            byLocation,
            recent
        });
    }

    #endregion
}
