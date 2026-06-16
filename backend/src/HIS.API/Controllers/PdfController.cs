using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Infrastructure.Services;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using iText.Kernel.Pdf;

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
    private readonly ICentralSigningService _centralSigning;
    private readonly HISDbContext _db;
    private readonly ILogger<PdfController> _logger;

    public PdfController(
        IPdfGenerationService pdfService,
        IPdfSignatureService signatureService,
        Pkcs11SessionManager sessionManager,
        ICentralSigningService centralSigning,
        HISDbContext db,
        ILogger<PdfController> logger)
    {
        _pdfService = pdfService;
        _signatureService = signatureService;
        _sessionManager = sessionManager;
        _centralSigning = centralSigning;
        _db = db;
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

    /// <summary>
    /// #83 — Xuất HSBA tổng kết 1 PDF gộp (tất cả phiếu) + ký số invisible.
    /// GET /api/pdf/export-full-record/{recordId}?sign=true
    /// Gộp: MedicalRecordSummary + TreatmentSheet (nếu có admission) + tất cả EMR forms
    ///       + Prescriptions + LabResults.
    /// Ký số: reuse CentralSigningService.SignPdfInvisibleAsync nếu user có active PKCS#11 session;
    ///        nếu không có session → trả PDF không ký (không lỗi).
    /// </summary>
    [HttpGet("export-full-record/{recordId}")]
    public async Task<IActionResult> ExportFullRecord(Guid recordId, [FromQuery] bool sign = false)
    {
        try
        {
            // 1. Thu thập danh sách HTML từng phiếu
            var htmlParts = new List<byte[]>();

            // 1a. Tóm tắt HSBA (MS. 01/BV)
            try
            {
                htmlParts.Add(await _pdfService.GenerateMedicalRecordSummaryAsync(recordId));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ExportFullRecord: GenerateMedicalRecordSummary failed for {RecordId}", recordId);
            }

            // 1b. Lấy danh sách examination thuộc record
            var examIds = await _db.Examinations
                .Where(e => e.MedicalRecordId == recordId && !e.IsDeleted)
                .Select(e => e.Id)
                .ToListAsync();

            foreach (var examId in examIds)
            {
                // EMR summary form cho mỗi lần khám
                try
                {
                    htmlParts.Add(await _pdfService.GenerateEmrPdfAsync(examId, "summary"));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ExportFullRecord: GenerateEmrPdf failed for exam {ExamId}", examId);
                }
            }

            // 1c. Tờ điều trị — lấy admission đầu tiên của record (nếu có)
            var admissionId = await _db.Admissions
                .Where(a => a.MedicalRecordId == recordId && !a.IsDeleted)
                .Select(a => (Guid?)a.Id)
                .FirstOrDefaultAsync();

            if (admissionId.HasValue)
            {
                try
                {
                    htmlParts.Add(await _pdfService.GenerateTreatmentSheetAsync(admissionId.Value));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ExportFullRecord: GenerateTreatmentSheet failed for admission {AdmissionId}", admissionId);
                }

                try
                {
                    htmlParts.Add(await _pdfService.GenerateDischargeLetterAsync(admissionId.Value));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ExportFullRecord: GenerateDischargeLetter failed for admission {AdmissionId}", admissionId);
                }
            }

            // 1d. Đơn thuốc thuộc HSBA (query trực tiếp theo MedicalRecordId cho chắc)
            {
                var rxIds = await _db.Prescriptions
                    .Where(rx => rx.MedicalRecordId == recordId && !rx.IsDeleted)
                    .Select(rx => rx.Id)
                    .ToListAsync();

                foreach (var rxId in rxIds)
                {
                    try
                    {
                        htmlParts.Add(await _pdfService.GeneratePrescriptionAsync(rxId));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "ExportFullRecord: GeneratePrescription failed for rx {RxId}", rxId);
                    }
                }

                // 1e. Kết quả xét nghiệm (RequestType=1 là Xét nghiệm)
                var labIds = await _db.ServiceRequests
                    .Where(sr => sr.MedicalRecordId == recordId && sr.RequestType == 1 && !sr.IsDeleted)
                    .Select(sr => sr.Id)
                    .ToListAsync();

                foreach (var labId in labIds)
                {
                    try
                    {
                        htmlParts.Add(await _pdfService.GenerateLabResultAsync(labId));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "ExportFullRecord: GenerateLabResult failed for lab {LabId}", labId);
                    }
                }
            }

            if (htmlParts.Count == 0)
                return StatusCode(404, ApiResponse<string>.Fail("Không tìm thấy phiếu nào trong hồ sơ này"));

            // 2. Convert từng HTML → PDF riêng rồi merge bằng iText7 PdfMerger
            byte[] mergedPdfBytes;
            using (var mergedStream = new MemoryStream())
            {
                using (var writer = new PdfWriter(mergedStream))
                using (var mergedDoc = new iText.Kernel.Pdf.PdfDocument(writer))
                {
                    var merger = new iText.Kernel.Utils.PdfMerger(mergedDoc);

                    foreach (var htmlPart in htmlParts)
                    {
                        try
                        {
                            var singlePdfBytes = await _signatureService.ConvertHtmlToPdfAsync(htmlPart);
                            using var srcStream = new MemoryStream(singlePdfBytes);
                            using var srcPdf = new iText.Kernel.Pdf.PdfDocument(new PdfReader(srcStream));
                            merger.Merge(srcPdf, 1, srcPdf.GetNumberOfPages());
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "ExportFullRecord: failed to convert/merge one HTML part");
                        }
                    }
                }
                mergedPdfBytes = mergedStream.ToArray();
            }

            // 3. Ký số invisible nếu caller yêu cầu (sign=true) và có active session
            if (sign)
            {
                var userId = GetCurrentUserId();
                if (userId.HasValue)
                {
                    var session = _sessionManager.GetActiveSession(userId.Value.ToString());
                    if (session != null)
                    {
                        try
                        {
                            var signResult = await _centralSigning.SignPdfInvisibleAsync(
                                userId.Value, mergedPdfBytes,
                                "Ký xác nhận hồ sơ bệnh án tổng kết", "Việt Nam");

                            if (signResult.Success && !string.IsNullOrEmpty(signResult.SignedPdfBase64))
                                mergedPdfBytes = Convert.FromBase64String(signResult.SignedPdfBase64);
                            else
                                _logger.LogWarning("ExportFullRecord: sign failed — {Msg}", signResult.Message);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "ExportFullRecord: signing failed, returning unsigned PDF");
                        }
                    }
                    else
                    {
                        _logger.LogInformation("ExportFullRecord: no active signing session for user {UserId}, skipping sign", userId);
                    }
                }
            }

            return File(mergedPdfBytes, "application/pdf", $"HSBA_{recordId:N}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExportFullRecord failed for record {RecordId}", recordId);
            return StatusCode(500, ApiResponse<string>.Fail($"Loi xuat ho so: {ex.Message}"));
        }
    }
}
