using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using HIS.API.Dtos.DigitalSignature;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/digital-signature")]
// B3 (audit bảo mật 2026-06-06): ký số HSBA/tài liệu là hành vi lâm sàng/pháp lý — chỉ vai trò lâm sàng,
// loại lễ tân/kế toán/thu ngân (trước đây [Authorize] trơn cho bất kỳ user đăng nhập).
[Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.DepartmentHead + "," + RoleNames.Nurse)]
public partial class DigitalSignatureController : ControllerBase
{
    private readonly Pkcs11SessionManager _sessionManager;
    private readonly ITokenRegistryService _tokenRegistry;
    private readonly IPdfSignatureService _pdfService;
    private readonly IPdfGenerationService _pdfGeneration;
    private readonly IDocumentSignatureStore _signatureStore;
    private readonly Pkcs11Configuration _config;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<DigitalSignatureController> _logger;

    public DigitalSignatureController(
        Pkcs11SessionManager sessionManager,
        ITokenRegistryService tokenRegistry,
        IPdfSignatureService pdfService,
        IPdfGenerationService pdfGeneration,
        IDocumentSignatureStore signatureStore,
        IOptions<Pkcs11Configuration> config,
        IHubContext<NotificationHub> hubContext,
        ILogger<DigitalSignatureController> logger)
    {
        _sessionManager = sessionManager;
        _tokenRegistry = tokenRegistry;
        _pdfService = pdfService;
        _pdfGeneration = pdfGeneration;
        _signatureStore = signatureStore;
        _config = config.Value;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Open PKCS#11 signing session with USB Token PIN
    /// </summary>
    [HttpPost("open-session")]
    public async Task<ActionResult<OpenSessionResponse>> OpenSession([FromBody] OpenSessionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var entry = await _sessionManager.OpenSessionAsync(userId.ToString(), request.Pin, request.SkipPkcs11);

            // Auto-register token mapping
            await _tokenRegistry.RegisterTokenAsync(userId, entry.TokenSerial, entry.TokenLabel, entry.CaProvider);

            // Check certificate expiry warning
            int? expiryWarningDays = null;
            var daysUntilExpiry = (entry.CertificateValidTo - DateTime.Now).Days;
            if (daysUntilExpiry <= 30)
                expiryWarningDays = daysUntilExpiry;

            return Ok(new OpenSessionResponse
            {
                Success = true,
                Message = "Phiên ký số đã được mở thành công",
                TokenSerial = entry.TokenSerial,
                CaProvider = entry.CaProvider,
                CertificateSubject = entry.CertificateSubject,
                SessionExpiresAt = entry.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to open PKCS#11 session");
            return Ok(new OpenSessionResponse
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    /// <summary>
    /// Get current session status
    /// </summary>
    [HttpGet("session-status")]
    public ActionResult<SessionStatusResponse> GetSessionStatus()
    {
        var userId = GetCurrentUserId();
        var session = _sessionManager.GetActiveSession(userId.ToString());

        if (session == null)
        {
            return Ok(new SessionStatusResponse { Active = false });
        }

        int? expiryWarningDays = null;
        var daysUntilExpiry = (session.CertificateValidTo - DateTime.Now).Days;
        if (daysUntilExpiry <= 30)
            expiryWarningDays = daysUntilExpiry;

        return Ok(new SessionStatusResponse
        {
            Active = true,
            ExpiresAt = session.ExpiresAt,
            TokenSerial = session.TokenSerial,
            CaProvider = session.CaProvider,
            CertificateSubject = session.CertificateSubject,
            ExpiryWarningDays = expiryWarningDays
        });
    }

    /// <summary>
    /// Close signing session
    /// </summary>
    [HttpPost("close-session")]
    public ActionResult CloseSession()
    {
        var userId = GetCurrentUserId();
        _sessionManager.InvalidateSession(userId.ToString());
        return Ok(new { message = "Phiên ký số đã đóng" });
    }

    /// <summary>
    /// Sign a single document
    /// </summary>
    [HttpPost("sign")]
    public async Task<ActionResult<SignDocumentResponse>> SignDocument([FromBody] SignDocumentRequest request)
    {
        var userId = GetCurrentUserId();
        var userIdStr = userId.ToString();

        // Get or create session
        var session = _sessionManager.GetActiveSession(userIdStr);
        if (session == null && !string.IsNullOrEmpty(request.Pin))
        {
            try
            {
                session = await _sessionManager.OpenSessionAsync(userIdStr, request.Pin);
            }
            catch (Exception ex)
            {
                return Ok(new SignDocumentResponse { Success = false, Message = ex.Message });
            }
        }

        if (session == null)
        {
            return Unauthorized(new SignDocumentResponse
            {
                Success = false,
                Message = "Chưa mở phiên ký số. Vui lòng nhập PIN."
            });
        }

        // Auto-revoke existing signature if document already signed
        var revokedSignatureId = await _signatureStore.RevokeActiveSignatureAsync(request.DocumentId, request.DocumentType, userId);
        if (revokedSignatureId != null)
        {
            _logger.LogInformation("Auto-revoked signature {SignatureId} for re-signing document {DocumentId}", revokedSignatureId, request.DocumentId);
        }

        try
        {
            // Serialize signing on the same token
            await session.SigningSemaphore.WaitAsync();
            try
            {
                var result = await SignDocumentInternal(userId, session, request);
                _sessionManager.RefreshSession(userIdStr);
                await _tokenRegistry.UpdateLastUsedAsync(session.TokenSerial);
                return Ok(result);
            }
            finally
            {
                session.SigningSemaphore.Release();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error signing document {DocumentId}", request.DocumentId);
            return Ok(new SignDocumentResponse { Success = false, Message = $"Lỗi ký số: {ex.Message}" });
        }
    }

    /// <summary>
    /// Batch sign multiple documents with SignalR progress
    /// </summary>
    [HttpPost("batch-sign")]
    public async Task<ActionResult<BatchSignResponse>> BatchSign([FromBody] BatchSignRequest request)
    {
        if (request.DocumentIds.Count > _config.MaxBatchSize)
        {
            return BadRequest(new BatchSignResponse
            {
                Total = request.DocumentIds.Count,
                Failed = request.DocumentIds.Count,
                Results = new List<BatchSignItemResult>
                {
                    new() { Success = false, Error = $"Tối đa {_config.MaxBatchSize} tài liệu mỗi lần ký" }
                }
            });
        }

        var userId = GetCurrentUserId();
        var userIdStr = userId.ToString();

        // Get or create session
        var session = _sessionManager.GetActiveSession(userIdStr);
        if (session == null && !string.IsNullOrEmpty(request.Pin))
        {
            try
            {
                session = await _sessionManager.OpenSessionAsync(userIdStr, request.Pin);
            }
            catch (Exception ex)
            {
                return Ok(new BatchSignResponse
                {
                    Total = request.DocumentIds.Count,
                    Failed = request.DocumentIds.Count,
                    Results = new List<BatchSignItemResult>
                    {
                        new() { Success = false, Error = ex.Message }
                    }
                });
            }
        }

        if (session == null)
        {
            return Unauthorized(new BatchSignResponse
            {
                Total = request.DocumentIds.Count,
                Failed = request.DocumentIds.Count,
                Results = new List<BatchSignItemResult>
                {
                    new() { Success = false, Error = "Chưa mở phiên ký số. Vui lòng nhập PIN." }
                }
            });
        }

        var response = new BatchSignResponse
        {
            Total = request.DocumentIds.Count,
            Results = new List<BatchSignItemResult>()
        };

        for (int i = 0; i < request.DocumentIds.Count; i++)
        {
            var docId = request.DocumentIds[i];
            var itemResult = new BatchSignItemResult { DocumentId = docId };

            try
            {
                await session.SigningSemaphore.WaitAsync();
                try
                {
                    var signRequest = new SignDocumentRequest
                    {
                        DocumentId = docId,
                        DocumentType = request.DocumentType,
                        Reason = request.Reason,
                        Location = "Việt Nam"
                    };

                    // Check if already signed
                    var existing = await _signatureStore.IsDocumentSignedAsync(docId, request.DocumentType);

                    if (existing)
                    {
                        itemResult.Success = false;
                        itemResult.Error = "Đã ký";
                    }
                    else
                    {
                        var result = await SignDocumentInternal(userId, session, signRequest);
                        itemResult.Success = result.Success;
                        if (!result.Success) itemResult.Error = result.Message;
                    }
                }
                finally
                {
                    session.SigningSemaphore.Release();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Batch sign failed for document {DocumentId}", docId);
                itemResult.Success = false;
                itemResult.Error = ex.Message;
            }

            response.Results.Add(itemResult);
            if (itemResult.Success) response.Succeeded++;
            else response.Failed++;

            // Send SignalR progress
            await _hubContext.Clients.Group($"user_{userIdStr}").SendAsync("SigningProgress", new
            {
                current = i + 1,
                total = request.DocumentIds.Count,
                documentId = docId.ToString(),
                success = itemResult.Success
            });
        }

        // Send completion event
        await _hubContext.Clients.Group($"user_{userIdStr}").SendAsync("SigningComplete", new
        {
            total = response.Total,
            succeeded = response.Succeeded,
            failed = response.Failed
        });

        _sessionManager.RefreshSession(userIdStr);
        await _tokenRegistry.UpdateLastUsedAsync(session.TokenSerial);

        return Ok(response);
    }

    private async Task<SignDocumentResponse> SignDocumentInternal(
        Guid userId, Pkcs11SessionEntry session, SignDocumentRequest request)
    {
        // Generate HTML from document
        byte[] htmlBytes;
        try
        {
            htmlBytes = await GenerateDocumentHtmlAsync(request.DocumentId, request.DocumentType);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error generating HTML for {DocumentType} {DocumentId}", request.DocumentType, request.DocumentId);
            return new SignDocumentResponse { Success = false, Message = $"Lỗi tạo PDF: {ex.Message}" };
        }

        // Convert HTML to PDF and sign
        var signerName = session.CertificateSubject;
        PdfSignatureResult signResult;

        if (session.IsWindowsStoreMode)
        {
            // Windows Certificate Store mode: convert HTML to PDF first, then sign with Windows cert
            _logger.LogInformation("Step 1: Converting HTML to PDF ({Size} bytes)", htmlBytes.Length);
            byte[] pdfBytes;
            try
            {
                pdfBytes = await _pdfService.ConvertHtmlToPdfAsync(htmlBytes);
                _logger.LogInformation("Step 1 done: PDF generated ({Size} bytes)", pdfBytes.Length);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Step 1 FAILED: ConvertHtmlToPdfAsync");
                signResult = new PdfSignatureResult { Success = false, Message = $"Lỗi tạo PDF: {ex.Message}" };
                return new SignDocumentResponse { Success = false, Message = signResult.Message };
            }

            try
            {
                _logger.LogInformation("Step 2: Signing PDF with Windows cert store, thumbprint={Thumbprint}", session.CertificateThumbprint);
                signResult = await _pdfService.SignPdfWithUSBTokenAsync(
                    pdfBytes, session.CertificateThumbprint,
                    request.Reason ?? "Ký xác nhận hồ sơ bệnh án",
                    request.Location ?? "Việt Nam");
                _logger.LogInformation("Step 2 done: signResult.Success={Success}, Message={Message}", signResult.Success, signResult.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Step 2 FAILED: SignPdfWithUSBTokenAsync (full stack trace)");
                signResult = new PdfSignatureResult { Success = false, Message = $"Lỗi ký số PDF: {ex.Message}" };
                return new SignDocumentResponse { Success = false, Message = signResult.Message };
            }
        }
        else
        {
            // PKCS#11 mode: convert and sign in one step
            signResult = await _pdfService.ConvertAndSignAsync(
                htmlBytes, session.Certificate, _config,
                request.Reason, request.Location, signerName);
        }

        if (!signResult.Success)
            return new SignDocumentResponse { Success = false, Message = signResult.Message };

        // Save signed PDF to disk
        var outputDir = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Signed", request.DocumentType);
        Directory.CreateDirectory(outputDir);
        var fileName = $"{request.DocumentId}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var filePath = Path.Combine(outputDir, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, signResult.SignedPdfBytes!);

        // Create DocumentSignature record
        var signature = new DocumentSignature
        {
            DocumentId = request.DocumentId,
            DocumentType = request.DocumentType,
            DocumentCode = $"{request.DocumentType}-{request.DocumentId.ToString()[..8]}",
            SignedByUserId = userId,
            SignedAt = DateTime.UtcNow,
            CertificateSubject = session.CertificateSubject,
            CertificateIssuer = session.CertificateIssuer,
            CertificateSerial = session.CertificateSerial,
            CertificateValidFrom = session.CertificateValidFrom,
            CertificateValidTo = session.CertificateValidTo,
            CaProvider = session.CaProvider,
            TokenSerial = session.TokenSerial,
            SignatureValue = Convert.ToBase64String(signResult.SignedPdfBytes!),
            SignedDocumentPath = filePath,
            Status = 0
        };

        await _signatureStore.AddSignatureAsync(signature);

        return new SignDocumentResponse
        {
            Success = true,
            Message = "Ký số thành công",
            SignerName = signerName,
            SignedAt = signature.SignedAt.ToString("dd/MM/yyyy HH:mm:ss"),
            CertificateSerial = session.CertificateSerial,
            CaProvider = session.CaProvider,
            SignedDocumentUrl = $"/api/digital-signature/signed/{request.DocumentType}/{fileName}"
        };
    }

    /// <summary>
    /// Sinh HTML tài liệu theo loại (dùng chung cho ký server-side lẫn lấy nội dung cho client-side ký).
    /// </summary>
    private async Task<byte[]> GenerateDocumentHtmlAsync(Guid documentId, string documentType)
    {
        return documentType switch
        {
            "EMR" => await _pdfGeneration.GenerateEmrPdfAsync(documentId, "summary"),
            "Prescription" => await _pdfGeneration.GeneratePrescriptionAsync(documentId),
            "LabResult" => await _pdfGeneration.GenerateLabResultAsync(documentId),
            "Discharge" => await _pdfGeneration.GenerateDischargeLetterAsync(documentId),
            "Referral" => await _pdfGeneration.GenerateEmrPdfAsync(documentId, "referral"),
            _ => await _pdfGeneration.GenerateEmrPdfAsync(documentId, "summary")
        };
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        throw new UnauthorizedAccessException("User ID not found in token");
    }

    /// <summary>Extract organization name (O= field) from X.509 CertificateSubject</summary>
    private static string? ParseOrganizationName(string? subject)
    {
        if (string.IsNullOrEmpty(subject)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(subject, @"O=([^,]+)");
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    /// <summary>Extract tax code (OID 2.5.4.97 or MST: pattern) from X.509 CertificateSubject</summary>
    private static string? ParseTaxCode(string? subject)
    {
        if (string.IsNullOrEmpty(subject)) return null;
        // Try OID 2.5.4.97 (organizationIdentifier) first
        var match = System.Text.RegularExpressions.Regex.Match(subject, @"(?:2\.5\.4\.97|OID\.2\.5\.4\.97|VATIT-|MST:?\s*)(\d{10,13})");
        if (match.Success) return match.Groups[1].Value.Trim();
        // Try OU= field which sometimes contains tax code
        match = System.Text.RegularExpressions.Regex.Match(subject, @"OU=(?:MST:?\s*)?(\d{10,13})");
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }
}
