namespace HIS.Application.Services;

// #365 [REFAC-3][P3]: thin 3 DEV/SEED controllers (DailySeedController, PopulateDataController,
// DevLinkRadiologyController) so they no longer inject HISDbContext directly — logic moved
// verbatim into HIS.Infrastructure.Services.DevData.*ServiceImpl. Dev/seed-only surface (not a
// prod business path, gated by [DevelopmentOnly]/[AllowAnonymous] on the controllers), but the
// build must stay clean per Clean Architecture (HIS.API -> HIS.Application <- HIS.Infrastructure).

/// <summary>
/// Daily-seed logic previously on DailySeedController. Generates fake patient registrations
/// with CreatedAt=today so Reception page always shows activity.
/// </summary>
public interface IDailySeedService
{
    /// <summary>
    /// Core daily-seed logic, callable in-process (e.g. by DailyDemoSeedWorker) without an
    /// HttpContext. Returns the seed summary object, or <c>null</c> when there are no active
    /// examination rooms to attach today's medical records to.
    /// </summary>
    Task<object?> RunDailySeedAsync(int count = 30, bool purge = false);
}

/// <summary>
/// One-shot admin data population previously on PopulateDataController (+ its partial-class
/// files Clinical/Finishing/LabBlood/MedinetExtras/PublicHealth/Orchestrator). Fills empty
/// tables with realistic operational data for demo; each method is idempotent (no-ops if its
/// target tables already have rows). Return type is <see cref="object"/> because each method
/// returns the same anonymous `{ module, inserted }`-shaped DTO the controller action used to
/// wrap in <c>Ok(...)</c>.
/// </summary>
public interface IPopulateDataService
{
    Task<object> PopulateInfectionControlAsync();
    Task<object> PopulatePatientPortalAsync();
    Task<object> PopulateEquipmentAsync();
    Task<object> PopulatePathologyAsync();
    Task<object> PopulateQualityAsync();
    Task<object> PopulateRehabSessionsAsync();
    Task<object> PopulateTeleSessionsAsync();
    Task<object> PopulateDietOrdersAsync();
    Task<object> PopulatePrereqsAsync();
    Task<object> PopulateBloodBankAsync();
    Task<object> PopulateCultureStockAsync();
    Task<object> PopulateLabQCAsync();
    Task<object> PopulateFinishingAsync();
    Task<object> PopulateMedinetExtrasAsync();
    Task<object> PopulatePublicHealthAsync();
    Task<object> PopulateMethadoneAsync();
    Task<object> PopulateMCIAsync();
    Task<object> PopulateCMEAsync();

    /// <summary>Runs every Populate*Async module in sequence (previously PopulateAll).</summary>
    Task<object> PopulateAllAsync();
}

/// <summary>
/// DEV helper previously on DevLinkRadiologyController: links today's RadiologyRequests with
/// real Orthanc StudyInstanceUIDs so the worklist page shows "has images".
/// </summary>
public interface IDevLinkRadiologyService
{
    Task<DevActionResult> LinkTodayAsync();
}

/// <summary>
/// Lightweight (statusCode, body) pair standing in for ControllerBase's Ok()/BadRequest()
/// inside DevLinkRadiologyServiceImpl, so the thinned controller can replay the exact status
/// code the moved-verbatim logic decides on (200 success / 400 business-error) without the
/// service layer depending on ASP.NET Core MVC types.
/// </summary>
public sealed record DevActionResult(int StatusCode, object Body);

/// <summary>
/// Success-path payload of <see cref="IDevLinkRadiologyService.LinkTodayAsync"/>. Same field
/// names as the API-layer <c>HIS.API.Dtos.DevLinkRadiology.LinkResult</c> record (which stays
/// in HIS.API — HIS.Infrastructure cannot reference it) so the controller can rebuild an
/// identical response without a <c>dynamic</c> cast across the assembly boundary.
/// </summary>
public sealed record DevLinkRadiologyResult(int RequestsUpdated, int ExamsCreated, int StudiesCreated, List<string> OrthancUIDs);
