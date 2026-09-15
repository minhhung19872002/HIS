using HIS.Application.Common;
using HIS.Application.DTOs.WorkloadReport;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QW3.10 — Thống kê khối lượng công việc theo BS/KTV — tách khỏi WorkloadReportController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ nguyên; return map về ServiceOutcome.
/// Đếm exam/prescription per doctor, studies per radiologist/tech, lab tests per ordering doctor, in a date range.
/// </summary>
public class WorkloadReportService : IWorkloadReportService
{
    private readonly HISDbContext _db;
    public WorkloadReportService(HISDbContext db) { _db = db; }

    public async Task<ServiceOutcome> GetWorkloadAsync(
        DateTime? fromDate,
        DateTime? toDate)
    {
        var from = fromDate?.Date ?? DateTime.Today.AddDays(-30);
        var to = (toDate?.Date ?? DateTime.Today).AddDays(1).AddSeconds(-1);
        // Half-open bounds (`<= 23:59:59` missed the last second's fractions). CreatedAt is written as UTC
        // (HISDbContext.SaveChangesAsync) — compare it with the UTC bounds of the VN days.
        var toEnd = (toDate?.Date ?? DateTime.Today).AddDays(1);
        var fromUtc = ReportPeriod.ToUtc(from);
        var toUtc = ReportPeriod.ToUtc(toEnd);

        // ===== Doctor workload ===== (cancelled examinations 5 / prescriptions 4, drafts 5 / orders 4 are not work done)
        var examCounts = await _db.Examinations
            .Where(e => e.CreatedAt >= fromUtc && e.CreatedAt < toUtc && e.DoctorId != null && e.Status != 5)
            .GroupBy(e => e.DoctorId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var prescCounts = await _db.Prescriptions
            .Where(p => p.CreatedAt >= fromUtc && p.CreatedAt < toUtc && p.DoctorId != Guid.Empty && p.Status != 4 && p.Status != 5)
            .GroupBy(p => p.DoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var srCounts = await _db.ServiceRequests
            .Where(s => s.CreatedAt >= fromUtc && s.CreatedAt < toUtc && s.DoctorId != Guid.Empty && s.Status != 4)
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
            .Where(r => r.CreatedAt >= fromUtc && r.CreatedAt < toUtc && r.RequestingDoctorId != Guid.Empty)
            .GroupBy(r => r.RequestingDoctorId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var radioExamCounts = await _db.RadiologyExams
            .Where(r => r.CreatedAt >= fromUtc && r.CreatedAt < toUtc && r.TechnicianId != null)
            .GroupBy(r => r.TechnicianId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var radioApprovedCounts = await _db.RadiologyReports
            .Where(r => r.ApprovedAt != null && r.ApprovedAt >= from && r.ApprovedAt < toEnd && r.ApprovedBy != null) // ApprovedAt = DateTime.Now (local)
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
        // #14e: model 1 ServiceRequests (RequestType=1) — model 2 LabRequests đã gỡ
        var labReqCounts = await _db.ServiceRequests
            .Where(l => l.CreatedAt >= fromUtc && l.CreatedAt < toUtc && l.RequestType == 1 && l.Status != 4 && !l.IsDeleted && l.DoctorId != Guid.Empty)
            .GroupBy(l => l.DoctorId)
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

        return ServiceOutcome.Ok(new WorkloadReportDto(from, to, doctors, radiologists, technicians));
    }
}
