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
using WaitingPhaseAnalysisDto = HIS.Application.DTOs.Reception.WaitingPhaseAnalysisDto;
using HIS.API.Dtos.ReceptionComplete;

namespace HIS.API.Controllers;

public partial class ReceptionCompleteController
{
    #region 1.7 Đăng ký khám BHYT

    /// <summary>
    /// 1.7.1-3: Đăng ký khám BHYT
    /// </summary>
    [HttpPost("register/insurance")]
    public async Task<ActionResult<AdmissionDto>> RegisterInsurancePatient([FromBody] InsuranceRegistrationDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterInsurancePatientAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.7.4: Đăng ký khám nhanh bằng mã bệnh nhân
    /// </summary>
    [HttpPost("register/quick/patient-code")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByPatientCode([FromBody] QuickRegisterByCodeDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.QuickRegisterByPatientCodeAsync(dto.PatientCode, dto.RoomId, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.7.5: Đăng ký khám nhanh bằng mã hẹn khám
    /// </summary>
    [HttpPost("register/quick/appointment")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByAppointment([FromBody] QuickRegisterByAppointmentDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.QuickRegisterByAppointmentAsync(dto.AppointmentCode, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.7.6: Đăng ký khám nhanh bằng CCCD
    /// </summary>
    [HttpPost("register/quick/identity")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByIdentity([FromBody] QuickRegisterByIdentityDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.QuickRegisterByIdentityAsync(dto.IdentityNumber, dto.RoomId, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.7.8: Đăng ký khám bằng mã điều trị
    /// </summary>
    [HttpPost("register/quick/treatment-code")]
    public async Task<ActionResult<AdmissionDto>> RegisterByTreatmentCode([FromBody] QuickRegisterByCodeDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterByTreatmentCodeAsync(dto.PatientCode, dto.RoomId, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.7.9: Đăng ký bằng thẻ khám bệnh thông minh
    /// </summary>
    [HttpPost("register/smart-card")]
    public async Task<ActionResult<AdmissionDto>> RegisterBySmartCard([FromBody] SmartCardRegistrationDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterBySmartCardAsync(dto.CardData, dto.RoomId, userId);
        return Ok(result);
    }

    #endregion

    #region 1.8 Đăng ký khám viện phí/dịch vụ

    /// <summary>
    /// 1.8.1-7: Đăng ký khám viện phí/dịch vụ
    /// </summary>
    [HttpPost("register/fee")]
    public async Task<ActionResult<AdmissionDto>> RegisterFeePatient([FromBody] FeeRegistrationDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterFeePatientAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>F11.2: lưu vân tay tiếp đón (hoặc cờ không thu thập được) cho bệnh nhân.</summary>
    [HttpPost("register/fingerprint/{patientId}")]
    public async Task<IActionResult> SaveFingerprint(Guid patientId, [FromBody] SaveFingerprintRequest req)
    {
        var userId = GetCurrentUserId();
        var ok = await _receptionService.SaveFingerprintAsync(patientId, req?.FingerprintData, req?.NotCollected ?? false, userId);
        return ok ? Ok() : NotFound(HIS.Application.DTOs.Common.ApiResponse<object>.Fail("Khong tim thay benh nhan"));
    }


    /// <summary>
    /// 1.8.8: Đăng ký khám nhanh bằng SĐT
    /// </summary>
    [HttpPost("register/quick/phone")]
    public async Task<ActionResult<AdmissionDto>> QuickRegisterByPhone([FromBody] QuickRegisterByPhoneDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.QuickRegisterByPhoneAsync(
            dto.PhoneNumber, dto.RoomId, dto.ServiceType, userId);
        return Ok(result);
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
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreateHealthCheckContractAsync(dto, userId);
        return Ok(result);
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
        var userId = GetCurrentUserId();
        var dto = new HealthCheckImportDto { ContractId = contractId, Patients = patients };
        var (success, failed, errors) = await _receptionService.ImportHealthCheckPatientsAsync(dto, userId);
        return Ok(new { success, failed, errors });
    }

    /// <summary>
    /// 1.9.1: Đăng ký khám sức khỏe
    /// </summary>
    [HttpPost("register/health-check")]
    public async Task<ActionResult<AdmissionDto>> RegisterHealthCheckPatient([FromBody] HealthCheckRegistrationDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterHealthCheckPatientAsync(dto, userId);
        return Ok(result);
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
        var userId = GetCurrentUserId();
        var result = await _receptionService.RegisterEmergencyPatientAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.10.4: Cập nhật thông tin bệnh nhân cấp cứu
    /// </summary>
    [HttpPut("emergency/{medicalRecordId}/patient-info")]
    public async Task<ActionResult<AdmissionDto>> UpdateEmergencyPatientInfo(
        Guid medicalRecordId,
        [FromBody] UpdateEmergencyPatientDto dto)
    {
        dto.MedicalRecordId = medicalRecordId;
        var userId = GetCurrentUserId();
        var result = await _receptionService.UpdateEmergencyPatientInfoAsync(dto, userId);
        return Ok(result);
    }

    /// <summary>
    /// 1.10.5: Ghép mã bệnh nhân
    /// </summary>
    [HttpPost("patients/merge")]
    public async Task<IActionResult> MergePatients([FromBody] MergePatientDto dto)
    {
        var userId = GetCurrentUserId();
        await _receptionService.MergePatientsAsync(dto, userId);
        return Ok(new { message = "Patients merged successfully" });
    }

    /// <summary>
    /// 1.10.5b: Tách bệnh án (#99) — di chuyển hồ sơ đã chọn sang BN đích
    /// </summary>
    [HttpPost("patients/split")]
    public async Task<IActionResult> SplitPatient([FromBody] SplitPatientDto dto)
    {
        var userId = GetCurrentUserId();
        await _receptionService.SplitPatientAsync(dto, userId);
        return Ok(new { message = "Patient records split successfully" });
    }

    /// <summary>
    /// 1.10.6: Tạm ứng cho bệnh nhân cấp cứu
    /// </summary>
    [HttpPost("emergency/{medicalRecordId}/deposit")]
    public async Task<ActionResult<DepositReceiptDto>> CreateEmergencyDeposit(
        Guid medicalRecordId,
        [FromBody] EmergencyDepositDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.CreateEmergencyDepositAsync(medicalRecordId, dto.Amount, userId);
        return Ok(result);
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

    /// <summary>
    /// 1.11.5: Sửa thông tin đăng ký tiếp đón
    /// </summary>
    [HttpPut("admissions/{id}")]
    public async Task<ActionResult<AdmissionDto>> UpdateAdmission(Guid id, [FromBody] UpdateAdmissionDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _receptionService.UpdateAdmissionAsync(id, dto, userId);
        return Ok(result);
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
        var userId = GetCurrentUserId();
        await _receptionService.SaveGuardianInfoAsync(patientId, guardian, userId);
        return Ok(new { message = "Guardian info saved successfully" });
    }

    #endregion
}
