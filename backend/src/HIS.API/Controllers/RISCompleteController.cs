using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.Radiology;
using HIS.Infrastructure.Services;

// USB Token Sign Request DTO
public class USBTokenSignRequest
{
    public string? ReportId { get; set; }
    public string? CertificateThumbprint { get; set; }
    public string? DataToSign { get; set; }
}

// PDF Generation and Sign Request DTO
public class GenerateSignPdfRequest
{
    // Patient info
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }

    // Request info
    public string? RequestCode { get; set; }
    public string? RequestDate { get; set; }
    public string? DepartmentName { get; set; }
    public string? RequestingDoctorName { get; set; }
    public string? Diagnosis { get; set; }
    public string? ClinicalInfo { get; set; }

    // Service info
    public string? ServiceCode { get; set; }
    public string? ServiceName { get; set; }
    public string? ServiceType { get; set; }

    // Result info
    public string? ResultDate { get; set; }
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Recommendation { get; set; }
    public string? TechnicianName { get; set; }
    public string? DoctorName { get; set; }

    // Hospital info
    public string? HospitalName { get; set; }
    public string? HospitalAddress { get; set; }
    public string? HospitalPhone { get; set; }

    // Attached images
    public List<AttachedImageRequest>? AttachedImages { get; set; }

    // Certificate for signing
    public string? CertificateThumbprint { get; set; }
}

public class AttachedImageRequest
{
    public string? FileName { get; set; }
    public string? Base64Data { get; set; }
    public string? Description { get; set; }
}

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete RIS/PACS Controller
    /// Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Role-based authorization temporarily disabled for testing
    public class RISCompleteController : ControllerBase
    {
        private readonly IRISCompleteService _risService;
        private readonly IDigitalSignatureService _digitalSignatureService;
        private readonly IPdfSignatureService _pdfSignatureService;
        private readonly IConfiguration _configuration;

        public RISCompleteController(
            IRISCompleteService risService,
            IDigitalSignatureService digitalSignatureService,
            IPdfSignatureService pdfSignatureService,
            IConfiguration configuration)
        {
            _risService = risService;
            _digitalSignatureService = digitalSignatureService;
            _pdfSignatureService = pdfSignatureService;
            _configuration = configuration;
        }

        #region 8.1 Màn hình chờ thực hiện

        /// <summary>
        /// 8.1.1 Hiển thị danh sách bệnh nhân chờ thực hiện
        /// </summary>
        [HttpGet("waiting-list")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyWaitingListDto>>> GetWaitingList(
            [FromQuery] DateTime date,
            [FromQuery] Guid? roomId = null,
            [FromQuery] string serviceType = null,
            [FromQuery] string status = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetWaitingListAsync(date, roomId, serviceType, status, keyword);
            return Ok(result);
        }

        /// <summary>
        /// 8.1.2 Phát loa gọi bệnh nhân vào thực hiện
        /// </summary>
        [HttpPost("call-patient")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<CallPatientResultDto>> CallPatient([FromBody] CallPatientDto dto)
        {
            var result = await _risService.CallPatientAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy cấu hình màn hình hiển thị
        /// </summary>
        [HttpGet("rooms/{roomId}/display-config")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<WaitingDisplayConfigDto>> GetDisplayConfig(Guid roomId)
        {
            var result = await _risService.GetDisplayConfigAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật cấu hình màn hình hiển thị
        /// </summary>
        [HttpPut("rooms/{roomId}/display-config")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult> UpdateDisplayConfig(Guid roomId, [FromBody] WaitingDisplayConfigDto config)
        {
            config.RoomId = roomId;
            await _risService.UpdateDisplayConfigAsync(config);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Cập nhật ngày của tất cả RadiologyRequests thành ngày hôm nay (DEV only)
        /// </summary>
        [HttpPost("dev/update-dates-to-today")]
        [AllowAnonymous]
        public async Task<ActionResult> UpdateDatesToToday()
        {
            var count = await _risService.UpdateAllRequestDatesToTodayAsync();
            return Ok(new { success = true, updatedCount = count });
        }

        /// <summary>
        /// Thêm DicomStudy test cho các request completed để test nút Xem hình (DEV only)
        /// </summary>
        [HttpPost("dev/add-test-dicom-studies")]
        [AllowAnonymous]
        public async Task<ActionResult> AddTestDicomStudies()
        {
            var count = await _risService.AddTestDicomStudiesForCompletedRequestsAsync();
            return Ok(new { success = true, addedCount = count });
        }

        /// <summary>
        /// Sửa StudyInstanceUID fake thành UID thật từ Orthanc (DEV only)
        /// </summary>
        [HttpPost("dev/fix-dicom-uids")]
        [AllowAnonymous]
        public async Task<ActionResult> FixDicomUIDs()
        {
            var count = await _risService.FixDicomStudyUIDsAsync();
            return Ok(new { success = true, fixedCount = count });
        }

        /// <summary>
        /// Xóa DicomStudies của các request chưa hoàn thành (DEV only)
        /// </summary>
        [HttpPost("dev/cleanup-incomplete-dicom-studies")]
        [AllowAnonymous]
        public async Task<ActionResult> CleanupIncompleteDicomStudies()
        {
            var count = await _risService.CleanupDicomStudiesForIncompleteRequestsAsync();
            return Ok(new { success = true, removedCount = count });
        }

        /// <summary>
        /// Đồng bộ status của request dựa trên dữ liệu Exam (DEV only)
        /// </summary>
        [HttpPost("dev/sync-request-status")]
        [AllowAnonymous]
        public async Task<ActionResult> SyncRequestStatus()
        {
            var count = await _risService.SyncRequestStatusWithExamsAsync();
            return Ok(new { success = true, updatedCount = count });
        }

        /// <summary>
        /// Bắt đầu thực hiện
        /// </summary>
        [HttpPost("orders/{orderId}/start")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult> StartExam(Guid orderId)
        {
            await _risService.StartExamAsync(orderId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Kết thúc thực hiện
        /// </summary>
        [HttpPost("orders/{orderId}/complete")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult> CompleteExam(Guid orderId)
        {
            await _risService.CompleteExamAsync(orderId);
            return Ok(new { success = true });
        }

        #endregion

        #region 8.2 Kết nối PACS & Modality

        /// <summary>
        /// 8.2.1 Danh sách cấu hình PACS
        /// </summary>
        [HttpGet("pacs-connections")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<List<PACSConnectionDto>>> GetPACSConnections()
        {
            var result = await _risService.GetPACSConnectionsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Thêm mới cấu hình PACS
        /// </summary>
        [HttpPost("pacs-connections")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult<PACSConnectionDto>> CreatePACSConnection([FromBody] CreatePACSConnectionDto dto)
        {
            var result = await _risService.CreatePACSConnectionAsync(dto);
            return CreatedAtAction(nameof(GetPACSConnections), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật cấu hình PACS
        /// </summary>
        [HttpPut("pacs-connections/{id}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult<PACSConnectionDto>> UpdatePACSConnection(Guid id, [FromBody] UpdatePACSConnectionDto dto)
        {
            var result = await _risService.UpdatePACSConnectionAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình PACS
        /// </summary>
        [HttpDelete("pacs-connections/{id}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult> DeletePACSConnection(Guid id)
        {
            await _risService.DeletePACSConnectionAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 8.2.2 Kiểm tra kết nối PACS
        /// </summary>
        [HttpGet("pacs-connections/{connectionId}/status")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<PACSConnectionStatusDto>> CheckPACSConnection(Guid connectionId)
        {
            var result = await _risService.CheckPACSConnectionAsync(connectionId);
            return Ok(result);
        }

        /// <summary>
        /// 8.2.3 Danh sách máy chẩn đoán hình ảnh
        /// </summary>
        [HttpGet("modalities")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<ModalityDto>>> GetModalities(
            [FromQuery] string keyword = null,
            [FromQuery] string modalityType = null)
        {
            var result = await _risService.GetModalitiesAsync(keyword, modalityType);
            return Ok(result);
        }

        /// <summary>
        /// Thêm mới Modality
        /// </summary>
        [HttpPost("modalities")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult<ModalityDto>> CreateModality([FromBody] CreateModalityDto dto)
        {
            var result = await _risService.CreateModalityAsync(dto);
            return CreatedAtAction(nameof(GetModalities), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật Modality
        /// </summary>
        [HttpPut("modalities/{id}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult<ModalityDto>> UpdateModality(Guid id, [FromBody] UpdateModalityDto dto)
        {
            var result = await _risService.UpdateModalityAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Modality
        /// </summary>
        [HttpDelete("modalities/{id}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult> DeleteModality(Guid id)
        {
            await _risService.DeleteModalityAsync(id);
            return NoContent();
        }

        /// <summary>
        /// Gửi worklist đến máy
        /// </summary>
        [HttpPost("modalities/worklist/send")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Technician")]
        public async Task<ActionResult<SendWorklistResultDto>> SendWorklistToModality([FromBody] SendModalityWorklistDto dto)
        {
            var result = await _risService.SendWorklistToModalityAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 8.2.4 Cấu hình kết nối thiết bị khác (siêu âm, nội soi)
        /// </summary>
        [HttpPut("devices/{deviceId}/connection")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult> ConfigureDeviceConnection(Guid deviceId, [FromBody] DeviceConnectionConfigDto config)
        {
            await _risService.ConfigureDeviceConnectionAsync(deviceId, config);
            return Ok(new { success = true });
        }

        #endregion

        #region 8.3 Thực hiện CĐHA, TDCN

        /// <summary>
        /// Danh sách phiếu yêu cầu CĐHA
        /// </summary>
        [HttpGet("orders")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
        public async Task<ActionResult<List<RadiologyOrderDto>>> GetRadiologyOrders(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByServiceType(Guid serviceTypeId)
        {
            var result = await _risService.GetResultTemplatesByServiceTypeAsync(serviceTypeId);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.2 Lấy mẫu kết quả theo dịch vụ
        /// </summary>
        [HttpGet("templates/by-service/{serviceId}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByService(Guid serviceId)
        {
            var result = await _risService.GetResultTemplatesByServiceAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.3 Lấy mẫu kết quả theo giới tính
        /// </summary>
        [HttpGet("templates/by-gender/{gender}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetResultTemplatesByGender(string gender)
        {
            var result = await _risService.GetResultTemplatesByGenderAsync(gender);
            return Ok(result);
        }

        /// <summary>
        /// Lấy tất cả mẫu kết quả
        /// </summary>
        [HttpGet("templates")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyResultTemplateDto>>> GetAllResultTemplates([FromQuery] string keyword = null)
        {
            var result = await _risService.GetAllResultTemplatesAsync(keyword);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa mẫu kết quả
        /// </summary>
        [HttpPost("templates")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<RadiologyResultTemplateDto>> SaveResultTemplate([FromBody] SaveResultTemplateDto dto)
        {
            var result = await _risService.SaveResultTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu kết quả
        /// </summary>
        [HttpDelete("templates/{templateId}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult> DeleteResultTemplate(Guid templateId)
        {
            await _risService.DeleteResultTemplateAsync(templateId);
            return NoContent();
        }

        /// <summary>
        /// 8.3.4 Đổi mẫu kết quả
        /// </summary>
        [HttpPost("results/change-template")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult<RadiologyResultDto>> ChangeResultTemplate([FromBody] ChangeResultTemplateDto dto)
        {
            var result = await _risService.ChangeResultTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 8.3.5 Nhập mô tả, kết luận và ghi chú
        /// </summary>
        [HttpPost("results/enter")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<RadiologyResultDto>> EnterRadiologyResult([FromBody] EnterRadiologyResultDto dto)
        {
            var result = await _risService.EnterRadiologyResultAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy kết quả CĐHA
        /// </summary>
        [HttpGet("order-items/{orderItemId}/result")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
        public async Task<ActionResult<RadiologyResultDto>> GetRadiologyResult(Guid orderItemId)
        {
            var result = await _risService.GetRadiologyResultAsync(orderItemId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật kết quả CĐHA
        /// </summary>
        [HttpPut("results/{resultId}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<AttachedImageDto>> AttachImage([FromBody] AttachImageDto dto)
        {
            var result = await _risService.AttachImageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa ảnh đính kèm
        /// </summary>
        [HttpDelete("results/images/{imageId}")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult> RemoveAttachedImage(Guid imageId)
        {
            await _risService.RemoveAttachedImageAsync(imageId);
            return NoContent();
        }

        /// <summary>
        /// Lấy ảnh từ PACS
        /// </summary>
        [HttpGet("pacs/studies")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<DicomSeriesDto>>> GetSeries(string studyInstanceUID)
        {
            var result = await _risService.GetSeriesAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Lấy images trong series
        /// </summary>
        [HttpGet("pacs/series/{seriesInstanceUID}/images")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
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
            var pacsUser = _configuration["PACS:Username"] ?? "admin";
            var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

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
        /// Proxy Orthanc instance file download (avoid CORS)
        /// </summary>
        [HttpGet("pacs/instances/{instanceId}/file")]
        [AllowAnonymous]
        public async Task<ActionResult> GetInstanceFile(string instanceId)
        {
            var pacsBaseUrl = _configuration["PACS:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:8042";
            var pacsUser = _configuration["PACS:Username"] ?? "admin";
            var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult> LinkStudyToOrder(Guid orderItemId, [FromBody] LinkStudyRequest request)
        {
            await _risService.LinkStudyToOrderAsync(orderItemId, request.StudyInstanceUID);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kết quả sơ bộ (KTV)
        /// </summary>
        [HttpPost("results/{resultId}/preliminary-approve")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Technician")]
        public async Task<ActionResult> PreliminaryApproveResult(Guid resultId, [FromBody] ApproveRequest request)
        {
            await _risService.PreliminaryApproveResultAsync(resultId, request.Note);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kết quả chính thức (BS)
        /// </summary>
        [HttpPost("results/{resultId}/final-approve")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult> FinalApproveResult(Guid resultId, [FromBody] ApproveRadiologyResultDto dto)
        {
            dto.ResultId = resultId;
            await _risService.FinalApproveResultAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy duyệt kết quả
        /// </summary>
        [HttpPost("results/{resultId}/cancel-approval")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult> CancelApproval(Guid resultId, [FromBody] RISCancelApprovalRequest request)
        {
            await _risService.CancelApprovalAsync(resultId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 8.3.7 In kết quả
        /// </summary>
        [HttpGet("results/{resultId}/print")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor,Nurse")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<SendResultResponseDto>> SendResultToDepartment([FromBody] SendResultDto dto)
        {
            var result = await _risService.SendResultToDepartmentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử kết quả của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/history")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Doctor")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
        public async Task<ActionResult<List<RadiologyPrescriptionDto>>> GetRadiologyPrescriptions(Guid orderItemId)
        {
            var result = await _risService.GetRadiologyPrescriptionsAsync(orderItemId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu kê thuốc/vật tư
        /// </summary>
        [HttpPost("prescriptions")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult> DeleteRadiologyPrescription(Guid prescriptionId)
        {
            await _risService.DeleteRadiologyPrescriptionAsync(prescriptionId);
            return NoContent();
        }

        /// <summary>
        /// Kê từ định mức
        /// </summary>
        [HttpPost("order-items/{orderItemId}/prescription-from-norm")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<RadiologyServiceNormDto>> GetServiceNorm(Guid serviceId)
        {
            var result = await _risService.GetServiceNormAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật định mức
        /// </summary>
        [HttpPut("services/{serviceId}/norm")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult> UpdateServiceNorm(Guid serviceId, [FromBody] List<UpdateNormItemDto> items)
        {
            await _risService.UpdateServiceNormAsync(serviceId, items);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tìm kiếm thuốc/vật tư
        /// </summary>
        [HttpGet("items/search")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Accountant")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Accountant")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<SyncResultToDoHDto>> SyncResultToDoH(Guid resultId)
        {
            var result = await _risService.SyncResultToDoHAsync(resultId);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê CĐHA
        /// </summary>
        [HttpGet("reports/statistics")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
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

        #region DICOM Viewer & Image

        /// <summary>
        /// Lấy URL mở DICOM Viewer
        /// </summary>
        [HttpGet("viewer/url")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
        public async Task<ActionResult<ViewerUrlDto>> GetViewerUrl([FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetViewerUrlAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Lấy cấu hình DICOM Viewer
        /// </summary>
        [HttpGet("viewer/config")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<DicomViewerConfigDto>> GetViewerConfig()
        {
            var result = await _risService.GetViewerConfigAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu annotation
        /// </summary>
        [HttpPost("annotations")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult<ImageAnnotationDto>> SaveAnnotation([FromBody] ImageAnnotationDto annotation)
        {
            var result = await _risService.SaveAnnotationAsync(annotation);
            return Ok(result);
        }

        /// <summary>
        /// Lấy annotations của ảnh
        /// </summary>
        [HttpGet("annotations")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
        public async Task<ActionResult<List<ImageAnnotationDto>>> GetAnnotations([FromQuery] string sopInstanceUID)
        {
            var result = await _risService.GetAnnotationsAsync(sopInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Đánh dấu key image
        /// </summary>
        [HttpPost("key-images")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult<KeyImageDto>> MarkKeyImage([FromBody] MarkKeyImageDto dto)
        {
            var result = await _risService.MarkKeyImageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách key images
        /// </summary>
        [HttpGet("key-images")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist,Technician,Doctor")]
        public async Task<ActionResult<List<KeyImageDto>>> GetKeyImages([FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetKeyImagesAsync(studyInstanceUID);
            return Ok(result);
        }

        /// <summary>
        /// Chỉnh sửa ảnh
        /// </summary>
        [HttpPost("images/edit")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager,Radiologist")]
        public async Task<ActionResult> EditImage([FromBody] ImageEditDto dto)
        {
            var result = await _risService.EditImageAsync(dto);
            return File(result, "image/jpeg");
        }

        #endregion

        #region Room & Schedule Management

        /// <summary>
        /// Danh sách phòng CĐHA
        /// </summary>
        [HttpGet("rooms")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<List<RadiologyRoomDto>>> GetRooms(
            [FromQuery] string keyword = null,
            [FromQuery] string roomType = null)
        {
            var result = await _risService.GetRoomsAsync(keyword, roomType);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa phòng
        /// </summary>
        [HttpPost("rooms")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống")]
        public async Task<ActionResult<RadiologyRoomDto>> SaveRoom([FromBody] SaveRadiologyRoomDto dto)
        {
            var result = await _risService.SaveRoomAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lịch làm việc phòng
        /// </summary>
        [HttpGet("rooms/{roomId}/schedule")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<List<RadiologyScheduleDto>>> GetRoomSchedule(
            Guid roomId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetRoomScheduleAsync(roomId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật lịch làm việc
        /// </summary>
        [HttpPost("rooms/schedule")]
        // [Authorize(Roles = "Admin,Quản trị hệ thống,RadiologistManager")]
        public async Task<ActionResult<RadiologyScheduleDto>> SaveSchedule([FromBody] SaveRadiologyScheduleDto dto)
        {
            var result = await _risService.SaveScheduleAsync(dto);
            return Ok(result);
        }

        #endregion

        #region Print Label - In nhãn dán

        /// <summary>
        /// In nhãn dán cho ca chụp
        /// </summary>
        [HttpPost("print-label")]
        public async Task<ActionResult<LabelDataDto>> PrintLabel([FromBody] PrintLabelRequestDto request)
        {
            var result = await _risService.PrintLabelAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách cấu hình nhãn
        /// </summary>
        [HttpGet("label-configs")]
        public async Task<ActionResult<List<RadiologyLabelConfigDto>>> GetLabelConfigs([FromQuery] Guid? serviceTypeId = null)
        {
            var result = await _risService.GetLabelConfigsAsync(serviceTypeId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình nhãn
        /// </summary>
        [HttpPost("label-configs")]
        public async Task<ActionResult<RadiologyLabelConfigDto>> SaveLabelConfig([FromBody] RadiologyLabelConfigDto config)
        {
            var result = await _risService.SaveLabelConfigAsync(config);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình nhãn
        /// </summary>
        [HttpDelete("label-configs/{configId}")]
        public async Task<ActionResult> DeleteLabelConfig(Guid configId)
        {
            await _risService.DeleteLabelConfigAsync(configId);
            return NoContent();
        }

        #endregion

        #region Diagnosis Templates - Mẫu chẩn đoán

        /// <summary>
        /// Lấy danh sách mẫu chẩn đoán
        /// </summary>
        [HttpGet("diagnosis-templates")]
        public async Task<ActionResult<List<DiagnosisTemplateDto>>> GetDiagnosisTemplates(
            [FromQuery] Guid? serviceTypeId = null,
            [FromQuery] Guid? serviceId = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetDiagnosisTemplatesAsync(serviceTypeId, serviceId, keyword);
            return Ok(result);
        }

        /// <summary>
        /// Lưu mẫu chẩn đoán
        /// </summary>
        [HttpPost("diagnosis-templates")]
        public async Task<ActionResult<DiagnosisTemplateDto>> SaveDiagnosisTemplate([FromBody] SaveDiagnosisTemplateDto dto)
        {
            var result = await _risService.SaveDiagnosisTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu chẩn đoán
        /// </summary>
        [HttpDelete("diagnosis-templates/{templateId}")]
        public async Task<ActionResult> DeleteDiagnosisTemplate(Guid templateId)
        {
            await _risService.DeleteDiagnosisTemplateAsync(templateId);
            return NoContent();
        }

        #endregion

        #region Abbreviations - Bộ từ viết tắt

        /// <summary>
        /// Lấy danh sách từ viết tắt
        /// </summary>
        [HttpGet("abbreviations")]
        public async Task<ActionResult<List<AbbreviationDto>>> GetAbbreviations(
            [FromQuery] string category = null,
            [FromQuery] Guid? serviceTypeId = null,
            [FromQuery] string keyword = null)
        {
            var result = await _risService.GetAbbreviationsAsync(category, serviceTypeId, keyword);
            return Ok(result);
        }

        /// <summary>
        /// Lưu từ viết tắt
        /// </summary>
        [HttpPost("abbreviations")]
        public async Task<ActionResult<AbbreviationDto>> SaveAbbreviation([FromBody] SaveAbbreviationDto dto)
        {
            var result = await _risService.SaveAbbreviationAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa từ viết tắt
        /// </summary>
        [HttpDelete("abbreviations/{abbreviationId}")]
        public async Task<ActionResult> DeleteAbbreviation(Guid abbreviationId)
        {
            await _risService.DeleteAbbreviationAsync(abbreviationId);
            return NoContent();
        }

        /// <summary>
        /// Mở rộng từ viết tắt trong văn bản
        /// </summary>
        [HttpPost("abbreviations/expand")]
        public async Task<ActionResult<ExpandAbbreviationResultDto>> ExpandAbbreviations(
            [FromBody] ExpandAbbreviationRequest request)
        {
            var result = await _risService.ExpandAbbreviationsAsync(request.Text, request.Category, request.ServiceTypeId);
            return Ok(result);
        }

        #endregion

        #region QR Code

        /// <summary>
        /// Sinh mã QR cho ca chụp
        /// </summary>
        [HttpPost("qrcode/generate")]
        public async Task<ActionResult<QRCodeResultDto>> GenerateQRCode([FromBody] GenerateQRCodeRequestDto request)
        {
            var result = await _risService.GenerateQRCodeAsync(request);
            if (result == null) return NotFound(new { message = "Order not found" });
            return Ok(result);
        }

        /// <summary>
        /// Quét mã QR
        /// </summary>
        [HttpPost("qrcode/scan")]
        public async Task<ActionResult<ScanQRCodeResultDto>> ScanQRCode([FromBody] ScanQRCodeRequest request)
        {
            var result = await _risService.ScanQRCodeAsync(request.QRData);
            return Ok(result);
        }

        /// <summary>
        /// Chia sẻ kết quả qua QR Code
        /// </summary>
        [HttpPost("results/{resultId}/share-qr")]
        public async Task<ActionResult<ShareResultQRDto>> CreateShareResultQR(Guid resultId, [FromQuery] int? validityHours = 24)
        {
            var result = await _risService.CreateShareResultQRAsync(resultId, validityHours);
            return Ok(result);
        }

        /// <summary>
        /// Lấy kết quả từ share link
        /// </summary>
        [HttpGet("shared-result/{shareCode}")]
        [AllowAnonymous]
        public async Task<ActionResult<RadiologyResultDto>> GetSharedResult(string shareCode, [FromQuery] string accessCode)
        {
            var result = await _risService.GetSharedResultAsync(shareCode, accessCode);
            return Ok(result);
        }

        #endregion

        #region Duty Schedule - Lịch phân công trực

        /// <summary>
        /// Lấy lịch trực
        /// </summary>
        [HttpGet("duty-schedules")]
        public async Task<ActionResult<List<DutyScheduleDto>>> GetDutySchedules(
            [FromQuery] Guid departmentId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? roomId = null)
        {
            var result = await _risService.GetDutySchedulesAsync(departmentId, fromDate, toDate, roomId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu lịch trực
        /// </summary>
        [HttpPost("duty-schedules")]
        public async Task<ActionResult<DutyScheduleDto>> SaveDutySchedule([FromBody] SaveDutyScheduleDto dto)
        {
            var result = await _risService.SaveDutyScheduleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Tạo lịch trực hàng loạt
        /// </summary>
        [HttpPost("duty-schedules/batch")]
        public async Task<ActionResult<List<DutyScheduleDto>>> BatchCreateDutySchedules([FromBody] BatchCreateDutyScheduleDto dto)
        {
            var result = await _risService.BatchCreateDutySchedulesAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa lịch trực
        /// </summary>
        [HttpDelete("duty-schedules/{scheduleId}")]
        public async Task<ActionResult> DeleteDutySchedule(Guid scheduleId)
        {
            await _risService.DeleteDutyScheduleAsync(scheduleId);
            return NoContent();
        }

        /// <summary>
        /// Duyệt lịch trực
        /// </summary>
        [HttpPost("duty-schedules/{scheduleId}/approve")]
        public async Task<ActionResult> ApproveDutySchedule(Guid scheduleId)
        {
            await _risService.ApproveDutyScheduleAsync(scheduleId);
            return Ok(new { success = true });
        }

        #endregion

        #region Room Assignment - Phân phòng thực hiện

        /// <summary>
        /// Phân phòng thực hiện
        /// </summary>
        [HttpPost("room-assignments")]
        public async Task<ActionResult<RoomAssignmentDto>> AssignRoom([FromBody] AssignRoomRequestDto request)
        {
            var result = await _risService.AssignRoomAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật phân phòng
        /// </summary>
        [HttpPut("room-assignments/{assignmentId}")]
        public async Task<ActionResult<RoomAssignmentDto>> UpdateRoomAssignment(Guid assignmentId, [FromBody] AssignRoomRequestDto request)
        {
            var result = await _risService.UpdateRoomAssignmentAsync(assignmentId, request);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách chờ theo phòng
        /// </summary>
        [HttpGet("rooms/{roomId}/queue")]
        public async Task<ActionResult<List<RoomAssignmentDto>>> GetRoomQueue(Guid roomId, [FromQuery] DateTime date)
        {
            var result = await _risService.GetRoomQueueAsync(roomId, date);
            return Ok(result);
        }

        /// <summary>
        /// Gọi bệnh nhân tiếp theo
        /// </summary>
        [HttpPost("rooms/{roomId}/call-next")]
        public async Task<ActionResult<RoomAssignmentDto>> CallNextPatient(Guid roomId)
        {
            var result = await _risService.CallNextPatientAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Bỏ qua bệnh nhân
        /// </summary>
        [HttpPost("room-assignments/{assignmentId}/skip")]
        public async Task<ActionResult> SkipPatient(Guid assignmentId, [FromBody] SkipPatientRequest request)
        {
            await _risService.SkipPatientAsync(assignmentId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Thống kê theo phòng
        /// </summary>
        [HttpGet("rooms/statistics")]
        public async Task<ActionResult<List<RoomStatisticsDto>>> GetRoomStatistics([FromQuery] DateTime date)
        {
            var result = await _risService.GetRoomStatisticsAsync(date);
            return Ok(result);
        }

        #endregion

        #region Tags - Quản lý Tag

        /// <summary>
        /// Lấy danh sách Tag
        /// </summary>
        [HttpGet("tags")]
        public async Task<ActionResult<List<RadiologyTagDto>>> GetTags(
            [FromQuery] string keyword = null,
            [FromQuery] bool includeInactive = false)
        {
            var result = await _risService.GetTagsAsync(keyword, includeInactive);
            return Ok(result);
        }

        /// <summary>
        /// Lưu Tag
        /// </summary>
        [HttpPost("tags")]
        public async Task<ActionResult<RadiologyTagDto>> SaveTag([FromBody] SaveRadiologyTagDto dto)
        {
            var result = await _risService.SaveTagAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Tag
        /// </summary>
        [HttpDelete("tags/{tagId}")]
        public async Task<ActionResult> DeleteTag(Guid tagId)
        {
            await _risService.DeleteTagAsync(tagId);
            return NoContent();
        }

        /// <summary>
        /// Gắn Tag cho ca chụp
        /// </summary>
        [HttpPost("requests/tags")]
        public async Task<ActionResult> AssignTagsToRequest([FromBody] AssignTagRequestDto request)
        {
            await _risService.AssignTagsToRequestAsync(request);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gỡ Tag khỏi ca chụp
        /// </summary>
        [HttpDelete("requests/{requestId}/tags/{tagId}")]
        public async Task<ActionResult> RemoveTagFromRequest(Guid requestId, Guid tagId)
        {
            await _risService.RemoveTagFromRequestAsync(requestId, tagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Lấy các ca chụp theo Tag
        /// </summary>
        [HttpGet("tags/{tagId}/requests")]
        public async Task<ActionResult<List<TaggedRequestDto>>> GetRequestsByTag(
            Guid tagId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _risService.GetRequestsByTagAsync(tagId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy các Tag của ca chụp
        /// </summary>
        [HttpGet("requests/{requestId}/tags")]
        public async Task<ActionResult<List<RadiologyTagDto>>> GetTagsOfRequest(Guid requestId)
        {
            var result = await _risService.GetTagsOfRequestAsync(requestId);
            return Ok(result);
        }

        #endregion

        #region Integration Log - Log tích hợp HIS-RIS

        /// <summary>
        /// Tìm kiếm log tích hợp
        /// </summary>
        [HttpPost("integration-logs/search")]
        public async Task<ActionResult<IntegrationLogSearchResultDto>> SearchIntegrationLogs([FromBody] SearchIntegrationLogDto searchDto)
        {
            var result = await _risService.SearchIntegrationLogsAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết log
        /// </summary>
        [HttpGet("integration-logs/{logId}")]
        public async Task<ActionResult<IntegrationLogDto>> GetIntegrationLog(Guid logId)
        {
            var result = await _risService.GetIntegrationLogAsync(logId);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê log tích hợp
        /// </summary>
        [HttpGet("integration-logs/statistics")]
        public async Task<ActionResult<IntegrationLogStatisticsDto>> GetIntegrationLogStatistics(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _risService.GetIntegrationLogStatisticsAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Retry gửi lại message lỗi
        /// </summary>
        [HttpPost("integration-logs/{logId}/retry")]
        public async Task<ActionResult> RetryIntegration(Guid logId)
        {
            await _risService.RetryIntegrationAsync(logId);
            return Ok(new { success = true });
        }

        #endregion

        #region Digital Signature - Ký số

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
            return Ok(new { success = true });
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
                return BadRequest(new { success = false, message = $"Lỗi đọc chứng thư số: {ex.Message}" });
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

                // Call signing service - Windows will prompt for PIN automatically
                var result = await _digitalSignatureService.SignDataAsync(dataToSign, request.CertificateThumbprint);

                // Try to save signature to database, but don't fail the whole operation if DB save fails
                if (result.Success && !string.IsNullOrEmpty(request.ReportId) && Guid.TryParse(request.ReportId, out var reportGuid))
                {
                    try
                    {
                        // Save signature to database through RIS service
                        await _risService.SignResultAsync(new SignResultRequestDto
                        {
                            ReportId = reportGuid,
                            SignatureType = "USBToken",
                            Note = $"Signed with certificate: {result.SignerName}"
                        });
                    }
                    catch (Exception dbEx)
                    {
                        // Log the error but don't fail - signature was still created successfully
                        Console.WriteLine($"Warning: Could not save signature to database: {dbEx.Message}");
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
                return BadRequest(new { available = false, message = $"Lỗi kiểm tra USB Token: {ex.Message}" });
            }
        }

        #endregion

        #region PDF Signature - Ký số PDF

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
        [AllowAnonymous]
        public IActionResult DownloadSignedPdf(string fileName)
        {
            try
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Reports", "Radiology", fileName);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = "File không tồn tại" });
                }

                var fileBytes = System.IO.File.ReadAllBytes(filePath);
                return File(fileBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi tải file: {ex.Message}" });
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
                    return BadRequest(new { success = false, message = result.Message });
                }

                return Ok(new
                {
                    success = true,
                    message = "Tạo PDF preview thành công",
                    filePath = result.FilePath,
                    pdfBase64 = result.PdfBytes != null ? Convert.ToBase64String(result.PdfBytes) : null
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Lỗi tạo PDF: {ex.Message}" });
            }
        }

        #endregion

        #region Statistics - Thống kê

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

        #endregion

        #region IV. Capture Device - Thiết bị Capture

        /// <summary>
        /// Lấy danh sách thiết bị Capture
        /// </summary>
        [HttpGet("capture-devices")]
        public async Task<ActionResult<List<CaptureDeviceDto>>> GetCaptureDevices(
            [FromQuery] string deviceType = null,
            [FromQuery] string keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _risService.GetCaptureDevicesAsync(deviceType, keyword, isActive);
            return Ok(result);
        }

        /// <summary>
        /// Lưu thiết bị Capture
        /// </summary>
        [HttpPost("capture-devices")]
        public async Task<ActionResult<CaptureDeviceDto>> SaveCaptureDevice([FromBody] SaveCaptureDeviceDto dto)
        {
            var result = await _risService.SaveCaptureDeviceAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa thiết bị Capture
        /// </summary>
        [HttpDelete("capture-devices/{deviceId}")]
        public async Task<ActionResult> DeleteCaptureDevice(Guid deviceId)
        {
            await _risService.DeleteCaptureDeviceAsync(deviceId);
            return NoContent();
        }

        /// <summary>
        /// Kiểm tra kết nối thiết bị
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/check-connection")]
        public async Task<ActionResult<bool>> CheckDeviceConnection(Guid deviceId)
        {
            var result = await _risService.CheckDeviceConnectionAsync(deviceId);
            return Ok(new { connected = result });
        }

        /// <summary>
        /// Lấy danh sách Workstation
        /// </summary>
        [HttpGet("workstations")]
        public async Task<ActionResult<List<WorkstationDto>>> GetWorkstations([FromQuery] Guid? roomId = null)
        {
            var result = await _risService.GetWorkstationsAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu Workstation
        /// </summary>
        [HttpPost("workstations")]
        public async Task<ActionResult<WorkstationDto>> SaveWorkstation([FromBody] SaveWorkstationDto dto)
        {
            var result = await _risService.SaveWorkstationAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Workstation
        /// </summary>
        [HttpDelete("workstations/{workstationId}")]
        public async Task<ActionResult> DeleteWorkstation(Guid workstationId)
        {
            await _risService.DeleteWorkstationAsync(workstationId);
            return NoContent();
        }

        /// <summary>
        /// Tạo phiên Capture
        /// </summary>
        [HttpPost("capture-sessions")]
        public async Task<ActionResult<CaptureSessionDto>> CreateCaptureSession([FromBody] CreateCaptureSessionDto dto)
        {
            var result = await _risService.CreateCaptureSessionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy phiên Capture đang hoạt động
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/active-session")]
        public async Task<ActionResult<CaptureSessionDto>> GetActiveCaptureSession(Guid deviceId)
        {
            var result = await _risService.GetActiveCaptureSessionAsync(deviceId);
            return Ok(result);
        }

        /// <summary>
        /// Kết thúc phiên Capture
        /// </summary>
        [HttpPost("capture-sessions/{sessionId}/end")]
        public async Task<ActionResult<CaptureSessionDto>> EndCaptureSession(Guid sessionId)
        {
            var result = await _risService.EndCaptureSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Upload hình ảnh/video capture
        /// </summary>
        [HttpPost("capture-sessions/media")]
        public async Task<ActionResult<CapturedMediaDto>> UploadCapturedMedia([FromBody] SaveCapturedMediaDto dto)
        {
            var result = await _risService.UploadCapturedMediaAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách media trong phiên
        /// </summary>
        [HttpGet("capture-sessions/{sessionId}/media")]
        public async Task<ActionResult<List<CapturedMediaDto>>> GetCapturedMedia(Guid sessionId)
        {
            var result = await _risService.GetCapturedMediaAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Đánh dấu ảnh tiêu biểu
        /// </summary>
        [HttpPost("captured-media/{sessionId}/{mediaId}/thumbnail")]
        public async Task<ActionResult> SetThumbnailImage(Guid sessionId, Guid mediaId)
        {
            await _risService.SetThumbnailImageAsync(sessionId, mediaId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gửi ảnh đến PACS
        /// </summary>
        [HttpPost("capture-sessions/send-to-pacs")]
        public async Task<ActionResult<SendToPacsResultDto>> SendMediaToPacs([FromBody] SendToPacsRequestDto request)
        {
            var result = await _risService.SendMediaToPacsAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê thiết bị hàng ngày
        /// </summary>
        [HttpGet("capture-devices/{deviceId}/daily-statistics")]
        public async Task<ActionResult<DeviceDailyStatisticsDto>> GetDeviceDailyStatistics(Guid deviceId, [FromQuery] DateTime date)
        {
            var result = await _risService.GetDeviceDailyStatisticsAsync(deviceId, date);
            return Ok(result);
        }

        #endregion

        #region V. Consultation - Hội chẩn ca chụp

        /// <summary>
        /// Tìm kiếm phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/search")]
        public async Task<ActionResult<ConsultationSearchResultDto>> SearchConsultations([FromBody] SearchConsultationDto searchDto)
        {
            var result = await _risService.SearchConsultationsAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết phiên hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}")]
        public async Task<ActionResult<ConsultationSessionDto>> GetConsultationSession(Guid sessionId)
        {
            var result = await _risService.GetConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo/Cập nhật phiên hội chẩn
        /// </summary>
        [HttpPost("consultations")]
        public async Task<ActionResult<ConsultationSessionDto>> SaveConsultationSession([FromBody] SaveConsultationSessionDto dto)
        {
            var result = await _risService.SaveConsultationSessionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Hủy phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/cancel")]
        public async Task<ActionResult> CancelConsultationSession(Guid sessionId, [FromBody] CancelConsultationRequest request)
        {
            await _risService.CancelConsultationSessionAsync(sessionId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Bắt đầu phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/start")]
        public async Task<ActionResult<ConsultationSessionDto>> StartConsultationSession(Guid sessionId)
        {
            var result = await _risService.StartConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Kết thúc phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/end")]
        public async Task<ActionResult<ConsultationSessionDto>> EndConsultationSession(Guid sessionId)
        {
            var result = await _risService.EndConsultationSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Thêm ca vào phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/cases")]
        public async Task<ActionResult<ConsultationCaseDto>> AddConsultationCase([FromBody] AddConsultationCaseDto dto)
        {
            var result = await _risService.AddConsultationCaseAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa ca khỏi phiên hội chẩn
        /// </summary>
        [HttpDelete("consultations/cases/{caseId}")]
        public async Task<ActionResult> RemoveConsultationCase(Guid caseId)
        {
            await _risService.RemoveConsultationCaseAsync(caseId);
            return NoContent();
        }

        /// <summary>
        /// Kết luận ca hội chẩn
        /// </summary>
        [HttpPost("consultations/cases/conclude")]
        public async Task<ActionResult<ConsultationCaseDto>> ConcludeCase([FromBody] ConcludeCaseDto dto)
        {
            var result = await _risService.ConcludeCaseAsync(dto.CaseId, dto.Conclusion, dto.Recommendation);
            return Ok(result);
        }

        /// <summary>
        /// Mời tham gia hội chẩn
        /// </summary>
        [HttpPost("consultations/invite")]
        public async Task<ActionResult<ConsultationParticipantDto>> InviteParticipant([FromBody] InviteParticipantDto dto)
        {
            var result = await _risService.InviteParticipantAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Chấp nhận/Từ chối lời mời
        /// </summary>
        [HttpPost("consultations/respond-invitation")]
        public async Task<ActionResult> RespondInvitation([FromBody] RespondInvitationDto dto)
        {
            await _risService.RespondInvitationAsync(dto.SessionId, dto.UserId, dto.Accept);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tham gia phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/join")]
        public async Task<ActionResult<ConsultationParticipantDto>> JoinSession(Guid sessionId)
        {
            var result = await _risService.JoinSessionAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Rời phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/leave")]
        public async Task<ActionResult> LeaveSession(Guid sessionId)
        {
            await _risService.LeaveSessionAsync(sessionId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Upload file đính kèm hội chẩn
        /// </summary>
        [HttpPost("consultations/attachments")]
        public async Task<ActionResult<ConsultationAttachmentDto>> UploadConsultationAttachment([FromBody] AddConsultationAttachmentDto dto)
        {
            var result = await _risService.UploadAttachmentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa file đính kèm
        /// </summary>
        [HttpDelete("consultations/attachments/{attachmentId}")]
        public async Task<ActionResult> DeleteConsultationAttachment(Guid attachmentId)
        {
            await _risService.DeleteAttachmentAsync(attachmentId);
            return NoContent();
        }

        /// <summary>
        /// Gửi tin nhắn thảo luận
        /// </summary>
        [HttpPost("consultations/discussions")]
        public async Task<ActionResult<ConsultationDiscussionDto>> PostDiscussion([FromBody] AddConsultationDiscussionDto dto)
        {
            var result = await _risService.PostDiscussionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa tin nhắn thảo luận
        /// </summary>
        [HttpDelete("consultations/discussions/{discussionId}")]
        public async Task<ActionResult> DeleteDiscussion(Guid discussionId)
        {
            await _risService.DeleteDiscussionAsync(discussionId);
            return NoContent();
        }

        /// <summary>
        /// Lưu ghi chú ảnh DICOM
        /// </summary>
        [HttpPost("consultations/image-notes")]
        public async Task<ActionResult<ConsultationImageNoteDto>> SaveImageNote([FromBody] AddConsultationImageNoteDto dto)
        {
            var result = await _risService.SaveImageNoteAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy ghi chú ảnh DICOM
        /// </summary>
        [HttpGet("consultations/{sessionId}/image-notes")]
        public async Task<ActionResult<List<ConsultationImageNoteDto>>> GetImageNotes(Guid sessionId, [FromQuery] string studyInstanceUID)
        {
            var result = await _risService.GetImageNotesAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu biên bản hội chẩn
        /// </summary>
        [HttpPost("consultations/minutes")]
        public async Task<ActionResult<ConsultationMinutesDto>> SaveMinutes([FromBody] SaveConsultationMinutesDto dto)
        {
            var result = await _risService.SaveMinutesAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy biên bản hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}/minutes")]
        public async Task<ActionResult<ConsultationMinutesDto>> GetMinutes(Guid sessionId)
        {
            var result = await _risService.GetMinutesAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Duyệt biên bản hội chẩn
        /// </summary>
        [HttpPost("consultations/minutes/{minutesId}/approve")]
        public async Task<ActionResult> ApproveMinutes(Guid minutesId)
        {
            await _risService.ApproveMinutesAsync(minutesId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tạo QR Code mời hội chẩn
        /// </summary>
        [HttpGet("consultations/{sessionId}/invite-qr")]
        public async Task<ActionResult<ConsultationInviteQRDto>> GenerateInviteQRCode(Guid sessionId)
        {
            var result = await _risService.GenerateInviteQRCodeAsync(sessionId);
            return Ok(result);
        }

        /// <summary>
        /// Bắt đầu/Dừng ghi hình phiên hội chẩn
        /// </summary>
        [HttpPost("consultations/{sessionId}/toggle-recording")]
        public async Task<ActionResult> ToggleRecording(Guid sessionId, [FromQuery] bool startRecording)
        {
            await _risService.ToggleRecordingAsync(sessionId, startRecording);
            return Ok(new { success = true, isRecording = startRecording });
        }

        #endregion

        #region X. HL7 CDA Integration

        /// <summary>
        /// Lấy danh sách cấu hình HL7 CDA
        /// </summary>
        [HttpGet("hl7-cda/configs")]
        public async Task<ActionResult<List<HL7CDAConfigDto>>> GetHL7CDAConfigs()
        {
            var result = await _risService.GetHL7CDAConfigsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình HL7 CDA
        /// </summary>
        [HttpPost("hl7-cda/configs")]
        public async Task<ActionResult<HL7CDAConfigDto>> SaveHL7CDAConfig([FromBody] SaveHL7CDAConfigDto dto)
        {
            var result = await _risService.SaveHL7CDAConfigAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình HL7 CDA
        /// </summary>
        [HttpDelete("hl7-cda/configs/{configId}")]
        public async Task<ActionResult> DeleteHL7CDAConfig(Guid configId)
        {
            await _risService.DeleteHL7CDAConfigAsync(configId);
            return NoContent();
        }

        /// <summary>
        /// Kiểm tra kết nối HL7
        /// </summary>
        [HttpGet("hl7-cda/configs/{configId}/test-connection")]
        public async Task<ActionResult> TestHL7Connection(Guid configId)
        {
            var result = await _risService.TestHL7ConnectionAsync(configId);
            return Ok(new { connected = result });
        }

        /// <summary>
        /// Gửi HL7 message
        /// </summary>
        [HttpPost("hl7-cda/send-message")]
        public async Task<ActionResult<SendHL7ResultDto>> SendHL7Message([FromBody] SendHL7MessageDto dto)
        {
            var result = await _risService.SendHL7MessageAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách HL7 messages theo ngày
        /// </summary>
        [HttpGet("hl7-cda/messages")]
        public async Task<ActionResult<HL7MessageSearchResultDto>> GetHL7Messages(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var searchDto = new SearchHL7MessageDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Page = 1,
                PageSize = 50
            };
            var result = await _risService.SearchHL7MessagesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Tìm kiếm HL7 messages
        /// </summary>
        [HttpPost("hl7-cda/messages/search")]
        public async Task<ActionResult<HL7MessageSearchResultDto>> SearchHL7Messages([FromBody] SearchHL7MessageDto searchDto)
        {
            var result = await _risService.SearchHL7MessagesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Retry gửi HL7 message lỗi
        /// </summary>
        [HttpPost("hl7-cda/messages/{messageId}/retry")]
        public async Task<ActionResult> RetryHL7Message(Guid messageId)
        {
            await _risService.RetryHL7MessageAsync(messageId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tạo tài liệu CDA
        /// </summary>
        [HttpPost("hl7-cda/documents")]
        public async Task<ActionResult<CDADocumentDto>> CreateCDADocument([FromBody] CreateCDADocumentDto dto)
        {
            var result = await _risService.CreateCDADocumentAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy tài liệu CDA
        /// </summary>
        [HttpGet("hl7-cda/documents/{documentId}")]
        public async Task<ActionResult<CDADocumentDto>> GetCDADocument(Guid documentId)
        {
            var result = await _risService.GetCDADocumentAsync(documentId);
            return Ok(result);
        }

        /// <summary>
        /// Gửi tài liệu CDA
        /// </summary>
        [HttpPost("hl7-cda/documents/send")]
        public async Task<ActionResult> SendCDADocument([FromBody] SendCDADocumentDto dto)
        {
            await _risService.SendCDADocumentAsync(dto);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Nhận chỉ định từ HIS qua HL7
        /// </summary>
        [HttpPost("hl7-cda/receive-order")]
        public async Task<ActionResult> ReceiveHL7Order([FromBody] ReceiveHL7OrderRequest request)
        {
            var orderId = await _risService.ReceiveHL7OrderAsync(request.HL7Message);
            return Ok(new { success = true, orderId });
        }

        /// <summary>
        /// Gửi kết quả về HIS qua HL7
        /// </summary>
        [HttpPost("hl7-cda/reports/{reportId}/send-result")]
        public async Task<ActionResult<SendHL7ResultDto>> SendHL7Result(Guid reportId, [FromQuery] bool withSignature = false)
        {
            var result = await _risService.SendHL7ResultAsync(reportId, withSignature);
            return Ok(result);
        }

        /// <summary>
        /// Hủy kết quả đã gửi về HIS
        /// </summary>
        [HttpPost("hl7-cda/reports/{reportId}/cancel-result")]
        public async Task<ActionResult> CancelHL7Result(Guid reportId, [FromBody] CancelHL7ResultRequest request)
        {
            await _risService.CancelHL7ResultAsync(reportId, request.Reason);
            return Ok(new { success = true });
        }

        #endregion

        #region IX. Online Help - Hướng dẫn sử dụng

        /// <summary>
        /// Lấy danh mục hướng dẫn
        /// </summary>
        [HttpGet("help/categories")]
        public async Task<ActionResult<List<HelpCategoryDto>>> GetHelpCategories([FromQuery] Guid? parentId = null)
        {
            var result = await _risService.GetHelpCategoriesAsync(parentId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu danh mục hướng dẫn
        /// </summary>
        [HttpPost("help/categories")]
        public async Task<ActionResult<HelpCategoryDto>> SaveHelpCategory([FromBody] SaveHelpCategoryDto dto)
        {
            var result = await _risService.SaveHelpCategoryAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa danh mục hướng dẫn
        /// </summary>
        [HttpDelete("help/categories/{categoryId}")]
        public async Task<ActionResult> DeleteHelpCategory(Guid categoryId)
        {
            await _risService.DeleteHelpCategoryAsync(categoryId);
            return NoContent();
        }

        /// <summary>
        /// Tìm kiếm bài viết hướng dẫn
        /// </summary>
        [HttpPost("help/articles/search")]
        public async Task<ActionResult<HelpSearchResultDto>> SearchHelpArticles([FromBody] SearchHelpDto searchDto)
        {
            var result = await _risService.SearchHelpArticlesAsync(searchDto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết bài viết
        /// </summary>
        [HttpGet("help/articles/{articleId}")]
        public async Task<ActionResult<HelpArticleDto>> GetHelpArticle(Guid articleId)
        {
            // Tăng lượt xem
            await _risService.IncrementArticleViewCountAsync(articleId);
            var result = await _risService.GetHelpArticleAsync(articleId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu bài viết hướng dẫn
        /// </summary>
        [HttpPost("help/articles")]
        public async Task<ActionResult<HelpArticleDto>> SaveHelpArticle([FromBody] SaveHelpArticleDto dto)
        {
            var result = await _risService.SaveHelpArticleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa bài viết hướng dẫn
        /// </summary>
        [HttpDelete("help/articles/{articleId}")]
        public async Task<ActionResult> DeleteHelpArticle(Guid articleId)
        {
            await _risService.DeleteHelpArticleAsync(articleId);
            return NoContent();
        }

        /// <summary>
        /// Lấy danh sách troubleshooting
        /// </summary>
        [HttpGet("help/troubleshooting")]
        public async Task<ActionResult<List<TroubleshootingDto>>> GetTroubleshootingList(
            [FromQuery] string module = null,
            [FromQuery] int? severity = null)
        {
            var result = await _risService.GetTroubleshootingListAsync(module, severity);
            return Ok(result);
        }

        /// <summary>
        /// Lưu troubleshooting
        /// </summary>
        [HttpPost("help/troubleshooting")]
        public async Task<ActionResult<TroubleshootingDto>> SaveTroubleshooting([FromBody] SaveTroubleshootingDto dto)
        {
            var result = await _risService.SaveTroubleshootingAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa troubleshooting
        /// </summary>
        [HttpDelete("help/troubleshooting/{troubleshootingId}")]
        public async Task<ActionResult> DeleteTroubleshooting(Guid troubleshootingId)
        {
            await _risService.DeleteTroubleshootingAsync(troubleshootingId);
            return NoContent();
        }

        #endregion

        #region VII. CLS Screen - Màn hình cận lâm sàng

        /// <summary>
        /// Lấy cấu hình màn hình CLS
        /// </summary>
        [HttpGet("cls-screen/config")]
        public async Task<ActionResult<CLSScreenConfigDto>> GetCLSScreenConfig()
        {
            var result = await _risService.GetCLSScreenConfigAsync();
            return Ok(result);
        }

        /// <summary>
        /// Lưu cấu hình màn hình CLS
        /// </summary>
        [HttpPost("cls-screen/config")]
        public async Task<ActionResult<CLSScreenConfigDto>> SaveCLSScreenConfig([FromBody] SaveCLSScreenConfigDto dto)
        {
            var result = await _risService.SaveCLSScreenConfigAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách mẫu mô tả theo dịch vụ
        /// </summary>
        [HttpGet("services/{serviceId}/description-templates")]
        public async Task<ActionResult<List<ServiceDescriptionTemplateDto>>> GetServiceDescriptionTemplates(Guid serviceId)
        {
            var result = await _risService.GetServiceDescriptionTemplatesAsync(serviceId);
            return Ok(result);
        }

        /// <summary>
        /// Lưu mẫu mô tả dịch vụ
        /// </summary>
        [HttpPost("services/description-templates")]
        public async Task<ActionResult<ServiceDescriptionTemplateDto>> SaveServiceDescriptionTemplate([FromBody] SaveServiceDescriptionTemplateDto dto)
        {
            var result = await _risService.SaveServiceDescriptionTemplateAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa mẫu mô tả dịch vụ
        /// </summary>
        [HttpDelete("services/description-templates/{templateId}")]
        public async Task<ActionResult> DeleteServiceDescriptionTemplate(Guid templateId)
        {
            await _risService.DeleteServiceDescriptionTemplateAsync(templateId);
            return NoContent();
        }

        /// <summary>
        /// Lấy lịch sử chẩn đoán ca chụp
        /// </summary>
        [HttpGet("requests/{requestId}/diagnosis-history")]
        public async Task<ActionResult<List<DiagnosisHistoryDto>>> GetDiagnosisHistory(Guid requestId)
        {
            var result = await _risService.GetDiagnosisHistoryAsync(requestId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử chụp chiếu của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/exam-history")]
        public async Task<ActionResult<List<RadiologyWaitingListDto>>> GetPatientExamHistory(
            Guid patientId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _risService.GetPatientExamHistoryAsync(patientId, fromDate, toDate);
            return Ok(result);
        }

        #endregion
    }

    #region Request DTOs

    public class LinkStudyRequest
    {
        public string StudyInstanceUID { get; set; }
    }

    public class ApproveRequest
    {
        public string Note { get; set; }
    }

    public class RISCancelApprovalRequest
    {
        public string Reason { get; set; }
    }

    #endregion
}
