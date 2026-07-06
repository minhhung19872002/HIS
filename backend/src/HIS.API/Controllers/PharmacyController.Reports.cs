using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Dtos.Pharmacy;

namespace HIS.API.Controllers;

public partial class PharmacyController
{
    // ==================== 9. Hủy đơn đã phát → hoàn tồn kho ====================

    [HttpGet("clinical-reviews")]
    public IActionResult GetClinicalReviews()
    {
        // Optional feature: keep the endpoint available even if no dedicated review workflow exists yet.
        return Ok(Array.Empty<object>());
    }

    [HttpGet("adr-reports")]
    public async Task<IActionResult> GetAdrReports()
    {
        try
        {
            return Ok(await _pharmacyService.GetAdrReportsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching ADR reports");
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("adr-reports")]
    public async Task<IActionResult> CreateAdrReport([FromBody] CreateAdrReportRequest request)
    {
        try
        {
            var userIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid? userId = Guid.TryParse(userIdValue, out var parsedUserId) ? parsedUserId : null;

            var record = await _pharmacyService.CreateAdrReportAsync(
                request.OnsetDate, request.Description, request.ReactionType,
                request.MedicationName, request.Outcome, userId);

            return Ok(new
            {
                id = record.Id.ToString(),
                patientName = request.PatientName ?? "",
                patientCode = request.PatientCode ?? "",
                medicationName = record.MedicineName ?? "",
                reactionType = request.ReactionType ?? "",
                severity = string.IsNullOrWhiteSpace(request.Severity) ? "moderate" : request.Severity,
                onsetDate = record.RecordDate,
                reportedBy = User.Identity?.Name ?? "",
                description = record.Description ?? "",
                outcome = record.ActionTaken ?? "",
                status = "reported",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ADR report");
            return StatusCode(500, new { message = "Lá»—i khi táº¡o bÃ¡o cÃ¡o ADR" });
        }
    }

    [HttpPost("cancel-dispensed/{prescriptionId}")]
    public async Task<IActionResult> CancelDispensedPrescription(Guid prescriptionId, [FromBody] CancelDispenseRequest request)
    {
        try
        {
            var userId = CurrentUserId();
            var result = await _pharmacyService.CancelDispensedPrescriptionAsync(prescriptionId, request.Reason ?? "Hủy đơn", userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling dispensed prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi hủy đơn thuốc" });
        }
    }

    // ==================== 10. Tạo billing sau phát thuốc ====================

    [HttpPost("create-billing/{issueId}")]
    public async Task<IActionResult> CreateBillingAfterDispensing(Guid issueId)
    {
        try
        {
            var userId = CurrentUserId();
            var result = await _pharmacyService.CreateBillingAfterDispensingAsync(issueId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating billing for issue {Id}", issueId);
            return StatusCode(500, new { message = "Lỗi khi tạo thanh toán" });
        }
    }

    // ==================== Drug Label Print ====================

    /// <summary>
    /// In nhãn thuốc cho từng chi tiết đơn thuốc (trả HTML để FE in trực tiếp hoặc mở cửa sổ in)
    /// </summary>
    [HttpGet("prescriptions/{prescriptionId}/print-drug-label")]
    public async Task<IActionResult> PrintDrugLabel(Guid prescriptionId)
    {
        try
        {
            var html = await _pharmacyService.PrintDrugLabelAsync(prescriptionId);
            if (html == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });
            return Content(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error printing drug label for prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi in nhãn thuốc" });
        }
    }
}
