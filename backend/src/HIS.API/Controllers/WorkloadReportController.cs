using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// QW3.10 — Thống kê khối lượng công việc theo BS/KTV.
/// Đếm exam/prescription per doctor, studies per radiologist/tech,
/// lab tests per ordering doctor, in a date range.
/// </summary>
[ApiController]
[Route("api/reports/workload")]
[Authorize]
public class WorkloadReportController : ControllerBase
{
    private readonly HISDbContext _db;

    public WorkloadReportController(HISDbContext db) { _db = db; }

    public record DoctorWorkloadDto(
        Guid UserId,
        string FullName,
        int ExaminationCount,
        int PrescriptionCount,
        int ServiceRequestCount);

    public record RadiologistWorkloadDto(
        Guid UserId,
        string FullName,
        int StudiesRequested,
        int StudiesPerformedAsTech,
        int ReportsApproved);

    public record TechnicianWorkloadDto(
        Guid UserId,
        string FullName,
        int LabRequestsOrdered);

    public record WorkloadReportDto(
        DateTime FromDate,
        DateTime ToDate,
        IReadOnlyList<DoctorWorkloadDto> Doctors,
        IReadOnlyList<RadiologistWorkloadDto> Radiologists,
        IReadOnlyList<TechnicianWorkloadDto> Technicians);

    [HttpGet]
    public async Task<ActionResult<WorkloadReportDto>> GetWorkload(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var from = fromDate?.Date ?? DateTime.Today.AddDays(-30);
        var to = (toDate?.Date ?? DateTime.Today).AddDays(1).AddSeconds(-1);

        // ===== Doctor workload =====
        var examCounts = await _db.Examinations
            .Where(e => e.CreatedAt >= from && e.CreatedAt <= to && e.DoctorId != null)
            .GroupBy(e => e.DoctorId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var prescCounts = await _db.Prescriptions
            .Where(p => p.CreatedAt >= from && p.CreatedAt <= to && p.DoctorId != Guid.Empty)
            .GroupBy(p => p.DoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var srCounts = await _db.ServiceRequests
            .Where(s => s.CreatedAt >= from && s.CreatedAt <= to && s.DoctorId != Guid.Empty)
            .GroupBy(s => s.DoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var doctorIds = examCounts.Select(x => x.UserId)
            .Union(prescCounts.Select(x => x.UserId))
            .Union(srCounts.Select(x => x.UserId))
            .Distinct()
            .ToList();

        var doctorUsers = await _db.Users
            .Where(u => doctorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync();

        var doctors = doctorUsers
            .Select(u => new DoctorWorkloadDto(
                u.Id,
                u.FullName ?? "?",
                examCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0,
                prescCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0,
                srCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0))
            .OrderByDescending(d => d.ExaminationCount + d.PrescriptionCount + d.ServiceRequestCount)
            .ToList();

        // ===== Radiologist workload =====
        var radioRequestedCounts = await _db.RadiologyRequests
            .Where(r => r.CreatedAt >= from && r.CreatedAt <= to && r.RequestingDoctorId != Guid.Empty)
            .GroupBy(r => r.RequestingDoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var radioExamCounts = await _db.RadiologyExams
            .Where(r => r.CreatedAt >= from && r.CreatedAt <= to && r.TechnicianId != null)
            .GroupBy(r => r.TechnicianId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var radioApprovedCounts = await _db.RadiologyReports
            .Where(r => r.ApprovedAt != null && r.ApprovedAt >= from && r.ApprovedAt <= to && r.ApprovedBy != null)
            .GroupBy(r => r.ApprovedBy!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var radioIds = radioRequestedCounts.Select(x => x.UserId)
            .Union(radioExamCounts.Select(x => x.UserId))
            .Union(radioApprovedCounts.Select(x => x.UserId))
            .Distinct()
            .ToList();

        var radioUsers = await _db.Users
            .Where(u => radioIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync();

        var radiologists = radioUsers
            .Select(u => new RadiologistWorkloadDto(
                u.Id,
                u.FullName ?? "?",
                radioRequestedCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0,
                radioExamCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0,
                radioApprovedCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0))
            .OrderByDescending(r => r.StudiesPerformedAsTech + r.ReportsApproved)
            .ToList();

        // ===== Lab requesting doctors =====
        var labReqCounts = await _db.LabRequests
            .Where(l => l.CreatedAt >= from && l.CreatedAt <= to && l.RequestingDoctorId != Guid.Empty)
            .GroupBy(l => l.RequestingDoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var labIds = labReqCounts.Select(x => x.UserId).Distinct().ToList();

        var labUsers = await _db.Users
            .Where(u => labIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync();

        var technicians = labUsers
            .Select(u => new TechnicianWorkloadDto(
                u.Id,
                u.FullName ?? "?",
                labReqCounts.FirstOrDefault(x => x.UserId == u.Id)?.Count ?? 0))
            .OrderByDescending(t => t.LabRequestsOrdered)
            .ToList();

        return Ok(new WorkloadReportDto(from, to, doctors, radiologists, technicians));
    }
}
