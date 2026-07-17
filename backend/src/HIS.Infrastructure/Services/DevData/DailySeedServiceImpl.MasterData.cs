using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services.DevData;

public partial class DailySeedServiceImpl
{
    // Split out of RunDailySeedAsync (task #364 wave-6): one-time master-data seed —
    // HIEConnection, TrainingClass, ResearchProject, IvfPatientCouple+IvfCycle,
    // RadiologyConsultationSession, FixedAsset. Cut verbatim; the `new*` counters
    // (each declared right before its own block in the original) are now returned
    // as a tuple.
    private async Task<(int hie, int training, int research, int ivfCouples, int ivfCycles, int consult, int assets)> SeedMasterDataAsync(
        DateTime today, DateTime now,
        List<Guid> docIdsAll, List<Guid> deptIdsAll, List<Guid> todayPatientIds)
    {
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

        return (newHie, newTraining, newResearch, newIvfCouples, newIvfCycles, newConsult, newAssets);
    }
}
