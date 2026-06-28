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
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using HIS.API.Dtos.RISComplete;

namespace HIS.API.Controllers
{
    public partial class RISCompleteController
    {
        #region 8.3 Thực hiện CĐHA, TDCN

        /// <summary>
        /// Danh sách phiếu yêu cầu CĐHA
        /// </summary>
        [HttpGet("orders")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<List<RadiologyOrderDto>>> GetRadiologyOrders(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string serviceType = null,
            [FromQuery] string status = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetRadiologyOrdersAsync(fromDate, toDate, departmentId, serviceType, status, keyword);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết phiếu yêu cầu
        /// </summary>
        [HttpGet("orders/{orderId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<RadiologyOrderDto>> GetRadiologyOrder(Guid orderId)
        {
            var result = await _risService.GetRadiologyOrderAsync(orderId);
            if (result == null) return NotFound(new { message = "Order not found" });
            return Ok(result);
        }

        /// <summary>
        /// 8.3.1 Lấy mẫu kết quả theo loại dịch vụ
        /// </summary>
        [HttpGet("templates/by-service-type/{serviceTypeId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByServiceType(Guid serviceTypeId)
        {
            var result = await _risService.GetResultTemplatesByServiceTypeAsync(serviceTypeId);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.2 Lấy mẫu kết quả theo dịch vụ
        /// </summary>
        [HttpGet("templates/by-service/{serviceId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByService(Guid serviceId)
        {
            var result = await _risService.GetResultTemplatesByServiceAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.3 Lấy mẫu kết quả theo giới tính
        /// </summary>
        [HttpGet("templates/by-gender/{gender}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByGender(string gender)
        {
            var result = await _risService.GetResultTemplatesByGenderAsync(gender);
            return Ok(result);
        }

        /// <summary>
        /// Lấy tất cả mẫu kết quả
        /// </summary>
        [HttpGet("templates")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetAllResultTemplates([FromQuery] string keyword = null)
        {
            var result = await _risService.GetAllResultTemplatesAsync(keyword);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa mẫu kết quả
        /// </summary>
        [HttpPost("templates")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyResultTemplateDto>> SaveResultTemplate([FromBody] SaveResultTemplateDto dto)
        {
            var result = await _risService.SaveResultTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu kết quả
        /// </summary>
        [HttpDelete("templates/{templateId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> DeleteResultTemplate(Guid templateId)
        {
            await _risService.DeleteResultTemplateAsync(templateId);
            return NoContent();
        }

        /// <summary>
        /// 8.3.4 Đổi mẫu kết quả
        /// </summary>
        [HttpPost("results/change-template")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RadiologyResultDto>> ChangeResultTemplate([FromBody] ChangeResultTemplateDto dto)
        {
            var result = await _risService.ChangeResultTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.5 Nhập mô tả, kết luận và ghi chú
        /// </summary>
        [HttpPost("results/enter")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<RadiologyResultDto>> EnterRadiologyResult([FromBody] EnterRadiologyResultDto dto)
        {
            var result = await _risService.EnterRadiologyResultAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy kết quả CĐHA
        /// </summary>
        [HttpGet("order-items/{orderItemId}/result")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor)]
        public async Task<ActionResult<RadiologyResultDto>> GetRadiologyResult(Guid orderItemId)
        {
            var result = await _risService.GetRadiologyResultAsync(orderItemId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật kết quả CĐHA
        /// </summary>
        [HttpPut("results/{resultId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RadiologyResultDto>> UpdateRadiologyResult(
            Guid resultId,
            [FromBody] UpdateRadiologyResultDto dto)
        {
            var result = await _risService.UpdateRadiologyResultAsync(resultId, dto);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.6 Đính kèm ảnh
        /// </summary>
        [HttpPost("results/attach-image")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<AttachedImageDto>> AttachImage([FromBody] AttachImageDto dto)
        {
            var result = await _risService.AttachImageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa ảnh đính kèm
        /// </summary>
        [HttpDelete("results/images/{imageId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult> RemoveAttachedImage(Guid imageId)
        {
            await _risService.RemoveAttachedImageAsync(imageId);
            return NoContent();
        }

        /// <summary>
        /// Lấy ảnh từ PACS
        /// </summary>
        [HttpGet("pacs/studies")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<DicomStudyDto>>> GetStudiesFromPACS(
            [FromQuery] string patientId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _risService.GetStudiesFromPACSAsync(patientId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy series trong study
        /// </summary>
        [HttpGet("pacs/studies/{studyInstanceUID}/series")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<DicomSeriesDto>>> GetSeries(string studyInstanceUID)
        {
            var result = await _risService.GetSeriesAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Lấy images trong series
        /// </summary>
        [HttpGet("pacs/series/{seriesInstanceUID}/images")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<DicomImageDto>>> GetImages(string seriesInstanceUID)
        {
            var result = await _risService.GetImagesAsync(seriesInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Proxy Orthanc instance preview (avoid CORS)
        /// </summary>
        [HttpGet("pacs/instances/{instanceId}/preview")]
        [AllowAnonymous]
        public async Task<ActionResult> GetInstancePreview(string instanceId)
        {
            var pacsBaseUrl = _configuration["PACS:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:8042";
            var pacsUser = _configuration["PACS:Username"] ?? "";
            var pacsPass = _configuration["PACS:Password"] ?? "";

            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var response = await httpClient.GetAsync($"{pacsBaseUrl}/instances/{instanceId}/preview");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsByteArrayAsync();
                    var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/png";
                    return File(content, contentType);
                }
                return NotFound();
            }
            catch
            {
                return StatusCode(502, "Cannot connect to PACS server");
            }
        }

        /// <summary>
        /// Proxy Orthanc rendered image — full-resolution PNG, dùng cho main viewer
        /// và AI inference. Default 1024px width (config via ?width=).
        /// </summary>
        [HttpGet("pacs/instances/{instanceId}/rendered")]
        [AllowAnonymous]
        public async Task<ActionResult> GetInstanceRendered(string instanceId, [FromQuery] int width = 1024)
        {
            var pacsBaseUrl = _configuration["PACS:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:8042";
            var pacsUser = _configuration["PACS:Username"] ?? "";
            var pacsPass = _configuration["PACS:Password"] ?? "";
            if (width <= 0 || width > 4096) width = 1024;

            try
            {
                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var url = $"{pacsBaseUrl}/instances/{instanceId}/rendered?width={width}";
                var response = await httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsByteArrayAsync();
                    var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/png";
                    return File(content, contentType);
                }
                // Fallback to preview nếu rendered không hỗ trợ (VD old Orthanc)
                var fallback = await httpClient.GetAsync($"{pacsBaseUrl}/instances/{instanceId}/preview");
                if (fallback.IsSuccessStatusCode)
                {
                    var content = await fallback.Content.ReadAsByteArrayAsync();
                    return File(content, "image/png");
                }
                return NotFound();
            }
            catch
            {
                return StatusCode(502, "Cannot connect to PACS server");
            }
        }

        /// <summary>
        /// Proxy Orthanc instance file download (avoid CORS)
        /// </summary>
        [HttpGet("pacs/instances/{instanceId}/file")]
        [AllowAnonymous]
        public async Task<ActionResult> GetInstanceFile(string instanceId)
        {
            var pacsBaseUrl = _configuration["PACS:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:8042";
            var pacsUser = _configuration["PACS:Username"] ?? "";
            var pacsPass = _configuration["PACS:Password"] ?? "";

            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var response = await httpClient.GetAsync($"{pacsBaseUrl}/instances/{instanceId}/file");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsByteArrayAsync();
                    return File(content, "application/dicom", $"{instanceId}.dcm");
                }
                return NotFound();
            }
            catch
            {
                return StatusCode(502, "Cannot connect to PACS server");
            }
        }

        /// <summary>
        /// Link DICOM study với order
        /// </summary>
        [HttpPost("order-items/{orderItemId}/link-study")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult> LinkStudyToOrder(Guid orderItemId, [FromBody] LinkStudyRequest request)
        {
            await _risService.LinkStudyToOrderAsync(orderItemId, request.StudyInstanceUID);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kết quả sơ bộ (KTV)
        /// </summary>
        [HttpPost("results/{resultId}/preliminary-approve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Technician)]
        public async Task<ActionResult> PreliminaryApproveResult(Guid resultId, [FromBody] ApproveRequest request)
        {
            await _risService.PreliminaryApproveResultAsync(resultId, request.Note);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kết quả chính thức (BS)
        /// </summary>
        [HttpPost("results/{resultId}/final-approve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult> FinalApproveResult(Guid resultId, [FromBody] ApproveRadiologyResultDto dto)
        {
            dto.ResultId = resultId;
            dto.ApprovingUserId = GetUserId(); // G-36: per-modality permission check
            try { await _risService.FinalApproveResultAsync(dto); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { success = false, message = ex.Message }); }
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy duyệt kết quả
        /// </summary>
        [HttpPost("results/{resultId}/cancel-approval")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> CancelApproval(Guid resultId, [FromBody] RISCancelApprovalRequest request)
        {
            await _risService.CancelApprovalAsync(resultId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 8.3.7 In kết quả
        /// </summary>
        [HttpGet("results/{resultId}/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult> PrintRadiologyResult(
            Guid resultId,
            [FromQuery] string format = "A4",
            [FromQuery] bool includeImages = true)
        {
            var result = await _risService.PrintRadiologyResultAsync(resultId, format, includeImages);
            return File(result, "application/pdf", $"radiology_result_{resultId}.pdf");
        }

        /// <summary>
        /// In kết quả hàng loạt
        /// </summary>
        [HttpPost("results/print-batch")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult> PrintRadiologyResultsBatch(
            [FromBody] List<Guid> resultIds,
            [FromQuery] string format = "A4")
        {
            var result = await _risService.PrintRadiologyResultsBatchAsync(resultIds, format);
            return File(result, "application/pdf", "radiology_results_batch.pdf");
        }

        /// <summary>
        /// 8.3.8 Trả kết quả qua mạng về khoa/phòng
        /// </summary>
        [HttpPost("results/send")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<SendResultResponseDto>> SendResultToDepartment([FromBody] SendResultDto dto)
        {
            var result = await _risService.SendResultToDepartmentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử kết quả của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/history")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Doctor)]
        public async Task<ActionResult<List<RadiologyResultDto>>> GetPatientRadiologyHistory(
            Guid patientId,
            [FromQuery] string serviceType = null,
            [FromQuery] int? lastNMonths = 12)
        {
            var result = await _risService.GetPatientRadiologyHistoryAsync(patientId, serviceType, lastNMonths);
            return Ok(result);
        }

        #endregion

        #region 8.4 Kê thuốc, vật tư

        /// <summary>
        /// Danh sách phiếu kê thuốc/vật tư
        /// </summary>
        [HttpGet("order-items/{orderItemId}/prescriptions")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyPrescriptionDto>>> GetRadiologyPrescriptions(Guid orderItemId)
        {
            var result = await _risService.GetRadiologyPrescriptionsAsync(orderItemId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu kê thuốc/vật tư
        /// </summary>
        [HttpPost("prescriptions")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RadiologyPrescriptionDto>> CreateRadiologyPrescription(
            [FromBody] CreateRadiologyPrescriptionDto dto)
        {
            var result = await _risService.CreateRadiologyPrescriptionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật phiếu kê
        /// </summary>
        [HttpPut("prescriptions/{prescriptionId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RadiologyPrescriptionDto>> UpdateRadiologyPrescription(
            Guid prescriptionId,
            [FromBody] UpdateRadiologyPrescriptionDto dto)
        {
            var result = await _risService.UpdateRadiologyPrescriptionAsync(prescriptionId, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa phiếu kê
        /// </summary>
        [HttpDelete("prescriptions/{prescriptionId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> DeleteRadiologyPrescription(Guid prescriptionId)
        {
            await _risService.DeleteRadiologyPrescriptionAsync(prescriptionId);
            return NoContent();
        }

        /// <summary>
        /// Kê từ định mức
        /// </summary>
        [HttpPost("order-items/{orderItemId}/prescription-from-norm")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist)]
        public async Task<ActionResult<RadiologyPrescriptionDto>> CreatePrescriptionFromNorm(
            Guid orderItemId,
            [FromQuery] Guid warehouseId)
        {
            var result = await _risService.CreatePrescriptionFromNormAsync(orderItemId, warehouseId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy định mức của dịch vụ
        /// </summary>
        [HttpGet("services/{serviceId}/norm")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyServiceNormDto>> GetServiceNorm(Guid serviceId)
        {
            var result = await _risService.GetServiceNormAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật định mức
        /// </summary>
        [HttpPut("services/{serviceId}/norm")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> UpdateServiceNorm(Guid serviceId, [FromBody] List<UpdateNormItemDto> items)
        {
            await _risService.UpdateServiceNormAsync(serviceId, items);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tìm kiếm thuốc/vật tư
        /// </summary>
        [HttpGet("items/search")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<ItemSearchResultDto>>> SearchItems(
            [FromQuery] string keyword,
            [FromQuery] Guid warehouseId,
            [FromQuery] string itemType = null)
        {
            var result = await _risService.SearchItemsAsync(keyword, warehouseId, itemType);
            return Ok(result);
        }

        /// <summary>
        /// Kiểm tra tồn kho
        /// </summary>
        [HttpGet("items/{itemId}/stock")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<ItemStockDto>> CheckItemStock(Guid itemId, [FromQuery] Guid warehouseId)
        {
            var result = await _risService.CheckItemStockAsync(itemId, warehouseId);
            return Ok(result);
        }

        #endregion

        #region 8.5 Quản lý & Báo cáo

        /// <summary>
        /// 8.5.1 Báo cáo doanh thu CĐHA
        /// </summary>
        [HttpGet("reports/revenue")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Accountant)]
        public async Task<ActionResult<RadiologyRevenueReportDto>> GetRevenueReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string serviceType = null)
        {
            var result = await _risService.GetRevenueReportAsync(fromDate, toDate, departmentId, serviceType);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.2 Sổ siêu âm theo QĐ4069
        /// </summary>
        [HttpGet("reports/ultrasound-register")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<UltrasoundRegisterDto>> GetUltrasoundRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetUltrasoundRegisterAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.3 Sổ CĐHA phân chia theo loại dịch vụ
        /// </summary>
        [HttpGet("reports/radiology-register/by-type")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyRegisterDto>> GetRadiologyRegisterByType(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string serviceType)
        {
            var result = await _risService.GetRadiologyRegisterByTypeAsync(fromDate, toDate, serviceType);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.4 Sổ CĐHA theo QĐ4069
        /// </summary>
        [HttpGet("reports/radiology-register")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyRegisterDto>> GetRadiologyRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetRadiologyRegisterAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.5 Sổ thăm dò chức năng theo QĐ4069
        /// </summary>
        [HttpGet("reports/functional-test-register")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<FunctionalTestRegisterDto>> GetFunctionalTestRegister(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetFunctionalTestRegisterAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.6 Báo cáo định mức tiêu hao
        /// </summary>
        [HttpGet("reports/consumption-norm")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<ConsumptionNormReportDto>> GetConsumptionNormReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? serviceId = null)
        {
            var result = await _risService.GetConsumptionNormReportAsync(fromDate, toDate, serviceId);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.7 Báo cáo doanh thu theo chi phí gốc
        /// </summary>
        [HttpGet("reports/revenue-by-base-cost")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Accountant)]
        public async Task<ActionResult<RadiologyRevenueReportDto>> GetRevenueByBaseCostReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _risService.GetRevenueByBaseCostReportAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 8.5.8 Đồng bộ kết quả với Sở Y tế
        /// </summary>
        [HttpPost("results/{resultId}/sync-doh")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<SyncResultToDoHDto>> SyncResultToDoH(Guid resultId)
        {
            var result = await _risService.SyncResultToDoHAsync(resultId);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê CĐHA
        /// </summary>
        [HttpGet("reports/statistics")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<RadiologyStatisticsDto>> GetStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string serviceType = null)
        {
            var result = await _risService.GetStatisticsAsync(fromDate, toDate, serviceType);
            return Ok(result);
        }

        /// <summary>
        /// Xuất báo cáo Excel
        /// </summary>
        [HttpGet("reports/export")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> ExportReportToExcel(
            [FromQuery] string reportType,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.ExportReportToExcelAsync(reportType, fromDate, toDate);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"radiology_{reportType}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.xlsx");
        }

        #endregion
    }
}
