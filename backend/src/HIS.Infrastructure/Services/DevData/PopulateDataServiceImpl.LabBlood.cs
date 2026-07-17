using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // BLOOD BANK
    // ==========================================================================
    public async Task<object> PopulateBloodBankAsync()
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

        return Ok(new { module = "blood-bank", inserted = summary });
    }

    // ==========================================================================
    // CULTURE STOCK (Vi sinh lưu chủng)
    // ==========================================================================
    public async Task<object> PopulateCultureStockAsync()
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

        return Ok(new { module = "culture-stock", inserted = summary });
    }

    // ==========================================================================
    // LAB QC (Kiểm soát chất lượng XN)
    // ==========================================================================
    public async Task<object> PopulateLabQCAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var rng = new Random(67);

        if (!await _db.LabQCResults.AnyAsync())
        {
            var analyzers = await _db.LabAnalyzers.Take(5).Select(a => a.Id).ToListAsync();
            var services = await _db.Services.Where(s => s.ServiceType == 2).Take(10).Select(s => new { s.Id, s.ServiceCode }).ToListAsync();
            if (analyzers.Count == 0 || services.Count == 0)
                return Ok(new { error = "no analyzers or lab services" });

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

        return Ok(new { module = "lab-qc", inserted = summary });
    }

}
