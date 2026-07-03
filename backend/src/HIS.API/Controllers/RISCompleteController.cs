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
    /// <summary>
    /// Complete RIS/PACS Controller
    /// Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // JWT required; role filtering applied at method level
    [TypeFilter(typeof(HIS.API.Filters.DomainExceptionFilter))] // sweep 2026-06-12: lỗi nghiệp vụ → 400/404 message rõ
    public partial class RISCompleteController : ControllerBase
    {
        private readonly IRISCompleteService _risService;
        private readonly IDigitalSignatureService _digitalSignatureService;
        private readonly IPdfSignatureService _pdfSignatureService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<RISCompleteController> _logger;

        // G-36: helper lấy userId từ JWT claim (dùng cho permission check)
        private Guid GetUserId() =>
            Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

        public RISCompleteController(
            IRISCompleteService risService,
            IDigitalSignatureService digitalSignatureService,
            IPdfSignatureService pdfSignatureService,
            IConfiguration configuration,
            ILogger<RISCompleteController> logger)
        {
            _risService = risService;
            _digitalSignatureService = digitalSignatureService;
            _pdfSignatureService = pdfSignatureService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Tạo yêu cầu CĐHA (alias for POST /orders)
        /// </summary>
        [HttpPost("requests")]
        public async Task<ActionResult> CreateRadiologyRequest([FromBody] CreateRadiologyPrescriptionDto dto)
        {
            var result = await _risService.CreateRadiologyPrescriptionAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Duyệt kết quả CĐHA (alias for final-approve)
        /// </summary>
        [HttpPost("results/approve")]
        public async Task<ActionResult> ApproveResult([FromBody] ApproveRadiologyResultDto dto)
        {
            dto.ApprovingUserId = GetUserId(); // G-36: per-modality permission check
            try { await _risService.FinalApproveResultAsync(dto); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, ApiResponse<object>.Fail(ex.Message)); }
            return Ok();
        }

        #region 8.1 Màn hình chờ thực hiện

        /// <summary>
        /// 8.1.1 Hiển thị danh sách bệnh nhân chờ thực hiện
        /// </summary>
        [HttpGet("waiting-list")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<List<RadiologyWaitingListDto>>> GetWaitingList(
            [FromQuery] DateTime date,
            [FromQuery] Guid? roomId = null,
            [FromQuery] string serviceType = null,
            [FromQuery] string status = null,
            [FromQuery] string keyword = null,
            [FromQuery] bool overdueOnly = false,
            [FromQuery] string examGroupName = null)
        {
            var result = await _risService.GetWaitingListAsync(date, roomId, serviceType, status, keyword, overdueOnly, examGroupName);
            return Ok(result);
        }

        /// <summary>
        /// 8.1.2 Phát loa gọi bệnh nhân vào thực hiện
        /// </summary>
        [HttpPost("call-patient")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult<CallPatientResultDto>> CallPatient([FromBody] CallPatientDto dto)
        {
            var result = await _risService.CallPatientAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Lấy cấu hình màn hình hiển thị
        /// </summary>
        [HttpGet("rooms/{roomId}/display-config")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<WaitingDisplayConfigDto>> GetDisplayConfig(Guid roomId)
        {
            var result = await _risService.GetDisplayConfigAsync(roomId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật cấu hình màn hình hiển thị
        /// </summary>
        [HttpPut("rooms/{roomId}/display-config")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult> UpdateDisplayConfig(Guid roomId, [FromBody] WaitingDisplayConfigDto config)
        {
            config.RoomId = roomId;
            await _risService.UpdateDisplayConfigAsync(config);
            return Ok();
        }

        /// <summary>
        /// Cập nhật ngày của tất cả RadiologyRequests thành ngày hôm nay (DEV only)
        /// </summary>
        [HttpPost("dev/update-dates-to-today")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> UpdateDatesToToday()
        {
            var count = await _risService.UpdateAllRequestDatesToTodayAsync();
            return Ok(new { updatedCount = count });
        }

        /// <summary>
        /// Thêm DicomStudy test cho các request completed để test nút Xem hình (DEV only)
        /// </summary>
        [HttpPost("dev/add-test-dicom-studies")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> AddTestDicomStudies()
        {
            var count = await _risService.AddTestDicomStudiesForCompletedRequestsAsync();
            return Ok(new { addedCount = count });
        }

        /// <summary>
        /// Sửa StudyInstanceUID fake thành UID thật từ Orthanc (DEV only)
        /// </summary>
        [HttpPost("dev/fix-dicom-uids")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> FixDicomUIDs()
        {
            var count = await _risService.FixDicomStudyUIDsAsync();
            return Ok(new { fixedCount = count });
        }

        /// <summary>
        /// Xóa DicomStudies của các request chưa hoàn thành (DEV only)
        /// </summary>
        [HttpPost("dev/cleanup-incomplete-dicom-studies")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> CleanupIncompleteDicomStudies()
        {
            var count = await _risService.CleanupDicomStudiesForIncompleteRequestsAsync();
            return Ok(new { removedCount = count });
        }

        /// <summary>
        /// Đồng bộ status của request dựa trên dữ liệu Exam (DEV only)
        /// </summary>
        [HttpPost("dev/sync-request-status")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> SyncRequestStatus()
        {
            var count = await _risService.SyncRequestStatusWithExamsAsync();
            return Ok(new { updatedCount = count });
        }

        /// <summary>
        /// Bắt đầu thực hiện
        /// </summary>
        [HttpPost("orders/{orderId}/start")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult> StartExam(Guid orderId)
        {
            await _risService.StartExamAsync(orderId);
            return Ok();
        }

        /// <summary>
        /// Kết thúc thực hiện
        /// </summary>
        [HttpPost("orders/{orderId}/complete")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
        public async Task<ActionResult> CompleteExam(Guid orderId)
        {
            // Sweep 2026-06-12: service trả false khi order không tồn tại nhưng controller từng
            // nuốt bool → success giả. Giờ 404 rõ ràng.
            var ok = await _risService.CompleteExamAsync(orderId);
            if (!ok) return NotFound(ApiResponse<object>.Fail("Order CĐHA không tồn tại"));
            return Ok();
        }

        #endregion

        #region 8.2 Kết nối PACS & Modality

        /// <summary>
        /// 8.2.1 Danh sách cấu hình PACS
        /// </summary>
        [HttpGet("pacs-connections")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<List<PACSConnectionDto>>> GetPACSConnections()
        {
            var result = await _risService.GetPACSConnectionsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Thêm mới cấu hình PACS
        /// </summary>
        [HttpPost("pacs-connections")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult<PACSConnectionDto>> CreatePACSConnection([FromBody] CreatePACSConnectionDto dto)
        {
            var result = await _risService.CreatePACSConnectionAsync(dto);
            return CreatedAtAction(nameof(GetPACSConnections), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật cấu hình PACS
        /// </summary>
        [HttpPut("pacs-connections/{id}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult<PACSConnectionDto>> UpdatePACSConnection(Guid id, [FromBody] UpdatePACSConnectionDto dto)
        {
            var result = await _risService.UpdatePACSConnectionAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa cấu hình PACS
        /// </summary>
        [HttpDelete("pacs-connections/{id}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult> DeletePACSConnection(Guid id)
        {
            await _risService.DeletePACSConnectionAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 8.2.2 Kiểm tra kết nối PACS
        /// </summary>
        [HttpGet("pacs-connections/{connectionId}/status")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager)]
        public async Task<ActionResult<PACSConnectionStatusDto>> CheckPACSConnection(Guid connectionId)
        {
            var result = await _risService.CheckPACSConnectionAsync(connectionId);
            return Ok(result);
        }

        /// <summary>
        /// 8.2.3 Danh sách máy chẩn đoán hình ảnh
        /// </summary>
        [HttpGet("modalities")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Radiologist + "," + RoleNames.Technician)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult<ModalityDto>> CreateModality([FromBody] CreateModalityDto dto)
        {
            var result = await _risService.CreateModalityAsync(dto);
            return CreatedAtAction(nameof(GetModalities), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật Modality
        /// </summary>
        [HttpPut("modalities/{id}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult<ModalityDto>> UpdateModality(Guid id, [FromBody] UpdateModalityDto dto)
        {
            var result = await _risService.UpdateModalityAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xóa Modality
        /// </summary>
        [HttpDelete("modalities/{id}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult> DeleteModality(Guid id)
        {
            await _risService.DeleteModalityAsync(id);
            return NoContent();
        }

        /// <summary>
        /// Gửi worklist đến máy
        /// </summary>
        [HttpPost("modalities/worklist/send")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong + "," + RoleNames.RadiologistManager + "," + RoleNames.Technician)]
        public async Task<ActionResult<SendWorklistResultDto>> SendWorklistToModality([FromBody] SendModalityWorklistDto dto)
        {
            var result = await _risService.SendWorklistToModalityAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 8.2.4 Cấu hình kết nối thiết bị khác (siêu âm, nội soi)
        /// </summary>
        [HttpPut("devices/{deviceId}/connection")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.QuanTriHeThong)]
        public async Task<ActionResult> ConfigureDeviceConnection(Guid deviceId, [FromBody] DeviceConnectionConfigDto config)
        {
            await _risService.ConfigureDeviceConnectionAsync(deviceId, config);
            return Ok();
        }

        #endregion
    }

    #region Request DTOs




    #endregion
}
