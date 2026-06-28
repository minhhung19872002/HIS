using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.SurgeryComplete;

namespace HIS.API.Controllers;

public partial class SurgeryCompleteController
{
    /// <summary>
    /// Lấy danh sách cam kết của ca mổ
    /// </summary>
    [HttpGet("{surgeryId}/consents")]
    public async Task<IActionResult> GetConsents(Guid surgeryId)
    {
        var result = await _surgeryService.GetSurgeryConsentsAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo/cập nhật cam kết
    /// </summary>
    [HttpPost("consents")]
    public async Task<IActionResult> SaveConsent([FromBody] SaveSurgeryConsentDto dto)
    {
        var result = await _surgeryService.SaveSurgeryConsentAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ký cam kết
    /// </summary>
    [HttpPut("consents/{consentId}/sign")]
    public async Task<IActionResult> SignConsent(Guid consentId, [FromBody] SignConsentRequest request)
    {
        var result = await _surgeryService.SignConsentAsync(consentId, request.SignerName, request.Relationship, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cam kết trước khi mổ
    /// </summary>
    [HttpGet("{surgeryId}/consents/validate")]
    public async Task<IActionResult> ValidateConsents(Guid surgeryId)
    {
        var result = await _surgeryService.ValidateConsentsBeforeSurgeryAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// In cam kết
    /// </summary>
    [HttpGet("consents/{consentId}/print")]
    public async Task<IActionResult> PrintConsent(Guid consentId)
    {
        var result = await _surgeryService.PrintConsentFormAsync(consentId);
        if (result.Length == 0)
            return Ok(new { message = "Tính năng in cam kết đang phát triển" });
        return File(result, "application/pdf", "consent.pdf");
    }
}
