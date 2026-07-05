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

    public async Task<ServiceOutcome> HPDashboardAsync()
    {
        var today = DateTime.UtcNow.Date;
        var salesToday = await _db.Prescriptions.Where(p => p.CreatedAt >= today).CountAsync();
        var stockItems = await _db.Medicines.CountAsync();
        return ServiceOutcome.Ok(new
        {
            salesToday,
            stockItems,
            lowStock = 3,
            revenueToday = await _db.Receipts.Where(r => r.CreatedAt >= today).SumAsync(r => (decimal?)r.FinalAmount) ?? 0
        });
    }

    public async Task<ServiceOutcome> HPStockAsync(int pageSize)
    {
        var items = await _db.Medicines.OrderBy(m => m.MedicineName).Take(pageSize)
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.Unit, m.UnitPrice, m.ServicePrice })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
    }

    public async Task<ServiceOutcome> HPRevenueAsync()
    {
        var from = DateTime.UtcNow.Date.AddDays(-30);
        var rows = await _db.Receipts.Where(r => r.CreatedAt >= from)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new { date = g.Key, total = g.Sum(x => x.FinalAmount) })
            .OrderBy(x => x.date).ToListAsync();
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
                e.Id, e.EmployeeName, e.EmployeeCode, e.CompanyName,
                e.Department, e.JobTitle, e.HazardExposure, e.ExposureYears,
                e.ExamType, e.ExamDate, e.OccupationalDisease, e.Classification
            })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
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
                d.OnsetDate, d.ReportDate, d.Status, d.Outcome, d.ContactCount
            })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
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
        return ServiceOutcome.Ok(new { totalCases, recent30Days = recent, activeOutbreaks, byDisease });
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
}
