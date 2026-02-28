using System.Security.Claims;
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

namespace HIS.API.Controllers;

[ApiController]
[Route("api/digital-signature")]
[Authorize]
public class DigitalSignatureController : ControllerBase
{
    private readonly Pkcs11SessionManager _sessionManager;
    private readonly ITokenRegistryService _tokenRegistry;
    private readonly IPdfSignatureService _pdfService;
    private readonly IPdfGenerationService _pdfGeneration;
    private readonly HISDbContext _db;
    private readonly Pkcs11Configuration _config;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<DigitalSignatureController> _logger;

    public DigitalSignatureController(
        Pkcs11SessionManager sessionManager,
        ITokenRegistryService tokenRegistry,
        IPdfSignatureService pdfService,
        IPdfGenerationService pdfGeneration,
        HISDbContext db,
        IOptions<Pkcs11Configuration> config,
        IHubContext<NotificationHub> hubContext,
        ILogger<DigitalSignatureController> logger)
    {
        _sessionManager = sessionManager;
        _tokenRegistry = tokenRegistry;
        _pdfService = pdfService;
        _pdfGeneration = pdfGeneration;
        _db = db;
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
            var entry = await _sessionManager.OpenSessionAsync(userId.ToString(), request.Pin);

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
        return Ok(new { success = true, message = "Phiên ký số đã đóng" });
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

        // Check if document already signed (lock check)
        var existingSignature = await _db.DocumentSignatures
            .FirstOrDefaultAsync(ds => ds.DocumentId == request.DocumentId
                                       && ds.DocumentType == request.DocumentType
                                       && ds.Status == 0);
        if (existingSignature != null)
        {
            return Conflict(new SignDocumentResponse
            {
                Success = false,
                Message = "Tài liệu đã được ký số. Cần thu hồi chữ ký trước khi ký lại."
            });
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
                    var existing = await _db.DocumentSignatures
                        .AnyAsync(ds => ds.DocumentId == docId && ds.DocumentType == request.DocumentType && ds.Status == 0);

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

    /// <summary>
    /// Get signatures for a document
    /// </summary>
    [HttpGet("signatures/{documentId}")]
    public async Task<ActionResult<List<DocumentSignatureDto>>> GetSignatures(Guid documentId)
    {
        var signatures = await _db.DocumentSignatures
            .Where(ds => ds.DocumentId == documentId && ds.Status == 0)
            .Include(ds => ds.SignedByUser)
            .OrderByDescending(ds => ds.SignedAt)
            .Select(ds => new DocumentSignatureDto
            {
                Id = ds.Id,
                DocumentId = ds.DocumentId,
                DocumentType = ds.DocumentType,
                DocumentCode = ds.DocumentCode,
                SignerName = ds.SignedByUser != null ? ds.SignedByUser.FullName : ds.CertificateSubject,
                SignedAt = ds.SignedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                CertificateSerial = ds.CertificateSerial,
                CaProvider = ds.CaProvider,
                TsaTimestamp = ds.TsaTimestamp,
                OcspStatus = ds.OcspStatus,
                Status = ds.Status
            })
            .ToListAsync();

        return Ok(signatures);
    }

    /// <summary>
    /// Revoke a signature (unlock document for re-signing)
    /// </summary>
    [HttpPost("revoke-signature/{signatureId}")]
    public async Task<ActionResult> RevokeSignature(Guid signatureId, [FromBody] RevokeSignatureRequest request)
    {
        var userId = GetCurrentUserId();
        var signature = await _db.DocumentSignatures.FindAsync(signatureId);

        if (signature == null)
            return NotFound(new { message = "Không tìm thấy chữ ký" });

        if (signature.Status != 0)
            return BadRequest(new { message = "Chữ ký đã bị thu hồi" });

        // Only the signer or admin can revoke
        if (signature.SignedByUserId != userId)
        {
            var isAdmin = User.IsInRole("Admin");
            if (!isAdmin)
                return Forbid();
        }

        signature.Status = 1; // Revoked
        signature.RevokeReason = request.Reason;
        signature.RevokedAt = DateTime.UtcNow;
        signature.RevokedByUserId = userId;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Signature {SignatureId} revoked by user {UserId}", signatureId, userId);
        return Ok(new { success = true, message = "Đã thu hồi chữ ký" });
    }

    /// <summary>
    /// Get available USB tokens
    /// </summary>
    [HttpGet("tokens")]
    public ActionResult<List<TokenInfoDto>> GetTokens()
    {
        try
        {
            var tokens = _sessionManager.GetAllTokens();
            var result = tokens.Select(t => new TokenInfoDto
            {
                TokenSerial = t.Serial,
                TokenLabel = t.Label,
                CaProvider = t.Provider,
                IsActive = true
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error enumerating tokens");
            return Ok(new List<TokenInfoDto>());
        }
    }

    /// <summary>
    /// Register a token to the current user
    /// </summary>
    [HttpPost("register-token")]
    public async Task<ActionResult> RegisterToken([FromBody] RegisterTokenRequest request)
    {
        var userId = GetCurrentUserId();
        await _tokenRegistry.RegisterTokenAsync(userId, request.TokenSerial, "", "");
        return Ok(new { success = true, message = "Token đã được đăng ký" });
    }

    #region Private Methods

    private async Task<SignDocumentResponse> SignDocumentInternal(
        Guid userId, Pkcs11SessionEntry session, SignDocumentRequest request)
    {
        // Generate HTML from document
        byte[] htmlBytes;
        try
        {
            htmlBytes = request.DocumentType switch
            {
                "EMR" => await _pdfGeneration.GenerateEmrPdfAsync(request.DocumentId, "summary"),
                "Prescription" => await _pdfGeneration.GeneratePrescriptionAsync(request.DocumentId),
                "LabResult" => await _pdfGeneration.GenerateLabResultAsync(request.DocumentId),
                "Discharge" => await _pdfGeneration.GenerateDischargeLetterAsync(request.DocumentId),
                "Referral" => await _pdfGeneration.GenerateEmrPdfAsync(request.DocumentId, "referral"),
                _ => await _pdfGeneration.GenerateEmrPdfAsync(request.DocumentId, "summary")
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error generating HTML for {DocumentType} {DocumentId}", request.DocumentType, request.DocumentId);
            return new SignDocumentResponse { Success = false, Message = $"Lỗi tạo PDF: {ex.Message}" };
        }

        // Convert HTML to PDF and sign
        var signerName = session.CertificateSubject;
        var signResult = await _pdfService.ConvertAndSignAsync(
            htmlBytes, session.Certificate, _config,
            request.Reason, request.Location, signerName);

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

        _db.DocumentSignatures.Add(signature);
        await _db.SaveChangesAsync();

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

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        throw new UnauthorizedAccessException("User ID not found in token");
    }

    #endregion
}

public class RevokeSignatureRequest
{
    public string Reason { get; set; } = string.Empty;
}
