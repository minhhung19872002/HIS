using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.API.Filters;
using HIS.Application.Services;
using HIS.Application.DTOs.Common;
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using HIS.API.Dtos.RISComplete;

namespace HIS.API.Controllers
{
    public partial class RISCompleteController
    {
        /// <summary>
        /// Lấy danh sách cấu hình ký số
        /// </summary>
        [HttpGet("signature-configs")]
        public async Task<ActionResult<List<DigitalSignatureConfigDto>>> GetSignatureConfigs()
        {
            var result = await _risService.GetSignatureConfigsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình ký số
        /// </summary>
        [HttpPost("signature-configs")]
        public async Task<ActionResult<DigitalSignatureConfigDto>> SaveSignatureConfig([FromBody] SaveDigitalSignatureConfigDto dto)
        {
            var result = await _risService.SaveSignatureConfigAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình ký số
        /// </summary>
        [HttpDelete("signature-configs/{configId}")]
        public async Task<ActionResult> DeleteSignatureConfig(Guid configId)
        {
            await _risService.DeleteSignatureConfigAsync(configId);
            return NoContent();
        }

        /// <summary>
        /// Ký số kết quả
        /// </summary>
        [HttpPost("results/sign")]
        public async Task<ActionResult<SignResultResponseDto>> SignResult([FromBody] SignResultRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new SignResultResponseDto { Success = false, Message = "Request body is null" });
                }

                if (request.ReportId == Guid.Empty)
                {
                    return BadRequest(new SignResultResponseDto { Success = false, Message = "ReportId is required" });
                }

                var result = await _risService.SignResultAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new SignResultResponseDto { Success = false, Message = $"Error: {ex.Message}" });
            }
        }

        /// <summary>
        /// Hủy kết quả đã ký
        /// </summary>
        [HttpPost("results/cancel-signed")]
        public async Task<ActionResult> CancelSignedResult([FromBody] CancelSignedResultDto dto)
        {
            await _risService.CancelSignedResultAsync(dto);
            return Ok();
        }

        /// <summary>
        /// Lấy lịch sử ký số
        /// </summary>
        [HttpGet("reports/{reportId}/signature-history")]
        public async Task<ActionResult<List<SignatureHistoryDto>>> GetSignatureHistory(Guid reportId)
        {
            var result = await _risService.GetSignatureHistoryAsync(reportId);
            return Ok(result);
        }

        /// <summary>
        /// In kết quả đã ký số
        /// </summary>
        [HttpGet("reports/{reportId}/print-signed")]
        public async Task<ActionResult> PrintSignedResult(Guid reportId)
        {
            var result = await _risService.PrintSignedResultAsync(reportId);
            return File(result, "application/pdf", $"signed_result_{reportId}.pdf");
        }

        /// <summary>
        /// Lấy danh sách chứng thư số từ USB Token/SmartCard
        /// Windows tự động detect các certificate khi USB Token được cắm vào
        /// </summary>
        [HttpGet("usb-token/certificates")]
        public async Task<ActionResult<List<CertificateInfoDto>>> GetUSBTokenCertificates()
        {
            try
            {
                var certificates = await _digitalSignatureService.GetAvailableCertificatesAsync();
                return Ok(certificates);
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail($"Lỗi đọc chứng thư số: {ex.Message}"));
            }
        }

        /// <summary>
        /// Ký số bằng USB Token - Windows sẽ tự động bật dialog nhập PIN
        /// </summary>
        [HttpPost("usb-token/sign")]
        public async Task<ActionResult<SignatureResultDto>> SignWithUSBToken([FromBody] USBTokenSignRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.CertificateThumbprint))
                {
                    return BadRequest(new SignatureResultDto
                    {
                        Success = false,
                        Message = "Vui lòng chọn chứng thư số để ký"
                    });
                }

                // Prepare data to sign - typically the report content or hash
                var dataToSign = Encoding.UTF8.GetBytes(request.DataToSign ?? $"RIS Report {request.ReportId} - {DateTime.Now:yyyyMMddHHmmss}");

                // Call signing service - Windows will prompt for PIN via dialog
                var result = await _digitalSignatureService.SignDataAsync(dataToSign, request.CertificateThumbprint);

                // Try to save signature to database, but don't fail the whole operation if DB save fails
                if (result.Success && !string.IsNullOrEmpty(request.ReportId) && Guid.TryParse(request.ReportId, out var reportGuid))
                {
                    try
                    {
                        // Save signature to database through RIS service
                        var saved = await _risService.SignResultAsync(new SignResultRequestDto
                        {
                            ReportId = reportGuid,
                            SignatureType = "USBToken",
                            Note = $"Signed with certificate: {result.SignerName}"
                        });

                        // #218/T3: `SignResultAsync` nay TỪ CHỐI (trả Success=false, không ném) khi phiếu
                        // đã có chữ ký còn hiệu lực hoặc chỉ định chưa có phiếu đọc. Chỗ này vốn chỉ bắt
                        // exception, nên nếu không đọc cờ trả về thì chữ ký USB đã tạo bên Windows sẽ
                        // KHÔNG được lưu mà người dùng vẫn thấy báo "ký số thành công".
                        if (!saved.Success)
                        {
                            _logger.LogWarning("Không lưu được chữ ký vào hồ sơ {ReportId}: {Message}",
                                reportGuid, saved.Message);
                            result.Message = $"Ký số thành công nhưng chưa lưu vào hồ sơ: {saved.Message}";
                        }
                    }
                    catch (Exception dbEx)
                    {
                        // Log the error but don't fail - signature was still created successfully
                        _logger.LogWarning(dbEx, "Could not save signature to database: {Message}", dbEx.Message);
                        // Optionally add a note to the result
                        result.Message = "Ký số thành công (chưa lưu vào hồ sơ - báo cáo không tồn tại hoặc đã ký)";
                    }
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new SignatureResultDto
                {
                    Success = false,
                    Message = $"Lỗi ký số: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Kiểm tra USB Token có sẵn không
        /// </summary>
        [HttpGet("usb-token/status")]
        public async Task<ActionResult> GetUSBTokenStatus()
        {
            try
            {
                var certificates = await _digitalSignatureService.GetAvailableCertificatesAsync();
                var hasValidCert = certificates.Any(c => c.IsValid && c.HasPrivateKey);

                return Ok(new
                {
                    available = certificates.Count > 0,
                    hasValidCertificate = hasValidCert,
                    certificateCount = certificates.Count,
                    message = certificates.Count > 0
                        ? $"Tìm thấy {certificates.Count} chứng thư số có thể sử dụng"
                        : "Không tìm thấy USB Token. Vui lòng kiểm tra đã cắm USB Token và cài đặt driver.",
                    certificates = certificates.Select(c => new
                    {
                        c.Thumbprint,
                        c.SubjectName,
                        c.IssuerName,
                        ValidFrom = c.ValidFrom.ToString("dd/MM/yyyy"),
                        ValidTo = c.ValidTo.ToString("dd/MM/yyyy"),
                        c.IsValid
                    })
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail($"Lỗi kiểm tra USB Token: {ex.Message}"));
            }
        }

        /// <summary>
        /// Tạo và ký số PDF báo cáo CĐHA
        /// </summary>
        [HttpPost("pdf/generate-and-sign")]
        public async Task<ActionResult> GenerateAndSignPdf([FromBody] GenerateSignPdfRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.CertificateThumbprint))
                {
                    return BadRequest(new { success = false, message = "Vui lòng chọn chứng thư số để ký" });
                }

                // Build report data from request
                var reportData = new RadiologyReportData
                {
                    PatientCode = request.PatientCode ?? "",
                    PatientName = request.PatientName ?? "",
                    Gender = request.Gender,
                    Age = request.Age,
                    DateOfBirth = request.DateOfBirth,
                    Address = request.Address,
                    PhoneNumber = request.PhoneNumber,
                    RequestCode = request.RequestCode ?? "",
                    RequestDate = request.RequestDate ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                    DepartmentName = request.DepartmentName,
                    RequestingDoctorName = request.RequestingDoctorName,
                    Diagnosis = request.Diagnosis,
                    ClinicalInfo = request.ClinicalInfo,
                    ServiceCode = request.ServiceCode ?? "",
                    ServiceName = request.ServiceName ?? "",
                    ServiceType = request.ServiceType,
                    ResultDate = request.ResultDate ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                    Description = request.Description,
                    Conclusion = request.Conclusion,
                    Recommendation = request.Recommendation,
                    TechnicianName = request.TechnicianName,
                    DoctorName = request.DoctorName,
                    HospitalName = request.HospitalName ?? "BỆNH VIỆN",
                    HospitalAddress = request.HospitalAddress,
                    HospitalPhone = request.HospitalPhone,
                    AttachedImages = request.AttachedImages?.Select(i => new AttachedImageData
                    {
                        FileName = i.FileName ?? "",
                        Base64Data = i.Base64Data ?? "",
                        Description = i.Description
                    }).ToList() ?? new List<AttachedImageData>()
                };

                // Generate and sign PDF
                var result = await _pdfSignatureService.GenerateAndSignRadiologyReportAsync(
                    reportData,
                    request.CertificateThumbprint);

                if (!result.Success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = result.Message
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = result.Message,
                    signedFilePath = result.SignedFilePath,
                    signerName = result.SignerName,
                    signedAt = result.SignedAt,
                    certificateSerial = result.CertificateSerial,
                    certificateThumbprint = result.CertificateThumbprint,
                    // Return base64 of signed PDF for download
                    signedPdfBase64 = result.SignedPdfBytes != null
                        ? Convert.ToBase64String(result.SignedPdfBytes)
                        : null
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Lỗi tạo và ký PDF: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Tải file PDF đã ký
        /// </summary>
        [HttpGet("pdf/download/{fileName}")]
        public IActionResult DownloadSignedPdf(string fileName)
        {
            try
            {
                // #402: chặn path traversal — chỉ chấp nhận tên file .pdf thuần, không có phân cách đường dẫn
                if (string.IsNullOrWhiteSpace(fileName)
                    || fileName != Path.GetFileName(fileName)
                    || fileName.Contains("..")
                    || !fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(ApiResponse<object>.Fail("Tên file không hợp lệ"));
                }

                var reportsRoot = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Radiology");
                var filePath = Path.GetFullPath(Path.Combine(reportsRoot, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(reportsRoot) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                {
                    return BadRequest(ApiResponse<object>.Fail("Tên file không hợp lệ"));
                }
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(ApiResponse<object>.Fail("File không tồn tại"));
                }

                var fileBytes = System.IO.File.ReadAllBytes(filePath);
                return File(fileBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail($"Lỗi tải file: {ex.Message}"));
            }
        }

        /// <summary>
        /// Tạo PDF preview (không ký) để xem trước
        /// </summary>
        [HttpPost("pdf/preview")]
        public async Task<ActionResult> GeneratePdfPreview([FromBody] GenerateSignPdfRequest request)
        {
            try
            {
                var reportData = new RadiologyReportData
                {
                    PatientCode = request.PatientCode ?? "",
                    PatientName = request.PatientName ?? "",
                    Gender = request.Gender,
                    Age = request.Age,
                    DateOfBirth = request.DateOfBirth,
                    Address = request.Address,
                    PhoneNumber = request.PhoneNumber,
                    RequestCode = request.RequestCode ?? "",
                    RequestDate = request.RequestDate ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                    DepartmentName = request.DepartmentName,
                    RequestingDoctorName = request.RequestingDoctorName,
                    Diagnosis = request.Diagnosis,
                    ClinicalInfo = request.ClinicalInfo,
                    ServiceCode = request.ServiceCode ?? "",
                    ServiceName = request.ServiceName ?? "",
                    ServiceType = request.ServiceType,
                    ResultDate = request.ResultDate ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                    Description = request.Description,
                    Conclusion = request.Conclusion,
                    Recommendation = request.Recommendation,
                    TechnicianName = request.TechnicianName,
                    DoctorName = request.DoctorName,
                    HospitalName = request.HospitalName ?? "BỆNH VIỆN",
                    HospitalAddress = request.HospitalAddress,
                    HospitalPhone = request.HospitalPhone,
                    AttachedImages = request.AttachedImages?.Select(i => new AttachedImageData
                    {
                        FileName = i.FileName ?? "",
                        Base64Data = i.Base64Data ?? "",
                        Description = i.Description
                    }).ToList() ?? new List<AttachedImageData>()
                };

                var result = await _pdfSignatureService.GenerateRadiologyReportPdfAsync(reportData);

                if (!result.Success)
                {
                    return BadRequest(ApiResponse<object>.Fail(result.Message));
                }

                return Ok(new
                {
                    filePath = result.FilePath,
                    pdfBase64 = result.PdfBytes != null ? Convert.ToBase64String(result.PdfBytes) : null
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.Fail($"Lỗi tạo PDF: {ex.Message}"));
            }
        }

        /// <summary>
        /// Thống kê ca chụp theo nhóm dịch vụ
        /// </summary>
        [HttpGet("statistics/by-service-type")]
        public async Task<ActionResult<ExamStatisticsByServiceTypeDto>> GetExamStatisticsByServiceType(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetExamStatisticsByServiceTypeAsync(fromDate, toDate);
            return Ok(result);
        }
    }
}
