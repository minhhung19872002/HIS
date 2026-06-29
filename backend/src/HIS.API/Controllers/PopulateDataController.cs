using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.API.Filters;

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
[DevelopmentOnly] // #180: dev-only seed tool — 404 in prod (was anonymously writable on prod)
public partial class PopulateDataController : ControllerBase
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

        if (!await _db.PortalAppointments.AnyAsync() && ctx.DepartmentIds.Count > 0)
        {
            var complaints = new[] {
                "Tái khám huyết áp định kỳ", "Khám sức khỏe tổng quát", "Đau dạ dày kéo dài",
                "Tư vấn kết quả xét nghiệm", "Tái khám tiểu đường", "Đau khớp gối phải",
                "Khám tim mạch", "Ho kéo dài 2 tuần", "Khám thai định kỳ", "Tái khám sau mổ"
            };
            var appts = new List<PortalAppointment>();
            int seq = 0;
            foreach (var acc in accounts)
            {
                int n = rng.Next(1, 4);
                for (int i = 0; i < n; i++)
                {
                    seq++;
                    // ~60% upcoming (today..+14d) so the default upcoming view renders,
                    // ~40% history (past 30d) for the "Lịch sử" tab.
                    bool upcoming = rng.Next(0, 10) < 6;
                    var date = upcoming
                        ? ctx.Now.Date.AddDays(rng.Next(0, 15))
                        : ctx.Now.Date.AddDays(-rng.Next(1, 31));
                    string status = upcoming
                        ? (rng.Next(0, 2) == 0 ? "Confirmed" : "Pending")
                        : (rng.Next(0, 5) == 0 ? "Cancelled" : rng.Next(0, 6) == 0 ? "NoShow" : "Completed");
                    int hour = 8 + rng.Next(0, 9);
                    appts.Add(new PortalAppointment
                    {
                        Id = Guid.NewGuid(),
                        BookingCode = $"DK-{date:yyyyMMdd}-{seq:D4}",
                        PortalAccountId = acc,
                        PatientId = acc,
                        DepartmentId = ctx.DepartmentIds[rng.Next(ctx.DepartmentIds.Count)],
                        DoctorId = ctx.DoctorIds.Count > 0 ? ctx.DoctorIds[rng.Next(ctx.DoctorIds.Count)] : (Guid?)null,
                        AppointmentDate = date,
                        SlotTime = new TimeSpan(hour, rng.Next(0, 2) == 0 ? 0 : 30, 0),
                        Status = status,
                        ChiefComplaint = complaints[rng.Next(complaints.Length)],
                        IsPaid = status == "Completed",
                        // Prod PortalAppointments has drifted columns that are NOT NULL
                        // (e.g. BookingFee), so always write non-null values to dodge
                        // "Cannot insert NULL" regardless of the live schema.
                        BookingFee = status == "Completed" ? 50000m : 0m,
                        PaymentMethod = status == "Completed" ? "Tiền mặt" : "",
                        PaymentReference = status == "Completed" ? $"TT-{date:yyyyMMdd}-{seq:D4}" : "",
                        QueueNumber = "",
                        CancelledAt = status == "Cancelled" ? date.AddDays(-1) : (DateTime?)null,
                        CancellationReason = status == "Cancelled" ? "Bận việc đột xuất" : "",
                        CreatedAt = upcoming ? ctx.Now.AddDays(-rng.Next(1, 10)) : date.AddDays(-rng.Next(1, 5)),
                        UpdatedAt = ctx.Now
                    });
                }
            }
            _db.PortalAppointments.AddRange(appts);
            await _db.SaveChangesAsync();
            summary["PortalAppointments"] = appts.Count;
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

}
