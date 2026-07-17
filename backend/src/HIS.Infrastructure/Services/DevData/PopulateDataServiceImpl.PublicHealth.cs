using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // PUBLIC HEALTH / MEDINET (Vaccination, Disease, School, Occupational, Checkup)
    // ==========================================================================
    public async Task<object> PopulatePublicHealthAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(59);
        if (ctx.PatientIds.Count == 0) return Ok(new { error = "no patients" });

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

        return Ok(new { module = "public-health", inserted = summary });
    }

    // ==========================================================================
    // METHADONE
    // ==========================================================================
    public async Task<object> PopulateMethadoneAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(61);
        if (ctx.PatientIds.Count == 0) return Ok(new { error = "no patients" });

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

        return Ok(new { module = "methadone", inserted = summary });
    }

    // ==========================================================================
    // MCI (Mass Casualty Incident)
    // ==========================================================================
    public async Task<object> PopulateMCIAsync()
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

        return Ok(new { module = "mci", inserted = summary });
    }

    // ==========================================================================
    // CME RECORDS
    // ==========================================================================
    public async Task<object> PopulateCMEAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(73);

        if (!await _db.CMERecords.AnyAsync())
        {
            var staff = await _db.MedicalStaffs.Take(30).Select(s => s.Id).ToListAsync();
            if (staff.Count == 0) return Ok(new { error = "no staff" });

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

        return Ok(new { module = "cme", inserted = summary });
    }

}
