using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // REHAB SESSIONS
    // ==========================================================================
    public async Task<object> PopulateRehabSessionsAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(29);

        if (!await _db.RehabSessions.AnyAsync())
        {
            var plans = await _db.RehabTreatmentPlans.Take(20).Select(p => new { p.Id, TherapistId = p.CreatedById }).ToListAsync();
            if (plans.Count == 0) return Ok(new { error = "no treatment plans" });

            var interventions = new[] {
                "Kéo giãn cột sống, xoa bóp cơ cạnh sống",
                "Tập vận động khớp vai thụ động và chủ động",
                "Tập đi bộ với khung có hỗ trợ",
                "Điện xung giảm đau, siêu âm điều trị",
                "Tập nuốt, tập nói trước gương",
                "Tập ngồi dậy từ giường, chuyển vị sang xe lăn" };
            var exercises = new[] {
                "Gập gối 3 hiệp x 15 lần",
                "Xoay vai nhẹ nhàng 10 vòng mỗi bên",
                "Đi lại 10 phút trong hành lang",
                "Tập thở bụng 5 phút x 3 lần/ngày" };
            var modalities = new[] { "Heat, TENS", "Ultrasound, Laser", "Parafin, Interferential", "Hot pack, Electrical Stim" };
            var sessions = new List<RehabSession>();
            foreach (var plan in plans)
            {
                int n = rng.Next(8, 18);
                for (int i = 0; i < n; i++)
                {
                    var date = ctx.Now.AddDays(-(n - i - 1) * 2);
                    var startH = 8 + rng.Next(0, 8);
                    var durMin = 30 + rng.Next(0, 4) * 15;
                    bool completed = date < ctx.Now.AddDays(-1);
                    sessions.Add(new RehabSession
                    {
                        Id = Guid.NewGuid(),
                        TreatmentPlanId = plan.Id,
                        SessionNumber = i + 1,
                        SessionDate = date,
                        StartTime = new TimeSpan(startH, 0, 0),
                        EndTime = completed ? new TimeSpan(startH, durMin, 0) : null,
                        DurationMinutes = completed ? durMin : null,
                        TherapistId = plan.TherapistId,
                        Status = completed ? "Completed" : (date.Date == ctx.Now.Date ? "Scheduled" : "Scheduled"),
                        InterventionsProvided = interventions[i % interventions.Length],
                        ExercisesPerformed = exercises[i % exercises.Length],
                        ModalitiesUsed = modalities[i % modalities.Length],
                        PatientResponse = completed ? (i % 5 == 0 ? "BN đau nhẹ sau tập, đã xử trí" : "BN hợp tác tốt, chịu đựng tốt") : null,
                        ProgressNotes = completed ? "Cải thiện ROM khớp gối ~10 độ so với tuần trước" : null,
                        GoalProgress = completed ? (i % 3 == 0 ? "Met" : "Making progress") : null,
                        HomeExercises = "Tự tập gập gối và duỗi gối 3 hiệp x 10 lần tại nhà",
                        CreatedAt = date.AddHours(startH), UpdatedAt = date.AddHours(startH)
                    });
                }
            }
            _db.RehabSessions.AddRange(sessions);
            await _db.SaveChangesAsync();
            summary["RehabSessions"] = sessions.Count;
        }

        return Ok(new { module = "rehab-sessions", inserted = summary });
    }

    // ==========================================================================
    // TELE SESSIONS
    // ==========================================================================
    public async Task<object> PopulateTeleSessionsAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(31);

        if (!await _db.TeleSessions.AnyAsync())
        {
            var appts = await _db.TeleAppointments.Take(30)
                .Select(a => new { a.Id, a.AppointmentDate, a.StartTime }).ToListAsync();
            if (appts.Count == 0) return Ok(new { error = "no tele appointments" });

            var sessions = new List<TeleSession>();
            foreach (var a in appts)
            {
                var apptDateTime = a.AppointmentDate.Date + a.StartTime;
                bool past = apptDateTime < ctx.Now;
                var start = past ? apptDateTime.AddMinutes(rng.Next(-3, 5)) : (DateTime?)null;
                var dur = past ? rng.Next(12, 45) : (int?)null;
                sessions.Add(new TeleSession
                {
                    Id = Guid.NewGuid(),
                    SessionCode = NextCode("TS", sessions.Count + 1),
                    AppointmentId = a.Id,
                    RoomId = $"room-{Guid.NewGuid().ToString()[..8]}",
                    Status = past ? "Completed" : "Waiting",
                    StartTime = start,
                    EndTime = past ? start?.AddMinutes(dur ?? 0) : null,
                    DurationMinutes = dur,
                    IsRecorded = rng.Next(0, 3) == 0,
                    RecordingUrl = rng.Next(0, 3) == 0 ? $"https://storage/teleconsult/{Guid.NewGuid()}.mp4" : null,
                    ConnectionQuality = past ? new[] { "Excellent", "Good", "Good", "Fair" }[rng.Next(4)] : null,
                    CreatedAt = apptDateTime, UpdatedAt = ctx.Now
                });
            }
            _db.TeleSessions.AddRange(sessions);
            await _db.SaveChangesAsync();
            summary["TeleSessions"] = sessions.Count;
        }

        return Ok(new { module = "tele-sessions", inserted = summary });
    }

    // ==========================================================================
    // DIET ORDERS
    // ==========================================================================
    public async Task<object> PopulateDietOrdersAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(37);

        if (!await _db.DietOrders.AnyAsync() && ctx.AdmissionIds.Count > 0)
        {
            var dietTypes = await _db.DietTypes.Take(10).Select(d => d.Id).ToListAsync();
            if (dietTypes.Count == 0) return Ok(new { error = "no diet types" });

            var orders = new List<DietOrder>();
            int seq = 0;
            foreach (var admId in ctx.AdmissionIds.Take(30))
            {
                seq++;
                var start = ctx.Now.AddDays(-rng.Next(0, 10));
                orders.Add(new DietOrder
                {
                    Id = Guid.NewGuid(),
                    OrderCode = NextCode("DO", seq, 4),
                    AdmissionId = admId,
                    PatientId = ctx.AdmissionToPatient[admId],
                    DietTypeId = dietTypes[seq % dietTypes.Count],
                    OrderedById = ctx.DoctorIds[seq % ctx.DoctorIds.Count],
                    StartDate = start,
                    EndDate = null,
                    Status = "Active",
                    TextureModification = new[] { "Regular", "Soft", "Pureed", "Liquid" }[seq % 4],
                    FluidConsistency = seq % 5 == 0 ? "Nectar" : "Thin",
                    Allergies = seq % 7 == 0 ? "Hải sản, trứng" : null,
                    FoodPreferences = seq % 4 == 0 ? "Không ăn cay" : null,
                    Restrictions = seq % 3 == 0 ? "Hạn chế muối < 5g/ngày" : null,
                    TargetCalories = 1500 + rng.Next(0, 800),
                    TargetProtein = 45 + rng.Next(0, 40),
                    SpecialInstructions = seq % 5 == 0 ? "Chia 6 bữa nhỏ, đo đường huyết trước mỗi bữa" : null,
                    CreatedAt = start, UpdatedAt = start
                });
            }
            _db.DietOrders.AddRange(orders);
            await _db.SaveChangesAsync();
            summary["DietOrders"] = orders.Count;
        }

        return Ok(new { module = "diet-orders", inserted = summary });
    }

    // ==========================================================================
    // PREREQUISITES: DietTypes + RehabTreatmentPlans (needed by diet/rehab modules)
    // ==========================================================================
    public async Task<object> PopulatePrereqsAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(43);

        // DietTypes — master-data catalogue, needs at least a dozen options
        var dietTypes = new[] {
            ("DT-01","Chế độ ăn thường","Cơm, thịt, rau — đầy đủ dinh dưỡng chung", 2000m, 70m, "Regular"),
            ("DT-02","Chế độ đái tháo đường","Ít đường, ít tinh bột, ăn chia nhỏ bữa", 1600m, 75m, "DM"),
            ("DT-03","Chế độ tăng huyết áp","Giảm muối < 5g/ngày, ít mỡ động vật", 1800m, 65m, "HTN"),
            ("DT-04","Chế độ thận","Hạn chế đạm, kali, phospho", 1700m, 45m, "Renal"),
            ("DT-05","Chế độ gan","Hạn chế đạm, natri, tăng đường tiêu hóa", 1800m, 55m, "Hepatic"),
            ("DT-06","Chế độ mỡ máu","Giảm chất béo bão hòa, tăng rau xanh", 1700m, 65m, "Lipid"),
            ("DT-07","Chế độ hậu phẫu","Giàu đạm, dễ tiêu hóa", 2200m, 90m, "Post-op"),
            ("DT-08","Chế độ mềm","Cháo, súp, thức ăn xay nhuyễn", 1800m, 60m, "Soft"),
            ("DT-09","Chế độ lỏng toàn phần","Nước cháo, nước dùng, sữa", 1200m, 40m, "Full liquid"),
            ("DT-10","Chế độ nhịn ăn","NPO - chuẩn bị phẫu thuật/nội soi", 0m, 0m, "NPO"),
            ("DT-11","Chế độ trẻ em","Ít muối, đủ canxi, nhiều rau-quả", 1400m, 50m, "Pediatric"),
            ("DT-12","Chế độ thai phụ","Bổ sung sắt, axit folic, canxi", 2300m, 80m, "Maternal")
        };
        var existing = await _db.DietTypes.Select(d => d.Code).ToListAsync();
        var added = new List<DietType>();
        foreach (var t in dietTypes)
        {
            if (existing.Contains(t.Item1)) continue;
            added.Add(new DietType
            {
                Id = Guid.NewGuid(),
                Code = t.Item1,
                Name = t.Item2,
                Description = t.Item3,
                BaseCalories = t.Item4,
                Category = t.Item6,
                IsActive = true,
                CreatedAt = ctx.Now.AddMonths(-6), UpdatedAt = ctx.Now
            });
        }
        if (added.Count > 0)
        {
            _db.DietTypes.AddRange(added);
            await _db.SaveChangesAsync();
            summary["DietTypes"] = added.Count;
        }

        // RehabTreatmentPlans — needed before RehabSessions
        if (!await _db.RehabTreatmentPlans.AnyAsync())
        {
            var referrals = await _db.RehabReferrals.Take(20)
                .Select(r => new { r.Id, r.CreatedBy }).ToListAsync();
            if (referrals.Count > 0)
            {
                var types = new[] { "PT", "OT", "ST" };
                var plans = new List<RehabTreatmentPlan>();
                int seq = 0;
                foreach (var r in referrals)
                {
                    seq++;
                    var start = ctx.Now.AddDays(-rng.Next(10, 60));
                    Guid therapistId = ctx.NurseIds.Count > 0
                        ? ctx.NurseIds[seq % ctx.NurseIds.Count]
                        : ctx.DoctorIds[seq % ctx.DoctorIds.Count];
                    plans.Add(new RehabTreatmentPlan
                    {
                        Id = Guid.NewGuid(),
                        PlanCode = NextCode("RHP", seq, 4),
                        ReferralId = r.Id,
                        CreatedById = therapistId,
                        RehabType = types[seq % types.Length],
                        PlannedSessions = 10 + rng.Next(0, 12),
                        CompletedSessions = rng.Next(2, 8),
                        Frequency = rng.Next(0, 2) == 0 ? "3x/week" : "2x/week",
                        DurationMinutesPerSession = 45,
                        StartDate = start,
                        ExpectedEndDate = start.AddDays(30 + rng.Next(0, 30)),
                        Status = "Active",
                        ShortTermGoals = "Giảm đau, tăng ROM khớp về mức bình thường",
                        LongTermGoals = "Phục hồi chức năng sinh hoạt hằng ngày, tự đi lại",
                        Interventions = "Bài tập vận động chủ động/thụ động, điện xung, siêu âm điều trị",
                        Precautions = "Tránh tải nặng đột ngột, theo dõi đau",
                        CreatedAt = start, UpdatedAt = ctx.Now
                    });
                }
                _db.RehabTreatmentPlans.AddRange(plans);
                await _db.SaveChangesAsync();
                summary["RehabTreatmentPlans"] = plans.Count;
            }
        }

        // MedicalEquipments — base table required by the equipment populate
        if (!await _db.MedicalEquipments.AnyAsync() && ctx.DepartmentIds.Count > 0)
        {
            var catalog = new[] {
                ("MÁY SIÊU ÂM", "Ultrasound Machine", "Diagnostic", "B", "GE", "Logiq P9", "USA"),
                ("MÁY X-QUANG", "X-Ray Machine", "Diagnostic", "C", "Siemens", "Ysio Max", "Germany"),
                ("MÁY CT SCANNER", "CT Scanner", "Diagnostic", "C", "Philips", "Incisive CT", "Netherlands"),
                ("MÁY MRI 1.5T", "MRI 1.5T", "Diagnostic", "C", "GE", "SIGNA Explorer", "USA"),
                ("MÁY NỘI SOI TIÊU HÓA", "Endoscope", "Diagnostic", "B", "Olympus", "CV-190", "Japan"),
                ("MÁY XÉT NGHIỆM SINH HÓA", "Chemistry Analyzer", "Diagnostic", "B", "Roche", "Cobas c501", "Switzerland"),
                ("MÁY XÉT NGHIỆM HUYẾT HỌC", "Hematology Analyzer", "Diagnostic", "B", "Sysmex", "XN-1000", "Japan"),
                ("MÁY ĐIỆN TIM", "ECG Machine", "Diagnostic", "A", "GE", "MAC 2000", "USA"),
                ("MÁY THỞ", "Ventilator", "Therapeutic", "C", "Drager", "Evita V500", "Germany"),
                ("MÁY SỐC TIM", "Defibrillator", "Therapeutic", "C", "Philips", "HeartStart XL+", "USA"),
                ("MONITOR BỆNH NHÂN", "Patient Monitor", "Monitoring", "B", "Mindray", "uMEC12", "China"),
                ("BƠM TIÊM ĐIỆN", "Syringe Pump", "Therapeutic", "B", "B.Braun", "Perfusor Space", "Germany"),
                ("ĐÈN MỔ", "Surgical Light", "Surgical", "B", "Maquet", "HiLED 500", "Germany"),
                ("DAO MỔ ĐIỆN", "Electrosurgical Unit", "Surgical", "C", "Valleylab", "Force FX", "USA"),
                ("BÀN MỔ ĐA NĂNG", "Operating Table", "Surgical", "B", "Maquet", "Magnus", "Germany"),
                ("MÁY GÂY MÊ", "Anesthesia Machine", "Surgical", "C", "GE", "Aisys CS2", "USA"),
                ("MÁY CHẠY THẬN", "Hemodialysis Machine", "Therapeutic", "C", "Fresenius", "4008S", "Germany"),
                ("MÁY ĐO ĐỘ LOÃNG XƯƠNG", "Bone Densitometer", "Diagnostic", "B", "Hologic", "Horizon DXA", "USA"),
            };
            var equipments = new List<MedicalEquipment>();
            for (int i = 0; i < catalog.Length; i++)
            {
                var c = catalog[i];
                var purchase = ctx.Now.AddMonths(-rng.Next(12, 72));
                var lastMaint = ctx.Now.AddDays(-rng.Next(15, 120));
                var lastCal = ctx.Now.AddDays(-rng.Next(60, 365));
                equipments.Add(new MedicalEquipment
                {
                    Id = Guid.NewGuid(),
                    EquipmentCode = NextCode("EQ", i + 1),
                    EquipmentName = c.Item1,
                    NameEnglish = c.Item2,
                    Category = c.Item3,
                    RiskClass = c.Item4,
                    Manufacturer = c.Item5,
                    Model = c.Item6,
                    CountryOfOrigin = c.Item7,
                    SerialNumber = $"SN{rng.Next(100000, 999999)}",
                    YearOfManufacture = purchase.Year,
                    DepartmentId = ctx.DepartmentIds[i % ctx.DepartmentIds.Count],
                    Location = $"Phòng {rng.Next(101, 599)}, Tầng {rng.Next(1, 6)}",
                    PurchaseDate = purchase,
                    PurchasePrice = rng.Next(50, 5000) * 1_000_000m,
                    PurchaseSource = "Vốn ngân sách nhà nước",
                    WarrantyExpiry = purchase.AddYears(rng.Next(1, 4)),
                    Status = i % 10 == 9 ? "InMaintenance" : "Active",
                    LastMaintenanceDate = lastMaint,
                    NextMaintenanceDate = lastMaint.AddMonths(3),
                    LastCalibrationDate = lastCal,
                    NextCalibrationDate = lastCal.AddYears(1),
                    TotalRuntimeHours = rng.Next(500, 15000),
                    UsageCount = rng.Next(100, 5000),
                    ExpectedLifeYears = 10,
                    CreatedAt = purchase, UpdatedAt = ctx.Now
                });
            }
            _db.MedicalEquipments.AddRange(equipments);
            await _db.SaveChangesAsync();
            summary["MedicalEquipments"] = equipments.Count;
        }

        // MedicalStaffs — derived from active Users so HR + CME pages populate
        if (!await _db.MedicalStaffs.AnyAsync())
        {
            var users = await _db.Users
                .Where(u => u.IsActive)
                .Select(u => new { u.Id, u.FullName, u.UserCode, u.EmployeeCode, u.LicenseNumber,
                    u.Title, u.Degree, u.Specialty, u.PhoneNumber, u.Email, u.DepartmentId, u.UserType,
                    u.CreatedAt })
                .Take(50)
                .ToListAsync();
            if (users.Count > 0)
            {
                var staffs = new List<MedicalStaff>();
                int seq = 0;
                foreach (var u in users)
                {
                    seq++;
                    var joinDate = u.CreatedAt < ctx.Now.AddYears(-1) ? u.CreatedAt : ctx.Now.AddYears(-rng.Next(1, 15));
                    var licIssue = joinDate.AddYears(-rng.Next(0, 3));
                    var staffType = u.UserType switch {
                        1 => "Doctor", 2 => "Nurse", 3 => "Technician",
                        4 => "Pharmacist", _ => "Other"
                    };
                    staffs.Add(new MedicalStaff
                    {
                        Id = Guid.NewGuid(),
                        UserId = u.Id,
                        StaffCode = u.EmployeeCode ?? u.UserCode ?? NextCode("NV", seq, 5),
                        FullName = u.FullName,
                        StaffType = staffType,
                        HighestDegree = u.Degree ?? (u.UserType == 1 ? "Bác sĩ" : u.UserType == 2 ? "Cử nhân điều dưỡng" : "Trung cấp"),
                        Specialty = u.Specialty,
                        YearsOfExperience = Math.Max(1, (int)((ctx.Now - joinDate).TotalDays / 365)),
                        LicenseNumber = u.LicenseNumber ?? $"CCHN-{rng.Next(100000, 999999)}",
                        LicenseIssueDate = licIssue,
                        LicenseExpiryDate = licIssue.AddYears(5),
                        LicenseIssuedBy = "Sở Y tế",
                        LicenseActive = true,
                        PrimaryDepartmentId = u.DepartmentId,
                        PersonalPhone = u.PhoneNumber,
                        PersonalEmail = u.Email,
                        Status = "Active",
                        JoinDate = joinDate,
                        CreatedAt = joinDate, UpdatedAt = ctx.Now
                    });
                }
                _db.MedicalStaffs.AddRange(staffs);
                await _db.SaveChangesAsync();
                summary["MedicalStaffs"] = staffs.Count;
            }
        }

        // RehabReferrals — needed before RehabTreatmentPlans + RehabSessions
        if (!await _db.RehabReferrals.AnyAsync() && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var diagnoses = new (string Icd, string Dx, string Reason, string Goal)[] {
                ("I63", "Nhồi máu não", "Liệt nửa người phải, khó nói", "Phục hồi vận động chi + ngôn ngữ"),
                ("S72.0", "Gãy cổ xương đùi P sau PT", "Hạn chế ROM khớp háng", "Đi lại độc lập với nạng"),
                ("M54.5", "Đau thắt lưng mạn", "Đau VAS 6-7, hạn chế cúi", "Giảm đau, cải thiện chức năng cột sống"),
                ("G20", "Parkinson", "Run, cứng cơ, rối loạn thăng bằng", "Duy trì vận động chức năng"),
                ("M17", "Thoái hóa khớp gối 2 bên", "Đau khi đi, hạn chế gấp gối", "Tăng sức cơ đùi, giảm đau"),
                ("G80", "Bại não", "Chậm phát triển vận động", "Ngồi vững, tập đi có hỗ trợ"),
                ("S06", "Chấn thương sọ não sau PT", "Giảm ý thức, yếu nửa người T", "Hồi phục nhận thức + vận động"),
                ("R47.1", "Khó nói sau đột quỵ", "Rối loạn ngôn ngữ vận động", "Phục hồi giao tiếp cơ bản"),
                ("R13", "Khó nuốt sau đột quỵ", "Sặc, chảy dãi", "An toàn nuốt, tránh viêm phổi hít"),
                ("M50", "Thoát vị đĩa đệm cổ", "Đau cổ vai, tê tay phải", "Giảm đau, tăng ROM cột sống cổ"),
            };
            var types = new[] { "PT", "PT", "PT", "OT", "OT", "ST" };
            var referrals = new List<RehabReferral>();
            int seq = 0;
            for (int i = 0; i < 20 && i < ctx.PatientIds.Count; i++)
            {
                seq++;
                var dx = diagnoses[i % diagnoses.Length];
                var created = ctx.Now.AddDays(-rng.Next(5, 90));
                var status = i % 5 == 4 ? "Pending" : "Accepted";
                referrals.Add(new RehabReferral
                {
                    Id = Guid.NewGuid(),
                    ReferralCode = NextCode("RHR", seq, 4),
                    PatientId = ctx.PatientIds[i],
                    ReferredById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    AcceptedById = status == "Accepted" ? ctx.DoctorIds[(i + 1) % ctx.DoctorIds.Count] : null,
                    RehabType = types[i % types.Length],
                    Diagnosis = dx.Dx,
                    IcdCode = dx.Icd,
                    Reason = dx.Reason,
                    Goals = dx.Goal,
                    Precautions = "Theo dõi huyết áp, dấu hiệu sinh tồn trong quá trình tập",
                    Status = status,
                    AcceptedDate = status == "Accepted" ? created.AddDays(rng.Next(1, 3)) : null,
                    CreatedAt = created, UpdatedAt = ctx.Now
                });
            }
            _db.RehabReferrals.AddRange(referrals);
            await _db.SaveChangesAsync();
            summary["RehabReferrals"] = referrals.Count;

            // Now that referrals exist, also seed treatment plans in the same
            // call so a single populate-all request is enough.
            if (!await _db.RehabTreatmentPlans.AnyAsync())
            {
                var planTypes = new[] { "PT", "OT", "ST" };
                var plans = new List<RehabTreatmentPlan>();
                int pseq = 0;
                foreach (var r in referrals.Where(r => r.Status == "Accepted"))
                {
                    pseq++;
                    var start = r.AcceptedDate ?? r.CreatedAt.AddDays(1);
                    var therapistId = ctx.NurseIds.Count > 0
                        ? ctx.NurseIds[pseq % ctx.NurseIds.Count]
                        : ctx.DoctorIds[pseq % ctx.DoctorIds.Count];
                    plans.Add(new RehabTreatmentPlan
                    {
                        Id = Guid.NewGuid(),
                        PlanCode = NextCode("RHP", pseq, 4),
                        ReferralId = r.Id,
                        CreatedById = therapistId,
                        RehabType = planTypes[pseq % planTypes.Length],
                        PlannedSessions = 10 + rng.Next(0, 12),
                        CompletedSessions = rng.Next(2, 8),
                        Frequency = rng.Next(0, 2) == 0 ? "3x/week" : "2x/week",
                        DurationMinutesPerSession = 45,
                        StartDate = start,
                        ExpectedEndDate = start.AddDays(30 + rng.Next(0, 30)),
                        Status = "Active",
                        ShortTermGoals = "Giảm đau, tăng ROM khớp về mức bình thường",
                        LongTermGoals = "Phục hồi chức năng sinh hoạt hằng ngày, tự đi lại",
                        Interventions = "Bài tập vận động chủ động/thụ động, điện xung, siêu âm điều trị",
                        Precautions = "Tránh tải nặng đột ngột, theo dõi đau",
                        CreatedAt = start, UpdatedAt = ctx.Now
                    });
                }
                if (plans.Count > 0)
                {
                    _db.RehabTreatmentPlans.AddRange(plans);
                    await _db.SaveChangesAsync();
                    summary["RehabTreatmentPlans"] = plans.Count;
                }
            }
        }

        return Ok(new { module = "prereqs", inserted = summary });
    }

}
