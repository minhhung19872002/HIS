using System.Security.Claims;
using HIS.Core.Constants;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using HIS.API.Dtos.DigitalSignature;

namespace HIS.API.Controllers;

public partial class DigitalSignatureController
{
    /// <summary>
    /// Get signatures for a document
    /// </summary>
    [HttpGet("signatures/{documentId:guid}")]
    public async Task<ActionResult<List<DocumentSignatureDto>>> GetSignatures(Guid documentId)
    {
        var entities = await _signatureStore.GetActiveSignaturesForDocumentAsync(documentId);
        var signatures = entities.Select(ds => new DocumentSignatureDto
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
            Status = ds.Status,
            CertificateSubject = ds.CertificateSubject,
        }).ToList();

        // Post-process to parse org name and tax code from CertificateSubject
        foreach (var sig in signatures)
        {
            sig.OrganizationName = ParseOrganizationName(sig.CertificateSubject);
            sig.TaxCode = ParseTaxCode(sig.CertificateSubject);
        }

        return Ok(signatures);
    }

    /// <summary>
    /// Revoke a signature (unlock document for re-signing)
    /// </summary>
    [HttpPost("revoke-signature/{signatureId}")]
    public async Task<ActionResult> RevokeSignature(Guid signatureId, [FromBody] RevokeSignatureRequest request)
    {
        var userId = GetCurrentUserId();
        var signature = await _signatureStore.GetSignatureByIdAsync(signatureId);

        if (signature == null)
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy chữ ký" });

        if (signature.Status != 0)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Chữ ký đã bị thu hồi" });

        // Only the signer or admin can revoke
        if (signature.SignedByUserId != userId)
        {
            var isAdmin = User.IsInRole("Admin");
            if (!isAdmin)
                return Forbid();
        }

        await _signatureStore.RevokeSignatureAsync(signatureId, request.Reason, userId);

        _logger.LogInformation("Signature {SignatureId} revoked by user {UserId}", signatureId, userId);
        return Ok(new { message = "Đã thu hồi chữ ký" });
    }

    /// <summary>
    /// #84 — List toàn bộ lịch sử ký (bao gồm đã thu hồi) cho một HSBA.
    /// Tra theo documentType lọc tất cả DocumentId thuộc record đó.
    /// GET /api/digital-signature/record-signatures/{medicalRecordId}?documentType=Prescription
    /// documentType: "" = tất cả, "Prescription", "Order", "EMR", "LabResult", ...
    /// </summary>
    [HttpGet("record-signatures/{medicalRecordId:guid}")]
    public async Task<ActionResult<List<DocumentSignatureHistoryDto>>> GetRecordSignatures(
        Guid medicalRecordId, [FromQuery] string? documentType = null)
    {
        var entities = await _signatureStore.GetRecordSignaturesAsync(medicalRecordId, documentType);

        var list = entities.Select(ds => new DocumentSignatureHistoryDto
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
            Status = ds.Status,
            RevokeReason = ds.RevokeReason,
            RevokedAt = ds.RevokedAt.HasValue ? ds.RevokedAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : null,
            CertificateSubject = ds.CertificateSubject,
            SignedDocumentUrl = ds.Id != Guid.Empty ? $"/api/digital-signature/download/{ds.Id}" : null,
        }).ToList();

        return Ok(list);
    }

    /// <summary>
    /// Download a signed PDF by signature ID
    /// </summary>
    [HttpGet("download/{signatureId}")]
    public async Task<IActionResult> DownloadSignedPdf(Guid signatureId)
    {
        var signature = await _signatureStore.GetSignatureByIdAsync(signatureId);
        if (signature == null)
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy chữ ký" });

        // Try reading from disk path
        if (!string.IsNullOrEmpty(signature.SignedDocumentPath) && System.IO.File.Exists(signature.SignedDocumentPath))
        {
            var bytes = await System.IO.File.ReadAllBytesAsync(signature.SignedDocumentPath);
            var fileName = Path.GetFileName(signature.SignedDocumentPath);
            return File(bytes, "application/pdf", fileName);
        }

        // Fallback: decode SignatureValue (base64 of signed PDF)
        if (!string.IsNullOrEmpty(signature.SignatureValue))
        {
            try
            {
                var bytes = Convert.FromBase64String(signature.SignatureValue);
                var fileName = $"{signature.DocumentType}_{signature.DocumentId:N}_{signature.SignedAt:yyyyMMddHHmmss}.pdf";
                return File(bytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode SignatureValue for {SignatureId}", signatureId);
            }
        }

        return NotFound(new { error = "NOT_FOUND", message = "File PDF đã ký không tồn tại" });
    }

    /// <summary>
    /// Get signatures for multiple documents (batch lookup)
    /// </summary>
    [HttpPost("signatures/batch")]
    public async Task<ActionResult<Dictionary<string, DocumentSignatureDto>>> GetSignaturesBatch([FromBody] List<Guid> documentIds)
    {
        if (documentIds == null || documentIds.Count == 0)
            return Ok(new Dictionary<string, DocumentSignatureDto>());

        var signatures = await _signatureStore.GetLatestActiveSignaturesBatchAsync(documentIds);

        var result = signatures.ToDictionary(
            ds => ds.DocumentId.ToString(),
            ds =>
            {
                var dto = new DocumentSignatureDto
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
                    Status = ds.Status,
                    CertificateSubject = ds.CertificateSubject,
                };
                dto.OrganizationName = ParseOrganizationName(ds.CertificateSubject);
                dto.TaxCode = ParseTaxCode(ds.CertificateSubject);
                return dto;
            });

        return Ok(result);
    }
}
