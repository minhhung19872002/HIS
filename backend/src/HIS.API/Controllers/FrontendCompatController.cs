using HIS.API.Extensions;
using HIS.Application.Interfaces;
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
    [HttpGet("api/hospital-pharmacy/dashboard")]
    public async Task<IActionResult> HPDashboard()
        => (await _svc.HPDashboardAsync()).ToActionResult();

    [HttpGet("api/hospital-pharmacy/stock")]
    public async Task<IActionResult> HPStock([FromQuery] int pageSize = 50)
        => (await _svc.HPStockAsync(pageSize)).ToActionResult();

    [HttpGet("api/hospital-pharmacy/revenue")]
    public async Task<IActionResult> HPRevenue()
        => (await _svc.HPRevenueAsync()).ToActionResult();

    // ---- Insurance XML / BHXH Audit ----
    [HttpGet("api/insurance-xml/claims/search")]
    public async Task<IActionResult> InsuranceXmlClaims([FromQuery] int pageSize = 50)
        => (await _svc.InsuranceXmlClaimsAsync(pageSize)).ToActionResult();

    // ---- Occupational Health: /exams /hazard-types ----
    [HttpGet("api/occupational-health/exams")]
    public async Task<IActionResult> OHExams([FromQuery] int pageSize = 50)
        => (await _svc.OHExamsAsync(pageSize)).ToActionResult();

    [HttpGet("api/occupational-health/hazard-types")]
    public IActionResult OHHazardTypes()
        => _svc.OHHazardTypes().ToActionResult();

    // ---- School Health: /schools /exams ----
    [HttpGet("api/school-health/schools")]
    public async Task<IActionResult> SHSchools()
        => (await _svc.SHSchoolsAsync()).ToActionResult();

    [HttpGet("api/school-health/exams")]
    public async Task<IActionResult> SHExams([FromQuery] int pageSize = 100)
        => (await _svc.SHExamsAsync(pageSize)).ToActionResult();

    // ---- Epidemiology: /reports /statistics /notifiable-diseases ----
    [HttpGet("api/epidemiology/reports")]
    public async Task<IActionResult> EpiReports([FromQuery] int pageSize = 50)
        => (await _svc.EpiReportsAsync(pageSize)).ToActionResult();

    [HttpGet("api/epidemiology/statistics")]
    public async Task<IActionResult> EpiStatistics()
        => (await _svc.EpiStatisticsAsync()).ToActionResult();

    [HttpGet("api/epidemiology/notifiable-diseases")]
    public IActionResult EpiNotifiable()
        => _svc.EpiNotifiable().ToActionResult();

    // NOTE: /api/chronic-disease/records, /api/tb-hiv/records, /api/hiv-management/patients,
    // /api/clinical-guidance/batches, /api/lis/analyzers, /api/central-signing/admin/*
    // are already defined in their dedicated controllers. Adding duplicates here caused
    // AmbiguousMatchException. Those controllers' empty results are a filter/service bug,
    // not a missing-route bug — leave them alone for now.
}
