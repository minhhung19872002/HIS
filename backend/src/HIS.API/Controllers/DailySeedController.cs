using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.API.Controllers;

/// <summary>
/// Daily seed endpoint. Generates fake patient registrations with CreatedAt=today
/// so Reception page always shows activity. Secured via X-Seed-Key header, invoked
/// by Cloud Scheduler once per day.
/// </summary>
[ApiController]
[Route("api/admin/seed-daily")]
[AllowAnonymous]
public class DailySeedController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<DailySeedController> _logger;

    public DailySeedController(HISDbContext db, IConfiguration config, ILogger<DailySeedController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    private static readonly string[] FirstNames = new[]
    {
        "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Võ",
        "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Vũ"
    };
    private static readonly string[] MiddleNames = new[]
    {
        "Văn", "Thị", "Minh", "Thanh", "Hữu", "Quốc", "Ngọc", "Thu",
        "Hoàng", "Xuân", "Đức", "Kim", "Anh", "Bảo", "Gia", "Mai"
    };
    private static readonly string[] GivenNames = new[]
    {
        "An", "Bình", "Châu", "Dũng", "Em", "Hà", "Hải", "Hùng", "Huy",
        "Khánh", "Linh", "Mai", "Nam", "Phong", "Quân", "Sơn", "Thảo",
        "Trang", "Tuấn", "Tú", "Vân", "Vy", "Yến", "Long", "Đạt"
    };
    private static readonly string[] Wards = new[]
    {
        "Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5",
        "Phường Bến Nghé", "Phường Tân Định", "Phường Đa Kao"
    };
    private static readonly string[] Districts = new[]
    {
        "Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", "Quận Bình Thạnh",
        "Quận Phú Nhuận", "Quận Tân Bình"
    };
    private static readonly (string IcdCode, string Name)[] Diagnoses = new[]
    {
        ("J00", "Viêm mũi họng cấp (cảm lạnh thông thường)"),
        ("K29", "Viêm dạ dày và tá tràng"),
        ("I10", "Tăng huyết áp vô căn"),
        ("E11", "Đái tháo đường type 2"),
        ("J45", "Hen phế quản"),
        ("M54", "Đau lưng"),
        ("R51", "Đau đầu"),
        ("K30", "Khó tiêu"),
        ("L20", "Viêm da cơ địa"),
        ("H10", "Viêm kết mạc")
    };

    [HttpPost("patients")]
    public async Task<IActionResult> SeedPatients([FromQuery] int count = 30)
    {
        var expectedKey = _config["DailySeed:Key"];
        if (string.IsNullOrWhiteSpace(expectedKey))
            return StatusCode(503, new { error = "DailySeed:Key not configured" });

        var providedKey = Request.Headers["X-Seed-Key"].ToString();
        if (providedKey != expectedKey)
            return Unauthorized(new { error = "Invalid X-Seed-Key" });

        if (count < 1 || count > 200)
            return BadRequest(new { error = "count must be 1..200" });

        var today = DateTime.UtcNow.Date;

        var existingToday = await _db.Patients
            .Where(p => p.PatientCode.StartsWith($"BN{today:yyyyMMdd}SEED"))
            .CountAsync();

        var rooms = await _db.Rooms
            .Where(r => r.IsActive && r.RoomType == 1)
            .Select(r => new { r.Id, r.DepartmentId })
            .ToListAsync();
        if (rooms.Count == 0)
            return StatusCode(503, new { error = "No active examination rooms" });

        var rng = new Random(today.DayOfYear);
        var toCreate = Math.Max(0, count - existingToday);
        var newPatients = new List<Patient>(toCreate);
        var newRecords = new List<MedicalRecord>(toCreate);
        var newExams = new List<Examination>();
        var now = DateTime.UtcNow;

        var queueByRoom = await _db.Examinations
            .Where(e => e.MedicalRecord.AdmissionDate.Date == today)
            .GroupBy(e => e.RoomId)
            .Select(g => new { RoomId = g.Key, MaxQ = g.Max(x => (int?)x.QueueNumber) ?? 0 })
            .ToDictionaryAsync(x => x.RoomId, x => x.MaxQ);

        // Backfill Examinations for today's records that already exist but have no exam
        // (covers prior seed runs that only created Patients + MedicalRecords)
        var backfillRecords = await _db.MedicalRecords
            .Where(m => m.AdmissionDate.Date == today
                && m.RoomId != null
                && !_db.Examinations.Any(e => e.MedicalRecordId == m.Id))
            .Select(m => new { m.Id, m.RoomId, m.DepartmentId, m.InitialDiagnosis, m.MainIcdCode })
            .ToListAsync();
        foreach (var r in backfillRecords)
        {
            var roomId = r.RoomId!.Value;
            var deptId = r.DepartmentId ?? rooms.FirstOrDefault(x => x.Id == roomId).DepartmentId;
            if (deptId == Guid.Empty) continue;
            queueByRoom.TryGetValue(roomId, out var mq);
            var q = mq + 1;
            queueByRoom[roomId] = q;
            newExams.Add(new Examination
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = r.Id,
                ExaminationType = 1,
                QueueNumber = q,
                DepartmentId = deptId,
                RoomId = roomId,
                ChiefComplaint = r.InitialDiagnosis,
                InitialDiagnosis = r.InitialDiagnosis,
                MainIcdCode = r.MainIcdCode,
                Status = 0,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        for (int i = 0; i < toCreate; i++)
        {
            var gender = rng.Next(2) + 1; // 1 Nam, 2 Nữ
            var first = FirstNames[rng.Next(FirstNames.Length)];
            var middle = MiddleNames[rng.Next(MiddleNames.Length)];
            var given = GivenNames[rng.Next(GivenNames.Length)];
            var fullName = $"{first} {middle} {given}";
            var year = now.Year - rng.Next(1, 85);
            var dob = new DateTime(year, rng.Next(1, 13), rng.Next(1, 28));
            var phone = $"09{rng.Next(10000000, 99999999)}";
            var idx = existingToday + i + 1;
            var patientCode = $"BN{today:yyyyMMdd}SEED{idx:D3}";

            var patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = patientCode,
                FullName = fullName,
                DateOfBirth = dob,
                YearOfBirth = year,
                Gender = gender,
                PhoneNumber = phone,
                Address = $"Số {rng.Next(1, 200)}, {Wards[rng.Next(Wards.Length)]}, {Districts[rng.Next(Districts.Length)]}",
                WardName = Wards[rng.Next(Wards.Length)],
                DistrictName = Districts[rng.Next(Districts.Length)],
                ProvinceName = "TP. Hồ Chí Minh",
                EthnicName = "Kinh",
                NationalityName = "Việt Nam",
                CreatedAt = now,
                UpdatedAt = now
            };
            newPatients.Add(patient);

            var room = rooms[rng.Next(rooms.Count)];
            var diag = Diagnoses[rng.Next(Diagnoses.Length)];
            var record = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                MedicalRecordCode = $"HS{today:yyyyMMdd}SEED{idx:D3}",
                PatientId = patient.Id,
                AdmissionDate = now,
                PatientType = rng.Next(2) == 0 ? 1 : 2, // 1 BHYT, 2 Viện phí
                TreatmentType = 1, // Ngoại trú
                InitialDiagnosis = diag.Name,
                MainIcdCode = diag.IcdCode,
                DepartmentId = room.DepartmentId,
                RoomId = room.Id,
                Status = 0, // Chờ khám
                CreatedAt = now,
                UpdatedAt = now
            };
            newRecords.Add(record);

            queueByRoom.TryGetValue(room.Id, out var maxQ);
            var nextQ = maxQ + 1;
            queueByRoom[room.Id] = nextQ;
            var exam = new Examination
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                ExaminationType = 1, // Khám chính
                QueueNumber = nextQ,
                DepartmentId = room.DepartmentId,
                RoomId = room.Id,
                ChiefComplaint = diag.Name,
                InitialDiagnosis = diag.Name,
                MainIcdCode = diag.IcdCode,
                Status = 0, // Chờ khám
                CreatedAt = now,
                UpdatedAt = now
            };
            newExams.Add(exam);
        }

        _db.Patients.AddRange(newPatients);
        _db.MedicalRecords.AddRange(newRecords);
        _db.Examinations.AddRange(newExams);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Daily seed created {Patients} patients + {Records} records + {Exams} exams for {Date}",
            newPatients.Count, newRecords.Count, newExams.Count, today);

        return Ok(new
        {
            createdPatients = newPatients.Count,
            createdRecords = newRecords.Count,
            createdExams = newExams.Count,
            date = today,
            totalTodayAfter = existingToday + newPatients.Count
        });
    }
}
