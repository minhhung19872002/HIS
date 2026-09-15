using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Aliases cho các endpoint frontend gọi nhưng chưa có hoặc phân tán.
/// Logic tách khỏi FrontendCompatController (#202 thin-controller).
/// [AllowAnonymous] — không cần userId.
/// </summary>
public interface IFrontendCompatService
{
    // ---- Hospital Pharmacy ----
    Task<ServiceOutcome> HPDashboardAsync();
    /// <summary>Tồn nhà thuốc theo thuốc (page 0-based). QA0915: trước đây trả danh mục không có số tồn.</summary>
    Task<ServiceOutcome> HPStockAsync(string? keyword, int page, int pageSize);
    /// <summary>Doanh thu bán lẻ nhà thuốc theo ngày VN. QA0915: trước đây cộng mọi phiếu thu của viện, chỉ {date,total}.</summary>
    Task<ServiceOutcome> HPRevenueAsync(DateTime? fromDate, DateTime? toDate);

    // ---- Insurance XML ----
    Task<ServiceOutcome> InsuranceXmlClaimsAsync(int pageSize);

    // ---- Occupational Health ----
    Task<ServiceOutcome> OHExamsAsync(int pageSize);
    /// <summary>Dữ liệu tĩnh — đồng bộ, không cần DB.</summary>
    ServiceOutcome OHHazardTypes();

    // ---- School Health ----
    Task<ServiceOutcome> SHSchoolsAsync();
    Task<ServiceOutcome> SHExamsAsync(int pageSize);

    // ---- Epidemiology ----
    Task<ServiceOutcome> EpiReportsAsync(int pageSize);
    Task<ServiceOutcome> EpiStatisticsAsync();
    /// <summary>Dữ liệu tĩnh — đồng bộ, không cần DB.</summary>
    ServiceOutcome EpiNotifiable();

    // ---- RIS admin (v2 RisAdmin.tsx): areas / folders / hospital-config / dispatch stats ----
    /// <summary>Khu vực / chi nhánh RIS — backed by HospitalBranches.</summary>
    Task<ServiceOutcome> RisAreasAsync();
    Task<ServiceOutcome> RisSaveAreaAsync(RisAreaSaveDto dto, string? userId);
    /// <summary>Thư mục cấp 2 RIS — stored as JSON rows in SystemConfigs (key prefix "RIS.Folder.").</summary>
    Task<ServiceOutcome> RisFoldersAsync();
    Task<ServiceOutcome> RisSaveFolderAsync(RisFolderSaveDto dto, string? userId);
    /// <summary>Cấu hình bệnh viện (header/footer phiếu KQ) — SystemConfigs keys "Hospital.*".</summary>
    Task<ServiceOutcome> HospitalConfigAsync();
    Task<ServiceOutcome> SaveHospitalConfigAsync(HospitalConfigDto dto, string? userId);
    /// <summary>Thống kê CĐHA [{label,value}] trong khoảng ngày — RadiologyRequests/Reports/Consultation.</summary>
    Task<ServiceOutcome> RadiologyDispatchStatsAsync(DateTime? fromDate, DateTime? toDate);

    // ---- School Health (v2 SchoolHealth.tsx contract: SchoolExam / School) ----
    /// <summary>Phiếu khám học sinh theo shape FE; lọc schoolCode (mã hoặc tên trường) / academicYear / grade / keyword.</summary>
    Task<ServiceOutcome> SHExamsV2Async(string? keyword, string? schoolCode, string? academicYear, string? grade, int pageSize);
    /// <summary>Danh sách trường [{code,name,address,type,studentCount}] — code = SchoolCode ?? SchoolName.</summary>
    Task<ServiceOutcome> SHSchoolsV2Async();
    Task<ServiceOutcome> SHSaveExamAsync(Guid? id, SchoolExamSaveDto dto, string? userId);

    // ---- Equipment (v2 Equipment.tsx) ----
    /// <summary>Danh mục loại thiết bị [{code,name,isActive}] — chuẩn + các Category đang có trong MedicalEquipments.</summary>
    Task<ServiceOutcome> EquipmentCategoriesAsync();
}

/// <summary>Payload of v2 SchoolHealth.tsx EXAM_FIELDS (POST/PUT /api/school-health/exams).</summary>
public class SchoolExamSaveDto
{
    public string StudentName { get; set; } = string.Empty;
    public string? StudentCode { get; set; }
    /// <summary>1=Nam, 2=Nữ</summary>
    public int? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? ExamDate { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolCode { get; set; }
    public string? Grade { get; set; }
    public string? ClassName { get; set; }
    public string? AcademicYear { get; set; }
    public double? Height { get; set; }
    public double? Weight { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? NutritionStatus { get; set; }
    public bool? VisionFlag { get; set; }
    public bool? HearingFlag { get; set; }
    public bool? DentalFlag { get; set; }
    public bool? ScoliosisFlag { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendations { get; set; }
    public string? ExamDoctor { get; set; }
    public int? Status { get; set; }
}

public class RisAreaSaveDto
{
    public Guid? Id { get; set; }
    public string AreaCode { get; set; } = string.Empty;
    public string AreaName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool? IsActive { get; set; }
}

public class RisFolderSaveDto
{
    public Guid? Id { get; set; }
    public string FolderName { get; set; } = string.Empty;
    /// <summary>1=Normal, 2=Share (STT 900), 3=Upload (STT 950)</summary>
    public int FolderType { get; set; } = 1;
    public int? SortOrder { get; set; }
    public string? AreaName { get; set; }
}

public class HospitalConfigDto
{
    public string? HospitalName { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? LogoUrl { get; set; }
    public string? ReportFooter { get; set; }
}
