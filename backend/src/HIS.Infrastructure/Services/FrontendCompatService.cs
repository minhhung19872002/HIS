using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Aliases cho các endpoint frontend gọi nhưng chưa có hoặc phân tán.
/// Logic tách khỏi FrontendCompatController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ NGUYÊN;
/// OHExams giữ nguyên FromSqlRaw với lý do tránh int/string type mismatch của EF;
/// OHHazardTypes + EpiNotifiable là dữ liệu tĩnh (đồng bộ, không cần DB).
/// </summary>
public class FrontendCompatService : IFrontendCompatService
{
    private readonly HISDbContext _db;
    public FrontendCompatService(HISDbContext db) { _db = db; }

    // ---- Hospital Pharmacy: /dashboard, /stock, /revenue ----

    // QA0915 wave 2: the three hospital-pharmacy aliases returned placeholder data — dashboard counted ALL
    // prescriptions + ALL hospital receipts with a hard-coded lowStock = 3; stock returned the medicine
    // catalog with no quantity (FE "Tồn" column always blank) and ignored keyword/page; revenue summed every
    // hospital Receipt as {date,total}. They now read the pharmacy's own data: RetailSales (VN day) and
    // InventoryItems of the hospital-pharmacy warehouses — the same warehouses POS sales deduct from.

    private const decimal LowStockThreshold = 10; // same default as StockReportService.LowStockAsync

    /// <summary>Hospital-pharmacy warehouses (type 4); falls back to all dispensing warehouses if none configured.</summary>
    private async Task<List<Guid>> PharmacyWarehouseIdsAsync()
    {
        var ids = await _db.Warehouses.AsNoTracking()
            .Where(w => w.IsActive && !w.IsDeleted && w.WarehouseType == HIS.Core.Constants.WarehouseType.Pharmacy)
            .Select(w => w.Id).ToListAsync();
        if (ids.Count == 0)
            ids = await _db.Warehouses.AsNoTracking()
                .Where(w => w.IsActive && !w.IsDeleted && HIS.Core.Constants.WarehouseType.Dispensing.Contains(w.WarehouseType))
                .Select(w => w.Id).ToListAsync();
        return ids;
    }

    public async Task<ServiceOutcome> HPDashboardAsync()
    {
        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
        var today = await _db.RetailSales.AsNoTracking()
            .Where(s => !s.IsDeleted && s.Status == "Completed" && s.CreatedAt >= fromUtc && s.CreatedAt < toUtc)
            .Select(s => s.PaidAmount).ToListAsync();

        var whIds = await PharmacyWarehouseIdsAsync();
        var perMedicine = await _db.InventoryItems.AsNoTracking()
            .Where(i => whIds.Contains(i.WarehouseId) && !i.IsDeleted && i.MedicineId != null)
            .GroupBy(i => i.MedicineId)
            .Select(g => g.Sum(x => x.Quantity - x.ReservedQuantity))
            .ToListAsync();
        var lowStockCount = perMedicine.Count(q => q <= LowStockThreshold);

        return ServiceOutcome.Ok(new
        {
            todayRevenue = today.Sum(),
            todaySaleCount = today.Count,
            lowStockCount,
            // legacy keys kept for older callers
            salesToday = today.Count,
            stockItems = perMedicine.Count,
            lowStock = lowStockCount,
            revenueToday = today.Sum(),
        });
    }

    public async Task<ServiceOutcome> HPStockAsync(string? keyword, int page, int pageSize)
    {
        if (pageSize <= 0 || pageSize > 500) pageSize = 50;
        if (page < 0) page = 0;
        var whIds = await PharmacyWarehouseIdsAsync();
        var today = DateTime.Today;

        var lots = _db.InventoryItems.AsNoTracking()
            .Where(i => whIds.Contains(i.WarehouseId) && !i.IsDeleted && i.MedicineId != null && i.Quantity > 0);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            lots = lots.Where(i => i.Medicine!.MedicineName.Contains(kw) || i.Medicine.MedicineCode.Contains(kw)
                || (i.Medicine.ActiveIngredient != null && i.Medicine.ActiveIngredient.Contains(kw)));
        }

        var perMedicine = await lots.GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, StockQuantity = g.Sum(x => x.Quantity - x.ReservedQuantity) })
            .ToListAsync();
        var qtyById = perMedicine.ToDictionary(x => x.MedicineId, x => x.StockQuantity);
        var allIds = qtyById.Keys.ToList();

        var totalCount = allIds.Count;
        var pageRows = (await _db.Medicines.AsNoTracking()
                .Where(m => allIds.Contains(m.Id))
                .OrderBy(m => m.MedicineName)
                .Skip(page * pageSize).Take(pageSize)
                .Select(m => new { MedicineId = m.Id, m.MedicineCode, m.MedicineName, m.ActiveIngredient, m.Unit, m.UnitPrice })
                .ToListAsync())
            .Select(m => new
            {
                m.MedicineId, m.MedicineCode, m.MedicineName, m.ActiveIngredient, m.Unit, m.UnitPrice,
                StockQuantity = qtyById[m.MedicineId]
            })
            .ToList();

        var ids = pageRows.Select(r => r.MedicineId).ToList();
        var batches = await _db.InventoryItems.AsNoTracking()
            .Where(i => whIds.Contains(i.WarehouseId) && !i.IsDeleted && i.Quantity > 0
                && i.MedicineId != null && ids.Contains(i.MedicineId.Value)
                && (i.ExpiryDate == null || i.ExpiryDate >= today))
            .Select(i => new { MedicineId = i.MedicineId!.Value, i.BatchNumber, i.ExpiryDate })
            .ToListAsync();

        var items = pageRows.Select(r =>
        {
            var lot = batches.Where(b => b.MedicineId == r.MedicineId)
                .OrderBy(b => b.ExpiryDate ?? DateTime.MaxValue).FirstOrDefault();
            return new
            {
                id = r.MedicineId,
                medicineCode = r.MedicineCode,
                medicineName = r.MedicineName,
                activeIngredient = r.ActiveIngredient,
                unit = r.Unit,
                unitPrice = r.UnitPrice,
                stockQuantity = r.StockQuantity,
                batchNumber = lot?.BatchNumber,
                expiryDate = lot?.ExpiryDate?.ToString("yyyy-MM-dd"),
            };
        }).ToList();

        return ServiceOutcome.Ok(new { items, totalCount });
    }

    public async Task<ServiceOutcome> HPRevenueAsync(DateTime? fromDate, DateTime? toDate)
    {
        var toLocal = (toDate ?? HIS.Core.Common.VnTime.TodayVn).Date;
        var fromLocal = (fromDate ?? toLocal.AddDays(-30)).Date;
        if (fromLocal > toLocal) (fromLocal, toLocal) = (toLocal, fromLocal);
        var fromUtc = HIS.Core.Common.VnTime.DayRangeUtc(fromLocal).FromUtc;
        var toUtc = HIS.Core.Common.VnTime.DayRangeUtc(toLocal).ToUtc;

        var sales = await _db.RetailSales.AsNoTracking()
            .Where(s => !s.IsDeleted && s.Status == "Completed" && s.CreatedAt >= fromUtc && s.CreatedAt < toUtc)
            .Select(s => new { s.CreatedAt, s.TotalAmount, s.DiscountAmount, s.PaidAmount })
            .ToListAsync();

        var rows = sales
            .GroupBy(s => s.CreatedAt.AddHours(7).Date) // CreatedAt is UTC; bucket by VN day
            .Select(g => new
            {
                date = g.Key.ToString("yyyy-MM-dd"),
                totalSales = g.Count(),
                totalAmount = g.Sum(x => x.TotalAmount),
                totalDiscount = g.Sum(x => x.DiscountAmount),
                netRevenue = g.Sum(x => x.PaidAmount),
                total = g.Sum(x => x.PaidAmount), // legacy key
            })
            .OrderBy(x => x.date)
            .ToList();
        return ServiceOutcome.Ok(rows);
    }

    // ---- Insurance XML / BHXH Audit ----

    public async Task<ServiceOutcome> InsuranceXmlClaimsAsync(int pageSize)
    {
        var items = await _db.Receipts
            .OrderByDescending(r => r.CreatedAt)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id, r.ReceiptCode, r.CreatedAt,
                PatientName = r.Patient != null ? r.Patient.FullName : "",
                r.FinalAmount, r.PaymentMethod,
                Status = "submitted"
            })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
    }

    // ---- Occupational Health: /exams /hazard-types ----

    public async Task<ServiceOutcome> OHExamsAsync(int pageSize)
    {
        // Use raw SQL to dodge the Classification int/string type mismatch
        // that blows up EF's default projection for this table.
        var items = await _db.OccupationalHealthExams
            .FromSqlRaw(@"SELECT TOP(@p0) Id, EmployeeName, EmployeeCode, CompanyName,
                                 Department, JobTitle, HazardExposure, ExposureYears,
                                 ExamType, ExamDate, OccupationalDisease,
                                 CAST(Classification AS NVARCHAR(50)) AS Classification,
                                 Status, CreatedAt, UpdatedAt, IsDeleted,
                                 PatientId, CompanyTaxCode, GeneralHealth, RespiratoryResult,
                                 HearingResult, VisionResult, SkinResult, LabResults,
                                 XrayResult, DiseaseCode, Recommendations, DoctorName, Notes,
                                 CreatedBy, UpdatedBy
                          FROM OccupationalHealthExams
                          ORDER BY ExamDate DESC", pageSize)
            .AsNoTracking()
            .Select(e => new
            {
                e.Id, e.EmployeeName, e.EmployeeCode, e.CompanyName, e.CompanyTaxCode,
                e.Department, e.JobTitle, e.HazardExposure, e.ExposureYears,
                e.ExamType, e.ExamDate, e.OccupationalDisease, e.Classification,
                e.DoctorName, e.Status, e.RespiratoryResult, e.HearingResult, e.VisionResult,
                e.XrayResult, e.LabResults, e.Recommendations, e.Notes
            })
            .ToListAsync();
        // QA0915 wave 2: add the v2 OccupationalHealth.tsx (OccExam) field names next to the legacy keys.
        return ServiceOutcome.Ok(items.Select(e => new
        {
            e.Id, e.EmployeeName, e.EmployeeCode, e.CompanyName,
            e.Department, e.JobTitle, e.HazardExposure, e.ExposureYears,
            e.ExamType, e.ExamDate, e.OccupationalDisease, e.Classification,
            examCode = "KNN-" + e.ExamDate.ToString("yyMMdd") + "-" + e.Id.ToString("N")[..4].ToUpperInvariant(),
            patientName = e.EmployeeName,
            patientCode = e.EmployeeCode,
            companyCode = e.CompanyTaxCode,
            occupation = e.JobTitle,
            yearsOfExposure = e.ExposureYears,
            examDoctor = e.DoctorName,
            hazardTypes = (e.HazardExposure ?? string.Empty)
                .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            spirometryResult = e.RespiratoryResult,
            audiometryResult = e.HearingResult,
            visionResult = e.VisionResult,
            xrayResult = e.XrayResult,
            labResults = e.LabResults,
            status = e.Status,
            recommendations = e.Recommendations,
            notes = e.Notes,
        }).ToList());
    }

    public ServiceOutcome OHHazardTypes() => ServiceOutcome.Ok(new object[]
    {
        new { code = "DUST",    name = "Bụi công nghiệp",  description = "Bụi silic, bụi bông, bụi than" },
        new { code = "NOISE",   name = "Tiếng ồn",          description = "Tiếng ồn > 85 dB" },
        new { code = "CHEM",    name = "Hóa chất độc hại",  description = "Dung môi hữu cơ, khí độc, hơi độc" },
        new { code = "RAD",     name = "Bức xạ ion hóa",    description = "Tia X, gamma, bức xạ hạt nhân" },
        new { code = "HEAT",    name = "Nhiệt độ cao",      description = "Làm việc trong môi trường nóng > 35°C" },
        new { code = "VIB",     name = "Rung chuyển",       description = "Rung toàn thân hoặc khu trú" },
        new { code = "BIO",     name = "Tác nhân sinh học", description = "Vi sinh vật gây bệnh, dịch cơ thể" },
        new { code = "ERGO",    name = "Yếu tố ecgonomi",   description = "Tư thế gượng, làm việc lặp lại" },
    });

    // ---- School Health: /schools /exams ----

    public async Task<ServiceOutcome> SHSchoolsAsync()
    {
        var schools = await _db.SchoolHealthExams
            .GroupBy(s => new { s.SchoolName, s.SchoolCode, s.AcademicYear })
            .Select(g => new
            {
                schoolName = g.Key.SchoolName,
                schoolCode = g.Key.SchoolCode,
                academicYear = g.Key.AcademicYear,
                studentCount = g.Count()
            })
            .ToListAsync();
        return ServiceOutcome.Ok(schools);
    }

    public async Task<ServiceOutcome> SHExamsAsync(int pageSize)
    {
        var items = await _db.SchoolHealthExams
            .OrderByDescending(e => e.ExamDate)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id, e.SchoolName, e.GradeLevel, e.StudentName, e.StudentCode,
                e.Gender, e.ExamDate, e.Height, e.Weight, e.BMI,
                e.NutritionStatus, e.VisionLeft, e.VisionRight,
                e.DentalResult, e.OverallResult
            })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
    }

    // ---- Epidemiology: /reports /statistics /notifiable-diseases ----

    public async Task<ServiceOutcome> EpiReportsAsync(int pageSize)
    {
        var items = await _db.DiseaseReports
            .OrderByDescending(d => d.OnsetDate)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id, d.PatientName, d.PatientAge, d.PatientGender, d.PatientAddress,
                d.DiseaseCode, d.DiseaseName, d.DiseaseGroup,
                d.OnsetDate, d.ReportDate, d.Status, d.Outcome, d.ContactCount,
                d.DiagnosisDate, d.ReportedBy, d.LabConfirmation, d.Notes,
                PatientCode = d.Patient != null ? d.Patient.PatientCode : null
            })
            .ToListAsync();
        // QA0915 wave 2: add the v2 Epidemiology.tsx (DiseaseReport) field names next to the legacy keys.
        return ServiceOutcome.Ok(items.Select(d => new
        {
            d.Id, d.PatientName, d.PatientAge, d.PatientGender, d.PatientAddress,
            d.DiseaseCode, d.DiseaseName, d.DiseaseGroup,
            d.OnsetDate, d.ReportDate, d.Status, d.Outcome, d.ContactCount,
            reportCode = "BC-" + d.ReportDate.ToString("yyMMdd") + "-" + d.Id.ToString("N")[..4].ToUpperInvariant(),
            patientCode = d.PatientCode,
            gender = d.PatientGender == "1" || string.Equals(d.PatientGender, "Nam", StringComparison.OrdinalIgnoreCase)
                     || string.Equals(d.PatientGender, "Male", StringComparison.OrdinalIgnoreCase) ? 1
                     : string.IsNullOrEmpty(d.PatientGender) ? (int?)null : 2,
            age = int.TryParse(d.PatientAge, out var a) ? a : (int?)null,
            address = d.PatientAddress,
            diagnosisDate = d.DiagnosisDate,
            reportingDoctor = d.ReportedBy,
            labConfirmed = !string.IsNullOrWhiteSpace(d.LabConfirmation),
            notes = d.Notes,
        }).ToList());
    }

    public async Task<ServiceOutcome> EpiStatisticsAsync()
    {
        var from30 = DateTime.UtcNow.AddDays(-30);
        var totalCases = await _db.DiseaseReports.CountAsync();
        var recent = await _db.DiseaseReports.Where(d => d.OnsetDate >= from30).CountAsync();
        var activeOutbreaks = await _db.OutbreakEvents.Where(o => o.Status < 3).CountAsync();
        var byDisease = await _db.DiseaseReports.GroupBy(d => d.DiseaseName)
            .Select(g => new { disease = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10).ToListAsync();
        // v2 Epidemiology.tsx EpiStats keys added alongside the legacy ones.
        var confirmedCases = await _db.DiseaseReports.CountAsync(d => d.Status == 2);
        var deathCount = await _db.DiseaseReports.CountAsync(d => d.Outcome == "Deceased");
        return ServiceOutcome.Ok(new
        {
            totalCases, recent30Days = recent, activeOutbreaks, byDisease,
            totalReports = totalCases, confirmedCases, deathCount, diseaseDistribution = byDisease,
        });
    }

    public ServiceOutcome EpiNotifiable() => ServiceOutcome.Ok(new object[]
    {
        new { code = "A00", name = "Tả", group = "A" },
        new { code = "A01", name = "Thương hàn và phó thương hàn", group = "A" },
        new { code = "A03", name = "Lỵ trực trùng", group = "A" },
        new { code = "A16", name = "Lao hô hấp", group = "B" },
        new { code = "A39", name = "Nhiễm não mô cầu", group = "B" },
        new { code = "A82", name = "Dại", group = "B" },
        new { code = "A90", name = "Sốt xuất huyết Dengue", group = "B" },
        new { code = "A91", name = "Sốt xuất huyết Dengue thể nặng", group = "B" },
        new { code = "B05", name = "Sởi", group = "B" },
        new { code = "B16", name = "Viêm gan siêu vi B cấp", group = "B" },
        new { code = "B20", name = "Nhiễm HIV/AIDS", group = "B" },
        new { code = "J09", name = "Cúm A/H1N1, A/H5N1", group = "A" },
        new { code = "U07.1", name = "COVID-19", group = "A" },
    });

    // ---- RIS admin: areas / folders / hospital-config / dispatch stats ----

    private const string RisFolderPrefix = "RIS.Folder.";
    private const string HospitalCfgPrefix = "Hospital.";

    public async Task<ServiceOutcome> RisAreasAsync()
    {
        var rows = await _db.HospitalBranches.AsNoTracking()
            .OrderBy(b => b.BranchCode)
            .Select(b => new { id = b.Id, areaCode = b.BranchCode, areaName = b.BranchName, address = b.Address, isActive = b.IsActive })
            .ToListAsync();
        return ServiceOutcome.Ok(rows);
    }

    public async Task<ServiceOutcome> RisSaveAreaAsync(RisAreaSaveDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.AreaCode) || string.IsNullOrWhiteSpace(dto.AreaName))
            return ServiceOutcome.Bad("Mã và tên khu vực là bắt buộc");
        var code = dto.AreaCode.Trim();
        var now = DateTime.Now;
        var entity = dto.Id.HasValue
            ? await _db.HospitalBranches.FirstOrDefaultAsync(b => b.Id == dto.Id.Value)
            : await _db.HospitalBranches.FirstOrDefaultAsync(b => b.BranchCode == code);
        if (entity == null)
        {
            entity = new HIS.Core.Entities.HospitalBranch { Id = Guid.NewGuid(), CreatedAt = now, CreatedBy = userId };
            _db.HospitalBranches.Add(entity);
        }
        else
        {
            entity.UpdatedAt = now;
            entity.UpdatedBy = userId;
        }
        entity.BranchCode = code;
        entity.BranchName = dto.AreaName.Trim();
        entity.Address = dto.Address;
        entity.IsActive = dto.IsActive ?? true;
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = entity.Id, areaCode = entity.BranchCode, areaName = entity.BranchName, address = entity.Address, isActive = entity.IsActive });
    }

    public async Task<ServiceOutcome> RisFoldersAsync()
    {
        var rows = await _db.SystemConfigs.AsNoTracking()
            .Where(c => c.ConfigKey.StartsWith(RisFolderPrefix) && c.IsActive)
            .Select(c => new { c.Id, c.ConfigValue })
            .ToListAsync();
        var list = rows.Select(r =>
        {
            RisFolderSaveDto? f = null;
            try { f = System.Text.Json.JsonSerializer.Deserialize<RisFolderSaveDto>(r.ConfigValue); } catch { /* skip corrupt row */ }
            return f == null ? null : new { id = r.Id, folderName = f.FolderName, folderType = f.FolderType, areaName = f.AreaName, sortOrder = f.SortOrder ?? 0 };
        }).Where(x => x != null).OrderBy(x => x!.sortOrder).ThenBy(x => x!.folderName).ToList();
        return ServiceOutcome.Ok(list);
    }

    public async Task<ServiceOutcome> RisSaveFolderAsync(RisFolderSaveDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.FolderName)) return ServiceOutcome.Bad("Tên thư mục là bắt buộc");
        if (dto.FolderType is < 1 or > 3) return ServiceOutcome.Bad("Loại thư mục không hợp lệ");
        // Share / Upload folders have a fixed sort order per RIS spec (900 / 950).
        dto.SortOrder = dto.FolderType == 2 ? 900 : dto.FolderType == 3 ? 950 : (dto.SortOrder ?? 0);
        dto.FolderName = dto.FolderName.Trim();
        var now = DateTime.Now;
        var entity = dto.Id.HasValue ? await _db.SystemConfigs.FirstOrDefaultAsync(c => c.Id == dto.Id.Value && c.ConfigKey.StartsWith(RisFolderPrefix)) : null;
        if (entity == null)
        {
            var id = Guid.NewGuid();
            entity = new HIS.Core.Entities.SystemConfig
            {
                Id = id, ConfigKey = RisFolderPrefix + id.ToString("N"), ConfigType = "JSON",
                Description = "RIS folder (cấp 2)", IsActive = true, CreatedAt = now, CreatedBy = userId,
            };
            _db.SystemConfigs.Add(entity);
        }
        else
        {
            entity.UpdatedAt = now;
            entity.UpdatedBy = userId;
        }
        dto.Id = entity.Id;
        entity.ConfigValue = System.Text.Json.JsonSerializer.Serialize(dto);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id = entity.Id, folderName = dto.FolderName, folderType = dto.FolderType, areaName = dto.AreaName, sortOrder = dto.SortOrder ?? 0 });
    }

    private static readonly string[] HospitalCfgFields =
        { "HospitalName", "Address", "Phone", "Email", "Website", "LogoUrl", "ReportFooter" };

    public async Task<ServiceOutcome> HospitalConfigAsync()
    {
        var keys = HospitalCfgFields.Select(f => HospitalCfgPrefix + f).ToList();
        var map = await _db.SystemConfigs.AsNoTracking()
            .Where(c => keys.Contains(c.ConfigKey))
            .ToDictionaryAsync(c => c.ConfigKey, c => c.ConfigValue);
        string? Get(string f) => map.TryGetValue(HospitalCfgPrefix + f, out var v) ? v : null;
        return ServiceOutcome.Ok(new HospitalConfigDto
        {
            HospitalName = Get("HospitalName"), Address = Get("Address"), Phone = Get("Phone"), Email = Get("Email"),
            Website = Get("Website"), LogoUrl = Get("LogoUrl"), ReportFooter = Get("ReportFooter"),
        });
    }

    public async Task<ServiceOutcome> SaveHospitalConfigAsync(HospitalConfigDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.HospitalName)) return ServiceOutcome.Bad("Tên bệnh viện là bắt buộc");
        var values = new Dictionary<string, string?>
        {
            ["HospitalName"] = dto.HospitalName.Trim(), ["Address"] = dto.Address, ["Phone"] = dto.Phone,
            ["Email"] = dto.Email, ["Website"] = dto.Website, ["LogoUrl"] = dto.LogoUrl, ["ReportFooter"] = dto.ReportFooter,
        };
        var keys = values.Keys.Select(f => HospitalCfgPrefix + f).ToList();
        var existing = await _db.SystemConfigs.Where(c => keys.Contains(c.ConfigKey)).ToListAsync();
        var now = DateTime.Now;
        foreach (var (field, value) in values)
        {
            var key = HospitalCfgPrefix + field;
            var row = existing.FirstOrDefault(c => c.ConfigKey == key);
            if (row == null)
            {
                _db.SystemConfigs.Add(new HIS.Core.Entities.SystemConfig
                {
                    Id = Guid.NewGuid(), ConfigKey = key, ConfigValue = value ?? string.Empty, ConfigType = "String",
                    Description = "Cấu hình bệnh viện (RIS)", IsActive = true, CreatedAt = now, CreatedBy = userId,
                });
            }
            else
            {
                row.ConfigValue = value ?? string.Empty;
                row.UpdatedAt = now;
                row.UpdatedBy = userId;
            }
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(dto);
    }

    public async Task<ServiceOutcome> RadiologyDispatchStatsAsync(DateTime? fromDate, DateTime? toDate)
    {
        var from = (fromDate ?? DateTime.Today.AddDays(-7)).Date;
        var to = (toDate ?? DateTime.Today).Date.AddDays(1); // inclusive end day
        var req = _db.RadiologyRequests.AsNoTracking().Where(r => r.RequestDate >= from && r.RequestDate < to);
        // RadiologyRequest.Status: 0=Pending 1=Scheduled 2=InProgress 3=Completed 4=Reported 5=Approved 6=Cancelled
        var total = await req.CountAsync(r => r.Status != 6);
        var reported = await req.CountAsync(r => r.Status == 4 || r.Status == 5);
        var waitingRead = await req.CountAsync(r => r.Status == 3);
        var cancelled = await req.CountAsync(r => r.Status == 6);
        var consult = await _db.RadiologyConsultationCases.AsNoTracking().CountAsync(c => c.CreatedAt >= from && c.CreatedAt < to);
        var dispatched = await _db.RadiologyDispatches.AsNoTracking().CountAsync(d => d.DispatchedAt >= from && d.DispatchedAt < to);
        return ServiceOutcome.Ok(new object[]
        {
            new { label = "Tổng ca chụp", value = total },
            new { label = "Đã trả KQ", value = reported },
            new { label = "Chờ đọc", value = waitingRead },
            new { label = "Hội chẩn", value = consult },
            new { label = "Đã điều phối", value = dispatched },
            new { label = "Đã hủy", value = cancelled },
        });
    }

    // ---- School Health v2 (SchoolHealth.tsx contract) ----
    // Entity SchoolHealthExam has no ClassName / flag / conclusion columns: ClassName is kept in Notes as
    // "Lớp: <x>", flags are derived from existing result columns, conclusion ↔ OverallResult.

    private const string ClassNotePrefix = "Lớp: ";

    private static bool IsAbnormal(string? v) =>
        !string.IsNullOrWhiteSpace(v) && !v.Trim().StartsWith("Bình thường", StringComparison.OrdinalIgnoreCase)
        && !v.Trim().Equals("normal", StringComparison.OrdinalIgnoreCase) && !v.Trim().Equals("BT", StringComparison.OrdinalIgnoreCase);

    private static object MapSchoolExam(HIS.Core.Entities.SchoolHealthExam e)
    {
        var className = e.Notes != null && e.Notes.StartsWith(ClassNotePrefix) ? e.Notes.Substring(ClassNotePrefix.Length).Split('\n')[0].Trim() : null;
        var flagged = (e.HasVisionProblem ?? false) || IsAbnormal(e.HearingResult) || (e.DentalCavityCount ?? 0) > 0 || IsAbnormal(e.DentalResult) || IsAbnormal(e.SpineResult);
        return new
        {
            id = e.Id,
            studentName = e.StudentName,
            studentCode = e.StudentCode,
            gender = e.Gender == "1" || string.Equals(e.Gender, "Nam", StringComparison.OrdinalIgnoreCase) || string.Equals(e.Gender, "Male", StringComparison.OrdinalIgnoreCase) ? 1
                   : string.IsNullOrEmpty(e.Gender) ? (int?)null : 2,
            dateOfBirth = e.DateOfBirth,
            schoolName = e.SchoolName,
            schoolCode = e.SchoolCode ?? e.SchoolName,
            grade = e.GradeLevel,
            className,
            academicYear = e.AcademicYear,
            examDate = e.ExamDate == default ? e.CreatedAt : e.ExamDate,
            examDoctor = e.DoctorName,
            height = e.Height,
            weight = e.Weight,
            bmi = e.BMI ?? (e.Height > 0 && e.Weight > 0 ? Math.Round(e.Weight!.Value / Math.Pow(e.Height!.Value / 100d, 2), 1) : (double?)null),
            nutritionStatus = e.NutritionStatus,
            visionLeft = e.VisionLeft,
            visionRight = e.VisionRight,
            visionFlag = e.HasVisionProblem ?? false,
            hearingFlag = IsAbnormal(e.HearingResult),
            dentalFlag = (e.DentalCavityCount ?? 0) > 0 || IsAbnormal(e.DentalResult),
            scoliosisFlag = IsAbnormal(e.SpineResult),
            // FE status: 0=pending, 1=completed, 2=needsFollowUp
            status = e.Status == 0 ? 0 : flagged ? 2 : 1,
            conclusion = e.OverallResult,
            recommendations = e.Recommendations,
        };
    }

    public async Task<ServiceOutcome> SHExamsV2Async(string? keyword, string? schoolCode, string? academicYear, string? grade, int pageSize)
    {
        if (pageSize <= 0 || pageSize > 1000) pageSize = 500;
        var q = _db.SchoolHealthExams.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(schoolCode)) { var s = schoolCode.Trim(); q = q.Where(e => e.SchoolCode == s || e.SchoolName == s); }
        if (!string.IsNullOrWhiteSpace(academicYear)) { var y = academicYear.Trim(); q = q.Where(e => e.AcademicYear == y); }
        if (!string.IsNullOrWhiteSpace(grade)) { var g = grade.Trim(); q = q.Where(e => e.GradeLevel == g); }
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(e => e.StudentName.Contains(k) || (e.StudentCode != null && e.StudentCode.Contains(k)) || e.SchoolName.Contains(k));
        }
        var rows = await q.OrderByDescending(e => e.ExamDate).ThenBy(e => e.StudentName).Take(pageSize).ToListAsync();
        return ServiceOutcome.Ok(rows.Select(MapSchoolExam).ToList());
    }

    public async Task<ServiceOutcome> SHSchoolsV2Async()
    {
        var schools = await _db.SchoolHealthExams.AsNoTracking()
            .GroupBy(s => new { s.SchoolName, s.SchoolCode })
            .Select(g => new { g.Key.SchoolName, g.Key.SchoolCode, Count = g.Count() })
            .ToListAsync();
        return ServiceOutcome.Ok(schools
            .OrderBy(s => s.SchoolName)
            .Select(s => new
            {
                code = s.SchoolCode ?? s.SchoolName,
                name = s.SchoolName,
                address = (string?)null,
                type = (string?)null,
                // legacy keys kept for older callers
                schoolName = s.SchoolName,
                schoolCode = s.SchoolCode,
                studentCount = s.Count,
            }).ToList());
    }

    public async Task<ServiceOutcome> SHSaveExamAsync(Guid? id, SchoolExamSaveDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.StudentName) || string.IsNullOrWhiteSpace(dto.SchoolName))
            return ServiceOutcome.Bad("Họ tên học sinh và tên trường là bắt buộc");
        var now = DateTime.Now;
        HIS.Core.Entities.SchoolHealthExam? e;
        if (id.HasValue)
        {
            e = await _db.SchoolHealthExams.FirstOrDefaultAsync(x => x.Id == id.Value);
            if (e == null) return ServiceOutcome.NotFound("Không tìm thấy phiếu khám");
            e.UpdatedAt = now; e.UpdatedBy = userId;
        }
        else
        {
            e = new HIS.Core.Entities.SchoolHealthExam { Id = Guid.NewGuid(), CreatedAt = now, CreatedBy = userId, Status = 1 };
            _db.SchoolHealthExams.Add(e);
        }
        e.StudentName = dto.StudentName.Trim();
        e.StudentCode = dto.StudentCode ?? e.StudentCode;
        e.Gender = dto.Gender.HasValue ? (dto.Gender == 1 ? "Nam" : "Nữ") : e.Gender;
        e.DateOfBirth = dto.DateOfBirth ?? e.DateOfBirth;
        e.ExamDate = dto.ExamDate ?? (e.ExamDate == default ? now : e.ExamDate);
        e.SchoolName = dto.SchoolName.Trim();
        e.SchoolCode = dto.SchoolCode ?? e.SchoolCode;
        e.GradeLevel = dto.Grade ?? e.GradeLevel;
        e.AcademicYear = dto.AcademicYear ?? e.AcademicYear;
        e.Height = dto.Height ?? e.Height;
        e.Weight = dto.Weight ?? e.Weight;
        e.BMI = e.Height > 0 && e.Weight > 0 ? Math.Round(e.Weight!.Value / Math.Pow(e.Height!.Value / 100d, 2), 1) : e.BMI;
        e.VisionLeft = dto.VisionLeft ?? e.VisionLeft;
        e.VisionRight = dto.VisionRight ?? e.VisionRight;
        e.NutritionStatus = dto.NutritionStatus ?? e.NutritionStatus;
        if (dto.VisionFlag.HasValue) e.HasVisionProblem = dto.VisionFlag;
        if (dto.HearingFlag.HasValue) e.HearingResult = dto.HearingFlag.Value ? "Cần theo dõi" : "Bình thường";
        if (dto.DentalFlag.HasValue) e.DentalResult = dto.DentalFlag.Value ? "Cần theo dõi" : "Bình thường";
        if (dto.ScoliosisFlag.HasValue) e.SpineResult = dto.ScoliosisFlag.Value ? "Cong vẹo" : "Bình thường";
        e.OverallResult = dto.Conclusion ?? e.OverallResult;
        e.Recommendations = dto.Recommendations ?? e.Recommendations;
        e.DoctorName = dto.ExamDoctor ?? e.DoctorName;
        if (dto.Status.HasValue) e.Status = dto.Status.Value == 0 ? 0 : 1;
        if (dto.ClassName != null)
        {
            var rest = e.Notes != null && e.Notes.StartsWith(ClassNotePrefix)
                ? string.Join('\n', e.Notes.Split('\n').Skip(1)) : e.Notes;
            e.Notes = ClassNotePrefix + dto.ClassName.Trim() + (string.IsNullOrEmpty(rest) ? "" : "\n" + rest);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(MapSchoolExam(e));
    }

    // ---- Equipment categories ----

    private static readonly (string Code, string Name)[] StandardEquipmentCategories =
    {
        ("Diagnostic", "Chẩn đoán"), ("Therapeutic", "Điều trị"), ("Monitoring", "Theo dõi"),
        ("Surgical", "Phẫu thuật"), ("Laboratory", "Xét nghiệm"), ("Imaging", "Chẩn đoán hình ảnh"),
        ("Rehabilitation", "Phục hồi chức năng"), ("Sterilization", "Tiệt khuẩn"), ("Other", "Khác"),
    };

    public async Task<ServiceOutcome> EquipmentCategoriesAsync()
    {
        var inUse = await _db.MedicalEquipments.AsNoTracking()
            .Where(e => e.Category != null && e.Category != "")
            .Select(e => e.Category).Distinct().ToListAsync();
        var list = StandardEquipmentCategories
            .Select(c => new { code = c.Code, name = c.Name, isActive = true })
            .ToList();
        foreach (var c in inUse.Where(c => list.All(x => !string.Equals(x.code, c, StringComparison.OrdinalIgnoreCase))))
            list.Add(new { code = c, name = c, isActive = true });
        return ServiceOutcome.Ok(list);
    }
}
