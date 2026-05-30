using HIS.Application.DTOs.Telemedicine;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

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
