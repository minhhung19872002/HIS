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
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HIS.Infrastructure.Services;

#region Luồng 11: Telemedicine Service Implementation

public class TelemedicineServiceImpl : ITelemedicineService
{
    private readonly HISDbContext _context;

    public TelemedicineServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<TeleAppointmentDto>> GetAppointmentsAsync(DateTime? date, Guid? doctorId, string? status)
    {
        var query = _context.TeleAppointments.AsQueryable();

        if (date.HasValue)
            query = query.Where(a => a.AppointmentDate.Date == date.Value.Date);
        if (doctorId.HasValue)
            query = query.Where(a => a.DoctorId == doctorId);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        return await query.Select(a => new TeleAppointmentDto
        {
            Id = a.Id,
            AppointmentCode = a.AppointmentCode,
            PatientId = a.PatientId,
            PatientName = a.Patient != null ? a.Patient.FullName : "",
            PatientPhone = a.Patient != null ? a.Patient.Phone ?? "" : "",
            DoctorId = a.DoctorId,
            DoctorName = a.Doctor != null ? a.Doctor.FullName : "",
            SpecialityId = a.SpecialityId ?? Guid.Empty,
            SpecialityName = a.Speciality != null ? a.Speciality.Name : "",
            AppointmentDate = a.AppointmentDate,
            StartTime = a.StartTime,
            EndTime = a.EndTime ?? TimeSpan.Zero,
            Status = a.Status,
            ChiefComplaint = a.ChiefComplaint ?? "",
            CreatedAt = a.CreatedAt
        }).ToListAsync();
    }

    public async Task<TeleAppointmentDto?> GetAppointmentByIdAsync(Guid id)
    {
        var a = await _context.TeleAppointments
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Speciality)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (a == null) return null;

        return new TeleAppointmentDto
        {
            Id = a.Id,
            AppointmentCode = a.AppointmentCode,
            PatientId = a.PatientId,
            PatientName = a.Patient?.FullName ?? "",
            PatientPhone = a.Patient?.Phone ?? "",
            DoctorId = a.DoctorId,
            DoctorName = a.Doctor?.FullName ?? "",
            SpecialityId = a.SpecialityId ?? Guid.Empty,
            SpecialityName = a.Speciality?.Name ?? "",
            AppointmentDate = a.AppointmentDate,
            StartTime = a.StartTime,
            EndTime = a.EndTime ?? TimeSpan.Zero,
            Status = a.Status,
            ChiefComplaint = a.ChiefComplaint ?? "",
            CreatedAt = a.CreatedAt
        };
    }

    public async Task<TeleAppointmentDto> CreateAppointmentAsync(CreateTeleAppointmentDto dto)
    {
        var appointment = new TeleAppointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = $"TELE-{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            SpecialityId = dto.SpecialityId,
            AppointmentDate = dto.AppointmentDate,
            StartTime = dto.StartTime,
            DurationMinutes = 15,
            Status = "Pending",
            ChiefComplaint = dto.ChiefComplaint,
            CreatedAt = DateTime.UtcNow
        };

        _context.TeleAppointments.Add(appointment);
        await _context.SaveChangesAsync();

        return await GetAppointmentByIdAsync(appointment.Id) ?? new TeleAppointmentDto();
    }

    public async Task<TeleAppointmentDto> ConfirmAppointmentAsync(Guid id)
    {
        var appointment = await _context.TeleAppointments.FindAsync(id);
        if (appointment != null)
        {
            appointment.Status = "Confirmed";
            appointment.ConfirmedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetAppointmentByIdAsync(id) ?? new TeleAppointmentDto();
    }

    public async Task<TeleAppointmentDto> CancelAppointmentAsync(Guid id, string reason)
    {
        var appointment = await _context.TeleAppointments.FindAsync(id);
        if (appointment != null)
        {
            appointment.Status = "Cancelled";
            appointment.CancellationReason = reason;
            await _context.SaveChangesAsync();
        }
        return await GetAppointmentByIdAsync(id) ?? new TeleAppointmentDto();
    }

    public async Task<List<DoctorAvailableSlotDto>> GetDoctorSlotsAsync(Guid doctorId, DateTime fromDate, DateTime toDate)
    {
        var slots = new List<DoctorAvailableSlotDto>();
        var doctor = await _context.Users.FindAsync(doctorId);
        if (doctor == null) return slots;

        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            if (date.DayOfWeek == DayOfWeek.Sunday) continue;

            var existingAppointments = await _context.TeleAppointments
                .Where(a => a.DoctorId == doctorId && a.AppointmentDate.Date == date.Date && a.Status != "Cancelled")
                .Select(a => a.StartTime)
                .ToListAsync();

            var availableSlots = new List<TimeSlotDto>();
            for (int hour = 8; hour < 17; hour++)
            {
                if (hour == 12) continue;
                var slotTime = new TimeSpan(hour, 0, 0);
                availableSlots.Add(new TimeSlotDto
                {
                    StartTime = slotTime,
                    EndTime = slotTime.Add(TimeSpan.FromMinutes(30)),
                    IsAvailable = !existingAppointments.Contains(slotTime)
                });
            }

            slots.Add(new DoctorAvailableSlotDto
            {
                DoctorId = doctorId,
                DoctorName = doctor.FullName,
                Date = date,
                AvailableSlots = availableSlots
            });
        }
        return slots;
    }

    public async Task<TeleSessionDto> StartVideoCallAsync(StartVideoCallDto dto)
    {
        var appointment = await _context.TeleAppointments.FindAsync(dto.AppointmentId);
        if (appointment == null) return new TeleSessionDto();

        var session = new TeleSession
        {
            Id = Guid.NewGuid(),
            SessionCode = $"SESSION-{DateTime.Now:yyyyMMddHHmmss}",
            AppointmentId = dto.AppointmentId,
            RoomId = Guid.NewGuid().ToString(),
            Status = "InProgress",
            StartTime = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.TeleSessions.Add(session);
        appointment.Status = "InProgress";
        await _context.SaveChangesAsync();

        return new TeleSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            AppointmentId = session.AppointmentId,
            RoomId = session.RoomId,
            Status = session.Status,
            StartTime = session.StartTime,
            DoctorJoinUrl = $"/tele/room/{session.RoomId}?role=doctor",
            PatientJoinUrl = $"/tele/room/{session.RoomId}?role=patient"
        };
    }

    public async Task<TeleSessionDto> EndVideoCallAsync(Guid sessionId)
    {
        var session = await _context.TeleSessions.Include(s => s.Appointment).FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session != null)
        {
            session.Status = "Completed";
            session.EndTime = DateTime.UtcNow;
            session.DurationMinutes = (int)(DateTime.UtcNow - (session.StartTime ?? DateTime.UtcNow)).TotalMinutes;

            if (session.Appointment != null)
                session.Appointment.Status = "Completed";

            await _context.SaveChangesAsync();
        }
        return await GetSessionByIdAsync(sessionId) ?? new TeleSessionDto();
    }

    public async Task<TeleSessionDto?> GetSessionByIdAsync(Guid sessionId)
    {
        var s = await _context.TeleSessions.FirstOrDefaultAsync(x => x.Id == sessionId);
        if (s == null) return null;

        return new TeleSessionDto
        {
            Id = s.Id,
            SessionCode = s.SessionCode,
            AppointmentId = s.AppointmentId,
            RoomId = s.RoomId,
            Status = s.Status,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            DurationMinutes = s.DurationMinutes,
            RecordingUrl = s.RecordingUrl,
            IsRecorded = s.IsRecorded
        };
    }

    public async Task<WaitingRoomDto> GetWaitingRoomStatusAsync(Guid sessionId)
    {
        var session = await _context.TeleSessions
            .Include(s => s.Appointment)
            .ThenInclude(a => a!.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        return new WaitingRoomDto
        {
            SessionId = sessionId,
            QueuePosition = 1,
            EstimatedWaitMinutes = 5,
            DoctorOnline = session?.Appointment?.Doctor != null,
            Message = session?.Status == "Waiting" ? "Please wait for the doctor to join" : "Ready"
        };
    }

    public async Task<TeleConsultationRecordDto> SaveConsultationAsync(SaveTeleConsultationDto dto)
    {
        var existing = dto.Id.HasValue ? await _context.TeleConsultations.FindAsync(dto.Id.Value) : null;

        if (existing != null)
        {
            existing.Symptoms = dto.ChiefComplaint;
            existing.Diagnosis = dto.PrimaryDiagnosis;
            existing.IcdCode = dto.PrimaryDiagnosisICD;
            existing.TreatmentPlan = dto.Plan;
            existing.RequiresFollowUp = dto.FollowUpDate.HasValue;
            existing.FollowUpDate = dto.FollowUpDate;
            existing.RequiresInPerson = dto.RequiresInPersonVisit;
            existing.InPersonReason = dto.InPersonVisitReason;
        }
        else
        {
            var consultation = new TeleConsultation
            {
                Id = Guid.NewGuid(),
                SessionId = dto.SessionId,
                Symptoms = dto.ChiefComplaint,
                Diagnosis = dto.PrimaryDiagnosis,
                IcdCode = dto.PrimaryDiagnosisICD,
                TreatmentPlan = dto.Plan,
                RequiresFollowUp = dto.FollowUpDate.HasValue,
                FollowUpDate = dto.FollowUpDate,
                RequiresInPerson = dto.RequiresInPersonVisit,
                InPersonReason = dto.InPersonVisitReason,
                CreatedAt = DateTime.UtcNow
            };
            _context.TeleConsultations.Add(consultation);
        }

        await _context.SaveChangesAsync();

        return new TeleConsultationRecordDto
        {
            SessionId = dto.SessionId,
            ChiefComplaint = dto.ChiefComplaint ?? "",
            Assessment = dto.Assessment ?? "",
            PrimaryDiagnosis = dto.PrimaryDiagnosis ?? "",
            PrimaryDiagnosisICD = dto.PrimaryDiagnosisICD ?? "",
            Plan = dto.Plan ?? "",
            RequiresInPersonVisit = dto.RequiresInPersonVisit,
            FollowUpDate = dto.FollowUpDate
        };
    }

    public async Task<TeleConsultationRecordDto?> GetConsultationBySessionAsync(Guid sessionId)
    {
        var c = await _context.TeleConsultations
            .Include(x => x.Session)
            .ThenInclude(s => s!.Appointment)
            .ThenInclude(a => a!.Patient)
            .FirstOrDefaultAsync(x => x.SessionId == sessionId);

        if (c == null) return null;

        return new TeleConsultationRecordDto
        {
            Id = c.Id,
            SessionId = c.SessionId,
            PatientId = c.Session?.Appointment?.PatientId ?? Guid.Empty,
            PatientName = c.Session?.Appointment?.Patient?.FullName ?? "",
            ChiefComplaint = c.Symptoms ?? "",
            PrimaryDiagnosis = c.Diagnosis ?? "",
            PrimaryDiagnosisICD = c.IcdCode ?? "",
            Plan = c.TreatmentPlan ?? "",
            RequiresInPersonVisit = c.RequiresInPerson,
            FollowUpDate = c.FollowUpDate,
            CreatedAt = c.CreatedAt
        };
    }

    public async Task<TelePrescriptionDto> CreatePrescriptionAsync(Guid sessionId, List<TelePrescriptionItemDto> items)
    {
        var session = await _context.TeleSessions
            .Include(s => s.Appointment)
            .ThenInclude(a => a!.Patient)
            .Include(s => s.Appointment)
            .ThenInclude(a => a!.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return new TelePrescriptionDto();

        var prescription = new TelePrescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = $"TELE-RX-{DateTime.Now:yyyyMMddHHmmss}",
            SessionId = sessionId,
            PrescriptionDate = DateTime.UtcNow,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            Items = items.Select((item, index) => new TelePrescriptionItem
            {
                Id = Guid.NewGuid(),
                MedicineId = item.DrugId,
                MedicineName = item.DrugName,
                Quantity = item.Quantity,
                Unit = item.Unit,
                Dosage = item.Dosage,
                Frequency = item.Frequency,
                DurationDays = item.DurationDays,
                Instructions = item.Instructions,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        _context.TelePrescriptions.Add(prescription);
        await _context.SaveChangesAsync();

        return new TelePrescriptionDto
        {
            Id = prescription.Id,
            PrescriptionCode = prescription.PrescriptionCode,
            SessionId = sessionId,
            PatientId = session.Appointment?.PatientId ?? Guid.Empty,
            PatientName = session.Appointment?.Patient?.FullName ?? "",
            DoctorId = session.Appointment?.DoctorId ?? Guid.Empty,
            DoctorName = session.Appointment?.Doctor?.FullName ?? "",
            PrescriptionDate = prescription.PrescriptionDate,
            Status = prescription.Status,
            Items = items
        };
    }

    public async Task<TelePrescriptionDto> SignPrescriptionAsync(Guid prescriptionId, string signature)
    {
        var prescription = await _context.TelePrescriptions.FindAsync(prescriptionId);
        if (prescription != null)
        {
            prescription.Status = "Signed";
            prescription.DigitalSignature = signature;
            prescription.SignedAt = DateTime.UtcNow;
            prescription.QRCode = $"QR-{prescriptionId}";
            await _context.SaveChangesAsync();
        }
        return await GetPrescriptionByIdAsync(prescriptionId) ?? new TelePrescriptionDto();
    }

    public async Task<TelePrescriptionDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var p = await _context.TelePrescriptions
            .Include(x => x.Items)
            .Include(x => x.Session)
            .ThenInclude(s => s!.Appointment)
            .ThenInclude(a => a!.Patient)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p == null) return null;

        return new TelePrescriptionDto
        {
            Id = p.Id,
            PrescriptionCode = p.PrescriptionCode,
            SessionId = p.SessionId,
            PatientId = p.Session?.Appointment?.PatientId ?? Guid.Empty,
            PatientName = p.Session?.Appointment?.Patient?.FullName ?? "",
            PrescriptionDate = p.PrescriptionDate,
            Status = p.Status,
            DigitalSignature = p.DigitalSignature ?? "",
            QRCode = p.QRCode ?? "",
            Items = p.Items?.Select(i => new TelePrescriptionItemDto
            {
                DrugId = i.MedicineId,
                DrugName = i.MedicineName,
                Quantity = i.Quantity,
                Unit = i.Unit,
                Dosage = i.Dosage ?? "",
                Frequency = i.Frequency ?? "",
                DurationDays = i.DurationDays ?? 0,
                Instructions = i.Instructions ?? ""
            }).ToList() ?? new List<TelePrescriptionItemDto>()
        };
    }

    public async Task<TelePrescriptionDto> SendToPharmacyAsync(SendPrescriptionToPharmacyDto dto)
    {
        var prescription = await _context.TelePrescriptions.FindAsync(dto.PrescriptionId);
        if (prescription != null)
        {
            prescription.Status = "SentToPharmacy";
            prescription.SentToPharmacyId = dto.PharmacyId;
            prescription.SentToPharmacyAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetPrescriptionByIdAsync(dto.PrescriptionId) ?? new TelePrescriptionDto();
    }

    public async Task<TeleFeedbackDto> SubmitFeedbackAsync(SubmitTeleFeedbackDto dto)
    {
        var session = await _context.TeleSessions
            .Include(s => s.Appointment)
            .FirstOrDefaultAsync(s => s.Id == dto.SessionId);

        var feedback = new TeleFeedback
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            PatientId = session?.Appointment?.PatientId ?? Guid.Empty,
            OverallRating = dto.OverallRating,
            DoctorRating = dto.DoctorRating,
            VideoQualityRating = dto.TechnicalRating,
            Comments = dto.Comments,
            WouldRecommend = dto.WouldRecommend,
            CreatedAt = DateTime.UtcNow
        };

        _context.TeleFeedbacks.Add(feedback);
        await _context.SaveChangesAsync();

        return new TeleFeedbackDto
        {
            Id = feedback.Id,
            SessionId = feedback.SessionId,
            PatientId = feedback.PatientId,
            OverallRating = feedback.OverallRating,
            DoctorRating = feedback.DoctorRating ?? 0,
            TechnicalRating = feedback.VideoQualityRating ?? 0,
            Comments = feedback.Comments ?? "",
            WouldRecommend = feedback.WouldRecommend,
            SubmittedAt = feedback.CreatedAt
        };
    }

    public async Task<TelemedicineDashboardDto> GetDashboardAsync(DateTime? date)
    {
        var targetDate = date ?? DateTime.Today;
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);

        var todayAppointments = await _context.TeleAppointments
            .Where(a => a.AppointmentDate.Date == targetDate.Date)
            .ToListAsync();

        var monthAppointments = await _context.TeleAppointments
            .Where(a => a.AppointmentDate >= monthStart && a.AppointmentDate < monthStart.AddMonths(1))
            .ToListAsync();

        return new TelemedicineDashboardDto
        {
            Date = targetDate,
            TodayAppointments = todayAppointments.Count,
            TodayCompleted = todayAppointments.Count(a => a.Status == "Completed"),
            TodayCancelled = todayAppointments.Count(a => a.Status == "Cancelled"),
            CurrentWaitingPatients = await _context.TeleSessions.CountAsync(s => s.Status == "Waiting"),
            CurrentActiveSessions = await _context.TeleSessions.CountAsync(s => s.Status == "InProgress"),
            MonthAppointments = monthAppointments.Count,
            MonthCompleted = monthAppointments.Count(a => a.Status == "Completed")
        };
    }
}

#endregion

#region Luồng 12: Clinical Nutrition Service Implementation

public class ClinicalNutritionServiceImpl : IClinicalNutritionService
{
    private readonly HISDbContext _context;

    public ClinicalNutritionServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<NutritionScreeningDto>> GetScreeningsAsync(DateTime? date, string? riskLevel, Guid? departmentId)
    {
        var query = _context.NutritionScreenings
            .Include(s => s.Patient)
            .Include(s => s.Admission)
            .Include(s => s.ScreenedBy)
            .AsQueryable();

        if (date.HasValue)
            query = query.Where(s => s.ScreeningDate.Date == date.Value.Date);
        if (!string.IsNullOrEmpty(riskLevel))
            query = query.Where(s => s.RiskLevel == riskLevel);

        return await query.Select(s => new NutritionScreeningDto
        {
            Id = s.Id,
            AdmissionId = s.AdmissionId,
            PatientId = s.PatientId,
            PatientName = s.Patient != null ? s.Patient.FullName : "",
            PatientCode = s.Patient != null ? s.Patient.PatientCode : "",
            Weight = s.Weight,
            Height = s.Height,
            BMI = s.BMI,
            WeightLossPercent = s.WeightLossPercent,
            NutritionScore = s.NutritionScore,
            DiseaseScore = s.DiseaseScore,
            AgeScore = s.AgeScore,
            TotalScore = s.TotalScore,
            SGACategory = s.SGACategory,
            RiskLevel = s.RiskLevel,
            RequiresIntervention = s.RequiresIntervention,
            ScreeningDate = s.ScreeningDate,
            ScreenedBy = s.ScreenedBy != null ? s.ScreenedBy.FullName : ""
        }).ToListAsync();
    }

    public async Task<NutritionScreeningDto?> GetScreeningByIdAsync(Guid id)
    {
        var s = await _context.NutritionScreenings
            .Include(x => x.Patient)
            .Include(x => x.ScreenedBy)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (s == null) return null;

        return new NutritionScreeningDto
        {
            Id = s.Id,
            AdmissionId = s.AdmissionId,
            PatientId = s.PatientId,
            PatientName = s.Patient?.FullName ?? "",
            PatientCode = s.Patient?.PatientCode ?? "",
            Weight = s.Weight,
            Height = s.Height,
            BMI = s.BMI,
            WeightLossPercent = s.WeightLossPercent,
            NutritionScore = s.NutritionScore,
            DiseaseScore = s.DiseaseScore,
            AgeScore = s.AgeScore,
            TotalScore = s.TotalScore,
            SGACategory = s.SGACategory,
            RiskLevel = s.RiskLevel,
            RequiresIntervention = s.RequiresIntervention,
            ScreeningDate = s.ScreeningDate,
            ScreenedBy = s.ScreenedBy?.FullName ?? ""
        };
    }

    public async Task<NutritionScreeningDto> PerformScreeningAsync(PerformNutritionScreeningDto dto, Guid screenedById)
    {
        var admission = await _context.Admissions.FindAsync(dto.AdmissionId);
        var patientId = admission?.PatientId ?? Guid.Empty;

        var bmi = dto.Height > 0 ? dto.Weight / ((dto.Height / 100) * (dto.Height / 100)) : 0;
        var totalScore = dto.NutritionScore + dto.DiseaseScore;
        var riskLevel = totalScore >= 3 ? "High" : totalScore >= 2 ? "Medium" : "Low";

        var screening = new NutritionScreening
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            PatientId = patientId,
            ScreeningDate = DateTime.UtcNow,
            ScreenedById = screenedById,
            Weight = dto.Weight,
            Height = dto.Height,
            BMI = bmi,
            WeightLossPercent = dto.WeightLoss6Months,
            NutritionScore = dto.NutritionScore,
            DiseaseScore = dto.DiseaseScore,
            AgeScore = 0,
            TotalScore = totalScore,
            SGACategory = dto.SGACategory,
            RiskLevel = riskLevel,
            RequiresIntervention = totalScore >= 3,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.NutritionScreenings.Add(screening);
        await _context.SaveChangesAsync();

        return await GetScreeningByIdAsync(screening.Id) ?? new NutritionScreeningDto();
    }

    public async Task<NutritionAssessmentDto?> GetAssessmentByScreeningAsync(Guid screeningId)
    {
        var a = await _context.NutritionAssessments
            .Include(x => x.Screening)
            .ThenInclude(s => s!.Patient)
            .Include(x => x.AssessedBy)
            .FirstOrDefaultAsync(x => x.ScreeningId == screeningId);

        if (a == null) return null;

        return new NutritionAssessmentDto
        {
            Id = a.Id,
            ScreeningId = a.ScreeningId,
            PatientId = a.Screening?.PatientId ?? Guid.Empty,
            PatientName = a.Screening?.Patient?.FullName ?? "",
            Weight = a.Screening?.Weight ?? 0,
            Height = a.Screening?.Height ?? 0,
            BMI = a.Screening?.BMI ?? 0,
            Albumin = a.Albumin,
            Prealbumin = a.Prealbumin,
            TotalEnergyRequirement = a.EnergyRequirement,
            ProteinRequirement = a.ProteinRequirement,
            FluidRequirement = a.FluidRequirement,
            ActivityFactor = a.ActivityFactor,
            StressFactor = a.StressFactor,
            Goals = a.NutritionGoals ?? "",
            AssessmentDate = a.AssessmentDate,
            AssessedBy = a.AssessedBy?.FullName ?? ""
        };
    }

    public async Task<NutritionAssessmentDto> SaveAssessmentAsync(SaveNutritionAssessmentDto dto, Guid assessedById)
    {
        var existing = dto.Id.HasValue ? await _context.NutritionAssessments.FindAsync(dto.Id.Value) : null;

        if (existing != null)
        {
            existing.Albumin = dto.Albumin;
            existing.Prealbumin = dto.Prealbumin;
            existing.ActivityFactor = dto.ActivityFactor;
            existing.StressFactor = dto.StressFactor;
            existing.NutritionGoals = dto.Goals;
        }
        else
        {
            var assessment = new NutritionAssessment
            {
                Id = Guid.NewGuid(),
                ScreeningId = dto.ScreeningId,
                AssessmentDate = DateTime.UtcNow,
                AssessedById = assessedById,
                Albumin = dto.Albumin,
                Prealbumin = dto.Prealbumin,
                ActivityFactor = dto.ActivityFactor,
                StressFactor = dto.StressFactor,
                EnergyRequirement = 0,
                ProteinRequirement = 0,
                FluidRequirement = 0,
                NutritionGoals = dto.Goals,
                CreatedAt = DateTime.UtcNow
            };
            _context.NutritionAssessments.Add(assessment);
        }

        await _context.SaveChangesAsync();

        return await GetAssessmentByScreeningAsync(dto.ScreeningId) ?? new NutritionAssessmentDto();
    }

    public async Task<List<DietOrderDto>> GetDietOrdersAsync(Guid? admissionId, string? status)
    {
        var query = _context.DietOrders
            .Include(d => d.Patient)
            .Include(d => d.DietType)
            .Include(d => d.OrderedBy)
            .AsQueryable();

        if (admissionId.HasValue)
            query = query.Where(d => d.AdmissionId == admissionId);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(d => d.Status == status);

        return await query.Select(d => new DietOrderDto
        {
            Id = d.Id,
            OrderCode = d.OrderCode,
            AdmissionId = d.AdmissionId,
            PatientId = d.PatientId,
            PatientName = d.Patient != null ? d.Patient.FullName : "",
            DietTypeId = d.DietTypeId,
            DietTypeName = d.DietType != null ? d.DietType.Name : "",
            Texture = d.TextureModification ?? "",
            SpecialInstructions = d.SpecialInstructions ?? "",
            Status = d.Status,
            StartDate = d.StartDate,
            EndDate = d.EndDate,
            OrderedBy = d.OrderedBy != null ? d.OrderedBy.FullName : "",
            OrderedAt = d.CreatedAt
        }).ToListAsync();
    }

    public async Task<DietOrderDto?> GetDietOrderByIdAsync(Guid id)
    {
        var d = await _context.DietOrders
            .Include(x => x.Patient)
            .Include(x => x.DietType)
            .Include(x => x.OrderedBy)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (d == null) return null;

        return new DietOrderDto
        {
            Id = d.Id,
            OrderCode = d.OrderCode,
            AdmissionId = d.AdmissionId,
            PatientId = d.PatientId,
            PatientName = d.Patient?.FullName ?? "",
            DietTypeId = d.DietTypeId,
            DietTypeName = d.DietType?.Name ?? "",
            Texture = d.TextureModification ?? "",
            SpecialInstructions = d.SpecialInstructions ?? "",
            Status = d.Status,
            StartDate = d.StartDate,
            EndDate = d.EndDate,
            OrderedBy = d.OrderedBy?.FullName ?? "",
            OrderedAt = d.CreatedAt
        };
    }

    public async Task<DietOrderDto> CreateDietOrderAsync(CreateDietOrderDto dto, Guid orderedById)
    {
        var admission = await _context.Admissions.FindAsync(dto.AdmissionId);

        var order = new DietOrder
        {
            Id = Guid.NewGuid(),
            OrderCode = $"DIET-{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = dto.AdmissionId,
            PatientId = admission?.PatientId ?? Guid.Empty,
            DietTypeId = dto.DietTypeId,
            OrderedById = orderedById,
            StartDate = dto.StartDate,
            Status = "Active",
            TextureModification = dto.Texture,
            Allergies = dto.Allergies != null ? string.Join(",", dto.Allergies) : null,
            FoodPreferences = dto.Dislikes != null ? string.Join(",", dto.Dislikes) : null,
            SpecialInstructions = dto.SpecialInstructions,
            TargetCalories = dto.CalorieLevel,
            TargetProtein = dto.ProteinLevel,
            CreatedAt = DateTime.UtcNow
        };

        _context.DietOrders.Add(order);
        await _context.SaveChangesAsync();

        return await GetDietOrderByIdAsync(order.Id) ?? new DietOrderDto();
    }

    public async Task<DietOrderDto> DiscontinueDietOrderAsync(Guid id, string reason)
    {
        var order = await _context.DietOrders.FindAsync(id);
        if (order != null)
        {
            order.Status = "Discontinued";
            order.DiscontinuationReason = reason;
            order.EndDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetDietOrderByIdAsync(id) ?? new DietOrderDto();
    }

    public async Task<List<DietTypeDto>> GetDietTypesAsync()
    {
        return await _context.DietTypes
            .Where(t => t.IsActive)
            .Select(t => new DietTypeDto
            {
                Id = t.Id,
                Code = t.Code,
                Name = t.Name,
                Category = t.Category,
                Description = t.Description ?? "",
                DefaultCalories = t.BaseCalories,
                IsActive = t.IsActive
            }).ToListAsync();
    }

    public async Task<List<MealPlanDto>> GetMealPlansAsync(DateTime date, Guid? departmentId)
    {
        var query = _context.MealPlans
            .Include(m => m.Department)
            .Where(m => m.Date.Date == date.Date);

        if (departmentId.HasValue)
            query = query.Where(m => m.DepartmentId == departmentId);

        return await query.Select(m => new MealPlanDto
        {
            Id = m.Id,
            Date = m.Date,
            MealType = m.MealType,
            DepartmentName = m.Department != null ? m.Department.Name : "",
            TotalPatients = m.TotalPatients,
            Status = m.Status
        }).ToListAsync();
    }

    public async Task<MealPlanDto?> GetMealPlanByIdAsync(Guid id)
    {
        var m = await _context.MealPlans
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (m == null) return null;

        return new MealPlanDto
        {
            Id = m.Id,
            Date = m.Date,
            MealType = m.MealType,
            DepartmentName = m.Department?.Name ?? "",
            TotalPatients = m.TotalPatients,
            Status = m.Status
        };
    }

    public async Task<NutritionMonitoringDto> RecordMonitoringAsync(RecordNutritionMonitoringDto dto, Guid recordedById)
    {
        var admission = await _context.Admissions.FindAsync(dto.AdmissionId);

        var monitoring = new NutritionMonitoring
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            PatientId = admission?.PatientId ?? Guid.Empty,
            Date = dto.Date,
            RecordedById = recordedById,
            OralIntakePercent = dto.OralIntakePercent,
            EnteralIntake = dto.EnteralIntake,
            ParenteralIntake = dto.ParenteralIntake,
            UrineOutput = dto.UrineOutput,
            StoolOutput = dto.StoolOutput,
            DrainOutput = dto.DrainOutput,
            ToleratingDiet = dto.ToleratingDiet,
            IntoleranceSymptoms = dto.IntoleranceSymptoms,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.NutritionMonitorings.Add(monitoring);
        await _context.SaveChangesAsync();

        return new NutritionMonitoringDto
        {
            Id = monitoring.Id,
            AdmissionId = monitoring.AdmissionId,
            PatientId = monitoring.PatientId,
            Date = monitoring.Date,
            OralIntakePercent = monitoring.OralIntakePercent,
            EnteralIntake = monitoring.EnteralIntake,
            ParenteralIntake = monitoring.ParenteralIntake,
            UrineOutput = monitoring.UrineOutput,
            StoolOutput = monitoring.StoolOutput,
            DrainOutput = monitoring.DrainOutput,
            ToleratingDiet = monitoring.ToleratingDiet,
            IntoleranceSymptoms = monitoring.IntoleranceSymptoms ?? "",
            Notes = monitoring.Notes ?? "",
            RecordedAt = monitoring.CreatedAt
        };
    }

    public async Task<List<NutritionMonitoringDto>> GetMonitoringHistoryAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.NutritionMonitorings
            .Include(m => m.Patient)
            .Where(m => m.AdmissionId == admissionId);

        if (fromDate.HasValue)
            query = query.Where(m => m.Date >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(m => m.Date <= toDate.Value);

        return await query.OrderByDescending(m => m.Date).Select(m => new NutritionMonitoringDto
        {
            Id = m.Id,
            AdmissionId = m.AdmissionId,
            PatientId = m.PatientId,
            PatientName = m.Patient != null ? m.Patient.FullName : "",
            Date = m.Date,
            OralIntakePercent = m.OralIntakePercent,
            EnteralIntake = m.EnteralIntake,
            ParenteralIntake = m.ParenteralIntake,
            ToleratingDiet = m.ToleratingDiet,
            Notes = m.Notes ?? "",
            RecordedAt = m.CreatedAt
        }).ToListAsync();
    }

    public async Task<NutritionDashboardDto> GetDashboardAsync(DateTime? date)
    {
        var targetDate = date ?? DateTime.Today;

        var screeningsToday = await _context.NutritionScreenings
            .Where(s => s.ScreeningDate.Date == targetDate.Date)
            .ToListAsync();

        var activeOrders = await _context.DietOrders
            .Where(d => d.Status == "Active")
            .ToListAsync();

        return new NutritionDashboardDto
        {
            Date = targetDate,
            ScreenedToday = screeningsToday.Count,
            HighRiskCount = screeningsToday.Count(s => s.RiskLevel == "High"),
            MediumRiskCount = screeningsToday.Count(s => s.RiskLevel == "Medium"),
            LowRiskCount = screeningsToday.Count(s => s.RiskLevel == "Low"),
            ActiveDietOrders = activeOrders.Count
        };
    }
}

#endregion

#region Luồng 13: Infection Control Service Implementation

public class InfectionControlServiceImpl : IInfectionControlService
{
    private readonly HISDbContext _context;

    public InfectionControlServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<HAIDto>> GetHAICasesAsync(DateTime? fromDate, DateTime? toDate, string? status)
    {
        var query = _context.HAICases
            .Include(h => h.Patient)
            .Include(h => h.ReportedBy)
            .AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(h => h.OnsetDate >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(h => h.OnsetDate <= toDate.Value);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(h => h.Status == status);

        return await query.Select(h => new HAIDto
        {
            Id = h.Id,
            CaseCode = h.CaseCode,
            PatientId = h.PatientId,
            PatientName = h.Patient != null ? h.Patient.FullName : "",
            InfectionType = h.InfectionType,
            InfectionSite = h.InfectionSite ?? "",
            OnsetDate = h.OnsetDate,
            Organism = h.Organism ?? "",
            IsMDRO = h.IsMDRO,
            Status = h.Status,
            Severity = h.Severity ?? "",
            ReportedBy = h.ReportedBy != null ? h.ReportedBy.FullName : "",
            ReportedAt = h.CreatedAt
        }).ToListAsync();
    }

    public async Task<HAIDto?> GetHAICaseByIdAsync(Guid id)
    {
        var h = await _context.HAICases
            .Include(x => x.Patient)
            .Include(x => x.ReportedBy)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (h == null) return null;

        return new HAIDto
        {
            Id = h.Id,
            CaseCode = h.CaseCode,
            PatientId = h.PatientId,
            PatientName = h.Patient?.FullName ?? "",
            InfectionType = h.InfectionType,
            InfectionSite = h.InfectionSite ?? "",
            OnsetDate = h.OnsetDate,
            Organism = h.Organism ?? "",
            IsMDRO = h.IsMDRO,
            Status = h.Status,
            Severity = h.Severity ?? "",
            ReportedBy = h.ReportedBy?.FullName ?? "",
            ReportedAt = h.CreatedAt
        };
    }

    public async Task<HAIDto> ReportHAICaseAsync(ReportHAIDto dto, Guid reportedById)
    {
        var admission = await _context.Admissions.FindAsync(dto.AdmissionId);

        var haiCase = new HAICase
        {
            Id = Guid.NewGuid(),
            CaseCode = $"HAI-{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = dto.AdmissionId,
            PatientId = admission?.PatientId ?? Guid.Empty,
            InfectionType = dto.InfectionType,
            InfectionSite = dto.InfectionSite,
            OnsetDate = dto.OnsetDate,
            CriteriaUsed = dto.CriteriaUsed ?? "CDC",
            Organism = dto.Organism,
            IsMDRO = dto.IsMDRO,
            Status = "Suspected",
            ReportedById = reportedById,
            Notes = dto.InitialNotes,
            CreatedAt = DateTime.UtcNow
        };

        _context.HAICases.Add(haiCase);
        await _context.SaveChangesAsync();

        return await GetHAICaseByIdAsync(haiCase.Id) ?? new HAIDto();
    }

    public async Task<HAIDto> UpdateHAICaseAsync(Guid id, string status, string? notes)
    {
        var haiCase = await _context.HAICases.FindAsync(id);
        if (haiCase != null)
        {
            haiCase.Status = status;
            if (!string.IsNullOrEmpty(notes))
                haiCase.Notes = notes;
            if (status == "Confirmed")
                haiCase.ConfirmedDate = DateTime.UtcNow;
            if (status == "Resolved")
                haiCase.ResolvedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetHAICaseByIdAsync(id) ?? new HAIDto();
    }

    public async Task<List<IsolationOrderDto>> GetIsolationOrdersAsync(string? status)
    {
        var query = _context.IsolationOrders
            .Include(i => i.Patient)
            .Include(i => i.OrderedBy)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(i => i.Status == status);

        return await query.Select(i => new IsolationOrderDto
        {
            Id = i.Id,
            OrderCode = i.OrderCode,
            PatientId = i.PatientId,
            PatientName = i.Patient != null ? i.Patient.FullName : "",
            AdmissionId = i.AdmissionId,
            IsolationType = i.IsolationType,
            Reason = i.Reason ?? "",
            Status = i.Status,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            OrderedBy = i.OrderedBy != null ? i.OrderedBy.FullName : ""
        }).ToListAsync();
    }

    public async Task<IsolationOrderDto?> GetIsolationOrderByIdAsync(Guid id)
    {
        var i = await _context.IsolationOrders
            .Include(x => x.Patient)
            .Include(x => x.OrderedBy)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (i == null) return null;

        return new IsolationOrderDto
        {
            Id = i.Id,
            OrderCode = i.OrderCode,
            PatientId = i.PatientId,
            PatientName = i.Patient?.FullName ?? "",
            AdmissionId = i.AdmissionId,
            IsolationType = i.IsolationType,
            Reason = i.Reason ?? "",
            Status = i.Status,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            OrderedBy = i.OrderedBy?.FullName ?? ""
        };
    }

    public async Task<IsolationOrderDto> CreateIsolationOrderAsync(CreateIsolationOrderDto dto, Guid orderedById)
    {
        var admission = await _context.Admissions.FindAsync(dto.AdmissionId);

        var order = new IsolationOrder
        {
            Id = Guid.NewGuid(),
            OrderCode = $"ISO-{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = dto.AdmissionId,
            PatientId = admission?.PatientId ?? Guid.Empty,
            IsolationType = dto.IsolationType,
            Precautions = dto.Precautions != null ? string.Join(",", dto.Precautions) : null,
            Reason = dto.Reason,
            RelatedHAIId = dto.RelatedHAIId,
            RequiresNegativePressure = dto.RequiresNegativePressure,
            StartDate = dto.StartDate,
            Status = "Active",
            OrderedById = orderedById,
            CreatedAt = DateTime.UtcNow
        };

        _context.IsolationOrders.Add(order);
        await _context.SaveChangesAsync();

        return await GetIsolationOrderByIdAsync(order.Id) ?? new IsolationOrderDto();
    }

    public async Task<IsolationOrderDto> DiscontinueIsolationAsync(Guid id, string reason, Guid discontinuedById)
    {
        var order = await _context.IsolationOrders.FindAsync(id);
        if (order != null)
        {
            order.Status = "Discontinued";
            order.EndDate = DateTime.UtcNow;
            order.DiscontinuedById = discontinuedById;
            order.DiscontinuedReason = reason;
            await _context.SaveChangesAsync();
        }
        return await GetIsolationOrderByIdAsync(id) ?? new IsolationOrderDto();
    }

    public async Task<HandHygieneObservationDto> RecordHandHygieneAsync(RecordHandHygieneDto dto, Guid observerId)
    {
        var observation = new HandHygieneObservation
        {
            Id = Guid.NewGuid(),
            DepartmentId = Guid.TryParse(dto.DepartmentId, out var deptId) ? deptId : Guid.Empty,
            ObservationDate = dto.ObservationDate,
            ObservationTime = dto.ObservationTime,
            ObserverId = observerId,
            TotalOpportunities = dto.Events?.Count ?? 0,
            CompliantActions = dto.Events?.Count(e => e.IsCompliant) ?? 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.HandHygieneObservations.Add(observation);
        await _context.SaveChangesAsync();

        return new HandHygieneObservationDto
        {
            Id = observation.Id,
            ObservationDate = observation.ObservationDate,
            ObservationTime = observation.ObservationTime,
            TotalOpportunities = observation.TotalOpportunities,
            CompliantActions = observation.CompliantActions,
            ComplianceRate = observation.TotalOpportunities > 0 ?
                (decimal)observation.CompliantActions / observation.TotalOpportunities * 100 : 0
        };
    }

    public async Task<List<HandHygieneObservationDto>> GetHandHygieneReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        var query = _context.HandHygieneObservations
            .Include(h => h.Observer)
            .Include(h => h.Department)
            .Where(h => h.ObservationDate >= fromDate && h.ObservationDate <= toDate);

        if (departmentId.HasValue)
            query = query.Where(h => h.DepartmentId == departmentId);

        return await query.Select(h => new HandHygieneObservationDto
        {
            Id = h.Id,
            ObservationDate = h.ObservationDate,
            DepartmentName = h.Department != null ? h.Department.Name : "",
            ObserverName = h.Observer != null ? h.Observer.FullName : "",
            TotalOpportunities = h.TotalOpportunities,
            CompliantActions = h.CompliantActions,
            ComplianceRate = h.TotalOpportunities > 0 ?
                (decimal)h.CompliantActions / h.TotalOpportunities * 100 : 0
        }).ToListAsync();
    }

    public async Task<List<OutbreakDto>> GetOutbreaksAsync(string? status)
    {
        var query = _context.Outbreaks.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        return await query.Select(o => new OutbreakDto
        {
            Id = o.Id,
            OutbreakCode = o.OutbreakCode,
            Name = o.Name,
            Organism = o.Organism ?? "",
            InfectionType = o.InfectionType ?? "",
            IdentifiedDate = o.IdentifiedDate,
            TotalCases = o.TotalCases,
            ConfirmedCases = o.ConfirmedCases,
            Status = o.Status,
            CreatedAt = o.CreatedAt
        }).ToListAsync();
    }

    public async Task<OutbreakDto?> GetOutbreakByIdAsync(Guid id)
    {
        var o = await _context.Outbreaks.FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return null;

        return new OutbreakDto
        {
            Id = o.Id,
            OutbreakCode = o.OutbreakCode,
            Name = o.Name,
            Organism = o.Organism ?? "",
            InfectionType = o.InfectionType ?? "",
            IdentifiedDate = o.IdentifiedDate,
            TotalCases = o.TotalCases,
            ConfirmedCases = o.ConfirmedCases,
            Status = o.Status,
            CreatedAt = o.CreatedAt
        };
    }

    public async Task<OutbreakDto> DeclareOutbreakAsync(DeclareOutbreakDto dto, Guid declaredById)
    {
        var outbreak = new Outbreak
        {
            Id = Guid.NewGuid(),
            OutbreakCode = $"OB-{DateTime.Now:yyyyMMddHHmmss}",
            Name = dto.Name,
            Organism = dto.Organism,
            InfectionType = dto.InfectionType,
            IdentifiedDate = dto.IdentifiedDate,
            Status = "Investigating",
            TotalCases = dto.InitialCases?.Count ?? 0,
            DeclaredById = declaredById,
            CreatedAt = DateTime.UtcNow
        };

        _context.Outbreaks.Add(outbreak);
        await _context.SaveChangesAsync();

        return await GetOutbreakByIdAsync(outbreak.Id) ?? new OutbreakDto();
    }

    public async Task<OutbreakDto> UpdateOutbreakAsync(Guid id, string status, string? notes)
    {
        var outbreak = await _context.Outbreaks.FindAsync(id);
        if (outbreak != null)
        {
            outbreak.Status = status;
            if (status == "Contained")
                outbreak.ContainedDate = DateTime.UtcNow;
            if (status == "Closed")
                outbreak.EndDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetOutbreakByIdAsync(id) ?? new OutbreakDto();
    }

    public async Task<ICDashboardDto> GetDashboardAsync(DateTime? date)
    {
        var targetDate = date ?? DateTime.Today;
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);

        var activeCases = await _context.HAICases.Where(h => h.Status != "Resolved").ToListAsync();
        var newCasesThisMonth = await _context.HAICases.Where(h => h.CreatedAt >= monthStart).CountAsync();
        var activeIsolations = await _context.IsolationOrders.Where(i => i.Status == "Active").ToListAsync();

        return new ICDashboardDto
        {
            Date = targetDate,
            ActiveHAICases = activeCases.Count,
            NewCasesThisMonth = newCasesThisMonth,
            SSICount = activeCases.Count(c => c.InfectionType == "SSI"),
            VAPCount = activeCases.Count(c => c.InfectionType == "VAP"),
            CAUTICount = activeCases.Count(c => c.InfectionType == "CAUTI"),
            CLABSICount = activeCases.Count(c => c.InfectionType == "CLABSI"),
            ActiveIsolations = activeIsolations.Count,
            ContactPrecautions = activeIsolations.Count(i => i.IsolationType == "Contact"),
            DropletPrecautions = activeIsolations.Count(i => i.IsolationType == "Droplet"),
            AirbornePrecautions = activeIsolations.Count(i => i.IsolationType == "Airborne"),
            MDROCasesThisMonth = activeCases.Count(c => c.IsMDRO),
            ActiveOutbreaks = await _context.Outbreaks.CountAsync(o => o.Status == "Active" || o.Status == "Investigating")
        };
    }
}

#endregion

#region Luồng 14: Rehabilitation Service Implementation

public class RehabilitationServiceImpl : IRehabilitationService
{
    private readonly HISDbContext _context;

    public RehabilitationServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<RehabReferralDto>> GetReferralsAsync(string? status, Guid? departmentId)
    {
        var query = _context.RehabReferrals.Include(r => r.Patient).Include(r => r.ReferredBy).AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        return await query.Select(r => new RehabReferralDto
        {
            Id = r.Id, ReferralCode = r.ReferralCode, PatientId = r.PatientId,
            PatientName = r.Patient != null ? r.Patient.FullName : "",
            PatientCode = r.Patient != null ? r.Patient.PatientCode : "",
            PrimaryDiagnosis = r.Diagnosis ?? "", RehabType = r.RehabType,
            RehabGoals = r.Goals ?? "", Urgency = r.Urgency ?? "Routine",
            Status = r.Status, ReferralDate = r.CreatedAt,
            ReferringDoctor = r.ReferredBy != null ? r.ReferredBy.FullName : ""
        }).ToListAsync();
    }

    public async Task<RehabReferralDto?> GetReferralByIdAsync(Guid id)
    {
        var r = await _context.RehabReferrals.Include(x => x.Patient).Include(x => x.ReferredBy).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;

        return new RehabReferralDto
        {
            Id = r.Id, ReferralCode = r.ReferralCode, PatientId = r.PatientId,
            PatientName = r.Patient?.FullName ?? "", PatientCode = r.Patient?.PatientCode ?? "",
            PrimaryDiagnosis = r.Diagnosis ?? "", RehabType = r.RehabType,
            RehabGoals = r.Goals ?? "", Urgency = r.Urgency ?? "Routine",
            Status = r.Status, ReferralDate = r.CreatedAt, ReferringDoctor = r.ReferredBy?.FullName ?? ""
        };
    }

    public async Task<RehabReferralDto> CreateReferralAsync(CreateRehabReferralDto dto, Guid referredById)
    {
        var referral = new RehabReferral
        {
            Id = Guid.NewGuid(), ReferralCode = $"REHAB-{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = dto.PatientId, AdmissionId = dto.AdmissionId, VisitId = dto.VisitId,
            ReferredById = referredById, Diagnosis = dto.PrimaryDiagnosis, DiagnosisICD = dto.DiagnosisICD,
            OnsetDate = dto.OnsetDate, MedicalHistory = dto.MedicalHistory,
            CurrentMedications = dto.CurrentMedications, Precautions = dto.Precautions,
            RehabType = dto.RehabType, Goals = dto.RehabGoals, SpecificRequests = dto.SpecificRequests,
            Urgency = dto.Urgency, Status = "Pending", CreatedAt = DateTime.UtcNow
        };

        _context.RehabReferrals.Add(referral);
        await _context.SaveChangesAsync();

        return await GetReferralByIdAsync(referral.Id) ?? new RehabReferralDto();
    }

    public async Task<RehabReferralDto> AcceptReferralAsync(Guid id, Guid acceptedById)
    {
        var referral = await _context.RehabReferrals.FindAsync(id);
        if (referral != null)
        {
            referral.Status = "Accepted"; referral.AcceptedById = acceptedById; referral.AcceptedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return await GetReferralByIdAsync(id) ?? new RehabReferralDto();
    }

    public async Task<RehabReferralDto> RejectReferralAsync(Guid id, string reason)
    {
        var referral = await _context.RehabReferrals.FindAsync(id);
        if (referral != null) { referral.Status = "Rejected"; referral.RejectedReason = reason; await _context.SaveChangesAsync(); }
        return await GetReferralByIdAsync(id) ?? new RehabReferralDto();
    }

    public async Task<FunctionalAssessmentDto> SaveAssessmentAsync(SaveFunctionalAssessmentDto dto, Guid assessedById)
    {
        var assessment = new FunctionalAssessment
        {
            Id = Guid.NewGuid(), ReferralId = dto.ReferralId, AssessmentDate = DateTime.UtcNow,
            AssessedById = assessedById, AssessmentType = dto.AssessmentType,
            BarthelIndex = dto.BarthelIndex, FIMScore = dto.FIMScore,
            ProblemList = dto.ProblemList, Prognosis = dto.Prognosis,
            RecommendedInterventions = dto.RecommendedInterventions,
            Gait = dto.Gait, Transfers = dto.Transfers, CreatedAt = DateTime.UtcNow
        };
        _context.FunctionalAssessments.Add(assessment);
        await _context.SaveChangesAsync();
        return await GetAssessmentByReferralAsync(dto.ReferralId) ?? new FunctionalAssessmentDto();
    }

    public async Task<FunctionalAssessmentDto?> GetAssessmentByReferralAsync(Guid referralId)
    {
        var a = await _context.FunctionalAssessments.Include(x => x.Referral).ThenInclude(r => r!.Patient)
            .Include(x => x.AssessedBy).FirstOrDefaultAsync(x => x.ReferralId == referralId);
        if (a == null) return null;

        return new FunctionalAssessmentDto
        {
            Id = a.Id, ReferralId = a.ReferralId, PatientId = a.Referral?.PatientId ?? Guid.Empty,
            PatientName = a.Referral?.Patient?.FullName ?? "", AssessmentDate = a.AssessmentDate,
            AssessmentType = a.AssessmentType ?? "", BarthelIndex = a.BarthelIndex, FIMScore = a.FIMScore,
            Gait = a.Gait ?? "", Transfers = a.Transfers ?? "", ProblemList = a.ProblemList ?? "",
            Prognosis = a.Prognosis ?? "", RecommendedInterventions = a.RecommendedInterventions ?? "",
            AssessedBy = a.AssessedBy?.FullName ?? ""
        };
    }

    public async Task<RehabTreatmentPlanDto> CreateTreatmentPlanAsync(CreateTreatmentPlanDto dto, Guid createdById)
    {
        var referral = await _context.RehabReferrals.Include(r => r.Patient).FirstOrDefaultAsync(r => r.Id == dto.ReferralId);
        var plan = new RehabTreatmentPlan
        {
            Id = Guid.NewGuid(), PlanCode = $"RTP-{DateTime.Now:yyyyMMddHHmmss}",
            ReferralId = dto.ReferralId, PatientId = referral?.PatientId ?? Guid.Empty,
            AssessmentId = dto.AssessmentId, SessionsPerWeek = dto.SessionsPerWeek,
            MinutesPerSession = dto.MinutesPerSession, PlannedTotalSessions = dto.PlannedTotalSessions,
            StartDate = dto.StartDate, Status = "Active", CreatedById = createdById, CreatedAt = DateTime.UtcNow
        };
        _context.RehabTreatmentPlans.Add(plan);
        await _context.SaveChangesAsync();
        return await GetTreatmentPlanByIdAsync(plan.Id) ?? new RehabTreatmentPlanDto();
    }

    public async Task<RehabTreatmentPlanDto?> GetTreatmentPlanByIdAsync(Guid id)
    {
        var p = await _context.RehabTreatmentPlans.Include(x => x.Patient).Include(x => x.CreatedBy).FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return null;

        return new RehabTreatmentPlanDto
        {
            Id = p.Id, PlanCode = p.PlanCode, ReferralId = p.ReferralId, PatientId = p.PatientId,
            PatientName = p.Patient?.FullName ?? "", AssessmentId = p.AssessmentId,
            SessionsPerWeek = p.SessionsPerWeek, MinutesPerSession = p.MinutesPerSession,
            PlannedTotalSessions = p.PlannedTotalSessions, StartDate = p.StartDate, Status = p.Status,
            CompletedSessions = p.CompletedSessions, CreatedBy = p.CreatedBy?.FullName ?? "", CreatedAt = p.CreatedAt
        };
    }

    public async Task<List<RehabSessionDto>> GetSessionsAsync(Guid? planId, DateTime? date, string? status)
    {
        var query = _context.RehabSessions.Include(s => s.TreatmentPlan).ThenInclude(p => p!.Patient)
            .Include(s => s.Therapist).AsQueryable();

        if (planId.HasValue) query = query.Where(s => s.TreatmentPlanId == planId);
        if (date.HasValue) query = query.Where(s => s.ScheduledDate.Date == date.Value.Date);
        if (!string.IsNullOrEmpty(status)) query = query.Where(s => s.Status == status);

        return await query.Select(s => new RehabSessionDto
        {
            Id = s.Id, SessionCode = s.SessionCode, TreatmentPlanId = s.TreatmentPlanId,
            PatientId = s.TreatmentPlan != null ? s.TreatmentPlan.PatientId : Guid.Empty,
            PatientName = s.TreatmentPlan != null && s.TreatmentPlan.Patient != null ? s.TreatmentPlan.Patient.FullName : "",
            SessionNumber = s.SessionNumber, ScheduledDate = s.ScheduledDate, ScheduledTime = s.ScheduledTime,
            ScheduledDuration = s.ScheduledDuration, TherapistName = s.Therapist != null ? s.Therapist.FullName : "",
            Status = s.Status, ActualStartTime = s.ActualStartTime, ActualEndTime = s.ActualEndTime
        }).ToListAsync();
    }

    public async Task<RehabSessionDto> DocumentSessionAsync(DocumentSessionDto dto, Guid documentedById)
    {
        var session = await _context.RehabSessions.FindAsync(dto.SessionId);
        if (session != null)
        {
            session.ActualStartTime = dto.ActualStartTime; session.ActualEndTime = dto.ActualEndTime;
            session.ActualDuration = (int)(dto.ActualEndTime - dto.ActualStartTime).TotalMinutes;
            session.PatientResponse = dto.PatientResponse; session.ToleranceLevel = dto.ToleranceLevel;
            session.ProgressNotes = dto.ProgressNotes; session.HomeExercises = dto.HomeExercises;
            session.Status = "Completed"; session.DocumentedById = documentedById; session.DocumentedAt = DateTime.UtcNow;

            var plan = await _context.RehabTreatmentPlans.FindAsync(session.TreatmentPlanId);
            if (plan != null) plan.CompletedSessions++;
            await _context.SaveChangesAsync();
        }
        return await GetSessionByIdAsync(dto.SessionId) ?? new RehabSessionDto();
    }

    public async Task<RehabSessionDto?> GetSessionByIdAsync(Guid id)
    {
        var s = await _context.RehabSessions.Include(x => x.TreatmentPlan).ThenInclude(p => p!.Patient)
            .Include(x => x.Therapist).FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return null;

        return new RehabSessionDto
        {
            Id = s.Id, SessionCode = s.SessionCode, TreatmentPlanId = s.TreatmentPlanId,
            PatientId = s.TreatmentPlan?.PatientId ?? Guid.Empty, PatientName = s.TreatmentPlan?.Patient?.FullName ?? "",
            SessionNumber = s.SessionNumber, ScheduledDate = s.ScheduledDate, ScheduledTime = s.ScheduledTime,
            ScheduledDuration = s.ScheduledDuration, TherapistName = s.Therapist?.FullName ?? "", Status = s.Status,
            ActualStartTime = s.ActualStartTime, ActualEndTime = s.ActualEndTime,
            PatientResponse = s.PatientResponse ?? "", ToleranceLevel = s.ToleranceLevel ?? "", ProgressNotes = s.ProgressNotes ?? ""
        };
    }

    public async Task<RehabProgressReportDto> GetProgressReportAsync(Guid planId)
    {
        var plan = await _context.RehabTreatmentPlans.Include(p => p.Patient).Include(p => p.Sessions).FirstOrDefaultAsync(p => p.Id == planId);
        if (plan == null) return new RehabProgressReportDto();

        var sessions = plan.Sessions?.ToList() ?? new List<RehabSession>();
        return new RehabProgressReportDto
        {
            TreatmentPlanId = planId, PatientId = plan.PatientId, PatientName = plan.Patient?.FullName ?? "",
            ReportDate = DateTime.UtcNow, TotalPlannedSessions = plan.PlannedTotalSessions,
            CompletedSessions = sessions.Count(s => s.Status == "Completed"),
            CancelledSessions = sessions.Count(s => s.Status == "Cancelled"),
            NoShowSessions = sessions.Count(s => s.Status == "NoShow"),
            AttendanceRate = plan.PlannedTotalSessions > 0 ? (decimal)sessions.Count(s => s.Status == "Completed") / plan.PlannedTotalSessions * 100 : 0
        };
    }

    public async Task<RehabDashboardDto> GetDashboardAsync(DateTime? date)
    {
        var targetDate = date ?? DateTime.Today;
        var todaySessions = await _context.RehabSessions.Where(s => s.ScheduledDate.Date == targetDate.Date).ToListAsync();
        var activePlans = await _context.RehabTreatmentPlans.CountAsync(p => p.Status == "Active");
        var pendingReferrals = await _context.RehabReferrals.CountAsync(r => r.Status == "Pending");

        return new RehabDashboardDto
        {
            Date = targetDate, TodaySessions = todaySessions.Count,
            CompletedToday = todaySessions.Count(s => s.Status == "Completed"),
            InProgressNow = todaySessions.Count(s => s.Status == "InProgress"),
            UpcomingToday = todaySessions.Count(s => s.Status == "Scheduled"),
            ActivePatients = activePlans, PendingReferrals = pendingReferrals
        };
    }
}

#endregion

#region Luồng 15-20: Remaining Services (Simplified Implementations)

public class MedicalEquipmentServiceImpl : IMedicalEquipmentService
{
    private readonly HISDbContext _context;
    public MedicalEquipmentServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalEquipmentDto>> GetEquipmentListAsync(Guid? departmentId, string? status) =>
        await _context.MedicalEquipments.Include(e => e.Department)
            .Where(e => (!departmentId.HasValue || e.DepartmentId == departmentId) && (string.IsNullOrEmpty(status) || e.Status == status))
            .Select(e => new MedicalEquipmentDto { Id = e.Id, EquipmentCode = e.EquipmentCode, Name = e.EquipmentName, SerialNumber = e.SerialNumber ?? "", Model = e.Model ?? "", Manufacturer = e.Manufacturer ?? "", DepartmentId = e.DepartmentId, DepartmentName = e.Department != null ? e.Department.Name : "", Location = e.Location ?? "", Status = e.Status, Condition = e.Condition ?? "", PurchaseDate = e.PurchaseDate, WarrantyEndDate = e.WarrantyExpiry, CreatedAt = e.CreatedAt }).ToListAsync();

    public async Task<MedicalEquipmentDto?> GetEquipmentByIdAsync(Guid id) =>
        await _context.MedicalEquipments.Include(e => e.Department).Where(e => e.Id == id).Select(e => new MedicalEquipmentDto { Id = e.Id, EquipmentCode = e.EquipmentCode, Name = e.EquipmentName, SerialNumber = e.SerialNumber ?? "", Model = e.Model ?? "", Manufacturer = e.Manufacturer ?? "", DepartmentId = e.DepartmentId, DepartmentName = e.Department != null ? e.Department.Name : "", Location = e.Location ?? "", Status = e.Status, CreatedAt = e.CreatedAt }).FirstOrDefaultAsync();

    public async Task<MedicalEquipmentDto> RegisterEquipmentAsync(RegisterEquipmentDto dto)
    {
        var equipment = new MedicalEquipment { Id = Guid.NewGuid(), EquipmentCode = dto.EquipmentCode ?? $"EQ-{DateTime.Now:yyyyMMddHHmmss}", EquipmentName = dto.Name ?? dto.EquipmentName ?? "", SerialNumber = dto.SerialNumber, Model = dto.Model, Manufacturer = dto.Manufacturer, DepartmentId = dto.DepartmentId, RoomNumber = dto.RoomNumber, Status = "Active", PurchaseDate = dto.PurchaseDate, WarrantyExpiry = dto.WarrantyEndDate, CreatedAt = DateTime.UtcNow };
        _context.MedicalEquipments.Add(equipment);
        await _context.SaveChangesAsync();
        return await GetEquipmentByIdAsync(equipment.Id) ?? new MedicalEquipmentDto();
    }

    public async Task<MedicalEquipmentDto> UpdateEquipmentStatusAsync(Guid id, string status, string? reason)
    {
        var eq = await _context.MedicalEquipments.FindAsync(id);
        if (eq != null) { eq.Status = status; eq.StatusReason = reason; await _context.SaveChangesAsync(); }
        return await GetEquipmentByIdAsync(id) ?? new MedicalEquipmentDto();
    }

    public async Task<List<MaintenanceScheduleDto>> GetMaintenanceScheduleAsync(DateTime? fromDate, DateTime? toDate) =>
        await _context.MaintenanceSchedules.Include(m => m.Equipment).Where(m => (!fromDate.HasValue || m.NextDueDate >= fromDate) && (!toDate.HasValue || m.NextDueDate <= toDate)).Select(m => new MaintenanceScheduleDto { Id = m.Id, EquipmentId = m.EquipmentId, EquipmentCode = m.Equipment != null ? m.Equipment.EquipmentCode : "", EquipmentName = m.Equipment != null ? m.Equipment.EquipmentName : "", MaintenanceType = m.MaintenanceType, NextDueDate = m.NextDueDate, Status = m.Status, IsOverdue = m.NextDueDate < DateTime.Today }).ToListAsync();

    public async Task<MaintenanceRecordDto> RecordMaintenanceAsync(CreateMaintenanceRecordDto dto, Guid performedById)
    {
        var record = new MaintenanceRecord { Id = Guid.NewGuid(), RecordCode = $"MNT-{DateTime.Now:yyyyMMddHHmmss}", EquipmentId = dto.EquipmentId, ScheduleId = dto.ScheduleId, MaintenanceType = dto.MaintenanceType, MaintenanceDate = dto.MaintenanceDate, Description = dto.Description, PerformedById = performedById, Result = dto.Result, CreatedAt = DateTime.UtcNow };
        _context.MaintenanceRecords.Add(record);
        await _context.SaveChangesAsync();
        return new MaintenanceRecordDto { Id = record.Id, RecordCode = record.RecordCode, MaintenanceDate = record.MaintenanceDate };
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationRecordsAsync(Guid equipmentId) =>
        await _context.CalibrationRecords.Where(c => c.EquipmentId == equipmentId).Select(c => new CalibrationRecordDto { Id = c.Id, EquipmentId = c.EquipmentId, CalibrationDate = c.CalibrationDate, NextCalibrationDate = c.NextCalibrationDate, Result = c.Result, Status = c.Status }).ToListAsync();

    public async Task<CalibrationRecordDto> RecordCalibrationAsync(RecordCalibrationDto dto)
    {
        var record = new CalibrationRecord { Id = Guid.NewGuid(), CertificateNumber = dto.CertificateNumber ?? $"CAL-{DateTime.Now:yyyyMMddHHmmss}", EquipmentId = dto.EquipmentId, CalibrationDate = dto.CalibrationDate, NextCalibrationDate = dto.NextCalibrationDate, Result = dto.Result, Status = "Valid", CreatedAt = DateTime.UtcNow };
        _context.CalibrationRecords.Add(record);
        await _context.SaveChangesAsync();
        return new CalibrationRecordDto { Id = record.Id, CertificateNumber = record.CertificateNumber, CalibrationDate = record.CalibrationDate };
    }

    public async Task<List<RepairRequestDto>> GetRepairRequestsAsync(string? status) =>
        await _context.RepairRequests.Include(r => r.Equipment).Where(r => string.IsNullOrEmpty(status) || r.Status == status).Select(r => new RepairRequestDto { Id = r.Id, RequestCode = r.RequestCode, EquipmentId = r.EquipmentId, EquipmentCode = r.Equipment != null ? r.Equipment.EquipmentCode : "", EquipmentName = r.Equipment != null ? r.Equipment.EquipmentName : "", ProblemDescription = r.ProblemDescription ?? "", Severity = r.Severity ?? "", Status = r.Status, RequestedAt = r.CreatedAt }).ToListAsync();

    public async Task<RepairRequestDto> CreateRepairRequestAsync(CreateRepairRequestDto dto, Guid reportedById)
    {
        var request = new RepairRequest { Id = Guid.NewGuid(), RequestCode = $"REP-{DateTime.Now:yyyyMMddHHmmss}", EquipmentId = dto.EquipmentId, ProblemDescription = dto.ProblemDescription, Severity = dto.Severity, Status = "Reported", ReportedById = reportedById, CreatedAt = DateTime.UtcNow };
        _context.RepairRequests.Add(request);
        var eq = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (eq != null) eq.Status = "UnderRepair";
        await _context.SaveChangesAsync();
        return new RepairRequestDto { Id = request.Id, RequestCode = request.RequestCode, Status = request.Status };
    }

    public async Task<EquipmentDashboardDto> GetDashboardAsync() =>
        new EquipmentDashboardDto { Date = DateTime.Today, TotalEquipment = await _context.MedicalEquipments.CountAsync(), ActiveEquipment = await _context.MedicalEquipments.CountAsync(e => e.Status == "Active"), UnderRepair = await _context.MedicalEquipments.CountAsync(e => e.Status == "UnderRepair"), OpenRepairRequests = await _context.RepairRequests.CountAsync(r => r.Status != "Completed"), MaintenanceDueThisMonth = await _context.MaintenanceSchedules.CountAsync(m => m.NextDueDate.Month == DateTime.Today.Month) };
}

public class MedicalHRServiceImpl : IMedicalHRService
{
    private readonly HISDbContext _context;
    public MedicalHRServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalStaffDto>> GetStaffListAsync(Guid? departmentId, string? staffType) =>
        await _context.MedicalStaffs.Include(s => s.Department).Where(s => (!departmentId.HasValue || s.DepartmentId == departmentId) && (string.IsNullOrEmpty(staffType) || s.StaffType == staffType)).Select(s => new MedicalStaffDto { Id = s.Id, StaffCode = s.StaffCode, FullName = s.FullName, StaffType = s.StaffType, Position = s.Position ?? "", DepartmentId = s.DepartmentId, DepartmentName = s.Department != null ? s.Department.Name : "", PracticeLicenseNumber = s.PracticeLicenseNumber ?? "", LicenseExpiryDate = s.LicenseExpiryDate, Status = s.Status, JoinDate = s.JoinDate }).ToListAsync();

    public async Task<MedicalStaffDto?> GetStaffByIdAsync(Guid id) =>
        await _context.MedicalStaffs.Include(s => s.Department).Where(s => s.Id == id).Select(s => new MedicalStaffDto { Id = s.Id, StaffCode = s.StaffCode, FullName = s.FullName, StaffType = s.StaffType, Position = s.Position ?? "", DepartmentId = s.DepartmentId, DepartmentName = s.Department != null ? s.Department.Name : "", PracticeLicenseNumber = s.PracticeLicenseNumber ?? "", LicenseExpiryDate = s.LicenseExpiryDate, Status = s.Status }).FirstOrDefaultAsync();

    public async Task<MedicalStaffDto> SaveStaffAsync(SaveMedicalStaffDto dto)
    {
        if (dto.Id.HasValue)
        {
            var existing = await _context.MedicalStaffs.FindAsync(dto.Id.Value);
            if (existing != null) { existing.FullName = dto.FullName; existing.Position = dto.Position; existing.PracticeLicenseNumber = dto.PracticeLicenseNumber; existing.LicenseExpiryDate = dto.LicenseExpiryDate; }
        }
        else
        {
            var staff = new MedicalStaff { Id = Guid.NewGuid(), StaffCode = dto.EmployeeCode ?? $"STF-{DateTime.Now:yyyyMMddHHmmss}", FullName = dto.FullName, StaffType = dto.StaffType, Position = dto.Position, DepartmentId = dto.DepartmentId, JoinDate = dto.JoinDate, PracticeLicenseNumber = dto.PracticeLicenseNumber, LicenseExpiryDate = dto.LicenseExpiryDate, Status = "Active", CreatedAt = DateTime.UtcNow };
            _context.MedicalStaffs.Add(staff);
        }
        await _context.SaveChangesAsync();
        return dto.Id.HasValue ? await GetStaffByIdAsync(dto.Id.Value) ?? new MedicalStaffDto() : new MedicalStaffDto();
    }

    public async Task<List<DutyRosterDto>> GetDutyRostersAsync(int year, int month, Guid? departmentId) =>
        await _context.DutyRosters.Include(d => d.Department).Where(d => d.Year == year && d.Month == month && (!departmentId.HasValue || d.DepartmentId == departmentId)).Select(d => new DutyRosterDto { Id = d.Id, Year = d.Year, Month = d.Month, DepartmentId = d.DepartmentId, DepartmentName = d.Department != null ? d.Department.Name : "", Status = d.Status, TotalShifts = d.TotalShifts, FilledShifts = d.FilledShifts }).ToListAsync();

    public async Task<DutyRosterDto> CreateDutyRosterAsync(CreateDutyRosterDto dto, Guid createdById)
    {
        var roster = new DutyRoster { Id = Guid.NewGuid(), Year = dto.Year, Month = dto.Month, DepartmentId = dto.DepartmentId, Status = "Draft", TotalShifts = dto.Shifts?.Count ?? 0, CreatedById = createdById, CreatedAt = DateTime.UtcNow };
        _context.DutyRosters.Add(roster);
        await _context.SaveChangesAsync();
        return new DutyRosterDto { Id = roster.Id, Year = roster.Year, Month = roster.Month, Status = roster.Status };
    }

    public async Task<DutyRosterDto> PublishDutyRosterAsync(Guid id, Guid publishedById)
    {
        var roster = await _context.DutyRosters.FindAsync(id);
        if (roster != null) { roster.Status = "Published"; roster.PublishedAt = DateTime.UtcNow; roster.PublishedById = publishedById; await _context.SaveChangesAsync(); }
        return await _context.DutyRosters.Where(d => d.Id == id).Select(d => new DutyRosterDto { Id = d.Id, Status = d.Status }).FirstOrDefaultAsync() ?? new DutyRosterDto();
    }

    public async Task<List<CMECourseDto>> GetCMECoursesAsync(string? status) =>
        await _context.CMECourses.Where(c => string.IsNullOrEmpty(status) || c.Status == status).Select(c => new CMECourseDto { Id = c.Id, CourseCode = c.CourseCode, CourseName = c.CourseName, Credits = c.Credits, StartDate = c.StartDate, Status = c.Status }).ToListAsync();

    public async Task<CMESummaryDto> GetStaffCMESummaryAsync(Guid staffId)
    {
        var records = await _context.CMERecords.Where(r => r.StaffId == staffId).ToListAsync();
        var staff = await _context.MedicalStaffs.FindAsync(staffId);
        return new CMESummaryDto { StaffId = staffId, StaffName = staff?.FullName ?? "", EarnedCredits = records.Sum(r => r.CreditsEarned), RequiredCredits = 24, IsCompliant = records.Sum(r => r.CreditsEarned) >= 24 };
    }

    public async Task<MedicalHRDashboardDto> GetDashboardAsync() =>
        new MedicalHRDashboardDto { Date = DateTime.Today, TotalStaff = await _context.MedicalStaffs.CountAsync(), ActiveDoctors = await _context.MedicalStaffs.CountAsync(s => s.StaffType == "Doctor" && s.Status == "Active"), ActiveNurses = await _context.MedicalStaffs.CountAsync(s => s.StaffType == "Nurse" && s.Status == "Active"), ExpiringLicenses30Days = await _context.MedicalStaffs.CountAsync(s => s.LicenseExpiryDate.HasValue && s.LicenseExpiryDate <= DateTime.Today.AddDays(30)) };
}

public class QualityManagementServiceImpl : IQualityManagementService
{
    private readonly HISDbContext _context;
    public QualityManagementServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<IncidentReportDto>> GetIncidentsAsync(DateTime? fromDate, DateTime? toDate, string? status) =>
        await _context.IncidentReports.Include(i => i.Patient).Where(i => (!fromDate.HasValue || i.IncidentDate >= fromDate) && (!toDate.HasValue || i.IncidentDate <= toDate) && (string.IsNullOrEmpty(status) || i.Status == status)).Select(i => new IncidentReportDto { Id = i.Id, IncidentCode = i.IncidentCode, IncidentDate = i.IncidentDate, PatientId = i.PatientId, PatientName = i.Patient != null ? i.Patient.FullName : "", IncidentType = i.IncidentType, SeverityLevel = i.SeverityLevel ?? "", Description = i.Description ?? "", Status = i.Status, ReportedAt = i.CreatedAt }).ToListAsync();

    public async Task<IncidentReportDto?> GetIncidentByIdAsync(Guid id) =>
        await _context.IncidentReports.Where(i => i.Id == id).Select(i => new IncidentReportDto { Id = i.Id, IncidentCode = i.IncidentCode, IncidentDate = i.IncidentDate, Status = i.Status }).FirstOrDefaultAsync();

    public async Task<IncidentReportDto> ReportIncidentAsync(CreateIncidentReportDto dto, Guid reportedById)
    {
        var incident = new IncidentReport { Id = Guid.NewGuid(), IncidentCode = $"INC-{DateTime.Now:yyyyMMddHHmmss}", IncidentDate = dto.IncidentDate, IncidentTime = dto.IncidentTime, PatientId = dto.PatientId, IncidentType = dto.IncidentType, SeverityLevel = dto.SeverityLevel, Description = dto.Description, ImmediateAction = dto.ImmediateAction, Status = "Reported", ReportedById = reportedById, IsAnonymous = dto.IsAnonymous, CreatedAt = DateTime.UtcNow };
        _context.IncidentReports.Add(incident);
        await _context.SaveChangesAsync();
        return new IncidentReportDto { Id = incident.Id, IncidentCode = incident.IncidentCode, Status = incident.Status };
    }

    public async Task<List<QualityIndicatorDto>> GetIndicatorsAsync(string? category) =>
        await _context.QualityIndicators.Where(q => string.IsNullOrEmpty(category) || q.Category == category).Select(q => new QualityIndicatorDto { Id = q.Id, IndicatorCode = q.IndicatorCode, Name = q.Name, Category = q.Category, TargetValue = q.TargetValue, IsActive = q.IsActive }).ToListAsync();

    public async Task<List<QualityIndicatorValueDto>> GetIndicatorValuesAsync(Guid indicatorId, DateTime fromDate, DateTime toDate) =>
        await _context.QualityIndicatorValues.Where(v => v.IndicatorId == indicatorId && v.PeriodStart >= fromDate && v.PeriodEnd <= toDate).Select(v => new QualityIndicatorValueDto { Id = v.Id, IndicatorId = v.IndicatorId, PeriodStart = v.PeriodStart, PeriodEnd = v.PeriodEnd, Value = v.Value, Status = v.Status ?? "" }).ToListAsync();

    public async Task<SatisfactionReportDto> GetSatisfactionReportAsync(DateTime fromDate, DateTime toDate, string? surveyType) =>
        new SatisfactionReportDto { FromDate = fromDate, ToDate = toDate, SurveyType = surveyType ?? "", TotalSurveys = await _context.PatientSatisfactionSurveys.CountAsync(s => s.SurveyDate >= fromDate && s.SurveyDate <= toDate), AverageOverall = 4.2m };

    public async Task<QMDashboardDto> GetDashboardAsync() =>
        new QMDashboardDto { Date = DateTime.Today, OpenIncidents = await _context.IncidentReports.CountAsync(i => i.Status != "Closed"), IndicatorsMeetingTarget = await _context.QualityIndicators.CountAsync(q => q.IsActive), SatisfactionScore = 4.2m };
}

public class PatientPortalServiceImpl : IPatientPortalService
{
    private readonly HISDbContext _context;
    public PatientPortalServiceImpl(HISDbContext context) => _context = context;

    public async Task<PortalAccountDto?> GetAccountByPatientIdAsync(Guid patientId) =>
        await _context.PortalAccounts.Where(a => a.PatientId == patientId).Select(a => new PortalAccountDto { Id = a.Id, Username = a.Username, Email = a.Email ?? "", Phone = a.Phone ?? "", PatientId = a.PatientId, Status = a.Status }).FirstOrDefaultAsync();

    public async Task<PortalAccountDto> RegisterAccountAsync(RegisterPortalAccountDto dto)
    {
        var account = new PortalAccount { Id = Guid.NewGuid(), Username = dto.Email, Email = dto.Email, Phone = dto.Phone, PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password), Status = "Active", CreatedAt = DateTime.UtcNow };
        _context.PortalAccounts.Add(account);
        await _context.SaveChangesAsync();
        return new PortalAccountDto { Id = account.Id, Username = account.Username, Status = account.Status };
    }

    public async Task<List<PortalAppointmentDto>> GetAppointmentsAsync(Guid patientId, DateTime? fromDate, DateTime? toDate) =>
        await _context.PortalAppointments.Include(a => a.Department).Include(a => a.Doctor).Where(a => a.PatientId == patientId && (!fromDate.HasValue || a.AppointmentDate >= fromDate) && (!toDate.HasValue || a.AppointmentDate <= toDate)).Select(a => new PortalAppointmentDto { Id = a.Id, AppointmentCode = a.AppointmentCode, PatientId = a.PatientId, AppointmentDate = a.AppointmentDate, DepartmentId = a.DepartmentId, DepartmentName = a.Department != null ? a.Department.Name : "", DoctorId = a.DoctorId, DoctorName = a.Doctor != null ? a.Doctor.FullName : "", Status = a.Status, CreatedAt = a.CreatedAt }).ToListAsync();

    public async Task<PortalAppointmentDto> BookAppointmentAsync(Guid patientId, CreatePortalAppointmentDto dto)
    {
        var appointment = new PortalAppointment { Id = Guid.NewGuid(), AppointmentCode = $"APT-{DateTime.Now:yyyyMMddHHmmss}", PatientId = patientId, AppointmentDate = dto.AppointmentDate, AppointmentTime = dto.AppointmentTime, DepartmentId = dto.DepartmentId, DoctorId = dto.DoctorId, VisitType = dto.VisitType, ReasonForVisit = dto.ReasonForVisit, Status = "Pending", CreatedAt = DateTime.UtcNow };
        _context.PortalAppointments.Add(appointment);
        await _context.SaveChangesAsync();
        return new PortalAppointmentDto { Id = appointment.Id, AppointmentCode = appointment.AppointmentCode, Status = appointment.Status };
    }

    public async Task<PortalAppointmentDto> CancelAppointmentAsync(Guid appointmentId, string reason)
    {
        var apt = await _context.PortalAppointments.FindAsync(appointmentId);
        if (apt != null) { apt.Status = "Cancelled"; await _context.SaveChangesAsync(); }
        return new PortalAppointmentDto { Id = appointmentId, Status = "Cancelled" };
    }

    public async Task<HealthRecordSummaryDto> GetHealthRecordSummaryAsync(Guid patientId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        return new HealthRecordSummaryDto { PatientId = patientId, PatientName = patient?.FullName ?? "", DateOfBirth = patient?.DateOfBirth ?? DateTime.MinValue, Gender = patient?.Gender.ToString() ?? "", BloodType = patient?.BloodType ?? "" };
    }

    public async Task<List<PortalLabResultDto>> GetLabResultsAsync(Guid patientId, DateTime? fromDate) => await Task.FromResult(new List<PortalLabResultDto>());
    public async Task<List<PortalPrescriptionDto>> GetPrescriptionsAsync(Guid patientId, string? status) => await Task.FromResult(new List<PortalPrescriptionDto>());
    public async Task<List<PortalInvoiceDto>> GetInvoicesAsync(Guid patientId, string? status) => await Task.FromResult(new List<PortalInvoiceDto>());
    public async Task<OnlinePaymentDto> InitiatePaymentAsync(Guid patientId, InitiatePaymentDto dto) => new OnlinePaymentDto { Id = Guid.NewGuid(), Status = "Pending", PaymentUrl = $"/pay/{Guid.NewGuid()}" };

    public async Task<PatientPortalDashboardDto> GetDashboardAsync(Guid patientId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        return new PatientPortalDashboardDto { PatientId = patientId, PatientName = patient?.FullName ?? "", UpcomingAppointmentsCount = await _context.PortalAppointments.CountAsync(a => a.PatientId == patientId && a.Status == "Confirmed" && a.AppointmentDate > DateTime.Today) };
    }
}

public class HealthExchangeServiceImpl : IHealthExchangeService
{
    private readonly HISDbContext _context;
    public HealthExchangeServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<HIEConnectionDto>> GetConnectionsAsync() =>
        await _context.HIEConnections.Select(c => new HIEConnectionDto { Id = c.Id, ConnectionName = c.ConnectionName, ConnectionType = c.ConnectionType, Endpoint = c.Endpoint ?? "", IsActive = c.IsActive, ConnectionStatus = c.ConnectionStatus ?? "" }).ToListAsync();

    public async Task<HIEConnectionDto> TestConnectionAsync(Guid connectionId)
    {
        var conn = await _context.HIEConnections.FindAsync(connectionId);
        if (conn != null) { conn.ConnectionStatus = "Connected"; conn.LastSuccessfulConnection = DateTime.UtcNow; await _context.SaveChangesAsync(); }
        return new HIEConnectionDto { Id = connectionId, ConnectionStatus = "Connected" };
    }

    public async Task<InsuranceCardLookupResultDto> LookupInsuranceCardAsync(string cardNumber) =>
        await Task.FromResult(new InsuranceCardLookupResultDto { IsValid = true, CardNumber = cardNumber, PatientName = "Test Patient", EffectiveFrom = DateTime.Today.AddYears(-1), EffectiveTo = DateTime.Today.AddYears(1), CoveragePercent = 80, LookupTime = DateTime.UtcNow });

    public async Task<InsuranceXMLSubmissionDto> SubmitInsuranceXMLAsync(string xmlType, DateTime fromDate, DateTime toDate)
    {
        var submission = new InsuranceXMLSubmission { Id = Guid.NewGuid(), SubmissionCode = $"XML-{DateTime.Now:yyyyMMddHHmmss}", XMLType = xmlType, FromDate = fromDate, ToDate = toDate, Status = "Draft", CreatedAt = DateTime.UtcNow };
        _context.InsuranceXMLSubmissions.Add(submission);
        await _context.SaveChangesAsync();
        return new InsuranceXMLSubmissionDto { Id = submission.Id, SubmissionCode = submission.SubmissionCode, Status = submission.Status };
    }

    public async Task<List<InsuranceXMLSubmissionDto>> GetXMLSubmissionsAsync(DateTime? fromDate, DateTime? toDate, string? status) =>
        await _context.InsuranceXMLSubmissions.Where(s => (!fromDate.HasValue || s.FromDate >= fromDate) && (!toDate.HasValue || s.ToDate <= toDate) && (string.IsNullOrEmpty(status) || s.Status == status)).Select(s => new InsuranceXMLSubmissionDto { Id = s.Id, SubmissionCode = s.SubmissionCode, XMLType = s.XMLType, Status = s.Status }).ToListAsync();

    public async Task<ElectronicHealthRecordDto?> GetPatientEHRAsync(Guid patientId) => await Task.FromResult(new ElectronicHealthRecordDto { PatientId = patientId.ToString(), FullName = "Patient" });

    public async Task<PatientConsentDto> RecordConsentAsync(Guid patientId, string consentType, List<string>? allowedTypes)
    {
        var consent = new PatientConsent { Id = Guid.NewGuid(), PatientId = patientId, ConsentType = consentType, IsActive = true, ConsentDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        _context.PatientConsents.Add(consent);
        await _context.SaveChangesAsync();
        return new PatientConsentDto { Id = consent.Id, PatientId = patientId, ConsentType = consentType, IsActive = true };
    }

    public async Task<ElectronicReferralDto> CreateReferralAsync(CreateElectronicReferralDto dto, Guid createdById)
    {
        var referral = new ElectronicReferral { Id = Guid.NewGuid(), ReferralCode = $"REF-{DateTime.Now:yyyyMMddHHmmss}", PatientId = dto.PatientId, DestinationFacilityCode = dto.DestinationFacilityCode, PrimaryDiagnosis = dto.PrimaryDiagnosis, Status = "Draft", CreatedAt = DateTime.UtcNow };
        _context.ElectronicReferrals.Add(referral);
        await _context.SaveChangesAsync();
        return new ElectronicReferralDto { Id = referral.Id, ReferralCode = referral.ReferralCode, Status = referral.Status };
    }

    public async Task<List<ElectronicReferralDto>> GetReferralsAsync(string? direction, string? status) =>
        await _context.ElectronicReferrals.Where(r => string.IsNullOrEmpty(status) || r.Status == status).Select(r => new ElectronicReferralDto { Id = r.Id, ReferralCode = r.ReferralCode, Status = r.Status }).ToListAsync();

    public async Task<HIEDashboardDto> GetDashboardAsync() =>
        new HIEDashboardDto { Date = DateTime.Today, TotalConnections = await _context.HIEConnections.CountAsync(), ActiveConnections = await _context.HIEConnections.CountAsync(c => c.IsActive), InsuranceLookupsToday = 0 };
}

public class MassCasualtyServiceImpl : IMassCasualtyService
{
    private readonly HISDbContext _context;
    public MassCasualtyServiceImpl(HISDbContext context) => _context = context;

    public async Task<MCIEventDto?> GetActiveEventAsync() =>
        await _context.MCIEvents.Where(e => e.Status == "Active").Select(e => new MCIEventDto { Id = e.Id, EventCode = e.EventCode, EventName = e.EventName, EventType = e.EventType, Status = e.Status, AlertLevel = e.AlertLevel ?? "", TotalVictims = e.TotalVictims, ActivatedAt = e.ActivatedAt ?? DateTime.UtcNow }).FirstOrDefaultAsync();

    public async Task<MCIEventDto?> GetEventByIdAsync(Guid id) =>
        await _context.MCIEvents.Where(e => e.Id == id).Select(e => new MCIEventDto { Id = e.Id, EventCode = e.EventCode, EventName = e.EventName, EventType = e.EventType, Status = e.Status, TotalVictims = e.TotalVictims }).FirstOrDefaultAsync();

    public async Task<MCIEventDto> ActivateEventAsync(ActivateMCIEventDto dto, Guid activatedById)
    {
        var mciEvent = new MCIEvent { Id = Guid.NewGuid(), EventCode = $"MCI-{DateTime.Now:yyyyMMddHHmmss}", EventName = dto.EventName, EventType = dto.EventType, Description = dto.Description, Location = dto.Location, EventDateTime = dto.EventDateTime, AlertLevel = dto.AlertLevel, EstimatedCasualties = dto.EstimatedCasualties, Status = "Active", Phase = "Activation", ActivatedAt = DateTime.UtcNow, ActivatedById = activatedById, CreatedAt = DateTime.UtcNow };
        _context.MCIEvents.Add(mciEvent);
        await _context.SaveChangesAsync();
        return new MCIEventDto { Id = mciEvent.Id, EventCode = mciEvent.EventCode, Status = mciEvent.Status };
    }

    public async Task<MCIEventDto> UpdateEventAsync(UpdateMCIEventDto dto, Guid updatedById)
    {
        var mciEvent = await _context.MCIEvents.FindAsync(dto.EventId);
        if (mciEvent != null) { mciEvent.Status = dto.Status; mciEvent.Phase = dto.Phase; mciEvent.AlertLevel = dto.AlertLevel; if (dto.Status == "Resolved") mciEvent.DeactivatedAt = DateTime.UtcNow; await _context.SaveChangesAsync(); }
        return await GetEventByIdAsync(dto.EventId) ?? new MCIEventDto();
    }

    public async Task<List<MCIVictimDto>> GetVictimsAsync(Guid eventId, string? triageCategory) =>
        await _context.MCIVictims.Where(v => v.EventId == eventId && (string.IsNullOrEmpty(triageCategory) || v.TriageCategory == triageCategory)).Select(v => new MCIVictimDto { Id = v.Id, EventId = v.EventId, TriageTag = v.TriageTag, VictimCode = v.VictimCode, Name = v.Name ?? "", TriageCategory = v.TriageCategory, Status = v.Status, ArrivedAt = v.ArrivedAt }).ToListAsync();

    public async Task<MCIVictimDto> RegisterVictimAsync(RegisterMCIVictimDto dto, Guid registeredById)
    {
        var eventData = await _context.MCIEvents.FindAsync(dto.EventId);
        var victimNumber = (eventData?.TotalVictims ?? 0) + 1;
        var victim = new MCIVictim { Id = Guid.NewGuid(), EventId = dto.EventId, TriageTag = $"T{victimNumber:D4}", VictimCode = $"V-{DateTime.Now:yyyyMMddHHmmss}", VictimNumber = victimNumber, Name = dto.Name, EstimatedAge = dto.EstimatedAge, Gender = dto.Gender, TriageCategory = dto.TriageCategory, ChiefComplaint = dto.ChiefComplaint, MechanismOfInjury = dto.MechanismOfInjury, Status = "Active", ArrivedAt = DateTime.UtcNow, TriageTime = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        _context.MCIVictims.Add(victim);
        if (eventData != null) eventData.TotalVictims = victimNumber;
        await _context.SaveChangesAsync();
        return new MCIVictimDto { Id = victim.Id, TriageTag = victim.TriageTag, TriageCategory = victim.TriageCategory };
    }

    public async Task<MCIVictimDto> ReTriageVictimAsync(ReTriageDto dto, Guid retriagedById)
    {
        var victim = await _context.MCIVictims.FindAsync(dto.VictimId);
        if (victim != null) { victim.TriageCategory = dto.NewCategory; victim.TriageTime = DateTime.UtcNow; await _context.SaveChangesAsync(); }
        return await _context.MCIVictims.Where(v => v.Id == dto.VictimId).Select(v => new MCIVictimDto { Id = v.Id, TriageTag = v.TriageTag, TriageCategory = v.TriageCategory }).FirstOrDefaultAsync() ?? new MCIVictimDto();
    }

    public async Task<MCIResourceStatusDto> GetResourceStatusAsync(Guid eventId) => await Task.FromResult(new MCIResourceStatusDto { EventId = eventId, UpdatedAt = DateTime.UtcNow, TotalBeds = 200, AvailableBeds = 50, TotalORs = 10, AvailableORs = 3, AvailableStaff = 100 });

    public async Task<StaffCalloutDto> InitiateStaffCalloutAsync(Guid eventId, List<Guid> staffIds, Guid initiatedById)
    {
        var callout = new StaffCallout { Id = Guid.NewGuid(), EventId = eventId, CalloutTime = DateTime.UtcNow, TotalNotified = staffIds.Count, InitiatedById = initiatedById, CreatedAt = DateTime.UtcNow };
        _context.StaffCallouts.Add(callout);
        await _context.SaveChangesAsync();
        return new StaffCalloutDto { Id = callout.Id, EventId = eventId, TotalNotified = staffIds.Count, InitiatedAt = callout.CalloutTime };
    }

    public async Task<MCICommandCenterDto> GetCommandCenterAsync(Guid eventId)
    {
        var mciEvent = await _context.MCIEvents.FindAsync(eventId);
        return new MCICommandCenterDto { EventId = eventId, EventName = mciEvent?.EventName ?? "", EventStatus = mciEvent?.Status ?? "", LastUpdated = DateTime.UtcNow };
    }

    public async Task<MCIBroadcastDto> SendBroadcastAsync(Guid eventId, string messageType, string title, string message, List<string> targetGroups, Guid sentById)
    {
        var broadcast = new MCIBroadcast { Id = Guid.NewGuid(), EventId = eventId, MessageType = messageType, Title = title, Message = message, SentById = sentById, SentAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        _context.MCIBroadcasts.Add(broadcast);
        await _context.SaveChangesAsync();
        return new MCIBroadcastDto { Id = broadcast.Id, EventId = eventId, Title = title, SentAt = broadcast.SentAt };
    }

    public async Task<MCIDashboardDto> GetDashboardAsync()
    {
        var activeEvent = await GetActiveEventAsync();
        return new MCIDashboardDto { HasActiveEvent = activeEvent != null, ActiveEvent = activeEvent, TotalEventsThisYear = await _context.MCIEvents.CountAsync(e => e.CreatedAt.Year == DateTime.Today.Year) };
    }
}

#endregion
