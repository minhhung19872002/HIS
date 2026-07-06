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
    /// Get documents pending signature for current user
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingDocuments()
    {
        try
        {
            var userId = GetCurrentUserId();
            return Ok(await _signatureStore.GetPendingDocumentsAsync(userId));
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

        // Tự thu hồi chữ ký cũ đang hiệu lực + thêm chữ ký mới trong cùng 1 transaction (verbatim).
        await _signatureStore.RevokeThenAddInOneSaveAsync(request.DocumentId, request.DocumentType, userId, signature);

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
