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

public partial class DigitalSignatureController
{
    /// <summary>
    /// Get signatures for a document
    /// </summary>
    [HttpGet("signatures/{documentId:guid}")]
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
                Status = ds.Status,
                CertificateSubject = ds.CertificateSubject,
            })
            .ToListAsync();

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
        // Lấy danh sách examId thuộc record
        var examIds = await _db.Examinations
            .Where(e => e.MedicalRecordId == medicalRecordId && !e.IsDeleted)
            .Select(e => e.Id)
            .ToListAsync();

        // Lấy prescriptionId thuộc HSBA (dùng MedicalRecordId để tránh null-nullable Guid? mismatch)
        var rxIds = await _db.Prescriptions
            .Where(rx => rx.MedicalRecordId == medicalRecordId && !rx.IsDeleted)
            .Select(rx => rx.Id).ToListAsync();

        // Lấy serviceRequestId thuộc HSBA
        var srIds = await _db.ServiceRequests
            .Where(sr => sr.MedicalRecordId == medicalRecordId && !sr.IsDeleted)
            .Select(sr => sr.Id).ToListAsync();

        var allDocIds = examIds
            .Concat(rxIds)
            .Concat(srIds)
            .Concat(new[] { medicalRecordId }) // chính record
            .ToHashSet();

        var query = _db.DocumentSignatures
            .Include(ds => ds.SignedByUser)
            .Where(ds => allDocIds.Contains(ds.DocumentId));

        if (!string.IsNullOrEmpty(documentType))
            query = query.Where(ds => ds.DocumentType == documentType);

        var list = await query
            .OrderByDescending(ds => ds.SignedAt)
            .Select(ds => new DocumentSignatureHistoryDto
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
            })
            .ToListAsync();

        return Ok(list);
    }

    /// <summary>
    /// Download a signed PDF by signature ID
    /// </summary>
    [HttpGet("download/{signatureId}")]
    public async Task<IActionResult> DownloadSignedPdf(Guid signatureId)
    {
        var signature = await _db.DocumentSignatures.FindAsync(signatureId);
        if (signature == null)
            return NotFound(new { message = "Không tìm thấy chữ ký" });

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

        return NotFound(new { message = "File PDF đã ký không tồn tại" });
    }

    /// <summary>
    /// Get signatures for multiple documents (batch lookup)
    /// </summary>
    [HttpPost("signatures/batch")]
    public async Task<ActionResult<Dictionary<string, DocumentSignatureDto>>> GetSignaturesBatch([FromBody] List<Guid> documentIds)
    {
        if (documentIds == null || documentIds.Count == 0)
            return Ok(new Dictionary<string, DocumentSignatureDto>());

        // Limit batch size
        var ids = documentIds.Take(100).ToList();

        var signatures = await _db.DocumentSignatures
            .Where(ds => ids.Contains(ds.DocumentId) && ds.Status == 0)
            .Include(ds => ds.SignedByUser)
            .GroupBy(ds => ds.DocumentId)
            .Select(g => g.OrderByDescending(ds => ds.SignedAt).First())
            .ToListAsync();

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
