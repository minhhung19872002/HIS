using HIS.Application.Common;
using HIS.Application.DTOs.ObservationStay;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Phòng lưu / Observation ngắn hạn (N1.07) — tách khỏi ObservationStayController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape + business math (MEWS) + message giữ nguyên;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome.
/// </summary>
public class ObservationStayService : IObservationStayService
{
    private readonly HISDbContext _db;
    public ObservationStayService(HISDbContext db) { _db = db; }

    /// <summary>Danh sách phiên lưu theo trạng thái.</summary>
    public async Task<ServiceOutcome> ListAsync(int? status, string? keyword)
    {
        var q = _db.ObservationStays
            .Include(s => s.Patient)
            .Include(s => s.Department)
            .Include(s => s.Room)
            .Include(s => s.Bed)
            .Include(s => s.Doctor)
            .AsQueryable();
        if (status.HasValue) q = q.Where(s => s.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(s => s.Patient.FullName.Contains(kw)
                || s.Patient.PatientCode.Contains(kw)
                || s.StayCode.Contains(kw));
        }
        var list = await q.OrderByDescending(s => s.AdmittedAt).Take(300).ToListAsync();
        return ServiceOutcome.Ok(list.Select(s => new
        {
            s.Id,
            s.StayCode,
            PatientCode = s.Patient.PatientCode,
            PatientName = s.Patient.FullName,
            Gender = s.Patient.Gender,
            DateOfBirth = s.Patient.DateOfBirth,
            DepartmentName = s.Department != null ? s.Department.DepartmentName : null,
            RoomName = s.Room != null ? s.Room.RoomName : null,
            BedName = s.Bed != null ? s.Bed.BedName : null,
            DoctorName = s.Doctor != null ? s.Doctor.FullName : null,
            s.AdmittedAt,
            s.DischargedAt,
            s.ChiefComplaint,
            s.InitialDiagnosis,
            s.FinalDiagnosis,
            s.Status,
            s.TriageLevel,
            s.DischargeReason,
            s.EwsScore,
            HoursInObservation = s.DischargedAt.HasValue
                ? (int)Math.Ceiling((s.DischargedAt.Value - s.AdmittedAt).TotalHours)
                : (int)Math.Ceiling((DateTime.Now - s.AdmittedAt).TotalHours),
        }));
    }


    /// <summary>Tiếp nhận vào phòng lưu.</summary>
    public async Task<ServiceOutcome> CreateAsync(CreateDto dto, Guid userId)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient == null) return ServiceOutcome.Bad("Bệnh nhân không tồn tại");

        // QA0915: a patient could be opened into two concurrent observation stays.
        if (await _db.ObservationStays.AnyAsync(s => s.PatientId == dto.PatientId && s.Status == 1))
            return ServiceOutcome.Bad("Bệnh nhân đang có phiên lưu theo dõi chưa kết thúc");
        // The linked medical record must exist and belong to this patient — otherwise a stay was opened
        // on patient B but attached to patient A's emergency record (cross-patient link).
        if (dto.MedicalRecordId.HasValue
            && !await _db.MedicalRecords.AnyAsync(m => m.Id == dto.MedicalRecordId && m.PatientId == dto.PatientId))
            return ServiceOutcome.Bad("Hồ sơ bệnh án không tồn tại hoặc không thuộc bệnh nhân này");
        if (dto.TriageLevel.HasValue && (dto.TriageLevel < 1 || dto.TriageLevel > 5))
            return ServiceOutcome.Bad("Mức triage phải từ 1 đến 5");
        // Two patients could be placed on the same observation bed.
        if (dto.BedId.HasValue && await _db.ObservationStays.AnyAsync(s => s.BedId == dto.BedId && s.Status == 1))
            return ServiceOutcome.Bad("Giường này đang có bệnh nhân lưu theo dõi");

        var now = DateTime.Now;
        var stay = new ObservationStay
        {
            Id = Guid.NewGuid(),
            // QA0915: second-precision code hit the unique index (500) when two stays opened in the same
            // second; add milliseconds + 2 random digits (22 chars, column is NVARCHAR(30)).
            StayCode = $"OBS{now:yyyyMMddHHmmssfff}{Random.Shared.Next(100):D2}",
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            DepartmentId = dto.DepartmentId,
            RoomId = dto.RoomId,
            BedId = dto.BedId,
            DoctorId = dto.DoctorId,
            AdmittedAt = now,
            ChiefComplaint = dto.ChiefComplaint,
            InitialDiagnosis = dto.InitialDiagnosis,
            Notes = dto.Notes,
            TriageLevel = dto.TriageLevel,
            Status = 1,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        _db.ObservationStays.Add(stay);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.StayCode });
    }


    /// <summary>Ghi sinh hiệu / diễn biến.</summary>
    public async Task<ServiceOutcome> AddVitalAsync(Guid id, VitalDto dto, Guid userId)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return ServiceOutcome.NotFound();
        if (stay.Status != 1) return ServiceOutcome.Bad("Phiên lưu đã kết thúc");

        var vital = new ObservationVital
        {
            Id = Guid.NewGuid(),
            ObservationStayId = id,
            RecordedAt = DateTime.Now,
            Temperature = dto.Temperature,
            HeartRate = dto.HeartRate,
            RespirationRate = dto.RespirationRate,
            BloodPressure = dto.BloodPressure,
            SpO2 = dto.SpO2,
            Consciousness = dto.Consciousness,
            NurseNote = dto.NurseNote,
            DoctorNote = dto.DoctorNote,
            RecordedByUserId = userId,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        };
        _db.ObservationVitals.Add(vital);

        // MEWS (Subbe). Previously HR 130 and RR 30 scored one point too low, and systolic BP + level of
        // consciousness were never scored — a shocked (SBP 60) or unresponsive (GCS 3) patient scored 0 for those.
        var mews = 0;
        if (dto.HeartRate.HasValue)
        {
            var hr = dto.HeartRate.Value;
            if (hr < 40) mews += 2; else if (hr <= 50) mews += 1;
            else if (hr >= 130) mews += 3; else if (hr >= 111) mews += 2; else if (hr >= 101) mews += 1;
        }
        if (dto.RespirationRate.HasValue)
        {
            var rr = dto.RespirationRate.Value;
            if (rr < 9) mews += 2; else if (rr >= 30) mews += 3; else if (rr >= 21) mews += 2; else if (rr >= 15) mews += 1;
        }
        if (!string.IsNullOrWhiteSpace(dto.BloodPressure)
            && int.TryParse(dto.BloodPressure.Split('/')[0].Trim(), out var sbp) && sbp > 0)
        {
            if (sbp <= 70) mews += 3; else if (sbp <= 80) mews += 2; else if (sbp <= 100) mews += 1; else if (sbp >= 200) mews += 2;
        }
        if (dto.Consciousness.HasValue && dto.Consciousness.Value >= 3 && dto.Consciousness.Value <= 15)
        {
            // Consciousness is captured as GCS (3-15) on the v2 page → AVPU: 15=A, 13-14=V, 9-12=P, <=8=U.
            var gcs = dto.Consciousness.Value;
            if (gcs <= 8) mews += 3; else if (gcs <= 12) mews += 2; else if (gcs <= 14) mews += 1;
        }
        if (dto.Temperature.HasValue)
        {
            var t = dto.Temperature.Value;
            if (t < 35) mews += 2; else if (t >= 38.5m) mews += 2;
        }
        if (dto.SpO2.HasValue && dto.SpO2.Value < 92) mews += 2;
        stay.EwsScore = mews;
        stay.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { vital.Id, ewsScore = mews });
    }

    /// <summary>Lấy timeline sinh hiệu.</summary>
    public async Task<ServiceOutcome> GetVitalsAsync(Guid id)
    {
        var stay = await _db.ObservationStays
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (stay == null) return ServiceOutcome.NotFound();
        var vitals = await _db.ObservationVitals
            .Where(v => v.ObservationStayId == id)
            .OrderBy(v => v.RecordedAt)
            .ToListAsync();
        return ServiceOutcome.Ok(new
        {
            stay = new
            {
                stay.Id,
                stay.StayCode,
                PatientCode = stay.Patient.PatientCode,
                PatientName = stay.Patient.FullName,
                stay.AdmittedAt,
                stay.ChiefComplaint,
                stay.InitialDiagnosis,
                stay.FinalDiagnosis,
                stay.Status,
                stay.EwsScore,
            },
            vitals,
        });
    }


    /// <summary>Kết thúc phiên lưu → cho về.</summary>
    public async Task<ServiceOutcome> DischargeAsync(Guid id, DischargeDto dto, Guid userId)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return ServiceOutcome.NotFound();
        if (stay.Status != 1) return ServiceOutcome.Bad("Phiên đã kết thúc");
        stay.Status = 2;
        stay.DischargedAt = DateTime.Now;
        stay.FinalDiagnosis = dto.FinalDiagnosis ?? stay.FinalDiagnosis;
        stay.DischargeReason = dto.DischargeReason;
        stay.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? stay.Notes : $"{stay.Notes}\n{dto.Notes}";
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.Status });
    }

    /// <summary>Chuyển nhập viện (escalate).</summary>
    public async Task<ServiceOutcome> EscalateAsync(Guid id, DischargeDto dto, Guid userId)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return ServiceOutcome.NotFound();
        if (stay.Status != 1) return ServiceOutcome.Bad("Phiên đã kết thúc");
        if (dto.AdmissionDepartmentId.HasValue
            && !await _db.Departments.AnyAsync(d => d.Id == dto.AdmissionDepartmentId.Value))
            return ServiceOutcome.Bad("Khoa đề nghị nhập viện không tồn tại");

        // QA-R7: escalation only flipped the stay status — the patient never reached the inpatient
        // "chờ nhập viện" worklist (GetPendingAdmissionsAsync), which reads examinations concluded as
        // hospitalization. Write the same admission request as ExaminationCompleteService.RequestHospitalizationAsync
        // on the visit's examination (that method refuses a not-yet-started exam, the usual case in the ER).
        var pendingAdmission = false;
        if (stay.MedicalRecordId.HasValue)
        {
            var mr = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == stay.MedicalRecordId.Value);
            if (mr?.EmrFinalizedAt != null)
                return ServiceOutcome.Bad(EmrLockGuard.LockedMessage); // TT46
            var exam = await _db.Examinations
                .Where(e => e.MedicalRecordId == stay.MedicalRecordId.Value && !e.IsDeleted
                            && e.Status != ExaminationStatus.Cancelled)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();
            var alreadyAdmitted = await _db.Admissions.AnyAsync(a => a.MedicalRecordId == stay.MedicalRecordId.Value);
            if (exam != null && !alreadyAdmitted)
            {
                var now = DateTime.Now;
                exam.ConclusionType = 3; // Hospitalization
                exam.ConclusionNote = dto.DischargeReason ?? "Chuyển nhập viện từ phòng lưu";
                exam.HospitalizationDepartmentId = dto.AdmissionDepartmentId;
                exam.HospitalizationIsEmergency = true;
                exam.HospitalizationDiagnosisName = dto.FinalDiagnosis ?? stay.FinalDiagnosis ?? stay.InitialDiagnosis;
                if (exam.Status != ExaminationStatus.Completed)
                {
                    exam.Status = ExaminationStatus.Completed;
                    exam.EndTime = now;
                    var tickets = await _db.QueueTickets
                        .Where(t => t.MedicalRecordId == exam.MedicalRecordId && t.RoomId == exam.RoomId
                                    && t.Status < QueueTicketStatus.Completed && !t.IsDeleted)
                        .ToListAsync();
                    foreach (var t in tickets)
                    {
                        t.Status = QueueTicketStatus.Completed;
                        t.CompletedTime ??= HIS.Core.Common.VnTime.NowVn;
                    }
                }
                else
                {
                    exam.EndTime ??= now;
                }
                pendingAdmission = true;
            }
        }

        stay.Status = 3;
        stay.DischargedAt = DateTime.Now;
        stay.FinalDiagnosis = dto.FinalDiagnosis ?? stay.FinalDiagnosis;
        stay.DischargeReason = dto.DischargeReason ?? "Chuyển nhập viện";
        stay.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? stay.Notes : $"{stay.Notes}\n{dto.Notes}";
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.Status, pendingAdmission });
    }

    /// <summary>Cập nhật mức triage (nâng/hạ mức ưu tiên) cho phiên lưu — #61.</summary>
    public async Task<ServiceOutcome> UpdateTriageAsync(Guid id, UpdateTriageDto dto, Guid userId)
    {
        if (dto.TriageLevel < 1 || dto.TriageLevel > 5)
            return ServiceOutcome.Bad("Mức triage phải từ 1 đến 5");
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return ServiceOutcome.NotFound();
        if (stay.Status != 1) return ServiceOutcome.Bad("Phiên lưu đã kết thúc — không đổi mức triage được");
        stay.TriageLevel = dto.TriageLevel;
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.TriageLevel });
    }
}
