using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Kết quả khám chữa bệnh ngoại trú — HSMT I.2 #5: lượt khám, xét nghiệm, chẩn đoán hình ảnh, thăm dò
/// chức năng, khám sức khoẻ hợp đồng, đơn thuốc.
///
/// <para><b>Chốt chặn quan trọng nhất của cả app nằm ở đây.</b> Token gửi sang HIS là tài khoản dịch
/// vụ, nên nó có quyền đọc hồ sơ của bất kỳ ai. Vì vậy id bệnh nhân LUÔN lấy từ tài khoản đang đăng
/// nhập và không bao giờ nhận từ yêu cầu; đồng thời id đó được gửi kèm sang HIS để HIS tự đối chiếu
/// chủ sở hữu của từng phiếu. Hai lớp, và lớp thứ hai không phụ thuộc vào việc BFF có nhớ kiểm hay
/// không.</para>
///
/// <para>Mỗi lần đọc dữ liệu y tế đều ghi nhật ký — để trả lời được câu "ai đã xem hồ sơ này".</para>
/// </summary>
[ApiController]
[Route("api/v1/patient/results")]
[Authorize]
[Produces("application/json")]
public class ResultsController : ControllerBase
{
    private readonly IHisConnector _his;
    private readonly PatientAppDbContext _db;
    private readonly ILogger<ResultsController> _logger;

    public ResultsController(IHisConnector his, PatientAppDbContext db, ILogger<ResultsController> logger)
    {
        _his = his;
        _db = db;
        _logger = logger;
    }

    // -------------------------------------------------------- lượt khám

    [HttpGet("visits")]
    public Task<IActionResult> Visits([FromQuery] int limit, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisVisitSummary>>("view_visits", null,
            async pid => await _his.GetVisitsAsync(pid, limit is > 0 and <= 50 ? limit : 20, ct), ct);

    // ------------------------------------------------------ xét nghiệm

    [HttpGet("lab")]
    public Task<IActionResult> LabResults(
        [FromQuery] Guid? visitId, [FromQuery] Guid? admissionId, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisLabResult>>("view_lab_results", null,
            async pid => await _his.GetLabResultsAsync(pid, visitId, admissionId, ct), ct);

    /// <summary>Chi tiết một phiếu xét nghiệm: từng chỉ số, khoảng tham chiếu, cờ bất thường.</summary>
    [HttpGet("lab/{resultId:guid}")]
    public Task<IActionResult> LabResult(Guid resultId, CancellationToken ct) =>
        ForPatient<HisLabResult>("view_lab_result", $"lab_result:{resultId}",
            pid => _his.GetLabResultAsync(pid, resultId, ct), ct);

    // -------------------------------------------------- chẩn đoán hình ảnh

    [HttpGet("imaging")]
    public Task<IActionResult> ImagingResults(
        [FromQuery] Guid? visitId, [FromQuery] Guid? admissionId, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisImagingResult>>("view_imaging_results", null,
            async pid => await _his.GetImagingResultsAsync(pid, visitId, admissionId, ct), ct);

    [HttpGet("imaging/{resultId:guid}")]
    public Task<IActionResult> ImagingResult(Guid resultId, CancellationToken ct) =>
        ForPatient<HisImagingResult>("view_imaging_result", $"imaging_result:{resultId}",
            pid => _his.GetImagingResultAsync(pid, resultId, ct), ct);

    /// <summary>Danh sách ảnh của một ca chụp, để app dựng khung xem ảnh.</summary>
    [HttpGet("imaging/{resultId:guid}/images")]
    public Task<IActionResult> ImagingInstances(Guid resultId, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisImagingInstance>>(
            "view_imaging_images", $"imaging_result:{resultId}",
            async pid => await _his.GetImagingInstancesAsync(pid, resultId, ct), ct);

    /// <summary>
    /// Một ảnh đã dựng. Trả thẳng byte ảnh chứ không trả URL PACS: địa chỉ và mật khẩu PACS không rời
    /// khỏi máy chủ, và app không cần biết bệnh viện đang dùng PACS nào.
    /// </summary>
    [HttpGet("imaging/{resultId:guid}/images/{instanceId}")]
    [Produces("image/png", "image/jpeg")]
    public async Task<IActionResult> ImagingInstanceImage(
        Guid resultId, string instanceId, [FromQuery] int width, CancellationToken ct)
    {
        var account = await CurrentAccountAsync(ct);
        if (account?.HisPatientId is null) return NotLinked();

        try
        {
            var image = await _his.GetImagingInstanceImageAsync(
                account.HisPatientId.Value, resultId, instanceId,
                width is > 0 and <= 2048 ? width : 1024, ct);

            if (image is null) return NotFound(ApiResponse.Fail("Không tìm thấy hình ảnh."));

            await AuditAsync(account, "view_imaging_image", $"imaging_result:{resultId}", ct);
            return File(image.Content, image.ContentType);
        }
        catch (HisConnectorException ex)
        {
            return Unavailable(ex);
        }
    }

    // -------------------------------------------------- thăm dò chức năng

    [HttpGet("functional")]
    public Task<IActionResult> FunctionalResults(
        [FromQuery] Guid? visitId, [FromQuery] Guid? admissionId, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisFunctionalResult>>("view_functional_results", null,
            async pid => await _his.GetFunctionalResultsAsync(pid, visitId, admissionId, ct), ct);

    [HttpGet("functional/{resultId:guid}")]
    public Task<IActionResult> FunctionalResult(Guid resultId, CancellationToken ct) =>
        ForPatient<HisFunctionalResult>("view_functional_result", $"functional_result:{resultId}",
            pid => _his.GetFunctionalResultAsync(pid, resultId, ct), ct);

    // ------------------------------------------ khám sức khoẻ hợp đồng

    [HttpGet("health-checkups")]
    public Task<IActionResult> HealthCheckups(CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisHealthCheckup>>("view_health_checkups", null,
            async pid => await _his.GetHealthCheckupsAsync(pid, ct), ct);

    // ---------------------------------------------------------- đơn thuốc

    [HttpGet("prescriptions")]
    public Task<IActionResult> Prescriptions([FromQuery] bool activeOnly, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisPrescription>>("view_prescriptions", null,
            async pid => await _his.GetPrescriptionsAsync(pid, activeOnly, ct), ct);

    // ------------------------------------------------------------ nội trú

    /// <summary>Các đợt nằm viện của người bệnh (HSMT I.2 #6).</summary>
    [HttpGet("admissions")]
    public Task<IActionResult> Admissions(CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisAdmission>>("view_admissions", null,
            async pid => await _his.GetAdmissionsAsync(pid, ct), ct);

    /// <summary>
    /// Bảng công khai thuốc của một đợt nội trú — mẫu 11D/BV-01/TT23 mà khoa dán ở đầu giường, nay
    /// người bệnh xem được trên điện thoại.
    /// </summary>
    [HttpGet("admissions/{admissionId:guid}/medicine-disclosure")]
    public Task<IActionResult> MedicineDisclosure(Guid admissionId, CancellationToken ct) =>
        ForPatient<HisMedicineDisclosure>(
            "view_medicine_disclosure", $"admission:{admissionId}",
            pid => _his.GetMedicineDisclosureAsync(pid, admissionId, ct), ct);

    /// <summary>Chỉ định cận lâm sàng của đợt nội trú, kèm số thứ tự thực hiện.</summary>
    [HttpGet("admissions/{admissionId:guid}/service-orders")]
    public Task<IActionResult> ServiceOrders(Guid admissionId, CancellationToken ct) =>
        ForPatient<IReadOnlyList<HisServiceOrder>>(
            "view_service_orders", $"admission:{admissionId}",
            async pid => await _his.GetServiceOrdersAsync(pid, admissionId, ct), ct);

    // ----------------------------------------------------------- nội bộ

    /// <summary>
    /// Khung chung cho mọi lời gọi đọc dữ liệu y tế: lấy hồ sơ từ tài khoản đăng nhập, gọi HIS, ghi
    /// nhật ký, và biến lỗi kết nối thành thông điệp người bệnh đọc được.
    ///
    /// Gom vào một chỗ để không thể quên bước nào — quên kiểm hồ sơ ở đúng một endpoint là đủ hỏng.
    /// </summary>
    private async Task<IActionResult> ForPatient<T>(
        string action, string? resourceRef, Func<Guid, Task<T?>> work, CancellationToken ct)
        where T : class
    {
        var account = await CurrentAccountAsync(ct);
        if (account?.HisPatientId is null) return NotLinked();

        try
        {
            var data = await work(account.HisPatientId.Value);
            if (data is null) return NotFound(ApiResponse.Fail("Không tìm thấy kết quả."));

            await AuditAsync(account, action, resourceRef, ct);
            return Ok(ApiResponse<T>.Ok(data));
        }
        catch (HisConnectorException ex)
        {
            return Unavailable(ex);
        }
    }

    private Task<AccountSnapshot?> CurrentAccountAsync(CancellationToken ct) =>
        _db.Accounts
            .Where(a => a.Id == User.GetAccountId())
            .Select(a => new AccountSnapshot(a.Id, a.HisPatientId))
            .FirstOrDefaultAsync(ct);

    private async Task AuditAsync(
        AccountSnapshot account, string action, string? resourceRef, CancellationToken ct)
    {
        if (account.HisPatientId is null) return;

        _db.AccessAuditLogs.Add(new AccessAuditLog
        {
            ActorAccountId = account.Id,
            ActorType = "patient",
            TargetPatientId = account.HisPatientId.Value,
            Action = action,
            ResourceRef = resourceRef,
            Ip = HttpContext.GetClientIp(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Chưa liên kết hồ sơ thì không có gì để xem — nhưng phải nói rõ vì sao và làm gì tiếp, thay vì
    /// một danh sách rỗng khiến người bệnh tưởng bệnh viện làm mất kết quả của mình.
    /// </summary>
    private IActionResult NotLinked() => StatusCode(StatusCodes.Status409Conflict, ApiResponse.Fail(
        "Tài khoản chưa được liên kết với hồ sơ bệnh án. Vui lòng liên kết hồ sơ để xem kết quả khám.",
        "PATIENT_NOT_LINKED"));

    private IActionResult Unavailable(HisConnectorException ex)
    {
        _logger.LogError(ex, "Không lấy được kết quả khám từ HIS.");
        return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
            "Hiện chưa kết nối được tới hệ thống bệnh viện. Vui lòng thử lại sau ít phút.",
            "HIS_UNAVAILABLE"));
    }

    private record AccountSnapshot(Guid Id, Guid? HisPatientId);
}
