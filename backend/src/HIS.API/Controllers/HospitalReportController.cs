using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Infrastructure.Services;
using System.Text;
using System.Text.Json;
using HIS.API.Dtos.HospitalReport;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Hospital Report Controller - Generic endpoint for all 140 report codes
    /// Routes: /api/reports/hospital/{reportCode}
    /// Also includes birth certificate print endpoint
    /// </summary>
    [ApiController]
    [Route("api/reports/hospital")]
    [Authorize]
    public class HospitalReportController : ControllerBase
    {
        private readonly IHospitalReportService _service;
        private readonly IEmailService _emailService;
        private readonly ILogger<HospitalReportController> _logger;

        public HospitalReportController(IHospitalReportService service, IEmailService emailService, ILogger<HospitalReportController> logger)
        {
            _service = service;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Generic report endpoint handling all 140 report codes
        /// GET /api/reports/hospital/{reportCode}?from=2026-01-01&amp;to=2026-01-31&amp;departmentId=xxx&amp;warehouseId=yyy
        /// </summary>
        [HttpGet("{reportCode}")]
        public async Task<IActionResult> GetReport(
            string reportCode,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? warehouseId = null)
        {
            try
            {
                var result = await _service.GetReportDataAsync(reportCode, from, to, departmentId, warehouseId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report {ReportCode}", reportCode);
                return StatusCode(500, ApiResponse<HospitalReportResult>.ErrorResponse($"Loi tao bao cao: {ex.Message}"));
            }
        }

        /// <summary>
        /// Gửi báo cáo qua email (MockMode khi chưa có SMTP)
        /// POST /api/reports/hospital/{reportCode}/send-email
        /// Body: { toEmail, from?, to? }
        /// </summary>
        [HttpPost("{reportCode}/send-email")]
        public async Task<IActionResult> SendReportEmail(
            string reportCode,
            [FromBody] SendReportEmailDto dto,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.ToEmail))
                return BadRequest(new { error = "VALIDATION_FAILED", message = "toEmail không được để trống" });

            var fromDate = dto.From.HasValue ? dto.From : from;
            var toDate = dto.To.HasValue ? dto.To : to;

            try
            {
                var reportData = await _service.GetReportDataAsync(reportCode, fromDate, toDate, null, null);

                // Serialize report to JSON for attachment
                var json = JsonSerializer.Serialize(reportData, new JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
                var bytes = Encoding.UTF8.GetBytes(json);
                var fileName = $"baocao-{reportCode}-{DateTime.Now:yyyyMMdd}.json";

                var sent = await _emailService.SendReportAsync(dto.ToEmail.Trim(), reportData.ReportName, bytes, fileName);
                if (sent)
                    return Ok(new { message = $"Đã gửi báo cáo '{reportData.ReportName}' tới {dto.ToEmail}" });

                return StatusCode(500, new { message = "Gửi email thất bại" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending report email {ReportCode}", reportCode);
                return StatusCode(500, new { message = $"Lỗi gửi báo cáo: {ex.Message}" });
            }
        }

        /// <summary>
        /// Print birth certificate (Giay chung sinh)
        /// POST /api/reports/hospital/print/birth-certificate
        /// Returns HTML content for browser printing
        /// </summary>
        [HttpPost("print/birth-certificate")]
        public async Task<IActionResult> PrintBirthCertificate([FromBody] BirthCertificateDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.BabyFullName))
                    return BadRequest(ApiResponse<string>.ErrorResponse("Ten tre so sinh khong duoc de trong"));
                if (string.IsNullOrWhiteSpace(dto.MotherFullName))
                    return BadRequest(ApiResponse<string>.ErrorResponse("Ten me khong duoc de trong"));

                var html = await _service.GenerateBirthCertificateAsync(dto);
                return File(html, "text/html; charset=utf-8");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating birth certificate");
                return StatusCode(500, ApiResponse<string>.ErrorResponse($"Loi tao giay chung sinh: {ex.Message}"));
            }
        }
    }
}

