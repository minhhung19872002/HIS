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
    /// #84 — Ký số per y lệnh (Prescription / Order).
    /// Reuse SignDocument endpoint với documentType="Prescription" hoặc "Order".
    /// Endpoint này là alias rõ ràng cho FE drawer.
    /// POST /api/digital-signature/sign-order
    /// Body: { documentId, documentType:"Prescription"|"Order", pin?, reason, location }
    /// </summary>
    [HttpPost("sign-order")]
    public async Task<ActionResult<SignDocumentResponse>> SignOrder([FromBody] SignDocumentRequest request)
    {
        // Validate documentType thuộc nhóm y lệnh
        var allowedTypes = new[] { "Prescription", "Order", "LabResult", "Radiology", "NursingOrder" };
        if (!allowedTypes.Contains(request.DocumentType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new SignDocumentResponse
            {
                Success = false,
                Message = $"documentType '{request.DocumentType}' không thuộc nhóm y lệnh. Dùng: {string.Join(", ", allowedTypes)}"
            });
        }
        // Delegate sang SignDocument — tái dùng hoàn toàn logic
        return await SignDocument(request);
    }

    /// <summary>
    /// #84 — Hủy ký per y lệnh (alias có body tường minh hơn).
    /// POST /api/digital-signature/revoke-order/{signatureId}
    /// </summary>
    [HttpPost("revoke-order/{signatureId:guid}")]
    public async Task<ActionResult> RevokeOrder(Guid signatureId, [FromBody] RevokeSignatureRequest request)
    {
        // Delegate sang RevokeSignature đã có
        return await RevokeSignature(signatureId, request);
    }
}
