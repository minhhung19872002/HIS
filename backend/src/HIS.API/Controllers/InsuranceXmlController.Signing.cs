using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Insurance;

namespace HIS.API.Controllers;

// #441: ký số đợt XML BHYT — mô hình client-side USB-token (quyết định 2026-08-02).
// Backend chỉ (a) phát nội dung cần ký, (b) VERIFY chữ ký bằng public key trong chứng thư.
// Khóa bí mật nằm trong token của kế toán, KHÔNG bao giờ đi qua server.
public partial class InsuranceXmlController
{
    /// <summary>Lấy nội dung đợt XML cần ký (zip base64 + digest SHA-256) cho plugin USB-token.</summary>
    [HttpGet("xml/{batchId}/sign-payload")]
    public async Task<ActionResult<XmlSignPayloadDto>> GetXmlSignPayload(Guid batchId)
    {
        var payload = await _insuranceService.GetXmlSignPayloadAsync(batchId);
        if (payload == null)
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy đợt XML hoặc file đã bị xoá. Vui lòng xuất lại." });
        return Ok(payload);
    }

    /// <summary>Nhận chữ ký từ plugin. BE verify chữ ký khớp nội dung đợt rồi mới ghi nhận.</summary>
    [HttpPost("xml/{batchId}/signature")]
    [Consumes("application/json")]
    public async Task<ActionResult<XmlSignatureResultDto>> SubmitXmlSignature(
        Guid batchId, [FromBody] SubmitXmlSignatureDto dto)
    {
        var result = await _insuranceService.ApplyXmlSignatureAsync(batchId, dto, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
}
