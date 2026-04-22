using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Phòng lưu / Observation ngắn hạn — N1.07.
/// Tiếp nhận → theo dõi sinh hiệu → cho về / chuyển nhập viện.
/// </summary>
[ApiController]
[Route("api/observation")]
[Authorize]
public class ObservationStayController : ControllerBase
{
    private readonly HISDbContext _db;
    public ObservationStayController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách phiên lưu theo trạng thái.</summary>
    [HttpGet("list")]
    public async Task<IActionResult> List([FromQuery] int? status, [FromQuery] string? keyword)
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
        return Ok(list.Select(s => new
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
            s.DischargeReason,
            s.EwsScore,
            HoursInObservation = s.DischargedAt.HasValue
                ? (int)Math.Ceiling((s.DischargedAt.Value - s.AdmittedAt).TotalHours)
                : (int)Math.Ceiling((DateTime.Now - s.AdmittedAt).TotalHours),
        }));
    }

    public class CreateDto
    {
        public Guid PatientId { get; set; }
        public Guid? MedicalRecordId { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? BedId { get; set; }
        public Guid? DoctorId { get; set; }
        public string? ChiefComplaint { get; set; }
        public string? InitialDiagnosis { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>Tiếp nhận vào phòng lưu.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDto dto)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient == null) return BadRequest(new { message = "Bệnh nhân không tồn tại" });

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
            Status = 1,
            CreatedAt = now,
            CreatedBy = GetUserId().ToString(),
        };
        _db.ObservationStays.Add(stay);
        await _db.SaveChangesAsync();
        return Ok(new { stay.Id, stay.StayCode });
    }

    public class VitalDto
    {
        public decimal? Temperature { get; set; }
        public int? HeartRate { get; set; }
        public int? RespirationRate { get; set; }
        public string? BloodPressure { get; set; }
        public int? SpO2 { get; set; }
        public int? Consciousness { get; set; }
        public string? NurseNote { get; set; }
        public string? DoctorNote { get; set; }
    }

    /// <summary>Ghi sinh hiệu / diễn biến.</summary>
    [HttpPost("{id:guid}/vitals")]
    public async Task<IActionResult> AddVital(Guid id, [FromBody] VitalDto dto)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return NotFound();
        if (stay.Status != 1) return BadRequest(new { message = "Phiên lưu đã kết thúc" });

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
            RecordedByUserId = GetUserId(),
            CreatedAt = DateTime.Now,
            CreatedBy = GetUserId().ToString(),
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
        return Ok(new { vital.Id, ewsScore = mews });
    }

    /// <summary>Lấy timeline sinh hiệu.</summary>
    [HttpGet("{id:guid}/vitals")]
    public async Task<IActionResult> GetVitals(Guid id)
    {
        var stay = await _db.ObservationStays
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (stay == null) return NotFound();
        var vitals = await _db.ObservationVitals
            .Where(v => v.ObservationStayId == id)
            .OrderBy(v => v.RecordedAt)
            .ToListAsync();
        return Ok(new
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

    public class DischargeDto
    {
        public string? FinalDiagnosis { get; set; }
        public string? DischargeReason { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>Kết thúc phiên lưu → cho về.</summary>
    [HttpPut("{id:guid}/discharge")]
    public async Task<IActionResult> Discharge(Guid id, [FromBody] DischargeDto dto)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return NotFound();
        if (stay.Status != 1) return BadRequest(new { message = "Phiên đã kết thúc" });
        stay.Status = 2;
        stay.DischargedAt = DateTime.Now;
        stay.FinalDiagnosis = dto.FinalDiagnosis ?? stay.FinalDiagnosis;
        stay.DischargeReason = dto.DischargeReason;
        stay.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? stay.Notes : $"{stay.Notes}\n{dto.Notes}";
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { stay.Id, stay.Status });
    }

    /// <summary>Chuyển nhập viện (escalate).</summary>
    [HttpPut("{id:guid}/escalate")]
    public async Task<IActionResult> Escalate(Guid id, [FromBody] DischargeDto dto)
    {
        var stay = await _db.ObservationStays.FindAsync(id);
        if (stay == null) return NotFound();
        if (stay.Status != 1) return BadRequest(new { message = "Phiên đã kết thúc" });
        stay.Status = 3;
        stay.DischargedAt = DateTime.Now;
        stay.FinalDiagnosis = dto.FinalDiagnosis ?? stay.FinalDiagnosis;
        stay.DischargeReason = dto.DischargeReason ?? "Chuyển nhập viện";
        stay.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? stay.Notes : $"{stay.Notes}\n{dto.Notes}";
        stay.UpdatedAt = DateTime.Now;
        stay.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { stay.Id, stay.Status });
    }
}
