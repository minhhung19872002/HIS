using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.API.Filters;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
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
        if (ctx.PatientIds.Count == 0) return Ok(new { error = "no patients" });

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

        return Ok(new { module = "medinet-extras", inserted = summary });
    }

}
