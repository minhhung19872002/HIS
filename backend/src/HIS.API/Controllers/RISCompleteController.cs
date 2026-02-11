using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.Radiology;

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

        public RISCompleteController(IRISCompleteService risService)
        {
            _risService = risService;
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
