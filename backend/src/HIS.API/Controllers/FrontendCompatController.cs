using System.Security.Claims;
using HIS.API.Authorization;
using HIS.API.Extensions;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Aliases for endpoints the frontend calls that are missing or split across
/// other controllers. Each returns data straight from the DbContext — no
/// business logic — so the UI stops showing "empty" for seeded tables.
/// </summary>
[ApiController]
public class FrontendCompatController : ControllerBase
{
    private readonly IFrontendCompatService _svc;
    public FrontendCompatController(IFrontendCompatService svc) { _svc = svc; }

    // ---- Hospital Pharmacy: /dashboard, /stock, /revenue ----
    // QA0915: pharmacy revenue/stock are business data — require an authenticated user (FE always sends JWT).
    [HttpGet("api/hospital-pharmacy/dashboard")]
    [Authorize]
    public async Task<IActionResult> HPDashboard()
        => (await _svc.HPDashboardAsync()).ToActionResult();

    [HttpGet("api/hospital-pharmacy/stock")]
    [Authorize]
    public async Task<IActionResult> HPStock([FromQuery] string? keyword = null, [FromQuery] int page = 0, [FromQuery] int pageSize = 50)
        => (await _svc.HPStockAsync(keyword, page, pageSize)).ToActionResult();

    [HttpGet("api/hospital-pharmacy/revenue")]
    [Authorize]
    public async Task<IActionResult> HPRevenue([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        => (await _svc.HPRevenueAsync(fromDate, toDate)).ToActionResult();

    // ---- Insurance XML / BHXH Audit ----
    [HttpGet("api/insurance-xml/claims/search")]
    public async Task<IActionResult> InsuranceXmlClaims([FromQuery] int pageSize = 50)
        => (await _svc.InsuranceXmlClaimsAsync(pageSize)).ToActionResult();

    // ---- Occupational Health: /exams /hazard-types ----
    // QA-R2: default 50 silently truncated the v2 list (it filters client-side and never pages).
    [HttpGet("api/occupational-health/exams")]
    public async Task<IActionResult> OHExams([FromQuery] int pageSize = 500)
        => (await _svc.OHExamsAsync(pageSize)).ToActionResult();

    // QA-R2: v2 OccupationalHealth.tsx create/update were 405/404.
    [HttpPost("api/occupational-health/exams")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> OHCreateExam([FromBody] OccExamSaveDto dto)
        => (await _svc.OHSaveExamAsync(null, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpPut("api/occupational-health/exams/{id:guid}")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> OHUpdateExam(Guid id, [FromBody] OccExamSaveDto dto)
        => (await _svc.OHSaveExamAsync(id, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpGet("api/occupational-health/hazard-types")]
    public IActionResult OHHazardTypes()
        => _svc.OHHazardTypes().ToActionResult();

    // ---- School Health: /schools /exams ----
    // QA0915 wave 2: v2 SchoolHealth.tsx contract (SchoolExam/School shape) + filters that were ignored before.
    [HttpGet("api/school-health/schools")]
    public async Task<IActionResult> SHSchools()
        => (await _svc.SHSchoolsV2Async()).ToActionResult();

    [HttpGet("api/school-health/exams")]
    public async Task<IActionResult> SHExams([FromQuery] string? keyword = null, [FromQuery] string? schoolCode = null,
        [FromQuery] string? academicYear = null, [FromQuery] string? grade = null, [FromQuery] int pageSize = 500)
        => (await _svc.SHExamsV2Async(keyword, schoolCode, academicYear, grade, pageSize)).ToActionResult();

    [HttpPost("api/school-health/exams")]
    public async Task<IActionResult> SHCreateExam([FromBody] SchoolExamSaveDto dto)
        => (await _svc.SHSaveExamAsync(null, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpPut("api/school-health/exams/{id:guid}")]
    public async Task<IActionResult> SHUpdateExam(Guid id, [FromBody] SchoolExamSaveDto dto)
        => (await _svc.SHSaveExamAsync(id, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    // ---- Epidemiology: /reports /statistics /notifiable-diseases ----
    [HttpGet("api/epidemiology/reports")]
    public async Task<IActionResult> EpiReports([FromQuery] string? keyword = null, [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null, [FromQuery] int pageSize = 500)
        => (await _svc.EpiReportsAsync(keyword, fromDate, toDate, pageSize)).ToActionResult();

    // QA-R2: v2 Epidemiology.tsx create/update disease report + outbreak were 405/404; the outbreak list
    // read DiseaseCases groupings (EpidemiologyController) instead of OutbreakEvents, so a declared outbreak never showed.
    [HttpPost("api/epidemiology/reports")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> EpiCreateReport([FromBody] EpiReportSaveDto dto)
        => (await _svc.EpiSaveReportAsync(null, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpPut("api/epidemiology/reports/{id:guid}")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> EpiUpdateReport(Guid id, [FromBody] EpiReportSaveDto dto)
        => (await _svc.EpiSaveReportAsync(id, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpGet("api/epidemiology/outbreaks")]
    public async Task<IActionResult> EpiOutbreaks()
        => (await _svc.EpiOutbreaksAsync()).ToActionResult();

    [HttpPost("api/epidemiology/outbreaks")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> EpiCreateOutbreak([FromBody] EpiOutbreakSaveDto dto)
        => (await _svc.EpiSaveOutbreakAsync(null, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpPut("api/epidemiology/outbreaks/{id:guid}")]
    [RequirePermission(PermissionCatalog.PublicHealth.Update)]
    public async Task<IActionResult> EpiUpdateOutbreak(Guid id, [FromBody] EpiOutbreakSaveDto dto)
        => (await _svc.EpiSaveOutbreakAsync(id, dto, User.FindFirstValue(ClaimTypes.NameIdentifier))).ToActionResult();

    [HttpGet("api/epidemiology/statistics")]
    public async Task<IActionResult> EpiStatistics()
        => (await _svc.EpiStatisticsAsync()).ToActionResult();

    [HttpGet("api/epidemiology/notifiable-diseases")]
    public IActionResult EpiNotifiable()
        => _svc.EpiNotifiable().ToActionResult();

    // ---- RIS admin (v2 RisAdmin.tsx tabs Khu vực / Thư mục / Cấu hình BV / Thống kê) ----
    private string? CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet("api/ris-catalog/areas")]
    public async Task<IActionResult> RisAreas()
        => (await _svc.RisAreasAsync()).ToActionResult();

    [HttpPost("api/ris-catalog/areas")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> RisSaveArea([FromBody] RisAreaSaveDto dto)
        => (await _svc.RisSaveAreaAsync(dto, CurrentUserId)).ToActionResult();

    [HttpGet("api/ris-catalog/folders")]
    public async Task<IActionResult> RisFolders()
        => (await _svc.RisFoldersAsync()).ToActionResult();

    [HttpPost("api/ris-catalog/folders")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> RisSaveFolder([FromBody] RisFolderSaveDto dto)
        => (await _svc.RisSaveFolderAsync(dto, CurrentUserId)).ToActionResult();

    [HttpGet("api/admin/hospital-config")]
    public async Task<IActionResult> HospitalConfig()
        => (await _svc.HospitalConfigAsync()).ToActionResult();

    [HttpPost("api/admin/hospital-config")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> SaveHospitalConfig([FromBody] HospitalConfigDto dto)
        => (await _svc.SaveHospitalConfigAsync(dto, CurrentUserId)).ToActionResult();

    [HttpGet("api/radiology-dispatch/stats")]
    public async Task<IActionResult> RadiologyDispatchStats([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => (await _svc.RadiologyDispatchStatsAsync(fromDate, toDate)).ToActionResult();

    // ---- Equipment (v2 Equipment.tsx create modal) ----
    [HttpGet("api/equipment/categories")]
    public async Task<IActionResult> EquipmentCategories()
        => (await _svc.EquipmentCategoriesAsync()).ToActionResult();

    // NOTE: /api/chronic-disease/records, /api/tb-hiv/records, /api/hiv-management/patients,
    // /api/clinical-guidance/batches, /api/lis/analyzers, /api/central-signing/admin/*
    // are already defined in their dedicated controllers. Adding duplicates here caused
    // AmbiguousMatchException. Those controllers' empty results are a filter/service bug,
    // not a missing-route bug — leave them alone for now.
}
