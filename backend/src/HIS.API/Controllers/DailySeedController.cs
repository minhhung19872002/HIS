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
    public async Task<IActionResult> SeedPatients([FromQuery] int count = 30, [FromQuery] bool purge = false)
    {
        var expectedKey = _config["DailySeed:Key"];
        if (string.IsNullOrWhiteSpace(expectedKey))
            return StatusCode(503, new { error = "DailySeed:Key not configured" });

        var providedKey = Request.Headers["X-Seed-Key"].ToString();
        if (providedKey != expectedKey)
            return Unauthorized(new { error = "Invalid X-Seed-Key" });

        if (count < 1 || count > 200)
            return BadRequest(new { error = "count must be 1..200" });

        // Use Vietnam local date since clinicians read the app in VN timezone; UTC
        // "today" would diverge for ~7h each evening and mask seeded rows.
        TimeZoneInfo vnTz;
        try { vnTz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"); }
        catch { vnTz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
        var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vnTz).Date;

        var seedPrefix = $"BN{today:yyyyMMdd}SEED";
        if (purge)
        {
            var seedPatientIds = await _db.Patients
                .Where(p => p.PatientCode.StartsWith(seedPrefix))
                .Select(p => p.Id)
                .ToListAsync();
            if (seedPatientIds.Count > 0)
            {
                var seedRecords = await _db.MedicalRecords
                    .Where(m => seedPatientIds.Contains(m.PatientId))
                    .Select(m => m.Id)
                    .ToListAsync();
                // Delete dependents first to honour FK constraints
                _db.Examinations.RemoveRange(_db.Examinations.Where(e => seedRecords.Contains(e.MedicalRecordId)));
                _db.Prescriptions.RemoveRange(_db.Prescriptions.Where(p => seedRecords.Contains(p.MedicalRecordId)));
                _db.LabRequests.RemoveRange(_db.LabRequests.Where(l => l.MedicalRecordId != null && seedRecords.Contains(l.MedicalRecordId.Value)));
                _db.MedicalRecordArchives.RemoveRange(_db.MedicalRecordArchives.Where(a => seedRecords.Contains(a.MedicalRecordId)));
                _db.TeleAppointments.RemoveRange(_db.TeleAppointments.Where(t => seedPatientIds.Contains(t.PatientId)));
                _db.IncidentReports.RemoveRange(_db.IncidentReports.Where(i => i.PatientId != null && seedPatientIds.Contains(i.PatientId.Value)));
                _db.RehabReferrals.RemoveRange(_db.RehabReferrals.Where(r => seedPatientIds.Contains(r.PatientId)));
                _db.SigningRequests.RemoveRange(_db.SigningRequests.Where(s => s.PatientId != null && seedPatientIds.Contains(s.PatientId.Value)));
                _db.SatisfactionSurveyResults.RemoveRange(_db.SatisfactionSurveyResults.Where(s => s.PatientId != null && seedPatientIds.Contains(s.PatientId.Value)));
                await _db.SaveChangesAsync();

                _db.MedicalRecords.RemoveRange(_db.MedicalRecords.Where(m => seedPatientIds.Contains(m.PatientId)));
                _db.Patients.RemoveRange(_db.Patients.Where(p => seedPatientIds.Contains(p.Id)));
                await _db.SaveChangesAsync();
                _logger.LogInformation("Daily seed purged {N} patients + related for {Date}", seedPatientIds.Count, today);
            }
        }

        var existingToday = await _db.Patients
            .Where(p => p.PatientCode.StartsWith(seedPrefix))
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
        // Store CreatedAt/UpdatedAt as VN wall-clock datetime so `.Date` lines up with
        // what the frontend (dayjs local) sends as "today". SQL datetime2 is kind-agnostic.
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vnTz);

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
                AdmissionDate = today,
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

        // HISDbContext.SaveChangesAsync overrides CreatedAt = DateTime.UtcNow for every
        // BaseEntity insert. For seed rows we want CreatedAt to match the VN wall-clock
        // "now" so screens filtering on CreatedAt.Date (e.g. Reception) see today.
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE Patients SET CreatedAt = {now}, UpdatedAt = {now} WHERE PatientCode LIKE {seedPrefix + "%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE MedicalRecords SET CreatedAt = {now}, UpdatedAt = {now} WHERE MedicalRecordCode LIKE {"HS" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE Examinations SET CreatedAt = {now}, UpdatedAt = {now} WHERE MedicalRecordId IN (SELECT Id FROM MedicalRecords WHERE MedicalRecordCode LIKE {"HS" + today.ToString("yyyyMMdd") + "SEED%"})");

        // Seed ~10 telemedicine appointments for today if none yet
        var newTele = new List<TeleAppointment>();
        var teleToday = await _db.TeleAppointments.CountAsync(t => t.AppointmentDate.Date == today);
        if (teleToday < 10)
        {
            var patientIds = await _db.Patients
                .Where(p => p.PatientCode.StartsWith($"BN{today:yyyyMMdd}SEED"))
                .Select(p => p.Id)
                .Take(50)
                .ToListAsync();
            var doctorIds = await _db.Users
                .Where(u => u.IsActive)
                .Select(u => u.Id)
                .Take(20)
                .ToListAsync();
            var specialityIds = rooms.Select(r => r.DepartmentId).Distinct().ToList();

            if (patientIds.Count > 0 && doctorIds.Count > 0)
            {
                var target = 10 - teleToday;
                for (int i = 0; i < target; i++)
                {
                    var slotHour = 8 + (i % 9); // 8:00 → 17:00
                    var slotMinute = (i * 15) % 60;
                    newTele.Add(new TeleAppointment
                    {
                        Id = Guid.NewGuid(),
                        AppointmentCode = $"TELE{today:yyyyMMdd}SEED{(teleToday + i + 1):D3}",
                        PatientId = patientIds[rng.Next(patientIds.Count)],
                        DoctorId = doctorIds[rng.Next(doctorIds.Count)],
                        SpecialityId = specialityIds.Count > 0 ? specialityIds[rng.Next(specialityIds.Count)] : null,
                        AppointmentDate = today,
                        StartTime = new TimeSpan(slotHour, slotMinute, 0),
                        DurationMinutes = 15,
                        Status = i < (target / 2) ? "Pending" : "Confirmed",
                        ChiefComplaint = Diagnoses[rng.Next(Diagnoses.Length)].Name,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                _db.TeleAppointments.AddRange(newTele);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE TeleAppointments SET CreatedAt = {now}, UpdatedAt = {now} WHERE AppointmentCode LIKE {"TELE" + today.ToString("yyyyMMdd") + "SEED%"}");
            }
        }

        // ---- Master-data seeding (one-time per deployment) ----

        // MedicalStaff - populate HR page
        var staffCount = await _db.MedicalStaffs.CountAsync();
        var newStaff = new List<MedicalStaff>();
        if (staffCount == 0)
        {
            var depts = await _db.Departments.Where(d => d.IsActive).Select(d => d.Id).ToListAsync();
            var staffUsers = await _db.Users.Where(u => u.IsActive).Take(15).Select(u => new { u.Id, u.FullName }).ToListAsync();
            var staffTypes = new[] { "Doctor", "Doctor", "Doctor", "Nurse", "Nurse", "Nurse", "Nurse", "Technician", "Pharmacist", "Other" };
            var specialties = new[] { "Nội tổng quát", "Ngoại tổng quát", "Nhi khoa", "Sản phụ khoa", "Tim mạch", "Hồi sức cấp cứu", "Gây mê hồi sức", "Răng hàm mặt", "Tai mũi họng", "Mắt" };
            for (int i = 0; i < Math.Min(12, staffUsers.Count); i++)
            {
                var u = staffUsers[i];
                newStaff.Add(new MedicalStaff
                {
                    Id = Guid.NewGuid(),
                    UserId = u.Id,
                    StaffCode = $"NV{(i + 1):D4}",
                    FullName = u.FullName ?? $"Nhân viên {i + 1}",
                    StaffType = staffTypes[i % staffTypes.Length],
                    Specialty = specialties[i % specialties.Length],
                    HighestDegree = i % 3 == 0 ? "Thạc sĩ Y khoa" : "Bác sĩ CKI",
                    YearsOfExperience = 3 + (i % 15),
                    LicenseNumber = $"CCHN-{2015 + (i % 10)}-{(i + 1):D4}",
                    LicenseIssueDate = today.AddYears(-(3 + i % 10)),
                    LicenseExpiryDate = today.AddYears(5 - (i % 3)),
                    LicenseActive = true,
                    PrimaryDepartmentId = depts.Count > 0 ? depts[i % depts.Count] : null,
                    PersonalPhone = $"09{(10000000 + rng.Next(89999999))}",
                    Status = "Active",
                    JoinDate = today.AddYears(-(1 + i % 12)),
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            if (newStaff.Count > 0)
            {
                _db.MedicalStaffs.AddRange(newStaff);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE MedicalStaffs SET CreatedAt = {now}, UpdatedAt = {now} WHERE StaffCode LIKE 'NV%'");
            }
        }

        // MedicalEquipment - populate Equipment page
        var equipCount = await _db.MedicalEquipments.CountAsync();
        var newEquip = new List<MedicalEquipment>();
        if (equipCount == 0)
        {
            var depts = await _db.Departments.Where(d => d.IsActive).Select(d => d.Id).ToListAsync();
            var items = new (string code, string name, string cat, string risk, string model, string mfg)[]
            {
                ("EQ0001", "Máy siêu âm Doppler màu 4D", "Diagnostic", "B", "Voluson E10", "GE Healthcare"),
                ("EQ0002", "Máy X-quang kỹ thuật số", "Diagnostic", "B", "DRX-Evolution", "Carestream"),
                ("EQ0003", "Máy CT scan 128 lát cắt", "Diagnostic", "C", "Revolution CT", "GE"),
                ("EQ0004", "Máy cộng hưởng từ MRI 1.5T", "Diagnostic", "C", "Signa Explorer", "GE"),
                ("EQ0005", "Máy theo dõi bệnh nhân đa thông số", "Monitoring", "B", "IntelliVue MX450", "Philips"),
                ("EQ0006", "Máy thở xâm nhập", "Therapeutic", "C", "Hamilton-G5", "Hamilton Medical"),
                ("EQ0007", "Máy gây mê kèm thở", "Therapeutic", "C", "Aisys CS2", "GE"),
                ("EQ0008", "Dao điện cao tần", "Surgical", "B", "Valleylab FX", "Medtronic"),
                ("EQ0009", "Máy sốc tim AED", "Therapeutic", "C", "HeartStart FRx", "Philips"),
                ("EQ0010", "Máy điện tim 12 chuyển đạo", "Diagnostic", "A", "PageWriter TC30", "Philips"),
                ("EQ0011", "Máy xét nghiệm sinh hóa tự động", "Diagnostic", "A", "Cobas c311", "Roche"),
                ("EQ0012", "Máy xét nghiệm huyết học", "Diagnostic", "A", "XN-1000", "Sysmex"),
            };
            for (int i = 0; i < items.Length; i++)
            {
                var it = items[i];
                newEquip.Add(new MedicalEquipment
                {
                    Id = Guid.NewGuid(),
                    EquipmentCode = it.code,
                    EquipmentName = it.name,
                    Category = it.cat,
                    RiskClass = it.risk,
                    Model = it.model,
                    Manufacturer = it.mfg,
                    CountryOfOrigin = "Mỹ",
                    YearOfManufacture = 2018 + (i % 6),
                    SerialNumber = $"SN{2020}-{(i + 1):D5}",
                    DepartmentId = depts.Count > 0 ? depts[i % depts.Count] : null,
                    Location = $"Phòng {i + 101}",
                    PurchaseDate = today.AddYears(-(1 + i % 5)),
                    PurchasePrice = 500_000_000m + (i * 150_000_000m),
                    PurchaseSource = "Ngân sách nhà nước",
                    WarrantyExpiry = today.AddYears(2),
                    Status = i % 10 == 0 ? "InMaintenance" : "Active",
                    LastMaintenanceDate = today.AddDays(-(30 + i * 5)),
                    NextMaintenanceDate = today.AddDays(90 - i * 5),
                    ExpectedLifeYears = 10,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            _db.MedicalEquipments.AddRange(newEquip);
            await _db.SaveChangesAsync();
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE MedicalEquipments SET CreatedAt = {now}, UpdatedAt = {now} WHERE EquipmentCode LIKE 'EQ%'");
        }

        // ---- Daily workflow data ----
        // Prescriptions for OPD page / Pharmacy page
        var rxCode = $"RX{today:yyyyMMdd}SEED";
        var newRx = new List<Prescription>();
        var rxToday = await _db.Prescriptions.CountAsync(p => p.PrescriptionCode.StartsWith(rxCode));
        if (rxToday < 10)
        {
            var docIds = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).Take(10).ToListAsync();
            var deptIds = rooms.Select(r => r.DepartmentId).Distinct().ToList();
            var seedRecords = await _db.MedicalRecords
                .Where(m => m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))
                .Select(m => new { m.Id, m.PatientId, m.DepartmentId, m.RoomId, m.InitialDiagnosis, m.MainIcdCode })
                .Take(10)
                .ToListAsync();
            for (int i = 0; i < Math.Min(10 - rxToday, seedRecords.Count); i++)
            {
                var r = seedRecords[i];
                newRx.Add(new Prescription
                {
                    Id = Guid.NewGuid(),
                    PrescriptionCode = $"{rxCode}{(rxToday + i + 1):D3}",
                    PrescriptionDate = today,
                    MedicalRecordId = r.Id,
                    DoctorId = docIds.Count > 0 ? docIds[i % docIds.Count] : Guid.Empty,
                    DepartmentId = r.DepartmentId ?? (deptIds.Count > 0 ? deptIds[i % deptIds.Count] : Guid.Empty),
                    Diagnosis = r.InitialDiagnosis,
                    DiagnosisName = r.InitialDiagnosis,
                    IcdCode = r.MainIcdCode,
                    DiagnosisCode = r.MainIcdCode,
                    PrescriptionType = 1,
                    TotalDays = 5 + (i % 5),
                    TotalAmount = 50_000m + (i * 20_000m),
                    InsuranceAmount = 0,
                    PatientAmount = 50_000m + (i * 20_000m),
                    Status = i < 3 ? 0 : (i < 7 ? 1 : 2),
                    IsDispensed = i >= 7,
                    Note = "Uống sau ăn",
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            if (newRx.Count > 0)
            {
                _db.Prescriptions.AddRange(newRx);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE Prescriptions SET CreatedAt = {now}, UpdatedAt = {now} WHERE PrescriptionCode LIKE {rxCode + "%"}");
            }
        }

        // LabRequests for Laboratory page
        var labCode = $"LAB{today:yyyyMMdd}SEED";
        var newLab = new List<LabRequest>();
        var labToday = await _db.LabRequests.CountAsync(l => l.RequestCode.StartsWith(labCode));
        if (labToday < 10)
        {
            var docIds = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).Take(10).ToListAsync();
            var seedRecords = await _db.MedicalRecords
                .Where(m => m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))
                .Select(m => new { m.Id, m.PatientId, m.DepartmentId, m.RoomId, m.InitialDiagnosis, m.MainIcdCode })
                .Take(10)
                .ToListAsync();
            var labServiceNames = new[] { "Công thức máu", "Sinh hóa máu 12 chỉ số", "Tổng phân tích nước tiểu", "Điện giải đồ", "HbA1c", "Men gan GOT/GPT", "Cholesterol toàn phần", "Creatinin máu", "Glucose máu lúc đói", "CRP" };
            for (int i = 0; i < Math.Min(10 - labToday, seedRecords.Count); i++)
            {
                var r = seedRecords[i];
                newLab.Add(new LabRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"{labCode}{(labToday + i + 1):D3}",
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    RequestingDoctorId = docIds.Count > 0 ? docIds[i % docIds.Count] : Guid.Empty,
                    RoomId = r.RoomId,
                    DepartmentId = r.DepartmentId,
                    RequestDate = today.AddHours(8 + i % 8),
                    Priority = i % 5 == 0 ? 2 : 1,
                    Status = i < 4 ? 0 : (i < 7 ? 2 : 3),
                    DiagnosisCode = r.MainIcdCode,
                    DiagnosisName = r.InitialDiagnosis,
                    ClinicalInfo = $"Yêu cầu {labServiceNames[i % labServiceNames.Length]}",
                    PatientType = 1,
                    TotalAmount = 150_000m + (i * 50_000m),
                    InsuranceAmount = 100_000m,
                    PatientAmount = 50_000m + (i * 50_000m),
                    IsPaid = i >= 5,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            if (newLab.Count > 0)
            {
                _db.LabRequests.AddRange(newLab);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE LabRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {labCode + "%"}");
            }
        }

        // ---- Module workflow data (Quality, Rehab, Signing, Survey, Procurement, Archive) ----

        var docIdsAll = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).Take(10).ToListAsync();
        var deptIdsAll = await _db.Departments.Where(d => d.IsActive).Select(d => d.Id).Take(8).ToListAsync();
        var todayPatientIds = await _db.Patients
            .Where(p => p.PatientCode.StartsWith($"BN{today:yyyyMMdd}SEED"))
            .Select(p => p.Id).Take(30).ToListAsync();
        var todayRecords = await _db.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))
            .Select(m => new { m.Id, m.PatientId, m.DepartmentId, m.MainIcdCode, m.InitialDiagnosis })
            .Take(30).ToListAsync();

        int newIncidents = 0, newRehab = 0, newSigning = 0, newSurvey = 0, newProc = 0, newArchive = 0;
        int newAdmissions = 0, newDischarges = 0, newReceipts = 0, newSvcRequests = 0,
            newRadRequests = 0, newSurgRequests = 0, newQueueTickets = 0;

        // ==== Admissions - for Inpatient page + dashboard currentInpatients/todayAdmissions ====
        var freeBeds = await _db.Beds
            .Where(b => b.IsActive && b.Status == 0)
            .Select(b => new { b.Id, b.RoomId })
            .Take(30).ToListAsync();
        var inpatientRoomList = await _db.Rooms
            .Where(r => r.IsActive && r.RoomType == 2)
            .Select(r => new { r.Id, r.DepartmentId })
            .ToListAsync();
        var roomDeptMap = inpatientRoomList.ToDictionary(r => r.Id, r => r.DepartmentId);

        if (await _db.Admissions.CountAsync(a => a.AdmissionDate >= today && a.AdmissionDate < today.AddDays(1)
                && _db.MedicalRecords.Any(m => m.Id == a.MedicalRecordId && m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))) == 0
            && inpatientRoomList.Count > 0 && docIdsAll.Count > 0 && todayRecords.Count >= 4)
        {
            var admitTypes = new[] { 3, 1, 3, 4, 2 };
            var newAdmsList = new List<Admission>();
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                // Prefer a free bed if available, otherwise pick any inpatient room (bed-less admission)
                Guid? bedId = null;
                Guid roomId;
                Guid deptId;
                if (i < freeBeds.Count)
                {
                    bedId = freeBeds[i].Id;
                    roomId = freeBeds[i].RoomId;
                }
                else
                {
                    var room = inpatientRoomList[i % inpatientRoomList.Count];
                    roomId = room.Id;
                }
                if (!roomDeptMap.TryGetValue(roomId, out deptId) || deptId == Guid.Empty)
                    deptId = r.DepartmentId ?? (deptIdsAll.Count > 0 ? deptIdsAll[0] : Guid.Empty);
                if (deptId == Guid.Empty) continue;

                newAdmsList.Add(new Admission
                {
                    Id = Guid.NewGuid(),
                    MedicalRecordId = r.Id,
                    PatientId = r.PatientId,
                    AdmissionDate = today.AddHours(rng.Next(6, 12)),
                    AdmissionType = admitTypes[i % admitTypes.Length],
                    AdmittingDoctorId = docIdsAll[i % docIdsAll.Count],
                    DepartmentId = deptId,
                    RoomId = roomId,
                    BedId = bedId,
                    Status = 0,
                    DiagnosisOnAdmission = r.InitialDiagnosis,
                    ReasonForAdmission = $"Nhập viện điều trị: {r.InitialDiagnosis}",
                    CreatedAt = now, UpdatedAt = now
                });
                newAdmissions++;
            }
            if (newAdmsList.Count > 0)
            {
                _db.Admissions.AddRange(newAdmsList);
                var mrIds = newAdmsList.Select(a => a.MedicalRecordId).ToHashSet();
                var mrsToUpdate = await _db.MedicalRecords.Where(m => mrIds.Contains(m.Id)).ToListAsync();
                foreach (var m in mrsToUpdate) m.TreatmentType = 2;
                var bedIdsUsed = newAdmsList.Where(a => a.BedId.HasValue).Select(a => a.BedId!.Value).ToHashSet();
                if (bedIdsUsed.Count > 0)
                {
                    var bedsToUpdate = await _db.Beds.Where(b => bedIdsUsed.Contains(b.Id)).ToListAsync();
                    foreach (var b in bedsToUpdate) b.Status = 1;
                }
                await _db.SaveChangesAsync();
            }
        }

        // ==== Discharges - turn yesterday's lingering admissions into today's discharges ====
        if (await _db.Discharges.CountAsync(d => d.DischargeDate >= today && d.DischargeDate < today.AddDays(1)) < 3
            && docIdsAll.Count > 0)
        {
            var candidateAdms = await _db.Admissions
                .Where(a => a.Status == 0 && a.AdmissionDate < today)
                .OrderBy(a => a.AdmissionDate)
                .Take(3)
                .ToListAsync();
            foreach (var adm in candidateAdms)
            {
                _db.Discharges.Add(new Discharge
                {
                    Id = Guid.NewGuid(),
                    AdmissionId = adm.Id,
                    DischargeDate = today.AddHours(9 + newDischarges * 2),
                    DischargeType = 1,
                    DischargeCondition = 1,
                    DischargeDiagnosis = adm.DiagnosisOnAdmission,
                    DischargeInstructions = "Uống thuốc đều, tái khám sau 7 ngày",
                    FollowUpDate = today.AddDays(7),
                    DischargedBy = docIdsAll[newDischarges % docIdsAll.Count],
                    CreatedAt = now, UpdatedAt = now
                });
                adm.Status = 2;
                if (adm.BedId.HasValue)
                {
                    var b = await _db.Beds.FirstOrDefaultAsync(x => x.Id == adm.BedId.Value);
                    if (b != null) b.Status = 0;
                }
                newDischarges++;
            }
            if (newDischarges > 0) await _db.SaveChangesAsync();
        }

        // ==== Receipts - today's cashier revenue + service/Rx payments ====
        var receiptCode = $"PT{today:yyyyMMdd}SEED";
        if (await _db.Receipts.CountAsync(r => r.ReceiptCode.StartsWith(receiptCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var cashier = docIdsAll[0];
            var rxForReceipts = await _db.Prescriptions
                .Where(p => p.PrescriptionCode.StartsWith($"RX{today:yyyyMMdd}SEED"))
                .Select(p => new { p.MedicalRecordId, p.PatientAmount })
                .ToListAsync();
            var rxReceipts = new List<Receipt>();
            for (int i = 0; i < rxForReceipts.Count; i++)
            {
                var mr = todayRecords.FirstOrDefault(r => r.Id == rxForReceipts[i].MedicalRecordId);
                if (mr == null) continue;
                rxReceipts.Add(new Receipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = $"{receiptCode}RX{(i + 1):D3}",
                    ReceiptDate = today.AddHours(8 + i),
                    PatientId = mr.PatientId,
                    MedicalRecordId = mr.Id,
                    ReceiptType = 2,
                    PaymentMethod = 1 + (i % 3),
                    Amount = rxForReceipts[i].PatientAmount,
                    Discount = 0,
                    FinalAmount = rxForReceipts[i].PatientAmount,
                    Note = "Thanh toán đơn thuốc",
                    Status = 1,
                    CashierId = cashier,
                    CreatedAt = now, UpdatedAt = now
                });
                newReceipts++;
            }
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                var amt = 200_000m + (i * 50_000m);
                rxReceipts.Add(new Receipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = $"{receiptCode}SVC{(i + 1):D3}",
                    ReceiptDate = today.AddHours(9 + i),
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    ReceiptType = 2,
                    PaymentMethod = 1,
                    Amount = amt,
                    Discount = 0,
                    FinalAmount = amt,
                    Note = "Thanh toán dịch vụ khám bệnh",
                    Status = 1,
                    CashierId = cashier,
                    CreatedAt = now, UpdatedAt = now
                });
                newReceipts++;
            }
            if (rxReceipts.Count > 0)
            {
                _db.Receipts.AddRange(rxReceipts);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE Receipts SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReceiptCode LIKE {receiptCode + "%"}");
            }
        }

        // ==== ServiceRequests + Details - Lab/Radiology/Surgery orders tracked on dashboard ====
        var svcReqCode = $"SR{today:yyyyMMdd}SEED";
        if (await _db.ServiceRequests.CountAsync(sr => sr.RequestCode.StartsWith(svcReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var labServices = await _db.Services.Where(s => s.IsActive && s.ServiceType == 2).Take(10).ToListAsync();
            var radServicesDb = await _db.Services.Where(s => s.IsActive && s.ServiceType == 3).Take(8).ToListAsync();
            var surgServicesDb = await _db.Services.Where(s => s.IsActive && s.ServiceType == 5).Take(3).ToListAsync();

            var toInsert = new List<ServiceRequest>();

            void AddSvc(char tag, int type, List<Service> services, int baseHour)
            {
                for (int i = 0; i < services.Count && i < todayRecords.Count; i++)
                {
                    var r = todayRecords[i];
                    var svc = services[i];
                    var deptId = r.DepartmentId ?? (deptIdsAll.Count > 0 ? deptIdsAll[0] : Guid.Empty);
                    if (deptId == Guid.Empty) continue;
                    var sr = new ServiceRequest
                    {
                        Id = Guid.NewGuid(),
                        RequestCode = $"{svcReqCode}{tag}{(i + 1):D3}",
                        RequestDate = today.AddHours(baseHour + (i % 6)),
                        MedicalRecordId = r.Id,
                        DoctorId = docIdsAll[i % docIdsAll.Count],
                        DepartmentId = deptId,
                        RequestType = type,
                        IsPriority = i % 5 == 0,
                        IsEmergency = false,
                        Diagnosis = r.InitialDiagnosis,
                        IcdCode = r.MainIcdCode,
                        ServiceId = svc.Id,
                        Quantity = 1,
                        UnitPrice = svc.UnitPrice,
                        TotalPrice = svc.UnitPrice,
                        TotalAmount = svc.UnitPrice,
                        PatientAmount = svc.UnitPrice,
                        InsuranceAmount = 0,
                        Status = i < 3 ? 0 : (i < 6 ? 2 : 3),
                        IsPaid = i >= 6,
                        CreatedAt = now, UpdatedAt = now
                    };
                    sr.Details.Add(new ServiceRequestDetail
                    {
                        Id = Guid.NewGuid(),
                        ServiceRequestId = sr.Id,
                        ServiceId = svc.Id,
                        Quantity = 1,
                        UnitPrice = svc.UnitPrice,
                        Amount = svc.UnitPrice,
                        PatientAmount = svc.UnitPrice,
                        InsuranceAmount = 0,
                        PatientType = 1,
                        Status = sr.Status,
                        CreatedAt = now, UpdatedAt = now
                    });
                    toInsert.Add(sr);
                    newSvcRequests++;
                }
            }
            AddSvc('L', 1, labServices, 8);
            AddSvc('R', 2, radServicesDb, 9);
            AddSvc('S', 4, surgServicesDb, 10);

            if (toInsert.Count > 0)
            {
                _db.ServiceRequests.AddRange(toInsert);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE ServiceRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {svcReqCode + "%"}");
            }
        }

        // ==== RadiologyRequests - Radiology page ====
        var radReqCode = $"RAD{today:yyyyMMdd}SEED";
        if (await _db.RadiologyRequests.CountAsync(r => r.RequestCode.StartsWith(radReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var radSvcs = await _db.Services.Where(s => s.IsActive && s.ServiceType == 3).Take(8).ToListAsync();
            var bodyParts = new[] { "Ngực", "Bụng", "Đầu", "Chi trên", "Chi dưới", "Cột sống", "Khung chậu", "Tim" };
            var newRadList = new List<RadiologyRequest>();
            for (int i = 0; i < Math.Min(8, Math.Min(radSvcs.Count, todayRecords.Count)); i++)
            {
                var r = todayRecords[i];
                var svc = radSvcs[i];
                newRadList.Add(new RadiologyRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"{radReqCode}{(i + 1):D3}",
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    RequestDate = today.AddHours(8 + i),
                    ServiceId = svc.Id,
                    RequestingDoctorId = docIdsAll[i % docIdsAll.Count],
                    Priority = i % 5 == 0 ? 2 : 1,
                    Status = i < 3 ? 0 : (i < 5 ? 2 : 4),
                    ClinicalInfo = r.InitialDiagnosis ?? "Chỉ định theo chỉ định lâm sàng",
                    BodyPart = bodyParts[i % bodyParts.Length],
                    Contrast = i % 4 == 0,
                    PatientType = 1,
                    TotalAmount = svc.UnitPrice,
                    InsuranceAmount = 0,
                    PatientAmount = svc.UnitPrice,
                    IsPaid = i >= 5,
                    CreatedAt = now, UpdatedAt = now
                });
                newRadRequests++;
            }
            if (newRadList.Count > 0)
            {
                _db.RadiologyRequests.AddRange(newRadList);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE RadiologyRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {radReqCode + "%"}");
            }
        }

        // ==== SurgeryRequests - Surgery page ====
        var surgReqCode = $"SURG{today:yyyyMMdd}SEED";
        if (await _db.SurgeryRequests.CountAsync(s => s.RequestCode.StartsWith(surgReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var surgTypes = new[] { "Phẫu thuật nhỏ", "Phẫu thuật trung bình", "Phẫu thuật lớn" };
            var procedures = new[] { "Cắt ruột thừa", "Mổ thoát vị bẹn", "Thay khớp háng" };
            var newSurgList = new List<SurgeryRequest>();
            for (int i = 0; i < Math.Min(3, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                newSurgList.Add(new SurgeryRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"{surgReqCode}{(i + 1):D3}",
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    RequestDate = today.AddHours(7 + i),
                    SurgeryType = surgTypes[i % surgTypes.Length],
                    RequestingDoctorId = docIdsAll[i % docIdsAll.Count],
                    Priority = i == 0 ? 3 : 1,
                    Status = i == 0 ? 1 : 0,
                    PreOpDiagnosis = r.InitialDiagnosis,
                    PreOpIcdCode = r.MainIcdCode,
                    PlannedProcedure = procedures[i % procedures.Length],
                    EstimatedDuration = 60 + (i * 30),
                    AnesthesiaType = i == 2 ? 1 : 2,
                    Notes = "Bệnh nhân ổn định, chuẩn bị phẫu thuật",
                    CreatedAt = now, UpdatedAt = now
                });
                newSurgRequests++;
            }
            if (newSurgList.Count > 0)
            {
                _db.SurgeryRequests.AddRange(newSurgList);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE SurgeryRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {surgReqCode + "%"}");
            }
        }

        // ==== QueueTickets - reception counters + emergency ====
        if (await _db.QueueTickets.CountAsync(q => q.IssueDate >= today && q.IssueDate < today.AddDays(1)) < 5
            && todayRecords.Count > 0)
        {
            var newQ = new List<QueueTicket>();
            for (int i = 0; i < Math.Min(40, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                newQ.Add(new QueueTicket
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = $"R{(i + 1):D4}",
                    QueueNumber = i + 1,
                    IssueDate = today.AddMinutes(i * 5),
                    QueueType = 1,
                    Priority = 0,
                    Status = i < 30 ? 3 : 0,
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    CreatedAt = now, UpdatedAt = now
                });
                newQueueTickets++;
            }
            for (int i = 0; i < Math.Min(5, todayPatientIds.Count); i++)
            {
                newQ.Add(new QueueTicket
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = $"CC{(i + 1):D3}",
                    QueueNumber = 900 + i,
                    IssueDate = today.AddHours(6 + i),
                    QueueType = 3,
                    Priority = 2,
                    Status = 2,
                    PatientId = todayPatientIds[i],
                    CreatedAt = now, UpdatedAt = now
                });
                newQueueTickets++;
            }
            if (newQ.Count > 0)
            {
                _db.QueueTickets.AddRange(newQ);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE QueueTickets SET CreatedAt = {now}, UpdatedAt = {now} WHERE IssueDate >= {today} AND IssueDate < {today.AddDays(1)}");
            }
        }

        // IncidentReport - Quality page
        if (await _db.IncidentReports.CountAsync(i => i.ReportCode.StartsWith($"INC{today:yyyyMMdd}SEED")) == 0
            && docIdsAll.Count > 0 && deptIdsAll.Count > 0)
        {
            var incTypes = new[] { "Medication", "Fall", "Infection", "Equipment", "Process" };
            var severity = new[] { "Minor", "Moderate", "Minor", "Near-miss", "Minor" };
            for (int i = 0; i < 5; i++)
            {
                _db.IncidentReports.Add(new IncidentReport
                {
                    Id = Guid.NewGuid(),
                    ReportCode = $"INC{today:yyyyMMdd}SEED{(i + 1):D3}",
                    IncidentDate = today.AddHours(-i),
                    ReportDate = today,
                    ReportedById = docIdsAll[i % docIdsAll.Count],
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    PatientId = todayPatientIds.Count > 0 ? todayPatientIds[i % todayPatientIds.Count] : (Guid?)null,
                    IncidentType = incTypes[i % incTypes.Length],
                    Severity = severity[i % severity.Length],
                    HarmLevel = "None",
                    Description = $"Báo cáo sự cố thử nghiệm #{i + 1}: {incTypes[i % incTypes.Length]}",
                    ImmediateActions = "Đã xử lý theo quy trình",
                    Status = i < 2 ? "Reported" : "UnderInvestigation",
                    CreatedAt = now, UpdatedAt = now
                });
                newIncidents++;
            }
        }

        // RehabReferral
        if (await _db.RehabReferrals.CountAsync(r => r.ReferralCode.StartsWith($"REH{today:yyyyMMdd}SEED")) == 0
            && docIdsAll.Count > 0 && todayPatientIds.Count > 0)
        {
            var rehabTypes = new[] { "PT", "OT", "ST" };
            var rehabDiag = new[] { "Thoái hoá cột sống", "Đột quỵ", "Thoát vị đĩa đệm", "Liệt nửa người", "Viêm khớp" };
            for (int i = 0; i < 5; i++)
            {
                _db.RehabReferrals.Add(new RehabReferral
                {
                    Id = Guid.NewGuid(),
                    ReferralCode = $"REH{today:yyyyMMdd}SEED{(i + 1):D3}",
                    PatientId = todayPatientIds[i % todayPatientIds.Count],
                    ReferredById = docIdsAll[i % docIdsAll.Count],
                    RehabType = rehabTypes[i % rehabTypes.Length],
                    Diagnosis = rehabDiag[i % rehabDiag.Length],
                    IcdCode = "M54",
                    Reason = "Chỉ định phục hồi chức năng sau điều trị cấp",
                    Goals = "Phục hồi vận động, giảm đau",
                    Status = i < 2 ? "Pending" : "Accepted",
                    CreatedAt = now, UpdatedAt = now
                });
                newRehab++;
            }
        }

        // SigningRequest - Signing Workflow page
        if (await _db.SigningRequests.CountAsync(s => s.DocumentTitle.Contains($"SEED-{today:yyyyMMdd}")) == 0
            && docIdsAll.Count >= 2)
        {
            var docTypes = new[] { "TreatmentSheet", "NursingCare", "Prescription", "LabResult", "DischargeNote" };
            for (int i = 0; i < 6; i++)
            {
                _db.SigningRequests.Add(new SigningRequest
                {
                    Id = Guid.NewGuid(),
                    DocumentType = docTypes[i % docTypes.Length],
                    DocumentId = Guid.NewGuid(),
                    DocumentTitle = $"{docTypes[i % docTypes.Length]} SEED-{today:yyyyMMdd}-{(i + 1):D3}",
                    DocumentContent = $"<p>Nội dung tài liệu cần ký số {i + 1}</p>",
                    SubmittedById = docIdsAll[i % docIdsAll.Count],
                    SubmittedByName = "Bác sĩ điều trị",
                    AssignedToId = docIdsAll[(i + 1) % docIdsAll.Count],
                    AssignedToName = "Trưởng khoa",
                    Status = i < 4 ? 0 : 1,
                    SignedAt = i >= 4 ? now : (DateTime?)null,
                    PatientId = todayPatientIds.Count > 0 ? todayPatientIds[i % todayPatientIds.Count] : (Guid?)null,
                    PatientName = "BN thử nghiệm",
                    DepartmentName = "Nội tổng quát",
                    CreatedAt = now, UpdatedAt = now
                });
                newSigning++;
            }
        }

        // SatisfactionSurveyResult - page reads this
        if (await _db.SatisfactionSurveyResults.CountAsync() == 0 && todayPatientIds.Count > 0)
        {
            var feedback = new[]
            {
                "Bác sĩ tận tình, nhân viên thân thiện",
                "Thời gian chờ hơi lâu nhưng chất lượng tốt",
                "Phòng khám sạch sẽ, trang thiết bị hiện đại",
                "Rất hài lòng với dịch vụ",
                "Nhân viên hướng dẫn chu đáo",
                "Giá cả hợp lý, minh bạch",
                "Cần cải thiện nhà vệ sinh",
                "Chất lượng điều trị tốt"
            };
            for (int i = 0; i < 10; i++)
            {
                _db.SatisfactionSurveyResults.Add(new SatisfactionSurveyResult
                {
                    Id = Guid.NewGuid(),
                    TemplateName = i % 3 == 0 ? "Khảo sát ngoại trú" : (i % 3 == 1 ? "Khảo sát nội trú" : "Khảo sát cấp cứu"),
                    PatientId = todayPatientIds[i % todayPatientIds.Count],
                    PatientName = $"Bệnh nhân {(i + 1):D3}",
                    PatientCode = $"BN{today:yyyyMMdd}SEED{((i % todayPatientIds.Count) + 1):D3}",
                    DepartmentId = deptIdsAll.Count > 0 ? deptIdsAll[i % deptIdsAll.Count] : null,
                    DepartmentName = "Nội tổng quát",
                    OverallScore = 4.0 + (i % 2) * 0.5,
                    Answers = "{\"q1\":5,\"q2\":4,\"q3\":4,\"q4\":5}",
                    Comment = feedback[i % feedback.Length],
                    CreatedAt = now, UpdatedAt = now
                });
                newSurvey++;
            }
        }

        // ProcurementRequest
        if (await _db.ProcurementRequests.CountAsync(p => p.RequestCode.StartsWith($"PR{today:yyyyMMdd}SEED")) == 0
            && deptIdsAll.Count > 0 && docIdsAll.Count > 0)
        {
            for (int i = 0; i < 4; i++)
            {
                _db.ProcurementRequests.Add(new ProcurementRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"PR{today:yyyyMMdd}SEED{(i + 1):D3}",
                    RequestDate = today,
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    RequestedById = docIdsAll[i % docIdsAll.Count],
                    Status = i % 4,
                    TotalAmount = 5_000_000m * (i + 1),
                    Notes = "Đề xuất mua sắm vật tư/thuốc",
                    CreatedAt = now, UpdatedAt = now
                });
                newProc++;
            }
        }

        // MedicalRecordArchive
        if (await _db.MedicalRecordArchives.CountAsync(a => a.ArchiveCode.StartsWith($"ARC{today:yyyyMMdd}SEED")) == 0
            && todayRecords.Count > 0)
        {
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                _db.MedicalRecordArchives.Add(new MedicalRecordArchive
                {
                    Id = Guid.NewGuid(),
                    ArchiveCode = $"ARC{today:yyyyMMdd}SEED{(i + 1):D3}",
                    MedicalRecordId = r.Id,
                    PatientId = r.PatientId,
                    DepartmentId = r.DepartmentId,
                    Diagnosis = r.InitialDiagnosis,
                    TreatmentResult = "Khỏi",
                    AdmissionDate = today,
                    DischargeDate = today,
                    StorageLocation = "Kho A",
                    ShelfNumber = $"Kệ {(i / 3) + 1}",
                    BoxNumber = $"Hộp {i + 1}",
                    Status = 1,
                    ArchivedDate = today,
                    ArchiveYear = today.Year,
                    CreatedAt = now, UpdatedAt = now
                });
                newArchive++;
            }
        }

        // ---- One-time master data ----

        // HIEConnection
        int newHie = 0;
        if (await _db.HIEConnections.CountAsync() == 0)
        {
            var conns = new (string name, string type, string url)[]
            {
                ("Cổng giám định BHXH", "BHXH", "https://gdbhyt.baohiemxahoi.gov.vn/api"),
                ("Cổng Bộ Y tế", "BYT", "https://portal.moh.gov.vn/api"),
                ("Sở Y tế TP.HCM", "SYT", "https://syt.hochiminhcity.gov.vn/api"),
                ("BV Chợ Rẫy - Liên thông", "Hospital", "https://choray.vn/hie"),
            };
            foreach (var (name, type, url) in conns)
            {
                _db.HIEConnections.Add(new HIEConnection
                {
                    Id = Guid.NewGuid(),
                    ConnectionName = name,
                    ConnectionType = type,
                    EndpointUrl = url,
                    AuthType = "OAuth2",
                    ClientId = $"HIS_CLIENT_{type}",
                    Status = "Active",
                    CreatedAt = now, UpdatedAt = now
                });
                newHie++;
            }
        }

        // TrainingClass - one time
        int newTraining = 0;
        if (await _db.TrainingClasses.CountAsync() == 0 && deptIdsAll.Count > 0)
        {
            var classes = new[]
            {
                ("Đào tạo hồi sức tim phổi (CPR)", 1, 15m),
                ("CME - Cập nhật điều trị tiểu đường type 2", 3, 8m),
                ("Kỹ thuật chăm sóc vết thương", 1, 12m),
                ("An toàn thuốc và phòng sai sót y khoa", 1, 10m),
            };
            for (int i = 0; i < classes.Length; i++)
            {
                _db.TrainingClasses.Add(new TrainingClass
                {
                    Id = Guid.NewGuid(),
                    ClassCode = $"TC{today:yyyyMM}{(i + 1):D3}",
                    ClassName = classes[i].Item1,
                    TrainingType = classes[i].Item2,
                    StartDate = today.AddDays(7 + i * 3),
                    EndDate = today.AddDays(7 + i * 3 + 1),
                    MaxStudents = 30,
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    InstructorId = docIdsAll.Count > 0 ? docIdsAll[i % docIdsAll.Count] : null,
                    Description = "Lớp đào tạo theo kế hoạch",
                    CreditHours = classes[i].Item3,
                    Status = 1,
                    Fee = 0,
                    CreatedAt = now, UpdatedAt = now
                });
                newTraining++;
            }
        }

        // ResearchProject - one time
        int newResearch = 0;
        if (await _db.ResearchProjects.CountAsync() == 0)
        {
            var projects = new[]
            {
                ("Đánh giá hiệu quả phác đồ điều trị viêm phổi cộng đồng", 3),
                ("Nghiên cứu dịch tễ bệnh đái tháo đường tại địa phương", 2),
                ("Ứng dụng AI trong chẩn đoán hình ảnh X-quang phổi", 3),
            };
            for (int i = 0; i < projects.Length; i++)
            {
                _db.ResearchProjects.Add(new ResearchProject
                {
                    Id = Guid.NewGuid(),
                    ProjectCode = $"NCKH{today.Year}{(i + 1):D3}",
                    Title = projects[i].Item1,
                    Level = projects[i].Item2,
                    PrincipalInvestigatorId = docIdsAll.Count > 0 ? docIdsAll[i % docIdsAll.Count] : null,
                    StartDate = today.AddMonths(-3),
                    EndDate = today.AddMonths(9),
                    Budget = 50_000_000m * (i + 1),
                    Status = i + 1,
                    Abstract = "Đề tài nghiên cứu khoa học cấp cơ sở",
                    CreatedAt = now, UpdatedAt = now
                });
                newResearch++;
            }
        }

        // IvfPatientCouple + IvfCycle - Ivf Lab page
        int newIvfCouples = 0, newIvfCycles = 0;
        if (await _db.IvfPatientCouples.CountAsync() == 0 && todayPatientIds.Count >= 6)
        {
            for (int i = 0; i < Math.Min(4, todayPatientIds.Count / 2); i++)
            {
                var coupleId = Guid.NewGuid();
                _db.IvfPatientCouples.Add(new IvfPatientCouple
                {
                    Id = coupleId,
                    WifePatientId = todayPatientIds[i * 2],
                    HusbandPatientId = todayPatientIds[i * 2 + 1],
                    InfertilityDurationMonths = 24 + i * 12,
                    InfertilityCause = new[] { "Vô sinh không rõ nguyên nhân", "Tắc vòi trứng", "Tinh trùng yếu", "Lạc nội mạc tử cung" }[i],
                    MarriageDate = today.AddYears(-(3 + i)),
                    Notes = "Cặp đôi hiếm muộn",
                    CreatedAt = now, UpdatedAt = now
                });
                newIvfCouples++;

                _db.IvfCycles.Add(new IvfCycle
                {
                    Id = Guid.NewGuid(),
                    CoupleId = coupleId,
                    CycleNumber = 1,
                    StartDate = today.AddDays(-(10 + i * 5)),
                    Status = 1 + i, // 1-Active, 2-OvumPickup, 3-Fertilization, 4-Transfer
                    Protocol = new[] { "Long protocol", "Short protocol", "Antagonist", "Natural cycle" }[i],
                    DoctorId = docIdsAll.Count > 0 ? docIdsAll[i % docIdsAll.Count] : null,
                    Notes = "Chu kỳ IVF đang theo dõi",
                    CreatedAt = now, UpdatedAt = now
                });
                newIvfCycles++;
            }
        }

        // RadiologyConsultationSession - Consultation page
        int newConsult = 0;
        if (await _db.RadiologyConsultationSessions.CountAsync() == 0 && docIdsAll.Count > 0)
        {
            var titles = new[]
            {
                "Hội chẩn CT sọ não BN nghi đột quỵ",
                "Hội chẩn MRI khớp gối chấn thương",
                "Hội chẩn X-quang phổi nghi lao",
                "Hội chẩn siêu âm tim BN suy tim",
                "Hội chẩn CT ngực nghi u phổi"
            };
            for (int i = 0; i < titles.Length; i++)
            {
                _db.RadiologyConsultationSessions.Add(new RadiologyConsultationSession
                {
                    Id = Guid.NewGuid(),
                    SessionCode = $"HC{today:yyyyMMdd}{(i + 1):D3}",
                    Title = titles[i],
                    Description = "Hội chẩn chuyên khoa chẩn đoán hình ảnh",
                    ScheduledStartTime = today.AddHours(8 + i * 2),
                    ScheduledEndTime = today.AddHours(9 + i * 2),
                    OrganizerId = docIdsAll[i % docIdsAll.Count],
                    LeaderId = docIdsAll[(i + 1) % docIdsAll.Count],
                    Status = i < 2 ? 1 : (i < 4 ? 2 : 3),
                    MeetingUrl = $"https://meet.his.local/hc-{i + 1}",
                    CreatedAt = now, UpdatedAt = now
                });
                newConsult++;
            }
        }

        // FixedAsset - one time
        int newAssets = 0;
        if (await _db.FixedAssets.CountAsync() == 0 && deptIdsAll.Count > 0)
        {
            var assets = new[]
            {
                ("Xe cứu thương Mercedes Sprinter", 2_800_000_000m, 120),
                ("Máy phát điện dự phòng 250kVA", 650_000_000m, 180),
                ("Hệ thống thang máy bệnh nhân", 1_200_000_000m, 240),
                ("Hệ thống khí y tế trung tâm", 800_000_000m, 240),
                ("Bàn mổ điện đa năng", 350_000_000m, 120),
                ("Máy giặt công nghiệp 50kg", 180_000_000m, 120),
            };
            for (int i = 0; i < assets.Length; i++)
            {
                var price = assets[i].Item2;
                var months = assets[i].Item3;
                _db.FixedAssets.Add(new FixedAsset
                {
                    Id = Guid.NewGuid(),
                    AssetCode = $"TS{today.Year}{(i + 1):D4}",
                    AssetName = assets[i].Item1,
                    OriginalValue = price,
                    CurrentValue = price * 0.8m,
                    PurchaseDate = today.AddYears(-(1 + i % 4)),
                    DepreciationMethod = 1,
                    UsefulLifeMonths = months,
                    MonthlyDepreciation = price / months,
                    AccumulatedDepreciation = price * 0.2m,
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    LocationDescription = $"Tầng {(i % 5) + 1}",
                    Status = 1,
                    CreatedAt = now, UpdatedAt = now
                });
                newAssets++;
            }
        }

        await _db.SaveChangesAsync();

        // Restamp CreatedAt on all newly-seeded rows so date filters match
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE IncidentReports SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReportCode LIKE {"INC" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE RehabReferrals SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReferralCode LIKE {"REH" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE SigningRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE DocumentTitle LIKE {"%SEED-" + today.ToString("yyyyMMdd") + "%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE SatisfactionSurveyResults SET CreatedAt = {now}, UpdatedAt = {now} WHERE PatientCode LIKE {"BN" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE ProcurementRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {"PR" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE MedicalRecordArchives SET CreatedAt = {now}, UpdatedAt = {now} WHERE ArchiveCode LIKE {"ARC" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE HIEConnections SET CreatedAt = {now}, UpdatedAt = {now}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE TrainingClasses SET CreatedAt = {now}, UpdatedAt = {now} WHERE ClassCode LIKE 'TC%'");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE ResearchProjects SET CreatedAt = {now}, UpdatedAt = {now} WHERE ProjectCode LIKE 'NCKH%'");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE FixedAssets SET CreatedAt = {now}, UpdatedAt = {now} WHERE AssetCode LIKE 'TS%'");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE IvfPatientCouples SET CreatedAt = {now}, UpdatedAt = {now}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE IvfCycles SET CreatedAt = {now}, UpdatedAt = {now}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE RadiologyConsultationSessions SET CreatedAt = {now}, UpdatedAt = {now} WHERE SessionCode LIKE {"HC" + today.ToString("yyyyMMdd") + "%"}");

        _logger.LogInformation(
            "Daily seed: {P} patients + {R} records + {E} exams + {T} tele + {Rx} rx + {Lab} lab + {Staff} staff + {Eq} equip + {Inc} incidents + {Reh} rehab + {Sign} signing + {Sur} survey + {Proc} proc + {Arc} archive + {Hie} hie + {Tr} training + {Res} research + {As} assets for {Date}",
            newPatients.Count, newRecords.Count, newExams.Count, newTele.Count, newRx.Count, newLab.Count, newStaff.Count, newEquip.Count,
            newIncidents, newRehab, newSigning, newSurvey, newProc, newArchive, newHie, newTraining, newResearch, newAssets, today);

        return Ok(new
        {
            createdPatients = newPatients.Count,
            createdRecords = newRecords.Count,
            createdExams = newExams.Count,
            createdTeleAppointments = newTele.Count,
            createdPrescriptions = newRx.Count,
            createdLabRequests = newLab.Count,
            createdStaff = newStaff.Count,
            createdEquipment = newEquip.Count,
            createdIncidents = newIncidents,
            createdRehab = newRehab,
            createdSigning = newSigning,
            createdSurveys = newSurvey,
            createdProcurement = newProc,
            createdArchive = newArchive,
            createdHIE = newHie,
            createdTraining = newTraining,
            createdResearch = newResearch,
            createdAssets = newAssets,
            createdIvfCouples = newIvfCouples,
            createdIvfCycles = newIvfCycles,
            createdConsultations = newConsult,
            createdAdmissions = newAdmissions,
            createdDischarges = newDischarges,
            createdReceipts = newReceipts,
            createdServiceRequests = newSvcRequests,
            createdRadiologyRequests = newRadRequests,
            createdSurgeryRequests = newSurgRequests,
            createdQueueTickets = newQueueTickets,
            date = today,
            totalTodayAfter = existingToday + newPatients.Count
        });
    }
}
