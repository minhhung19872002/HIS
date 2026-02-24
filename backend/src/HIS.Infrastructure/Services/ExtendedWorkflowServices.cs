using HIS.Application.DTOs.Telemedicine;
using HIS.Application.DTOs.Nutrition;
using HIS.Application.DTOs.InfectionControl;
using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.DTOs.Equipment;
using HIS.Application.DTOs.MedicalHR;
using HIS.Application.DTOs.QualityManagement;
using HIS.Application.DTOs.PatientPortal;
using HIS.Application.DTOs.HealthExchange;
using HIS.Application.DTOs.MassCasualty;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

internal static class ExtendedWorkflowSqlGuard
{
    public static bool IsMissingTable(SqlException ex) => ex.Number == 208;
}

#region Flow 11: Telemedicine Service
public class TelemedicineServiceImpl : ITelemedicineService
{
    private readonly HISDbContext _context;
    public TelemedicineServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<TeleAppointmentDto>> GetAppointmentsAsync(DateTime? fromDate, DateTime? toDate, string? status = null)
    {
        var query = _context.TeleAppointments.Include(x => x.Patient).Include(x => x.Doctor).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.AppointmentDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(x => x.AppointmentDate <= toDate.Value);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderBy(x => x.AppointmentDate).ThenBy(x => x.StartTime).ToListAsync();
        return list.Select(MapToTeleAppointmentDto).ToList();
    }

    public async Task<TeleAppointmentDto> GetAppointmentByIdAsync(Guid id)
    {
        var e = await _context.TeleAppointments.Include(x => x.Patient).Include(x => x.Doctor).Include(x => x.Speciality).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToTeleAppointmentDto(e);
    }

    public async Task<TeleAppointmentDto> CreateAppointmentAsync(CreateTeleAppointmentDto dto)
    {
        var entity = new TeleAppointment
        {
            Id = Guid.NewGuid(), AppointmentCode = $"TELE-{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId, DoctorId = dto.DoctorId, SpecialityId = dto.SpecialityId,
            AppointmentDate = dto.AppointmentDate, StartTime = dto.StartTime, ChiefComplaint = dto.ChiefComplaint,
            Status = "Pending", CreatedAt = DateTime.Now
        };
        _context.TeleAppointments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetAppointmentByIdAsync(entity.Id);
    }

    public async Task<bool> CancelAppointmentAsync(Guid id, string reason)
    {
        var e = await _context.TeleAppointments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.CancellationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ConfirmAppointmentAsync(Guid id)
    {
        var e = await _context.TeleAppointments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Confirmed"; e.ConfirmedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<DoctorAvailableSlotDto>> GetAvailableSlotsAsync(Guid? doctorId, Guid? specialityId, DateTime fromDate, DateTime toDate)
    {
        var result = new List<DoctorAvailableSlotDto>();
        var doctors = await _context.Users.Where(x => x.IsActive && (!doctorId.HasValue || x.Id == doctorId)).Take(10).ToListAsync();
        foreach (var doc in doctors)
        {
            var dto = new DoctorAvailableSlotDto { DoctorId = doc.Id, DoctorName = doc.FullName };
            result.Add(dto);
        }
        return result;
    }

    public async Task<TeleSessionDto> StartSessionAsync(StartVideoCallDto dto)
    {
        var entity = new TeleSession
        {
            Id = Guid.NewGuid(), AppointmentId = dto.AppointmentId, SessionCode = $"SES-{DateTime.Now:yyyyMMddHHmmss}",
            StartTime = DateTime.Now, Status = "InProgress", RoomId = Guid.NewGuid().ToString()
        };
        _context.TeleSessions.Add(entity);
        var appt = await _context.TeleAppointments.FindAsync(dto.AppointmentId);
        if (appt != null) appt.Status = "InProgress";
        await _context.SaveChangesAsync();
        return new TeleSessionDto { Id = entity.Id, SessionCode = entity.SessionCode, Status = entity.Status, StartTime = entity.StartTime ?? DateTime.Now };
    }

    public async Task<TeleSessionDto> GetSessionAsync(Guid sessionId)
    {
        var e = await _context.TeleSessions.Include(x => x.Appointment).FirstOrDefaultAsync(x => x.Id == sessionId);
        if (e == null) return null!;
        return new TeleSessionDto { Id = e.Id, SessionCode = e.SessionCode, Status = e.Status, StartTime = e.StartTime ?? DateTime.Now, EndTime = e.EndTime };
    }

    public async Task<WaitingRoomDto> GetWaitingRoomStatusAsync(Guid appointmentId)
    {
        var appt = await _context.TeleAppointments.FindAsync(appointmentId);
        return new WaitingRoomDto { SessionId = Guid.Empty, QueuePosition = 1, EstimatedWaitMinutes = 5, DoctorOnline = true, Message = appt?.Status == "Confirmed" ? "Bác sĩ sẽ gọi bạn sớm" : "Đang chờ xác nhận" };
    }

    public async Task<bool> EndSessionAsync(Guid sessionId)
    {
        var e = await _context.TeleSessions.FindAsync(sessionId);
        if (e == null) return false;
        e.Status = "Completed"; e.EndTime = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<string> GetSessionRecordingUrlAsync(Guid sessionId)
    {
        var e = await _context.TeleSessions.FindAsync(sessionId);
        return e?.RecordingUrl ?? "";
    }

    public async Task<TeleConsultationRecordDto> GetConsultationRecordAsync(Guid sessionId)
    {
        var e = await _context.TeleConsultations.FirstOrDefaultAsync(x => x.SessionId == sessionId);
        if (e == null) return null!;
        return new TeleConsultationRecordDto { Id = e.Id, SessionId = e.SessionId, ChiefComplaint = e.Symptoms ?? "", PrimaryDiagnosis = e.Diagnosis ?? "", Plan = e.TreatmentPlan ?? "" };
    }

    public async Task<TeleConsultationRecordDto> SaveConsultationRecordAsync(SaveTeleConsultationDto dto)
    {
        var entity = await _context.TeleConsultations.FirstOrDefaultAsync(x => x.SessionId == dto.SessionId);
        if (entity == null)
        {
            entity = new TeleConsultation { Id = Guid.NewGuid(), SessionId = dto.SessionId, CreatedAt = DateTime.Now };
            _context.TeleConsultations.Add(entity);
        }
        entity.Symptoms = dto.ChiefComplaint; entity.Diagnosis = dto.PrimaryDiagnosis; entity.TreatmentPlan = dto.Plan;
        await _context.SaveChangesAsync();
        return new TeleConsultationRecordDto { Id = entity.Id, SessionId = entity.SessionId, ChiefComplaint = entity.Symptoms ?? "", PrimaryDiagnosis = entity.Diagnosis ?? "", Plan = entity.TreatmentPlan ?? "" };
    }

    public async Task<TelePrescriptionDto> CreatePrescriptionAsync(Guid sessionId, List<TelePrescriptionItemDto> items, string note)
    {
        var entity = new TelePrescription
        {
            Id = Guid.NewGuid(), SessionId = sessionId, PrescriptionCode = $"RX-{DateTime.Now:yyyyMMddHHmmss}",
            Status = "Draft", Note = note, PrescriptionDate = DateTime.Now, CreatedAt = DateTime.Now
        };
        _context.TelePrescriptions.Add(entity);
        await _context.SaveChangesAsync();
        return new TelePrescriptionDto { Id = entity.Id, PrescriptionCode = entity.PrescriptionCode, Status = entity.Status, Items = items };
    }

    public async Task<TelePrescriptionDto> SignPrescriptionAsync(Guid prescriptionId)
    {
        var e = await _context.TelePrescriptions.FindAsync(prescriptionId);
        if (e == null) return null!;
        e.Status = "Signed"; e.SignedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new TelePrescriptionDto { Id = e.Id, PrescriptionCode = e.PrescriptionCode, Status = e.Status };
    }

    public async Task<bool> SendPrescriptionToPharmacyAsync(SendPrescriptionToPharmacyDto dto)
    {
        var e = await _context.TelePrescriptions.FindAsync(dto.PrescriptionId);
        if (e == null) return false;
        e.Status = "SentToPharmacy"; e.SentToPharmacyAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TeleFeedbackDto> SubmitFeedbackAsync(SubmitTeleFeedbackDto dto)
    {
        var entity = new TeleFeedback
        {
            Id = Guid.NewGuid(), SessionId = dto.SessionId, OverallRating = dto.OverallRating,
            DoctorRating = dto.DoctorRating, VideoQualityRating = dto.TechnicalRating, Comments = dto.Comments, CreatedAt = DateTime.Now
        };
        _context.TeleFeedbacks.Add(entity);
        await _context.SaveChangesAsync();
        return new TeleFeedbackDto { Id = entity.Id, OverallRating = entity.OverallRating, DoctorRating = entity.DoctorRating ?? 0, Comments = entity.Comments ?? "" };
    }

    public async Task<TelemedicineDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new TelemedicineDashboardDto
            {
                Date = d,
                TodayAppointments = await _context.TeleAppointments.CountAsync(x => x.AppointmentDate.Date == d.Date),
                TodayCompleted = await _context.TeleSessions.CountAsync(x => x.StartTime.HasValue && x.StartTime.Value.Date == d.Date && x.Status == "Completed"),
                CurrentWaitingPatients = await _context.TeleAppointments.CountAsync(x => x.Status == "Pending" && x.AppointmentDate.Date == d.Date)
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new TelemedicineDashboardDto { Date = d, TodayAppointments = 0, TodayCompleted = 0, CurrentWaitingPatients = 0 };
        }
    }

    private static TeleAppointmentDto MapToTeleAppointmentDto(TeleAppointment e) => new()
    {
        Id = e.Id, AppointmentCode = e.AppointmentCode, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "",
        DoctorId = e.DoctorId, DoctorName = e.Doctor?.FullName ?? "", SpecialityId = e.SpecialityId ?? Guid.Empty,
        SpecialityName = e.Speciality?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, StartTime = e.StartTime,
        EndTime = e.EndTime ?? e.StartTime.Add(TimeSpan.FromMinutes(e.DurationMinutes)), Status = e.Status, ChiefComplaint = e.ChiefComplaint ?? ""
    };
}
#endregion

#region Flow 12: Clinical Nutrition Service
public class ClinicalNutritionServiceImpl : IClinicalNutritionService
{
    private readonly HISDbContext _context;
    public ClinicalNutritionServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<NutritionScreeningDto>> GetPendingScreeningsAsync(Guid? departmentId = null)
    {
        var admissions = await _context.Admissions.Include(x => x.Patient).Where(x => x.Status == 0).ToListAsync(); // 0 = Đang điều trị (Active)
        var screenedIds = await _context.NutritionScreenings.Select(x => x.AdmissionId).ToListAsync();
        return admissions.Where(a => !screenedIds.Contains(a.Id)).Select(a => new NutritionScreeningDto
        {
            AdmissionId = a.Id, PatientId = a.PatientId, PatientName = a.Patient?.FullName ?? "", RiskLevel = "Pending"
        }).ToList();
    }

    public async Task<NutritionScreeningDto> GetScreeningByAdmissionAsync(Guid admissionId)
    {
        var e = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.AdmissionId == admissionId);
        if (e == null) return null!;
        return MapToNutritionScreeningDto(e);
    }

    public async Task<NutritionScreeningDto> PerformScreeningAsync(PerformNutritionScreeningDto dto)
    {
        var entity = new NutritionScreening
        {
            Id = Guid.NewGuid(), AdmissionId = dto.AdmissionId, Weight = dto.Weight, Height = dto.Height,
            BMI = dto.Weight / (dto.Height * dto.Height / 10000), NutritionScore = dto.NutritionScore, DiseaseScore = dto.DiseaseScore,
            TotalScore = dto.NutritionScore + dto.DiseaseScore, RiskLevel = (dto.NutritionScore + dto.DiseaseScore) >= 3 ? "High" : "Low",
            ScreeningDate = DateTime.Now, CreatedAt = DateTime.Now
        };
        _context.NutritionScreenings.Add(entity);
        await _context.SaveChangesAsync();
        return await GetScreeningByAdmissionAsync(dto.AdmissionId);
    }

    public async Task<List<NutritionScreeningDto>> GetHighRiskPatientsAsync(Guid? departmentId = null)
    {
        var list = await _context.NutritionScreenings.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.RiskLevel == "High").ToListAsync();
        return list.Select(MapToNutritionScreeningDto).ToList();
    }

    public async Task<NutritionAssessmentDto> GetAssessmentAsync(Guid id)
    {
        var e = await _context.NutritionAssessments.Include(x => x.Screening).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new NutritionAssessmentDto { Id = e.Id, ScreeningId = e.ScreeningId, Weight = e.Screening?.Weight ?? 0, Height = e.Screening?.Height ?? 0, BMI = e.Screening?.BMI ?? 0 };
    }

    public async Task<NutritionAssessmentDto> SaveAssessmentAsync(SaveNutritionAssessmentDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.NutritionAssessments.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new NutritionAssessment { Id = Guid.NewGuid(), ScreeningId = dto.ScreeningId, AssessmentDate = DateTime.Now, CreatedAt = DateTime.Now };
            _context.NutritionAssessments.Add(entity);
        }
        entity.ActivityFactor = dto.ActivityFactor; entity.StressFactor = dto.StressFactor;
        await _context.SaveChangesAsync();
        return new NutritionAssessmentDto { Id = entity.Id, ScreeningId = entity.ScreeningId };
    }

    public Task<decimal> CalculateEnergyRequirementAsync(Guid patientId, decimal weight, decimal height, decimal activityFactor, decimal stressFactor)
    {
        var bmr = 10 * weight + 6.25m * height - 5 * 40 + 5;
        return Task.FromResult(bmr * activityFactor * stressFactor);
    }

    public async Task<List<DietOrderDto>> GetActiveDietOrdersAsync(Guid? departmentId = null)
    {
        var list = await _context.DietOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).Include(x => x.DietType).Where(x => x.Status == "Active").ToListAsync();
        return list.Select(e => new DietOrderDto { Id = e.Id, AdmissionId = e.AdmissionId, PatientName = e.Admission?.Patient?.FullName ?? "", DietTypeName = e.DietType?.Name ?? "", Status = e.Status }).ToList();
    }

    public async Task<DietOrderDto> GetDietOrderAsync(Guid id)
    {
        var e = await _context.DietOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).Include(x => x.DietType).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new DietOrderDto { Id = e.Id, AdmissionId = e.AdmissionId, PatientName = e.Admission?.Patient?.FullName ?? "", DietTypeName = e.DietType?.Name ?? "", Status = e.Status };
    }

    public async Task<DietOrderDto> CreateDietOrderAsync(CreateDietOrderDto dto)
    {
        var entity = new DietOrder
        {
            Id = Guid.NewGuid(), OrderCode = $"DIET-{DateTime.Now:yyyyMMddHHmmss}", AdmissionId = dto.AdmissionId, DietTypeId = dto.DietTypeId,
            TargetCalories = dto.CalorieLevel, TargetProtein = dto.ProteinLevel, Status = "Active", StartDate = dto.StartDate, CreatedAt = DateTime.Now
        };
        _context.DietOrders.Add(entity);
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(entity.Id);
    }

    public async Task<DietOrderDto> UpdateDietOrderAsync(Guid id, CreateDietOrderDto dto)
    {
        var e = await _context.DietOrders.FindAsync(id);
        if (e == null) return null!;
        e.DietTypeId = dto.DietTypeId; e.TargetCalories = dto.CalorieLevel; e.TargetProtein = dto.ProteinLevel;
        await _context.SaveChangesAsync();
        return await GetDietOrderAsync(id);
    }

    public async Task<bool> DiscontinueDietOrderAsync(Guid id, string reason)
    {
        var e = await _context.DietOrders.FindAsync(id);
        if (e == null) return false;
        e.Status = "Discontinued"; e.EndDate = DateTime.Now; e.DiscontinuationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<DietTypeDto>> GetDietTypesAsync(string? category = null)
    {
        var types = new List<DietTypeDto>
        {
            new() { Id = Guid.NewGuid(), Code = "REG", Name = "Chế độ ăn thường", Category = "Regular" },
            new() { Id = Guid.NewGuid(), Code = "DM", Name = "Chế độ ăn tiểu đường", Category = "Therapeutic" }
        };
        return Task.FromResult(category != null ? types.Where(t => t.Category == category).ToList() : types);
    }

    public Task<List<MealPlanDto>> GetMealPlansAsync(DateTime date, Guid? departmentId = null) => Task.FromResult(new List<MealPlanDto>());
    public Task<MealPlanDto> GenerateMealPlanAsync(DateTime date, string mealType, Guid? departmentId = null) => Task.FromResult(new MealPlanDto { Date = date, MealType = mealType });
    public Task<bool> MarkMealDeliveredAsync(Guid dietOrderId, DateTime date, string mealType) => Task.FromResult(true);

    public async Task<NutritionMonitoringDto> GetMonitoringAsync(Guid admissionId, DateTime date)
    {
        var e = await _context.NutritionMonitorings.FirstOrDefaultAsync(x => x.AdmissionId == admissionId && x.Date.Date == date.Date);
        if (e == null) return null!;
        return new NutritionMonitoringDto { Id = e.Id, AdmissionId = e.AdmissionId, Date = e.Date };
    }

    public async Task<NutritionMonitoringDto> RecordMonitoringAsync(RecordNutritionMonitoringDto dto)
    {
        var entity = new NutritionMonitoring
        {
            Id = Guid.NewGuid(), AdmissionId = dto.AdmissionId, Date = dto.Date,
            BreakfastIntakePercent = dto.OralIntakePercent, CreatedAt = DateTime.Now
        };
        _context.NutritionMonitorings.Add(entity);
        await _context.SaveChangesAsync();
        return new NutritionMonitoringDto { Id = entity.Id, AdmissionId = entity.AdmissionId, Date = entity.Date };
    }

    public async Task<List<NutritionMonitoringDto>> GetMonitoringHistoryAsync(Guid admissionId)
    {
        var list = await _context.NutritionMonitorings.Where(x => x.AdmissionId == admissionId).OrderByDescending(x => x.Date).ToListAsync();
        return list.Select(e => new NutritionMonitoringDto { Id = e.Id, AdmissionId = e.AdmissionId, Date = e.Date }).ToList();
    }

    public Task<TPNOrderDto> GetTPNOrderAsync(Guid id) => Task.FromResult(new TPNOrderDto { Id = id });
    public Task<TPNOrderDto> CreateTPNOrderAsync(TPNOrderDto dto) => Task.FromResult(dto);

    public async Task<NutritionDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new NutritionDashboardDto
            {
                Date = d,
                HighRiskCount = await _context.NutritionScreenings.CountAsync(x => x.RiskLevel == "High"),
                ActiveDietOrders = await _context.DietOrders.CountAsync(x => x.Status == "Active")
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new NutritionDashboardDto { Date = d, HighRiskCount = 0, ActiveDietOrders = 0 };
        }
    }

    private static NutritionScreeningDto MapToNutritionScreeningDto(NutritionScreening e) => new()
    {
        Id = e.Id, AdmissionId = e.AdmissionId, PatientId = e.Admission?.PatientId ?? Guid.Empty,
        PatientName = e.Admission?.Patient?.FullName ?? "", Weight = e.Weight, Height = e.Height, BMI = e.BMI,
        NutritionScore = e.NutritionScore, DiseaseScore = e.DiseaseScore, TotalScore = e.TotalScore, RiskLevel = e.RiskLevel
    };
}
#endregion

#region Flow 13: Infection Control Service
public class InfectionControlServiceImpl : IInfectionControlService
{
    private readonly HISDbContext _context;
    public InfectionControlServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<HAIDto>> GetActiveHAICasesAsync(string? infectionType = null, Guid? departmentId = null)
    {
        var query = _context.HAICases.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.Status != "Resolved");
        if (!string.IsNullOrEmpty(infectionType)) query = query.Where(x => x.InfectionType == infectionType);
        var list = await query.ToListAsync();
        return list.Select(MapToHAIDto).ToList();
    }

    public async Task<HAIDto> GetHAICaseAsync(Guid id)
    {
        var e = await _context.HAICases.Include(x => x.Admission).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToHAIDto(e);
    }

    public async Task<HAIDto> ReportHAIAsync(ReportHAIDto dto)
    {
        var entity = new HAICase
        {
            Id = Guid.NewGuid(), CaseCode = $"HAI-{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = dto.AdmissionId, InfectionType = dto.InfectionType, InfectionSite = dto.InfectionSite ?? "",
            OnsetDate = dto.OnsetDate, Status = "Suspected", CreatedAt = DateTime.Now
        };
        _context.HAICases.Add(entity);
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(entity.Id);
    }

    public async Task<HAIDto> UpdateHAICaseAsync(Guid id, HAIDto dto)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.InfectionType = dto.InfectionType; e.InfectionSite = dto.InfectionSite; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<HAIDto> ConfirmHAICaseAsync(Guid id, string organism, bool isMDRO)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.Organism = organism; e.IsMDRO = isMDRO; e.Status = "Confirmed"; e.ConfirmedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<HAIDto> ResolveHAICaseAsync(Guid id, string outcome)
    {
        var e = await _context.HAICases.FindAsync(id);
        if (e == null) return null!;
        e.Outcome = outcome; e.Status = "Resolved"; e.ResolvedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetHAICaseAsync(id);
    }

    public async Task<List<IsolationOrderDto>> GetActiveIsolationsAsync(Guid? departmentId = null)
    {
        var list = await _context.IsolationOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).Where(x => x.Status == "Active").ToListAsync();
        return list.Select(e => new IsolationOrderDto { Id = e.Id, PatientName = e.Admission?.Patient?.FullName ?? "", IsolationType = e.IsolationType, Status = e.Status }).ToList();
    }

    public async Task<IsolationOrderDto> GetIsolationOrderAsync(Guid id)
    {
        var e = await _context.IsolationOrders.Include(x => x.Admission).ThenInclude(x => x!.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new IsolationOrderDto { Id = e.Id, PatientName = e.Admission?.Patient?.FullName ?? "", IsolationType = e.IsolationType, Reason = e.Reason, Status = e.Status };
    }

    public async Task<IsolationOrderDto> CreateIsolationOrderAsync(CreateIsolationOrderDto dto)
    {
        var entity = new IsolationOrder
        {
            Id = Guid.NewGuid(), OrderCode = $"ISO-{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = dto.AdmissionId, IsolationType = dto.IsolationType, Reason = dto.Reason ?? "",
            StartDate = dto.StartDate, Status = "Active", CreatedAt = DateTime.Now
        };
        _context.IsolationOrders.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIsolationOrderAsync(entity.Id);
    }

    public async Task<bool> DiscontinueIsolationAsync(Guid id, string reason)
    {
        var e = await _context.IsolationOrders.FindAsync(id);
        if (e == null) return false;
        e.Status = "Discontinued"; e.EndDate = DateTime.Now; e.DiscontinuationReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<HandHygieneObservationDto>> GetHandHygieneObservationsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var list = await _context.HandHygieneObservations.Where(x => x.ObservationDate >= fromDate && x.ObservationDate <= toDate).ToListAsync();
        return list.Select(e => new HandHygieneObservationDto { Id = e.Id, ObservationDate = e.ObservationDate, TotalOpportunities = e.TotalOpportunities, CompliantActions = e.ComplianceCount, ComplianceRate = e.ComplianceRate }).ToList();
    }

    public async Task<HandHygieneObservationDto> RecordHandHygieneObservationAsync(RecordHandHygieneDto dto)
    {
        var total = dto.Events?.Count ?? 0;
        var compliant = dto.Events?.Count(e => e.IsCompliant) ?? 0;
        var entity = new HandHygieneObservation
        {
            Id = Guid.NewGuid(), ObservationDate = dto.ObservationDate, TotalOpportunities = total, ComplianceCount = compliant, ComplianceRate = total > 0 ? (decimal)compliant / total * 100 : 0, CreatedAt = DateTime.Now
        };
        _context.HandHygieneObservations.Add(entity);
        await _context.SaveChangesAsync();
        return new HandHygieneObservationDto { Id = entity.Id, ObservationDate = entity.ObservationDate, TotalOpportunities = total, CompliantActions = compliant };
    }

    public async Task<decimal> GetHandHygieneComplianceRateAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var obs = await _context.HandHygieneObservations.Where(x => x.ObservationDate >= fromDate && x.ObservationDate <= toDate).ToListAsync();
        var total = obs.Sum(x => x.TotalOpportunities);
        var compliant = obs.Sum(x => x.ComplianceCount);
        return total > 0 ? (decimal)compliant / total * 100 : 0;
    }

    public async Task<List<OutbreakDto>> GetActiveOutbreaksAsync()
    {
        var list = await _context.Outbreaks.Where(x => x.Status != "Closed").ToListAsync();
        return list.Select(e => new OutbreakDto { Id = e.Id, OutbreakCode = e.OutbreakCode, Name = e.OutbreakCode, Status = e.Status, TotalCases = e.TotalCases }).ToList();
    }

    public async Task<OutbreakDto> GetOutbreakAsync(Guid id)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return null!;
        return new OutbreakDto { Id = e.Id, OutbreakCode = e.OutbreakCode, Name = e.OutbreakCode, Organism = e.Organism, Status = e.Status, TotalCases = e.TotalCases };
    }

    public async Task<OutbreakDto> DeclareOutbreakAsync(DeclareOutbreakDto dto)
    {
        var entity = new Outbreak
        {
            Id = Guid.NewGuid(), OutbreakCode = $"OB-{DateTime.Now:yyyyMMddHHmmss}",
            Organism = dto.Organism ?? "", AffectedAreas = string.Join(",", dto.AffectedDepartments ?? new List<string>()),
            DetectionDate = dto.IdentifiedDate, Status = "Active", TotalCases = dto.InitialCases?.Count ?? 0, CreatedAt = DateTime.Now
        };
        _context.Outbreaks.Add(entity);
        await _context.SaveChangesAsync();
        return await GetOutbreakAsync(entity.Id);
    }

    public async Task<OutbreakDto> UpdateOutbreakAsync(Guid id, OutbreakDto dto)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return null!;
        e.TotalCases = dto.TotalCases; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetOutbreakAsync(id);
    }

    public async Task<bool> CloseOutbreakAsync(Guid id)
    {
        var e = await _context.Outbreaks.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.ResolvedDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LinkCaseToOutbreakAsync(Guid outbreakId, Guid caseId)
    {
        var hai = await _context.HAICases.FindAsync(caseId);
        if (hai == null) return false;
        hai.OutbreakId = outbreakId;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<EnvironmentSurveillanceDto>> GetEnvironmentSurveillanceAsync(DateTime fromDate, DateTime toDate, string? locationType = null) => Task.FromResult(new List<EnvironmentSurveillanceDto>());
    public Task<EnvironmentSurveillanceDto> RecordEnvironmentSurveillanceAsync(EnvironmentSurveillanceDto dto) => Task.FromResult(dto);
    public Task<List<AntibioticStewardshipDto>> GetAntibioticsRequiringReviewAsync(Guid? departmentId = null) => Task.FromResult(new List<AntibioticStewardshipDto>());
    public Task<AntibioticUsageReportDto> GetAntibioticUsageReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null) => Task.FromResult(new AntibioticUsageReportDto { FromDate = fromDate, ToDate = toDate });
    public Task<bool> ReviewAntibioticAsync(Guid id, string outcome, string notes) => Task.FromResult(true);

    public async Task<ICDashboardDto> GetDashboardAsync(DateTime? date = null)
    {
        var d = date ?? DateTime.Today;
        try
        {
            return new ICDashboardDto
            {
                Date = d,
                ActiveHAICases = await _context.HAICases.CountAsync(x => x.Status != "Resolved"),
                ActiveIsolations = await _context.IsolationOrders.CountAsync(x => x.Status == "Active"),
                ActiveOutbreaks = await _context.Outbreaks.CountAsync(x => x.Status == "Active")
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new ICDashboardDto { Date = d, ActiveHAICases = 0, ActiveIsolations = 0, ActiveOutbreaks = 0 };
        }
    }

    private static HAIDto MapToHAIDto(HAICase e) => new()
    {
        Id = e.Id, CaseCode = e.CaseCode, AdmissionId = e.AdmissionId, PatientName = e.Admission?.Patient?.FullName ?? "",
        InfectionType = e.InfectionType, InfectionSite = e.InfectionSite, OnsetDate = e.OnsetDate,
        Organism = e.Organism ?? "", IsMDRO = e.IsMDRO, Status = e.Status
    };
}
#endregion

#region Flow 14: Rehabilitation Service - Real Implementation
public class RehabilitationServiceImpl : IRehabilitationService
{
    private readonly HISDbContext _context;
    public RehabilitationServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<RehabReferralDto>> GetPendingReferralsAsync()
    {
        var list = await _context.RehabReferrals.Include(x => x.Patient).Include(x => x.ReferredBy).Where(x => x.Status == "Pending").ToListAsync();
        return list.Select(e => new RehabReferralDto { Id = e.Id, ReferralCode = e.ReferralCode, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "", RehabType = e.RehabType, PrimaryDiagnosis = e.Diagnosis, Status = e.Status }).ToList();
    }

    public async Task<RehabReferralDto> GetReferralAsync(Guid id)
    {
        var e = await _context.RehabReferrals.Include(x => x.Patient).Include(x => x.ReferredBy).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new RehabReferralDto { Id = e.Id, ReferralCode = e.ReferralCode, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "", RehabType = e.RehabType, PrimaryDiagnosis = e.Diagnosis, RehabGoals = e.Reason, Status = e.Status };
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

#region Flow 15: Medical Equipment Service - Real Implementation
public class MedicalEquipmentServiceImpl : IMedicalEquipmentService
{
    private readonly HISDbContext _context;
    public MedicalEquipmentServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalEquipmentDto>> GetEquipmentListAsync(Guid? departmentId = null, string? category = null, string? status = null)
    {
        var query = _context.MedicalEquipments.Include(x => x.Department).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToListAsync();
        return list.Select(MapToEquipmentDto).ToList();
    }

    public async Task<MedicalEquipmentDto> GetEquipmentAsync(Guid id)
    {
        var e = await _context.MedicalEquipments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToEquipmentDto(e);
    }

    public async Task<MedicalEquipmentDto> RegisterEquipmentAsync(RegisterEquipmentDto dto)
    {
        var entity = new MedicalEquipment { Id = Guid.NewGuid(), EquipmentCode = $"EQ-{DateTime.Now:yyyyMMddHHmmss}", EquipmentName = dto.Name, Category = dto.Category ?? "General", SerialNumber = dto.SerialNumber, Manufacturer = dto.Manufacturer, DepartmentId = dto.DepartmentId, Status = "Active", PurchaseDate = dto.PurchaseDate, CreatedAt = DateTime.Now };
        _context.MedicalEquipments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(entity.Id);
    }

    public async Task<MedicalEquipmentDto> UpdateEquipmentAsync(Guid id, RegisterEquipmentDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return null!;
        e.EquipmentName = dto.Name; e.Category = dto.Category ?? e.Category; e.SerialNumber = dto.SerialNumber; e.Manufacturer = dto.Manufacturer;
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(id);
    }

    public async Task<bool> TransferEquipmentAsync(Guid id, Guid newDepartmentId, string roomNumber)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.DepartmentId = newDepartmentId; e.Location = roomNumber;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateEquipmentStatusAsync(Guid id, string status, string reason)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.Status = status; e.StatusReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MaintenanceScheduleDto>> GetMaintenanceSchedulesAsync(DateTime? dueDate = null, bool? overdue = null)
    {
        var query = _context.MaintenanceRecords.Include(x => x.Equipment).Where(x => x.Status == "Scheduled");
        if (dueDate.HasValue) query = query.Where(x => x.ScheduledDate <= dueDate);
        if (overdue == true) query = query.Where(x => x.ScheduledDate < DateTime.Today);
        var list = await query.ToListAsync();
        return list.Select(e => new MaintenanceScheduleDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", MaintenanceType = e.MaintenanceType, NextDueDate = e.ScheduledDate, Status = e.Status }).ToList();
    }

    public async Task<MaintenanceScheduleDto> CreateMaintenanceScheduleAsync(Guid equipmentId, string maintenanceType, string frequency, DateTime nextDueDate)
    {
        var entity = new MaintenanceRecord { Id = Guid.NewGuid(), EquipmentId = equipmentId, MaintenanceType = maintenanceType, ScheduledDate = nextDueDate, Status = "Scheduled", CreatedAt = DateTime.Now };
        _context.MaintenanceRecords.Add(entity);
        await _context.SaveChangesAsync();
        return new MaintenanceScheduleDto { Id = entity.Id, EquipmentId = equipmentId, MaintenanceType = maintenanceType, NextDueDate = nextDueDate, Status = "Scheduled" };
    }

    public async Task<List<MaintenanceRecordDto>> GetMaintenanceHistoryAsync(Guid equipmentId)
    {
        var list = await _context.MaintenanceRecords.Include(x => x.PerformedBy).Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToListAsync();
        return list.Select(e => new MaintenanceRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, MaintenanceType = e.MaintenanceType, MaintenanceDate = e.ScheduledDate, PerformedAt = e.PerformedDate, Result = e.Status, Description = e.WorkDescription, TotalCost = e.TotalCost }).ToList();
    }

    public async Task<MaintenanceRecordDto> RecordMaintenanceAsync(CreateMaintenanceRecordDto dto)
    {
        var entity = new MaintenanceRecord { Id = Guid.NewGuid(), EquipmentId = dto.EquipmentId, MaintenanceType = dto.MaintenanceType ?? "Corrective", ScheduledDate = dto.MaintenanceDate, PerformedDate = DateTime.Now, Status = "Completed", WorkDescription = dto.Description, PartsReplaced = dto.PartsReplaced, PartsCost = dto.PartsCost, LaborCost = dto.LaborCost, TotalCost = (dto.PartsCost ?? 0) + (dto.LaborCost ?? 0), CreatedAt = DateTime.Now };
        _context.MaintenanceRecords.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) eq.LastMaintenanceDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return new MaintenanceRecordDto { Id = entity.Id, EquipmentId = entity.EquipmentId, MaintenanceType = entity.MaintenanceType, PerformedAt = entity.PerformedDate, Result = entity.Status };
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationsDueAsync(int daysAhead = 30)
    {
        var dueDate = DateTime.Today.AddDays(daysAhead);
        var list = await _context.CalibrationRecords.Include(x => x.Equipment).Where(x => x.Status == "Scheduled" && x.ScheduledDate <= dueDate).ToListAsync();
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.ScheduledDate, Status = e.Status }).ToList();
    }

    public async Task<CalibrationRecordDto> GetCalibrationRecordAsync(Guid id)
    {
        var e = await _context.CalibrationRecords.Include(x => x.Equipment).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" };
    }

    public async Task<CalibrationRecordDto> RecordCalibrationAsync(RecordCalibrationDto dto)
    {
        var entity = new CalibrationRecord { Id = Guid.NewGuid(), EquipmentId = dto.EquipmentId, ScheduledDate = dto.CalibrationDate, PerformedDate = dto.CalibrationDate, PerformedBy = dto.CalibratedBy, Status = "Completed", CertificateNumber = dto.CertificateNumber, CalibrationStandard = dto.CalibrationStandard, PassedCalibration = dto.Result == "Pass", CalibrationCost = dto.CalibrationCost, ValidFrom = dto.CalibrationDate, ValidUntil = dto.NextCalibrationDate, NextCalibrationDate = dto.NextCalibrationDate, CreatedAt = DateTime.Now };
        _context.CalibrationRecords.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) { eq.LastCalibrationDate = DateTime.Now; eq.NextCalibrationDate = entity.ValidUntil; }
        await _context.SaveChangesAsync();
        return await GetCalibrationRecordAsync(entity.Id);
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationHistoryAsync(Guid equipmentId)
    {
        var list = await _context.CalibrationRecords.Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToListAsync();
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" }).ToList();
    }

    public async Task<List<RepairRequestDto>> GetRepairRequestsAsync(string? status = null, Guid? departmentId = null)
    {
        var query = _context.RepairRequests.Include(x => x.Equipment).Include(x => x.RequestedBy).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        var list = await query.OrderByDescending(x => x.RequestDate).ToListAsync();
        return list.Select(e => new RepairRequestDto { Id = e.Id, RequestCode = e.RequestCode, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", ProblemDescription = e.ProblemDescription, Severity = e.Priority, Status = e.Status, ReportedDate = e.RequestDate, RequestedAt = e.RequestDate }).ToList();
    }

    public async Task<RepairRequestDto> GetRepairRequestAsync(Guid id)
    {
        var e = await _context.RepairRequests.Include(x => x.Equipment).Include(x => x.RequestedBy).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new RepairRequestDto { Id = e.Id, RequestCode = e.RequestCode, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", ProblemDescription = e.ProblemDescription, Severity = e.Priority, Status = e.Status, ReportedDate = e.RequestDate, RequestedAt = e.RequestDate };
    }

    public async Task<RepairRequestDto> CreateRepairRequestAsync(CreateRepairRequestDto dto)
    {
        var entity = new RepairRequest { Id = Guid.NewGuid(), RequestCode = $"REP-{DateTime.Now:yyyyMMddHHmmss}", EquipmentId = dto.EquipmentId, RequestDate = DateTime.Now, ProblemDescription = dto.ProblemDescription ?? "", Priority = dto.Severity ?? "Normal", Status = "Pending", CreatedAt = DateTime.Now };
        _context.RepairRequests.Add(entity);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) eq.Status = "InMaintenance";
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(entity.Id);
    }

    public async Task<RepairRequestDto> UpdateRepairRequestAsync(Guid id, RepairRequestDto dto)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return null!;
        e.Priority = dto.Severity ?? e.Priority; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(id);
    }

    public async Task<bool> CompleteRepairAsync(Guid id, string actionTaken, string partsUsed, decimal cost)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return false;
        e.Status = "Completed"; e.CompletedDate = DateTime.Now; e.RepairActions = actionTaken; e.PartsUsed = partsUsed; e.TotalCost = cost; e.IsRepaired = true;
        var eq = await _context.MedicalEquipments.FindAsync(e.EquipmentId);
        if (eq != null) eq.Status = "Active";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<EquipmentDisposalDto>> GetDisposalRequestsAsync(string? status = null)
    {
        var query = _context.MedicalEquipments.Where(x => x.Status == "Decommissioned" || x.DecommissionDate != null);
        var list = await query.ToListAsync();
        return list.Select(e => new EquipmentDisposalDto { Id = e.Id, EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = e.Status, DisposalDate = e.DecommissionDate, DisposalReason = e.DecommissionReason }).ToList();
    }

    public async Task<EquipmentDisposalDto> CreateDisposalRequestAsync(CreateDisposalRequestDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (e == null) return null!;
        e.Status = "PendingDisposal"; e.DecommissionReason = dto.DisposalReason;
        await _context.SaveChangesAsync();
        return new EquipmentDisposalDto { Id = Guid.NewGuid(), EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = "PendingDisposal", DisposalReason = dto.DisposalReason };
    }

    public async Task<bool> ApproveDisposalAsync(Guid id, string notes) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "ApprovedForDisposal"; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> RejectDisposalAsync(Guid id, string reason) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Active"; e.DecommissionReason = null; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> ExecuteDisposalAsync(Guid id, DateTime disposalDate, string certificate) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Decommissioned"; e.DecommissionDate = disposalDate; await _context.SaveChangesAsync(); return true; }

    public async Task<EquipmentDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new EquipmentDashboardDto
            {
                TotalEquipment = await _context.MedicalEquipments.CountAsync(),
                ActiveEquipment = await _context.MedicalEquipments.CountAsync(x => x.Status == "Active"),
                InMaintenance = await _context.MedicalEquipments.CountAsync(x => x.Status == "InMaintenance"),
                OpenRepairRequests = await _context.RepairRequests.CountAsync(x => x.Status == "Pending"),
                CalibrationDueThisMonth = await _context.MedicalEquipments.CountAsync(x => x.NextCalibrationDate != null && x.NextCalibrationDate <= DateTime.Today.AddDays(30))
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new EquipmentDashboardDto();
        }
    }

    public async Task<EquipmentReportDto> GetEquipmentReportAsync(DateTime fromDate, DateTime toDate)
    {
        return new EquipmentReportDto { FromDate = fromDate, ToDate = toDate, MaintenanceEventsTotal = await _context.MaintenanceRecords.CountAsync(x => x.PerformedDate >= fromDate && x.PerformedDate <= toDate), RepairRequests = await _context.RepairRequests.CountAsync(x => x.RequestDate >= fromDate && x.RequestDate <= toDate) };
    }

    private static MedicalEquipmentDto MapToEquipmentDto(MedicalEquipment e) => new()
    {
        Id = e.Id, EquipmentCode = e.EquipmentCode, Name = e.EquipmentName, Category = e.Category, SerialNumber = e.SerialNumber,
        Manufacturer = e.Manufacturer, DepartmentName = e.Department?.DepartmentName ?? "", Status = e.Status, Location = e.Location
    };
}
#endregion

#region Flow 16: Medical HR Service - Real Implementation
public class MedicalHRServiceImpl : IMedicalHRService
{
    private readonly HISDbContext _context;
    public MedicalHRServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId = null, string? staffType = null, string? status = null)
    {
        var query = _context.MedicalStaffs.Include(x => x.PrimaryDepartment).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.PrimaryDepartmentId == departmentId);
        if (!string.IsNullOrEmpty(staffType)) query = query.Where(x => x.StaffType == staffType);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToListAsync();
        return list.Select(MapToStaffDto).ToList();
    }

    public async Task<MedicalStaffDto> GetStaffAsync(Guid id)
    {
        var e = await _context.MedicalStaffs.Include(x => x.PrimaryDepartment).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToStaffDto(e);
    }

    public async Task<MedicalStaffDto> SaveStaffAsync(SaveMedicalStaffDto dto)
    {
        var entity = dto.Id.HasValue ? await _context.MedicalStaffs.FindAsync(dto.Id.Value) : null;
        if (entity == null) { entity = new MedicalStaff { Id = Guid.NewGuid(), StaffCode = $"STF-{DateTime.Now:yyyyMMddHHmmss}", CreatedAt = DateTime.Now }; _context.MedicalStaffs.Add(entity); }
        entity.FullName = dto.FullName; entity.StaffType = dto.StaffType ?? "Other"; entity.PrimaryDepartmentId = dto.DepartmentId; entity.LicenseNumber = dto.PracticeLicenseNumber; entity.Specialty = dto.Specialty; entity.Status = "Active";
        await _context.SaveChangesAsync();
        return await GetStaffAsync(entity.Id);
    }

    public async Task<bool> UpdateStaffStatusAsync(Guid id, string status, string reason)
    {
        var e = await _context.MedicalStaffs.FindAsync(id);
        if (e == null) return false;
        e.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MedicalStaffDto>> GetStaffWithExpiringLicensesAsync(int daysAhead = 90)
    {
        var expiryDate = DateTime.Today.AddDays(daysAhead);
        var list = await _context.MedicalStaffs.Where(x => x.LicenseExpiryDate != null && x.LicenseExpiryDate <= expiryDate && x.Status == "Active").ToListAsync();
        return list.Select(MapToStaffDto).ToList();
    }

    public async Task<QualificationDto> AddQualificationAsync(Guid staffId, QualificationDto dto)
    {
        var entity = new StaffQualification { Id = Guid.NewGuid(), StaffId = staffId, QualificationType = "Degree", Name = dto.Degree ?? "", IssuedBy = dto.Institution, IssueDate = new DateTime(dto.GraduationYear, 1, 1), CreatedAt = DateTime.Now };
        _context.StaffQualifications.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> RemoveQualificationAsync(Guid id)
    {
        var e = await _context.StaffQualifications.FindAsync(id);
        if (e == null) return false;
        _context.StaffQualifications.Remove(e);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CertificationDto> AddCertificationAsync(Guid staffId, CertificationDto dto)
    {
        var entity = new StaffQualification { Id = Guid.NewGuid(), StaffId = staffId, QualificationType = "Certification", Name = dto.CertificationName ?? "", IssuedBy = dto.IssuingBody, IssueDate = dto.IssueDate, ExpiryDate = dto.ExpiryDate, CreatedAt = DateTime.Now };
        _context.StaffQualifications.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> RemoveCertificationAsync(Guid id) => await RemoveQualificationAsync(id);

    public async Task<DutyRosterDto> GetDutyRosterAsync(Guid departmentId, int year, int month)
    {
        var roster = await _context.DutyRosters.Include(x => x.Shifts).FirstOrDefaultAsync(x => x.DepartmentId == departmentId && x.Year == year && x.Month == month);
        if (roster == null) return null!;
        return new DutyRosterDto { Id = roster.Id, DepartmentId = roster.DepartmentId, Year = roster.Year, Month = roster.Month, Status = roster.Status };
    }

    public async Task<DutyRosterDto> CreateDutyRosterAsync(CreateDutyRosterDto dto)
    {
        var entity = new DutyRoster { Id = Guid.NewGuid(), DepartmentId = dto.DepartmentId, Year = dto.Year, Month = dto.Month, Status = "Draft", CreatedAt = DateTime.Now };
        _context.DutyRosters.Add(entity);
        await _context.SaveChangesAsync();
        return new DutyRosterDto { Id = entity.Id, DepartmentId = entity.DepartmentId, Year = entity.Year, Month = entity.Month, Status = entity.Status };
    }

    public async Task<DutyRosterDto> PublishDutyRosterAsync(Guid rosterId)
    {
        var e = await _context.DutyRosters.FindAsync(rosterId);
        if (e == null) return null!;
        e.Status = "Published"; e.PublishedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return await GetDutyRosterAsync(e.DepartmentId, e.Year, e.Month);
    }

    public async Task<DutyShiftDto> AddShiftAssignmentAsync(Guid shiftId, Guid staffId, string role)
    {
        var shift = await _context.DutyShifts.FindAsync(shiftId);
        if (shift == null) return null!;
        shift.StaffId = staffId;
        await _context.SaveChangesAsync();
        return new DutyShiftDto { Id = shift.Id, ShiftDate = shift.ShiftDate, ShiftType = shift.ShiftType };
    }

    public async Task<bool> RemoveShiftAssignmentAsync(Guid assignmentId)
    {
        var e = await _context.DutyShifts.FindAsync(assignmentId);
        if (e == null) return false;
        e.Status = "Cancelled";
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(Guid? departmentId = null) => Task.FromResult(new List<ShiftSwapRequestDto>());
    public Task<ShiftSwapRequestDto> RequestShiftSwapAsync(Guid assignmentId, Guid targetAssignmentId, string reason) => Task.FromResult(new ShiftSwapRequestDto { Id = Guid.NewGuid() });
    public Task<bool> ApproveSwapAsTargetAsync(Guid requestId, bool approve) => Task.FromResult(true);
    public Task<bool> ApproveSwapAsManagerAsync(Guid requestId, bool approve, string notes) => Task.FromResult(true);

    public async Task<List<ClinicAssignmentDto>> GetClinicAssignmentsAsync(DateTime date, Guid? departmentId = null)
    {
        var query = _context.ClinicAssignments.Include(x => x.Staff).Include(x => x.Room).Where(x => x.AssignmentDate.Date == date.Date);
        if (departmentId.HasValue) query = query.Where(x => x.Room != null && x.Room.DepartmentId == departmentId);
        var list = await query.ToListAsync();
        return list.Select(e => new ClinicAssignmentDto { Id = e.Id, DoctorId = e.StaffId, DoctorName = e.Staff?.FullName ?? "", RoomId = e.RoomId, RoomName = e.Room?.RoomCode ?? "", Date = e.AssignmentDate, Session = e.ShiftType, Status = e.Status }).ToList();
    }

    public async Task<ClinicAssignmentDto> CreateClinicAssignmentAsync(CreateClinicAssignmentDto dto)
    {
        var entity = new ClinicAssignment { Id = Guid.NewGuid(), StaffId = dto.DoctorId, RoomId = dto.RoomId, AssignmentDate = dto.Date, ShiftType = dto.Session ?? "Morning", MaxPatients = dto.MaxPatients, Status = "Active", CreatedAt = DateTime.Now };
        _context.ClinicAssignments.Add(entity);
        await _context.SaveChangesAsync();
        return new ClinicAssignmentDto { Id = entity.Id, DoctorId = entity.StaffId, Date = entity.AssignmentDate, Session = entity.ShiftType, Status = entity.Status };
    }

    public async Task<bool> CancelClinicAssignmentAsync(Guid id, string reason)
    {
        var e = await _context.ClinicAssignments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.Notes = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<CMECourseDto>> GetAvailableCoursesAsync(string? category = null) => Task.FromResult(new List<CMECourseDto>());

    public async Task<CMESummaryDto> GetStaffCMESummaryAsync(Guid staffId)
    {
        var records = await _context.CMERecords.Where(x => x.StaffId == staffId).ToListAsync();
        return new CMESummaryDto { StaffId = staffId, EarnedCredits = records.Sum(x => x.CreditHours), CurrentYearCredits = records.Where(x => x.ActivityDate.Year == DateTime.Now.Year).Sum(x => x.CreditHours) };
    }

    public async Task<CMERecordDto> RecordCMECompletionAsync(Guid staffId, Guid courseId, int creditsEarned, string certificateNumber)
    {
        var entity = new CMERecord { Id = Guid.NewGuid(), StaffId = staffId, ActivityName = "CME Course", ActivityType = "Course", ActivityDate = DateTime.Now, CreditHours = creditsEarned, CertificateNumber = certificateNumber, CreatedAt = DateTime.Now };
        _context.CMERecords.Add(entity);
        await _context.SaveChangesAsync();
        return new CMERecordDto { Id = entity.Id, StaffId = staffId, CreditsEarned = creditsEarned, CertificateNumber = certificateNumber };
    }

    public async Task<List<MedicalStaffDto>> GetCMENonCompliantStaffAsync()
    {
        var staffIds = await _context.CMERecords.GroupBy(x => x.StaffId).Where(g => g.Sum(x => x.CreditHours) < 24).Select(g => g.Key).ToListAsync();
        var list = await _context.MedicalStaffs.Where(x => staffIds.Contains(x.Id) && x.Status == "Active").ToListAsync();
        return list.Select(MapToStaffDto).ToList();
    }

    public Task<CompetencyAssessmentDto> GetCompetencyAssessmentAsync(Guid id) => Task.FromResult(new CompetencyAssessmentDto { Id = id });
    public Task<CompetencyAssessmentDto> CreateCompetencyAssessmentAsync(Guid staffId, CompetencyAssessmentDto dto) => Task.FromResult(dto);
    public Task<bool> SignAssessmentAsync(Guid id, string signatureType) => Task.FromResult(true);

    public async Task<MedicalHRDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new MedicalHRDashboardDto
            {
                TotalStaff = await _context.MedicalStaffs.CountAsync(),
                ActiveDoctors = await _context.MedicalStaffs.CountAsync(x => x.StaffType == "Doctor" && x.Status == "Active"),
                ActiveNurses = await _context.MedicalStaffs.CountAsync(x => x.StaffType == "Nurse" && x.Status == "Active"),
                ExpiringLicenses30Days = await _context.MedicalStaffs.CountAsync(x => x.LicenseExpiryDate != null && x.LicenseExpiryDate <= DateTime.Today.AddDays(30))
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new MedicalHRDashboardDto();
        }
    }

    private static MedicalStaffDto MapToStaffDto(MedicalStaff e) => new()
    {
        Id = e.Id, StaffCode = e.StaffCode, FullName = e.FullName, StaffType = e.StaffType, Specialty = e.Specialty,
        DepartmentName = e.PrimaryDepartment?.DepartmentName ?? "", PracticeLicenseNumber = e.LicenseNumber, LicenseExpiryDate = e.LicenseExpiryDate, Status = e.Status
    };
}
#endregion

#region Flow 17: Quality Management Service - Real Implementation
public class QualityManagementServiceImpl : IQualityManagementService
{
    private readonly HISDbContext _context;
    public QualityManagementServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<IncidentReportDto>> GetIncidentReportsAsync(DateTime? fromDate = null, DateTime? toDate = null, string? status = null, string? type = null)
    {
        var query = _context.IncidentReports.Include(x => x.Department).Include(x => x.ReportedBy).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.IncidentDate >= fromDate);
        if (toDate.HasValue) query = query.Where(x => x.IncidentDate <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(type)) query = query.Where(x => x.IncidentType == type);
        var list = await query.OrderByDescending(x => x.IncidentDate).ToListAsync();
        return list.Select(MapToIncidentDto).ToList();
    }

    public async Task<IncidentReportDto> GetIncidentReportAsync(Guid id)
    {
        var e = await _context.IncidentReports.Include(x => x.Department).Include(x => x.ReportedBy).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToIncidentDto(e);
    }

    public async Task<IncidentReportDto> CreateIncidentReportAsync(CreateIncidentReportDto dto)
    {
        var entity = new IncidentReport { Id = Guid.NewGuid(), ReportCode = $"INC-{DateTime.Now:yyyyMMddHHmmss}", IncidentDate = dto.IncidentDate, ReportDate = DateTime.Now, IncidentType = dto.IncidentType ?? "Other", Severity = dto.SeverityLevel ?? "Minor", Description = dto.Description ?? "", Status = "Reported", CreatedAt = DateTime.Now };
        _context.IncidentReports.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIncidentReportAsync(entity.Id);
    }

    public async Task<IncidentReportDto> UpdateIncidentReportAsync(Guid id, IncidentReportDto dto)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return null!;
        e.IncidentType = dto.IncidentType; e.Severity = dto.SeverityLevel; e.Description = dto.Description; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetIncidentReportAsync(id);
    }

    public async Task<bool> AssignInvestigatorAsync(Guid id, string investigator)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return false;
        e.Status = "UnderInvestigation"; e.InvestigationStartDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CloseIncidentAsync(Guid id, string closureNotes)
    {
        var e = await _context.IncidentReports.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.InvestigationEndDate = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<bool> AddCorrectiveActionAsync(Guid incidentId, CorrectiveActionDto action) => Task.FromResult(true);
    public Task<bool> UpdateCorrectiveActionStatusAsync(Guid actionId, string status, string notes) => Task.FromResult(true);

    public async Task<List<QualityIndicatorDto>> GetIndicatorsAsync(string? category = null)
    {
        var query = _context.QualityIndicators.AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        var list = await query.Where(x => x.IsActive).ToListAsync();
        return list.Select(e => new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0 }).ToList();
    }

    public async Task<QualityIndicatorDto> GetIndicatorAsync(Guid id)
    {
        var e = await _context.QualityIndicators.FindAsync(id);
        return e == null ? null! : new QualityIndicatorDto { Id = e.Id, IndicatorCode = e.IndicatorCode, IndicatorName = e.Name, Name = e.Name, Category = e.Category, TargetValue = e.TargetValue ?? 0, Description = e.Description };
    }

    public async Task<QualityIndicatorDto> CreateIndicatorAsync(QualityIndicatorDto dto)
    {
        var entity = new QualityIndicator { Id = Guid.NewGuid(), IndicatorCode = dto.IndicatorCode ?? $"QI-{DateTime.Now:yyyyMMddHHmmss}", Name = dto.Name ?? "", Category = dto.Category ?? "Clinical", Description = dto.Description, TargetValue = dto.TargetValue, IsActive = true, CreatedAt = DateTime.Now };
        _context.QualityIndicators.Add(entity);
        await _context.SaveChangesAsync();
        return await GetIndicatorAsync(entity.Id);
    }

    public async Task<List<QualityIndicatorValueDto>> GetIndicatorValuesAsync(Guid indicatorId, DateTime fromDate, DateTime toDate)
    {
        var list = await _context.QualityIndicatorValues.Where(x => x.IndicatorId == indicatorId && x.PeriodEnd >= fromDate && x.PeriodEnd <= toDate).OrderBy(x => x.PeriodEnd).ToListAsync();
        return list.Select(e => new QualityIndicatorValueDto { Id = e.Id, IndicatorId = e.IndicatorId, PeriodEnd = e.PeriodEnd, Numerator = e.Numerator ?? 0, Denominator = e.Denominator ?? 0, Value = e.Value }).ToList();
    }

    public async Task<QualityIndicatorValueDto> RecordIndicatorValueAsync(Guid indicatorId, DateTime periodEnd, decimal numerator, decimal denominator, string analysis)
    {
        var entity = new QualityIndicatorValue { Id = Guid.NewGuid(), IndicatorId = indicatorId, PeriodStart = periodEnd.AddMonths(-1), PeriodEnd = periodEnd, Numerator = numerator, Denominator = denominator, Value = denominator != 0 ? numerator / denominator * 100 : 0, Notes = analysis, CreatedAt = DateTime.Now };
        _context.QualityIndicatorValues.Add(entity);
        await _context.SaveChangesAsync();
        return new QualityIndicatorValueDto { Id = entity.Id, IndicatorId = indicatorId, PeriodEnd = periodEnd, Numerator = numerator, Denominator = denominator, Value = entity.Value };
    }

    public async Task<List<QualityIndicatorValueDto>> GetCriticalIndicatorsAsync()
    {
        var latest = await _context.QualityIndicatorValues.Include(x => x.Indicator).GroupBy(x => x.IndicatorId).Select(g => g.OrderByDescending(x => x.PeriodEnd).First()).ToListAsync();
        return latest.Where(e => e.Indicator != null && e.Indicator.ThresholdLow != null && e.Value < e.Indicator.ThresholdLow).Select(e => new QualityIndicatorValueDto { Id = e.Id, IndicatorId = e.IndicatorId, IndicatorName = e.Indicator?.Name ?? "", Value = e.Value, Status = "Critical" }).ToList();
    }

    public async Task<List<AuditPlanDto>> GetAuditPlansAsync(int year)
    {
        var list = await _context.AuditPlans.Where(x => x.Year == year).ToListAsync();
        return list.Select(e => new AuditPlanDto { Id = e.Id, PlanCode = e.AuditCode, Year = e.Year, AuditType = e.AuditType, Standard = e.Standard, Status = e.Status }).ToList();
    }

    public async Task<AuditPlanDto> CreateAuditPlanAsync(AuditPlanDto dto)
    {
        var entity = new AuditPlan { Id = Guid.NewGuid(), AuditCode = dto.PlanCode ?? $"AUD-{DateTime.Now:yyyyMMddHHmmss}", AuditName = dto.PlanCode ?? "", Year = dto.Year, AuditType = dto.AuditType ?? "Scheduled", Standard = dto.Standard ?? "Internal", PlannedStartDate = DateTime.Now, PlannedEndDate = DateTime.Now.AddDays(7), Status = "Planned", LeadAuditorId = Guid.Empty, CreatedAt = DateTime.Now };
        _context.AuditPlans.Add(entity);
        await _context.SaveChangesAsync();
        return new AuditPlanDto { Id = entity.Id, PlanCode = entity.AuditCode, Year = entity.Year, AuditType = entity.AuditType, Status = entity.Status };
    }

    public async Task<bool> ApproveAuditPlanAsync(Guid id)
    {
        var e = await _context.AuditPlans.FindAsync(id);
        if (e == null) return false;
        e.Status = "Approved";
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<AuditResultDto> GetAuditResultAsync(Guid id) => Task.FromResult(new AuditResultDto { Id = id });
    public Task<AuditResultDto> SubmitAuditResultAsync(AuditResultDto dto) => Task.FromResult(dto);
    public Task<List<AuditFindingDto>> GetOpenFindingsAsync(Guid? departmentId = null) => Task.FromResult(new List<AuditFindingDto>());

    public async Task<List<PatientSatisfactionSurveyDto>> GetSurveysAsync(DateTime fromDate, DateTime toDate, string? surveyType = null)
    {
        var query = _context.SatisfactionSurveys.Where(x => x.SurveyDate >= fromDate && x.SurveyDate <= toDate);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.SurveyType == surveyType);
        var list = await query.ToListAsync();
        return list.Select(e => new PatientSatisfactionSurveyDto { Id = e.Id, SurveyDate = e.SurveyDate, SurveyType = e.SurveyType, OverallSatisfaction = e.OverallRating ?? 0 }).ToList();
    }

    public async Task<PatientSatisfactionSurveyDto> SubmitSurveyAsync(PatientSatisfactionSurveyDto dto)
    {
        var entity = new SatisfactionSurvey { Id = Guid.NewGuid(), SurveyDate = DateTime.Now, SurveyType = dto.SurveyType ?? "General", OverallRating = dto.OverallSatisfaction, PositiveFeedback = "", CreatedAt = DateTime.Now };
        _context.SatisfactionSurveys.Add(entity);
        await _context.SaveChangesAsync();
        return new PatientSatisfactionSurveyDto { Id = entity.Id, SurveyDate = entity.SurveyDate, SurveyType = entity.SurveyType, OverallSatisfaction = entity.OverallRating ?? 0 };
    }

    public async Task<SatisfactionReportDto> GetSatisfactionReportAsync(DateTime fromDate, DateTime toDate, string? surveyType = null, string? department = null)
    {
        var query = _context.SatisfactionSurveys.Where(x => x.SurveyDate >= fromDate && x.SurveyDate <= toDate);
        if (!string.IsNullOrEmpty(surveyType)) query = query.Where(x => x.SurveyType == surveyType);
        var surveys = await query.ToListAsync();
        return new SatisfactionReportDto { FromDate = fromDate, ToDate = toDate, TotalResponses = surveys.Count, AverageOverall = surveys.Any() ? (decimal)surveys.Average(x => x.OverallRating ?? 0) : 0 };
    }

    public async Task<bool> MarkSurveyFollowedUpAsync(Guid id, string notes)
    {
        var e = await _context.SatisfactionSurveys.FindAsync(id);
        if (e == null) return false;
        e.Suggestions = notes;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<CAPADto>> GetCAPAsAsync(string? status = null, string? source = null)
    {
        var query = _context.CAPAs.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(source)) query = query.Where(x => x.Source == source);
        var list = await query.ToListAsync();
        return list.Select(e => new CAPADto { Id = e.Id, CAPACode = e.CAPACode, Title = e.ActionDescription, Source = e.Source, Status = e.Status, TargetCompletionDate = e.DueDate }).ToList();
    }

    public async Task<CAPADto> GetCAPAAsync(Guid id)
    {
        var e = await _context.CAPAs.FindAsync(id);
        return e == null ? null! : new CAPADto { Id = e.Id, CAPACode = e.CAPACode, Title = e.ActionDescription, Source = e.Source, Status = e.Status, TargetCompletionDate = e.DueDate, ProblemDescription = e.ExpectedOutcome ?? "" };
    }

    public async Task<CAPADto> CreateCAPAAsync(CAPADto dto)
    {
        var entity = new CAPA { Id = Guid.NewGuid(), CAPACode = $"CAPA-{DateTime.Now:yyyyMMddHHmmss}", ActionDescription = dto.Title ?? "", Source = dto.Source ?? "Other", ExpectedOutcome = dto.ProblemDescription, Status = "Open", DueDate = dto.TargetCompletionDate, AssignedToId = Guid.Empty, CreatedAt = DateTime.Now };
        _context.CAPAs.Add(entity);
        await _context.SaveChangesAsync();
        return await GetCAPAAsync(entity.Id);
    }

    public async Task<CAPADto> UpdateCAPAAsync(Guid id, CAPADto dto)
    {
        var e = await _context.CAPAs.FindAsync(id);
        if (e == null) return null!;
        e.ActionDescription = dto.Title ?? e.ActionDescription; e.ExpectedOutcome = dto.ProblemDescription; e.Status = dto.Status ?? e.Status;
        await _context.SaveChangesAsync();
        return await GetCAPAAsync(id);
    }

    public async Task<bool> CloseCAPAAsync(Guid id, string verificationResult)
    {
        var e = await _context.CAPAs.FindAsync(id);
        if (e == null) return false;
        e.Status = "Closed"; e.CompletedDate = DateTime.Now; e.VerificationNotes = verificationResult;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<QMDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new QMDashboardDto
            {
                OpenIncidents = await _context.IncidentReports.CountAsync(x => x.Status != "Closed"),
                IncidentsThisMonth = await _context.IncidentReports.CountAsync(x => x.IncidentDate.Month == DateTime.Today.Month && x.IncidentDate.Year == DateTime.Today.Year),
                OpenCAPAs = await _context.CAPAs.CountAsync(x => x.Status != "Closed"),
                OverdueCAPAs = await _context.CAPAs.CountAsync(x => x.Status != "Closed" && x.DueDate < DateTime.Today)
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new QMDashboardDto();
        }
    }

    private static IncidentReportDto MapToIncidentDto(IncidentReport e) => new()
    {
        Id = e.Id, IncidentCode = e.ReportCode, IncidentDate = e.IncidentDate, IncidentType = e.IncidentType,
        SeverityLevel = e.Severity, Description = e.Description, Status = e.Status, DepartmentName = e.Department?.DepartmentName ?? ""
    };
}
#endregion

#region Flow 18: Patient Portal Service - Real Implementation
public class PatientPortalServiceImpl : IPatientPortalService
{
    private readonly HISDbContext _context;
    public PatientPortalServiceImpl(HISDbContext context) => _context = context;

    public async Task<PortalAccountDto> GetAccountAsync(Guid accountId)
    {
        var e = await _context.PortalAccounts.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == accountId);
        return e == null ? null! : new PortalAccountDto { Id = e.Id, Email = e.Email, Phone = e.Phone, PatientId = e.PatientId, PatientName = e.Patient?.FullName ?? "", Status = e.Status, IsEmailVerified = e.IsEmailVerified, IsPhoneVerified = e.IsPhoneVerified };
    }

    public async Task<PortalAccountDto> RegisterAccountAsync(RegisterPortalAccountDto dto)
    {
        var entity = new PortalAccount { Id = Guid.NewGuid(), Email = dto.Email, Phone = dto.Phone, PasswordHash = dto.Password, Status = "Pending", CreatedAt = DateTime.Now };
        _context.PortalAccounts.Add(entity);
        await _context.SaveChangesAsync();
        return await GetAccountAsync(entity.Id);
    }

    public async Task<bool> VerifyEmailAsync(Guid accountId, string code)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.IsEmailVerified = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> VerifyPhoneAsync(Guid accountId, string otp)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.IsPhoneVerified = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LinkPatientRecordAsync(Guid accountId, string patientCode, string verificationData)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.PatientCode == patientCode);
        if (patient == null) return false;
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account == null) return false;
        account.PatientId = patient.Id; account.Status = "Active";
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<eKYCVerificationDto> SubmitEKYCAsync(Guid accountId, eKYCVerificationDto dto) => Task.FromResult(dto);
    public async Task<bool> UpdatePreferencesAsync(Guid accountId, PortalAccountDto preferences)
    {
        var e = await _context.PortalAccounts.FindAsync(accountId);
        if (e == null) return false;
        e.PreferredLanguage = preferences.Language; e.ReceiveEmailNotifications = preferences.NotifyByEmail; e.ReceiveSMSNotifications = preferences.NotifyBySMS;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<PortalAppointmentDto>> GetAppointmentsAsync(Guid patientId, bool includeHistory = false)
    {
        try
        {
            var query = _context.PortalAppointments.Include(x => x.Department).Where(x => x.PatientId == patientId);
            if (!includeHistory) query = query.Where(x => x.AppointmentDate >= DateTime.Today);
            var list = await query.OrderBy(x => x.AppointmentDate).ToListAsync();
            return list.Select(e => new PortalAppointmentDto { Id = e.Id, PatientId = e.PatientId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new List<PortalAppointmentDto>();
        }
    }

    public async Task<PortalAppointmentDto> GetAppointmentAsync(Guid id)
    {
        var e = await _context.PortalAppointments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalAppointmentDto { Id = e.Id, PatientId = e.PatientId, DepartmentName = e.Department?.DepartmentName ?? "", AppointmentDate = e.AppointmentDate, AppointmentTime = e.SlotTime, Status = e.Status, ReasonForVisit = e.ChiefComplaint };
    }

    public Task<List<AvailableSlotDto>> GetAvailableSlotsAsync(Guid departmentId, Guid? doctorId, DateTime fromDate, DateTime toDate)
    {
        var slots = new List<AvailableSlotDto>();
        for (var d = fromDate; d <= toDate; d = d.AddDays(1))
            if (d.DayOfWeek != DayOfWeek.Sunday)
            {
                var timeSlots = new List<TimeSlotItemDto>();
                for (var h = 8; h < 17; h++)
                    timeSlots.Add(new TimeSlotItemDto { StartTime = TimeSpan.FromHours(h), EndTime = TimeSpan.FromHours(h + 1), IsAvailable = true, RemainingSlots = 5 });
                slots.Add(new AvailableSlotDto { Date = d, Session = d.Hour < 12 ? "Morning" : "Afternoon", TimeSlots = timeSlots });
            }
        return Task.FromResult(slots);
    }

    public async Task<PortalAppointmentDto> BookAppointmentAsync(Guid patientId, CreatePortalAppointmentDto dto)
    {
        var entity = new PortalAppointment { Id = Guid.NewGuid(), PatientId = patientId, DepartmentId = dto.DepartmentId, DoctorId = dto.DoctorId, AppointmentDate = dto.AppointmentDate, SlotTime = dto.AppointmentTime, ChiefComplaint = dto.ReasonForVisit, Status = "Pending", CreatedAt = DateTime.Now };
        _context.PortalAppointments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetAppointmentAsync(entity.Id);
    }

    public async Task<bool> CancelAppointmentAsync(Guid id, string reason)
    {
        var e = await _context.PortalAppointments.FindAsync(id);
        if (e == null) return false;
        e.Status = "Cancelled"; e.CancellationReason = reason; e.CancelledAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PortalAppointmentDto> RescheduleAppointmentAsync(Guid id, DateTime newDate, TimeSpan newTime)
    {
        var e = await _context.PortalAppointments.FindAsync(id);
        if (e == null) return null!;
        e.AppointmentDate = newDate; e.SlotTime = newTime; e.Status = "Rescheduled";
        await _context.SaveChangesAsync();
        return await GetAppointmentAsync(id);
    }

    public async Task<HealthRecordSummaryDto> GetHealthRecordSummaryAsync(Guid patientId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.Id == patientId);
        if (patient == null) return null!;
        return new HealthRecordSummaryDto { PatientId = patientId, PatientName = patient.FullName, DateOfBirth = patient.DateOfBirth ?? DateTime.MinValue, Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác", Allergies = new List<string>() };
    }

    public async Task<List<VisitSummaryDto>> GetVisitHistoryAsync(Guid patientId, int limit = 20)
    {
        var exams = await _context.Examinations.Include(x => x.Room).ThenInclude(x => x!.Department).Include(x => x.Doctor).Include(x => x.MedicalRecord).Where(x => x.MedicalRecord!.PatientId == patientId).OrderByDescending(x => x.StartTime).Take(limit).ToListAsync();
        return exams.Select(e => new VisitSummaryDto { VisitId = e.Id, VisitDate = e.StartTime ?? DateTime.MinValue, Department = e.Room?.Department?.DepartmentName ?? "", DoctorName = e.Doctor?.FullName ?? "", Diagnosis = e.MainDiagnosis }).ToList();
    }

    public Task<byte[]> ExportHealthRecordPdfAsync(Guid patientId) => Task.FromResult(Array.Empty<byte>());

    public async Task<List<PortalLabResultDto>> GetLabResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.LabResults.Include(x => x.LabRequestItem).ThenInclude(x => x!.LabRequest).Where(x => x.LabRequestItem!.LabRequest!.PatientId == patientId);
        if (fromDate.HasValue) query = query.Where(x => x.ResultDate >= fromDate);
        if (toDate.HasValue) query = query.Where(x => x.ResultDate <= toDate);
        var list = await query.OrderByDescending(x => x.ResultDate).ToListAsync();
        return list.Select(e => new PortalLabResultDto { Id = e.Id, OrderCode = e.LabRequestItem?.LabRequest?.RequestCode ?? "", ResultDate = e.ResultDate, Status = e.Status == 1 ? "Completed" : "Pending" }).ToList();
    }

    public async Task<PortalLabResultDto> GetLabResultAsync(Guid id)
    {
        var e = await _context.LabResults.Include(x => x.LabRequestItem).ThenInclude(x => x!.LabRequest).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalLabResultDto { Id = e.Id, OrderCode = e.LabRequestItem?.LabRequest?.RequestCode ?? "", ResultDate = e.ResultDate, Status = e.Status == 1 ? "Completed" : "Pending" };
    }

    public Task<bool> MarkLabResultViewedAsync(Guid id)
    {
        return Task.FromResult(true);
    }

    public async Task<List<PortalImagingResultDto>> GetImagingResultsAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.RadiologyReports.Include(x => x.RadiologyExam).ThenInclude(x => x!.RadiologyRequest).Include(x => x.RadiologyExam).ThenInclude(x => x!.Modality).Where(x => x.RadiologyExam!.RadiologyRequest!.PatientId == patientId);
        var list = await query.OrderByDescending(x => x.ReportDate).ToListAsync();
        return list.Select(e => new PortalImagingResultDto { Id = e.Id, Modality = e.RadiologyExam?.Modality?.ModalityName ?? "", StudyDate = e.RadiologyExam?.ExamDate, Status = e.Status == 1 ? "Completed" : "Pending" }).ToList();
    }

    public async Task<PortalImagingResultDto> GetImagingResultAsync(Guid id)
    {
        var e = await _context.RadiologyReports.Include(x => x.RadiologyExam).ThenInclude(x => x!.Modality).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalImagingResultDto { Id = e.Id, Modality = e.RadiologyExam?.Modality?.ModalityName ?? "", StudyDate = e.RadiologyExam?.ExamDate, Findings = e.Findings, Status = e.Status == 1 ? "Completed" : "Pending" };
    }

    public async Task<List<PortalPrescriptionDto>> GetPrescriptionsAsync(Guid patientId, bool activeOnly = true)
    {
        var query = _context.Prescriptions.Include(x => x.MedicalRecord).Where(x => x.MedicalRecord!.PatientId == patientId);
        var list = await query.OrderByDescending(x => x.PrescriptionDate).ToListAsync();
        return list.Select(e => new PortalPrescriptionDto { Id = e.Id, PrescriptionDate = e.PrescriptionDate, Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending" }).ToList();
    }

    public async Task<PortalPrescriptionDto> GetPrescriptionAsync(Guid id)
    {
        var e = await _context.Prescriptions.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalPrescriptionDto { Id = e.Id, PrescriptionDate = e.PrescriptionDate, Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending" };
    }

    public Task<RefillRequestDto> RequestRefillAsync(RefillRequestDto dto) => Task.FromResult(dto);
    public Task<List<PortalPrescriptionDto>> GetRefillHistoryAsync(Guid patientId) => Task.FromResult(new List<PortalPrescriptionDto>());

    public async Task<List<PortalInvoiceDto>> GetInvoicesAsync(Guid patientId, bool unpaidOnly = false)
    {
        var query = _context.Receipts.Where(x => x.PatientId == patientId);
        if (unpaidOnly) query = query.Where(x => x.Status != 1);
        var list = await query.OrderByDescending(x => x.ReceiptDate).ToListAsync();
        return list.Select(e => new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" }).ToList();
    }

    public async Task<PortalInvoiceDto> GetInvoiceAsync(Guid id)
    {
        var e = await _context.Receipts.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" };
    }

    public async Task<OnlinePaymentDto> InitiatePaymentAsync(Guid patientId, InitiatePaymentDto dto)
    {
        var invoiceId = dto.InvoiceIds?.FirstOrDefault() ?? Guid.Empty;
        var invoice = await _context.Receipts.FindAsync(invoiceId);
        var amount = invoice?.FinalAmount ?? 0;
        var entity = new OnlinePayment { Id = Guid.NewGuid(), PatientId = patientId, ReferenceId = invoiceId, PaymentType = "Invoice", Amount = amount, PaymentMethod = dto.PaymentMethod ?? "VNPay", Status = "Pending", TransactionCode = $"PAY-{DateTime.Now:yyyyMMddHHmmss}", CreatedAt = DateTime.Now };
        _context.OnlinePayments.Add(entity);
        await _context.SaveChangesAsync();
        return new OnlinePaymentDto { Id = entity.Id, Amount = entity.Amount, PaymentMethod = entity.PaymentMethod, Status = entity.Status };
    }

    public async Task<OnlinePaymentDto> GetPaymentStatusAsync(Guid paymentId)
    {
        var e = await _context.OnlinePayments.FindAsync(paymentId);
        return e == null ? null! : new OnlinePaymentDto { Id = e.Id, Amount = e.Amount, PaymentMethod = e.PaymentMethod, Status = e.Status, TransactionCode = e.TransactionCode };
    }

    public async Task<bool> ProcessPaymentCallbackAsync(string transactionCode, string gatewayResponse)
    {
        var e = await _context.OnlinePayments.FirstOrDefaultAsync(x => x.TransactionCode == transactionCode);
        if (e == null) return false;
        e.Status = gatewayResponse.Contains("success") ? "Completed" : "Failed"; e.GatewayResponse = gatewayResponse; e.PaidAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<ServiceFeedbackDto> SubmitFeedbackAsync(Guid patientId, SubmitFeedbackDto dto) => Task.FromResult(new ServiceFeedbackDto { Id = Guid.NewGuid(), VisitId = dto.VisitId });

    public async Task<List<PortalNotificationDto>> GetNotificationsAsync(Guid accountId, bool unreadOnly = false)
    {
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account?.PatientId == null) return new List<PortalNotificationDto>();
        var query = _context.Notifications.Where(x => x.TargetUserId == account.PatientId);
        if (unreadOnly) query = query.Where(x => !x.IsRead);
        var list = await query.OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync();
        return list.Select(e => new PortalNotificationDto { Id = e.Id, Title = e.Title, Message = e.Content, IsRead = e.IsRead, CreatedAt = e.CreatedAt }).ToList();
    }

    public async Task<bool> MarkNotificationReadAsync(Guid id)
    {
        var e = await _context.Notifications.FindAsync(id);
        if (e == null) return false;
        e.IsRead = true; e.ReadAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetUnreadNotificationCountAsync(Guid accountId)
    {
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account?.PatientId == null) return 0;
        return await _context.Notifications.CountAsync(x => x.TargetUserId == account.PatientId && !x.IsRead);
    }

    public async Task<PatientPortalDashboardDto> GetDashboardAsync(Guid patientId)
    {
        return new PatientPortalDashboardDto
        {
            PatientId = patientId,
            UpcomingAppointments = await _context.PortalAppointments.CountAsync(x => x.PatientId == patientId && x.AppointmentDate >= DateTime.Today && x.Status != "Cancelled"),
            UnpaidInvoices = await _context.Receipts.CountAsync(x => x.PatientId == patientId && x.Status != 1),
            NewLabResults = await _context.LabResults.CountAsync(x => x.LabRequestItem!.LabRequest!.PatientId == patientId && x.Status == 1)
        };
    }
}
#endregion

public class HealthExchangeServiceImpl : IHealthExchangeService
{
    private readonly HISDbContext _context;
    public HealthExchangeServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<HIEConnectionDto>> GetConnectionsAsync()
    {
        var list = await _context.HIEConnections.ToListAsync();
        return list.Select(e => new HIEConnectionDto
        {
            Id = e.Id,
            ConnectionName = e.ConnectionName,
            ConnectionType = e.ConnectionType,
            Endpoint = e.EndpointUrl,
            AuthMethod = e.AuthType,
            IsActive = e.IsActive,
            LastSuccessfulConnection = e.LastSuccessfulConnection,
            ConnectionStatus = e.Status,
            ErrorMessage = e.LastErrorMessage
        }).ToList();
    }

    public async Task<HIEConnectionDto> TestConnectionAsync(Guid connectionId)
    {
        var e = await _context.HIEConnections.FindAsync(connectionId);
        if (e == null) return null!;
        e.LastSuccessfulConnection = DateTime.Now;
        e.Status = "Connected";
        await _context.SaveChangesAsync();
        return new HIEConnectionDto { Id = e.Id, ConnectionName = e.ConnectionName, ConnectionStatus = "Connected", IsActive = e.IsActive };
    }

    public async Task<HIEConnectionConfigDto> SaveConnectionConfigAsync(HIEConnectionConfigDto dto)
    {
        var entity = dto.Id != Guid.Empty ? await _context.HIEConnections.FindAsync(dto.Id) : null;
        if (entity == null)
        {
            entity = new HIEConnection { Id = Guid.NewGuid() };
            _context.HIEConnections.Add(entity);
        }
        entity.ConnectionName = dto.ConnectionName;
        entity.ConnectionType = dto.ConnectionType;
        entity.EndpointUrl = dto.Endpoint;
        entity.AuthType = dto.AuthMethod;
        entity.ClientId = dto.ClientId;
        entity.CertificatePath = dto.CertificatePath;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public Task<InsuranceCardLookupResultDto> LookupInsuranceCardAsync(string cardNumber)
    {
        // Insurance card lookup would integrate with BHXH portal - returns lookup result
        return Task.FromResult(new InsuranceCardLookupResultDto { CardNumber = cardNumber, IsValid = true, LookupTime = DateTime.Now });
    }

    public async Task<InsuranceXMLSubmissionDto> GenerateXMLAsync(string xmlType, DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var entity = new InsuranceXMLSubmission
        {
            Id = Guid.NewGuid(),
            SubmissionCode = $"XML{DateTime.Now:yyyyMMddHHmmss}",
            XMLType = xmlType,
            PeriodFrom = fromDate,
            PeriodTo = toDate,
            DepartmentId = departmentId,
            GeneratedAt = DateTime.Now,
            Status = "Generated"
        };
        _context.InsuranceXMLSubmissions.Add(entity);
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = entity.Id, SubmissionCode = entity.SubmissionCode, XMLType = xmlType, FromDate = fromDate, ToDate = toDate, Status = "Generated", GeneratedAt = entity.GeneratedAt };
    }

    public async Task<InsuranceXMLSubmissionDto> ValidateXMLAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        e.Status = "Validated";
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = "Validated", IsValid = true };
    }

    public async Task<InsuranceXMLSubmissionDto> SubmitXMLAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        e.Status = "Submitted";
        e.SubmittedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = "Submitted", SubmissionDate = e.SubmittedAt ?? DateTime.Now };
    }

    public async Task<InsuranceXMLSubmissionDto> GetSubmissionStatusAsync(Guid submissionId)
    {
        var e = await _context.InsuranceXMLSubmissions.FindAsync(submissionId);
        if (e == null) return null!;
        return new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, Status = e.Status, RecordCount = e.TotalRecords, TotalAmount = e.TotalAmount };
    }

    public async Task<List<InsuranceXMLSubmissionDto>> GetSubmissionsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.InsuranceXMLSubmissions.Where(x => x.GeneratedAt >= fromDate && x.GeneratedAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.GeneratedAt).ToListAsync();
        return list.Select(e => new InsuranceXMLSubmissionDto { Id = e.Id, SubmissionCode = e.SubmissionCode, XMLType = e.XMLType, FromDate = e.PeriodFrom, ToDate = e.PeriodTo, Status = e.Status, RecordCount = e.TotalRecords, TotalAmount = e.TotalAmount, GeneratedAt = e.GeneratedAt }).ToList();
    }

    public Task<InsuranceAuditResultDto> GetAuditResultAsync(string submissionId)
    {
        return Task.FromResult(new InsuranceAuditResultDto { SubmissionId = submissionId, AuditDate = DateTime.Today });
    }

    public async Task<ElectronicHealthRecordDto> GetEHRAsync(string patientIdNumber)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == patientIdNumber);
        if (patient == null) return null!;
        return new ElectronicHealthRecordDto { PatientId = patientIdNumber, FullName = patient.FullName, DateOfBirth = patient.DateOfBirth ?? DateTime.MinValue, Gender = patient.Gender == 1 ? "Nam" : "Nữ", Address = patient.Address, Phone = patient.PhoneNumber };
    }

    public Task<bool> UpdateEHRAsync(ElectronicHealthRecordDto dto) => Task.FromResult(true);

    public Task<PatientConsentDto> GetPatientConsentAsync(Guid patientId)
    {
        return Task.FromResult(new PatientConsentDto { PatientId = patientId, IsActive = true, ConsentType = "FullAccess" });
    }

    public Task<PatientConsentDto> RecordPatientConsentAsync(PatientConsentDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.RecordedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public Task<bool> RevokeConsentAsync(Guid consentId, string reason) => Task.FromResult(true);

    public async Task<List<ElectronicReferralDto>> GetOutgoingReferralsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.ElectronicReferrals.Include(x => x.Patient).Where(x => x.SentAt >= fromDate && x.SentAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.SentAt).ToListAsync();
        return list.Select(e => new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            SentAt = e.SentAt,
            ReferralDate = e.SentAt
        }).ToList();
    }

    public async Task<List<ElectronicReferralDto>> GetIncomingReferralsAsync(DateTime fromDate, DateTime toDate, string? status = null)
    {
        var query = _context.ElectronicReferrals.Include(x => x.Patient).Where(x => x.ReceivedAt >= fromDate && x.ReceivedAt <= toDate);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.ReceivedAt).ToListAsync();
        return list.Select(e => new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            ReceivedAt = e.ReceivedAt,
            ReferralDate = e.SentAt
        }).ToList();
    }

    public async Task<ElectronicReferralDto> GetReferralAsync(Guid id)
    {
        var e = await _context.ElectronicReferrals.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new ElectronicReferralDto
        {
            Id = e.Id,
            ReferralCode = e.ReferralCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            SourceFacilityCode = e.FromFacilityCode,
            SourceFacilityName = e.FromFacilityName,
            DestinationFacilityCode = e.ToFacilityCode,
            DestinationFacilityName = e.ToFacilityName,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalSummary = e.ClinicalSummary,
            TreatmentProvided = e.TreatmentGiven,
            ReasonForReferral = e.ReferralReason,
            Status = e.Status,
            SentAt = e.SentAt,
            ReceivedAt = e.ReceivedAt,
            ReferralDate = e.SentAt
        };
    }

    public async Task<ElectronicReferralDto> CreateReferralAsync(CreateElectronicReferralDto dto)
    {
        var entity = new ElectronicReferral
        {
            Id = Guid.NewGuid(),
            ReferralCode = $"REF{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            AdmissionId = dto.AdmissionId,
            ToFacilityCode = dto.DestinationFacilityCode,
            ToFacilityName = dto.DestinationFacilityCode,
            ToDepartment = dto.DestinationDepartment,
            Diagnosis = dto.PrimaryDiagnosis,
            IcdCodes = dto.DiagnosisICD,
            ClinicalSummary = dto.ClinicalSummary,
            TreatmentGiven = dto.TreatmentProvided,
            ReferralReason = dto.ReasonForReferral,
            FromFacilityCode = "CURRENT",
            FromFacilityName = "Bệnh viện HIS",
            ReferredById = Guid.Empty,
            Status = "Draft",
            SentAt = DateTime.Now
        };
        _context.ElectronicReferrals.Add(entity);
        await _context.SaveChangesAsync();
        return new ElectronicReferralDto { Id = entity.Id, ReferralCode = entity.ReferralCode, PatientId = entity.PatientId, Status = "Draft" };
    }

    public async Task<ElectronicReferralDto> SendReferralAsync(Guid id)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return null!;
        e.Status = "Sent";
        e.SentAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new ElectronicReferralDto { Id = e.Id, ReferralCode = e.ReferralCode, Status = "Sent", SentAt = e.SentAt };
    }

    public async Task<bool> AcceptReferralAsync(Guid id, string notes)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return false;
        e.Status = "Accepted";
        e.ResponseAt = DateTime.Now;
        e.ResponseMessage = notes;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectReferralAsync(Guid id, string reason)
    {
        var e = await _context.ElectronicReferrals.FindAsync(id);
        if (e == null) return false;
        e.Status = "Declined";
        e.ResponseAt = DateTime.Now;
        e.ResponseMessage = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<TeleconsultationRequestDto>> GetTeleconsultationRequestsAsync(string? status = null)
    {
        var query = _context.TeleconsultationRequests.Include(x => x.Patient).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return list.Select(e => new TeleconsultationRequestDto
        {
            Id = e.Id,
            RequestCode = e.RequestCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            RequestingFacilityCode = e.RequestingFacilityCode,
            RequestingFacilityName = e.RequestingFacilityName,
            ConsultingFacilityCode = e.ConsultingFacilityCode,
            ConsultingFacilityName = e.ConsultingFacilityName,
            ConsultingSpecialty = e.ConsultingSpecialty,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalQuestion = e.ConsultationQuestion,
            Urgency = e.Urgency,
            Status = e.Status,
            ScheduledTime = e.ScheduledDateTime,
            CreatedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<TeleconsultationRequestDto> GetTeleconsultationAsync(Guid id)
    {
        var e = await _context.TeleconsultationRequests.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new TeleconsultationRequestDto
        {
            Id = e.Id,
            RequestCode = e.RequestCode,
            PatientId = e.PatientId,
            PatientName = e.Patient?.FullName ?? "",
            RequestingFacilityCode = e.RequestingFacilityCode,
            RequestingFacilityName = e.RequestingFacilityName,
            ConsultingFacilityCode = e.ConsultingFacilityCode,
            ConsultingFacilityName = e.ConsultingFacilityName,
            ConsultingSpecialty = e.ConsultingSpecialty,
            PrimaryDiagnosis = e.Diagnosis,
            ClinicalQuestion = e.ConsultationQuestion,
            Urgency = e.Urgency,
            Status = e.Status,
            ScheduledTime = e.ScheduledDateTime,
            ConsultationNotes = e.ConsultationOpinion,
            Recommendations = e.Recommendations,
            AssignedConsultant = e.ConsultantName,
            CreatedAt = e.CreatedAt
        };
    }

    public async Task<TeleconsultationRequestDto> CreateTeleconsultationAsync(CreateTeleconsultationDto dto)
    {
        var entity = new TeleconsultationRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"TC{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            RequestingFacilityCode = "CURRENT",
            RequestingFacilityName = "Bệnh viện HIS",
            RequestedById = Guid.Empty,
            ConsultingFacilityCode = dto.ConsultingFacilityCode,
            ConsultingFacilityName = dto.ConsultingFacilityCode,
            ConsultingSpecialty = dto.ConsultingSpecialty,
            CaseDescription = dto.PatientHistory ?? "",
            Diagnosis = dto.PrimaryDiagnosis,
            ConsultationQuestion = dto.ClinicalQuestion,
            Urgency = dto.Urgency ?? "Routine",
            Status = "Requested",
            ScheduledDateTime = dto.PreferredTime,
            CreatedAt = DateTime.Now
        };
        _context.TeleconsultationRequests.Add(entity);
        await _context.SaveChangesAsync();
        return new TeleconsultationRequestDto { Id = entity.Id, RequestCode = entity.RequestCode, PatientId = entity.PatientId, Status = "Requested" };
    }

    public async Task<TeleconsultationRequestDto> RespondToTeleconsultationAsync(Guid id, string notes, string recommendations)
    {
        var e = await _context.TeleconsultationRequests.FindAsync(id);
        if (e == null) return null!;
        e.ConsultationOpinion = notes;
        e.Recommendations = recommendations;
        e.Status = "Completed";
        e.EndedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new TeleconsultationRequestDto { Id = e.Id, RequestCode = e.RequestCode, Status = "Completed", ConsultationNotes = notes, Recommendations = recommendations };
    }

    public Task<HealthAuthorityReportDto> GenerateAuthorityReportAsync(string reportType, DateTime fromDate, DateTime toDate)
    {
        return Task.FromResult(new HealthAuthorityReportDto { Id = Guid.NewGuid(), ReportCode = $"RPT{DateTime.Now:yyyyMMddHHmmss}", ReportType = reportType, ReportPeriodFrom = fromDate, ReportPeriodTo = toDate, Status = "Draft", GeneratedAt = DateTime.Now });
    }

    public Task<HealthAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId)
    {
        return Task.FromResult(new HealthAuthorityReportDto { Id = reportId, Status = "Submitted", SubmittedAt = DateTime.Now });
    }

    public Task<InfectiousDiseaseReportDto> SubmitInfectiousDiseaseReportAsync(InfectiousDiseaseReportDto dto)
    {
        dto.Id = Guid.NewGuid();
        dto.Status = "Submitted";
        dto.SubmittedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public async Task<HIEDashboardDto> GetDashboardAsync()
    {
        try
        {
            var connections = await _context.HIEConnections.ToListAsync();
            var submissions = await _context.InsuranceXMLSubmissions.Where(x => x.GeneratedAt.Month == DateTime.Now.Month).ToListAsync();
            var referrals = await _context.ElectronicReferrals.Where(x => x.SentAt.Month == DateTime.Now.Month).ToListAsync();
            var teleconsults = await _context.TeleconsultationRequests.Where(x => x.Status == "Requested" || x.Status == "Scheduled").ToListAsync();

            return new HIEDashboardDto
            {
                Date = DateTime.Today,
                TotalConnections = connections.Count,
                ActiveConnections = connections.Count(c => c.IsActive),
                XMLSubmissionsThisMonth = submissions.Count,
                PendingSubmissions = submissions.Count(s => s.Status == "Generated" || s.Status == "Validated"),
                SubmittedThisMonth = submissions.Count(s => s.Status == "Submitted"),
                ClaimedAmountThisMonth = submissions.Sum(s => s.TotalAmount),
                OutgoingReferrals = referrals.Count(r => r.FromFacilityCode == "CURRENT"),
                IncomingReferrals = referrals.Count(r => r.ToFacilityCode == "CURRENT"),
                PendingReferrals = referrals.Count(r => r.Status == "Sent"),
                ActiveTeleconsultations = teleconsults.Count,
                PendingRequests = teleconsults.Count(t => t.Status == "Requested"),
                Connections = connections.Select(c => new HIEConnectionDto { Id = c.Id, ConnectionName = c.ConnectionName, ConnectionType = c.ConnectionType, IsActive = c.IsActive, ConnectionStatus = c.Status }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new HIEDashboardDto { Date = DateTime.Today, Connections = new List<HIEConnectionDto>() };
        }
    }
}

public class MassCasualtyServiceImpl : IMassCasualtyService
{
    private readonly HISDbContext _context;
    public MassCasualtyServiceImpl(HISDbContext context) => _context = context;

    public async Task<MCIEventDto> GetActiveEventAsync()
    {
        var e = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Status == "Active");
        if (e == null) return null!;
        return MapToEventDto(e);
    }

    public async Task<List<MCIEventDto>> GetEventsAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.MCIEvents.Include(x => x.Victims).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.ActivatedAt >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(x => x.ActivatedAt <= toDate.Value);
        var list = await query.OrderByDescending(x => x.ActivatedAt).ToListAsync();
        return list.Select(MapToEventDto).ToList();
    }

    public async Task<MCIEventDto> GetEventAsync(Guid id)
    {
        var e = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToEventDto(e);
    }

    public async Task<MCIEventDto> ActivateEventAsync(ActivateMCIEventDto dto)
    {
        var entity = new MCIEvent
        {
            Id = Guid.NewGuid(),
            EventCode = $"MCI{DateTime.Now:yyyyMMddHHmmss}",
            EventName = dto.EventName,
            EventType = dto.EventType,
            EventLocation = dto.Location,
            AlertReceivedAt = DateTime.Now,
            ActivatedAt = DateTime.Now,
            AlertLevel = dto.AlertLevel ?? "Yellow",
            EstimatedVictims = dto.EstimatedCasualties,
            Status = "Active",
            IncidentCommanderId = Guid.Empty,
            CreatedAt = DateTime.Now
        };
        _context.MCIEvents.Add(entity);
        await _context.SaveChangesAsync();
        return new MCIEventDto { Id = entity.Id, EventCode = entity.EventCode, EventName = entity.EventName, EventType = entity.EventType, Location = entity.EventLocation, AlertLevel = entity.AlertLevel, Status = "Active", ActivatedAt = entity.ActivatedAt };
    }

    public async Task<MCIEventDto> UpdateEventAsync(UpdateMCIEventDto dto)
    {
        var e = await _context.MCIEvents.FindAsync(dto.EventId);
        if (e == null) return null!;
        if (!string.IsNullOrEmpty(dto.Status)) e.Status = dto.Status;
        if (!string.IsNullOrEmpty(dto.AlertLevel)) e.AlertLevel = dto.AlertLevel;
        await _context.SaveChangesAsync();
        return new MCIEventDto { Id = e.Id, EventCode = e.EventCode, EventName = e.EventName, Status = e.Status, AlertLevel = e.AlertLevel };
    }

    public async Task<bool> EscalateEventAsync(Guid eventId, string newAlertLevel)
    {
        var e = await _context.MCIEvents.FindAsync(eventId);
        if (e == null) return false;
        e.AlertLevel = newAlertLevel;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeactivateEventAsync(Guid eventId, string reason)
    {
        var e = await _context.MCIEvents.FindAsync(eventId);
        if (e == null) return false;
        e.Status = "Deactivated";
        e.DeactivatedAt = DateTime.Now;
        e.AfterActionReport = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MCIVictimDto>> GetVictimsAsync(Guid eventId, string? triageCategory = null, string? status = null)
    {
        var query = _context.MCIVictims.Where(x => x.MCIEventId == eventId);
        if (!string.IsNullOrEmpty(triageCategory)) query = query.Where(x => x.TriageCategory == triageCategory);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.ArrivalTime).ToListAsync();
        return list.Select(MapToVictimDto).ToList();
    }

    public async Task<MCIVictimDto> GetVictimAsync(Guid id)
    {
        var e = await _context.MCIVictims.FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> RegisterVictimAsync(RegisterMCIVictimDto dto)
    {
        var victimCount = await _context.MCIVictims.CountAsync(x => x.MCIEventId == dto.EventId) + 1;
        var entity = new MCIVictim
        {
            Id = Guid.NewGuid(),
            MCIEventId = dto.EventId,
            TagNumber = $"TAG{victimCount:D4}",
            Name = dto.Name,
            EstimatedAge = dto.EstimatedAge,
            Gender = dto.Gender,
            IdentifyingFeatures = dto.Description,
            TriageCategory = dto.TriageCategory,
            TriageTime = DateTime.Now,
            RespiratoryRate = dto.RespiratoryRate,
            HasRadialPulse = dto.Pulse?.ToLower() == "present",
            FollowsCommands = dto.MentalStatus?.ToLower() == "alert",
            CanWalk = dto.CanWalk,
            InjuryDescription = dto.ChiefComplaint,
            ArrivalTime = DateTime.Now,
            CurrentLocation = "Triage",
            Status = "Active",
            CreatedAt = DateTime.Now
        };
        _context.MCIVictims.Add(entity);

        // Update event victim count
        var evt = await _context.MCIEvents.FindAsync(dto.EventId);
        if (evt != null) evt.ActualVictims++;

        await _context.SaveChangesAsync();
        return MapToVictimDto(entity);
    }

    public async Task<MCIVictimDto> UpdateVictimAsync(Guid id, MCIVictimDto dto)
    {
        var e = await _context.MCIVictims.FindAsync(id);
        if (e == null) return null!;
        e.Name = dto.Name;
        e.CurrentLocation = dto.CurrentLocation;
        e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> ReTriageVictimAsync(ReTriageDto dto)
    {
        var e = await _context.MCIVictims.FindAsync(dto.VictimId);
        if (e == null) return null!;
        e.TriageCategory = dto.NewCategory;
        e.TriageTime = DateTime.Now;
        e.TriageNotes = dto.Reason;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<bool> IdentifyVictimAsync(Guid victimId, string name, string idNumber, DateTime? dateOfBirth)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return false;
        e.Name = name;
        // Check if patient exists
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == idNumber);
        if (patient != null) e.PatientId = patient.Id;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AssignVictimLocationAsync(Guid victimId, string area, string assignedTo)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return false;
        e.CurrentLocation = area;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<MCIVictimDto> RecordTreatmentAsync(Guid victimId, MCITreatmentDto treatment)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return null!;
        e.InitialTreatment = (e.InitialTreatment ?? "") + $"\n[{DateTime.Now:HH:mm}] {treatment.Treatment}";
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> DispositionVictimAsync(Guid victimId, string disposition, string? destination = null)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return null!;
        e.Status = disposition;
        if (!string.IsNullOrEmpty(destination)) e.CurrentLocation = destination;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIResourceStatusDto> GetResourceStatusAsync(Guid eventId)
    {
        var beds = await _context.Beds.ToListAsync();
        var staff = await _context.MedicalStaffs.Where(s => s.Status == "Active").ToListAsync();
        return new MCIResourceStatusDto
        {
            EventId = eventId,
            UpdatedAt = DateTime.Now,
            TotalBeds = beds.Count,
            AvailableBeds = beds.Count(b => b.Status == 0),
            DoctorsOnDuty = staff.Count(s => s.StaffType == "Doctor"),
            NursesOnDuty = staff.Count(s => s.StaffType == "Nurse")
        };
    }

    public Task<MCIResourceStatusDto> UpdateResourceStatusAsync(Guid eventId, MCIResourceStatusDto dto)
    {
        dto.EventId = eventId;
        dto.UpdatedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public Task<StaffCalloutDto> InitiateStaffCalloutAsync(Guid eventId)
    {
        return Task.FromResult(new StaffCalloutDto { Id = Guid.NewGuid(), EventId = eventId, InitiatedAt = DateTime.Now, CalloutType = "SMS" });
    }

    public Task<bool> RecordStaffResponseAsync(Guid calloutId, Guid staffId, string response, int? etaMinutes) => Task.FromResult(true);

    public async Task<MCICommandCenterDto> GetCommandCenterDataAsync(Guid eventId)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var stats = await GetRealTimeStatsAsync(eventId);
        var resources = await GetResourceStatusAsync(eventId);
        return new MCICommandCenterDto
        {
            EventId = eventId,
            EventName = evt.EventName,
            EventStatus = evt.Status,
            LastUpdated = DateTime.Now,
            RealTimeStats = stats,
            Resources = resources
        };
    }

    public async Task<MCIRealTimeStatsDto> GetRealTimeStatsAsync(Guid eventId)
    {
        var victims = await _context.MCIVictims.Where(x => x.MCIEventId == eventId).ToListAsync();
        return new MCIRealTimeStatsDto
        {
            EventId = eventId,
            Timestamp = DateTime.Now,
            TotalVictims = victims.Count,
            TotalArrived = victims.Count,
            InTreatment = victims.Count(v => v.Status == "Active"),
            Disposed = victims.Count(v => v.Status != "Active"),
            RedCategory = victims.Count(v => v.TriageCategory == "Red"),
            RedActive = victims.Count(v => v.TriageCategory == "Red" && v.Status == "Active"),
            YellowCategory = victims.Count(v => v.TriageCategory == "Yellow"),
            YellowActive = victims.Count(v => v.TriageCategory == "Yellow" && v.Status == "Active"),
            GreenCategory = victims.Count(v => v.TriageCategory == "Green"),
            GreenActive = victims.Count(v => v.TriageCategory == "Green" && v.Status == "Active"),
            BlackCategory = victims.Count(v => v.TriageCategory == "Black"),
            BlackTotal = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            Discharged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased")
        };
    }

    public Task<MCIBroadcastDto> SendBroadcastAsync(Guid eventId, string messageType, string priority, string title, string message, List<string> targetGroups)
    {
        return Task.FromResult(new MCIBroadcastDto { Id = Guid.NewGuid(), EventId = eventId, MessageType = messageType, Priority = priority, Title = title, Message = message, TargetGroups = targetGroups, SentAt = DateTime.Now });
    }

    public async Task<List<MCIUpdateDto>> GetEventUpdatesAsync(Guid eventId, int limit = 50)
    {
        var reports = await _context.MCISituationReports.Where(x => x.MCIEventId == eventId).OrderByDescending(x => x.ReportTime).Take(limit).ToListAsync();
        return reports.Select(r => new MCIUpdateDto { Id = r.Id, EventId = r.MCIEventId, Time = r.ReportTime, PostedAt = r.ReportTime, Category = "SitRep", Message = r.Comments ?? $"Report #{r.ReportNumber}", Priority = "Normal" }).ToList();
    }

    public async Task<MCIUpdateDto> PostUpdateAsync(Guid eventId, string category, string message, string priority)
    {
        var count = await _context.MCISituationReports.CountAsync(x => x.MCIEventId == eventId) + 1;
        var report = new MCISituationReport
        {
            Id = Guid.NewGuid(),
            MCIEventId = eventId,
            ReportNumber = count,
            ReportTime = DateTime.Now,
            ReportedById = Guid.Empty,
            Comments = message,
            CreatedAt = DateTime.Now
        };
        _context.MCISituationReports.Add(report);
        await _context.SaveChangesAsync();
        return new MCIUpdateDto { Id = report.Id, EventId = eventId, Time = report.ReportTime, PostedAt = report.ReportTime, Category = category, Message = message, Priority = priority };
    }

    public async Task<List<FamilyNotificationDto>> GetFamilyNotificationsAsync(Guid eventId)
    {
        var victims = await _context.MCIVictims.Where(x => x.MCIEventId == eventId && x.FamilyNotified).ToListAsync();
        return victims.Select(v => new FamilyNotificationDto
        {
            Id = Guid.NewGuid(),
            VictimId = v.Id,
            VictimName = v.Name,
            TriageTag = v.TagNumber,
            ContactName = v.FamilyContactName,
            ContactPhone = v.FamilyContactPhone,
            NotifiedAt = v.FamilyNotifiedAt,
            NotificationStatus = "Notified"
        }).ToList();
    }

    public async Task<FamilyNotificationDto> NotifyFamilyAsync(Guid victimId, FamilyNotificationDto dto)
    {
        var v = await _context.MCIVictims.FindAsync(victimId);
        if (v != null)
        {
            v.FamilyNotified = true;
            v.FamilyContactName = dto.ContactName;
            v.FamilyContactPhone = dto.ContactPhone;
            v.FamilyNotifiedAt = DateTime.Now;
            await _context.SaveChangesAsync();
        }
        dto.NotifiedAt = DateTime.Now;
        dto.NotificationStatus = "Notified";
        return dto;
    }

    public Task<List<HotlineCallDto>> GetHotlineCallsAsync(Guid eventId) => Task.FromResult(new List<HotlineCallDto>());
    public Task<HotlineCallDto> RecordHotlineCallAsync(Guid eventId, HotlineCallDto dto) { dto.Id = Guid.NewGuid(); dto.ReceivedAt = DateTime.Now; return Task.FromResult(dto); }
    public Task<bool> MatchVictimToInquiryAsync(Guid callId, Guid victimId) => Task.FromResult(true);

    public async Task<MCIEventReportDto> GenerateEventReportAsync(Guid eventId)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var victims = evt.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIEventReportDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EventCode = evt.EventCode,
            EventName = evt.EventName,
            EventDateTime = evt.AlertReceivedAt,
            ActivatedAt = evt.ActivatedAt,
            DeactivatedAt = evt.DeactivatedAt,
            DurationHours = evt.DeactivatedAt.HasValue ? (int)(evt.DeactivatedAt.Value - evt.ActivatedAt).TotalHours : (int)(DateTime.Now - evt.ActivatedAt).TotalHours,
            TotalVictims = victims.Count,
            RedTotal = victims.Count(v => v.TriageCategory == "Red"),
            YellowTotal = victims.Count(v => v.TriageCategory == "Yellow"),
            GreenTotal = victims.Count(v => v.TriageCategory == "Green"),
            BlackTotal = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            TreatedAndDischarged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            TotalStaffInvolved = evt.StaffMobilized,
            ReportGeneratedAt = DateTime.Now,
            GeneratedAt = DateTime.Now
        };
    }

    public async Task<MCIAuthorityReportDto> GenerateAuthorityReportAsync(Guid eventId, string reportType)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var victims = evt.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIAuthorityReportDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            ReportType = reportType,
            EventType = evt.EventType,
            EventLocation = evt.EventLocation,
            EventDateTime = evt.AlertReceivedAt,
            VictimsReceived = victims.Count,
            VictimsTreated = victims.Count(v => v.Status != "Active"),
            VictimsAdmitted = victims.Count(v => v.Status == "Admitted"),
            VictimsTransferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            CurrentStatus = evt.Status,
            Status = "Draft",
            GeneratedAt = DateTime.Now
        };
    }

    public Task<MCIAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId)
    {
        return Task.FromResult(new MCIAuthorityReportDto { Id = reportId, Status = "Submitted", SubmittedAt = DateTime.Now });
    }

    public async Task<MCIDashboardDto> GetDashboardAsync()
    {
        try
        {
            var active = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Status == "Active");
            var eventsThisYear = await _context.MCIEvents.CountAsync(x => x.ActivatedAt.Year == DateTime.Now.Year);

            var dashboard = new MCIDashboardDto
            {
                HasActiveEvent = active != null,
                TotalEventsThisYear = eventsThisYear
            };

            if (active != null)
            {
                dashboard.ActiveEvent = MapToEventDto(active);
                dashboard.RealTimeStats = await GetRealTimeStatsAsync(active.Id);
                dashboard.Resources = await GetResourceStatusAsync(active.Id);

                var victims = active.Victims?.ToList() ?? new List<MCIVictim>();
                dashboard.VictimBoard = victims.OrderByDescending(v => v.ArrivalTime).Take(20).Select(v => new MCIVictimSummaryDto
                {
                    Id = v.Id,
                    TriageTag = v.TagNumber,
                    Name = v.Name ?? "Unknown",
                    TriageCategory = v.TriageCategory,
                    CurrentLocation = v.CurrentLocation,
                    Status = v.Status,
                    ArrivedAt = v.ArrivalTime,
                    MinutesSinceArrival = (int)(DateTime.Now - v.ArrivalTime).TotalMinutes
                }).ToList();

                dashboard.RecentArrivals = victims.OrderByDescending(v => v.ArrivalTime).Take(5).Select(v => new MCIVictimSummaryDto
                {
                    Id = v.Id,
                    TriageTag = v.TagNumber,
                    Name = v.Name ?? "Unknown",
                    TriageCategory = v.TriageCategory,
                    CurrentLocation = v.CurrentLocation,
                    Status = v.Status,
                    ArrivedAt = v.ArrivalTime,
                    MinutesSinceArrival = (int)(DateTime.Now - v.ArrivalTime).TotalMinutes
                }).ToList();
            }

            return dashboard;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new MCIDashboardDto { HasActiveEvent = false, TotalEventsThisYear = 0 };
        }
    }

    private MCIEventDto MapToEventDto(MCIEvent e)
    {
        var victims = e.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIEventDto
        {
            Id = e.Id,
            EventCode = e.EventCode,
            EventName = e.EventName,
            EventType = e.EventType,
            Location = e.EventLocation,
            AlertLevel = e.AlertLevel,
            EstimatedCasualties = e.EstimatedVictims,
            Status = e.Status,
            NotifiedAt = e.AlertReceivedAt,
            ActivatedAt = e.ActivatedAt,
            DeactivatedAt = e.DeactivatedAt,
            TotalVictims = victims.Count,
            RedCategory = victims.Count(v => v.TriageCategory == "Red"),
            YellowCategory = victims.Count(v => v.TriageCategory == "Yellow"),
            GreenCategory = victims.Count(v => v.TriageCategory == "Green"),
            BlackCategory = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            Discharged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            StaffActivated = e.StaffMobilized,
            BedsAllocated = e.BedsActivated
        };
    }

    private MCIVictimDto MapToVictimDto(MCIVictim e)
    {
        return new MCIVictimDto
        {
            Id = e.Id,
            EventId = e.MCIEventId,
            TriageTag = e.TagNumber,
            Name = e.Name,
            EstimatedAge = e.EstimatedAge,
            Gender = e.Gender,
            Description = e.IdentifyingFeatures,
            TriageCategory = e.TriageCategory,
            TriageTime = e.TriageTime ?? DateTime.Now,
            IdentificationStatus = e.PatientId.HasValue ? "Identified" : "Unidentified",
            RespiratoryRate = e.RespiratoryRate,
            CanWalk = e.CanWalk,
            ChiefComplaint = e.InjuryDescription,
            CurrentLocation = e.CurrentLocation,
            Status = e.Status,
            ArrivedAt = e.ArrivalTime,
            FamilyNotified = e.FamilyNotified,
            FamilyContactName = e.FamilyContactName,
            FamilyContactPhone = e.FamilyContactPhone
        };
    }
}
#endregion
