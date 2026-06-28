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
using HIS.API.Controllers;

namespace HIS.API.Dtos.DigitalSignature;

public class RevokeSignatureRequest
{
    public string Reason { get; set; } = string.Empty;
}

/// <summary>Nội dung tài liệu (chưa ký) trả cho client gửi sang VGCA Sign Service.</summary>
public class DocumentContentResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string FileType { get; set; } = "pdf"; // pdf | xml
    public string? FileName { get; set; }
    public string? Base64 { get; set; }
}

/// <summary>Tài liệu đã ký từ client (VGCA Sign Service ký bằng USB token máy trạm).</summary>
public class SubmitSignedRequest
{
    public Guid DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileType { get; set; } = "pdf"; // pdf | xml
    public string SignedBase64 { get; set; } = string.Empty;
    public string? SignerName { get; set; }
    public string? CertificateSubject { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CaProvider { get; set; }
}

/// <summary>
/// #84 — Lịch sử ký đầy đủ (bao gồm đã thu hồi) cho một tài liệu hoặc toàn bộ HSBA.
/// Status: 0 = Hiệu lực, 1 = Đã thu hồi.
/// </summary>
public class DocumentSignatureHistoryDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentCode { get; set; } = string.Empty;
    public string SignerName { get; set; } = string.Empty;
    public string SignedAt { get; set; } = string.Empty;
    public string CertificateSerial { get; set; } = string.Empty;
    public string CaProvider { get; set; } = string.Empty;
    public string? TsaTimestamp { get; set; }
    public string? OcspStatus { get; set; }
    /// <summary>0 = Hiệu lực, 1 = Đã thu hồi</summary>
    public int Status { get; set; }
    public string? RevokeReason { get; set; }
    public string? RevokedAt { get; set; }
    public string? CertificateSubject { get; set; }
    public string? SignedDocumentUrl { get; set; }
}

