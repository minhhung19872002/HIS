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
    /// Get documents pending signature for current user
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingDocuments()
    {
        try
        {
            var userId = GetCurrentUserId();

            // Find examinations completed but not signed by current doctor
            var pendingExams = await _db.Examinations
                .Where(e => e.DoctorId == userId && e.Status >= 2 && e.Status < 4 && !e.IsDeleted)
                .Join(_db.MedicalRecords, e => e.MedicalRecordId, m => m.Id, (e, m) => new { e, m })
                .Join(_db.Patients, em => em.m.PatientId, p => p.Id, (em, p) => new
                {
                    DocumentId = em.e.Id,
                    DocumentType = "Examination",
                    DocumentName = $"Phiếu khám - {p.FullName}",
                    PatientName = p.FullName,
                    PatientCode = p.PatientCode,
                    CreatedAt = em.e.CreatedAt,
                    Status = "Chờ ký"
                })
                .OrderByDescending(x => x.CreatedAt)
                .Take(50)
                .ToListAsync();

            // Find prescriptions not signed
            var pendingRx = await _db.Prescriptions
                .Where(p => p.DoctorId == userId && p.Status >= 1 && p.Status < 3 && !p.IsDeleted)
                .Join(_db.Examinations, rx => rx.ExaminationId, e => e.Id, (rx, e) => new { rx, e })
                .Join(_db.MedicalRecords, re => re.e.MedicalRecordId, m => m.Id, (re, m) => new { re.rx, m })
                .Join(_db.Patients, rm => rm.m.PatientId, p => p.Id, (rm, p) => new
                {
                    DocumentId = rm.rx.Id,
                    DocumentType = "Prescription",
                    DocumentName = $"Đơn thuốc - {p.FullName}",
                    PatientName = p.FullName,
                    PatientCode = p.PatientCode,
                    CreatedAt = rm.rx.CreatedAt,
                    Status = "Chờ ký"
                })
                .OrderByDescending(x => x.CreatedAt)
                .Take(50)
                .ToListAsync();

            var allPending = pendingExams.Cast<object>().Concat(pendingRx.Cast<object>())
                .OrderByDescending(x => ((dynamic)x).CreatedAt)
                .Take(50)
                .ToList();

            return Ok(allPending);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting pending documents");
            return Ok(Array.Empty<object>());
        }
    }

    /// <summary>
    /// Lấy nội dung tài liệu (PDF chưa ký) để client gửi sang VGCA Sign Service ký bằng USB token máy trạm.
    /// XML (XAdES) lấy nội dung từ API CDA (/api/cda) — endpoint này phục vụ PAdES/PDF.
    /// </summary>
    [HttpGet("content")]
    public async Task<ActionResult<DocumentContentResponse>> GetDocumentContent(
        [FromQuery] Guid documentId, [FromQuery] string documentType, [FromQuery] string fileType = "pdf")
    {
        if (!string.Equals(fileType, "pdf", StringComparison.OrdinalIgnoreCase))
            return Ok(new DocumentContentResponse { Success = false, Message = "Endpoint này sinh nội dung PDF; XML lấy từ API CDA (/api/cda)." });
        try
        {
            var htmlBytes = await GenerateDocumentHtmlAsync(documentId, documentType);
            var pdfBytes = await _pdfService.ConvertHtmlToPdfAsync(htmlBytes);
            return Ok(new DocumentContentResponse
            {
                Success = true,
                FileType = "pdf",
                FileName = $"{documentType}_{documentId.ToString()[..8]}.pdf",
                Base64 = Convert.ToBase64String(pdfBytes),
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetDocumentContent failed {Type} {Id}", documentType, documentId);
            return Ok(new DocumentContentResponse { Success = false, Message = $"Lỗi tạo nội dung tài liệu: {ex.Message}" });
        }
    }

    /// <summary>
    /// Nhận tài liệu đã ký (PDF/XML base64) từ client (sau khi VGCA Sign Service ký bằng USB token máy trạm),
    /// lưu file + tạo bản ghi DocumentSignature. Backend KHÔNG chạm token — chỉ lưu + truy vết.
    /// </summary>
    [HttpPost("submit-signed")]
    public async Task<ActionResult<SignDocumentResponse>> SubmitSigned([FromBody] SubmitSignedRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.SignedBase64))
            return Ok(new SignDocumentResponse { Success = false, Message = "Thiếu dữ liệu đã ký" });
        byte[] signedBytes;
        try { signedBytes = Convert.FromBase64String(request.SignedBase64); }
        catch { return Ok(new SignDocumentResponse { Success = false, Message = "Dữ liệu đã ký không hợp lệ (base64)" }); }

        var userId = GetCurrentUserId();
        var ext = string.Equals(request.FileType, "xml", StringComparison.OrdinalIgnoreCase) ? "xml" : "pdf";

        // Tự thu hồi chữ ký cũ đang hiệu lực để ký lại
        var existing = await _db.DocumentSignatures.FirstOrDefaultAsync(ds =>
            ds.DocumentId == request.DocumentId && ds.DocumentType == request.DocumentType && ds.Status == 0);
        if (existing != null)
        {
            existing.Status = 1;
            existing.RevokeReason = "Tự động thu hồi để ký lại";
            existing.RevokedAt = DateTime.UtcNow;
            existing.RevokedByUserId = userId;
        }

        var outputDir = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Signed", request.DocumentType);
        Directory.CreateDirectory(outputDir);
        var fileName = $"{request.DocumentId}_{DateTime.UtcNow:yyyyMMddHHmmss}.{ext}";
        var filePath = Path.Combine(outputDir, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, signedBytes);

        var signature = new DocumentSignature
        {
            DocumentId = request.DocumentId,
            DocumentType = request.DocumentType,
            DocumentCode = $"{request.DocumentType}-{request.DocumentId.ToString()[..8]}",
            SignedByUserId = userId,
            SignedAt = DateTime.UtcNow,
            CertificateSubject = request.CertificateSubject,
            CertificateSerial = request.CertificateSerial,
            CaProvider = string.IsNullOrEmpty(request.CaProvider) ? "VGCA Sign Service" : request.CaProvider,
            SignatureValue = request.SignedBase64,
            SignedDocumentPath = filePath,
            Status = 0,
        };
        _db.DocumentSignatures.Add(signature);
        await _db.SaveChangesAsync();

        return Ok(new SignDocumentResponse
        {
            Success = true,
            Message = "Lưu chữ ký thành công",
            SignerName = request.SignerName ?? request.CertificateSubject,
            SignedAt = signature.SignedAt.ToString("dd/MM/yyyy HH:mm:ss"),
            CertificateSerial = request.CertificateSerial,
            CaProvider = signature.CaProvider,
            SignedDocumentUrl = $"/api/digital-signature/download/{signature.Id}",
        });
    }
}
