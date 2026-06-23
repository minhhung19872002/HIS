using HIS.Application.DTOs.Telemedicine;
using HIS.Application.Services;
using HIS.Core.Common;
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
            Id = Guid.NewGuid(), AppointmentCode = CodeGenerator.Timestamp("TELE"),
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
            Id = Guid.NewGuid(), AppointmentId = dto.AppointmentId, SessionCode = CodeGenerator.Timestamp("SES"),
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
            Id = Guid.NewGuid(), SessionId = sessionId, PrescriptionCode = CodeGenerator.Timestamp("RX"),
            Status = "Draft", Note = note, PrescriptionDate = DateTime.Now, CreatedAt = DateTime.Now
        };
        _context.TelePrescriptions.Add(entity);
        // F8: persist chi tiết đơn (trước đây items bị bỏ → không có gì để chuyển sang quầy phát).
        foreach (var it in items ?? new List<TelePrescriptionItemDto>())
        {
            _context.Set<TelePrescriptionItem>().Add(new TelePrescriptionItem
            {
                Id = Guid.NewGuid(), PrescriptionId = entity.Id,
                MedicineId = it.DrugId, MedicineName = it.DrugName ?? "",
                Quantity = it.Quantity, Unit = it.Unit ?? "",
                Dosage = it.Dosage, Frequency = it.Frequency,
                DurationDays = it.DurationDays, Instructions = it.Instructions,
                CreatedAt = DateTime.Now,
            });
        }
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

    // F8 (audit FLOW-FINAL 2026-06-06): gửi đơn tele sang quầy phát THẬT — tạo Prescription + Detail
    // (Status=0 → quầy phát thấy đơn chờ), thay vì chỉ đổi status đơn tele (đơn không bao giờ tới quầy).
    public async Task<bool> SendPrescriptionToPharmacyAsync(SendPrescriptionToPharmacyDto dto)
    {
        var e = await _context.TelePrescriptions
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == dto.PrescriptionId);
        if (e == null) return false;

        var rxCode = $"TELE-{e.Id:N}";
        // Idempotent: chưa có đơn phát thật tương ứng → tạo.
        if (!await _context.Prescriptions.AnyAsync(p => p.PrescriptionCode == rxCode))
        {
            var session = await _context.TeleSessions.Include(s => s.Appointment)
                .FirstOrDefaultAsync(s => s.Id == e.SessionId);
            var appt = session?.Appointment;
            if (appt != null)
            {
                var mr = await _context.MedicalRecords
                    .Where(m => m.PatientId == appt.PatientId && !m.IsDeleted)
                    .OrderByDescending(m => m.AdmissionDate)
                    .Select(m => new { m.Id, m.DepartmentId })
                    .FirstOrDefaultAsync();

                Guid? deptId = appt.SpecialityId ?? mr?.DepartmentId;
                if (deptId == null || deptId == Guid.Empty)
                    deptId = (await _context.Departments.FirstOrDefaultAsync(d => !d.IsDeleted))?.Id;

                Guid doctorId = appt.DoctorId;
                if (doctorId == Guid.Empty || !await _context.Users.AnyAsync(u => u.Id == doctorId))
                    doctorId = await _context.Users.Where(u => !u.IsDeleted).Select(u => u.Id).FirstOrDefaultAsync();

                if (mr != null && mr.Id != Guid.Empty && deptId != null && deptId != Guid.Empty && doctorId != Guid.Empty)
                {
                    var by = doctorId.ToString();
                    var rx = new Prescription
                    {
                        Id = Guid.NewGuid(),
                        PrescriptionCode = rxCode,
                        PrescriptionDate = DateTime.Now,
                        MedicalRecordId = mr.Id,
                        DoctorId = doctorId,
                        DepartmentId = deptId.Value,
                        PrescriptionType = 1, // Ngoại trú (tele)
                        PaymentCategory = 2,  // Thu phí
                        Status = 0,           // Chờ duyệt/phát → quầy phát thấy
                        Note = e.Note,
                        CreatedAt = DateTime.Now,
                        CreatedBy = by,
                        Details = new List<PrescriptionDetail>(),
                    };
                    decimal total = 0;
                    foreach (var it in e.Items ?? new List<TelePrescriptionItem>())
                    {
                        var med = await _context.Medicines.FindAsync(it.MedicineId);
                        var price = med?.UnitPrice ?? 0;
                        var amount = price * it.Quantity;
                        total += amount;
                        rx.Details.Add(new PrescriptionDetail
                        {
                            Id = Guid.NewGuid(), PrescriptionId = rx.Id,
                            MedicineId = it.MedicineId, Quantity = it.Quantity,
                            Unit = string.IsNullOrEmpty(it.Unit) ? med?.Unit : it.Unit,
                            UnitPrice = price, Amount = amount, TotalPrice = amount, PatientAmount = amount,
                            PatientType = 2,
                            Dosage = it.Dosage, Frequency = it.Frequency, Days = it.DurationDays ?? 0,
                            UsageInstructions = it.Instructions,
                            Status = 0,
                            CreatedAt = DateTime.Now, CreatedBy = by,
                        });
                    }
                    rx.TotalAmount = total; rx.PatientAmount = total;
                    _context.Prescriptions.Add(rx);
                }
            }
        }

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
        // TeleSession.StartTime ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (sessFromUtc, sessToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(d);
        try
        {
            return new TelemedicineDashboardDto
            {
                Date = d,
                TodayAppointments = await _context.TeleAppointments.CountAsync(x => x.AppointmentDate.Date == d.Date),
                TodayCompleted = await _context.TeleSessions.CountAsync(x => x.StartTime.HasValue && x.StartTime.Value >= sessFromUtc && x.StartTime.Value < sessToUtc && x.Status == "Completed"),
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
