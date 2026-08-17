using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class DailySeedServiceImpl : HIS.Application.Services.IDailySeedService
{
    private readonly HISDbContext _db;
    private readonly ILogger<DailySeedServiceImpl> _logger;

    public DailySeedServiceImpl(HISDbContext db, ILogger<DailySeedServiceImpl> logger)
    {
        _db = db;
        _logger = logger;
    }

    // Shared shape for "today's" MedicalRecords, used by the seed sub-blocks that were
    // split into DailySeedServiceImpl.*.cs partial files (an anonymous type cannot be
    // named as a parameter type across files, so it is promoted to a private record).
    private sealed record SeedTodayRecord(Guid Id, Guid PatientId, Guid? DepartmentId, string? MainIcdCode, string? InitialDiagnosis);

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
    /// <summary>
    /// Sinh số thẻ BHYT 15 ký tự hợp lệ theo <see cref="BhytCardNumber"/> (QĐ 1351/QĐ-BHXH):
    /// 2 chữ mã đối tượng + 1 số mức hưởng (1-5) + 2 số mã tỉnh + 10 số định danh.
    /// Mã đối tượng và mức hưởng chọn theo tuổi để dữ liệu demo không mâu thuẫn nghiệp vụ
    /// (trẻ dưới 6 tuổi hưởng 100%, hưu trí 95%, còn lại 80%).
    /// </summary>
    private static string BuildBhytCard(Random rng, int ageYears)
    {
        var (subjectCode, benefitLevel) = ageYears switch
        {
            < 6 => ("TE", '1'),   // trẻ em dưới 6 tuổi — 100%
            < 23 => ("HS", '4'),  // học sinh, sinh viên — 80%
            >= 60 => ("HT", '3'), // hưu trí — 95%
            _ => (rng.Next(2) == 0 ? "DN" : "GD", '4') // lao động DN / hộ gia đình — 80%
        };
        // 79 = mã tỉnh TP.HCM, khớp ProvinceName của bệnh nhân seed.
        return $"{subjectCode}{benefitLevel}79{rng.NextInt64(0, 10_000_000_000L):D10}";
    }

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

    /// <summary>
    /// Core daily-seed logic, callable in-process (e.g. by DailyDemoSeedWorker) without
    /// an HttpContext. Returns the seed summary object, or <c>null</c> when there are no
    /// active examination rooms to attach today's medical records to.
    /// </summary>
    public async Task<object?> RunDailySeedAsync(int count = 30, bool purge = false)
    {
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
                _db.MedicalRecordArchives.RemoveRange(_db.MedicalRecordArchives.Where(a => seedRecords.Contains(a.MedicalRecordId)));
                _db.TeleAppointments.RemoveRange(_db.TeleAppointments.Where(t => seedPatientIds.Contains(t.PatientId)));
                _db.IncidentReports.RemoveRange(_db.IncidentReports.Where(i => i.PatientId != null && seedPatientIds.Contains(i.PatientId.Value)));
                _db.RehabReferrals.RemoveRange(_db.RehabReferrals.Where(r => seedPatientIds.Contains(r.PatientId)));
                _db.SigningRequests.RemoveRange(_db.SigningRequests.Where(s => s.PatientId != null && seedPatientIds.Contains(s.PatientId.Value)));
                _db.SatisfactionSurveyResults.RemoveRange(_db.SatisfactionSurveyResults.Where(s => s.PatientId != null && seedPatientIds.Contains(s.PatientId.Value)));
                _db.ObservationStays.RemoveRange(_db.ObservationStays.Where(o => seedPatientIds.Contains(o.PatientId)));
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
            return null;

        var rng = new Random(today.DayOfYear);
        var toCreate = Math.Max(0, count - existingToday);
        var newPatients = new List<Patient>(toCreate);
        var newRecords = new List<MedicalRecord>(toCreate);
        var newExams = new List<Examination>();
        // CreatedAt/UpdatedAt lưu UTC — convention app-wide (HISDbContext auto-audit dùng
        // DateTime.UtcNow; GetTodayAdmissionsAsync lọc theo VnTime.DayRangeUtc). Ghi VN
        // wall-clock ở đây làm bản ghi seed sau 17:00 VN rơi ra ngoài khung "hôm nay" (#466).
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

            // Đối tượng thanh toán phải chốt TRƯỚC khi dựng Patient: BN diện BHYT bắt buộc có
            // số thẻ, nếu không màn Tiếp Đón hiện "đối tượng BHYT" mà ô số thẻ trống — mâu thuẫn
            // nghiệp vụ lộ ngay trên lưới danh sách.
            var patientType = rng.Next(2) == 0 ? 1 : 2; // 1 BHYT, 2 Viện phí
            var ageYears = now.Year - year;
            var insuranceNumber = patientType == 1 ? BuildBhytCard(rng, ageYears) : null;

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
                InsuranceNumber = insuranceNumber,
                InsuranceExpireDate = insuranceNumber is null ? null : today.AddMonths(rng.Next(3, 25)),
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
                PatientType = patientType, // 1 BHYT (đã sinh kèm số thẻ ở trên), 2 Viện phí
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

        // #14e: seed LabRequests (model 2) đã gỡ — data XN demo do block ServiceRequests (AddSvc 'L', RequestType=1) đảm nhiệm

        // ---- Module workflow data (Quality, Rehab, Signing, Survey, Procurement, Archive) ----

        var docIdsAll = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).Take(10).ToListAsync();
        var deptIdsAll = await _db.Departments.Where(d => d.IsActive).Select(d => d.Id).Take(8).ToListAsync();
        var todayPatientIds = await _db.Patients
            .Where(p => p.PatientCode.StartsWith($"BN{today:yyyyMMdd}SEED"))
            .Select(p => p.Id).Take(30).ToListAsync();
        var todayRecords = await _db.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))
            .Select(m => new SeedTodayRecord(m.Id, m.PatientId, m.DepartmentId, m.MainIcdCode, m.InitialDiagnosis))
            .Take(30).ToListAsync();

        int newIncidents, newRehab, newSigning, newSurvey, newProc, newArchive, newObservation;
        int newAdmissions, newDischarges, newReceipts, newSvcRequests,
            newRadRequests, newSurgRequests, newQueueTickets;

        // ==== Admissions + Discharges - split to DailySeedServiceImpl.Ipd.cs (task #364 wave-6) ====
        (newAdmissions, newDischarges) = await SeedAdmissionsAndDischargesAsync(today, now, rng, docIdsAll, deptIdsAll, todayRecords);

        // ==== Receipts/ServiceRequests/RadiologyRequests/SurgeryRequests/QueueTickets -
        // split to DailySeedServiceImpl.ClinicalOrders.cs (task #364 wave-6) ====
        (newReceipts, newSvcRequests, newRadRequests, newSurgRequests, newQueueTickets) =
            await SeedClinicalOrdersAsync(today, now, docIdsAll, deptIdsAll, todayRecords, todayPatientIds);

        // ==== IncidentReport/ObservationStay/RehabReferral/SigningRequest/
        // SatisfactionSurveyResult/ProcurementRequest/MedicalRecordArchive -
        // split to DailySeedServiceImpl.Modules.cs (task #364 wave-6) ====
        (newIncidents, newRehab, newSigning, newSurvey, newProc, newArchive, newObservation) =
            await SeedModuleWorkflowAsync(today, now, docIdsAll, deptIdsAll, todayPatientIds, todayRecords);

        // ---- One-time master data ----

        // ==== HIEConnection/TrainingClass/ResearchProject/Ivf/RadiologyConsultationSession/
        // FixedAsset - split to DailySeedServiceImpl.MasterData.cs (task #364 wave-6) ====
        (int newHie, int newTraining, int newResearch, int newIvfCouples, int newIvfCycles, int newConsult, int newAssets) =
            await SeedMasterDataAsync(today, now, docIdsAll, deptIdsAll, todayPatientIds);

        await _db.SaveChangesAsync();

        // Restamp CreatedAt on all newly-seeded rows so date filters match
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE IncidentReports SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReportCode LIKE {"INC" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE RehabReferrals SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReferralCode LIKE {"REH" + today.ToString("yyyyMMdd") + "SEED%"}");
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE ObservationStays SET CreatedAt = {now}, UpdatedAt = {now} WHERE StayCode LIKE {"OBS" + today.ToString("yyyyMMdd") + "SEED%"}");
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
            newPatients.Count, newRecords.Count, newExams.Count, newTele.Count, newRx.Count, newSvcRequests, newStaff.Count, newEquip.Count,
            newIncidents, newRehab, newSigning, newSurvey, newProc, newArchive, newHie, newTraining, newResearch, newAssets, today);

        return new
        {
            createdPatients = newPatients.Count,
            createdRecords = newRecords.Count,
            createdExams = newExams.Count,
            createdTeleAppointments = newTele.Count,
            createdPrescriptions = newRx.Count,
            createdLabRequests = 0, // #14e: model 2 đã gỡ — XN demo nằm trong createdServiceRequests
            createdStaff = newStaff.Count,
            createdEquipment = newEquip.Count,
            createdIncidents = newIncidents,
            createdRehab = newRehab,
            createdSigning = newSigning,
            createdSurveys = newSurvey,
            createdProcurement = newProc,
            createdArchive = newArchive,
            createdObservationStays = newObservation,
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
        };
    }
}
