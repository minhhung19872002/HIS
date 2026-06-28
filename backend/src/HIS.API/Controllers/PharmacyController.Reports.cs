using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
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
            var reports = await _context.PharmacyGppRecords
                .AsNoTracking()
                .Include(r => r.RecordedBy)
                .Where(r => !r.IsDeleted && r.RecordType == 1)
                .OrderByDescending(r => r.RecordDate)
                .Take(200)
                .Select(r => new
                {
                    id = r.Id.ToString(),
                    patientName = "",
                    patientCode = "",
                    medicationName = r.MedicineName ?? "",
                    reactionType = r.Description ?? "",
                    severity = "moderate",
                    onsetDate = r.RecordDate,
                    reportedBy = r.RecordedBy != null ? r.RecordedBy.FullName : "",
                    description = r.Description ?? "",
                    outcome = r.ActionTaken ?? "",
                    status = "reported",
                })
                .ToListAsync();

            return Ok(reports);
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

            var record = new HIS.Core.Entities.PharmacyGppRecord
            {
                Id = Guid.NewGuid(),
                RecordType = 1,
                RecordDate = DateTime.TryParse(request.OnsetDate, out var onsetDate) ? onsetDate : DateTime.UtcNow,
                Description = request.Description ?? request.ReactionType,
                MedicineName = request.MedicationName,
                ActionTaken = request.Outcome,
                RecordedById = userId,
                CreatedAt = DateTime.UtcNow,
            };

            _context.PharmacyGppRecords.Add(record);
            await _context.SaveChangesAsync();

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
            var warehouseService = HttpContext.RequestServices.GetRequiredService<HIS.Application.Services.IWarehouseCompleteService>();
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var result = await warehouseService.CancelDispensedPrescriptionAsync(prescriptionId, request.Reason ?? "Hủy đơn", userId);
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
            var warehouseService = HttpContext.RequestServices.GetRequiredService<HIS.Application.Services.IWarehouseCompleteService>();
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var result = await warehouseService.CreateBillingAfterDispensingAsync(issueId, userId);
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
            var prescription = await _context.Prescriptions
                .AsNoTracking()
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            var patient = prescription.MedicalRecord?.Patient;
            var html = new System.Text.StringBuilder();
            html.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
            html.AppendLine("<style>");
            html.AppendLine("body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:4px;}");
            html.AppendLine(".label{border:1px solid #000;padding:4px 6px;margin-bottom:4px;page-break-inside:avoid;width:60mm;}");
            html.AppendLine(".label-title{font-weight:bold;font-size:12px;text-align:center;border-bottom:1px dashed #333;padding-bottom:2px;margin-bottom:2px;}");
            html.AppendLine(".label-row{margin:1px 0;}");
            html.AppendLine(".label-drug{font-weight:bold;font-size:11px;}");
            html.AppendLine("@media print{body{margin:0;} .no-print{display:none;}}");
            html.AppendLine("</style></head><body>");

            var patientName = patient?.FullName ?? "";
            var patientCode = patient?.PatientCode ?? "";
            var dob = patient?.DateOfBirth?.ToString("dd/MM/yyyy") ?? "";
            var doctorName = prescription.Doctor?.FullName ?? "";
            var rxCode = prescription.PrescriptionCode;
            var rxDate = prescription.PrescriptionDate.ToString("dd/MM/yyyy");
            var diagnosis = prescription.DiagnosisName ?? prescription.Diagnosis ?? "";

            foreach (var detail in prescription.Details.Where(d => !d.IsDeleted))
            {
                var medicineName = detail.Medicine?.MedicineName ?? detail.Medicine?.MedicineCode ?? "(thuốc)";
                var dosage = detail.Dosage ?? "";
                var frequency = detail.Frequency ?? "";
                var route = detail.Route ?? "";
                var days = detail.Days;
                var qty = detail.Quantity;
                var unit = detail.Unit ?? "";
                var usage = detail.UsageInstructions ?? detail.Usage ?? "";

                html.AppendLine("<div class='label'>");
                html.AppendLine("<div class='label-title'>NHÃN THUỐC</div>");
                html.AppendLine($"<div class='label-row'>BN: <b>{System.Web.HttpUtility.HtmlEncode(patientName)}</b> ({System.Web.HttpUtility.HtmlEncode(patientCode)})</div>");
                if (!string.IsNullOrEmpty(dob))
                    html.AppendLine($"<div class='label-row'>Ngày sinh: {dob}</div>");
                html.AppendLine($"<div class='label-row label-drug'>{System.Web.HttpUtility.HtmlEncode(medicineName)}</div>");
                html.AppendLine($"<div class='label-row'>SL: {qty} {System.Web.HttpUtility.HtmlEncode(unit)} | {days} ngày</div>");
                if (!string.IsNullOrEmpty(dosage))
                    html.AppendLine($"<div class='label-row'>Liều: {System.Web.HttpUtility.HtmlEncode(dosage)}</div>");
                if (!string.IsNullOrEmpty(frequency))
                    html.AppendLine($"<div class='label-row'>Tần suất: {System.Web.HttpUtility.HtmlEncode(frequency)}</div>");
                if (!string.IsNullOrEmpty(route))
                    html.AppendLine($"<div class='label-row'>Đường dùng: {System.Web.HttpUtility.HtmlEncode(route)}</div>");
                if (!string.IsNullOrEmpty(usage))
                    html.AppendLine($"<div class='label-row'>Cách dùng: {System.Web.HttpUtility.HtmlEncode(usage)}</div>");
                html.AppendLine($"<div class='label-row'>Đơn: {rxCode} | {rxDate} | BS: {System.Web.HttpUtility.HtmlEncode(doctorName)}</div>");
                if (!string.IsNullOrEmpty(diagnosis))
                    html.AppendLine($"<div class='label-row'>CĐ: {System.Web.HttpUtility.HtmlEncode(diagnosis)}</div>");
                html.AppendLine("</div>");
            }

            html.AppendLine("<script>window.onload=function(){window.print();}</script>");
            html.AppendLine("</body></html>");

            return Content(html.ToString(), "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error printing drug label for prescription {Id}", prescriptionId);
            return StatusCode(500, new { message = "Lỗi khi in nhãn thuốc" });
        }
    }
}
