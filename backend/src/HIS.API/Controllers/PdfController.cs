using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Controller sinh HTML cho in bieu mau EMR
/// Tra ve HTML (Content-Type: text/html; charset=utf-8) de browser in native
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PdfController : ControllerBase
{
    private readonly IPdfGenerationService _pdfService;

    public PdfController(IPdfGenerationService pdfService)
    {
        _pdfService = pdfService;
    }

    /// <summary>
    /// Sinh HTML bieu mau EMR theo examinationId va formType
    /// GET /api/pdf/emr/{examinationId}?formType=summary
    /// formType: summary, treatment, consultation, discharge, nursing,
    ///           preanesthetic, consent, progress, counseling, deathreview, finalsummary,
    ///           nutrition, surgeryrecord, surgeryapproval, surgerysummary, depttransfer, admission,
    ///           dd01-careplan, dd02-icucare, ... dd21-vap
    /// </summary>
    [HttpGet("emr/{examinationId}")]
    public async Task<IActionResult> GetEmrForm(Guid examinationId, [FromQuery] string formType = "summary")
    {
        try
        {
            var html = await _pdfService.GenerateEmrPdfAsync(examinationId, formType);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }

    /// <summary>
    /// Sinh HTML tom tat ho so benh an (MS. 01/BV)
    /// GET /api/pdf/medical-record/{medicalRecordId}
    /// </summary>
    [HttpGet("medical-record/{medicalRecordId}")]
    public async Task<IActionResult> GetMedicalRecordSummary(Guid medicalRecordId)
    {
        try
        {
            var html = await _pdfService.GenerateMedicalRecordSummaryAsync(medicalRecordId);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }

    /// <summary>
    /// Sinh HTML to dieu tri (MS. 02/BV)
    /// GET /api/pdf/treatment-sheet/{admissionId}
    /// </summary>
    [HttpGet("treatment-sheet/{admissionId}")]
    public async Task<IActionResult> GetTreatmentSheet(Guid admissionId)
    {
        try
        {
            var html = await _pdfService.GenerateTreatmentSheetAsync(admissionId);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }

    /// <summary>
    /// Sinh HTML giay ra vien (MS. 04/BV)
    /// GET /api/pdf/discharge/{admissionId}
    /// </summary>
    [HttpGet("discharge/{admissionId}")]
    public async Task<IActionResult> GetDischargeLetter(Guid admissionId)
    {
        try
        {
            var html = await _pdfService.GenerateDischargeLetterAsync(admissionId);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }

    /// <summary>
    /// Sinh HTML don thuoc
    /// GET /api/pdf/prescription/{prescriptionId}
    /// </summary>
    [HttpGet("prescription/{prescriptionId}")]
    public async Task<IActionResult> GetPrescription(Guid prescriptionId)
    {
        try
        {
            var html = await _pdfService.GeneratePrescriptionAsync(prescriptionId);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }

    /// <summary>
    /// Sinh HTML phieu ket qua xet nghiem
    /// GET /api/pdf/lab-result/{requestId}
    /// </summary>
    [HttpGet("lab-result/{requestId}")]
    public async Task<IActionResult> GetLabResult(Guid requestId)
    {
        try
        {
            var html = await _pdfService.GenerateLabResultAsync(requestId);
            return File(html, "text/html; charset=utf-8");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }
}
