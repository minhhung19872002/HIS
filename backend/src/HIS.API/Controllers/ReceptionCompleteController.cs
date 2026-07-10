using System.Security.Claims;
using HIS.Core.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;
using WaitingPhaseAnalysisDto = HIS.Application.DTOs.Reception.WaitingPhaseAnalysisDto;
using HIS.API.Dtos.ReceptionComplete;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 1: Quản lý Hành chính, Đón tiếp
/// Bao gồm tất cả 105+ chức năng theo yêu cầu HIS
/// </summary>
[Authorize]
[ApiController]
[Route("api/reception")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))]
public partial class ReceptionCompleteController : ControllerBase
{
    private readonly IReceptionCompleteService _receptionService;
    private readonly ILogger<ReceptionCompleteController> _logger;

    public ReceptionCompleteController(
        IReceptionCompleteService receptionService,
        ILogger<ReceptionCompleteController> logger)
    {
        _receptionService = receptionService;
        _logger = logger;
    }

    #region 1.1 Điều phối bệnh nhân vào các phòng khám

    /// <summary>
    /// 1.1.1-6: Xem tổng quan tất cả phòng khám trong ngày
    /// </summary>
    [HttpGet("rooms/overview")]
    public async Task<ActionResult<List<RoomOverviewDto>>> GetRoomOverview(
        [FromQuery] Guid? departmentId,
        [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetRoomOverviewAsync(departmentId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// 1.1.7-9: Xem chi tiết và trạng thái một phòng khám
    /// </summary>
    [HttpGet("rooms/{roomId}/detail")]
    public async Task<ActionResult<RoomOverviewDto>> GetRoomDetail(Guid roomId, [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetRoomDetailAsync(roomId, date ?? DateTime.Today);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// 1.1.7: Xem danh sách bác sĩ đang làm việc
    /// </summary>
    [HttpGet("doctors/working")]
    public async Task<ActionResult<List<DoctorScheduleDto>>> GetWorkingDoctors(
        [FromQuery] Guid? departmentId,
        [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetWorkingDoctorsAsync(departmentId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// 1.1.8: Xem lịch làm việc bác sĩ theo phòng
    /// </summary>
    [HttpGet("rooms/{roomId}/doctors/schedule")]
    public async Task<ActionResult<List<DoctorScheduleDto>>> GetDoctorSchedule(Guid roomId, [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetDoctorScheduleAsync(roomId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lấy phòng khám có thể điều phối
    /// </summary>
    [HttpGet("rooms/available")]
    public async Task<ActionResult<List<RoomOverviewDto>>> GetAvailableRooms(
        [FromQuery] Guid departmentId,
        [FromQuery] int patientType,
        [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetAvailableRoomsAsync(departmentId, patientType, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bệnh nhân đăng ký trong ngày
    /// </summary>
    [HttpGet("admissions/today")]
    public async Task<ActionResult<List<AdmissionDto>>> GetTodayAdmissions(
        [FromQuery] Guid? roomId,
        [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetTodayAdmissionsAsync(roomId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm bệnh nhân theo mã, tên, CCCD, SĐT, thẻ BHYT
    /// </summary>
    [HttpGet("patients/search")]
    public async Task<ActionResult<List<AdmissionDto>>> SearchPatients([FromQuery] string keyword)
    {
        var result = await _receptionService.SearchPatientsAsync(keyword ?? "");
        return Ok(result);
    }

    #endregion

    #region 1.2 Hệ thống xếp hàng

    /// <summary>
    /// 1.2.1: Cấp số thứ tự mới
    /// </summary>
    [HttpPost("queue/issue")]
    public async Task<ActionResult<QueueTicketDto>> IssueQueueTicket([FromBody] IssueQueueTicketDto dto)
    {
        var result = await _receptionService.IssueQueueTicketAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// 1.2.4: Cấp số thứ tự qua di động
    /// </summary>
    [HttpPost("queue/issue-mobile")]
    [AllowAnonymous]
    public async Task<ActionResult<QueueTicketDto>> IssueQueueTicketMobile([FromBody] MobileQueueTicketDto dto)
    {
        var result = await _receptionService.IssueQueueTicketMobileAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Gọi số tiếp theo
    /// </summary>
    [HttpPost("queue/call-next")]
    public async Task<ActionResult<QueueTicketDto>> CallNext([FromBody] CallNextRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CallNextAsync(dto.RoomId, dto.QueueType, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.2.3: Gọi số cụ thể (phát loa gọi bệnh nhân)
    /// </summary>
    [HttpPost("queue/{ticketId}/call")]
    public async Task<ActionResult<QueueTicketDto>> CallSpecific(Guid ticketId)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CallSpecificAsync(ticketId, userId);
        return Ok(result);
    }

    /// <summary>
    /// Gọi lại số
    /// </summary>
    [HttpPost("queue/{ticketId}/recall")]
    public async Task<ActionResult<QueueTicketDto>> Recall(Guid ticketId)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RecallAsync(ticketId, userId);
        return Ok(result);
    }

    /// <summary>
    /// Bỏ qua số
    /// </summary>
    [HttpPost("queue/{ticketId}/skip")]
    public async Task<ActionResult<QueueTicketDto>> Skip(Guid ticketId, [FromBody] SkipReasonDto? dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.SkipAsync(ticketId, userId, dto?.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Bắt đầu phục vụ
    /// </summary>
    [HttpPost("queue/{ticketId}/start-serving")]
    public async Task<ActionResult<QueueTicketDto>> StartServing(Guid ticketId)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.StartServingAsync(ticketId, userId);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành phục vụ
    /// </summary>
    [HttpPost("queue/{ticketId}/complete")]
    public async Task<ActionResult<QueueTicketDto>> CompleteServing(Guid ticketId)
    {
        var result = await _receptionService.CompleteServingAsync(ticketId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách chờ
    /// </summary>
    [HttpGet("queue/waiting/{roomId}")]
    public async Task<ActionResult<List<QueueTicketDto>>> GetWaitingList(
        Guid roomId,
        [FromQuery] int queueType,
        [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetWaitingListAsync(roomId, queueType, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// 1.2.2: Màn hình hiển thị hàng đợi (public API)
    /// </summary>
    [HttpGet("queue/display/{roomId}")]
    [AllowAnonymous]
    public async Task<ActionResult<QueueDisplayDto>> GetDisplayData(Guid roomId, [FromQuery] int queueType)
    {
        var result = await _receptionService.GetDisplayDataAsync(roomId, queueType);
        if (result != null)
        {
            MaskTicketPii(result.CurrentServing);
            result.CallingList.ForEach(MaskTicketPii);
            result.WaitingList.ForEach(MaskTicketPii);
        }
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách số đang gọi
    /// </summary>
    [HttpGet("queue/calling/{roomId}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<QueueTicketDto>>> GetCallingTickets(Guid roomId, [FromQuery] int limit = 5)
    {
        var result = await _receptionService.GetCallingTicketsAsync(roomId, limit);
        result?.ForEach(MaskTicketPii);
        return Ok(result);
    }

    /// <summary>Endpoint anonymous (màn hình TV) không được lộ họ tên đầy đủ + PatientId/mã BN (#406).</summary>
    private static void MaskTicketPii(QueueTicketDto? ticket)
    {
        if (ticket == null) return;
        ticket.PatientName = NameMask.Mask(ticket.PatientName);
        ticket.PatientId = null;
        ticket.PatientCode = null;
    }

    #endregion

    #region 1.3 Kết nối BHYT

    /// <summary>
    /// 1.3.1-4: Kiểm tra thẻ BHYT
    /// </summary>
    [HttpPost("insurance/verify")]
    public async Task<ActionResult<InsuranceVerificationResultDto>> VerifyInsurance(
        [FromBody] InsuranceVerificationRequestDto dto)
    {
        var result = await _receptionService.VerifyInsuranceAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// 1.3.1: Đọc thẻ BHYT bằng QR Code
    /// </summary>
    [HttpPost("insurance/verify-qr")]
    public async Task<ActionResult<InsuranceVerificationResultDto>> VerifyInsuranceByQR([FromBody] QRCodeDto dto)
    {
        var result = await _receptionService.VerifyInsuranceByQRAsync(dto.QRData);
        return Ok(result);
    }

    /// <summary>
    /// 1.11.1: Lấy danh sách thẻ BHYT bị chặn
    /// </summary>
    [HttpGet("insurance/blocked")]
    public async Task<ActionResult<PagedResultDto<BlockedInsuranceDto>>> GetBlockedInsuranceList(
        [FromQuery] string? keyword,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _receptionService.GetBlockedInsuranceListAsync(keyword, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// 1.11.1: Chặn thẻ BHYT lạm dụng
    /// </summary>
    [HttpPost("insurance/block")]
    public async Task<ActionResult<BlockedInsuranceDto>> BlockInsurance([FromBody] BlockInsuranceRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.BlockInsuranceAsync(
            dto.InsuranceNumber, dto.Reason, dto.Notes, userId);
        return Ok(result);
    }

    /// <summary>
    /// Mở chặn thẻ BHYT
    /// </summary>
    [HttpPost("insurance/{id}/unblock")]
    public async Task<IActionResult> UnblockInsurance(Guid id)
    {
        var userId = GetCurrentUserId();
        await _receptionService.UnblockInsuranceAsync(id, userId);
        return Ok(new { message = "Unblocked successfully" });
    }

    #endregion

    #region 1.4 Cấp thẻ BHYT tạm cho trẻ sơ sinh

    /// <summary>
    /// 1.4.4: Kiểm tra điều kiện cấp thẻ BHYT tạm
    /// </summary>
    [HttpGet("insurance/temporary/check-eligibility")]
    public async Task<ActionResult<object>> CheckTemporaryInsuranceEligibility([FromQuery] DateTime dateOfBirth)
    {
        var (isEligible, message) = await _receptionService.CheckTemporaryInsuranceEligibilityAsync(dateOfBirth);
        return Ok(new { isEligible, message });
    }

    /// <summary>
    /// 1.4.1-3: Tạo thẻ BHYT tạm cho trẻ sơ sinh (CV 3434/BYT-BH)
    /// </summary>
    [HttpPost("insurance/temporary")]
    public async Task<ActionResult<TemporaryInsuranceCardDto>> CreateTemporaryInsurance(
        [FromBody] CreateTemporaryInsuranceDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreateTemporaryInsuranceAsync(dto, userId);
        return Ok(result);
    }

    #endregion

    #region 1.5 Chụp ảnh bệnh nhân và giấy tờ

    /// <summary>
    /// 1.5.1-6: Tải ảnh lên
    /// </summary>
    [HttpPost("photos")]
    public async Task<ActionResult<PatientPhotoDto>> UploadPhoto([FromBody] UploadPhotoDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.SavePhotoAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.5.1: Lấy danh sách ảnh bệnh nhân (chân dung để đối chiếu)
    /// </summary>
    [HttpGet("photos/patient/{patientId}")]
    public async Task<ActionResult<List<PatientPhotoDto>>> GetPatientPhotos(
        Guid patientId,
        [FromQuery] Guid? medicalRecordId)
    {
        var result = await _receptionService.GetPatientPhotosAsync(patientId, medicalRecordId);
        return Ok(result);
    }

    /// <summary>
    /// Xóa ảnh
    /// </summary>
    [HttpDelete("photos/{photoId}")]
    public async Task<IActionResult> DeletePhoto(Guid photoId)
    {
        var userId = GetCurrentUserId();
        await _receptionService.DeletePhotoAsync(photoId, userId);
        return Ok(new { message = "Deleted successfully" });
    }

    /// <summary>
    /// 1.5.5: Lấy cấu hình camera
    /// </summary>
    [HttpGet("camera/config/{workstationId}")]
    public async Task<ActionResult<CameraConfigDto>> GetCameraConfig(string workstationId)
    {
        var result = await _receptionService.GetCameraConfigAsync(workstationId);
        return Ok(result);
    }

    #endregion

    #region 1.6 & 1.15 Quản lý giữ/trả giấy tờ

    /// <summary>
    /// 1.6.1-4: Tạo phiếu giữ giấy tờ
    /// </summary>
    [HttpPost("documents/hold")]
    public async Task<ActionResult<DocumentHoldDto>> CreateDocumentHold([FromBody] CreateDocumentHoldDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreateDocumentHoldAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.15.2: Trả giấy tờ
    /// </summary>
    [HttpPost("documents/return")]
    public async Task<ActionResult<DocumentHoldDto>> ReturnDocument([FromBody] ReturnDocumentDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.ReturnDocumentAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.6.5 & 1.6.7: Tìm kiếm giấy tờ đang giữ
    /// </summary>
    [HttpPost("documents/search")]
    public async Task<ActionResult<PagedResultDto<DocumentHoldDto>>> SearchDocumentHolds(
        [FromBody] DocumentHoldSearchDto dto)
    {
        var result = await _receptionService.SearchDocumentHoldsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// 1.6.6: In phiếu giữ giấy tờ
    /// </summary>
    [HttpGet("documents/{documentHoldId}/receipt")]
    public async Task<ActionResult<DocumentHoldReceiptDto>> GetDocumentHoldReceipt(Guid documentHoldId)
    {
        var result = await _receptionService.GetDocumentHoldReceiptAsync(documentHoldId);
        return Ok(result);
    }

    /// <summary>
    /// 1.6.8: In phiếu trả giấy tờ
    /// </summary>
    [HttpGet("documents/{documentHoldId}/return-receipt")]
    public async Task<ActionResult<DocumentHoldReceiptDto>> GetDocumentReturnReceipt(Guid documentHoldId)
    {
        var result = await _receptionService.GetDocumentReturnReceiptAsync(documentHoldId);
        return Ok(result);
    }

    #endregion

    #region Private Helpers

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            return userId;
        throw new UnauthorizedAccessException("User ID not found in token");
    }

    #endregion
}

#region Request DTOs













#endregion
