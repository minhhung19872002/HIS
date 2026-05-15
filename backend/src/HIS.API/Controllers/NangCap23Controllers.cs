using System.Security.Claims;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

// ============================================================================
// Batch 1.1: National Prescription Gateway
// ============================================================================

[ApiController]
[Route("api/national-prescription-gateway")]
[Authorize]
public class NationalPrescriptionGatewayController : ControllerBase
{
    private readonly INationalPrescriptionGatewayService _svc;
    public NationalPrescriptionGatewayController(INationalPrescriptionGatewayService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<List<NationalPrescriptionSubmissionDto>>> Search(
        [FromQuery] string? keyword, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchAsync(keyword, status, from, to, pageIndex, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NationalPrescriptionSubmissionDetailDto>> Get(Guid id)
    {
        var r = await _svc.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("submit")]
    public async Task<ActionResult<NationalPrescriptionSubmissionDto>> Submit([FromBody] SubmitNationalPrescriptionDto dto)
        => Ok(await _svc.SubmitAsync(dto, UserId()));

    [HttpPost("{id:guid}/retry")]
    public async Task<ActionResult<NationalPrescriptionSubmissionDto>> Retry(Guid id)
    {
        var r = await _svc.RetryAsync(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<NationalPrescriptionSubmissionDto>> Cancel(Guid id)
    {
        var r = await _svc.CancelAsync(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    [HttpGet("config")]
    public async Task<ActionResult<NationalGatewayConfigDto>> GetConfig()
        => Ok(await _svc.GetConfigAsync());

    [HttpPost("config")]
    public async Task<ActionResult<object>> SaveConfig([FromBody] NationalGatewayConfigDto dto)
        => Ok(new { success = await _svc.SaveConfigAsync(dto, UserId()) });

    [HttpGet("test-connection")]
    public async Task<ActionResult<object>> TestConnection()
        => Ok(new { connected = await _svc.TestConnectionAsync() });
}

// ============================================================================
// Batch 1.2: National Pharmacy Gateway
// ============================================================================

[ApiController]
[Route("api/national-pharmacy")]
[Authorize]
public class NationalPharmacyController : ControllerBase
{
    private readonly INationalPharmacyGatewayService _svc;
    public NationalPharmacyController(INationalPharmacyGatewayService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<List<NationalPharmacyOutboundReportDto>>> Search(
        [FromQuery] string? reportType, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchAsync(reportType, status, from, to, pageIndex, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NationalPharmacyOutboundReportDetailDto>> Get(Guid id)
    {
        var r = await _svc.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("generate")]
    public async Task<ActionResult<NationalPharmacyOutboundReportDto>> Generate([FromBody] GeneratePharmacyReportDto dto)
        => Ok(await _svc.GenerateAndSubmitAsync(dto, UserId()));

    [HttpPost("{id:guid}/retry")]
    public async Task<ActionResult<NationalPharmacyOutboundReportDto>> Retry(Guid id)
    {
        var r = await _svc.RetryAsync(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    [HttpGet("test-connection")]
    public async Task<ActionResult<object>> TestConnection()
        => Ok(new { connected = await _svc.TestConnectionAsync() });
}

// ============================================================================
// Batch 2: Đề án 06 Certificate Controller
// ============================================================================

[ApiController]
[Route("api/de-an-06")]
[Authorize]
public class DeAn06Controller : ControllerBase
{
    private readonly IDeAn06CertificateService _svc;
    public DeAn06Controller(IDeAn06CertificateService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    // ---- Birth Certificates ----

    [HttpGet("birth-certificates")]
    public async Task<ActionResult<List<BirthCertificateDto>>> SearchBirths(
        [FromQuery] string? keyword, [FromQuery] int? da06Status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchBirthCertificatesAsync(keyword, da06Status, from, to, pageIndex, pageSize));

    [HttpGet("birth-certificates/{id:guid}")]
    public async Task<ActionResult<BirthCertificateDto>> GetBirth(Guid id)
    {
        var r = await _svc.GetBirthCertificateAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("birth-certificates")]
    public async Task<ActionResult<BirthCertificateDto>> SaveBirth([FromBody] SaveBirthCertificateDto dto)
        => Ok(await _svc.SaveBirthCertificateAsync(dto, UserId()));

    [HttpPost("birth-certificates/{id:guid}/submit")]
    public async Task<ActionResult<BirthCertificateDto>> SubmitBirth(Guid id)
    {
        var r = await _svc.SubmitBirthCertificateToDa06Async(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    // ---- Death Certificates ----

    [HttpGet("death-certificates")]
    public async Task<ActionResult<List<DeathCertificateDto>>> SearchDeaths(
        [FromQuery] string? keyword, [FromQuery] int? da06Status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchDeathCertificatesAsync(keyword, da06Status, from, to, pageIndex, pageSize));

    [HttpGet("death-certificates/{id:guid}")]
    public async Task<ActionResult<DeathCertificateDto>> GetDeath(Guid id)
    {
        var r = await _svc.GetDeathCertificateAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("death-certificates")]
    public async Task<ActionResult<DeathCertificateDto>> SaveDeath([FromBody] SaveDeathCertificateDto dto)
        => Ok(await _svc.SaveDeathCertificateAsync(dto, UserId()));

    [HttpPost("death-certificates/{id:guid}/submit")]
    public async Task<ActionResult<DeathCertificateDto>> SubmitDeath(Guid id)
    {
        var r = await _svc.SubmitDeathCertificateToDa06Async(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    // ---- Driving License Health Checks ----

    [HttpGet("driving-license-checks")]
    public async Task<ActionResult<List<DrivingLicenseHealthCheckDto>>> SearchDlhc(
        [FromQuery] string? keyword, [FromQuery] int? da06Status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchDrivingLicenseChecksAsync(keyword, da06Status, from, to, pageIndex, pageSize));

    [HttpGet("driving-license-checks/{id:guid}")]
    public async Task<ActionResult<DrivingLicenseHealthCheckDto>> GetDlhc(Guid id)
    {
        var r = await _svc.GetDrivingLicenseCheckAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("driving-license-checks")]
    public async Task<ActionResult<DrivingLicenseHealthCheckDto>> SaveDlhc([FromBody] SaveDrivingLicenseHealthCheckDto dto)
        => Ok(await _svc.SaveDrivingLicenseCheckAsync(dto, UserId()));

    [HttpPost("driving-license-checks/{id:guid}/submit")]
    public async Task<ActionResult<DrivingLicenseHealthCheckDto>> SubmitDlhc(Guid id)
    {
        var r = await _svc.SubmitDrivingLicenseCheckToDa06Async(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }
}

// ============================================================================
// Batch 3.1: Linen Management Controller
// ============================================================================

[ApiController]
[Route("api/linen")]
[Authorize]
public class LinenManagementController : ControllerBase
{
    private readonly ILinenManagementService _svc;
    public LinenManagementController(ILinenManagementService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    // ---- Items ----

    [HttpGet("items")]
    public async Task<ActionResult<List<LinenItemDto>>> ListItems(
        [FromQuery] string? keyword, [FromQuery] string? category, [FromQuery] bool? isActive)
        => Ok(await _svc.ListLinenItemsAsync(keyword, category, isActive));

    [HttpGet("items/{id:guid}")]
    public async Task<ActionResult<LinenItemDto>> GetItem(Guid id)
    {
        var r = await _svc.GetLinenItemAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("items")]
    public async Task<ActionResult<LinenItemDto>> SaveItem([FromBody] LinenItemDto dto)
        => Ok(await _svc.SaveLinenItemAsync(dto, UserId()));

    [HttpDelete("items/{id:guid}")]
    public async Task<ActionResult<object>> DeleteItem(Guid id)
        => Ok(new { success = await _svc.DeleteLinenItemAsync(id, UserId()) });

    // ---- Transactions ----

    [HttpGet("transactions")]
    public async Task<ActionResult<List<LinenTransactionDto>>> SearchTransactions(
        [FromQuery] string? transactionType, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchTransactionsAsync(transactionType, status, from, to, pageIndex, pageSize));

    [HttpGet("transactions/{id:guid}")]
    public async Task<ActionResult<LinenTransactionDto>> GetTransaction(Guid id)
    {
        var r = await _svc.GetTransactionAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("transactions")]
    public async Task<ActionResult<LinenTransactionDto>> SaveTransaction([FromBody] SaveLinenTransactionDto dto)
        => Ok(await _svc.SaveTransactionAsync(dto, UserId()));

    [HttpPost("transactions/{id:guid}/status/{newStatus:int}")]
    public async Task<ActionResult<LinenTransactionDto>> UpdateTransactionStatus(Guid id, int newStatus)
    {
        var r = await _svc.UpdateTransactionStatusAsync(id, newStatus, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    // ---- Sterilization Schedules ----

    [HttpGet("sterilization-schedules")]
    public async Task<ActionResult<List<SterilizationScheduleDto>>> SearchSchedules(
        [FromQuery] string? areaType, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => Ok(await _svc.SearchSchedulesAsync(areaType, status, from, to));

    [HttpGet("sterilization-schedules/{id:guid}")]
    public async Task<ActionResult<SterilizationScheduleDto>> GetSchedule(Guid id)
    {
        var r = await _svc.GetScheduleAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("sterilization-schedules")]
    public async Task<ActionResult<SterilizationScheduleDto>> SaveSchedule([FromBody] SaveSterilizationScheduleDto dto)
        => Ok(await _svc.SaveScheduleAsync(dto, UserId()));

    [HttpPost("sterilization-schedules/{id:guid}/status/{newStatus:int}")]
    public async Task<ActionResult<SterilizationScheduleDto>> UpdateScheduleStatus(
        Guid id, int newStatus, [FromQuery] string? cultureResult = null)
    {
        var r = await _svc.UpdateScheduleStatusAsync(id, newStatus, cultureResult, UserId());
        return r == null ? NotFound() : Ok(r);
    }
}

// ============================================================================
// Batch 3.2: Functional Diagnostics Controller
// ============================================================================

[ApiController]
[Route("api/functional-diagnostics")]
[Authorize]
public class FunctionalDiagnosticsController : ControllerBase
{
    private readonly IFunctionalDiagnosticsService _svc;
    public FunctionalDiagnosticsController(IFunctionalDiagnosticsService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<List<FunctionalDiagnosticTestDto>>> Search(
        [FromQuery] string? keyword, [FromQuery] string? testType, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchAsync(keyword, testType, status, from, to, pageIndex, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FunctionalDiagnosticTestDto>> Get(Guid id)
    {
        var r = await _svc.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost]
    public async Task<ActionResult<FunctionalDiagnosticTestDto>> Save([FromBody] SaveFunctionalDiagnosticTestDto dto)
        => Ok(await _svc.SaveAsync(dto, UserId()));

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<FunctionalDiagnosticTestDto>> Complete(Guid id)
    {
        var r = await _svc.CompleteAsync(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<ActionResult<FunctionalDiagnosticTestDto>> Verify(Guid id)
    {
        var r = await _svc.VerifyAsync(id, UserId());
        return r == null ? NotFound() : Ok(r);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<object>> Delete(Guid id)
        => Ok(new { success = await _svc.DeleteAsync(id, UserId()) });

    [HttpGet("test-types")]
    [AllowAnonymous]
    public ActionResult<List<object>> GetTestTypes() => Ok(new List<object>
    {
        new { code = "ECG", name = "Điện tim thường quy" },
        new { code = "ECGStress", name = "Điện tim gắng sức" },
        new { code = "Endoscopy", name = "Nội soi" },
        new { code = "BoneDensity", name = "Đo loãng xương" },
        new { code = "EEG", name = "Điện não" },
        new { code = "EMG", name = "Điện cơ" },
        new { code = "Spirometry", name = "Đo chức năng hô hấp" },
        new { code = "Audiometry", name = "Đo thính lực" }
    });
}

// ============================================================================
// Batch 4.1: Zalo Notification Controller
// ============================================================================

[ApiController]
[Route("api/zalo-notification")]
[Authorize]
public class ZaloNotificationController : ControllerBase
{
    private readonly IZaloNotificationService _svc;
    public ZaloNotificationController(IZaloNotificationService svc) { _svc = svc; }

    private string? UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<List<ZaloNotificationLogDto>>> Search(
        [FromQuery] string? keyword, [FromQuery] int? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 50)
        => Ok(await _svc.SearchLogsAsync(keyword, status, from, to, pageIndex, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ZaloNotificationLogDto>> Get(Guid id)
    {
        var r = await _svc.GetLogAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost("send")]
    public async Task<ActionResult<ZaloNotificationLogDto>> Send([FromBody] SendZaloMessageDto dto)
        => Ok(await _svc.SendAsync(dto, UserId()));

    [HttpGet("config")]
    public async Task<ActionResult<ZaloConfigDto>> GetConfig()
        => Ok(await _svc.GetConfigAsync());

    [HttpPost("config")]
    public async Task<ActionResult<object>> SaveConfig([FromBody] ZaloConfigDto dto)
        => Ok(new { success = await _svc.SaveConfigAsync(dto, UserId()) });

    [HttpGet("test-connection")]
    public async Task<ActionResult<object>> TestConnection()
        => Ok(new { connected = await _svc.TestConnectionAsync() });

    [HttpGet("templates")]
    [AllowAnonymous]
    public ActionResult<List<object>> GetTemplates() => Ok(new List<object>
    {
        new { id = "appointment_reminder", name = "Nhắc lịch tái khám", params_ = new[] { "patient_name", "appointment_date", "doctor_name" } },
        new { id = "lab_result_ready", name = "Kết quả XN sẵn sàng", params_ = new[] { "patient_name", "result_url" } },
        new { id = "prescription_dispense", name = "Đơn thuốc đã có", params_ = new[] { "patient_name", "prescription_code" } },
        new { id = "medicine_reminder", name = "Nhắc uống thuốc", params_ = new[] { "patient_name", "medicine_name", "dosage" } }
    });
}

// ============================================================================
// Batch 4.2: Quality Dashboard Controller
// ============================================================================

[ApiController]
[Route("api/quality-dashboard")]
[Authorize]
public class QualityDashboardController : ControllerBase
{
    private readonly IQualityDashboardService _svc;
    public QualityDashboardController(IQualityDashboardService svc) { _svc = svc; }

    [HttpGet]
    public async Task<ActionResult<QualityDashboardDto>> GetFull([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetFullDashboardAsync(asOfDate));

    [HttpGet("clinic-queues")]
    public async Task<ActionResult<List<ClinicQueueViewDto>>> GetClinicQueues([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetClinicQueuesAsync(asOfDate));

    [HttpGet("inpatient-by-dept")]
    public async Task<ActionResult<List<InpatientDepartmentViewDto>>> GetInpatientByDept([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetInpatientByDepartmentAsync(asOfDate));

    [HttpGet("paraclinical")]
    public async Task<ActionResult<ParaclinicalStatusViewDto>> GetParaclinical([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetParaclinicalStatusAsync(asOfDate));

    [HttpGet("lab")]
    public async Task<ActionResult<LabStatusViewDto>> GetLab([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetLabStatusAsync(asOfDate));

    [HttpGet("revenue")]
    public async Task<ActionResult<DailyRevenueViewDto>> GetRevenue([FromQuery] DateTime? asOfDate = null)
        => Ok(await _svc.GetDailyRevenueAsync(asOfDate));
}
