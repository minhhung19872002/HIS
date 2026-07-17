using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // Split out of PopulateFinishingAsync (task #364 wave-6): IVF couples+cycles,
    // FixedAssets, TrainingClasses, RadiologyRequests, ProcurementRequests,
    // HIEConnections. Cut verbatim; each block already owns its own try/catch so
    // no behavior change — only moved into its own method taking the same shared
    // ctx/summary/errors/rng references.
    private async Task SeedFinishingModulesAsync(Ctx ctx, Dictionary<string, int> summary, Dictionary<string, string> errors, Random rng)
    {
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

        // #14e: populate LabRequests (model 2) đã gỡ — danh sách chờ /laboratory dùng ServiceRequests (model 1, seed ở DailySeed)

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
    }
}
