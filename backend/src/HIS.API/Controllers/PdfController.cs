using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Controller sinh HTML/PDF cho in bieu mau EMR
/// Accept header hoac query ?format=pdf de tra ve PDF thay vi HTML
/// Neu user co phien ky so active, PDF se duoc ky so tu dong
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PdfController : ControllerBase
{
    private readonly IPdfGenerationService _pdfService;
    private readonly IPdfSignatureService _signatureService;
    private readonly Pkcs11SessionManager _sessionManager;
    private readonly ILogger<PdfController> _logger;

    public PdfController(
        IPdfGenerationService pdfService,
        IPdfSignatureService signatureService,
        Pkcs11SessionManager sessionManager,
        ILogger<PdfController> logger)
    {
        _pdfService = pdfService;
        _signatureService = signatureService;
        _sessionManager = sessionManager;
        _logger = logger;
    }

    private bool ShouldReturnPdf()
    {
        if (Request.Query.ContainsKey("format") && Request.Query["format"] == "pdf")
            return true;
        var accept = Request.Headers.Accept.ToString();
        return accept.Contains("application/pdf");
    }

    private async Task<IActionResult> ReturnHtmlOrPdf(byte[] html, string pdfFileName)
    {
        if (ShouldReturnPdf())
        {
            var pdfBytes = await _signatureService.ConvertHtmlToPdfAsync(html);

            // Auto-sign if user has active signing session
            var userId = GetCurrentUserId();
            if (userId != null)
            {
                var session = _sessionManager.GetActiveSession(userId.Value.ToString());
                if (session != null)
                {
                    try
                    {
                        PdfSignatureResult signResult;
                        if (session.IsWindowsStoreMode)
                        {
                            signResult = await _signatureService.SignPdfWithUSBTokenAsync(
                                pdfBytes, session.CertificateThumbprint,
                                "Ký xác nhận tài liệu", "Việt Nam");
                        }
                        else
                        {
                            // PKCS#11 mode - skip auto-sign (requires semaphore coordination)
                            signResult = new PdfSignatureResult { Success = false };
                        }
                        if (signResult.Success && signResult.SignedPdfBytes != null)
                        {
                            pdfBytes = signResult.SignedPdfBytes;
                            _logger.LogInformation("Auto-signed PDF export for user {UserId}", userId);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Auto-sign failed, returning unsigned PDF");
                    }
                }
            }

            return File(pdfBytes, "application/pdf", pdfFileName);
        }
        return File(html, "text/html; charset=utf-8");
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        return null;
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
            return await ReturnHtmlOrPdf(html, $"EMR_{examinationId:N}_{formType}.pdf");
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
            return await ReturnHtmlOrPdf(html, $"MedicalRecord_{medicalRecordId:N}.pdf");
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
            return await ReturnHtmlOrPdf(html, $"TreatmentSheet_{admissionId:N}.pdf");
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
            return await ReturnHtmlOrPdf(html, $"Discharge_{admissionId:N}.pdf");
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
            return await ReturnHtmlOrPdf(html, $"Prescription_{prescriptionId:N}.pdf");
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
            return await ReturnHtmlOrPdf(html, $"LabResult_{requestId:N}.pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Loi tao bieu mau: {ex.Message}"));
        }
    }
}
