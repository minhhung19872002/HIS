using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.API.Controllers;

/// <summary>
/// One-shot admin controller that fills empty tables with realistic operational
/// data for demo. Unlike DailySeedController this does NOT stamp "SEED" tags
/// onto codes — records look like they were created through normal clinical use.
/// Idempotent: each endpoint no-ops if its target tables already have rows.
/// </summary>
[ApiController]
[Route("api/admin/populate")]
[AllowAnonymous]
public class PopulateDataController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly ILogger<PopulateDataController> _logger;

    public PopulateDataController(HISDbContext db, ILogger<PopulateDataController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // Vietnamese wall-clock helpers — we want CreatedAt to match what the UI
    // (dayjs local) will render as "today/last-week" so rows do not look stale.
    private static DateTime VnNow()
    {
        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"); }
        catch { tz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
    }

    private sealed class Ctx
    {
        public List<Guid> PatientIds = new();
        public List<Guid> AdmissionIds = new();
        public Dictionary<Guid, Guid> AdmissionToPatient = new();
        public List<Guid> DoctorIds = new();   // users with doctor role
        public List<Guid> NurseIds = new();
        public List<Guid> DepartmentIds = new();
        public List<Guid> EquipmentIds = new();
        public DateTime Now;
    }

    private async Task<Ctx> LoadCtxAsync()
    {
        var ctx = new Ctx { Now = VnNow() };
        ctx.PatientIds = await _db.Patients.OrderBy(p => p.CreatedAt).Select(p => p.Id).Take(200).ToListAsync();
        var adms = await _db.Admissions
            .OrderByDescending(a => a.AdmissionDate)
            .Select(a => new { a.Id, a.PatientId })
            .Take(60).ToListAsync();
        ctx.AdmissionIds = adms.Select(a => a.Id).ToList();
        ctx.AdmissionToPatient = adms.ToDictionary(a => a.Id, a => a.PatientId);

        ctx.DoctorIds = await _db.Users
            .Where(u => u.IsActive && u.UserRoles.Any(ur => ur.Role.RoleName.Contains("Bác")
                || ur.Role.RoleName.Contains("Doctor") || ur.Role.RoleCode == "DOCTOR"))
            .Select(u => u.Id).Take(20).ToListAsync();
        if (ctx.DoctorIds.Count == 0)
            ctx.DoctorIds = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).Take(20).ToListAsync();

        ctx.NurseIds = await _db.Users
            .Where(u => u.IsActive && u.UserRoles.Any(ur => ur.Role.RoleName.Contains("Điều dưỡng")
                || ur.Role.RoleName.Contains("Nurse")))
            .Select(u => u.Id).Take(20).ToListAsync();
        if (ctx.NurseIds.Count == 0) ctx.NurseIds = ctx.DoctorIds;

        ctx.DepartmentIds = await _db.Departments
            .Where(d => d.IsActive).OrderBy(d => d.DepartmentName)
            .Select(d => d.Id).Take(20).ToListAsync();

        ctx.EquipmentIds = await _db.MedicalEquipments
            .OrderBy(e => e.EquipmentCode).Select(e => e.Id).Take(20).ToListAsync();

        return ctx;
    }

    private static string NextCode(string prefix, int seq, int width = 5)
        => $"{prefix}{DateTime.UtcNow:yyMM}{seq.ToString().PadLeft(width, '0')}";

    // ==========================================================================
    // INFECTION CONTROL
    // ==========================================================================
    [HttpPost("infection-control")]
    public async Task<IActionResult> PopulateInfectionControl()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(42);

        if (!await _db.HAICases.AnyAsync() && ctx.AdmissionIds.Count > 0)
        {
            var types = new[] { "SSI", "VAP", "CAUTI", "CLABSI", "CDI" };
            var sites = new[] { "Vết mổ bụng", "Phổi", "Đường tiểu", "Đường mạch máu trung tâm", "Đại tràng" };
            var organisms = new[] { "Staphylococcus aureus", "Escherichia coli", "Klebsiella pneumoniae",
                "Pseudomonas aeruginosa", "Acinetobacter baumannii", "Clostridioides difficile" };
            var statuses = new[] { "Confirmed", "Confirmed", "Confirmed", "Resolved", "Resolved", "Suspected" };

            var cases = new List<HAICase>();
            for (int i = 0; i < 18; i++)
            {
                var admId = ctx.AdmissionIds[i % ctx.AdmissionIds.Count];
                var onset = ctx.Now.AddDays(-rng.Next(1, 60)).AddHours(-rng.Next(0, 24));
                var typeIdx = i % types.Length;
                var status = statuses[i % statuses.Length];
                cases.Add(new HAICase
                {
                    Id = Guid.NewGuid(),
                    CaseCode = NextCode("HAI", i + 1),
                    AdmissionId = admId,
                    PatientId = ctx.AdmissionToPatient[admId],
                    OnsetDate = onset,
                    ReportedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    InfectionType = types[typeIdx],
                    InfectionSite = sites[typeIdx],
                    Organism = organisms[i % organisms.Length],
                    IsMDRO = i % 4 == 0,
                    ResistancePattern = i % 4 == 0 ? "MRSA, VRE, ESBL+" : null,
                    IsDeviceAssociated = typeIdx == 1 || typeIdx == 2 || typeIdx == 3,
                    DeviceType = typeIdx == 1 ? "Ventilator" : typeIdx == 2 ? "Urinary Catheter"
                               : typeIdx == 3 ? "Central Line" : null,
                    DeviceDays = typeIdx == 1 || typeIdx == 2 || typeIdx == 3 ? rng.Next(3, 14) : null,
                    Status = status,
                    ConfirmedDate = status != "Suspected" ? onset.AddDays(1) : null,
                    ResolvedDate = status == "Resolved" ? onset.AddDays(rng.Next(7, 21)) : null,
                    Outcome = status == "Resolved" ? "Hồi phục" : null,
                    IsInvestigated = i % 3 == 0,
                    RootCause = i % 3 == 0 ? "Vệ sinh tay chưa đúng quy trình" : null,
                    ContributingFactors = i % 3 == 0 ? "Mật độ BN cao, thiếu PPE" : null,
                    PreventiveMeasures = "Tăng cường giám sát vệ sinh tay, cách ly sớm",
                    Notes = i % 2 == 0 ? "Khởi bệnh sau khi đặt thiết bị xâm lấn" : null,
                    CreatedAt = onset, UpdatedAt = ctx.Now
                });
            }
            _db.HAICases.AddRange(cases);
            await _db.SaveChangesAsync();
            summary["HAICases"] = cases.Count;
        }

        if (!await _db.IsolationOrders.AnyAsync() && ctx.AdmissionIds.Count > 0)
        {
            var types = new[] { "Contact", "Droplet", "Airborne", "Protective", "Contact" };
            var reasons = new[] {
                "Cấy đàm MRSA dương tính", "Nghi ngờ lao phổi AFB(+)", "COVID-19 dương tính",
                "Giảm bạch cầu trung tính nặng", "Tiêu chảy do C. difficile" };
            var orders = new List<IsolationOrder>();
            for (int i = 0; i < 12; i++)
            {
                var admId = ctx.AdmissionIds[i % ctx.AdmissionIds.Count];
                var start = ctx.Now.AddDays(-rng.Next(1, 30));
                var typeIdx = i % types.Length;
                var active = i >= 4;
                orders.Add(new IsolationOrder
                {
                    Id = Guid.NewGuid(),
                    OrderCode = NextCode("ISO", i + 1),
                    AdmissionId = admId,
                    PatientId = ctx.AdmissionToPatient[admId],
                    OrderedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    IsolationType = types[typeIdx],
                    Precautions = "[\"Phòng cách ly\",\"Găng tay\",\"Áo choàng\"]",
                    Reason = reasons[typeIdx],
                    StartDate = start,
                    EndDate = active ? null : start.AddDays(rng.Next(5, 14)),
                    Status = active ? "Active" : "Discontinued",
                    RequiresGown = true,
                    RequiresGloves = true,
                    RequiresMask = typeIdx != 3,
                    RequiresN95 = typeIdx == 2,
                    RequiresEyeProtection = typeIdx == 1 || typeIdx == 2,
                    RequiresNegativePressure = typeIdx == 2,
                    SpecialInstructions = "Thay găng + vệ sinh tay giữa các lần tiếp xúc",
                    DiscontinuationReason = active ? null : "Kết quả cấy âm tính 2 lần liên tiếp",
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.IsolationOrders.AddRange(orders);
            await _db.SaveChangesAsync();
            summary["IsolationOrders"] = orders.Count;
        }

        if (!await _db.HandHygieneObservations.AnyAsync() && ctx.DepartmentIds.Count > 0)
        {
            var obs = new List<HandHygieneObservation>();
            for (int i = 0; i < 30; i++)
            {
                var total = rng.Next(30, 120);
                var compliance = rng.Next((int)(total * 0.55), (int)(total * 0.95));
                var docOp = rng.Next(5, total / 2);
                var nurOp = total - docOp;
                obs.Add(new HandHygieneObservation
                {
                    Id = Guid.NewGuid(),
                    ObservationDate = ctx.Now.AddDays(-rng.Next(0, 45)),
                    DepartmentId = ctx.DepartmentIds[i % ctx.DepartmentIds.Count],
                    ObservedById = ctx.NurseIds[i % ctx.NurseIds.Count],
                    TotalOpportunities = total,
                    ComplianceCount = compliance,
                    ComplianceRate = Math.Round((decimal)compliance / total * 100, 2),
                    BeforePatientContact = rng.Next(5, 25),
                    BeforeAseptic = rng.Next(3, 15),
                    AfterBodyFluid = rng.Next(3, 15),
                    AfterPatientContact = rng.Next(5, 25),
                    AfterEnvironment = rng.Next(2, 10),
                    DoctorOpportunities = docOp,
                    DoctorCompliance = rng.Next((int)(docOp * 0.5), docOp),
                    NurseOpportunities = nurOp,
                    NurseCompliance = rng.Next((int)(nurOp * 0.7), nurOp),
                    Notes = i % 5 == 0 ? "Cần đào tạo lại về 5 thời điểm vệ sinh tay" : null,
                    CreatedAt = ctx.Now.AddDays(-rng.Next(0, 45)), UpdatedAt = ctx.Now
                });
            }
            _db.HandHygieneObservations.AddRange(obs);
            await _db.SaveChangesAsync();
            summary["HandHygieneObservations"] = obs.Count;
        }

        if (!await _db.Outbreaks.AnyAsync())
        {
            var orgs = new[] { "MRSA", "C. difficile", "Norovirus", "Influenza A" };
            var outbreaks = new List<Outbreak>();
            for (int i = 0; i < 4; i++)
            {
                var detect = ctx.Now.AddDays(-rng.Next(30, 180));
                outbreaks.Add(new Outbreak
                {
                    Id = Guid.NewGuid(),
                    OutbreakCode = NextCode("OUT", i + 1, 3),
                    DetectionDate = detect,
                    DetectedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Organism = orgs[i],
                    SourceSuspected = i == 0 ? "Nhân viên mang mầm bệnh không triệu chứng"
                                     : i == 1 ? "Vệ sinh bề mặt không đúng quy trình"
                                     : i == 2 ? "Thức ăn nhiễm bẩn" : "Lây truyền qua giọt bắn",
                    AffectedAreas = i == 0 ? "Khoa Hồi sức tích cực" : i == 1 ? "Khoa Tiêu hóa"
                                   : i == 2 ? "Khoa Nhi" : "Khoa Nội tổng hợp",
                    InitialCases = rng.Next(3, 8),
                    TotalCases = rng.Next(8, 25),
                    Deaths = i == 0 ? 1 : 0,
                    Status = i < 2 ? "Resolved" : i == 2 ? "Contained" : "Active",
                    ContainedDate = i < 3 ? detect.AddDays(14) : null,
                    ResolvedDate = i < 2 ? detect.AddDays(30) : null,
                    ReportedToAuthority = true,
                    ReportedDate = detect.AddDays(2),
                    ControlMeasures = "Cách ly BN, sàng lọc tiếp xúc, tăng cường vệ sinh môi trường, khử khuẩn bề mặt",
                    LessonsLearned = i < 2 ? "Cần tăng cường tập huấn vệ sinh tay và sử dụng PPE" : null,
                    CreatedAt = detect, UpdatedAt = ctx.Now
                });
            }
            _db.Outbreaks.AddRange(outbreaks);
            await _db.SaveChangesAsync();
            summary["Outbreaks"] = outbreaks.Count;
        }

        return Ok(new { success = true, module = "infection-control", inserted = summary });
    }

    // ==========================================================================
    // PATIENT PORTAL
    // ==========================================================================
    [HttpPost("patient-portal")]
    public async Task<IActionResult> PopulatePatientPortal()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(7);
        if (ctx.PatientIds.Count == 0)
            return Ok(new { success = false, error = "no patients" });

        // Treat first 20 patients as portal account holders
        var accounts = ctx.PatientIds.Take(20).ToList();

        if (!await _db.FamilyMembers.AnyAsync())
        {
            var rels = new[] { "Vợ", "Chồng", "Con trai", "Con gái", "Cha", "Mẹ", "Anh trai", "Em gái" };
            var first = new[] { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Bùi", "Đặng", "Võ" };
            var mid = new[] { "Văn", "Thị", "Minh", "Ngọc", "Xuân", "Hoàng" };
            var last = new[] { "An", "Bình", "Dũng", "Hà", "Hương", "Khanh", "Linh", "Minh", "Nam", "Thảo", "Trang", "Tú" };
            var members = new List<FamilyMember>();
            int seq = 0;
            foreach (var acc in accounts)
            {
                int numMembers = rng.Next(1, 4);
                for (int i = 0; i < numMembers; i++)
                {
                    seq++;
                    members.Add(new FamilyMember
                    {
                        Id = Guid.NewGuid(),
                        AccountId = acc,
                        FullName = $"{first[rng.Next(first.Length)]} {mid[rng.Next(mid.Length)]} {last[rng.Next(last.Length)]}",
                        Relationship = rels[rng.Next(rels.Length)],
                        DateOfBirth = new DateTime(1960 + rng.Next(60), 1 + rng.Next(12), 1 + rng.Next(28)).ToString("yyyy-MM-dd"),
                        Gender = i % 2 == 0 ? "Nam" : "Nữ",
                        IdNumber = $"0{rng.Next(10, 99)}{rng.Next(100000000, 999999999)}",
                        Phone = $"09{rng.Next(10000000, 99999999)}",
                        InsuranceNumber = i % 2 == 0 ? $"HS4{rng.Next(1000000000, int.MaxValue)}" : null,
                        IsActive = true,
                        CreatedAt = ctx.Now.AddDays(-rng.Next(10, 120)),
                        UpdatedAt = ctx.Now
                    });
                }
            }
            _db.FamilyMembers.AddRange(members);
            await _db.SaveChangesAsync();
            summary["FamilyMembers"] = members.Count;
        }

        if (!await _db.MedicineReminders.AnyAsync())
        {
            var meds = new[] {
                ("Amlodipine 5mg","1 viên","1 lần/ngày","08:00","Sau ăn sáng"),
                ("Metformin 850mg","1 viên","2 lần/ngày","08:00,20:00","Sau ăn"),
                ("Atorvastatin 20mg","1 viên","1 lần/ngày","21:00","Tối trước khi ngủ"),
                ("Losartan 50mg","1 viên","1 lần/ngày","08:00","Sau ăn sáng"),
                ("Omeprazole 20mg","1 viên","1 lần/ngày","07:30","Trước ăn sáng 30 phút"),
                ("Aspirin 81mg","1 viên","1 lần/ngày","12:00","Sau ăn trưa"),
                ("Levothyroxine 50mcg","1 viên","1 lần/ngày","06:30","Lúc đói, trước ăn 30 phút")
            };
            var reminders = new List<MedicineReminder>();
            foreach (var acc in accounts)
            {
                int n = rng.Next(1, 4);
                for (int i = 0; i < n; i++)
                {
                    var m = meds[rng.Next(meds.Length)];
                    var start = ctx.Now.AddDays(-rng.Next(5, 60));
                    reminders.Add(new MedicineReminder
                    {
                        Id = Guid.NewGuid(),
                        AccountId = acc,
                        MedicineName = m.Item1,
                        Dosage = m.Item2,
                        Frequency = m.Item3,
                        Times = m.Item4,
                        Instructions = m.Item5,
                        StartDate = start,
                        EndDate = rng.Next(0, 3) == 0 ? start.AddDays(90) : null,
                        IsActive = i < 2 || rng.Next(0, 4) != 0,
                        Notes = rng.Next(0, 5) == 0 ? "Theo dõi HA, báo BS nếu <90/60" : null,
                        CreatedAt = start, UpdatedAt = ctx.Now
                    });
                }
            }
            _db.MedicineReminders.AddRange(reminders);
            await _db.SaveChangesAsync();
            summary["MedicineReminders"] = reminders.Count;
        }

        if (!await _db.HealthMetrics.AnyAsync())
        {
            var metrics = new List<HealthMetric>();
            foreach (var acc in accounts)
            {
                // Each patient has ~10-20 readings over last 30 days
                int n = rng.Next(10, 20);
                decimal baseWeight = 50 + rng.Next(20, 40);
                decimal baseHeight = 150 + rng.Next(0, 40);
                for (int i = 0; i < n; i++)
                {
                    var recordedAt = ctx.Now.AddDays(-i * 2).AddHours(-rng.Next(0, 12));
                    decimal weight = baseWeight + (decimal)(rng.NextDouble() * 1 - 0.5);
                    decimal bmi = Math.Round(weight / ((baseHeight / 100) * (baseHeight / 100)), 1);
                    metrics.Add(new HealthMetric
                    {
                        Id = Guid.NewGuid(),
                        AccountId = acc,
                        RecordedAt = recordedAt,
                        BloodPressureSystolic = 110 + rng.Next(0, 40),
                        BloodPressureDiastolic = 65 + rng.Next(0, 25),
                        HeartRate = 65 + rng.Next(0, 30),
                        Weight = weight,
                        Height = baseHeight,
                        BMI = bmi,
                        BloodGlucose = rng.Next(0, 3) == 0 ? 85 + rng.Next(0, 80) : null,
                        Temperature = 36.5m + (decimal)(rng.NextDouble() * 1.5),
                        SpO2 = 95 + rng.Next(0, 5),
                        Notes = i == 0 ? "Ghi nhận hàng ngày theo lịch" : null,
                        Source = i % 3 == 0 ? "Device" : "Manual",
                        CreatedAt = recordedAt, UpdatedAt = recordedAt
                    });
                }
            }
            _db.HealthMetrics.AddRange(metrics);
            await _db.SaveChangesAsync();
            summary["HealthMetrics"] = metrics.Count;
        }

        if (!await _db.PatientQuestions.AnyAsync())
        {
            var templates = new[] {
                ("Uống thuốc Metformin có cần tránh gì?", "Nội khoa", "Tôi mới được kê Metformin 850mg. Bác sĩ cho hỏi có cần kiêng món ăn gì đặc biệt không? Uống cùng lúc với Amlodipine có sao không?"),
                ("Tái khám huyết áp khi nào?", "Tim mạch", "HA đo ở nhà sáng nay 145/92, tối qua 158/95. Tôi có cần đến khám lại sớm không hay chờ hẹn 2 tuần?"),
                ("Vết mổ ra dịch vàng có bình thường không?", "Ngoại khoa", "Mổ ruột thừa 5 ngày rồi. Hôm nay thay băng thấy có ít dịch vàng nhạt, không đau. Có cần đến BV kiểm tra không?"),
                ("Bé bị sốt 38.5 có cần đi khám ngay?", "Nhi khoa", "Bé trai 18 tháng sốt 38.5, đã uống hạ sốt, ăn bú bình thường. Có cần đi khám hay theo dõi tại nhà?"),
                ("Thai 28 tuần hay mỏi hông phải", "Sản khoa", "Em mang thai 28 tuần, gần đây hay đau mỏi hông bên phải về chiều. Có bình thường không ạ?"),
                ("Lịch tiêm vaccine cho trẻ 9 tháng", "Nhi khoa", "Cháu nhà em tròn 9 tháng, đã tiêm đủ theo tiêm chủng mở rộng. Lần tới cần tiêm gì và khi nào?"),
                ("Kết quả cholesterol cao, làm gì?", "Nội khoa", "Tổng cholesterol 6.8, LDL 4.2. BS có kê Atorvastatin. Tôi có cần ăn kiêng mỡ động vật không?"),
                ("Đau đầu 3 ngày liên tục", "Thần kinh", "Đau đầu âm ỉ 3 hôm, uống paracetamol có đỡ nhưng vẫn trở lại. Có cần chụp CT không?"),
            };
            var doctors = new[] { "BS. Nguyễn Văn An", "BS. Trần Thị Hương", "BS. Lê Quang Vinh",
                "BS. Phạm Minh Tuấn", "BS. Hoàng Thu Trang" };
            var questions = new List<PatientQuestion>();
            foreach (var acc in accounts)
            {
                int n = rng.Next(0, 4);
                for (int i = 0; i < n; i++)
                {
                    var q = templates[rng.Next(templates.Length)];
                    var asked = ctx.Now.AddDays(-rng.Next(1, 30));
                    bool answered = rng.Next(0, 4) != 0;
                    questions.Add(new PatientQuestion
                    {
                        Id = Guid.NewGuid(),
                        AccountId = acc,
                        Subject = q.Item1,
                        Category = q.Item2,
                        Content = q.Item3,
                        Status = answered ? 2 : 1,
                        AnsweredByName = answered ? doctors[rng.Next(doctors.Length)] : null,
                        Answer = answered ? "Chào bạn, theo thông tin bạn cung cấp, tôi khuyên bạn theo dõi thêm 2-3 ngày. Nếu triệu chứng nặng hơn vui lòng đến trực tiếp để được thăm khám. Đặt lịch qua ứng dụng hoặc gọi số tổng đài." : null,
                        AnsweredAt = answered ? asked.AddHours(rng.Next(2, 48)) : null,
                        IsPublic = rng.Next(0, 5) == 0,
                        CreatedAt = asked, UpdatedAt = answered ? asked.AddHours(rng.Next(2, 48)) : asked
                    });
                }
            }
            _db.PatientQuestions.AddRange(questions);
            await _db.SaveChangesAsync();
            summary["PatientQuestions"] = questions.Count;
        }

        return Ok(new { success = true, module = "patient-portal", inserted = summary });
    }

    // ==========================================================================
    // EQUIPMENT: MaintenanceRecord + CalibrationRecord
    // ==========================================================================
    [HttpPost("equipment")]
    public async Task<IActionResult> PopulateEquipment()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(11);
        if (ctx.EquipmentIds.Count == 0)
            return Ok(new { success = false, error = "no equipment" });

        if (!await _db.MaintenanceRecords.AnyAsync())
        {
            var recs = new List<MaintenanceRecord>();
            foreach (var eqId in ctx.EquipmentIds)
            {
                int quarters = rng.Next(2, 6);
                for (int q = 0; q < quarters; q++)
                {
                    var scheduled = ctx.Now.AddDays(-90 * q - rng.Next(0, 30));
                    var performed = q == 0 && rng.Next(0, 2) == 0 ? (DateTime?)null : scheduled.AddDays(rng.Next(0, 5));
                    bool isPreventive = q > 0 || rng.Next(0, 3) != 0;
                    decimal partsCost = isPreventive ? rng.Next(50000, 500000) : rng.Next(500000, 5000000);
                    decimal laborCost = isPreventive ? 200000 : rng.Next(500000, 2000000);
                    recs.Add(new MaintenanceRecord
                    {
                        Id = Guid.NewGuid(),
                        EquipmentId = eqId,
                        MaintenanceType = isPreventive ? "Preventive" : "Corrective",
                        ScheduledDate = scheduled,
                        PerformedDate = performed,
                        PerformedById = performed.HasValue ? ctx.DoctorIds[rng.Next(ctx.DoctorIds.Count)] : null,
                        Status = performed.HasValue ? "Completed" : (scheduled < ctx.Now ? "Overdue" : "Scheduled"),
                        WorkDescription = isPreventive
                            ? "Kiểm tra tổng quát, vệ sinh, thay lọc, hiệu chuẩn sơ bộ"
                            : "Khắc phục sự cố: thay bo mạch chính, kiểm tra nguồn",
                        PartsReplaced = isPreventive ? "Lọc khí, dầu bôi trơn" : "Bo mạch, pin backup, cáp nguồn",
                        PartsCost = partsCost,
                        LaborCost = laborCost,
                        TotalCost = partsCost + laborCost,
                        IsInternal = rng.Next(0, 2) == 0,
                        VendorName = rng.Next(0, 2) == 0 ? null : "CTCP TBYT Bình Minh",
                        ServiceReportNumber = performed.HasValue ? $"SR-{performed.Value:yyyyMM}-{rng.Next(100, 999)}" : null,
                        Findings = performed.HasValue ? "Thiết bị hoạt động ổn định sau bảo trì" : null,
                        Recommendations = isPreventive ? "Bảo trì định kỳ 3 tháng/lần" : "Cập nhật firmware mới",
                        NextMaintenanceDate = scheduled.AddMonths(3),
                        CreatedAt = scheduled, UpdatedAt = performed ?? scheduled
                    });
                }
            }
            _db.MaintenanceRecords.AddRange(recs);
            await _db.SaveChangesAsync();
            summary["MaintenanceRecords"] = recs.Count;
        }

        if (!await _db.CalibrationRecords.AnyAsync())
        {
            var recs = new List<CalibrationRecord>();
            foreach (var eqId in ctx.EquipmentIds)
            {
                // 3 yearly calibrations per device
                for (int y = 0; y < 3; y++)
                {
                    var scheduled = ctx.Now.AddMonths(-12 * y - rng.Next(0, 6));
                    var performed = y == 0 && rng.Next(0, 3) == 0 ? (DateTime?)null : scheduled.AddDays(rng.Next(0, 14));
                    bool passed = rng.Next(0, 10) != 0;
                    recs.Add(new CalibrationRecord
                    {
                        Id = Guid.NewGuid(),
                        EquipmentId = eqId,
                        ScheduledDate = scheduled,
                        PerformedDate = performed,
                        PerformedBy = performed.HasValue ? "Trung tâm Kiểm định 3 - TP.HCM" : null,
                        Status = performed.HasValue ? (passed ? "Completed" : "Failed") : (scheduled < ctx.Now ? "Overdue" : "Scheduled"),
                        CertificateNumber = performed.HasValue ? $"HC-{performed.Value:yyyy}-{rng.Next(1000, 9999)}" : null,
                        CalibrationStandard = "ISO/IEC 17025:2017",
                        PassedCalibration = passed,
                        DeviationFindings = passed ? "Trong giới hạn cho phép" : "Sai số vượt ±2%, cần điều chỉnh",
                        AdjustmentsMade = passed ? null : "Hiệu chuẩn lại cảm biến, thay linh kiện chuẩn",
                        CalibrationCost = rng.Next(1500000, 4000000),
                        ValidFrom = performed,
                        ValidUntil = performed?.AddYears(1),
                        NextCalibrationDate = (performed ?? scheduled).AddYears(1),
                        Notes = y == 0 ? "Hiệu chuẩn định kỳ theo TT 23/2015/TT-BYT" : null,
                        CreatedAt = scheduled, UpdatedAt = performed ?? scheduled
                    });
                }
            }
            _db.CalibrationRecords.AddRange(recs);
            await _db.SaveChangesAsync();
            summary["CalibrationRecords"] = recs.Count;
        }

        return Ok(new { success = true, module = "equipment", inserted = summary });
    }

    // ==========================================================================
    // PATHOLOGY
    // ==========================================================================
    [HttpPost("pathology")]
    public async Task<IActionResult> PopulatePathology()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(17);
        if (ctx.PatientIds.Count == 0)
            return Ok(new { success = false, error = "no patients" });

        if (!await _db.PathologyRequests.AnyAsync())
        {
            var types = new[] { "biopsy", "cytology", "pap", "frozenSection", "biopsy", "cytology" };
            var sites = new[] { "Dạ dày", "Vú", "Cổ tử cung", "Tuyến giáp", "Phổi", "Đại tràng", "Gan", "Tuyến tiền liệt" };
            var diagnoses = new[] {
                "Viêm dạ dày mạn tính H.pylori (+)", "U xơ tuyến vú lành tính",
                "Tổn thương LSIL cổ tử cung", "Nang giáp keo", "Nốt phổi nghi u",
                "Polyp đại tràng có loạn sản nhẹ", "Tổn thương gan nghi xơ gan",
                "Phì đại lành tính tuyến tiền liệt"
            };
            var reqs = new List<PathologyRequest>();
            var results = new List<PathologyResult>();
            for (int i = 0; i < 25; i++)
            {
                var typeIdx = i % types.Length;
                var siteIdx = i % sites.Length;
                var request = ctx.Now.AddDays(-rng.Next(1, 90));
                int status = i < 3 ? 0 : i < 6 ? 1 : i < 10 ? 2 : 3;
                var req = new PathologyRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = NextCode("GPB", i + 1, 4),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    RequestingDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    RequestDate = request,
                    SpecimenType = types[typeIdx],
                    SpecimenSite = sites[siteIdx],
                    SpecimenDescription = $"Mẫu {types[typeIdx]} từ {sites[siteIdx]}, bảo quản formalin 10%",
                    SpecimenCount = 1 + rng.Next(0, 3),
                    SpecimenCollectedAt = request.AddHours(-rng.Next(2, 48)),
                    ClinicalDiagnosis = diagnoses[siteIdx],
                    ClinicalHistory = "BN có tiền sử " + (rng.Next(0, 2) == 0 ? "HBV, hút thuốc 20 năm" : "THA, ĐTĐ typ 2"),
                    Priority = i % 8 == 0 ? "urgent" : "normal",
                    Status = status,
                    PatientType = i % 3 == 0 ? 1 : 2,
                    TotalAmount = types[typeIdx] == "biopsy" ? 850000 : types[typeIdx] == "frozenSection" ? 1200000 : 450000,
                    IsPaid = i % 4 != 0,
                    Notes = i == 0 ? "Ưu tiên trả trong ngày" : null,
                    CreatedAt = request, UpdatedAt = request
                };
                reqs.Add(req);

                if (status >= 3)
                {
                    var completed = request.AddDays(rng.Next(2, 7));
                    results.Add(new PathologyResult
                    {
                        Id = Guid.NewGuid(),
                        RequestId = req.Id,
                        GrossDescription = $"Mẫu {types[typeIdx]} kích thước 1.5x0.8x0.3cm, màu nâu nhạt, mật độ chắc",
                        BlockCount = rng.Next(2, 6),
                        SlideCount = rng.Next(4, 10),
                        MicroscopicDescription = "Niêm mạc có tuyến bình thường, biểu mô trụ lót. Vùng tổn thương có ổ loạn sản nhẹ, không thấy tế bào ác tính. Mô đệm có thâm nhiễm lympho bào nhẹ.",
                        StainingMethods = "[\"HE\",\"PAS\",\"Giemsa\"]",
                        SpecialStains = "Giemsa (+) với H. pylori dạng xoắn khuẩn",
                        Immunohistochemistry = typeIdx < 2 ? "CK7(+), CK20(-), Ki-67 khoảng 5%" : null,
                        Diagnosis = diagnoses[siteIdx],
                        IcdCode = new[] { "K29.5", "N60.1", "N87.0", "E04.1", "R91", "K63.5", "K74.6", "N40" }[siteIdx],
                        Comments = "Khuyến nghị nội soi kiểm tra định kỳ 6 tháng",
                        Pathologist = new[] { "BS. Nguyễn Văn Hùng", "BS. Trần Thị Minh", "BS. Lê Quang Đạt" }[rng.Next(3)],
                        PathologistId = ctx.DoctorIds[rng.Next(ctx.DoctorIds.Count)],
                        CompletedAt = completed,
                        VerifiedBy = ctx.DoctorIds[rng.Next(ctx.DoctorIds.Count)],
                        VerifiedAt = completed.AddHours(rng.Next(2, 24)),
                        VerifiedByName = "TS.BS. Phạm Hoàng Hà",
                        CreatedAt = completed, UpdatedAt = completed
                    });
                }
            }
            _db.PathologyRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            if (results.Count > 0)
            {
                _db.PathologyResults.AddRange(results);
                await _db.SaveChangesAsync();
            }
            summary["PathologyRequests"] = reqs.Count;
            summary["PathologyResults"] = results.Count;
        }

        return Ok(new { success = true, module = "pathology", inserted = summary });
    }

    // ==========================================================================
    // QUALITY: Indicators + Values
    // ==========================================================================
    [HttpPost("quality")]
    public async Task<IActionResult> PopulateQuality()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(23);

        if (!await _db.QualityIndicators.AnyAsync())
        {
            var inds = new[] {
                ("SIR-SSI","Tỷ lệ nhiễm khuẩn vết mổ","Clinical","Percentage",2.0m,5.0m,"LowerIsBetter","BYT 83"),
                ("SIR-VAP","Tỷ lệ viêm phổi thở máy (VAP)","Clinical","Rate",1.5m,3.0m,"LowerIsBetter","JCI"),
                ("SIR-CAUTI","Tỷ lệ nhiễm khuẩn tiết niệu do đặt thông","Clinical","Rate",1.0m,2.5m,"LowerIsBetter","JCI"),
                ("MED-ERR","Tỷ lệ lỗi kê đơn thuốc","Safety","Percentage",0.5m,2.0m,"LowerIsBetter","ISO 9001"),
                ("FALL-RATE","Tỷ lệ ngã / 1000 ngày giường","Safety","Rate",2.0m,4.0m,"LowerIsBetter","JCI"),
                ("HAND-HYG","Tuân thủ vệ sinh tay","Clinical","Percentage",85.0m,70.0m,"HigherIsBetter","WHO"),
                ("PAT-SAT","Điểm hài lòng bệnh nhân","Patient Experience","Percentage",85.0m,70.0m,"HigherIsBetter","BYT 83"),
                ("WAIT-OPD","Thời gian chờ khám OPD (phút)","Operational","Average",20m,45m,"LowerIsBetter","Nội bộ"),
                ("LOS-AVG","Thời gian nằm viện TB (ngày)","Operational","Average",5.5m,9.0m,"LowerIsBetter","Nội bộ"),
                ("READMIT-30","Tỷ lệ tái nhập viện 30 ngày","Clinical","Percentage",5.0m,10.0m,"LowerIsBetter","JCI"),
                ("DISCHG-TIME","Tỷ lệ xuất viện đúng giờ","Operational","Percentage",80m,60m,"HigherIsBetter","Nội bộ"),
                ("BED-OCC","Công suất sử dụng giường","Operational","Percentage",85m,95m,"HigherIsBetter","Nội bộ"),
            };
            var indicators = new List<QualityIndicator>();
            foreach (var t in inds)
            {
                indicators.Add(new QualityIndicator
                {
                    Id = Guid.NewGuid(),
                    IndicatorCode = t.Item1,
                    Name = t.Item2,
                    Category = t.Item3,
                    Description = t.Item2 + " — đo lường hàng tháng theo quy định Bộ Y tế",
                    MeasurementType = t.Item4,
                    NumeratorDefinition = "Số ca/sự kiện trong kỳ",
                    DenominatorDefinition = "Tổng số ca hoặc ngày điều trị",
                    MeasurementFrequency = "Monthly",
                    TargetValue = t.Item5,
                    ThresholdLow = t.Item7 == "LowerIsBetter" ? null : t.Item6,
                    ThresholdHigh = t.Item7 == "LowerIsBetter" ? t.Item6 : null,
                    ThresholdDirection = t.Item7,
                    StandardReference = t.Item8,
                    IsActive = true,
                    CreatedAt = ctx.Now.AddMonths(-6), UpdatedAt = ctx.Now
                });
            }
            _db.QualityIndicators.AddRange(indicators);
            await _db.SaveChangesAsync();
            summary["QualityIndicators"] = indicators.Count;

            // 6 months of values per indicator
            var values = new List<QualityIndicatorValue>();
            foreach (var ind in indicators)
            {
                decimal baseVal = ind.TargetValue ?? 50m;
                for (int m = 5; m >= 0; m--)
                {
                    var periodStart = new DateTime(ctx.Now.Year, ctx.Now.Month, 1).AddMonths(-m);
                    var periodEnd = periodStart.AddMonths(1).AddDays(-1);
                    decimal delta = (decimal)(rng.NextDouble() * 0.4 - 0.2) * baseVal;
                    decimal val = Math.Max(0, baseVal + delta);
                    string status = ind.ThresholdDirection == "HigherIsBetter"
                        ? (val >= (ind.TargetValue ?? 0) ? "Normal" : val >= (ind.ThresholdLow ?? 0) ? "Warning" : "Critical")
                        : (val <= (ind.TargetValue ?? 0) ? "Normal" : val <= (ind.ThresholdHigh ?? 0) ? "Warning" : "Critical");

                    values.Add(new QualityIndicatorValue
                    {
                        Id = Guid.NewGuid(),
                        IndicatorId = ind.Id,
                        DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[m % ctx.DepartmentIds.Count] : (Guid?)null,
                        PeriodStart = periodStart, PeriodEnd = periodEnd,
                        Numerator = Math.Round(val * 100, 0),
                        Denominator = 10000,
                        Value = Math.Round(val, 2),
                        Status = status,
                        Trend = m < 5 ? (decimal)(rng.NextDouble() * 20 - 10) : null,
                        RecordedById = ctx.DoctorIds.Count > 0 ? ctx.DoctorIds[0] : (Guid?)null,
                        CreatedAt = periodEnd, UpdatedAt = periodEnd
                    });
                }
            }
            _db.QualityIndicatorValues.AddRange(values);
            await _db.SaveChangesAsync();
            summary["QualityIndicatorValues"] = values.Count;
        }

        return Ok(new { success = true, module = "quality", inserted = summary });
    }

    // ==========================================================================
    // REHAB SESSIONS
    // ==========================================================================
    [HttpPost("rehab-sessions")]
    public async Task<IActionResult> PopulateRehabSessions()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(29);

        if (!await _db.RehabSessions.AnyAsync())
        {
            var plans = await _db.RehabTreatmentPlans.Take(20).Select(p => new { p.Id, TherapistId = p.CreatedById }).ToListAsync();
            if (plans.Count == 0) return Ok(new { success = false, error = "no treatment plans" });

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

        return Ok(new { success = true, module = "rehab-sessions", inserted = summary });
    }

    // ==========================================================================
    // TELE SESSIONS
    // ==========================================================================
    [HttpPost("tele-sessions")]
    public async Task<IActionResult> PopulateTeleSessions()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(31);

        if (!await _db.TeleSessions.AnyAsync())
        {
            var appts = await _db.TeleAppointments.Take(30)
                .Select(a => new { a.Id, a.AppointmentDate, a.StartTime }).ToListAsync();
            if (appts.Count == 0) return Ok(new { success = false, error = "no tele appointments" });

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

        return Ok(new { success = true, module = "tele-sessions", inserted = summary });
    }

    // ==========================================================================
    // DIET ORDERS
    // ==========================================================================
    [HttpPost("diet-orders")]
    public async Task<IActionResult> PopulateDietOrders()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(37);

        if (!await _db.DietOrders.AnyAsync() && ctx.AdmissionIds.Count > 0)
        {
            var dietTypes = await _db.DietTypes.Take(10).Select(d => d.Id).ToListAsync();
            if (dietTypes.Count == 0) return Ok(new { success = false, error = "no diet types" });

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

        return Ok(new { success = true, module = "diet-orders", inserted = summary });
    }

    // ==========================================================================
    // PREREQUISITES: DietTypes + RehabTreatmentPlans (needed by diet/rehab modules)
    // ==========================================================================
    [HttpPost("prereqs")]
    public async Task<IActionResult> PopulatePrereqs()
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

        return Ok(new { success = true, module = "prereqs", inserted = summary });
    }

    // ==========================================================================
    // BLOOD BANK
    // ==========================================================================
    [HttpPost("blood-bank")]
    public async Task<IActionResult> PopulateBloodBank()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(47);

        var bloodTypes = new[] { "O", "A", "B", "AB" };
        var rhFactors = new[] { "+", "+", "+", "-" }; // weighted towards +

        if (!await _db.BloodDonors.AnyAsync())
        {
            var first = new[] { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Bùi", "Võ", "Đỗ" };
            var mid = new[] { "Văn", "Thị", "Minh", "Hoàng", "Quốc", "Ngọc" };
            var last = new[] { "An", "Bình", "Cường", "Dũng", "Hà", "Hùng", "Khánh", "Linh", "Nam", "Sơn", "Thảo", "Tuấn", "Vinh" };
            var donors = new List<BloodDonor>();
            for (int i = 0; i < 40; i++)
            {
                var bt = bloodTypes[i % 4];
                donors.Add(new BloodDonor
                {
                    Id = Guid.NewGuid(),
                    DonorCode = NextCode("HM", i + 1, 4),
                    FullName = $"{first[rng.Next(first.Length)]} {mid[rng.Next(mid.Length)]} {last[rng.Next(last.Length)]}",
                    DateOfBirth = new DateTime(1970 + rng.Next(35), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = rng.Next(0, 2) == 0 ? 1 : 2,
                    IdentityNumber = $"0{rng.Next(10, 99)}{rng.Next(100000000, 999999999)}",
                    PhoneNumber = $"09{rng.Next(10000000, 99999999)}",
                    Email = $"donor{i + 1}@gmail.com",
                    Address = $"Số {rng.Next(1, 300)} đường Nguyễn Văn Linh, P.{rng.Next(1, 15)}, Quận {rng.Next(1, 13)}, TP.HCM",
                    BloodType = bt,
                    RhFactor = rhFactors[rng.Next(rhFactors.Length)],
                    LastDonationDate = ctx.Now.AddDays(-rng.Next(30, 365)),
                    TotalDonations = 1 + rng.Next(0, 15),
                    Status = 1,
                    MedicalHistory = rng.Next(0, 3) == 0 ? "Không có tiền sử bệnh đặc biệt" : null,
                    AllergyHistory = rng.Next(0, 4) == 0 ? "Dị ứng penicillin" : null,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.BloodDonors.AddRange(donors);
            await _db.SaveChangesAsync();
            summary["BloodDonors"] = donors.Count;
        }

        if (!await _db.BloodUnits.AnyAsync())
        {
            var donorIds = await _db.BloodDonors.Select(d => new { d.Id, d.BloodType, d.RhFactor }).ToListAsync();
            var units = new List<BloodUnit>();
            for (int i = 0; i < 120; i++)
            {
                var d = donorIds[i % donorIds.Count];
                var collection = ctx.Now.AddDays(-rng.Next(1, 35));
                var status = collection < ctx.Now.AddDays(-35) ? 3 : (i < 90 ? 1 : (i < 105 ? 0 : 3));
                units.Add(new BloodUnit
                {
                    Id = Guid.NewGuid(),
                    UnitCode = NextCode("BU", i + 1, 5),
                    BloodType = d.BloodType,
                    RhFactor = d.RhFactor,
                    DonorId = d.Id,
                    CollectionDate = collection,
                    ExpiryDate = collection.AddDays(42),
                    Volume = 250 + rng.Next(0, 201),
                    Status = status,
                    StorageLocation = $"Tủ {rng.Next(1, 5)} / Ngăn {(char)('A' + rng.Next(0, 5))}{rng.Next(1, 9)}",
                    BatchNumber = $"LOT-{collection:yyyyMM}-{rng.Next(100, 999)}",
                    TestResults = "HIV (-), HBV (-), HCV (-), Syphilis (-), Malaria (-)",
                    CreatedAt = collection, UpdatedAt = ctx.Now
                });
            }
            _db.BloodUnits.AddRange(units);
            await _db.SaveChangesAsync();
            summary["BloodUnits"] = units.Count;
        }

        if (!await _db.BloodRequests.AnyAsync() && ctx.PatientIds.Count > 0)
        {
            var reqs = new List<BloodRequest>();
            for (int i = 0; i < 25; i++)
            {
                var bt = bloodTypes[i % 4];
                var rd = ctx.Now.AddDays(-rng.Next(0, 60));
                reqs.Add(new BloodRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = NextCode("YCM", i + 1, 4),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    RequestDate = rd,
                    BloodType = bt,
                    RhFactor = "+",
                    Quantity = 1 + rng.Next(0, 4),
                    Volume = 250 * (1 + rng.Next(0, 4)),
                    Priority = i % 7 == 0 ? 2 : (i % 3 == 0 ? 1 : 0),
                    Purpose = new[] { "Phẫu thuật tim hở", "Truyền máu cấp cứu", "Thiếu máu nặng", "Hậu phẫu xuất huyết", "Điều trị thalassemia" }[i % 5],
                    ClinicalDiagnosis = new[] { "Thiếu máu mạn", "Xuất huyết tiêu hóa", "Phẫu thuật tim", "Bỏng nặng", "Ung thư giai đoạn cuối" }[i % 5],
                    RequestingDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    Status = i < 15 ? 3 : (i < 20 ? 1 : 0),
                    ApprovedBy = i < 20 ? ctx.DoctorIds[0] : null,
                    ApprovedAt = i < 20 ? rd.AddMinutes(rng.Next(10, 180)) : null,
                    CreatedAt = rd, UpdatedAt = ctx.Now
                });
            }
            _db.BloodRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            summary["BloodRequests"] = reqs.Count;

            var dispensedReqs = reqs.Where(r => r.Status == 3).ToList();
            var availableUnits = await _db.BloodUnits.Where(u => u.Status == 1).Take(50).ToListAsync();
            var trans = new List<BloodTransfusion>();
            for (int i = 0; i < Math.Min(dispensedReqs.Count, availableUnits.Count); i++)
            {
                var req = dispensedReqs[i]; var unit = availableUnits[i];
                var td = req.RequestDate.AddHours(rng.Next(1, 6));
                trans.Add(new BloodTransfusion
                {
                    Id = Guid.NewGuid(),
                    TransfusionCode = NextCode("TM", i + 1, 4),
                    BloodRequestId = req.Id,
                    BloodUnitId = unit.Id,
                    PatientId = req.PatientId,
                    TransfusionDate = td,
                    StartTime = new TimeSpan(8 + rng.Next(0, 10), rng.Next(0, 60), 0),
                    EndTime = new TimeSpan(9 + rng.Next(0, 10), rng.Next(0, 60), 0),
                    Volume = unit.Volume,
                    NurseId = ctx.NurseIds[i % ctx.NurseIds.Count],
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    HasReaction = rng.Next(0, 10) == 0,
                    ReactionType = rng.Next(0, 10) == 0 ? "Sốt nhẹ" : null,
                    ReactionDescription = rng.Next(0, 10) == 0 ? "BN sốt 37.8°C sau 30 phút truyền, không có triệu chứng khác" : null,
                    TreatmentForReaction = rng.Next(0, 10) == 0 ? "Tạm dừng truyền, paracetamol 500mg PO" : null,
                    VitalSignsBefore = $"HA {110+rng.Next(0,40)}/{70+rng.Next(0,20)}, M {70+rng.Next(0,30)}, T° 36.{rng.Next(5,9)}",
                    VitalSignsAfter = $"HA {110+rng.Next(0,40)}/{70+rng.Next(0,20)}, M {70+rng.Next(0,30)}, T° 36.{rng.Next(5,9)}",
                    Status = 2,
                    CreatedAt = td, UpdatedAt = ctx.Now
                });
                unit.Status = 3;
            }
            if (trans.Count > 0)
            {
                _db.BloodTransfusions.AddRange(trans);
                await _db.SaveChangesAsync();
                summary["BloodTransfusions"] = trans.Count;
            }
        }

        return Ok(new { success = true, module = "blood-bank", inserted = summary });
    }

    // ==========================================================================
    // CULTURE STOCK (Vi sinh lưu chủng)
    // ==========================================================================
    [HttpPost("culture-stock")]
    public async Task<IActionResult> PopulateCultureStock()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(53);

        if (!await _db.CultureStocks.AnyAsync())
        {
            var organisms = new[] {
                ("ECO","Escherichia coli","Gram-negative","negative"),
                ("SAU","Staphylococcus aureus","Gram-positive","positive"),
                ("PAE","Pseudomonas aeruginosa","Gram-negative","negative"),
                ("KPN","Klebsiella pneumoniae","Gram-negative","negative"),
                ("ABA","Acinetobacter baumannii","Gram-negative","negative"),
                ("CAL","Candida albicans","Yeast","positive"),
                ("ENF","Enterococcus faecalis","Gram-positive","positive"),
                ("MTB","Mycobacterium tuberculosis","Acid-fast","positive"),
                ("CPE","Clostridium perfringens","Gram-positive","positive"),
                ("SPN","Streptococcus pneumoniae","Gram-positive","positive")
            };
            var methods = new[] { "glycerol", "lyophilization", "cryopreservation", "skim_milk" };
            var stocks = new List<CultureStock>();
            for (int i = 0; i < 30; i++)
            {
                var org = organisms[i % organisms.Length];
                var preserved = ctx.Now.AddDays(-rng.Next(30, 720));
                var aliquots = 5 + rng.Next(0, 11);
                var remaining = Math.Max(0, aliquots - rng.Next(0, 5));
                stocks.Add(new CultureStock
                {
                    Id = Guid.NewGuid(),
                    StockCode = $"VS-{preserved:yyyy}-{(i + 1):D4}",
                    OrganismCode = org.Item1,
                    OrganismName = org.Item2,
                    ScientificName = org.Item2,
                    GramStain = org.Item4,
                    SourceType = i % 4 == 0 ? "qc" : (i % 4 == 1 ? "reference" : "clinical"),
                    SourceDescription = i % 4 == 0 ? "ATCC 25922 reference strain"
                        : i % 4 == 1 ? "WHO reference collection"
                        : $"Clinical isolate - BN {i + 1}",
                    FreezerCode = $"TL-{1 + rng.Next(0, 3):D2}",
                    RackCode = $"R{1 + rng.Next(0, 8)}",
                    BoxCode = $"B{1 + rng.Next(0, 10)}",
                    Position = $"{(char)('A' + rng.Next(0, 8))}{1 + rng.Next(0, 8)}",
                    PreservationMethod = methods[rng.Next(methods.Length)],
                    StorageTemperature = methods[i % methods.Length] == "lyophilization" ? "4" : "-80",
                    PassageNumber = 1 + rng.Next(0, 5),
                    AliquotCount = aliquots,
                    RemainingAliquots = remaining,
                    PreservationDate = preserved,
                    ExpiryDate = preserved.AddYears(5),
                    LastViabilityCheck = preserved.AddDays(rng.Next(30, 365)),
                    LastViabilityResult = rng.Next(0, 15) != 0,
                    Status = remaining == 0 ? 3 : (remaining <= 2 ? 1 : 0),
                    PreservedBy = new[] { "TS. BS. Lê Minh Hải", "BS. Trần Quốc Tuấn", "ThS. Nguyễn Thị Hoa" }[rng.Next(3)],
                    CreatedAt = preserved, UpdatedAt = ctx.Now
                });
            }
            _db.CultureStocks.AddRange(stocks);
            await _db.SaveChangesAsync();
            summary["CultureStocks"] = stocks.Count;

            var logs = new List<CultureStockLog>();
            foreach (var s in stocks)
            {
                logs.Add(new CultureStockLog
                {
                    Id = Guid.NewGuid(),
                    CultureStockId = s.Id,
                    Action = "store",
                    PerformedBy = s.PreservedBy,
                    PerformedAt = s.PreservationDate,
                    Notes = $"Lưu trữ ban đầu {s.AliquotCount} aliquots",
                    CreatedAt = s.PreservationDate, UpdatedAt = s.PreservationDate
                });
                int checks = rng.Next(1, 4);
                for (int c = 0; c < checks; c++)
                {
                    var when = s.PreservationDate.AddDays(90 * (c + 1));
                    if (when > ctx.Now) break;
                    logs.Add(new CultureStockLog
                    {
                        Id = Guid.NewGuid(),
                        CultureStockId = s.Id,
                        Action = "viability_check",
                        PerformedBy = s.PreservedBy,
                        PerformedAt = when,
                        Result = "Viable - sống tốt",
                        CreatedAt = when, UpdatedAt = when
                    });
                }
            }
            _db.CultureStockLogs.AddRange(logs);
            await _db.SaveChangesAsync();
            summary["CultureStockLogs"] = logs.Count;
        }

        return Ok(new { success = true, module = "culture-stock", inserted = summary });
    }

    // ==========================================================================
    // PUBLIC HEALTH / MEDINET (Vaccination, Disease, School, Occupational, Checkup)
    // ==========================================================================
    [HttpPost("public-health")]
    public async Task<IActionResult> PopulatePublicHealth()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(59);
        if (ctx.PatientIds.Count == 0) return Ok(new { success = false, error = "no patients" });

        if (!await _db.VaccinationCampaigns.AnyAsync())
        {
            var camps = new[] {
                ("VC-2026-01","Chiến dịch tiêm chủng Sởi-Rubella trẻ em 2026","MMR","Trẻ em 9-15 tháng",3500),
                ("VC-2026-02","Tiêm vắc xin Cúm mùa người cao tuổi 2026","Influenza","Người trên 65 tuổi",1200),
                ("VC-2026-03","Tiêm chủng mở rộng quý 1","Bạch hầu-Ho gà-Uốn ván","Trẻ sơ sinh",2800),
                ("VC-2026-04","Tiêm vắc xin HPV nữ 9-14 tuổi","HPV","Nữ 9-14 tuổi",900),
            };
            var list = new List<VaccinationCampaign>();
            foreach (var c in camps)
            {
                var start = ctx.Now.AddMonths(-rng.Next(0, 6));
                list.Add(new VaccinationCampaign
                {
                    Id = Guid.NewGuid(),
                    CampaignCode = c.Item1, CampaignName = c.Item2, VaccineName = c.Item3,
                    StartDate = start, EndDate = start.AddDays(60 + rng.Next(30, 90)),
                    TargetGroup = c.Item4, TargetCount = c.Item5,
                    CompletedCount = (int)(c.Item5 * (0.4 + rng.NextDouble() * 0.5)),
                    Status = start.AddDays(60) < ctx.Now ? 2 : 1,
                    Description = "Chiến dịch tiêm chủng theo kế hoạch của Sở Y tế",
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.VaccinationCampaigns.AddRange(list);
            await _db.SaveChangesAsync();
            summary["VaccinationCampaigns"] = list.Count;
        }

        if (!await _db.VaccinationRecords.AnyAsync())
        {
            var vaccines = new[] {
                ("Viêm gan B", "HEP-B", "GSK"), ("BCG", "BCG-01", "Viện Pasteur"),
                ("Sởi-Rubella", "MMR-II", "MSD"), ("DPT-Hib", "Pentaxim", "Sanofi"),
                ("HPV", "Gardasil 9", "MSD"), ("Cúm mùa", "Vaxigrip", "Sanofi"),
                ("COVID-19", "Pfizer", "Pfizer-BioNTech"), ("Thủy đậu", "Varivax", "MSD")
            };
            var list = new List<VaccinationRecord>();
            for (int i = 0; i < 80; i++)
            {
                var v = vaccines[i % vaccines.Length];
                var date = ctx.Now.AddDays(-rng.Next(1, 365));
                list.Add(new VaccinationRecord
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    VaccineName = v.Item1, VaccineCode = v.Item2, Manufacturer = v.Item3,
                    LotNumber = $"LOT{date:yyMMdd}-{rng.Next(100, 999)}",
                    VaccinationDate = date,
                    DoseNumber = 1 + (i % 3),
                    InjectionSite = "Cánh tay (Delta phải)",
                    Route = "IM", DoseMl = 0.5,
                    AdministeredBy = new[] { "DD. Lê Thu Hương", "DD. Nguyễn Minh Tâm", "DD. Trần Văn Khải" }[rng.Next(3)],
                    FacilityName = "Bệnh viện Đa khoa",
                    Status = 1,
                    NextDoseDate = (i % 3) < 2 ? date.AddMonths(1) : null,
                    IsEPI = v.Item1.Contains("BCG") || v.Item1.Contains("DPT") || v.Item1.Contains("Sởi"),
                    CreatedAt = date, UpdatedAt = date
                });
            }
            _db.VaccinationRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["VaccinationRecords"] = list.Count;
        }

        if (!await _db.DiseaseReports.AnyAsync())
        {
            var diseases = new[] {
                ("A90","Sốt xuất huyết Dengue","B"), ("A09","Tiêu chảy cấp","B"),
                ("A16","Lao phổi","B"), ("B16","Viêm gan siêu vi B","B"),
                ("J09","Cúm A/H1N1","A"), ("U07.1","COVID-19","A"),
                ("A01","Thương hàn","B"), ("B50","Sốt rét","B")
            };
            var list = new List<DiseaseReport>();
            for (int i = 0; i < 35; i++)
            {
                var d = diseases[i % diseases.Length];
                var onset = ctx.Now.AddDays(-rng.Next(1, 120));
                list.Add(new DiseaseReport
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN #{i + 1}",
                    PatientAge = (5 + rng.Next(0, 75)).ToString(),
                    PatientGender = i % 2 == 0 ? "Nam" : "Nữ",
                    PatientAddress = $"Số {rng.Next(1, 300)} Phường {rng.Next(1, 15)}, Quận {rng.Next(1, 13)}",
                    DiseaseCode = d.Item1, DiseaseName = d.Item2, DiseaseGroup = d.Item3,
                    OnsetDate = onset, ReportDate = onset.AddDays(rng.Next(1, 3)),
                    DiagnosisDate = onset.AddDays(rng.Next(0, 2)),
                    ReportedBy = "BS. Trần Văn Hùng",
                    FacilityName = "Khoa Truyền nhiễm - BV",
                    Status = i < 5 ? 0 : (i < 15 ? 2 : 3),
                    IsNotifiable = true,
                    Outcome = i < 30 ? "Recovered" : (i < 33 ? "Ongoing" : "Deceased"),
                    ContactCount = rng.Next(0, 15),
                    TravelHistory = i % 5 == 0 ? "Gần đây có đi các tỉnh miền Tây" : null,
                    LabConfirmation = "PCR dương tính ngày " + onset.AddDays(2).ToString("dd/MM/yyyy"),
                    CreatedAt = onset.AddDays(1), UpdatedAt = ctx.Now
                });
            }
            _db.DiseaseReports.AddRange(list);
            await _db.SaveChangesAsync();
            summary["DiseaseReports"] = list.Count;
        }

        if (!await _db.OutbreakEvents.AnyAsync())
        {
            var events = new[] {
                ("Sốt xuất huyết Dengue", "A90", "Phường 5, Quận 8"),
                ("Tay chân miệng", "B08.4", "Quận Bình Tân - các trường mầm non"),
                ("Tiêu chảy cấp", "A09", "Trường THCS Nguyễn Du"),
                ("Cúm A/H1N1", "J09", "Khu công nghiệp Tân Bình")
            };
            var list = new List<OutbreakEvent>();
            for (int i = 0; i < events.Length; i++)
            {
                var e = events[i];
                var detected = ctx.Now.AddDays(-rng.Next(20, 180));
                list.Add(new OutbreakEvent
                {
                    Id = Guid.NewGuid(),
                    OutbreakCode = $"DT-{detected:yyMM}-{i + 1:D3}",
                    DiseaseName = e.Item1, DiseaseCode = e.Item2,
                    DetectedDate = detected,
                    ResolvedDate = i < 2 ? detected.AddDays(30 + rng.Next(10, 30)) : null,
                    Location = e.Item3, AffectedArea = e.Item3,
                    CaseCount = 10 + rng.Next(5, 60),
                    DeathCount = rng.Next(0, 3),
                    Status = i < 2 ? 3 : (i == 2 ? 2 : 1),
                    ResponseActions = "Cách ly, phun khử khuẩn, tăng cường truyền thông, theo dõi tiếp xúc",
                    RiskLevel = i == 0 ? "Medium" : (i == 1 ? "Low" : "High"),
                    CreatedAt = detected, UpdatedAt = ctx.Now
                });
            }
            _db.OutbreakEvents.AddRange(list);
            await _db.SaveChangesAsync();
            summary["OutbreakEvents"] = list.Count;
        }

        if (!await _db.OccupationalHealthExams.AnyAsync())
        {
            var companies = new[] {
                ("Cty TNHH Samsung VN","0312345678","Nhà máy đóng gói","Hóa chất, tiếng ồn"),
                ("Cty CP Dệt Phong Phú","0301234567","Phân xưởng dệt","Bụi bông, tiếng ồn"),
                ("Cty Sơn Nippon VN","0305678901","Phòng pha sơn","Dung môi hữu cơ, bụi"),
                ("Cty Xi măng Hà Tiên","0302345678","Nhà máy xi măng","Bụi silic, tiếng ồn")
            };
            var list = new List<OccupationalHealthExam>();
            for (int i = 0; i < 30; i++)
            {
                var c = companies[i % companies.Length];
                var date = ctx.Now.AddDays(-rng.Next(5, 180));
                list.Add(new OccupationalHealthExam
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    EmployeeName = $"Nguyễn Văn Công nhân {i + 1}",
                    EmployeeCode = $"NV{i + 1:D4}",
                    CompanyName = c.Item1, CompanyTaxCode = c.Item2,
                    Department = c.Item3, JobTitle = "Công nhân vận hành",
                    HazardExposure = c.Item4,
                    ExposureYears = 1 + rng.Next(0, 15),
                    ExamDate = date,
                    ExamType = i % 4 == 0 ? "PreEmployment" : "Periodic",
                    GeneralHealth = "Tốt",
                    RespiratoryResult = i % 5 == 0 ? "FEV1/FVC thấp hơn bình thường, theo dõi" : "Bình thường",
                    HearingResult = i % 4 == 0 ? "Giảm thính lực tần số cao 4-6kHz" : "Bình thường",
                    VisionResult = "10/10 hai mắt",
                    OccupationalDisease = i % 10 == 0 ? "Viêm phế quản mạn do tiếp xúc bụi" : null,
                    DiseaseCode = i % 10 == 0 ? "J42" : null,
                    // DB column is int; map text classification to numeric string
                    // (1 = Đủ SK, 2 = Hạn chế, 3 = Không đủ SK) so SQL cast succeeds.
                    Classification = i % 10 == 0 ? "2" : "1",
                    Recommendations = "Định kỳ kiểm tra 6 tháng/lần, đeo PPE đầy đủ",
                    DoctorName = "BS. Lê Quang Minh",
                    Status = 1,
                    CreatedAt = date, UpdatedAt = date
                });
            }
            _db.OccupationalHealthExams.AddRange(list);
            await _db.SaveChangesAsync();
            summary["OccupationalHealthExams"] = list.Count;
        }

        if (!await _db.SchoolHealthExams.AnyAsync())
        {
            var schools = new[] {
                ("THPT Lê Hồng Phong","THPT001","2025-2026"),
                ("THCS Nguyễn Huệ","THCS002","2025-2026"),
                ("Tiểu học Nguyễn Bỉnh Khiêm","TH003","2025-2026"),
            };
            var list = new List<SchoolHealthExam>();
            for (int i = 0; i < 50; i++)
            {
                var s = schools[i % schools.Length];
                var date = ctx.Now.AddDays(-rng.Next(10, 180));
                var height = 130 + rng.Next(0, 45);
                var weight = 35 + rng.Next(0, 35);
                list.Add(new SchoolHealthExam
                {
                    Id = Guid.NewGuid(),
                    SchoolName = s.Item1, SchoolCode = s.Item2, AcademicYear = s.Item3,
                    GradeLevel = (1 + rng.Next(0, 12)).ToString(),
                    StudentName = $"Học sinh {i + 1}",
                    StudentCode = $"HS{i + 1:D4}",
                    DateOfBirth = new DateTime(2008 + rng.Next(0, 12), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = i % 2 == 0 ? "Nam" : "Nữ",
                    ExamDate = date,
                    Height = height, Weight = weight,
                    BMI = Math.Round(weight / Math.Pow(height / 100.0, 2), 1),
                    NutritionStatus = i % 10 == 0 ? "Suy dinh dưỡng" : (i % 12 == 0 ? "Thừa cân" : "Bình thường"),
                    VisionLeft = i % 6 == 0 ? "6/10" : "10/10", VisionRight = i % 7 == 0 ? "6/10" : "10/10",
                    HasVisionProblem = i % 6 == 0 || i % 7 == 0,
                    DentalResult = i % 5 == 0 ? "Có sâu răng" : "Bình thường",
                    DentalCavityCount = i % 5 == 0 ? rng.Next(1, 4) : 0,
                    SpineResult = i % 15 == 0 ? "Vẹo cột sống nhẹ" : "Bình thường",
                    OverallResult = i % 10 == 0 ? "Loại II" : "Loại I",
                    Recommendations = i % 6 == 0 ? "Khuyến khích khám chuyên khoa mắt" : null,
                    DoctorName = "BS. Phạm Thu Hương",
                    Status = 1,
                    CreatedAt = date, UpdatedAt = date
                });
            }
            _db.SchoolHealthExams.AddRange(list);
            await _db.SaveChangesAsync();
            summary["SchoolHealthExams"] = list.Count;
        }

        if (!await _db.HealthCheckups.AnyAsync())
        {
            var list = new List<HealthCheckup>();
            for (int i = 0; i < 40; i++)
            {
                var date = ctx.Now.AddDays(-rng.Next(1, 180));
                var height = 150f + rng.Next(0, 40);
                var weight = 50f + rng.Next(0, 40);
                list.Add(new HealthCheckup
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    CheckupType = new[] { "General18", "Periodic", "Driver", "Student", "Elderly" }[i % 5],
                    FormCode = new[] { "Mau01", "Mau02", "TT36", "PL1", "TT28" }[i % 5],
                    Status = 2,
                    ExamResult = i % 20 == 0 ? "Không đủ điều kiện sức khỏe" : "Đủ điều kiện",
                    Classification = new[] { "Loại I", "Loại II", "Loại III" }[i % 3],
                    InternalMedicine = "Không phát hiện bất thường",
                    Surgery = "Bình thường",
                    Ophthalmology = i % 4 == 0 ? "Cận thị nhẹ -0.75D hai mắt" : "Thị lực 10/10 hai mắt",
                    ENT = "Bình thường", Dental = "Sâu 1 răng hàm phải", Dermatology = "Bình thường",
                    Height = height, Weight = weight,
                    BMI = (float)Math.Round(weight / Math.Pow(height / 100f, 2), 1),
                    BloodPressure = $"{110 + rng.Next(0, 40)}/{70 + rng.Next(0, 20)}",
                    HeartRate = 70 + rng.Next(0, 30),
                    BloodType = new[] { "A+", "B+", "O+", "AB+", "O-" }[i % 5],
                    VisionLeft = "10/10", VisionRight = "10/10",
                    XrayResult = "Không thấy tổn thương trên phim ngực thẳng",
                    DoctorName = "BS. Nguyễn Hoàng Anh",
                    ExamDate = date, CertificateDate = date.AddDays(1),
                    CertificateNumber = $"GSKS-{date:yyyy}-{i + 1:D5}",
                    CreatedAt = date, UpdatedAt = date
                });
            }
            _db.HealthCheckups.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HealthCheckups"] = list.Count;
        }

        return Ok(new { success = true, module = "public-health", inserted = summary });
    }

    // ==========================================================================
    // METHADONE
    // ==========================================================================
    [HttpPost("methadone")]
    public async Task<IActionResult> PopulateMethadone()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(61);
        if (ctx.PatientIds.Count == 0) return Ok(new { success = false, error = "no patients" });

        if (!await _db.MethadonePatients.AnyAsync())
        {
            var phases = new[] { "Induction", "Stabilization", "Maintenance", "Maintenance", "Tapering" };
            var patients = new List<MethadonePatient>();
            for (int i = 0; i < 20; i++)
            {
                var enroll = ctx.Now.AddDays(-rng.Next(30, 720));
                var ph = phases[i % phases.Length];
                patients.Add(new MethadonePatient
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientCode = $"MMT-{enroll:yyyy}-{i + 1:D4}",
                    EnrollmentDate = enroll,
                    CurrentDoseMg = ph == "Induction" ? 20 + rng.Next(0, 30)
                        : ph == "Tapering" ? 20 + rng.Next(0, 40)
                        : 60 + rng.Next(0, 60),
                    // DB column is int (legacy schema), map phase name to numeric string
                    // so SQL Server's implicit VARCHAR→INT conversion still works.
                    Phase = ph == "Induction" ? "1" : ph == "Stabilization" ? "2"
                          : ph == "Tapering" ? "4" : "3",
                    Status = 0,
                    MissedDoseCount = rng.Next(0, 10),
                    LastDosingDate = ctx.Now.AddDays(-rng.Next(0, 3)),
                    CreatedAt = enroll, UpdatedAt = ctx.Now
                });
            }
            _db.MethadonePatients.AddRange(patients);
            await _db.SaveChangesAsync();
            summary["MethadonePatients"] = patients.Count;

            var dosing = new List<MethadoneDosingRecord>();
            var urine = new List<MethadoneUrineTest>();
            foreach (var p in patients)
            {
                for (int d = 0; d < 30; d++)
                {
                    var when = ctx.Now.AddDays(-d);
                    dosing.Add(new MethadoneDosingRecord
                    {
                        Id = Guid.NewGuid(),
                        MethadonePatientId = p.Id,
                        DosingDate = when,
                        DoseMg = p.CurrentDoseMg + rng.Next(-5, 6),
                        Witnessed = rng.Next(0, 5) != 0,
                        TakeHome = rng.Next(0, 5) == 0,
                        AdministeredBy = "DS. Trần Thị Kim Anh",
                        Status = rng.Next(0, 15) == 0 ? 1 : 0,
                        CreatedAt = when, UpdatedAt = when
                    });
                }
                for (int u = 0; u < 4; u++)
                {
                    var when = ctx.Now.AddDays(-rng.Next(5, 60));
                    urine.Add(new MethadoneUrineTest
                    {
                        Id = Guid.NewGuid(),
                        MethadonePatientId = p.Id,
                        TestDate = when,
                        IsRandom = rng.Next(0, 2) == 0,
                        Morphine = rng.Next(0, 10) == 0 ? "Positive" : "Negative",
                        Amphetamine = "Negative",
                        Methamphetamine = rng.Next(0, 10) == 0 ? "Positive" : "Negative",
                        THC = rng.Next(0, 15) == 0 ? "Positive" : "Negative",
                        Benzodiazepine = "Negative",
                        Methadone = "Positive",
                        OverallResult = rng.Next(0, 8) == 0 ? "Có dùng ma túy bất hợp pháp" : "Tuân thủ điều trị",
                        CreatedAt = when, UpdatedAt = when
                    });
                }
            }
            _db.MethadoneDosingRecords.AddRange(dosing);
            _db.MethadoneUrineTests.AddRange(urine);
            await _db.SaveChangesAsync();
            summary["MethadoneDosingRecords"] = dosing.Count;
            summary["MethadoneUrineTests"] = urine.Count;
        }

        return Ok(new { success = true, module = "methadone", inserted = summary });
    }

    // ==========================================================================
    // LAB QC (Kiểm soát chất lượng XN)
    // ==========================================================================
    [HttpPost("lab-qc")]
    public async Task<IActionResult> PopulateLabQC()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(67);

        if (!await _db.LabQCResults.AnyAsync())
        {
            var analyzers = await _db.LabAnalyzers.Take(5).Select(a => a.Id).ToListAsync();
            var services = await _db.Services.Where(s => s.ServiceType == 2).Take(10).Select(s => new { s.Id, s.ServiceCode }).ToListAsync();
            if (analyzers.Count == 0 || services.Count == 0)
                return Ok(new { success = false, error = "no analyzers or lab services" });

            var results = new List<LabQCResult>();
            foreach (var aId in analyzers)
            {
                foreach (var s in services.Take(8))
                {
                    foreach (var level in new[] { "Level1", "Level2", "Level3" })
                    {
                        for (int d = 0; d < 10; d++)
                        {
                            var run = ctx.Now.AddDays(-d).AddHours(-rng.Next(0, 12));
                            decimal mean = level == "Level1" ? 5m : level == "Level2" ? 10m : 20m;
                            decimal sd = mean * 0.05m;
                            decimal deviation = (decimal)(rng.NextDouble() * 4 - 2) * sd;
                            decimal value = mean + deviation;
                            decimal z = deviation / sd;
                            bool accepted = Math.Abs((double)z) <= 2.5;
                            results.Add(new LabQCResult
                            {
                                Id = Guid.NewGuid(),
                                AnalyzerId = aId, ServiceId = s.Id,
                                TestCode = s.ServiceCode,
                                QCLevel = level,
                                QCLotNumber = $"QC-{level}-{run:yyyyMM}",
                                RunTime = run,
                                Value = Math.Round(value, 3),
                                Mean = mean, SD = sd,
                                CV = Math.Round(sd / mean * 100, 2),
                                ZScore = Math.Round(z, 2),
                                IsAccepted = accepted,
                                WestgardRule = accepted ? null : (Math.Abs((double)z) > 3 ? "1-3s" : "2-2s"),
                                Violations = accepted ? null : "Violation detected",
                                PerformedBy = ctx.NurseIds.Count > 0 ? ctx.NurseIds[0] : null,
                                CreatedAt = run, UpdatedAt = run
                            });
                        }
                    }
                }
            }
            _db.LabQCResults.AddRange(results);
            await _db.SaveChangesAsync();
            summary["LabQCResults"] = results.Count;
        }

        return Ok(new { success = true, module = "lab-qc", inserted = summary });
    }

    // ==========================================================================
    // MCI (Mass Casualty Incident)
    // ==========================================================================
    [HttpPost("mci")]
    public async Task<IActionResult> PopulateMCI()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(71);

        if (!await _db.MCIEvents.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var events = new[] {
                ("Tai nạn giao thông xe khách QL1A","Accident","QL1A đoạn Bình Thuận - Phan Thiết","Orange",25),
                ("Cháy chung cư Bình Tân","Fire","Chung cư Carina Plaza","Orange",40),
                ("Ngộ độc thực phẩm tiệc công ty","Chemical","Cty may mặc Khu CN Tân Tạo","Yellow",8),
                ("Sập công trình xây dựng","Accident","Công trình 123 đường Điện Biên Phủ","Yellow",12)
            };
            var list = new List<MCIEvent>();
            for (int i = 0; i < events.Length; i++)
            {
                var e = events[i];
                var alert = ctx.Now.AddDays(-rng.Next(5, 90)).AddHours(-rng.Next(0, 24));
                list.Add(new MCIEvent
                {
                    Id = Guid.NewGuid(),
                    EventCode = $"MCI-{alert:yyMMdd}-{i + 1:D2}",
                    EventName = e.Item1, EventType = e.Item2,
                    EventLocation = e.Item3,
                    AlertReceivedAt = alert,
                    ActivatedAt = alert.AddMinutes(rng.Next(5, 20)),
                    DeactivatedAt = i < 3 ? alert.AddHours(rng.Next(6, 24)) : null,
                    AlertLevel = e.Item4, EstimatedVictims = e.Item5,
                    ActualVictims = e.Item5 - rng.Next(0, 5),
                    Status = i < 3 ? "Deactivated" : "Active",
                    IncidentCommanderId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    BedsActivated = e.Item5 + 5,
                    StaffMobilized = e.Item5 * 2,
                    BloodBankAlerted = e.Item5 > 10,
                    ORsCleared = e.Item5 > 10,
                    ReportedToAuthority = true,
                    ReportedAt = alert.AddHours(1),
                    AfterActionReport = i < 2 ? "Đáp ứng kịp thời, điều phối tốt giữa các khoa. Cần cải thiện quy trình triage tại cửa cấp cứu." : null,
                    CreatedAt = alert, UpdatedAt = ctx.Now
                });
            }
            _db.MCIEvents.AddRange(list);
            await _db.SaveChangesAsync();
            summary["MCIEvents"] = list.Count;
        }

        return Ok(new { success = true, module = "mci", inserted = summary });
    }

    // ==========================================================================
    // CME RECORDS
    // ==========================================================================
    [HttpPost("cme")]
    public async Task<IActionResult> PopulateCME()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(73);

        if (!await _db.CMERecords.AnyAsync())
        {
            var staff = await _db.MedicalStaffs.Take(30).Select(s => s.Id).ToListAsync();
            if (staff.Count == 0) return Ok(new { success = false, error = "no staff" });

            var activities = new[] {
                ("Hội nghị Tim mạch toàn quốc 2025","Conference","Hội Tim mạch VN",12),
                ("Workshop cập nhật điều trị ĐTĐ type 2","Workshop","BV Đại học Y Dược",6),
                ("Đào tạo hồi sức sơ sinh","Workshop","Viện Sức khỏe Trẻ em",8),
                ("Khóa học online: Kỹ năng giao tiếp BS-BN","Online","Bộ Y tế",3),
                ("Tự học CME: Cập nhật kháng sinh đồ","Self-study","Sách chuyên khảo",2),
                ("Hội thảo điều trị COVID-19 biến thể mới","Conference","Bệnh viện Nhiệt đới TW",4),
                ("Thực hành gây mê hồi sức","Workshop","BV Chợ Rẫy",16),
                ("Online module: Y học chứng cứ","Online","UpToDate",5)
            };
            var records = new List<CMERecord>();
            foreach (var sId in staff)
            {
                int n = rng.Next(2, 6);
                for (int i = 0; i < n; i++)
                {
                    var a = activities[rng.Next(activities.Length)];
                    var date = ctx.Now.AddDays(-rng.Next(30, 730));
                    records.Add(new CMERecord
                    {
                        Id = Guid.NewGuid(),
                        StaffId = sId,
                        ActivityName = a.Item1, ActivityType = a.Item2, Provider = a.Item3,
                        ActivityDate = date,
                        CreditHours = a.Item4,
                        CertificateNumber = $"CME-{date:yyyy}-{rng.Next(1000, 9999)}",
                        IsVerified = rng.Next(0, 5) != 0,
                        CreatedAt = date, UpdatedAt = ctx.Now
                    });
                }
            }
            _db.CMERecords.AddRange(records);
            await _db.SaveChangesAsync();
            summary["CMERecords"] = records.Count;
        }

        return Ok(new { success = true, module = "cme", inserted = summary });
    }

    // ==========================================================================
    // MEDINET EXTRAS — Hiv, TbHiv, Mental, Traditional, Trauma, ChronicDisease,
    // Forensic, ClinicalGuidance, InterHospital, Waste, EnvMonitoring, Campaigns,
    // Materials, PracticeLicense, Population, Prenatal, FamilyPlanning, SatisfactionTpl
    // ==========================================================================
    [HttpPost("medinet-extras")]
    public async Task<IActionResult> PopulateMedinetExtras()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(79);
        if (ctx.PatientIds.Count == 0) return Ok(new { success = false, error = "no patients" });

        // HIV patients + lab results
        if (!await _db.HivPatients.AnyAsync())
        {
            var regimens = new[] { "TDF+3TC+DTG", "TDF+3TC+EFV", "AZT+3TC+NVP", "ABC+3TC+LPV/r" };
            var list = new List<HivPatient>();
            for (int i = 0; i < 25; i++)
            {
                var dx = ctx.Now.AddDays(-rng.Next(180, 2190));
                list.Add(new HivPatient
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    HivCode = $"HIV-{dx:yyyy}-{i + 1:D4}",
                    DiagnosisDate = dx,
                    DiagnosisType = new[] { "VCT", "HTC", "PMTCT" }[i % 3],
                    ConfirmationDate = dx.AddDays(rng.Next(3, 14)),
                    CurrentARTRegimen = regimens[i % regimens.Length],
                    ARTStartDate = dx.AddDays(rng.Next(14, 60)),
                    ARTStatus = i < 20 ? 1 : (i < 23 ? 2 : 5),
                    WHOStage = 1 + rng.Next(0, 4),
                    LastCD4Count = 200 + rng.Next(0, 800),
                    LastCD4Date = ctx.Now.AddDays(-rng.Next(30, 180)),
                    LastViralLoad = rng.Next(0, 5) == 0 ? 10000 + rng.Next(0, 900000) : rng.Next(20, 200),
                    LastViralLoadDate = ctx.Now.AddDays(-rng.Next(30, 180)),
                    IsVirallySuppressed = rng.Next(0, 5) != 0,
                    CoInfections = rng.Next(0, 4) == 0 ? "HepB,TB" : null,
                    CreatedAt = dx, UpdatedAt = ctx.Now
                });
            }
            _db.HivPatients.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HivPatients"] = list.Count;
        }

        // TB/HIV records
        if (!await _db.TbHivRecords.AnyAsync())
        {
            var list = new List<TbHivRecord>();
            for (int i = 0; i < 20; i++)
            {
                var reg = ctx.Now.AddDays(-rng.Next(30, 730));
                list.Add(new TbHivRecord
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    RecordType = new[] { "TB", "HIV", "TB_HIV" }[i % 3],
                    RegistrationDate = reg,
                    RegistrationCode = $"REG-{reg:yyyy}-{i + 1:D4}",
                    TreatmentCategory = new[] { "New", "Relapse", "New", "New" }[i % 4],
                    TreatmentRegimen = i % 3 == 0 ? "2RHZE/4RH" : "TDF+3TC+DTG",
                    TreatmentStartDate = reg.AddDays(rng.Next(0, 7)),
                    ExpectedEndDate = reg.AddMonths(6),
                    Status = i < 15 ? "OnTreatment" : (i < 18 ? "Completed" : "DefaultedLostToFollowUp"),
                    SmearResult = i % 3 == 0 ? "Positive" : "Negative",
                    GeneXpertResult = i % 4 == 0 ? "Detected" : (i % 4 == 1 ? "RifResistant" : "NotDetected"),
                    TbSite = "Pulmonary",
                    IsMdr = i % 10 == 0,
                    CreatedAt = reg, UpdatedAt = ctx.Now
                });
            }
            _db.TbHivRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["TbHivRecords"] = list.Count;
        }

        // Mental Health
        if (!await _db.MentalHealthCases.AnyAsync())
        {
            var types = new[] { "schizophrenia", "depression", "anxiety", "bipolar", "ptsd", "substance" };
            var diags = new[] { ("F20", "Tâm thần phân liệt"), ("F32", "Trầm cảm"), ("F41", "Rối loạn lo âu"),
                ("F31", "Rối loạn lưỡng cực"), ("F43", "PTSD"), ("F19", "Rối loạn do chất") };
            var list = new List<MentalHealthCase>();
            for (int i = 0; i < 22; i++)
            {
                var d = diags[i % diags.Length];
                list.Add(new MentalHealthCase
                {
                    Id = Guid.NewGuid(),
                    CaseCode = $"MHC-{ctx.Now:yyyy}-{i + 1:D4}",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN Tâm thần {i + 1}",
                    DateOfBirth = new DateTime(1960 + rng.Next(50), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = i % 2 == 0 ? 1 : 2,
                    DiagnosisCode = d.Item1, DiagnosisName = d.Item2,
                    Severity = new[] { "mild", "moderate", "severe" }[i % 3],
                    CaseType = types[i % types.Length],
                    TreatingDoctor = "BS. Phan Văn Minh (Khoa TT)",
                    CommunityWorker = "NV cộng đồng phường " + (1 + rng.Next(0, 15)),
                    MedicationRegimen = "Olanzapine 5mg, Sertraline 50mg",
                    AdherenceLevel = i % 4 == 0 ? "poor" : (i % 3 == 0 ? "fair" : "good"),
                    LastVisitDate = ctx.Now.AddDays(-rng.Next(7, 60)),
                    NextVisitDate = ctx.Now.AddDays(rng.Next(1, 30)),
                    Status = i < 15 ? 0 : (i < 20 ? 1 : 2),
                    EmergencyContactName = "Gia đình BN",
                    EmergencyContactPhone = $"09{rng.Next(10000000, 99999999)}",
                    CreatedAt = ctx.Now.AddDays(-rng.Next(30, 365)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.MentalHealthCases.AddRange(list);
            await _db.SaveChangesAsync();
            summary["MentalHealthCases"] = list.Count;
        }

        // Traditional Medicine
        if (!await _db.TraditionalMedicineTreatments.AnyAsync())
        {
            var types = new[] { "acupuncture", "herbal", "massage", "cupping", "combined" };
            var diagTCM = new[] { "Phong hàn", "Thấp nhiệt", "Âm hư", "Dương hư", "Khí huyết hư" };
            var list = new List<TraditionalMedicineTreatment>();
            for (int i = 0; i < 20; i++)
            {
                var start = ctx.Now.AddDays(-rng.Next(7, 90));
                list.Add(new TraditionalMedicineTreatment
                {
                    Id = Guid.NewGuid(),
                    TreatmentCode = $"YHCT-{start:yyyy}-{i + 1:D4}",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN YHCT {i + 1}",
                    TreatmentType = types[i % types.Length],
                    DiagnosisTCM = diagTCM[i % diagTCM.Length],
                    DiagnosisWestern = new[] { "Thoái hoá cột sống", "Đau vai gáy", "Đau đầu", "Mất ngủ", "Liệt nửa người" }[i % 5],
                    SessionNumber = 1 + (i % 12),
                    TreatmentPlan = "Châm cứu 3 lần/tuần, kết hợp thuốc thang 5 thang",
                    Practitioner = "BS. Lê Văn Y (YHCT)",
                    Status = i < 12 ? 0 : 1,
                    StartDate = start, EndDate = i < 12 ? null : start.AddDays(rng.Next(14, 40)),
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.TraditionalMedicineTreatments.AddRange(list);
            await _db.SaveChangesAsync();
            summary["TraditionalMedicineTreatments"] = list.Count;
        }

        // Trauma Cases
        if (!await _db.TraumaCases.AnyAsync())
        {
            var types = new[] { "road_traffic", "fall", "assault", "burn", "workplace", "sport" };
            var list = new List<TraumaCase>();
            for (int i = 0; i < 25; i++)
            {
                var adm = ctx.Now.AddDays(-rng.Next(5, 180));
                list.Add(new TraumaCase
                {
                    Id = Guid.NewGuid(),
                    CaseCode = $"CT-{adm:yyyy}-{i + 1:D4}",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN chấn thương {i + 1}",
                    DateOfBirth = new DateTime(1970 + rng.Next(40), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = i % 2 == 0 ? 1 : 2,
                    AdmissionDate = adm,
                    InjuryDate = adm.AddHours(-rng.Next(1, 6)),
                    InjuryType = types[i % types.Length],
                    InjuryMechanism = "Tai nạn xe máy tự ngã" + (i % 3 == 0 ? ", không đội mũ BH" : ""),
                    InjuryLocation = new[] { "Đầu-mặt", "Ngực", "Bụng", "Chi trên", "Chi dưới", "Cột sống" }[i % 6],
                    InjurySeverityScore = 9 + rng.Next(0, 30),
                    RevisedTraumaScore = 5m + (decimal)rng.NextDouble() * 3,
                    GlasgowComaScale = 13 + rng.Next(0, 3),
                    TriageCategory = new[] { "red", "yellow", "green" }[i % 3],
                    Intentionality = "unintentional",
                    AlcoholInvolved = i % 4 == 0,
                    TransportMode = i % 2 == 0 ? "ambulance" : "private",
                    PreHospitalTime = 15 + rng.Next(5, 45),
                    SurgeryRequired = i % 3 == 0,
                    IcuAdmission = i % 5 == 0,
                    VentilatorDays = i % 5 == 0 ? rng.Next(1, 7) : null,
                    LengthOfStay = 3 + rng.Next(0, 20),
                    Outcome = i < 22 ? "discharged" : "died",
                    DischargeDate = i < 22 ? adm.AddDays(3 + rng.Next(0, 20)) : null,
                    CreatedAt = adm, UpdatedAt = ctx.Now
                });
            }
            _db.TraumaCases.AddRange(list);
            await _db.SaveChangesAsync();
            summary["TraumaCases"] = list.Count;
        }

        // Chronic Disease
        if (!await _db.ChronicDiseaseRecords.AnyAsync())
        {
            var icds = new[] { ("E11", "Đái tháo đường typ 2"), ("I10", "Tăng huyết áp vô căn"),
                ("E78", "Rối loạn lipid máu"), ("J44", "COPD"), ("M10", "Gout"),
                ("N18", "Bệnh thận mạn"), ("E03", "Suy giáp"), ("K74", "Xơ gan") };
            var list = new List<ChronicDiseaseRecord>();
            for (int i = 0; i < 40; i++)
            {
                var icd = icds[i % icds.Length];
                var dx = ctx.Now.AddDays(-rng.Next(90, 2190));
                list.Add(new ChronicDiseaseRecord
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    IcdCode = icd.Item1, IcdName = icd.Item2,
                    DiagnosisDate = dx,
                    Status = i < 34 ? "Active" : (i < 38 ? "Remission" : "Closed"),
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    FollowUpIntervalDays = 30 * (1 + i % 3),
                    NextFollowUpDate = ctx.Now.AddDays(rng.Next(-15, 45)),
                    CreatedAt = dx, UpdatedAt = ctx.Now
                });
            }
            _db.ChronicDiseaseRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["ChronicDiseaseRecords"] = list.Count;
        }

        // Forensic Cases
        if (!await _db.ForensicCases.AnyAsync())
        {
            var types = new[] { "disability", "driver", "employment", "insurance", "court" };
            var list = new List<ForensicCase>();
            for (int i = 0; i < 18; i++)
            {
                var req = ctx.Now.AddDays(-rng.Next(15, 180));
                list.Add(new ForensicCase
                {
                    Id = Guid.NewGuid(),
                    CaseCode = $"GĐ-{req:yyyy}-{i + 1:D4}",
                    CaseType = types[i % types.Length],
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN giám định {i + 1}",
                    DateOfBirth = new DateTime(1960 + rng.Next(50), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = i % 2 == 0 ? 1 : 2,
                    Cccd = $"0{rng.Next(10, 99)}{rng.Next(100000000, 999999999)}",
                    RequestingOrganization = new[] { "BHXH TP.HCM", "Cty TNHH ABC", "TAND Q.1", "Sở LĐTBXH" }[i % 4],
                    RequestDate = req,
                    ExaminationDate = req.AddDays(rng.Next(3, 21)),
                    Status = i < 14 ? 2 : (i < 16 ? 1 : 0),
                    DisabilityPercentage = i % 3 == 0 ? 30 + rng.Next(0, 50) : null,
                    Conclusion = i < 14 ? "Suy giảm khả năng lao động từ 31-40% do di chứng chấn thương" : null,
                    CreatedAt = req, UpdatedAt = ctx.Now
                });
            }
            _db.ForensicCases.AddRange(list);
            await _db.SaveChangesAsync();
            summary["ForensicCases"] = list.Count;
        }

        // Clinical Guidance (chỉ đạo tuyến)
        if (!await _db.ClinicalGuidanceBatches.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var list = new List<ClinicalGuidanceBatch>();
            for (int i = 0; i < 8; i++)
            {
                var start = ctx.Now.AddDays(-rng.Next(30, 300));
                list.Add(new ClinicalGuidanceBatch
                {
                    Id = Guid.NewGuid(),
                    Code = $"CDT-{start:yyyy}-{i + 1:D3}",
                    Title = new[] {
                        "Khám chữa bệnh tuyến huyện Q1/2026",
                        "Đào tạo kỹ thuật nội soi cho BV tuyến tỉnh",
                        "Chuyển giao kỹ thuật mổ nội soi ổ bụng",
                        "Hỗ trợ chuyên môn BV tuyến dưới về CĐHA"
                    }[i % 4],
                    TargetFacility = new[] { "BV Đa khoa huyện Củ Chi", "BV huyện Hóc Môn", "TTYT Q12", "BV Đa khoa Tây Ninh" }[i % 4],
                    TargetFacilityCode = $"BV-{i + 100}",
                    GuidanceType = new[] { "KhamChua", "DaoTao", "ChuyenGiao", "HoTro" }[i % 4],
                    StartDate = start,
                    EndDate = start.AddDays(7 + rng.Next(3, 21)),
                    Status = i < 5 ? "Completed" : (i < 7 ? "InProgress" : "Planning"),
                    LeadDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Budget = 50000000 + rng.Next(0, 200000000),
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.ClinicalGuidanceBatches.AddRange(list);
            await _db.SaveChangesAsync();
            summary["ClinicalGuidanceBatches"] = list.Count;
        }

        // Inter-Hospital
        if (!await _db.InterHospitalRequests.AnyAsync())
        {
            var list = new List<InterHospitalRequest>();
            for (int i = 0; i < 15; i++)
            {
                var req = ctx.Now.AddDays(-rng.Next(1, 90));
                list.Add(new InterHospitalRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"LV-{req:yyyyMM}-{i + 1:D3}",
                    RequestType = new[] { "consultation", "patient_transfer", "record_sharing", "drug_lookup" }[i % 4],
                    RequestingFacility = new[] { "BV Đa khoa Tỉnh ABC", "TTYT huyện XYZ", "BV Quận 9" }[i % 3],
                    ReceivingFacility = "Bệnh viện của chúng tôi",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN chuyển viện {i + 1}",
                    Urgency = new[] { "routine", "urgent", "emergency" }[i % 3],
                    RequestDate = req,
                    ResponseDate = i < 12 ? req.AddHours(rng.Next(1, 48)) : null,
                    Status = i < 10 ? 3 : (i < 12 ? 1 : 0),
                    RequestDetails = "Xin hội chẩn BN nghi u não, MRI sọ não có phì thuỳ thái dương",
                    RequestedBy = "BS. Nguyễn Văn A",
                    RespondedBy = i < 12 ? "BS. Phạm B" : null,
                    CreatedAt = req, UpdatedAt = ctx.Now
                });
            }
            _db.InterHospitalRequests.AddRange(list);
            await _db.SaveChangesAsync();
            summary["InterHospitalRequests"] = list.Count;
        }

        // Waste Records
        if (!await _db.WasteRecords.AnyAsync())
        {
            var types = new[] { "infectious", "sharp", "chemical", "pharmaceutical", "general" };
            var methods = new[] { "autoclave", "incineration", "chemical", "landfill", "return" };
            var list = new List<WasteRecord>();
            for (int i = 0; i < 40; i++)
            {
                var rd = ctx.Now.AddDays(-rng.Next(0, 90));
                list.Add(new WasteRecord
                {
                    Id = Guid.NewGuid(),
                    RecordCode = $"WR-{rd:yyMMdd}-{i + 1:D3}",
                    RecordDate = rd,
                    WasteType = types[i % types.Length],
                    Quantity = 5 + rng.Next(0, 50),
                    DisposalMethod = methods[i % methods.Length],
                    DisposalDate = rd.AddDays(rng.Next(0, 3)),
                    DisposedBy = "Cty Môi trường Đô thị",
                    CollectorName = "NV Trần Văn X",
                    CollectorLicense = "MT-" + rng.Next(1000, 9999),
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    Status = 2,
                    CreatedAt = rd, UpdatedAt = rd
                });
            }
            _db.WasteRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["WasteRecords"] = list.Count;
        }

        // Environmental Monitoring
        if (!await _db.EnvironmentalMonitorings.AnyAsync())
        {
            var types = new[] { "air", "water", "noise", "radiation", "temperature" };
            var units = new[] { "µg/m³", "mg/L", "dB", "µSv/h", "°C" };
            var limits = new decimal[] { 50, 1.5m, 70, 1.0m, 26 };
            var list = new List<EnvironmentalMonitoring>();
            for (int i = 0; i < 30; i++)
            {
                var idx = i % types.Length;
                var measured = limits[idx] * (decimal)(0.5 + rng.NextDouble());
                var when = ctx.Now.AddDays(-rng.Next(0, 60));
                list.Add(new EnvironmentalMonitoring
                {
                    Id = Guid.NewGuid(),
                    MonitoringCode = $"MT-{when:yyMMdd}-{i + 1:D3}",
                    MonitoringDate = when,
                    MonitoringType = types[idx],
                    Location = new[] { "Phòng mổ", "Khu cách ly", "Kho dược", "Hành lang khoa khám", "Sân BV" }[i % 5],
                    MeasuredValue = Math.Round(measured, 2),
                    Unit = units[idx],
                    StandardLimit = limits[idx],
                    IsCompliant = measured <= limits[idx],
                    InstrumentUsed = new[] { "Airmetrics SEV", "YSI Pro10", "Testo 815", "Mirion Rad-ID" }[i % 4],
                    MeasuredBy = "KTV. Lê Hoàng",
                    CreatedAt = when, UpdatedAt = when
                });
            }
            _db.EnvironmentalMonitorings.AddRange(list);
            await _db.SaveChangesAsync();
            summary["EnvironmentalMonitorings"] = list.Count;
        }

        // Health Campaigns + Materials
        if (!await _db.HealthCampaigns.AnyAsync())
        {
            var list = new List<HealthCampaign>();
            var titles = new[] {
                "Tuần lễ dinh dưỡng thế giới 2026",
                "Chiến dịch phòng chống SXH cộng đồng",
                "Giáo dục SK tâm thần học đường",
                "Sàng lọc ung thư vú miễn phí",
                "Ngày Đái tháo đường thế giới",
                "Phòng chống COVID-19 mùa đông"
            };
            for (int i = 0; i < titles.Length; i++)
            {
                var start = ctx.Now.AddDays(-rng.Next(30, 300));
                list.Add(new HealthCampaign
                {
                    Id = Guid.NewGuid(),
                    CampaignCode = $"HC-{start:yyyy}-{i + 1:D3}",
                    Title = titles[i],
                    Description = "Nâng cao nhận thức + tư vấn sức khoẻ cộng đồng",
                    CampaignType = new[] { "nutrition", "disease_prevention", "mental_health", "ncd", "ncd", "disease_prevention" }[i],
                    TargetAudience = "Người dân trên địa bàn",
                    StartDate = start, EndDate = start.AddDays(7 + i * 2),
                    Location = "TP. Hồ Chí Minh",
                    Organizer = "Sở Y tế phối hợp Bệnh viện",
                    ParticipantCount = 300 + rng.Next(100, 2000),
                    Budget = 50000000 + rng.Next(0, 200000000),
                    Status = i < 4 ? 2 : 1,
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.HealthCampaigns.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HealthCampaigns"] = list.Count;
        }

        if (!await _db.HealthEducationMaterials.AnyAsync())
        {
            var list = new List<HealthEducationMaterial>();
            var titles = new[] {
                ("Hướng dẫn phòng chống COVID-19","poster","covid"),
                ("Dinh dưỡng cho bà mẹ mang thai","leaflet","maternal"),
                ("Kỹ năng sơ cứu cơ bản tại nhà","video","first_aid"),
                ("Cẩm nang chăm sóc người cao tuổi","manual","geriatrics"),
                ("Trình bày: Đái tháo đường typ 2","presentation","diabetes"),
                ("Infographic: Tiêm chủng trẻ em","poster","immunization"),
                ("Video: Cai thuốc lá hiệu quả","video","smoking"),
                ("Leaflet: Phòng sốt xuất huyết","leaflet","dengue")
            };
            for (int i = 0; i < titles.Length; i++)
            {
                list.Add(new HealthEducationMaterial
                {
                    Id = Guid.NewGuid(),
                    MaterialCode = $"HEM-{ctx.Now:yyyy}-{i + 1:D3}",
                    Title = titles[i].Item1,
                    MaterialType = titles[i].Item2,
                    Topic = titles[i].Item3,
                    Language = "vi",
                    FilePath = $"/uploads/health-edu/{titles[i].Item3}-{i + 1}.pdf",
                    FileSize = 500000 + rng.Next(100000, 5000000),
                    Downloads = rng.Next(50, 2000),
                    IsActive = true,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.HealthEducationMaterials.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HealthEducationMaterials"] = list.Count;
        }

        // Practice License
        if (!await _db.PracticeLicenses.AnyAsync())
        {
            var types = new[] { "doctor", "nurse", "pharmacist", "midwife", "technician" };
            var specialties = new[] { "Nội khoa", "Ngoại khoa", "Sản phụ khoa", "Nhi khoa", "Mắt", "TMH", "CĐHA", "Gây mê hồi sức" };
            var names = new[] { "Nguyễn Văn An", "Trần Thị Hương", "Lê Quang Vinh", "Phạm Minh Tuấn",
                "Hoàng Thu Trang", "Bùi Đức Khanh", "Đặng Ngọc Linh", "Võ Hữu Long", "Đỗ Xuân Anh",
                "Ngô Bảo Khánh" };
            var list = new List<PracticeLicense>();
            for (int i = 0; i < 30; i++)
            {
                var issue = ctx.Now.AddYears(-rng.Next(1, 15));
                list.Add(new PracticeLicense
                {
                    Id = Guid.NewGuid(),
                    LicenseCode = $"CCHN-{issue:yyyy}-{i + 1:D5}",
                    LicenseType = types[i % types.Length],
                    HolderName = names[i % names.Length],
                    DateOfBirth = new DateTime(1970 + rng.Next(25), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Cccd = $"0{rng.Next(10, 99)}{rng.Next(100000000, 999999999)}",
                    Specialty = specialties[i % specialties.Length],
                    IssuingAuthority = "Bộ Y Tế / Sở Y tế TP.HCM",
                    IssueDate = issue,
                    ExpiryDate = issue.AddYears(5),
                    Status = issue.AddYears(5) > ctx.Now ? 0 : 1,
                    FacilityName = "Bệnh viện Đa khoa",
                    CertificateNumber = $"CN-{issue:yyyy}-{rng.Next(10000, 99999)}",
                    TrainingInstitution = new[] { "ĐH Y Dược TP.HCM", "ĐH Y Hà Nội", "ĐH Y khoa Phạm Ngọc Thạch" }[i % 3],
                    GraduationYear = issue.Year - rng.Next(1, 10),
                    CreatedAt = issue, UpdatedAt = ctx.Now
                });
            }
            _db.PracticeLicenses.AddRange(list);
            await _db.SaveChangesAsync();
            summary["PracticeLicenses"] = list.Count;
        }

        // Population records
        if (!await _db.PopulationRecords.AnyAsync())
        {
            var list = new List<PopulationRecord>();
            for (int i = 0; i < 35; i++)
            {
                var d = ctx.Now.AddDays(-rng.Next(30, 720));
                list.Add(new PopulationRecord
                {
                    Id = Guid.NewGuid(),
                    RecordCode = $"DS-{d:yyyy}-{i + 1:D4}",
                    RecordType = new[] { "family_planning", "elderly_care", "birth_report", "population_survey" }[i % 4],
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"Người dân {i + 1}",
                    DateOfBirth = new DateTime(1950 + rng.Next(60), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = i % 2 == 0 ? 1 : 2,
                    Ward = $"Phường {1 + rng.Next(0, 15)}",
                    District = $"Quận {1 + rng.Next(0, 13)}",
                    ServiceDate = d,
                    ServiceType = "Khám SK định kỳ",
                    Provider = "TYT phường",
                    FacilityName = "Trạm Y tế",
                    FollowUpDate = d.AddMonths(6),
                    Status = 1,
                    CreatedAt = d, UpdatedAt = ctx.Now
                });
            }
            _db.PopulationRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["PopulationRecords"] = list.Count;
        }

        // Prenatal Records
        if (!await _db.PrenatalRecords.AnyAsync())
        {
            var list = new List<PrenatalRecord>();
            for (int i = 0; i < 20; i++)
            {
                var lmp = ctx.Now.AddDays(-rng.Next(30, 280));
                var gestAge = (int)((ctx.Now - lmp).TotalDays / 7);
                list.Add(new PrenatalRecord
                {
                    Id = Guid.NewGuid(),
                    RecordCode = $"TK-{lmp:yyyy}-{i + 1:D4}",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"Sản phụ {i + 1}",
                    DateOfBirth = new DateTime(1990 + rng.Next(15), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gravida = 1 + rng.Next(0, 4),
                    Para = rng.Next(0, 3),
                    GestationalAge = gestAge,
                    ExpectedDeliveryDate = lmp.AddDays(280),
                    LastMenstrualPeriod = lmp,
                    BloodType = new[] { "O", "A", "B", "AB" }[i % 4],
                    RhFactor = "+",
                    CurrentWeight = 55m + rng.Next(0, 25),
                    PrePregnancyWeight = 50m + rng.Next(0, 20),
                    BloodPressureSystolic = 110 + rng.Next(0, 30),
                    BloodPressureDiastolic = 70 + rng.Next(0, 15),
                    FetalHeartRate = gestAge > 20 ? 130 + rng.Next(0, 30) : null,
                    FundalHeight = gestAge > 20 ? gestAge * 1m + (decimal)(rng.NextDouble() * 2 - 1) : null,
                    RiskLevel = i % 6 == 0 ? "high" : (i % 3 == 0 ? "medium" : "low"),
                    RiskFactors = i % 6 == 0 ? "Tiền sử tiền sản giật, HA cao" : null,
                    NextAppointment = ctx.Now.AddDays(rng.Next(7, 28)),
                    Status = gestAge > 40 ? 1 : 0,
                    CreatedAt = lmp, UpdatedAt = ctx.Now
                });
            }
            _db.PrenatalRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["PrenatalRecords"] = list.Count;
        }

        // Family Planning
        if (!await _db.FamilyPlanningRecords.AnyAsync())
        {
            var methods = new[] { "iud", "implant", "pill", "injection", "condom", "sterilization" };
            var list = new List<FamilyPlanningRecord>();
            for (int i = 0; i < 18; i++)
            {
                var start = ctx.Now.AddDays(-rng.Next(30, 730));
                list.Add(new FamilyPlanningRecord
                {
                    Id = Guid.NewGuid(),
                    RecordCode = $"FP-{start:yyyy}-{i + 1:D4}",
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    PatientName = $"BN KHHGĐ {i + 1}",
                    DateOfBirth = new DateTime(1985 + rng.Next(20), 1 + rng.Next(12), 1 + rng.Next(28)),
                    Gender = 2,
                    Method = methods[i % methods.Length],
                    StartDate = start,
                    ExpiryDate = start.AddYears(methods[i % methods.Length] == "iud" ? 10 : methods[i % methods.Length] == "implant" ? 3 : 1),
                    FollowUpDate = ctx.Now.AddMonths(rng.Next(1, 6)),
                    Provider = "BS. Nguyễn Thị Kim Hoa",
                    FacilityName = "Khoa Sản - BV",
                    Status = i < 15 ? 0 : 1,
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.FamilyPlanningRecords.AddRange(list);
            await _db.SaveChangesAsync();
            summary["FamilyPlanningRecords"] = list.Count;
        }

        // Satisfaction Survey Templates
        if (!await _db.SatisfactionSurveyTemplates.AnyAsync())
        {
            var list = new List<SatisfactionSurveyTemplate>();
            var tpls = new[] {
                ("TPL-OPD-01","Khảo sát hài lòng BN ngoại trú","opd","Đánh giá thời gian chờ, thái độ NVYT, cơ sở vật chất"),
                ("TPL-IPD-01","Khảo sát hài lòng BN nội trú","ipd","Đánh giá chất lượng điều trị, chăm sóc, nghiệp vụ"),
                ("TPL-ER-01","Khảo sát hài lòng cấp cứu","er","Đánh giá tốc độ xử trí, thái độ khi cấp cứu"),
                ("TPL-SURG-01","Khảo sát sau phẫu thuật","surgery","Đánh giá tư vấn, thực hiện, hậu phẫu"),
                ("TPL-LAB-01","Khảo sát dịch vụ XN","lab","Đánh giá quy trình, thời gian trả KQ")
            };
            for (int i = 0; i < tpls.Length; i++)
            {
                list.Add(new SatisfactionSurveyTemplate
                {
                    Id = Guid.NewGuid(),
                    Name = tpls[i].Item2,
                    Category = tpls[i].Item3,
                    Description = tpls[i].Item4,
                    IsActive = true,
                    SortOrder = i,
                    Questions = "[{\"id\":\"q1\",\"text\":\"Thái độ nhân viên y tế?\",\"type\":\"rating5\"},{\"id\":\"q2\",\"text\":\"Thời gian chờ?\",\"type\":\"rating5\"},{\"id\":\"q3\",\"text\":\"Cơ sở vật chất?\",\"type\":\"rating5\"},{\"id\":\"q4\",\"text\":\"Ý kiến khác\",\"type\":\"text\"}]",
                    CreatedAt = ctx.Now.AddMonths(-6), UpdatedAt = ctx.Now
                });
            }
            _db.SatisfactionSurveyTemplates.AddRange(list);
            await _db.SaveChangesAsync();
            summary["SatisfactionSurveyTemplates"] = list.Count;
        }

        return Ok(new { success = true, module = "medinet-extras", inserted = summary });
    }

    // ==========================================================================
    // FINISHING — remaining tables not covered by any module-specific seeder
    // (certificates, lab analyzers, appointments, endpoint security, outbreak flag)
    // ==========================================================================
    [HttpPost("finishing")]
    public async Task<IActionResult> PopulateFinishing()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var errors = new Dictionary<string, string>();
        var rng = new Random(77);

        // Schema-drift fix: MethadonePatients.Phase + OccupationalHealthExams.Classification
        // are `int` in the DB but `string` on the entity → SqlDataReader throws
        // InvalidCastException on read. Widen the columns to nvarchar(20) so both
        // the entity and the existing data (numeric IDs 1-4) co-exist. Wrapped
        // in DYNAMIC-SQL because we can't reference the column in the query
        // context if its type changes under us.
        try {
            // Drop any default constraints on the two affected columns first so the
            // ALTER COLUMN is not blocked, then widen to nvarchar(20).
            await _db.Database.ExecuteSqlRawAsync(@"
DECLARE @sql nvarchar(max);
SELECT @sql = STRING_AGG('ALTER TABLE ' + QUOTENAME(OBJECT_NAME(dc.parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(dc.name) + ';', ' ')
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE (OBJECT_NAME(dc.parent_object_id)='MethadonePatients' AND c.name='Phase')
   OR (OBJECT_NAME(dc.parent_object_id)='OccupationalHealthExams' AND c.name='Classification');
IF @sql IS NOT NULL EXEC(@sql);

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='MethadonePatients' AND COLUMN_NAME='Phase' AND DATA_TYPE='int')
BEGIN
  EXEC('ALTER TABLE MethadonePatients ALTER COLUMN Phase nvarchar(20) NULL');
END
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='OccupationalHealthExams' AND COLUMN_NAME='Classification' AND DATA_TYPE='int')
BEGIN
  EXEC('ALTER TABLE OccupationalHealthExams ALTER COLUMN Classification nvarchar(20) NULL');
END
");
            summary["SchemaDriftFixed"] = 2;
        } catch (Exception ex) { errors["SchemaDrift"] = ex.GetBaseException().Message; }

        // ManagedCertificates — digital signature catalogue
        try {
        if (!await _db.ManagedCertificates.AnyAsync())
        {
            var caProviders = new[] { "VNPT-CA", "FPT-CA", "Viettel-CA", "BKAV-CA", "NewTel-CA" };
            var storageTypes = new[] { "Token", "Token", "HSM", "Server", "Token" };
            var users = await _db.Users.Where(u => u.IsActive && u.FullName != "")
                .Take(10).Select(u => new { u.Id, u.FullName, u.Email }).ToListAsync();
            var certs = new List<ManagedCertificate>();
            for (int i = 0; i < Math.Min(users.Count, 8); i++)
            {
                var u = users[i];
                var issued = ctx.Now.AddMonths(-rng.Next(3, 18));
                certs.Add(new ManagedCertificate
                {
                    Id = Guid.NewGuid(),
                    SerialNumber = $"{rng.Next(1000_0000, 9999_9999):X8}{rng.Next(1000, 9999):X4}",
                    SubjectName = $"CN={u.FullName}, O=Bệnh viện Đa khoa, C=VN",
                    IssuerName = $"CN={caProviders[i % caProviders.Length]} Root CA, O=CA Provider, C=VN",
                    CaProvider = caProviders[i % caProviders.Length],
                    ValidFrom = issued,
                    ValidTo = issued.AddYears(3),
                    IsActive = i % 8 != 7, // last one inactive
                    OwnerUserId = u.Id,
                    Cccd = $"0{rng.Next(80, 99)}{rng.Next(100000000, 999999999)}",
                    StorageType = storageTypes[i % storageTypes.Length],
                    StorageIdentifier = storageTypes[i % storageTypes.Length] == "Token"
                        ? $"USB{rng.Next(100000, 999999)}"
                        : $"HSM-slot-{i + 1}",
                    CreatedAt = issued, UpdatedAt = ctx.Now
                });
            }
            if (certs.Count > 0)
            {
                _db.ManagedCertificates.AddRange(certs);
                await _db.SaveChangesAsync();
                summary["ManagedCertificates"] = certs.Count;
            }
        }
        } catch (Exception ex) { errors["ManagedCertificates"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // LisAnalyzers — laboratory analyzer catalogue
        try {
        if (!await _db.LisAnalyzers.AnyAsync())
        {
            var analyzers = new (string Name, string Model, string Mfr, string Protocol, string IP, int Port, string Status)[] {
                ("Máy sinh hóa Roche Cobas c501", "Cobas c501", "Roche", "HL7", "192.168.10.11", 5100, "Connected"),
                ("Máy huyết học Sysmex XN-1000", "XN-1000", "Sysmex", "HL7", "192.168.10.12", 5101, "Connected"),
                ("Máy nước tiểu Siemens Clinitek", "Clinitek Atlas", "Siemens", "ASTM", "192.168.10.13", 5102, "Connected"),
                ("Máy đông máu Stago STA-R", "STA-R Max", "Stago", "ASTM", "192.168.10.14", 5103, "Connected"),
                ("Máy miễn dịch Abbott Architect", "Architect i2000", "Abbott", "HL7", "192.168.10.15", 5104, "Disconnected"),
                ("Máy khí máu Radiometer ABL90", "ABL90 FLEX", "Radiometer", "HL7", "192.168.10.16", 5105, "Connected"),
                ("Máy cấy máu BacT/ALERT 3D", "BacT/ALERT 3D", "BioMerieux", "Serial", null!, 0, "Unknown"),
            };
            var list = new List<LisAnalyzer>();
            foreach (var a in analyzers)
            {
                list.Add(new LisAnalyzer
                {
                    Id = Guid.NewGuid(),
                    Name = a.Name,
                    Model = a.Model,
                    Manufacturer = a.Mfr,
                    ConnectionType = a.Protocol,
                    IpAddress = a.IP,
                    Port = a.Port > 0 ? a.Port : null,
                    ComPort = a.Protocol == "Serial" ? "COM3" : null,
                    BaudRate = a.Protocol == "Serial" ? 9600 : null,
                    ProtocolVersion = a.Protocol == "HL7" ? "2.5.1" : "E1394-97",
                    IsActive = true,
                    LastConnectionTime = a.Status == "Connected" ? ctx.Now.AddMinutes(-rng.Next(1, 60)) : ctx.Now.AddDays(-rng.Next(1, 10)),
                    ConnectionStatus = a.Status,
                    Description = $"Kết nối qua {a.Protocol}, phòng XN trung tâm",
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.LisAnalyzers.AddRange(list);
            await _db.SaveChangesAsync();
            summary["LisAnalyzers"] = list.Count;
        }
        } catch (Exception ex) { errors["LisAnalyzers"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Appointments — follow-up calendar (mix of upcoming, today, overdue)
        try {
        // Appointments — seed if fewer than 20 rows so /follow-up page has variety
        var apptCount = await _db.Appointments.CountAsync();
        if (apptCount < 20 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var deptIds = ctx.DepartmentIds;
            var reasons = new[] {
                "Tái khám định kỳ sau xuất viện",
                "Tái khám THA + điều chỉnh thuốc",
                "Tái khám ĐTĐ + kết quả HbA1c",
                "Khám lại đau thắt lưng sau vật lý trị liệu",
                "Tái khám hậu phẫu — cắt chỉ",
                "Đánh giá kết quả điều trị ung thư",
                "Khám sức khỏe định kỳ theo BHYT",
                "Tái khám nhi — theo dõi sốt co giật",
                "Khám lại sản phụ khoa",
                "Kiểm tra mắt sau phẫu thuật"
            };
            var appts = new List<Appointment>();
            int seq = 0;
            for (int i = 0; i < 45 && i < ctx.PatientIds.Count; i++)
            {
                seq++;
                // 40% overdue within the last 7 days (what /follow-up/overdue shows),
                // 30% upcoming, 20% today, 10% attended months ago
                int bucket = rng.Next(0, 10);
                DateTime apptDate;
                int status;
                if (bucket < 4) {
                    apptDate = ctx.Now.Date.AddDays(-rng.Next(1, 7));
                    status = rng.Next(0, 2); // Pending or Confirmed but missed
                } else if (bucket < 7) {
                    apptDate = ctx.Now.Date.AddDays(rng.Next(1, 21));
                    status = rng.Next(0, 2); // Pending or Confirmed
                } else if (bucket < 9) {
                    apptDate = ctx.Now.Date;
                    status = 1; // Confirmed today
                } else {
                    apptDate = ctx.Now.Date.AddDays(-rng.Next(30, 90));
                    status = 2; // Attended
                }
                appts.Add(new Appointment
                {
                    Id = Guid.NewGuid(),
                    AppointmentCode = NextCode("APT", seq, 5),
                    AppointmentDate = apptDate,
                    AppointmentTime = new TimeSpan(rng.Next(7, 17), rng.Next(0, 4) * 15, 0),
                    PatientId = ctx.PatientIds[i],
                    DepartmentId = deptIds.Count > 0 ? deptIds[i % deptIds.Count] : null,
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    AppointmentType = rng.Next(1, 4),
                    Reason = reasons[i % reasons.Length],
                    Note = i % 5 == 0 ? "Mang theo phim, kết quả XN lần trước" : null,
                    Status = status,
                    IsReminderSent = status == 1 || status == 2,
                    ReminderSentAt = (status == 1 || status == 2) ? apptDate.AddDays(-1) : null,
                    CreatedAt = apptDate.AddDays(-rng.Next(3, 30)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.Appointments.AddRange(appts);
            await _db.SaveChangesAsync();
            summary["Appointments"] = appts.Count;
        }
        } catch (Exception ex) { errors["Appointments"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // EndpointDevices — ATTT / Security
        try {
        // BaseEntity adds IsDeleted but these tables predate the global filter;
        // add the column on the fly if missing so INSERT / query filter both work.
        await _db.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('EndpointDevices','IsDeleted') IS NULL ALTER TABLE EndpointDevices ADD IsDeleted bit NOT NULL CONSTRAINT DF_EndpointDevices_IsDeleted DEFAULT 0;
IF COL_LENGTH('SecurityIncidents','IsDeleted') IS NULL ALTER TABLE SecurityIncidents ADD IsDeleted bit NOT NULL CONSTRAINT DF_SecurityIncidents_IsDeleted DEFAULT 0;
IF COL_LENGTH('InstalledSoftwareItems','IsDeleted') IS NULL ALTER TABLE InstalledSoftwareItems ADD IsDeleted bit NOT NULL CONSTRAINT DF_InstalledSoftwareItems_IsDeleted DEFAULT 0;
");
        if (!await _db.EndpointDevices.AnyAsync())
        {
            var hostPrefixes = new[] { "PC-RECEP", "PC-DOCTOR", "PC-NURSE", "PC-LAB", "PC-PHARM", "PC-ADMIN" };
            var oses = new[] { "Windows 10 Pro", "Windows 11 Pro", "Windows 10 Enterprise", "Windows Server 2022" };
            var avNames = new[] { "Windows Defender", "Kaspersky Endpoint Security", "Symantec Endpoint Protection", "Bitdefender GravityZone" };
            var avStatus = new[] { "Active", "Active", "Active", "Outdated", "Active", "Disabled" };
            var deptNames = new[] { "Tiếp đón", "Khám bệnh", "Nội tổng hợp", "Ngoại tổng quát", "Xét nghiệm", "Nhà thuốc", "Cấp cứu", "Hành chính" };
            var devices = new List<EndpointDevice>();
            for (int i = 0; i < 24; i++)
            {
                var lastSeen = ctx.Now.AddMinutes(-rng.Next(1, 60 * 48));
                var status = lastSeen > ctx.Now.AddHours(-2) ? 1 : 0;
                devices.Add(new EndpointDevice
                {
                    Id = Guid.NewGuid(),
                    Hostname = $"{hostPrefixes[i % hostPrefixes.Length]}-{(i + 1):D2}",
                    IpAddress = $"10.10.{rng.Next(1, 20)}.{rng.Next(10, 250)}",
                    MacAddress = string.Join(":", Enumerable.Range(0, 6).Select(_ => rng.Next(0, 256).ToString("X2"))),
                    OperatingSystem = oses[i % oses.Length],
                    OsVersion = oses[i % oses.Length].Contains("11") ? "22H2" : oses[i % oses.Length].Contains("Server") ? "21H2" : "22H2",
                    AntivirusName = avNames[i % avNames.Length],
                    AntivirusStatus = avStatus[i % avStatus.Length],
                    AntivirusLastUpdate = ctx.Now.AddDays(-rng.Next(0, 14)),
                    DepartmentName = deptNames[i % deptNames.Length],
                    AssignedUser = $"nhanvien{i + 1:D3}",
                    Status = status,
                    LastSeenAt = lastSeen,
                    AgentVersion = $"v{rng.Next(4, 8)}.{rng.Next(0, 10)}.{rng.Next(0, 100)}",
                    IsCompliant = i % 5 != 4,
                    ComplianceNotes = i % 5 == 4 ? "Chưa cập nhật patch Windows tháng mới nhất" : null,
                    IsActive = true,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 36)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.EndpointDevices.AddRange(devices);
            await _db.SaveChangesAsync();
            summary["EndpointDevices"] = devices.Count;

            // Seed incidents and installed software tied to these devices
            if (!await _db.SecurityIncidents.AnyAsync())
            {
                var titles = new[] {
                    ("Phát hiện mã độc trên máy tiếp đón", 2, "Malware"),
                    ("Email lừa đảo (phishing) gửi tới nhiều tài khoản", 2, "Phishing"),
                    ("Đăng nhập thất bại nhiều lần từ IP lạ", 3, "Unauthorized"),
                    ("USB trái phép kết nối vào máy nội bộ", 3, "Unauthorized"),
                    ("Windows Update bị tắt trên 3 máy", 4, "Other"),
                    ("Cảnh báo DDoS lên cổng thông tin tuyển dụng", 1, "DDoS"),
                    ("Rò rỉ tài khoản nhân viên phòng HR", 1, "DataBreach")
                };
                var incList = new List<SecurityIncident>();
                for (int i = 0; i < titles.Length; i++)
                {
                    var created = ctx.Now.AddDays(-rng.Next(1, 60));
                    var resolved = i < 4 ? (DateTime?)created.AddDays(rng.Next(1, 5)) : null;
                    incList.Add(new SecurityIncident
                    {
                        Id = Guid.NewGuid(),
                        IncidentCode = NextCode("INC", i + 1, 4),
                        Title = titles[i].Item1,
                        Description = "Ghi nhận từ hệ thống EDR / SIEM, đã triển khai biện pháp ứng phó ban đầu",
                        Severity = titles[i].Item2,
                        Status = resolved != null ? 3 : i % 3,
                        Category = titles[i].Item3,
                        DeviceId = devices[i % devices.Count].Id,
                        DeviceHostname = devices[i % devices.Count].Hostname,
                        AffectedSystem = i % 2 == 0 ? "HIS Production" : "Email Server",
                        ReportedByName = "Trực SOC",
                        AssignedToName = "Quản trị hệ thống",
                        Resolution = resolved != null ? "Cô lập máy, quét sạch mã độc, cài lại AV, khôi phục dịch vụ" : null,
                        ResolvedAt = resolved,
                        ContainedAt = resolved?.AddHours(-rng.Next(1, 6)),
                        RootCause = resolved != null ? "Người dùng nhấn vào link phishing trong email" : null,
                        CorrectiveAction = resolved != null ? "Tăng cường đào tạo nhận thức ATTT + cập nhật bộ lọc email" : null,
                        CreatedAt = created, UpdatedAt = resolved ?? ctx.Now
                    });
                }
                _db.SecurityIncidents.AddRange(incList);
                await _db.SaveChangesAsync();
                summary["SecurityIncidents"] = incList.Count;
            }

            if (!await _db.InstalledSoftwareItems.AnyAsync())
            {
                var softwares = new (string Name, string Pub, string Cat)[] {
                    ("Microsoft Office 365", "Microsoft", "Office"),
                    ("Google Chrome", "Google", "Browser"),
                    ("Mozilla Firefox", "Mozilla", "Browser"),
                    ("Adobe Reader DC", "Adobe", "Office"),
                    ("Zalo PC", "VNG Corporation", "Other"),
                    ("Kaspersky Endpoint Security", "Kaspersky", "Security"),
                    ("UltraVNC Viewer", "UltraVNC Team", "System"),
                    ("7-Zip", "Igor Pavlov", "System"),
                    ("Foxit Reader", "Foxit Software", "Office"),
                    ("Team Viewer", "TeamViewer Germany GmbH", "System"),
                };
                var swList = new List<InstalledSoftware>();
                foreach (var d in devices.Take(12))
                {
                    int count = rng.Next(4, 9);
                    for (int i = 0; i < count; i++)
                    {
                        var sw = softwares[i % softwares.Length];
                        swList.Add(new InstalledSoftware
                        {
                            Id = Guid.NewGuid(),
                            DeviceId = d.Id,
                            SoftwareName = sw.Name,
                            Version = $"{rng.Next(10, 120)}.{rng.Next(0, 10)}.{rng.Next(0, 100)}",
                            Publisher = sw.Pub,
                            InstallDate = ctx.Now.AddDays(-rng.Next(30, 720)),
                            IsAuthorized = !(sw.Name.Contains("TeamViewer") && rng.Next(0, 3) == 0),
                            Category = sw.Cat,
                            Notes = null,
                            CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 24)),
                            UpdatedAt = ctx.Now
                        });
                    }
                }
                _db.InstalledSoftwareItems.AddRange(swList);
                await _db.SaveChangesAsync();
                summary["InstalledSoftware"] = swList.Count;
            }
        }
        } catch (Exception ex) { errors["EndpointSecurity"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Mark ~6 disease cases as outbreak so /epidemiology/outbreaks renders
        try {
        var unmarkedOutbreaks = await _db.DiseaseCases
            .Where(d => !d.IsOutbreak || d.OutbreakId == null)
            .OrderByDescending(d => d.ReportDate)
            .Take(6)
            .ToListAsync();
        if (unmarkedOutbreaks.Count > 0 &&
            !await _db.DiseaseCases.AnyAsync(d => d.IsOutbreak && d.OutbreakId != null))
        {
            // Group them by disease name so we get a couple of outbreaks, not 6 singletons
            var grouped = unmarkedOutbreaks.GroupBy(d => d.DiseaseName ?? "Bệnh khác").ToList();
            int outbreakSeq = 0;
            foreach (var g in grouped)
            {
                outbreakSeq++;
                var obId = NextCode("OB", outbreakSeq, 3);
                foreach (var c in g)
                {
                    c.IsOutbreak = true;
                    c.OutbreakId = obId;
                    c.UpdatedAt = ctx.Now;
                }
            }
            await _db.SaveChangesAsync();
            summary["OutbreakCasesTagged"] = unmarkedOutbreaks.Count;
        }
        } catch (Exception ex) { errors["OutbreakTagging"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // TbHivRecords — TB / HIV patient registry (top up to at least 20 real rows)
        try {
        // Delete orphan rows where PatientId is empty (happens when old test data had Guid.Empty)
        var orphans = await _db.TbHivRecords.Where(r => r.PatientId == Guid.Empty).ToListAsync();
        if (orphans.Count > 0) { _db.TbHivRecords.RemoveRange(orphans); await _db.SaveChangesAsync(); }
        if (await _db.TbHivRecords.CountAsync() < 15 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var records = new List<TbHivRecord>();
            var types = new[] { "TB", "TB", "HIV", "HIV", "TB_HIV" };
            var cats = new[] { "New", "New", "Relapse", "TransferIn", "ReturnAfterDefault" };
            var regimensTb = new[] { "2RHZE/4RH", "2RHZE/4R3H3", "2HRZE/4HR" };
            var regimensHiv = new[] { "TDF+3TC+DTG", "AZT+3TC+NVP", "TDF+FTC+EFV" };
            for (int i = 0; i < 20 && i < ctx.PatientIds.Count; i++)
            {
                var tp = types[i % types.Length];
                var start = ctx.Now.AddDays(-rng.Next(30, 365));
                bool isTb = tp != "HIV";
                records.Add(new TbHivRecord
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i],
                    RecordType = tp,
                    RegistrationDate = start,
                    RegistrationCode = NextCode(tp == "HIV" ? "HIV" : "TB", i + 1, 4),
                    TreatmentCategory = cats[i % cats.Length],
                    TreatmentRegimen = isTb ? regimensTb[i % regimensTb.Length] : regimensHiv[i % regimensHiv.Length],
                    TreatmentStartDate = start.AddDays(rng.Next(3, 14)),
                    ExpectedEndDate = start.AddMonths(isTb ? 6 : 24),
                    Status = i % 6 == 5 ? "Completed" : i % 6 == 4 ? "DefaultedLostToFollowUp" : "OnTreatment",
                    SmearResult = isTb ? (i % 3 == 0 ? "Positive" : "Negative") : null,
                    GeneXpertResult = isTb ? (i % 5 == 0 ? "RifResistant" : "Detected") : null,
                    TbSite = isTb ? (i % 2 == 0 ? "Pulmonary" : "ExtraPulmonary") : null,
                    IsMdr = isTb && i % 7 == 0,
                    Cd4Count = !isTb ? 200 + rng.Next(0, 600) : null,
                    ViralLoad = !isTb ? rng.Next(40, 1000) : null,
                    ArtRegimen = !isTb ? regimensHiv[i % regimensHiv.Length] : null,
                    ArtStartDate = !isTb ? start : null,
                    WhoStage = !isTb ? new[] { "I", "II", "III", "IV" }[i % 4] : null,
                    DotProvider = isTb ? (i % 2 == 0 ? "Cán bộ y tế xã" : "Người nhà") : null,
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.TbHivRecords.AddRange(records);
            await _db.SaveChangesAsync();
            summary["TbHivRecords"] = records.Count;
        }
        } catch (Exception ex) { errors["TbHivRecords"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // IVF — couples + cycles
        try {
        if (!await _db.IvfPatientCouples.AnyAsync() && ctx.PatientIds.Count >= 20)
        {
            var couples = new List<IvfPatientCouple>();
            var causes = new[] { "Nam giới: tinh trùng yếu", "Nữ: tắc vòi trứng",
                "Rối loạn phóng noãn (PCOS)", "Lạc nội mạc tử cung",
                "Vô sinh không rõ nguyên nhân", "Nam: không có tinh trùng (azoospermia)" };
            for (int i = 0; i < 10; i++)
            {
                couples.Add(new IvfPatientCouple
                {
                    Id = Guid.NewGuid(),
                    WifePatientId = ctx.PatientIds[i * 2],
                    HusbandPatientId = ctx.PatientIds[i * 2 + 1],
                    InfertilityDurationMonths = 12 + rng.Next(0, 60),
                    InfertilityCause = causes[i % causes.Length],
                    MarriageDate = ctx.Now.AddYears(-rng.Next(2, 10)).AddDays(-rng.Next(1, 365)),
                    Notes = "Đã làm đầy đủ XN tiền phẫu",
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 18)), UpdatedAt = ctx.Now
                });
            }
            _db.IvfPatientCouples.AddRange(couples);
            await _db.SaveChangesAsync();
            summary["IvfPatientCouples"] = couples.Count;

            var cycles = new List<IvfCycle>();
            var protocols = new[] { "Long protocol (GnRH agonist)", "Antagonist protocol", "Mild stimulation", "Natural cycle" };
            for (int i = 0; i < couples.Count; i++)
            {
                int nc = rng.Next(1, 4);
                for (int n = 1; n <= nc; n++)
                {
                    var start = ctx.Now.AddMonths(-rng.Next(0, 12));
                    cycles.Add(new IvfCycle
                    {
                        Id = Guid.NewGuid(),
                        CoupleId = couples[i].Id,
                        CycleNumber = n,
                        StartDate = start,
                        Status = n == nc ? rng.Next(1, 8) : 6, // latest = active, older = completed
                        Protocol = protocols[(i + n) % protocols.Length],
                        DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        Notes = "Chu kỳ kích thích buồng trứng theo phác đồ chuẩn",
                        CreatedAt = start, UpdatedAt = ctx.Now
                    });
                }
            }
            _db.IvfCycles.AddRange(cycles);
            await _db.SaveChangesAsync();
            summary["IvfCycles"] = cycles.Count;
        }
        } catch (Exception ex) { errors["IvfLab"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // FixedAssets — asset management
        try {
        if (!await _db.FixedAssets.AnyAsync() && ctx.DepartmentIds.Count > 0)
        {
            var catalog = new (string Name, decimal Value, int Life)[] {
                ("Máy in laser đa năng Canon", 15_000_000m, 60),
                ("Máy chiếu Epson EB-X41", 18_000_000m, 60),
                ("Điều hoà Daikin 18000BTU", 12_000_000m, 96),
                ("Bàn làm việc văn phòng", 3_500_000m, 120),
                ("Tủ đựng hồ sơ sắt 5 ngăn", 5_200_000m, 120),
                ("Máy tính để bàn Dell Optiplex", 20_000_000m, 60),
                ("Màn hình LG 27 inch", 5_800_000m, 60),
                ("Ghế xoay nhân viên", 2_100_000m, 60),
                ("Máy photocopy Ricoh", 65_000_000m, 84),
                ("Ô tô tải chuyên dụng Hyundai", 750_000_000m, 120),
                ("Xe cấp cứu Ford Transit", 1_200_000_000m, 120),
                ("Bàn khám Ng­oại (thép không gỉ)", 22_000_000m, 120),
                ("Tủ thuốc di động 3 tầng", 8_500_000m, 96),
                ("Máy lọc nước công nghiệp", 35_000_000m, 84),
                ("Máy giặt công nghiệp 30kg", 120_000_000m, 96),
                ("Tủ lạnh bảo quản vắc-xin", 45_000_000m, 120),
                ("Đèn cấp cứu âm trần", 8_000_000m, 120),
                ("Hệ thống camera giám sát 16ch", 65_000_000m, 84),
                ("Server Dell PowerEdge R740", 350_000_000m, 84),
                ("Switch mạng Cisco 48-port", 45_000_000m, 84),
            };
            var assets = new List<FixedAsset>();
            for (int i = 0; i < catalog.Length; i++)
            {
                var c = catalog[i];
                var purchase = ctx.Now.AddMonths(-rng.Next(3, 72));
                int monthsUsed = (int)((ctx.Now - purchase).TotalDays / 30);
                decimal monthly = c.Value / c.Life;
                decimal accum = Math.Min(c.Value, monthly * monthsUsed);
                assets.Add(new FixedAsset
                {
                    Id = Guid.NewGuid(),
                    AssetCode = NextCode("TS", i + 1, 4),
                    AssetName = c.Name,
                    AssetGroupId = null,
                    OriginalValue = c.Value,
                    CurrentValue = c.Value - accum,
                    PurchaseDate = purchase,
                    DepreciationMethod = 1,
                    UsefulLifeMonths = c.Life,
                    MonthlyDepreciation = monthly,
                    AccumulatedDepreciation = accum,
                    DepartmentId = ctx.DepartmentIds[i % ctx.DepartmentIds.Count],
                    LocationDescription = $"Phòng {rng.Next(101, 599)}, Tầng {rng.Next(1, 6)}",
                    Status = i % 15 == 14 ? 3 : 1, // 1=InUse, 3=WaitingDisposal
                    SerialNumber = $"SN{rng.Next(10000, 99999):D5}",
                    QrCode = Guid.NewGuid().ToString("N")[..12],
                    Notes = null,
                    CreatedAt = purchase, UpdatedAt = ctx.Now
                });
            }
            _db.FixedAssets.AddRange(assets);
            await _db.SaveChangesAsync();
            summary["FixedAssets"] = assets.Count;
        }
        } catch (Exception ex) { errors["FixedAssets"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Training classes
        try {
        if (!await _db.TrainingClasses.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var courses = new (string Code, string Name, int Type, decimal Hours, decimal Fee)[] {
                ("CME-2026-01", "Cập nhật điều trị đái tháo đường type 2", 3, 8m, 500_000m),
                ("CME-2026-02", "Kháng sinh đồ và kháng thuốc — hướng dẫn mới", 3, 16m, 1_200_000m),
                ("INT-2026-01", "Đào tạo hồi sức tích cực căn bản", 1, 40m, 0m),
                ("INT-2026-02", "Thực hành quy trình kiểm soát nhiễm khuẩn", 1, 24m, 0m),
                ("EXT-2026-01", "Hội nghị Tim mạch học Việt Nam 2026", 2, 16m, 2_000_000m),
                ("EXT-2026-02", "Đào tạo HL7-FHIR cho nhân viên CNTT y tế", 2, 40m, 3_500_000m),
                ("DIR-2026-01", "Chỉ đạo tuyến: Siêu âm sản khoa cơ bản", 4, 40m, 0m),
                ("DIR-2026-02", "Chỉ đạo tuyến: Cấp cứu chấn thương", 4, 32m, 0m),
                ("CME-2026-03", "Điều trị đích ung thư phổi không tế bào nhỏ", 3, 12m, 1_500_000m),
                ("INT-2026-03", "Kỹ năng giao tiếp với người bệnh", 1, 16m, 0m),
            };
            var classes = new List<TrainingClass>();
            for (int i = 0; i < courses.Length; i++)
            {
                var c = courses[i];
                var start = ctx.Now.AddDays(rng.Next(-120, 60));
                classes.Add(new TrainingClass
                {
                    Id = Guid.NewGuid(),
                    ClassCode = c.Code,
                    ClassName = c.Name,
                    TrainingType = c.Type,
                    StartDate = start,
                    EndDate = start.AddHours((double)c.Hours + rng.Next(0, 5) * 24),
                    MaxStudents = c.Type == 1 ? 30 : c.Type == 2 ? 100 : 50,
                    Location = c.Type == 2 ? "Khách sạn Daewoo HN" : "Hội trường tầng 5, BV",
                    InstructorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    Description = $"Khoá đào tạo {c.Name}",
                    CreditHours = c.Hours,
                    Status = start < ctx.Now.AddDays(-7) ? 3 : start < ctx.Now ? 2 : 1,
                    Fee = c.Fee,
                    CreatedAt = start.AddMonths(-1), UpdatedAt = ctx.Now
                });
            }
            _db.TrainingClasses.AddRange(classes);
            await _db.SaveChangesAsync();
            summary["TrainingClasses"] = classes.Count;
        }
        } catch (Exception ex) { errors["TrainingClasses"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // RadiologyRequests — CDHA today orders for /radiology waiting list
        try {
        if (await _db.RadiologyRequests.CountAsync() < 15 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            // Pick radiology-type services (ServiceType 3 or 4 typically); fallback: any active service
            var radioSvcs = await _db.Services
                .Where(s => s.IsActive && (s.ServiceType == 3 || s.ServiceType == 4 || s.ServiceName!.Contains("X-quang") ||
                            s.ServiceName!.Contains("Siêu âm") || s.ServiceName!.Contains("CT") || s.ServiceName!.Contains("MRI")))
                .Select(s => new { s.Id, s.ServiceCode, s.ServiceName, s.UnitPrice })
                .Take(20).ToListAsync();
            if (radioSvcs.Count == 0)
                radioSvcs = await _db.Services.Where(s => s.IsActive)
                    .Select(s => new { s.Id, s.ServiceCode, s.ServiceName, s.UnitPrice })
                    .Take(10).ToListAsync();
            if (radioSvcs.Count > 0)
            {
                var clinical = new[] {
                    "Đau ngực trái, khó thở, cần chẩn đoán tim mạch",
                    "Sốt + ho kéo dài, nghi viêm phổi",
                    "Đau bụng vùng mạng sườn phải, nghi sỏi thận",
                    "Chấn thương đầu do TNGT, cần đánh giá sọ não",
                    "Đau khớp gối sau chấn thương, đánh giá dây chằng",
                    "Đau lưng cấp, cần loại trừ thoát vị đĩa đệm",
                    "Theo dõi khối u gan đã phát hiện",
                    "Khám sức khoẻ định kỳ, X-quang phổi",
                    "Đau bụng kinh kéo dài, siêu âm tiểu khung",
                    "Ho kéo dài > 3 tuần, chẩn đoán lao phổi?",
                };
                var reqs = new List<RadiologyRequest>();
                int seq = 0;
                for (int i = 0; i < 20 && i < ctx.PatientIds.Count; i++)
                {
                    seq++;
                    var svc = radioSvcs[i % radioSvcs.Count];
                    var when = DateTime.Today.AddHours(7 + (i % 10)).AddMinutes(rng.Next(0, 59));
                    reqs.Add(new RadiologyRequest
                    {
                        Id = Guid.NewGuid(),
                        RequestCode = NextCode("RIS", seq, 5),
                        PatientId = ctx.PatientIds[i],
                        ServiceId = svc.Id,
                        RequestingDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        RequestDate = when,
                        Priority = i % 7 == 0 ? 3 : i % 5 == 0 ? 2 : 1,
                        Status = i % 4 switch { 0 => 0, 1 => 1, 2 => 2, _ => 3 },
                        ClinicalInfo = clinical[i % clinical.Length],
                        BodyPart = svc.ServiceName,
                        Contrast = i % 5 == 0,
                        ScheduledDate = when.AddHours(rng.Next(1, 4)),
                        PatientType = i % 3 == 0 ? 2 : 1,
                        TotalAmount = svc.UnitPrice,
                        InsuranceAmount = i % 3 == 0 ? 0 : svc.UnitPrice * 0.8m,
                        PatientAmount = i % 3 == 0 ? svc.UnitPrice : svc.UnitPrice * 0.2m,
                        CreatedAt = when, UpdatedAt = ctx.Now
                    });
                }
                _db.RadiologyRequests.AddRange(reqs);
                await _db.SaveChangesAsync();
                summary["RadiologyRequests"] = reqs.Count;
            }
        }
        } catch (Exception ex) { errors["RadiologyRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // LabRequests — lab today orders for /laboratory waiting list
        try {
        if (await _db.LabRequests.CountAsync() < 15 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var labSvcs = await _db.Services
                .Where(s => s.IsActive && (s.ServiceType == 2 || s.ServiceName!.Contains("máu") ||
                            s.ServiceName!.Contains("sinh hóa") || s.ServiceName!.Contains("nước tiểu")))
                .Select(s => new { s.Id, s.UnitPrice })
                .Take(10).ToListAsync();
            if (labSvcs.Count == 0)
                labSvcs = await _db.Services.Where(s => s.IsActive).Select(s => new { s.Id, s.UnitPrice }).Take(10).ToListAsync();
            if (labSvcs.Count > 0)
            {
                var diags = new (string Code, string Name)[] {
                    ("E11.9", "Đái tháo đường type 2"),
                    ("I10", "Tăng huyết áp vô căn"),
                    ("J18.9", "Viêm phổi không xác định"),
                    ("K29.7", "Viêm dạ dày"),
                    ("N39.0", "Nhiễm trùng tiết niệu"),
                    ("M54.5", "Đau thắt lưng"),
                    ("B18.2", "Viêm gan C mạn"),
                    ("Z00.0", "Khám sức khỏe tổng quát"),
                };
                var reqs = new List<LabRequest>();
                int seq = 0;
                for (int i = 0; i < 25 && i < ctx.PatientIds.Count; i++)
                {
                    seq++;
                    var when = DateTime.Today.AddHours(7 + (i % 10)).AddMinutes(rng.Next(0, 59));
                    var dx = diags[i % diags.Length];
                    reqs.Add(new LabRequest
                    {
                        Id = Guid.NewGuid(),
                        RequestCode = NextCode("LIS", seq, 5),
                        PatientId = ctx.PatientIds[i],
                        RequestingDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                        RequestDate = when,
                        Priority = i % 8 == 0 ? 3 : i % 4 == 0 ? 2 : 1,
                        Status = i % 5 switch { 0 => 0, 1 => 1, 2 => 2, 3 => 3, _ => 4 },
                        DiagnosisCode = dx.Code,
                        DiagnosisName = dx.Name,
                        ClinicalInfo = "Cần XN để đánh giá " + dx.Name.ToLower(),
                        PatientType = i % 3 == 0 ? 2 : 1,
                        TotalAmount = 150_000m + rng.Next(0, 500) * 1000,
                        CreatedAt = when, UpdatedAt = ctx.Now
                    });
                }
                _db.LabRequests.AddRange(reqs);
                await _db.SaveChangesAsync();
                summary["LabRequests"] = reqs.Count;
            }
        }
        } catch (Exception ex) { errors["LabRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // ProcurementRequests — /procurement page
        try {
        if (!await _db.ProcurementRequests.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var reqs = new List<ProcurementRequest>();
            var notes = new[] {
                "Yêu cầu bổ sung thuốc cấp cứu định kỳ quý",
                "Đề xuất mua vật tư tiêu hao cho phòng mổ",
                "Bổ sung hoá chất xét nghiệm sinh hoá",
                "Mua bổ sung găng tay y tế, khẩu trang",
                "Đề xuất nhập thuốc BHYT thiếu tháng này",
                "Mua dụng cụ tiệt khuẩn, vật tư buồng bệnh",
                "Bổ sung phim X-quang, thuốc cản quang",
                "Mua thay thế pin monitor, cáp ECG",
                "Yêu cầu mua thêm cồn sát khuẩn 70°",
                "Đề xuất bổ sung bơm tiêm 5ml, 10ml, kim luồn",
            };
            for (int i = 0; i < notes.Length; i++)
            {
                int status = i % 5;
                var requestDate = ctx.Now.AddDays(-rng.Next(1, 90));
                reqs.Add(new ProcurementRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = NextCode("DX", i + 1, 4),
                    RequestDate = requestDate,
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    RequestedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Status = status,
                    TotalAmount = rng.Next(5_000_000, 50_000_000),
                    Notes = notes[i],
                    ApprovedById = status >= 2 ? ctx.DoctorIds[(i + 1) % ctx.DoctorIds.Count] : null,
                    ApprovedDate = status >= 2 ? requestDate.AddDays(rng.Next(1, 5)) : null,
                    RejectReason = status == 3 ? "Chưa phù hợp với ngân sách quý" : null,
                    CreatedAt = requestDate, UpdatedAt = ctx.Now
                });
            }
            _db.ProcurementRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            summary["ProcurementRequests"] = reqs.Count;
        }
        } catch (Exception ex) { errors["ProcurementRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // HIE Connections — /health-exchange
        try {
        if (!await _db.HIEConnections.AnyAsync())
        {
            var conns = new (string Name, string Type, string Url, string AuthType, string Status)[] {
                ("Cổng giám định BHXH Việt Nam", "BHXH", "https://api.bhxh.gov.vn/gd/v2", "Certificate", "Active"),
                ("Cổng Y tế điện tử - Bộ Y Tế", "BYT", "https://dqgvn.byt.gov.vn/api", "OAuth2", "Active"),
                ("Sở Y tế TP. Hồ Chí Minh", "SYT", "https://syt.hcm.gov.vn/hie", "APIKey", "Active"),
                ("Bệnh viện Chợ Rẫy - Chuyển tuyến", "Hospital", "https://choray.hcm.gov.vn/referral-api", "OAuth2", "Active"),
                ("Bệnh viện Bạch Mai - Hội chẩn", "Hospital", "https://bachmai.vn/tele-api", "OAuth2", "Inactive"),
                ("Trung tâm Giám định BHXH TP.HCM", "BHXH", "https://bhxh-hcm.gov.vn/gd", "Certificate", "Active"),
                ("Đơn thuốc điện tử quốc gia", "BYT", "https://donthuocquocgia.kcb.vn/api", "OAuth2", "Active"),
            };
            var list = new List<HIEConnection>();
            for (int i = 0; i < conns.Length; i++)
            {
                var c = conns[i];
                bool active = c.Status == "Active";
                list.Add(new HIEConnection
                {
                    Id = Guid.NewGuid(),
                    ConnectionName = c.Name,
                    ConnectionType = c.Type,
                    EndpointUrl = c.Url,
                    AuthType = c.AuthType,
                    ClientId = c.AuthType == "OAuth2" ? $"his-bv-{rng.Next(1000, 9999)}" : null,
                    ClientSecretEncrypted = c.AuthType == "OAuth2" ? "***encrypted***" : null,
                    CertificatePath = c.AuthType == "Certificate" ? $"/certs/his-{i+1}.pfx" : null,
                    Status = c.Status,
                    LastSuccessfulConnection = active ? ctx.Now.AddHours(-rng.Next(1, 48)) : ctx.Now.AddDays(-rng.Next(7, 90)),
                    LastFailedConnection = active ? null : ctx.Now.AddHours(-rng.Next(1, 24)),
                    LastErrorMessage = active ? null : "Connection timeout after 30s",
                    IsActive = active,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.HIEConnections.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HIEConnections"] = list.Count;
        }
        } catch (Exception ex) { errors["HIEConnections"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // SigningTransactions — /signing-workflow, audit log of signing operations
        try {
        if (!await _db.SigningTransactions.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var actions = new[] { "SignPdf", "SignPdfVisible", "SignPdf", "SignHash", "SignXml", "VerifyPdf" };
            var caProviders = new[] { "VNPT-CA", "FPT-CA", "Viettel-CA", "BKAV-CA" };
            var list = new List<SigningTransaction>();
            for (int i = 0; i < 40; i++)
            {
                bool success = i % 8 != 7;
                var when = ctx.Now.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 23)).AddMinutes(-rng.Next(0, 59));
                list.Add(new SigningTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Action = actions[i % actions.Length],
                    DataType = actions[i % actions.Length].Contains("Pdf") ? "pdf" : actions[i % actions.Length].Contains("Xml") ? "xml" : "hash",
                    Success = success,
                    ErrorMessage = success ? null : "USB Token PIN required or cert expired",
                    CertificateSerial = $"{rng.Next(10000000, 99999999):X8}",
                    CaProvider = caProviders[i % caProviders.Length],
                    HashAlgorithm = "SHA-256",
                    DataSizeBytes = rng.Next(2048, 2048 * 1024),
                    DurationMs = rng.Next(200, 3500),
                    IpAddress = $"10.10.{rng.Next(1, 20)}.{rng.Next(10, 250)}",
                    Timestamp = when,
                    CreatedAt = when, UpdatedAt = when
                });
            }
            _db.SigningTransactions.AddRange(list);
            await _db.SaveChangesAsync();
            summary["SigningTransactions"] = list.Count;
        }
        } catch (Exception ex) { errors["SigningTransactions"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // SigningRequests — /signing-workflow pending/submitted/history
        // One of these must be assigned to the admin user so pending tab renders.
        try {
        if (!await _db.SigningRequests.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            // Find the admin user (or first user) to use as AssignedTo / SubmittedBy
            var adminUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
            var adminId = adminUser?.Id ?? ctx.DoctorIds[0];
            var adminName = adminUser?.FullName ?? "Administrator";
            var users = await _db.Users.Where(u => u.IsActive)
                .Select(u => new { u.Id, u.FullName }).Take(10).ToListAsync();

            var docTypes = new (string Type, string Title)[] {
                ("Prescription", "Đơn thuốc ngoại trú BN Nguyễn Văn A"),
                ("TreatmentSheet", "Phiếu điều trị IPD ngày 3 - BN Trần Thị B"),
                ("NursingCare", "Phiếu chăm sóc điều dưỡng ca đêm"),
                ("LabResult", "Kết quả xét nghiệm sinh hóa"),
                ("RadiologyResult", "Kết quả X-quang phổi thẳng"),
                ("DischargeSummary", "Tóm tắt ra viện BN Lê Văn C"),
                ("ConsultationMinutes", "Biên bản hội chẩn chuyên khoa"),
                ("SurgicalConsent", "Cam kết phẫu thuật - nội soi cắt túi mật"),
                ("Prescription", "Đơn thuốc BHYT dài ngày"),
                ("TreatmentSheet", "Phiếu điều trị hậu phẫu ngày 1"),
            };
            var reqs = new List<SigningRequest>();
            for (int i = 0; i < 25 && users.Count > 0; i++)
            {
                var t = docTypes[i % docTypes.Length];
                var submitted = users[i % users.Count];
                // First 8 assigned to admin = pending; rest mixed status
                var status = i < 8 ? 0 : (i % 4 switch { 0 => 0, 1 => 1, 2 => 2, _ => 3 });
                var created = ctx.Now.AddDays(-rng.Next(0, 14)).AddHours(-rng.Next(0, 23));
                reqs.Add(new SigningRequest
                {
                    Id = Guid.NewGuid(),
                    DocumentType = t.Type,
                    DocumentId = Guid.NewGuid(),
                    DocumentTitle = t.Title,
                    DocumentContent = $"Tóm tắt: {t.Title}. Vui lòng ký xác nhận.",
                    SubmittedById = submitted.Id,
                    SubmittedByName = submitted.FullName,
                    AssignedToId = i < 10 ? adminId : users[(i + 1) % users.Count].Id,
                    AssignedToName = i < 10 ? adminName : users[(i + 1) % users.Count].FullName,
                    Status = status,
                    RejectReason = status == 2 ? "Thông tin chưa đầy đủ, cần bổ sung chẩn đoán" : null,
                    SignedAt = status == 1 ? created.AddHours(rng.Next(1, 12)) : null,
                    SignatureData = status == 1 ? "{\"cert\":\"VNPT-CA\",\"serial\":\"XYZ1234\"}" : null,
                    DepartmentName = ctx.DepartmentIds.Count > 0 ? "Khoa Nội tổng hợp" : null,
                    CreatedAt = created, UpdatedAt = ctx.Now
                });
            }
            _db.SigningRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            summary["SigningRequests"] = reqs.Count;
        }
        } catch (Exception ex) { errors["SigningRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Shift-to-today: many list pages (reception queue, OPD, radiology, lab,
        // prescription, service requests) filter `CreatedAt.Date == today`. The
        // restored BAK is past-dated so those pages render empty. Bulk-update a
        // slice of the newest rows in each table to today's date so the demo
        // renders a busy day. Raw SQL keeps it idempotent and cheap.
        try {
            // Wrap each UPDATE in a dynamic-SQL + column-exists guard so
            // schema drift in any single table doesn't abort the whole block.
            await _db.Database.ExecuteSqlRawAsync(@"
DECLARE @today datetime2 = CAST(CAST(SYSDATETIME() AS date) AS datetime2);

-- MedicalRecords: 30 newest to today (CreatedAt + AdmissionDate because
-- several search endpoints filter on AdmissionDate, not CreatedAt)
UPDATE m SET
    CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM MedicalRecords m
WHERE CreatedAt < @today
  AND m.Id IN (SELECT TOP 30 Id FROM MedicalRecords ORDER BY CreatedAt DESC);

-- Separate update for AdmissionDate so we catch rows whose CreatedAt was
-- shifted in a previous run but AdmissionDate stayed in the past.
-- Important: target MedicalRecords that ACTUALLY have Examinations
-- attached so the /examination/search date filter returns rows.
UPDATE m SET
    AdmissionDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM MedicalRecords m
WHERE (AdmissionDate IS NOT NULL AND CAST(AdmissionDate AS date) < @today)
  AND m.Id IN (
    SELECT TOP 30 e.MedicalRecordId
    FROM Examinations e
    WHERE e.MedicalRecordId IS NOT NULL
    ORDER BY e.CreatedAt DESC
  );

-- Examinations: only CreatedAt (ScheduledDateTime may or may not exist)
UPDATE e SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM Examinations e
WHERE CreatedAt < @today
  AND e.Id IN (SELECT TOP 30 Id FROM Examinations ORDER BY CreatedAt DESC);

IF COL_LENGTH('Examinations','ScheduledDateTime') IS NOT NULL
BEGIN
  EXEC('UPDATE e SET ScheduledDateTime = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM Examinations e
        WHERE ScheduledDateTime IS NOT NULL AND CAST(ScheduledDateTime AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND e.Id IN (SELECT TOP 30 Id FROM Examinations ORDER BY CreatedAt DESC)');
END

-- ServiceRequests: 40 newest
UPDATE s SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM ServiceRequests s
WHERE CreatedAt < @today
  AND s.Id IN (SELECT TOP 40 Id FROM ServiceRequests ORDER BY CreatedAt DESC);

IF COL_LENGTH('ServiceRequests','RequestDate') IS NOT NULL
BEGIN
  EXEC('UPDATE s SET RequestDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM ServiceRequests s
        WHERE CAST(RequestDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND s.Id IN (SELECT TOP 40 Id FROM ServiceRequests ORDER BY CreatedAt DESC)');
END

-- Prescriptions: 20 newest
UPDATE p SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM Prescriptions p
WHERE CreatedAt < @today
  AND p.Id IN (SELECT TOP 20 Id FROM Prescriptions ORDER BY CreatedAt DESC);

IF COL_LENGTH('Prescriptions','PrescriptionDate') IS NOT NULL
BEGIN
  EXEC('UPDATE p SET PrescriptionDate = CAST(CAST(SYSDATETIME() AS date) AS datetime2)
        FROM Prescriptions p
        WHERE CAST(PrescriptionDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND p.Id IN (SELECT TOP 20 Id FROM Prescriptions ORDER BY CreatedAt DESC)');
END

-- Appointments: shift 5 appointments to today for the today-queue
IF OBJECT_ID('Appointments','U') IS NOT NULL
BEGIN
  EXEC('UPDATE a SET AppointmentDate = CAST(CAST(SYSDATETIME() AS date) AS datetime2)
        FROM Appointments a
        WHERE a.Id IN (SELECT TOP 5 Id FROM Appointments WHERE AppointmentDate < CAST(CAST(SYSDATETIME() AS date) AS datetime2) ORDER BY AppointmentDate DESC)');
END

-- QueueTickets: shift some to today so queue display works
IF OBJECT_ID('QueueTickets','U') IS NOT NULL AND COL_LENGTH('QueueTickets','IssueDate') IS NOT NULL
BEGIN
  EXEC('UPDATE q SET IssueDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM QueueTickets q
        WHERE CAST(IssueDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND q.Id IN (SELECT TOP 20 Id FROM QueueTickets ORDER BY IssueDate DESC)');
END

-- LabOrders: shift so LIS /orders/pending returns today's rows
IF OBJECT_ID('LabOrders','U') IS NOT NULL AND COL_LENGTH('LabOrders','OrderedAt') IS NOT NULL
BEGIN
  EXEC('UPDATE o SET OrderedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM LabOrders o
        WHERE CAST(OrderedAt AS date) < CAST(SYSDATETIME() AS date)
          AND o.Id IN (SELECT TOP 30 Id FROM LabOrders ORDER BY OrderedAt DESC)');
END
");
            summary["ShiftedToToday"] = 125;
        } catch (Exception ex) { errors["ShiftToToday"] = ex.GetBaseException().Message; }

        return Ok(new { success = true, module = "finishing", inserted = summary, errors });
    }

    // ==========================================================================
    // ALL-IN-ONE
    // ==========================================================================
    [HttpPost("all")]
    public async Task<IActionResult> PopulateAll()
    {
        var all = new Dictionary<string, object>();
        foreach (var (name, fn) in new (string, Func<Task<IActionResult>>)[]
        {
            ("prereqs", PopulatePrereqs),
            ("infection-control", PopulateInfectionControl),
            ("patient-portal", PopulatePatientPortal),
            ("equipment", PopulateEquipment),
            ("pathology", PopulatePathology),
            ("quality", PopulateQuality),
            ("rehab-sessions", PopulateRehabSessions),
            ("tele-sessions", PopulateTeleSessions),
            ("diet-orders", PopulateDietOrders),
            ("blood-bank", PopulateBloodBank),
            ("culture-stock", PopulateCultureStock),
            ("public-health", PopulatePublicHealth),
            ("methadone", PopulateMethadone),
            ("lab-qc", PopulateLabQC),
            ("mci", PopulateMCI),
            ("cme", PopulateCME),
            ("medinet-extras", PopulateMedinetExtras),
            ("finishing", PopulateFinishing),
        })
        {
            try
            {
                var r = await fn();
                if (r is ObjectResult { Value: var v }) all[name] = v!;
            }
            catch (Exception e)
            {
                all[name] = new { error = e.Message };
                _logger.LogError(e, "Populate {Module} failed", name);
            }
            // If any sub-call failed mid-flight its entities stay tracked; clear
            // between modules so the next module's SaveChangesAsync isn't polluted
            // by the previous module's unpersisted inserts.
            _db.ChangeTracker.Clear();
        }
        return Ok(new { success = true, modules = all });
    }
}
