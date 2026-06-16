using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Infrastructure.Services;

namespace HIS.API.Controllers;

/// <summary>
/// Endpoint xuất/nhập XML HSBA theo Công văn 365/KCB-CNTT.
/// Yêu cầu xác thực (JWT). Export trả file XML attachment.
/// </summary>
[ApiController]
[Route("api/emr/cv365")]
[Authorize]
public class Cv365Controller : ControllerBase
{
    private readonly ICv365XmlService _cv365;

    public Cv365Controller(ICv365XmlService cv365)
    {
        _cv365 = cv365;
    }

    /// <summary>
    /// Xuất XML HSBA theo chuẩn CV365 cho một hồ sơ bệnh án.
    /// GET api/emr/cv365/export/{recordId}
    /// Response: application/xml; Content-Disposition: attachment; filename="hsba-{recordId}.xml"
    /// </summary>
    [HttpGet("export/{recordId:guid}")]
    public async Task<IActionResult> ExportRecord(Guid recordId)
    {
        try
        {
            var xml = await _cv365.ExportRecordXmlAsync(recordId);
            var bytes = System.Text.Encoding.UTF8.GetBytes(xml);
            return File(bytes, "application/xml", $"hsba-{recordId}.xml");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi xuất XML HSBA.", detail = ex.Message });
        }
    }
}
