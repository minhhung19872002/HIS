using System.Security.Claims;
using HIS.Application.DTOs;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Centralized Digital Signing API (NangCap6 - BV Xanh Pon).
/// 12+ API endpoints as required by the tender specification.
/// </summary>
[ApiController]
[Route("api/central-signing")]
[Authorize]
public class CentralSigningController : ControllerBase
{
    private readonly ICentralSigningService _signingService;
    private readonly ILogger<CentralSigningController> _logger;

    public CentralSigningController(
        ICentralSigningService signingService,
        ILogger<CentralSigningController> logger)
    {
        _signingService = signingService;
        _logger = logger;
    }

    // ============ 12 API Endpoints Required by NangCap6 ============

    /// <summary>API #1: Đăng nhập hệ thống (reuse existing open-session)</summary>
    /// <remarks>Uses /api/digital-signature/open-session</remarks>

    /// <summary>API #2: Ký dữ liệu hash</summary>
    [HttpPost("sign-hash")]
    public async Task<ActionResult<CentralSigningResult>> SignHash([FromBody] SignHashRequest request)
    {
        var userId = GetCurrentUserId();
        var hash = Convert.FromBase64String(request.HashBase64);
        var result = await _signingService.SignHashAsync(userId, hash, request.HashAlgorithm);
        return Ok(result);
    }

    /// <summary>API #3: Ký số dữ liệu raw</summary>
    [HttpPost("sign-raw")]
    public async Task<ActionResult<CentralSigningResult>> SignRaw([FromBody] SignRawRequest request)
    {
        var userId = GetCurrentUserId();
        var data = Convert.FromBase64String(request.DataBase64);
        var result = await _signingService.SignRawAsync(userId, data, request.HashAlgorithm);
        return Ok(result);
    }

    /// <summary>API #4: Ký số dữ liệu PDF (ký ẩn)</summary>
    [HttpPost("sign-pdf-invisible")]
    public async Task<ActionResult<PdfSigningResult>> SignPdfInvisible([FromBody] SignPdfInvisibleRequest request)
    {
        var userId = GetCurrentUserId();
        var pdfBytes = Convert.FromBase64String(request.PdfBase64);
        var result = await _signingService.SignPdfInvisibleAsync(userId, pdfBytes, request.Reason, request.Location);
        return Ok(result);
    }

    /// <summary>API #5: Xác thực chữ ký số với dữ liệu raw</summary>
    [HttpPost("verify-raw")]
    public async Task<ActionResult<DataVerificationResult>> VerifyRaw([FromBody] VerifyRawRequest request)
    {
        var data = Convert.FromBase64String(request.DataBase64);
        var signature = Convert.FromBase64String(request.SignatureBase64);
        var result = await _signingService.VerifyRawSignatureAsync(data, signature);
        return Ok(result);
    }

    /// <summary>API #6: Xác thực chữ ký số với dữ liệu hash</summary>
    [HttpPost("verify-hash")]
    public async Task<ActionResult<DataVerificationResult>> VerifyHash([FromBody] VerifyHashRequest request)
    {
        var hash = Convert.FromBase64String(request.HashBase64);
        var signature = Convert.FromBase64String(request.SignatureBase64);
        var result = await _signingService.VerifyHashSignatureAsync(hash, signature, request.HashAlgorithm);
        return Ok(result);
    }

    /// <summary>API #7: Lấy ảnh chữ ký số</summary>
    [HttpGet("signature-image")]
    public async Task<ActionResult<SignatureImageResult>> GetSignatureImage()
    {
        var userId = GetCurrentUserId();
        var result = await _signingService.GetSignatureImageAsync(userId);
        return Ok(result);
    }

    /// <summary>API #8: Lấy ảnh chữ ký số truyền động</summary>
    [HttpGet("signature-image/animated")]
    public async Task<ActionResult<SignatureImageResult>> GetAnimatedSignatureImage()
    {
        var userId = GetCurrentUserId();
        var result = await _signingService.GetAnimatedSignatureImageAsync(userId);
        return Ok(result);
    }

    /// <summary>API #9: Ký số dữ liệu PDF (ký hiện vị trí)</summary>
    [HttpPost("sign-pdf-visible")]
    public async Task<ActionResult<PdfSigningResult>> SignPdfVisible([FromBody] SignPdfVisibleRequest request)
    {
        var userId = GetCurrentUserId();
        var pdfBytes = Convert.FromBase64String(request.PdfBase64);
        var result = await _signingService.SignPdfVisibleAsync(userId, pdfBytes, request);
        return Ok(result);
    }

    /// <summary>API #10: Verify PDF (sau khi ký thành công)</summary>
    [HttpPost("verify-pdf")]
    public async Task<ActionResult<PdfVerificationResult>> VerifyPdf([FromBody] VerifyPdfRequest request)
    {
        var pdfBytes = Convert.FromBase64String(request.PdfBase64);
        var result = await _signingService.VerifyPdfAsync(pdfBytes);
        return Ok(result);
    }

    /// <summary>API #11: Ký số dữ liệu XML</summary>
    [HttpPost("sign-xml")]
    public async Task<ActionResult<XmlSigningResult>> SignXml([FromBody] SignXmlRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _signingService.SignXmlAsync(userId, request.XmlContent, request.SignatureNodeXPath);
        return Ok(result);
    }

    /// <summary>API #12: Verify PDF (full verification)</summary>
    [HttpPost("verify-pdf-full")]
    public async Task<ActionResult<PdfVerificationResult>> VerifyPdfFull([FromBody] VerifyPdfRequest request)
    {
        var pdfBytes = Convert.FromBase64String(request.PdfBase64);
        var result = await _signingService.VerifyPdfAsync(pdfBytes);
        return Ok(result);
    }

    // ============ Admin Management APIs ============

    /// <summary>Get managed certificates list</summary>
    [HttpGet("admin/certificates")]
    public async Task<ActionResult<List<ManagedCertificateDto>>> GetCertificates(
        [FromQuery] string? keyword, [FromQuery] bool? isActive)
    {
        var result = await _signingService.GetManagedCertificatesAsync(keyword, isActive);
        return Ok(result);
    }

    /// <summary>Create/update managed certificate</summary>
    [HttpPost("admin/certificates")]
    public async Task<ActionResult<ManagedCertificateDto>> SaveCertificate([FromBody] SaveManagedCertificateRequest request)
    {
        var result = await _signingService.SaveManagedCertificateAsync(request);
        return Ok(result);
    }

    /// <summary>Delete managed certificate</summary>
    [HttpDelete("admin/certificates/{id}")]
    public async Task<ActionResult> DeleteCertificate(Guid id)
    {
        var success = await _signingService.DeleteManagedCertificateAsync(id);
        return success ? Ok(new { success = true }) : NotFound();
    }

    /// <summary>Get signing transactions</summary>
    [HttpGet("admin/transactions")]
    public async Task<ActionResult> GetTransactions([FromQuery] SigningTransactionSearchDto search)
    {
        var items = await _signingService.GetTransactionsAsync(search);
        var total = await _signingService.GetTransactionCountAsync(search);
        return Ok(new { items, total });
    }

    /// <summary>Get signing statistics</summary>
    [HttpGet("admin/statistics")]
    public async Task<ActionResult<SigningStatisticsDto>> GetStatistics()
    {
        var result = await _signingService.GetStatisticsAsync();
        return Ok(result);
    }

    /// <summary>Get signature appearance configuration</summary>
    [HttpGet("admin/appearance")]
    public async Task<ActionResult<SignatureAppearanceDto>> GetAppearance()
    {
        var result = await _signingService.GetAppearanceConfigAsync();
        return Ok(result);
    }

    /// <summary>Save signature appearance configuration</summary>
    [HttpPost("admin/appearance")]
    public async Task<ActionResult> SaveAppearance([FromBody] SignatureAppearanceDto config)
    {
        await _signingService.SaveAppearanceConfigAsync(config);
        return Ok(new { success = true });
    }

    // ============ HSM APIs ============

    /// <summary>Get HSM device info</summary>
    [HttpGet("hsm/info")]
    public async Task<ActionResult<HsmInfoDto>> GetHsmInfo()
    {
        var result = await _signingService.GetHsmInfoAsync();
        return Ok(result);
    }

    /// <summary>Create CSR for HSM</summary>
    [HttpPost("hsm/create-csr")]
    public async Task<ActionResult<CsrResult>> CreateCsr([FromBody] CreateCsrRequest request)
    {
        var result = await _signingService.CreateCsrAsync(request);
        return Ok(result);
    }

    /// <summary>Upload signature image by CCCD</summary>
    [HttpPost("admin/signature-image")]
    public async Task<ActionResult> UploadSignatureImage([FromBody] UploadSignatureImageRequest request)
    {
        var imageBytes = Convert.FromBase64String(request.ImageBase64);
        var success = await _signingService.UploadSignatureImageAsync(request.Cccd, imageBytes);
        return success ? Ok(new { success = true }) : NotFound(new { message = "Không tìm thấy chứng thư số với CCCD này" });
    }

    /// <summary>Export serial number list</summary>
    [HttpGet("admin/export-serials")]
    public async Task<ActionResult<List<string>>> ExportSerials()
    {
        var serials = await _signingService.ExportCertificateSerialListAsync();
        return Ok(serials);
    }

    // ============ TOTP APIs ============

    /// <summary>Setup TOTP for signing</summary>
    [HttpPost("totp/setup")]
    public async Task<ActionResult<SigningTotpSetupDto>> SetupTotp()
    {
        var userId = GetCurrentUserId();
        var result = await _signingService.SetupTotpAsync(userId);
        return Ok(result);
    }

    /// <summary>Verify TOTP code before signing</summary>
    [HttpPost("totp/verify")]
    public async Task<ActionResult> VerifyTotp([FromBody] SigningTotpVerifyRequest request)
    {
        var userId = GetCurrentUserId();
        var success = await _signingService.VerifyTotpAsync(userId, request.OtpCode);
        return Ok(new { success, message = success ? "Xác thực OTP thành công" : "Mã OTP không đúng" });
    }

    /// <summary>Disable TOTP for signing</summary>
    [HttpPost("totp/disable")]
    public async Task<ActionResult> DisableTotp()
    {
        var userId = GetCurrentUserId();
        var success = await _signingService.DisableTotpAsync(userId);
        return Ok(new { success });
    }

    // ============ Private ============

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (claim != null && Guid.TryParse(claim.Value, out var userId)) return userId;
        throw new UnauthorizedAccessException("User ID not found");
    }
}
