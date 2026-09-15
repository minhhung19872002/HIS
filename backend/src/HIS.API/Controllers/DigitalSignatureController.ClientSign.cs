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

        // QA-R3 patient safety: USB-token signature of a prescription / order goes through the same CCHN gate.
        if (HIS.API.Filters.RequirePracticeLicenseAttribute.IsClinicalOrderDocument(request.DocumentType)
            && await HIS.API.Filters.RequirePracticeLicenseAttribute.CheckAsync(HttpContext) is ObjectResult licenceBlocked)
            return licenceBlocked;

        // DocumentType becomes a directory name below — reject path separators / ".." (path traversal).
        if (!IsSafeDocumentTypeSegment(request.DocumentType))
            return Ok(new SignDocumentResponse { Success = false, Message = "Loại tài liệu không hợp lệ" });

        var userId = GetCurrentUserId();
        var ext = string.Equals(request.FileType, "xml", StringComparison.OrdinalIgnoreCase) ? "xml" : "pdf";

        // QA0915 (P0): the backend used to store ANY base64 blob + client-claimed certificate fields as an
        // active signature (forgeable "đã ký"). Require a cryptographically valid embedded signature.
        var invalidReason = ext == "pdf" ? VerifySubmittedPdf(signedBytes) : VerifySubmittedXml(signedBytes);
        if (invalidReason != null)
        {
            _logger.LogWarning("submit-signed rejected for {Type} {Id} by {UserId}: {Reason}", request.DocumentType, request.DocumentId, userId, invalidReason);
            return Ok(new SignDocumentResponse { Success = false, Message = invalidReason });
        }

        // QA0915: must not silently revoke another user's active signature (RevokeSignature rule).
        var resignBlock = await GetResignBlockReasonAsync(request.DocumentId, request.DocumentType, userId);
        if (resignBlock != null)
            return Ok(new SignDocumentResponse { Success = false, Message = resignBlock });

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

    /// <summary>PAdES: at least one embedded signature and every signature verifies (integrity + authenticity).</summary>
    private string? VerifySubmittedPdf(byte[] pdfBytes)
    {
        var v = _pdfService.VerifyPdfSignatures(pdfBytes);
        if (v.SignatureCount == 0) return "Tệp PDF không chứa chữ ký số.";
        return v.Valid ? null : "Chữ ký số trong tệp PDF không hợp lệ.";
    }

    /// <summary>XAdES/XMLDSig: every ds:Signature element verifies with the key/certificate in its KeyInfo.</summary>
    private static string? VerifySubmittedXml(byte[] xmlBytes)
    {
        try
        {
            var xml = new System.Xml.XmlDocument { PreserveWhitespace = true, XmlResolver = null };
            using (var ms = new MemoryStream(xmlBytes))
            using (var reader = System.Xml.XmlReader.Create(ms, new System.Xml.XmlReaderSettings { DtdProcessing = System.Xml.DtdProcessing.Prohibit, XmlResolver = null }))
                xml.Load(reader);
            var nodes = xml.GetElementsByTagName("Signature", System.Security.Cryptography.Xml.SignedXml.XmlDsigNamespaceUrl);
            if (nodes.Count == 0) return "Tệp XML không chứa chữ ký số.";
            foreach (System.Xml.XmlElement node in nodes)
            {
                var signedXml = new System.Security.Cryptography.Xml.SignedXml(xml);
                signedXml.LoadXml(node);
                if (!signedXml.CheckSignature()) return "Chữ ký số trong tệp XML không hợp lệ.";
            }
            return null;
        }
        catch (Exception)
        {
            return "Tệp XML đã ký không đọc/xác thực được.";
        }
    }
}
