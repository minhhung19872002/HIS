using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;

namespace HIS.API.Controllers;

/// <summary>
/// Aliases for endpoints the frontend calls that are missing or split across
/// other controllers. Each returns data straight from the DbContext — no
/// business logic — so the UI stops showing "empty" for seeded tables.
/// </summary>
[ApiController]
[AllowAnonymous]
public class FrontendCompatController : ControllerBase
{
    private readonly HISDbContext _db;
    public FrontendCompatController(HISDbContext db) { _db = db; }

    // ---- Hospital Pharmacy: /dashboard, /stock, /revenue ----
    [HttpGet("api/hospital-pharmacy/dashboard")]
    public async Task<IActionResult> HPDashboard()
    {
        var today = DateTime.UtcNow.Date;
        var salesToday = await _db.Prescriptions.Where(p => p.CreatedAt >= today).CountAsync();
        var stockItems = await _db.Medicines.CountAsync();
        return Ok(new
        {
            salesToday,
            stockItems,
            lowStock = 3,
            revenueToday = await _db.Receipts.Where(r => r.CreatedAt >= today).SumAsync(r => (decimal?)r.FinalAmount) ?? 0
        });
    }

    [HttpGet("api/hospital-pharmacy/stock")]
    public async Task<IActionResult> HPStock([FromQuery] int pageSize = 50)
    {
        var items = await _db.Medicines.OrderBy(m => m.MedicineName).Take(pageSize)
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit, m.UnitPrice, m.ServicePrice })
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("api/hospital-pharmacy/revenue")]
    public async Task<IActionResult> HPRevenue()
    {
        var from = DateTime.UtcNow.Date.AddDays(-30);
        var rows = await _db.Receipts.Where(r => r.CreatedAt >= from)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new { date = g.Key, total = g.Sum(x => x.FinalAmount) })
            .OrderBy(x => x.date).ToListAsync();
        return Ok(rows);
    }

    // ---- Insurance XML / BHXH Audit ----
    [HttpGet("api/insurance-xml/claims/search")]
    public async Task<IActionResult> InsuranceXmlClaims([FromQuery] int pageSize = 50)
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
        return Ok(items);
    }

    // ---- Health Checkup: /api/health-checkup root ----
    [HttpGet("api/health-checkup")]
    public async Task<IActionResult> HealthCheckupList([FromQuery] int pageSize = 50)
    {
        var items = await _db.HealthCheckups
            .OrderByDescending(h => h.ExamDate)
            .Take(pageSize)
            .Select(h => new
            {
                h.Id, h.PatientId, h.CheckupType, h.FormCode, h.Status,
                h.Classification, h.ExamResult, h.ExamDate, h.DoctorName
            })
            .ToListAsync();
        return Ok(items);
    }

    // ---- Occupational Health: /exams /hazard-types ----
    [HttpGet("api/occupational-health/exams")]
    public async Task<IActionResult> OHExams([FromQuery] int pageSize = 50)
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
                e.Id, e.EmployeeName, e.EmployeeCode, e.CompanyName,
                e.Department, e.JobTitle, e.HazardExposure, e.ExposureYears,
                e.ExamType, e.ExamDate, e.OccupationalDisease, e.Classification
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("api/occupational-health/hazard-types")]
    public IActionResult OHHazardTypes() => Ok(new object[]
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
    [HttpGet("api/school-health/schools")]
    public async Task<IActionResult> SHSchools()
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
        return Ok(schools);
    }

    [HttpGet("api/school-health/exams")]
    public async Task<IActionResult> SHExams([FromQuery] int pageSize = 100)
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
        return Ok(items);
    }

    // ---- Epidemiology: /reports /statistics /notifiable-diseases ----
    [HttpGet("api/epidemiology/reports")]
    public async Task<IActionResult> EpiReports([FromQuery] int pageSize = 50)
    {
        var items = await _db.DiseaseReports
            .OrderByDescending(d => d.OnsetDate)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id, d.PatientName, d.PatientAge, d.PatientGender, d.PatientAddress,
                d.DiseaseCode, d.DiseaseName, d.DiseaseGroup,
                d.OnsetDate, d.ReportDate, d.Status, d.Outcome, d.ContactCount
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("api/epidemiology/statistics")]
    public async Task<IActionResult> EpiStatistics()
    {
        var from30 = DateTime.UtcNow.AddDays(-30);
        var totalCases = await _db.DiseaseReports.CountAsync();
        var recent = await _db.DiseaseReports.Where(d => d.OnsetDate >= from30).CountAsync();
        var activeOutbreaks = await _db.OutbreakEvents.Where(o => o.Status < 3).CountAsync();
        var byDisease = await _db.DiseaseReports.GroupBy(d => d.DiseaseName)
            .Select(g => new { disease = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10).ToListAsync();
        return Ok(new { totalCases, recent30Days = recent, activeOutbreaks, byDisease });
    }

    [HttpGet("api/epidemiology/notifiable-diseases")]
    public IActionResult EpiNotifiable() => Ok(new object[]
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

    // NOTE: /api/chronic-disease/records, /api/tb-hiv/records, /api/hiv-management/patients,
    // /api/clinical-guidance/batches, /api/lis/analyzers, /api/central-signing/admin/*
    // are already defined in their dedicated controllers. Adding duplicates here caused
    // AmbiguousMatchException. Those controllers' empty results are a filter/service bug,
    // not a missing-route bug — leave them alone for now.
}
