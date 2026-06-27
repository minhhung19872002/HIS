using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
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
        var entity = new RehabReferral { Id = Guid.NewGuid(), ReferralCode = CodeGenerator.Timestamp("REH"), PatientId = dto.PatientId, RehabType = dto.RehabType ?? "PT", Diagnosis = dto.PrimaryDiagnosis ?? "", Reason = dto.RehabGoals ?? "", Status = "Pending", CreatedAt = DateTime.Now };
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
        var list = await _context.FunctionalAssessments.Where(x => x.ReferralId == referralId).OrderByDescending(x => x.AssessmentDate).ToBoundedListAsync("Rehabilitation.AssessmentHistory");
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
        var entity = new RehabTreatmentPlan { Id = Guid.NewGuid(), PlanCode = CodeGenerator.Timestamp("RTP"), ReferralId = dto.ReferralId, RehabType = "PT", PlannedSessions = dto.PlannedTotalSessions, Frequency = $"{dto.SessionsPerWeek}x/week", DurationMinutesPerSession = dto.MinutesPerSession, StartDate = dto.StartDate, Status = "Active", CreatedAt = DateTime.Now };
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
        var list = await query.ToBoundedListAsync("Rehabilitation.GetSessions");
        return list.Select(MapToRehabSessionDto).ToList();
    }

    public async Task<List<RehabSessionDto>> GetPatientSessionsAsync(Guid referralId)
    {
        var plan = await _context.RehabTreatmentPlans.FirstOrDefaultAsync(x => x.ReferralId == referralId);
        if (plan == null) return new List<RehabSessionDto>();
        var list = await _context.RehabSessions.Include(x => x.Therapist).Where(x => x.TreatmentPlanId == plan.Id).OrderByDescending(x => x.SessionDate).ToBoundedListAsync("Rehabilitation.PatientSessions");
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
        // F7 (audit FLOW-FINAL 2026-06-06): mỗi buổi trị liệu hoàn thành → sinh 1 dịch vụ tính phí
        // (ServiceRequest + Detail). Trước đây buổi PHCN không phát sinh viện phí (thất thu).
        await BillRehabSessionAsync(e, plan);
        await _context.SaveChangesAsync();
        return await GetSessionAsync(dto.SessionId);
    }

    /// <summary>F7: ghi 1 dòng viện phí cho buổi PHCN đã hoàn thành. Idempotent theo RequestCode deterministic
    /// (mỗi buổi chỉ tính phí 1 lần). Best-effort: thiếu HSBA/khoa → bỏ qua billing, KHÔNG chặn ghi buổi.</summary>
    private async Task BillRehabSessionAsync(RehabSession session, RehabTreatmentPlan? plan)
    {
        var requestCode = $"PHCN-{session.Id:N}";
        if (await _context.ServiceRequests.AnyAsync(r => r.RequestCode == requestCode)) return; // đã tính phí

        plan ??= await _context.RehabTreatmentPlans.FindAsync(session.TreatmentPlanId);
        var referral = plan != null ? await _context.RehabReferrals.FindAsync(plan.ReferralId) : null;
        if (referral == null) return;

        // Resolve HSBA + khoa: examination → admission → HSBA mới nhất của bệnh nhân.
        Guid? medicalRecordId = null; Guid? departmentId = null;
        if (referral.ExaminationId != null)
        {
            var exam = await _context.Examinations.FindAsync(referral.ExaminationId.Value);
            if (exam != null) { medicalRecordId = exam.MedicalRecordId; departmentId = exam.DepartmentId; }
        }
        if (medicalRecordId == null && referral.AdmissionId != null)
        {
            var adm = await _context.Admissions.FindAsync(referral.AdmissionId.Value);
            if (adm != null) { medicalRecordId = adm.MedicalRecordId; departmentId = adm.DepartmentId; }
        }
        if (medicalRecordId == null)
        {
            var mr = await _context.MedicalRecords
                .Where(m => m.PatientId == referral.PatientId && !m.IsDeleted)
                .OrderByDescending(m => m.AdmissionDate).FirstOrDefaultAsync();
            if (mr != null) { medicalRecordId = mr.Id; departmentId = mr.DepartmentId; }
        }
        if (medicalRecordId == null) return; // không tìm được HSBA → không bill

        if (departmentId == null || departmentId == Guid.Empty)
            departmentId = (await _context.Departments.FirstOrDefaultAsync(d => !d.IsDeleted))?.Id;
        if (departmentId == null || departmentId == Guid.Empty) return; // không có khoa hợp lệ → bỏ qua

        // Resolve actor user hợp lệ cho DoctorId/CreatedBy (FK Users). KTV/BS giới thiệu có thể chưa set
        // (Guid.Empty) → thử lần lượt rồi fallback user bất kỳ; không có user nào hợp lệ → bỏ qua billing.
        Guid doctorId = Guid.Empty;
        foreach (var cand in new[] { session.TherapistId, referral.ReferredById, referral.AcceptedById ?? Guid.Empty })
        {
            if (cand != Guid.Empty && await _context.Users.AnyAsync(u => u.Id == cand)) { doctorId = cand; break; }
        }
        if (doctorId == Guid.Empty)
            doctorId = await _context.Users.Where(u => !u.IsDeleted).Select(u => u.Id).FirstOrDefaultAsync();
        if (doctorId == Guid.Empty) return; // không có user hợp lệ → bỏ qua billing

        var service = await GetOrCreateRehabServiceAsync(plan?.RehabType ?? referral.RehabType, doctorId);
        var price = service.UnitPrice;
        var by = doctorId.ToString();

        var req = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = requestCode,
            RequestDate = DateTime.Now,
            MedicalRecordId = medicalRecordId.Value,
            DoctorId = doctorId,
            DepartmentId = departmentId.Value,
            RequestType = 5, // Khác
            ServiceId = service.Id,
            Quantity = 1,
            UnitPrice = price,
            TotalPrice = price,
            TotalAmount = price,
            InsuranceAmount = 0,
            PatientAmount = price,
            Status = 0,
            Notes = $"PHCN buổi {session.SessionNumber} - {service.ServiceName}",
            CreatedAt = DateTime.Now,
            CreatedBy = by,
        };
        req.Details.Add(new ServiceRequestDetail
        {
            Id = Guid.NewGuid(),
            ServiceRequestId = req.Id,
            ServiceId = service.Id,
            Quantity = 1,
            UnitPrice = price,
            Amount = price,
            InsuranceAmount = 0,
            PatientAmount = price,
            PatientType = 2, // Viện phí
            Status = 0,
            CreatedAt = DateTime.Now,
            CreatedBy = by,
        });
        _context.ServiceRequests.Add(req);
    }

    /// <summary>F7: lấy (hoặc tạo) dịch vụ tính phí cho buổi PHCN theo loại (PT/OT/ST). Danh mục mặc định
    /// idempotent theo ServiceCode `PHCN-{type}`; giá mặc định, admin chỉnh trong danh mục dịch vụ sau.</summary>
    private async Task<Service> GetOrCreateRehabServiceAsync(string? rehabType, Guid therapistId)
    {
        var type = (rehabType ?? "").Trim().ToUpperInvariant();
        if (type != "OT" && type != "ST") type = "PT";
        var code = $"PHCN-{type}";
        var svc = await _context.Services.FirstOrDefaultAsync(s => s.ServiceCode == code && !s.IsDeleted);
        if (svc != null) return svc;

        var group = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.GroupCode == "PHCN" && !g.IsDeleted);
        if (group == null)
        {
            group = new ServiceGroup
            {
                Id = Guid.NewGuid(), GroupCode = "PHCN", GroupName = "Phục hồi chức năng",
                GroupType = 4, // TDCN
                IsActive = true, CreatedAt = DateTime.Now, CreatedBy = therapistId.ToString(),
            };
            _context.ServiceGroups.Add(group);
        }
        var name = type switch
        {
            "OT" => "Hoạt động trị liệu (OT) - buổi",
            "ST" => "Ngôn ngữ trị liệu (ST) - buổi",
            _ => "Vật lý trị liệu / PHCN (PT) - buổi",
        };
        svc = new Service
        {
            Id = Guid.NewGuid(), ServiceCode = code, ServiceName = name, ServiceGroupId = group.Id,
            UnitPrice = 100000m, ServicePrice = 100000m, InsurancePrice = 0m, Unit = "Buổi",
            ServiceType = 4, // TDCN
            IsInsuranceCovered = false, InsurancePaymentRate = 0,
            IsActive = true, CreatedAt = DateTime.Now, CreatedBy = therapistId.ToString(),
        };
        _context.Services.Add(svc);
        return svc;
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

    public async Task<byte[]> PrintReferralAsync(Guid referralId)
    {
        var dto = await GetReferralAsync(referralId);
        if (dto == null) throw new InvalidOperationException("Không tìm thấy giấy giới thiệu PHCN");

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
        sb.AppendLine("<style>");
        sb.AppendLine("body{font-family:'Times New Roman',Times,serif;font-size:13pt;margin:20mm 15mm;}");
        sb.AppendLine(".header{text-align:center;margin-bottom:8px;}");
        sb.AppendLine(".title{text-align:center;font-weight:bold;font-size:16pt;text-transform:uppercase;margin:16px 0 4px;}");
        sb.AppendLine(".subtitle{text-align:center;font-size:11pt;margin-bottom:20px;}");
        sb.AppendLine(".field-row{display:flex;margin-bottom:6px;}");
        sb.AppendLine(".field-label{min-width:200px;font-weight:bold;}");
        sb.AppendLine(".field-value{flex:1;border-bottom:1px dotted #555;}");
        sb.AppendLine(".section-title{font-weight:bold;margin:14px 0 6px;text-decoration:underline;}");
        sb.AppendLine(".sig-row{display:flex;justify-content:space-between;margin-top:40px;}");
        sb.AppendLine(".sig-box{text-align:center;width:45%;}");
        sb.AppendLine(".sig-name{margin-top:60px;font-weight:bold;}");
        sb.AppendLine("@media print{body{margin:10mm;}}");
        sb.AppendLine("</style></head><body>");

        sb.AppendLine("<div class='header'>");
        sb.AppendLine("<div>BỘ Y TẾ</div>");
        sb.AppendLine("</div>");

        sb.AppendLine("<div class='title'>GIẤY GIỚI THIỆU PHỤC HỒI CHỨC NĂNG</div>");
        sb.AppendLine($"<div class='subtitle'>Số: {System.Web.HttpUtility.HtmlEncode(dto.ReferralCode)}</div>");

        sb.AppendLine("<div class='section-title'>I. THÔNG TIN BỆNH NHÂN</div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Họ và tên:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.PatientName)}</span></div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Mã bệnh nhân:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.PatientCode)}</span></div>");
        var genderText = dto.PatientGender ?? "";
        var ageText = dto.PatientAge > 0 ? dto.PatientAge.ToString() + " tuổi" : "";
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Tuổi / Giới tính:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(ageText)} / {System.Web.HttpUtility.HtmlEncode(genderText)}</span></div>");

        sb.AppendLine("<div class='section-title'>II. THÔNG TIN LÂM SÀNG</div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Khoa gửi:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.SourceDepartment)}</span></div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Bác sĩ giới thiệu:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.ReferringDoctor)}</span></div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Chẩn đoán chính:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.PrimaryDiagnosis)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.DiagnosisICD))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Mã ICD:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.DiagnosisICD)}</span></div>");
        if (!string.IsNullOrWhiteSpace(dto.Precautions))
            sb.AppendLine($"<div class='field-row'><span class='field-label'>Lưu ý / Chống chỉ định:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.Precautions)}</span></div>");

        sb.AppendLine("<div class='section-title'>III. YÊU CẦU PHỤC HỒI CHỨC NĂNG</div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Loại PHCN:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.RehabType)}</span></div>");
        sb.AppendLine($"<div class='field-row'><span class='field-label'>Mục tiêu PHCN:</span><span class='field-value'>{System.Web.HttpUtility.HtmlEncode(dto.RehabGoals ?? dto.SpecificRequests ?? "")}</span></div>");

        var referralDate = dto.ReferralDate != default ? dto.ReferralDate.ToString("dd/MM/yyyy") : DateTime.Today.ToString("dd/MM/yyyy");
        sb.AppendLine($"<div style='text-align:right;margin-top:20px;font-style:italic'>Ngày {referralDate}</div>");

        sb.AppendLine("<div class='sig-row'>");
        sb.AppendLine("<div class='sig-box'><div>TRƯỞNG KHOA GỬI</div><div style='font-size:10pt;font-style:italic'>(Ký, ghi rõ họ tên)</div><div class='sig-name'>&nbsp;</div></div>");
        sb.AppendLine($"<div class='sig-box'><div>BÁC SĨ GIỚI THIỆU</div><div style='font-size:10pt;font-style:italic'>(Ký, ghi rõ họ tên)</div><div class='sig-name'>{System.Web.HttpUtility.HtmlEncode(dto.ReferringDoctor)}</div></div>");
        sb.AppendLine("</div>");

        sb.AppendLine("</body></html>");
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static RehabSessionDto MapToRehabSessionDto(RehabSession e) => new()
    {
        Id = e.Id, TreatmentPlanId = e.TreatmentPlanId, SessionNumber = e.SessionNumber, ScheduledDate = e.SessionDate,
        ScheduledTime = e.StartTime, TherapistName = e.Therapist?.FullName ?? "", Status = e.Status, ProgressNotes = e.ProgressNotes
    };
}


#endregion
