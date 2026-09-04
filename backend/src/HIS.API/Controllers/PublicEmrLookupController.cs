using HIS.Application.DTOs.PublicEmr;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Cổng tra cứu công khai HSBA đã ký số — bệnh nhân nhập CCCD + ngày sinh, KHÔNG cần đăng nhập.
/// Privacy P0: bắt buộc 2 yếu tố, token ngắn hạn cho phép tải PDF, rate-limit theo IP, audit mỗi lượt.
/// </summary>
[ApiController]
[Route("api/public-emr")]
[AllowAnonymous]
public class PublicEmrLookupController : ControllerBase
{
    private readonly IPublicEmrLookupService _service;

    public PublicEmrLookupController(IPublicEmrLookupService service)
    {
        _service = service;
    }

    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
    private string? ClientUserAgent => Request.Headers.UserAgent.ToString();

    /// <summary>
    /// Tra cứu danh sách tài liệu HSBA đã ký số khớp CCCD + ngày sinh.
    /// </summary>
    [HttpPost("lookup")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicEmrLookupResponse>> Lookup([FromBody] PublicEmrLookupRequest request)
    {
        if (request == null)
            return Ok(new PublicEmrLookupResponse
            {
                Success = false,
                Message = "Thiếu dữ liệu tra cứu."
            });

        var result = await _service.LookupAsync(request, ClientIp, ClientUserAgent, Request.Path);
        return Ok(result);
    }

    /// <summary>
    /// Tải file PDF đã ký của 1 tài liệu — chỉ khi token tra cứu hợp lệ và tài liệu thuộc phiên đó.
    /// </summary>
    [HttpGet("document/{documentId:guid}/pdf")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadPdf(Guid documentId, [FromQuery] string? token)
    {
        var file = await _service.GetDocumentPdfAsync(documentId, token, ClientIp, ClientUserAgent, Request.Path);
        if (file == null)
            return NotFound(new { error = "NOT_FOUND", message = "Không thể truy cập tài liệu. Vui lòng tra cứu lại." });

        return File(file.Content, file.ContentType, file.FileName);
    }
}
