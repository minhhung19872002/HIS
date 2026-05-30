using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 5a (2026-05-30): tach RehabilitationServiceImpl (~259 dong) khoi ExtendedWorkflowServices.cs.
#region Flow 14: Rehabilitation Service - Real Implementation
public class RehabilitationServiceImpl : IRehabilitationService
{
    private readonly HISDbContext _context;
    public RehabilitationServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<RehabReferralDto>> GetPendingReferralsAsync()
    {
        try
        {
            var list = await _context.RehabReferrals
                .Include(x => x.Patient)
                .Include(x => x.ReferredBy)
                .Include(x => x.Admission).ThenInclude(a => a!.Department)
                .Where(x => x.Status == "Pending" || x.Status == "Accepted")
                .OrderByDescending(x => x.CreatedAt)
                .Take(200)
                .ToListAsync();
            return list.Select(MapRehabReferralDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<RehabReferralDto>();
        }
    }

    public async Task<RehabReferralDto> GetReferralAsync(Guid id)
    {
        var e = await _context.RehabReferrals
            .Include(x => x.Patient)
            .Include(x => x.ReferredBy)
            .Include(x => x.Admission).ThenInclude(a => a!.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapRehabReferralDto(e);
    }

    private static RehabReferralDto MapRehabReferralDto(RehabReferral e)
    {
        var p = e.Patient;
        var age = p?.DateOfBirth.HasValue == true ? Math.Max(0, DateTime.Today.Year - p.DateOfBirth.Value.Year) : 0;
        return new RehabReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = p?.FullName ?? "",
            PatientCode = p?.PatientCode ?? "",
            PatientAge = age,
            PatientGender = p?.Gender == 1 ? "Nam" : (p?.Gender == 2 ? "Nữ" : ""),
            AdmissionId = e.AdmissionId,
            VisitId = e.ExaminationId,
            SourceDepartment = e.Admission?.Department?.DepartmentName ?? "",
            ReferringDoctor = e.ReferredBy?.FullName ?? "",
            PrimaryDiagnosis = e.Diagnosis,
            DiagnosisICD = e.IcdCode ?? "",
            Precautions = e.Precautions ?? "",
            RehabType = e.RehabType,
            RehabGoals = e.Goals ?? e.Reason,
            SpecificRequests = e.Reason,
            Urgency = "Routine",
            Status = e.Status,
            ReferralDate = e.CreatedAt,
            AcceptedDate = e.AcceptedDate,
        };
    }

    public async Task<RehabReferralDto> CreateReferralAsync(CreateRehabReferralDto dto)
    {
        var entity = new RehabReferral { Id = Guid.NewGuid(), ReferralCode = $"REH-{DateTime.Now:yyyyMMddHHmmss}", PatientId = dto.PatientId, RehabType = dto.RehabType ?? "PT", Diagnosis = dto.PrimaryDiagnosis ?? "", Reason = dto.RehabGoals ?? "", Status = "Pending", CreatedAt = DateTime.Now };
        _context.RehabReferrals.Add(entity);
        await _context.SaveChangesAsync();
        return await GetReferralAsync(entity.Id);
    }

    public async Task<RehabReferralDto> AcceptReferralAsync(Guid id)
    {
        var e = await _context.RehabReferrals.FindAsync(id);
        if (e == null) return null!;
        e.Status = "Accepted"; e.AcceptedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetReferralAsync(id);
    }

    public async Task<bool> RejectReferralAsync(Guid id, string reason)
    {
        var e = await _context.RehabReferrals.FindAsync(id);
        if (e == null) return false;
        e.Status = "Declined"; e.DeclineReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<FunctionalAssessmentDto> GetAssessmentAsync(Guid id)
    {
        var e = await _context.FunctionalAssessments.Include(x => x.Referral).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new FunctionalAssessmentDto { Id = e.Id, ReferralId = e.ReferralId, AssessmentDate = e.AssessmentDate, BarthelIndex = e.BarthelIndex, FIMScore = e.FIMScore };
    }

    public async Task<FunctionalAssessmentDto> SaveAssessmentAsync(SaveFunctionalAssessmentDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.FunctionalAssessments.FindAsync(dto.Id.Value) : null;
        if (entity == null) { entity = new FunctionalAssessment { Id = Guid.NewGuid(), ReferralId = dto.ReferralId, AssessmentDate = DateTime.Now, CreatedAt = DateTime.Now }; _context.FunctionalAssessments.Add(entity); }
        entity.BarthelIndex = dto.BarthelIndex; entity.FIMScore = dto.FIMScore; entity.MoCAScore = dto.MoCAScore; entity.BergBalanceScale = dto.BergBalanceScore;
        await _context.SaveChangesAsync();
        return await GetAssessmentAsync(entity.Id);
    }

    public async Task<List<FunctionalAssessmentDto>> GetAssessmentHistoryAsync(Guid referralId)
    {
        var list = await _context.FunctionalAssessments.Where(x => x.ReferralId == referralId).OrderByDescending(x => x.AssessmentDate).ToListAsync();
        return list.Select(e => new FunctionalAssessmentDto { Id = e.Id, ReferralId = e.ReferralId, AssessmentDate = e.AssessmentDate, BarthelIndex = e.BarthelIndex }).ToList();
    }

    public async Task<RehabTreatmentPlanDto> GetTreatmentPlanAsync(Guid id)
    {
        var e = await _context.RehabTreatmentPlans.Include(x => x.Referral).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new RehabTreatmentPlanDto { Id = e.Id, ReferralId = e.ReferralId, PatientName = e.Referral?.Patient?.FullName ?? "", PlannedTotalSessions = e.PlannedSessions, CompletedSessions = e.CompletedSessions, Status = e.Status, StartDate = e.StartDate, ExpectedEndDate = e.ExpectedEndDate };
    }

    public async Task<RehabTreatmentPlanDto> CreateTreatmentPlanAsync(CreateTreatmentPlanDto dto)
    {
        var entity = new RehabTreatmentPlan { Id = Guid.NewGuid(), PlanCode = $"RTP-{DateTime.Now:yyyyMMddHHmmss}", ReferralId = dto.ReferralId, RehabType = "PT", PlannedSessions = dto.PlannedTotalSessions, Frequency = $"{dto.SessionsPerWeek}x/week", DurationMinutesPerSession = dto.MinutesPerSession, StartDate = dto.StartDate, Status = "Active", CreatedAt = DateTime.Now };
        _context.RehabTreatmentPlans.Add(entity);
        await _context.SaveChangesAsync();
        return await GetTreatmentPlanAsync(entity.Id);
    }

    public async Task<RehabTreatmentPlanDto> UpdateTreatmentPlanAsync(Guid id, CreateTreatmentPlanDto dto)
    {
        var e = await _context.RehabTreatmentPlans.FindAsync(id);
        if (e == null) return null!;
        e.PlannedSessions = dto.PlannedTotalSessions; e.Frequency = $"{dto.SessionsPerWeek}x/week"; e.DurationMinutesPerSession = dto.MinutesPerSession;
        await _context.SaveChangesAsync();
        return await GetTreatmentPlanAsync(id);
    }

    public async Task<bool> UpdateGoalProgressAsync(Guid planId, int goalNumber, decimal progressPercent, string notes)
    {
        var e = await _context.RehabTreatmentPlans.FindAsync(planId);
        if (e == null) return false;
        e.ShortTermGoals = $"Goal {goalNumber}: {progressPercent}% - {notes}";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<RehabSessionDto>> GetSessionsAsync(DateTime fromDate, DateTime toDate, Guid? therapistId = null)
    {
        var query = _context.RehabSessions.Include(x => x.TreatmentPlan).ThenInclude(x => x!.Referral).ThenInclude(x => x!.Patient).Include(x => x.Therapist).Where(x => x.SessionDate >= fromDate && x.SessionDate <= toDate);
        if (therapistId.HasValue) query = query.Where(x => x.TherapistId == therapistId);
        var list = await query.ToListAsync();
        return list.Select(MapToRehabSessionDto).ToList();
    }

    public async Task<List<RehabSessionDto>> GetPatientSessionsAsync(Guid referralId)
    {
        var plan = await _context.RehabTreatmentPlans.FirstOrDefaultAsync(x => x.ReferralId == referralId);
        if (plan == null) return new List<RehabSessionDto>();
        var list = await _context.RehabSessions.Include(x => x.Therapist).Where(x => x.TreatmentPlanId == plan.Id).OrderByDescending(x => x.SessionDate).ToListAsync();
        return list.Select(MapToRehabSessionDto).ToList();
    }

    public async Task<RehabSessionDto> GetSessionAsync(Guid id)
    {
        var e = await _context.RehabSessions.Include(x => x.TreatmentPlan).ThenInclude(x => x!.Referral).ThenInclude(x => x!.Patient).Include(x => x.Therapist).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToRehabSessionDto(e);
    }

    public async Task<RehabSessionDto> ScheduleSessionAsync(Guid planId, DateTime date, TimeSpan time, string location)
    {
        var plan = await _context.RehabTreatmentPlans.FindAsync(planId);
        var sessionNum = await _context.RehabSessions.CountAsync(x => x.TreatmentPlanId == planId) + 1;
        var entity = new RehabSession { Id = Guid.NewGuid(), TreatmentPlanId = planId, SessionNumber = sessionNum, SessionDate = date, StartTime = time, Status = "Scheduled", CreatedAt = DateTime.Now };
        _context.RehabSessions.Add(entity);
        await _context.SaveChangesAsync();
        return await GetSessionAsync(entity.Id);
    }

    public async Task<RehabSessionDto> DocumentSessionAsync(DocumentSessionDto dto)
    {
        var e = await _context.RehabSessions.FindAsync(dto.SessionId);
        if (e == null) return null!;
        e.Status = "Completed"; e.EndTime = TimeSpan.FromHours(DateTime.Now.Hour).Add(TimeSpan.FromMinutes(DateTime.Now.Minute)); e.ProgressNotes = dto.ProgressNotes;
        var plan = await _context.RehabTreatmentPlans.FindAsync(e.TreatmentPlanId);
        if (plan != null) plan.CompletedSessions++;
        await _context.SaveChangesAsync();
        return await GetSessionAsync(dto.SessionId);
    }

    public async Task<bool> CancelSessionAsync(Guid id, string reason)
    {
        var e = await _context.RehabSessions.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.CancellationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkNoShowAsync(Guid id)
    {
        var e = await _context.RehabSessions.FindAsync(id);
        if (e == null) return false;
        e.Status = "NoShow";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RehabProgressReportDto> GetProgressReportAsync(Guid planId)
    {
        var plan = await _context.RehabTreatmentPlans.Include(x => x.Referral).ThenInclude(x => x!.Patient).Include(x => x.Sessions).FirstOrDefaultAsync(x => x.Id == planId);
        if (plan == null) return null!;
        return new RehabProgressReportDto { TreatmentPlanId = planId, PatientName = plan.Referral?.Patient?.FullName ?? "", TotalPlannedSessions = plan.PlannedSessions, CompletedSessions = plan.CompletedSessions, OverallProgress = plan.Status };
    }

    public async Task<RehabOutcomeDto> GetOutcomeAsync(Guid planId)
    {
        var plan = await _context.RehabTreatmentPlans.Include(x => x.Referral).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.Id == planId);
        if (plan == null) return null!;
        return new RehabOutcomeDto { TreatmentPlanId = planId, PatientName = plan.Referral?.Patient?.FullName ?? "", DischargeStatus = plan.Status, FunctionalStatus = plan.DischargeSummary };
    }

    public async Task<RehabOutcomeDto> DischargePatientAsync(Guid planId, RehabOutcomeDto outcomeData)
    {
        var e = await _context.RehabTreatmentPlans.FindAsync(planId);
        if (e == null) return null!;
        e.Status = "Completed"; e.ActualEndDate = DateTime.Now; e.DischargeSummary = outcomeData.FunctionalStatus;
        await _context.SaveChangesAsync();
        return await GetOutcomeAsync(planId);
    }

    public async Task<RehabDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new RehabDashboardDto
            {
                Date = d,
                PendingReferrals = await _context.RehabReferrals.CountAsync(x => x.Status == "Pending"),
                ActivePatients = await _context.RehabTreatmentPlans.CountAsync(x => x.Status == "Active"),
                TodaySessions = await _context.RehabSessions.CountAsync(x => x.SessionDate.Date == d.Date),
                CompletedToday = await _context.RehabSessions.CountAsync(x => x.SessionDate.Date == d.Date && x.Status == "Completed")
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new RehabDashboardDto { Date = d, PendingReferrals = 0, ActivePatients = 0, TodaySessions = 0, CompletedToday = 0 };
        }
    }

    private static RehabSessionDto MapToRehabSessionDto(RehabSession e) => new()
    {
        Id = e.Id, TreatmentPlanId = e.TreatmentPlanId, SessionNumber = e.SessionNumber, ScheduledDate = e.SessionDate,
        ScheduledTime = e.StartTime, TherapistName = e.Therapist?.FullName ?? "", Status = e.Status, ProgressNotes = e.ProgressNotes
    };
}


#endregion
