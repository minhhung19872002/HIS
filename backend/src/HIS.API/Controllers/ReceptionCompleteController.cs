using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 1: Quản lý Hành chính, Đón tiếp
/// Bao gồm tất cả 105+ chức năng theo yêu cầu HIS
/// </summary>
[Authorize]
[ApiController]
[Route("api/reception")]
public class ReceptionCompleteController : ControllerBase
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

    #endregion

    #region 1.2 Hệ thống xếp hàng

    /// <summary>
    /// 1.2.1: Cấp số thứ tự mới
    /// </summary>
    [HttpPost("queue/issue")]
    public async Task<ActionResult<QueueTicketDto>> IssueQueueTicket([FromBody] IssueQueueTicketDto dto)
    {
        try
        {
            var result = await _receptionService.IssueQueueTicketAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error issuing queue ticket");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.2.4: Cấp số thứ tự qua di động
    /// </summary>
    [HttpPost("queue/issue-mobile")]
    [AllowAnonymous]
    public async Task<ActionResult<QueueTicketDto>> IssueQueueTicketMobile([FromBody] MobileQueueTicketDto dto)
    {
        try
        {
            var result = await _receptionService.IssueQueueTicketMobileAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error issuing mobile queue ticket");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gọi số tiếp theo
    /// </summary>
    [HttpPost("queue/call-next")]
    public async Task<ActionResult<QueueTicketDto>> CallNext([FromBody] CallNextRequestDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CallNextAsync(dto.RoomId, dto.QueueType, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling next number");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.2.3: Gọi số cụ thể (phát loa gọi bệnh nhân)
    /// </summary>
    [HttpPost("queue/{ticketId}/call")]
    public async Task<ActionResult<QueueTicketDto>> CallSpecific(Guid ticketId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CallSpecificAsync(ticketId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling specific number");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gọi lại số
    /// </summary>
    [HttpPost("queue/{ticketId}/recall")]
    public async Task<ActionResult<QueueTicketDto>> Recall(Guid ticketId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RecallAsync(ticketId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recalling number");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bỏ qua số
    /// </summary>
    [HttpPost("queue/{ticketId}/skip")]
    public async Task<ActionResult<QueueTicketDto>> Skip(Guid ticketId, [FromBody] SkipReasonDto? dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.SkipAsync(ticketId, userId, dto?.Reason);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error skipping number");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bắt đầu phục vụ
    /// </summary>
    [HttpPost("queue/{ticketId}/start-serving")]
    public async Task<ActionResult<QueueTicketDto>> StartServing(Guid ticketId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.StartServingAsync(ticketId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting serving");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Hoàn thành phục vụ
    /// </summary>
    [HttpPost("queue/{ticketId}/complete")]
    public async Task<ActionResult<QueueTicketDto>> CompleteServing(Guid ticketId)
    {
        try
        {
            var result = await _receptionService.CompleteServingAsync(ticketId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing serving");
            return BadRequest(new { message = ex.Message });
        }
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
        return Ok(result);
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
        try
        {
            var result = await _receptionService.VerifyInsuranceAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying insurance");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.3.1: Đọc thẻ BHYT bằng QR Code
    /// </summary>
    [HttpPost("insurance/verify-qr")]
    public async Task<ActionResult<InsuranceVerificationResultDto>> VerifyInsuranceByQR([FromBody] QRCodeDto dto)
    {
        try
        {
            var result = await _receptionService.VerifyInsuranceByQRAsync(dto.QRData);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying insurance by QR");
            return BadRequest(new { message = ex.Message });
        }
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
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.BlockInsuranceAsync(
                dto.InsuranceNumber, dto.Reason, dto.Notes, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error blocking insurance");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mở chặn thẻ BHYT
    /// </summary>
    [HttpPost("insurance/{id}/unblock")]
    public async Task<IActionResult> UnblockInsurance(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _receptionService.UnblockInsuranceAsync(id, userId);
            return Ok(new { message = "Unblocked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unblocking insurance");
            return BadRequest(new { message = ex.Message });
        }
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
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreateTemporaryInsuranceAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating temporary insurance");
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region 1.5 Chụp ảnh bệnh nhân và giấy tờ

    /// <summary>
    /// 1.5.1-6: Tải ảnh lên
    /// </summary>
    [HttpPost("photos")]
    public async Task<ActionResult<PatientPhotoDto>> UploadPhoto([FromBody] UploadPhotoDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.SavePhotoAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading photo");
            return BadRequest(new { message = ex.Message });
        }
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
        try
        {
            var userId = GetCurrentUserId();
            await _receptionService.DeletePhotoAsync(photoId, userId);
            return Ok(new { message = "Deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting photo");
            return BadRequest(new { message = ex.Message });
        }
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
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreateDocumentHoldAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating document hold");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.15.2: Trả giấy tờ
    /// </summary>
    [HttpPost("documents/return")]
    public async Task<ActionResult<DocumentHoldDto>> ReturnDocument([FromBody] ReturnDocumentDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.ReturnDocumentAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error returning document");
            return BadRequest(new { message = ex.Message });
        }
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

    #region 1.7 Đăng ký khám BHYT

    /// <summary>
    /// 1.7.1-3: Đăng ký khám BHYT
    /// </summary>
    [HttpPost("register/insurance")]
    public async Task<ActionResult<AdmissionDto>> RegisterInsurancePatient([FromBody] InsuranceRegistrationDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterInsurancePatientAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering insurance patient");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.7.4: Đăng ký khám nhanh bằng mã bệnh nhân
    /// </summary>
    [HttpPost("register/quick/patient-code")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByPatientCode([FromBody] QuickRegisterByCodeDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.QuickRegisterByPatientCodeAsync(dto.PatientCode, dto.RoomId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in quick register by patient code");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.7.5: Đăng ký khám nhanh bằng mã hẹn khám
    /// </summary>
    [HttpPost("register/quick/appointment")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByAppointment([FromBody] QuickRegisterByAppointmentDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.QuickRegisterByAppointmentAsync(dto.AppointmentCode, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in quick register by appointment");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.7.6: Đăng ký khám nhanh bằng CCCD
    /// </summary>
    [HttpPost("register/quick/identity")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByIdentity([FromBody] QuickRegisterByIdentityDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.QuickRegisterByIdentityAsync(dto.IdentityNumber, dto.RoomId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in quick register by identity");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.7.8: Đăng ký khám bằng mã điều trị
    /// </summary>
    [HttpPost("register/quick/treatment-code")]
    public async Task<ActionResult<AdmissionDto>> RegisterByTreatmentCode([FromBody] QuickRegisterByCodeDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterByTreatmentCodeAsync(dto.PatientCode, dto.RoomId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering by treatment code");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.7.9: Đăng ký bằng thẻ khám bệnh thông minh
    /// </summary>
    [HttpPost("register/smart-card")]
    public async Task<ActionResult<AdmissionDto>> RegisterBySmartCard([FromBody] SmartCardRegistrationDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterBySmartCardAsync(dto.CardData, dto.RoomId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering by smart card");
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region 1.8 Đăng ký khám viện phí/dịch vụ

    /// <summary>
    /// 1.8.1-7: Đăng ký khám viện phí/dịch vụ
    /// </summary>
    [HttpPost("register/fee")]
    public async Task<ActionResult<AdmissionDto>> RegisterFeePatient([FromBody] FeeRegistrationDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterFeePatientAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering fee patient");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.8.8: Đăng ký khám nhanh bằng SĐT
    /// </summary>
    [HttpPost("register/quick/phone")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByPhone([FromBody] QuickRegisterByPhoneDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.QuickRegisterByPhoneAsync(
                dto.PhoneNumber, dto.RoomId, dto.ServiceType, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in quick register by phone");
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region 1.9 Đăng ký khám sức khỏe

    /// <summary>
    /// 1.9.2: Tạo hợp đồng khám sức khỏe
    /// </summary>
    [HttpPost("health-check/contracts")]
    public async Task<ActionResult<HealthCheckContractDto>> CreateHealthCheckContract(
        [FromBody] HealthCheckContractDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreateHealthCheckContractAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating health check contract");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách hợp đồng khám sức khỏe
    /// </summary>
    [HttpGet("health-check/contracts")]
    public async Task<ActionResult<PagedResultDto<HealthCheckContractDto>>> GetHealthCheckContracts(
        [FromQuery] string? keyword,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _receptionService.GetHealthCheckContractsAsync(keyword, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// 1.9.3 & 1.9.5-6: Import danh sách bệnh nhân khám sức khỏe
    /// </summary>
    [HttpPost("health-check/contracts/{contractId}/import")]
    public async Task<ActionResult<object>> ImportHealthCheckPatients(
        Guid contractId,
        [FromBody] List<HealthCheckPatientImportDto> patients)
    {
        try
        {
            var userId = GetCurrentUserId();
            var dto = new HealthCheckImportDto { ContractId = contractId, Patients = patients };
            var (success, failed, errors) = await _receptionService.ImportHealthCheckPatientsAsync(dto, userId);
            return Ok(new { success, failed, errors });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing health check patients");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.9.1: Đăng ký khám sức khỏe
    /// </summary>
    [HttpPost("register/health-check")]
    public async Task<ActionResult<AdmissionDto>> RegisterHealthCheckPatient([FromBody] HealthCheckRegistrationDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterHealthCheckPatientAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering health check patient");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách gói khám sức khỏe
    /// </summary>
    [HttpGet("health-check/packages")]
    public async Task<ActionResult<List<HealthCheckPackageDto>>> GetHealthCheckPackages(
        [FromQuery] int? forGender,
        [FromQuery] int? age)
    {
        var result = await _receptionService.GetHealthCheckPackagesAsync(forGender, age);
        return Ok(result);
    }

    #endregion

    #region 1.10 Đăng ký khám cấp cứu

    /// <summary>
    /// 1.10.1-3: Đăng ký cấp cứu
    /// </summary>
    [HttpPost("register/emergency")]
    public async Task<ActionResult<AdmissionDto>> RegisterEmergencyPatient([FromBody] EmergencyRegistrationDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.RegisterEmergencyPatientAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering emergency patient");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.10.4: Cập nhật thông tin bệnh nhân cấp cứu
    /// </summary>
    [HttpPut("emergency/{medicalRecordId}/patient-info")]
    public async Task<ActionResult<AdmissionDto>> UpdateEmergencyPatientInfo(
        Guid medicalRecordId,
        [FromBody] UpdateEmergencyPatientDto dto)
    {
        try
        {
            dto.MedicalRecordId = medicalRecordId;
            var userId = GetCurrentUserId();
            var result = await _receptionService.UpdateEmergencyPatientInfoAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating emergency patient info");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.10.5: Ghép mã bệnh nhân
    /// </summary>
    [HttpPost("patients/merge")]
    public async Task<IActionResult> MergePatients([FromBody] MergePatientDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _receptionService.MergePatientsAsync(dto, userId);
            return Ok(new { message = "Patients merged successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging patients");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.10.6: Tạm ứng cho bệnh nhân cấp cứu
    /// </summary>
    [HttpPost("emergency/{medicalRecordId}/deposit")]
    public async Task<ActionResult<DepositReceiptDto>> CreateEmergencyDeposit(
        Guid medicalRecordId,
        [FromBody] EmergencyDepositDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreateEmergencyDepositAsync(medicalRecordId, dto.Amount, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating emergency deposit");
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region 1.11 Quản lý tiếp đón khác

    /// <summary>
    /// 1.11.4 & 1.11.8-9: Lấy cảnh báo tiếp đón
    /// </summary>
    [HttpGet("warnings/patient/{patientId}")]
    public async Task<ActionResult<List<ReceptionWarningDto>>> GetReceptionWarnings(Guid patientId)
    {
        var result = await _receptionService.GetReceptionWarningsAsync(patientId);
        return Ok(result);
    }

    /// <summary>
    /// 1.11.6-7: Đổi/Sửa phòng khám
    /// </summary>
    [HttpPost("admissions/{medicalRecordId}/change-room")]
    public async Task<ActionResult<AdmissionDto>> ChangeRoom(Guid medicalRecordId, [FromBody] ChangeRoomRequestDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var changeDto = new ChangeRoomDto
            {
                MedicalRecordId = medicalRecordId,
                NewRoomId = dto.NewRoomId,
                NewDoctorId = dto.NewDoctorId,
                Reason = dto.Reason
            };
            var result = await _receptionService.ChangeRoomAsync(changeDto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing room");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.11.5: Sửa thông tin đăng ký tiếp đón
    /// </summary>
    [HttpPut("admissions/{id}")]
    public async Task<ActionResult<AdmissionDto>> UpdateAdmission(Guid id, [FromBody] UpdateAdmissionDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.UpdateAdmissionAsync(id, dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating admission");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.11.2: Lấy danh sách nguồn chi trả khác
    /// </summary>
    [HttpGet("payers")]
    public async Task<ActionResult<List<OtherPayerDto>>> GetOtherPayers()
    {
        var result = await _receptionService.GetOtherPayersAsync();
        return Ok(result);
    }

    /// <summary>
    /// 1.11.3: Khai báo thông tin người thân
    /// </summary>
    [HttpPost("patients/{patientId}/guardian")]
    public async Task<IActionResult> SaveGuardianInfo(Guid patientId, [FromBody] GuardianInfoDto guardian)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _receptionService.SaveGuardianInfoAsync(patientId, guardian, userId);
            return Ok(new { message = "Guardian info saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving guardian info");
            return BadRequest(new { message = ex.Message });
        }
    }

    #endregion

    #region 1.12 Xem lịch sử đăng ký khám

    /// <summary>
    /// 1.12.1-2: Lấy lịch sử khám gần nhất
    /// </summary>
    [HttpGet("patients/{patientId}/visit-history")]
    public async Task<ActionResult<List<PatientVisitHistoryDto>>> GetPatientVisitHistory(
        Guid patientId,
        [FromQuery] int maxRecords = 5)
    {
        var result = await _receptionService.GetPatientVisitHistoryAsync(patientId, maxRecords);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết lịch sử khám
    /// </summary>
    [HttpGet("visit-history/{medicalRecordId}")]
    public async Task<ActionResult<PatientVisitHistoryDto>> GetVisitDetail(Guid medicalRecordId)
    {
        var result = await _receptionService.GetVisitDetailAsync(medicalRecordId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// 1.12.3-4: Lấy cấu hình hiển thị lịch sử
    /// </summary>
    [HttpGet("settings/history-display")]
    public async Task<ActionResult<HistoryDisplayConfigDto>> GetHistoryDisplayConfig()
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.GetHistoryDisplayConfigAsync(userId);
        return Ok(result);
    }

    #endregion

    #region 1.13 Chỉ định dịch vụ ở tiếp đón

    /// <summary>
    /// 1.13.1-4: Chỉ định dịch vụ tại tiếp đón
    /// </summary>
    [HttpPost("admissions/{medicalRecordId}/services")]
    public async Task<ActionResult<List<ServiceOrderResultDto>>> OrderServicesAtReception(
        Guid medicalRecordId,
        [FromBody] ReceptionServiceOrderDto dto)
    {
        try
        {
            dto.MedicalRecordId = medicalRecordId;
            var userId = GetCurrentUserId();
            var result = await _receptionService.OrderServicesAtReceptionAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ordering services at reception");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.13.2: Chỉ định dịch vụ theo nhóm
    /// </summary>
    [HttpPost("admissions/{medicalRecordId}/services/by-group/{groupId}")]
    public async Task<ActionResult<List<ServiceOrderResultDto>>> OrderServicesByGroup(
        Guid medicalRecordId,
        Guid groupId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.OrderServicesByGroupAsync(medicalRecordId, groupId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ordering services by group");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ
    /// </summary>
    [HttpGet("service-groups")]
    public async Task<ActionResult<List<ServiceGroupDto>>> GetServiceGroups()
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.GetServiceGroupsAsync(userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.13.8: Tính đường đi tối ưu (TT54)
    /// </summary>
    [HttpGet("admissions/{medicalRecordId}/optimal-path")]
    public async Task<ActionResult<OptimalPathResultDto>> CalculateOptimalPath(Guid medicalRecordId)
    {
        var result = await _receptionService.CalculateOptimalPathAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 1.14 In phiếu

    /// <summary>
    /// 1.14.1: In phiếu khám bệnh
    /// </summary>
    [HttpGet("print/examination-slip/{medicalRecordId}")]
    public async Task<IActionResult> PrintExaminationSlip(Guid medicalRecordId)
    {
        try
        {
            var data = await _receptionService.PrintExaminationSlipAsync(medicalRecordId);
            return File(data, "application/pdf", $"PhieuKham_{medicalRecordId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing examination slip");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.14.3: In phiếu giữ thẻ BHYT
    /// </summary>
    [HttpGet("print/insurance-hold-slip/{documentHoldId}")]
    public async Task<IActionResult> PrintInsuranceCardHoldSlip(Guid documentHoldId)
    {
        try
        {
            var data = await _receptionService.PrintInsuranceCardHoldSlipAsync(documentHoldId);
            return File(data, "application/pdf", $"PhieuGiuThe_{documentHoldId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing insurance card hold slip");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.14.4: In thẻ bệnh nhân
    /// </summary>
    [HttpGet("print/patient-card/{patientId}")]
    public async Task<IActionResult> PrintPatientCard(Guid patientId)
    {
        try
        {
            var data = await _receptionService.PrintPatientCardAsync(patientId);
            return File(data, "application/pdf", $"TheBenhNhan_{patientId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing patient card");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.13.7: In phiếu chỉ định
    /// </summary>
    [HttpGet("print/service-order-slip/{medicalRecordId}")]
    public async Task<IActionResult> PrintServiceOrderSlip(Guid medicalRecordId)
    {
        try
        {
            var data = await _receptionService.PrintServiceOrderSlipAsync(medicalRecordId);
            return File(data, "application/pdf", $"PhieuChiDinh_{medicalRecordId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing service order slip");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy dữ liệu phiếu khám
    /// </summary>
    [HttpGet("print/examination-slip/{medicalRecordId}/data")]
    public async Task<ActionResult<ExaminationSlipDto>> GetExaminationSlipData(Guid medicalRecordId)
    {
        var result = await _receptionService.GetExaminationSlipDataAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 1.16 Thu tiền khám bệnh

    /// <summary>
    /// 1.16.1: Thu tạm ứng tại tiếp đón
    /// </summary>
    [HttpPost("billing/deposit")]
    public async Task<ActionResult<DepositReceiptDto>> CreateDeposit([FromBody] ReceptionDepositDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreateDepositAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating deposit");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 1.16.2-4: Thu tiền theo dịch vụ
    /// </summary>
    [HttpPost("billing/payment")]
    public async Task<ActionResult<PaymentReceiptDto>> CreatePayment([FromBody] ReceptionPaymentDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _receptionService.CreatePaymentAsync(dto, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy thông tin viện phí bệnh nhân
    /// </summary>
    [HttpGet("billing/{medicalRecordId}")]
    public async Task<ActionResult<PatientBillingInfoDto>> GetPatientBillingInfo(Guid medicalRecordId)
    {
        var result = await _receptionService.GetPatientBillingInfoAsync(medicalRecordId);
        return Ok(result);
    }

    #endregion

    #region 1.17 Thẻ khám bệnh thông minh

    /// <summary>
    /// 1.17.1: Đọc thẻ khám bệnh thông minh
    /// </summary>
    [HttpPost("smart-card/read")]
    public async Task<ActionResult<SmartCardDataDto>> ReadSmartCard([FromBody] SmartCardReadDto dto)
    {
        try
        {
            var result = await _receptionService.ReadSmartCardAsync(dto.CardData);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading smart card");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    [HttpGet("bhxh/check-connection")]
    public async Task<ActionResult<object>> CheckBHXHConnection()
    {
        var isConnected = await _receptionService.CheckBHXHConnectionAsync();
        return Ok(new { isConnected });
    }

    #endregion

    #region Thống kê và báo cáo

    /// <summary>
    /// Lấy thống kê hàng đợi theo phòng
    /// </summary>
    [HttpGet("statistics/room/{roomId}")]
    public async Task<ActionResult<QueueRoomStatisticsDto>> GetRoomQueueStatistics(Guid roomId, [FromQuery] DateTime? date)
    {
        var result = await _receptionService.GetRoomQueueStatisticsAsync(roomId, date ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê hàng ngày
    /// </summary>
    [HttpGet("statistics/daily")]
    public async Task<ActionResult<QueueDailyStatisticsDto>> GetDailyStatistics(
        [FromQuery] DateTime date,
        [FromQuery] Guid? departmentId)
    {
        var result = await _receptionService.GetDailyStatisticsAsync(date, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thời gian chờ trung bình
    /// </summary>
    [HttpGet("statistics/waiting-time")]
    public async Task<ActionResult<AverageWaitingTimeDto>> GetAverageWaitingTime(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId)
    {
        var result = await _receptionService.GetAverageWaitingTimeAsync(fromDate, toDate, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Xuất báo cáo
    /// </summary>
    [HttpPost("reports/export")]
    public async Task<IActionResult> ExportReport([FromBody] QueueReportRequestDto dto)
    {
        try
        {
            var data = await _receptionService.ExportQueueReportAsync(dto);
            var contentType = dto.ExportFormat == "PDF" ? "application/pdf" :
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            var ext = dto.ExportFormat == "PDF" ? "pdf" : "xlsx";
            return File(data, contentType, $"BaoCaoHangDoi_{dto.FromDate:yyyyMMdd}_{dto.ToDate:yyyyMMdd}.{ext}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting report");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy cấu hình hàng đợi
    /// </summary>
    [HttpGet("queue/config/{roomId}")]
    public async Task<ActionResult<QueueConfigurationDto>> GetQueueConfiguration(Guid roomId, [FromQuery] int queueType)
    {
        var result = await _receptionService.GetQueueConfigurationAsync(roomId, queueType);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Lưu cấu hình hàng đợi
    /// </summary>
    [HttpPost("queue/config")]
    public async Task<ActionResult<QueueConfigurationDto>> SaveQueueConfiguration([FromBody] QueueConfigurationDto dto)
    {
        try
        {
            var result = await _receptionService.SaveQueueConfigurationAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving queue configuration");
            return BadRequest(new { message = ex.Message });
        }
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

public class CallNextRequestDto
{
    public Guid RoomId { get; set; }
    public int QueueType { get; set; }
}

public class SkipReasonDto
{
    public string? Reason { get; set; }
}

public class QRCodeDto
{
    public string QRData { get; set; } = string.Empty;
}

public class BlockInsuranceRequestDto
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public int Reason { get; set; }
    public string? Notes { get; set; }
}

public class QuickRegisterByCodeDto
{
    public string PatientCode { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class QuickRegisterByAppointmentDto
{
    public string AppointmentCode { get; set; } = string.Empty;
}

public class QuickRegisterByIdentityDto
{
    public string IdentityNumber { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class QuickRegisterByPhoneDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public int ServiceType { get; set; }
}

public class SmartCardRegistrationDto
{
    public string CardData { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class SmartCardReadDto
{
    public string CardData { get; set; } = string.Empty;
}

public class ChangeRoomRequestDto
{
    public Guid NewRoomId { get; set; }
    public Guid? NewDoctorId { get; set; }
    public string? Reason { get; set; }
}

public class EmergencyDepositDto
{
    public decimal Amount { get; set; }
}

#endregion
