using HIS.Application.Common;
using HIS.Application.DTOs.ObservationStay;
using HIS.Application.Interfaces;
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

        var now = DateTime.Now;
        var stay = new ObservationStay
        {
            Id = Guid.NewGuid(),
            StayCode = $"OBS{now:yyyyMMddHHmmss}",
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

        // Simple MEWS calculation
        var mews = 0;
        if (dto.HeartRate.HasValue)
        {
            var hr = dto.HeartRate.Value;
            if (hr < 40) mews += 2; else if (hr < 51) mews += 1;
            else if (hr > 130) mews += 3; else if (hr > 110) mews += 2; else if (hr > 100) mews += 1;
        }
        if (dto.RespirationRate.HasValue)
        {
            var rr = dto.RespirationRate.Value;
            if (rr < 9) mews += 2; else if (rr > 30) mews += 3; else if (rr > 20) mews += 2; else if (rr > 14) mews += 1;
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
        stay.Status = 3;
        stay.DischargedAt = DateTime.Now;
        stay.FinalDiagnosis = dto.FinalDiagnosis ?? stay.FinalDiagnosis;
        stay.DischargeReason = dto.DischargeReason ?? "Chuyển nhập viện";
        stay.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? stay.Notes : $"{stay.Notes}\n{dto.Notes}";
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.Status });
    }

    /// <summary>Cập nhật mức triage (nâng/hạ mức ưu tiên) cho phiên lưu — #61.</summary>
    public async Task<ServiceOutcome> UpdateTriageAsync(Guid id, UpdateTriageDto dto, Guid userId)
    {
        if (dto.TriageLevel < 1 || dto.TriageLevel > 5)
            return ServiceOutcome.Bad("Mức triage phải từ 1 đến 5");
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return ServiceOutcome.NotFound();
        stay.TriageLevel = dto.TriageLevel;
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { stay.Id, stay.TriageLevel });
    }
}
