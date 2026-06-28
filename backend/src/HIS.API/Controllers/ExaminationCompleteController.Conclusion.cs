using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Infrastructure.Data;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.ExaminationComplete;

namespace HIS.API.Controllers;

public partial class ExaminationCompleteController : ControllerBase
{
    /// <summary>
    /// Lấy kết luận khám bệnh
    /// </summary>
    [HttpGet("{examinationId}/conclusion")]
    public async Task<ActionResult<ExaminationConclusionDto>> GetConclusion(Guid examinationId)
    {
        var result = await _examinationService.GetConclusionAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành khám bệnh
    /// </summary>
    [HttpPost("{examinationId}/complete")]
    public async Task<ActionResult<ExaminationConclusionDto>> CompleteExamination(Guid examinationId, [FromBody] CompleteExaminationDto dto)
    {
        var result = await _examinationService.CompleteExaminationAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật kết luận
    /// </summary>
    [HttpPut("{examinationId}/conclusion")]
    public async Task<ActionResult<ExaminationConclusionDto>> UpdateConclusion(Guid examinationId, [FromBody] CompleteExaminationDto dto)
    {
        var result = await _examinationService.UpdateConclusionAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Yêu cầu nhập viện
    /// </summary>
    [HttpPost("{examinationId}/request-hospitalization")]
    public async Task<ActionResult<ExaminationDto>> RequestHospitalization(Guid examinationId, [FromBody] HospitalizationRequestDto dto)
    {
        var result = await _examinationService.RequestHospitalizationAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Yêu cầu chuyển viện
    /// </summary>
    [HttpPost("{examinationId}/request-transfer")]
    public async Task<ActionResult<ExaminationDto>> RequestTransfer(Guid examinationId, [FromBody] TransferRequestDto dto)
    {
        var result = await _examinationService.RequestTransferAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hẹn khám
    /// </summary>
    [HttpPost("{examinationId}/appointment")]
    public async Task<ActionResult<AppointmentDto>> CreateAppointment(Guid examinationId, [FromBody] CreateAppointmentDto dto)
    {
        var result = await _examinationService.CreateAppointmentAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm lịch hẹn khám
    /// </summary>
    [HttpGet("appointments")]
    public async Task<ActionResult<PagedResultDto<AppointmentListDto>>> SearchAppointments([FromQuery] AppointmentSearchDto search)
    {
        var result = await _examinationService.SearchAppointmentsAsync(search);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái lịch hẹn
    /// </summary>
    [HttpPut("appointments/{appointmentId}/status")]
    public async Task<ActionResult<AppointmentDto>> UpdateAppointmentStatus(Guid appointmentId, [FromQuery] int status)
    {
        var result = await _examinationService.UpdateAppointmentStatusAsync(appointmentId, status);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách quá hạn tái khám
    /// </summary>
    [HttpGet("appointments/overdue")]
    public async Task<ActionResult<List<AppointmentListDto>>> GetOverdueFollowUps([FromQuery] int daysOverdue = 7)
    {
        var result = await _examinationService.GetOverdueFollowUpsAsync(daysOverdue);
        return Ok(result);
    }

    /// <summary>
    /// Cấp giấy nghỉ ốm
    /// </summary>
    [HttpPost("{examinationId}/sick-leave")]
    public async Task<ActionResult<SickLeaveDto>> CreateSickLeave(Guid examinationId, [FromBody] CreateSickLeaveDto dto)
    {
        var result = await _examinationService.CreateSickLeaveAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// In giấy nghỉ ốm
    /// </summary>
    [HttpGet("{examinationId}/sick-leave/print")]
    public async Task<ActionResult> PrintSickLeave(Guid examinationId)
    {
        var result = await _examinationService.PrintSickLeaveAsync(examinationId);
        return File(result, "application/pdf", $"GiayNghiOm_{examinationId}.pdf");
    }

    /// <summary>
    /// Cấp giấy nghỉ dưỡng thai
    /// </summary>
    [HttpPost("{examinationId}/maternity-leave")]
    public async Task<ActionResult<MaternityLeaveDto>> CreateMaternityLeave(Guid examinationId, [FromBody] CreateMaternityLeaveDto dto)
    {
        var result = await _examinationService.CreateMaternityLeaveAsync(examinationId, dto);
        return Ok(result);
    }

    /// <summary>
    /// In giấy nghỉ dưỡng thai
    /// </summary>
    [HttpPost("{examinationId}/maternity-leave/print")]
    public async Task<ActionResult> PrintMaternityLeave(Guid examinationId, [FromBody] CreateMaternityLeaveDto dto)
    {
        var result = await _examinationService.PrintMaternityLeaveAsync(examinationId, dto);
        return File(result, "application/pdf", $"GiayNghiDuongThai_{examinationId}.pdf");
    }

    /// <summary>
    /// Khóa hồ sơ
    /// </summary>
    [HttpPost("{examinationId}/lock")]
    public async Task<ActionResult<bool>> LockExamination(Guid examinationId)
    {
        var result = await _examinationService.LockExaminationAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa hồ sơ
    /// </summary>
    [HttpPost("{examinationId}/unlock")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager)]
    public async Task<ActionResult<bool>> UnlockExamination(Guid examinationId, [FromBody] UnlockReasonRequest request)
    {
        var result = await _examinationService.UnlockExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra điều kiện hoàn thành
    /// </summary>
    [HttpGet("{examinationId}/validate-completion")]
    public async Task<ActionResult<ExaminationValidationResult>> ValidateExaminationForCompletion(Guid examinationId)
    {
        var result = await _examinationService.ValidateExaminationForCompletionAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Hủy lượt khám
    /// </summary>
    [HttpPost("{examinationId}/cancel")]
    public async Task<ActionResult<bool>> CancelExamination(Guid examinationId, [FromBody] CancelReasonRequest request)
    {
        var result = await _examinationService.CancelExaminationAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn tác hoàn thành
    /// </summary>
    [HttpPost("{examinationId}/revert-completion")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager)]
    public async Task<ActionResult<ExaminationDto>> RevertCompletion(Guid examinationId, [FromBody] RevertReasonRequest request)
    {
        var result = await _examinationService.RevertCompletionAsync(examinationId, request.Reason);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm lượt khám
    /// </summary>
    [HttpPost("search")]
    public async Task<ActionResult<PagedResultDto<ExaminationDto>>> SearchExaminations([FromBody] ExaminationSearchDto dto)
    {
        var result = await _examinationService.SearchExaminationsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê khám bệnh
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<ExaminationStatisticsDto>> GetExaminationStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.GetExaminationStatisticsAsync(fromDate, toDate, departmentId, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy sổ khám bệnh
    /// </summary>
    [HttpGet("register")]
    public async Task<ActionResult<List<ExaminationRegisterDto>>> GetExaminationRegister(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.GetExaminationRegisterAsync(fromDate, toDate, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Xuất Excel sổ khám bệnh
    /// </summary>
    [HttpGet("register/export-excel")]
    public async Task<ActionResult> ExportExaminationRegisterToExcel(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? roomId = null)
    {
        var result = await _examinationService.ExportExaminationRegisterToExcelAsync(fromDate, toDate, roomId);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"SoKhamBenh_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.xlsx");
    }

    /// <summary>
    /// Xuất báo cáo thống kê
    /// </summary>
    [HttpGet("statistics/export")]
    public async Task<ActionResult> ExportExaminationStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] string format = "excel")
    {
        var result = await _examinationService.ExportExaminationStatisticsAsync(fromDate, toDate, format);
        var contentType = format == "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var extension = format == "pdf" ? "pdf" : "xlsx";
        return File(result, contentType, $"ThongKeKhamBenh_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.{extension}");
    }

    /// <summary>
    /// Lấy thống kê theo bác sĩ
    /// </summary>
    [HttpGet("statistics/by-doctor")]
    public async Task<ActionResult<List<DoctorExaminationStatDto>>> GetDoctorStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId = null)
    {
        var result = await _examinationService.GetDoctorStatisticsAsync(fromDate, toDate, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê theo mã bệnh
    /// </summary>
    [HttpGet("statistics/by-diagnosis")]
    public async Task<ActionResult<Dictionary<string, int>>> GetDiagnosisStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _examinationService.GetDiagnosisStatisticsAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy báo cáo bệnh truyền nhiễm
    /// </summary>
    [HttpGet("reports/communicable-diseases")]
    public async Task<ActionResult<List<CommunicableDiseaseReportDto>>> GetCommunicableDiseaseReport(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _examinationService.GetCommunicableDiseaseReportAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu khám bệnh
    /// </summary>
    [HttpGet("{examinationId}/print")]
    public async Task<ActionResult> PrintExaminationForm(Guid examinationId)
    {
        var result = await _examinationService.PrintExaminationFormAsync(examinationId);
        return File(result, "application/pdf", $"PhieuKham_{examinationId}.pdf");
    }

    /// <summary>
    /// In bệnh án ngoại trú
    /// </summary>
    [HttpGet("{examinationId}/print-medical-record")]
    public async Task<ActionResult> PrintOutpatientMedicalRecord(Guid examinationId)
    {
        var result = await _examinationService.PrintOutpatientMedicalRecordAsync(examinationId);
        return File(result, "application/pdf", $"BenhAnNgoaiTru_{examinationId}.pdf");
    }

    /// <summary>
    /// In giấy hẹn khám
    /// </summary>
    [HttpGet("appointments/{appointmentId}/print")]
    public async Task<ActionResult> PrintAppointmentSlip(Guid appointmentId)
    {
        var result = await _examinationService.PrintAppointmentSlipAsync(appointmentId);
        return File(result, "application/pdf", $"GiayHenKham_{appointmentId}.pdf");
    }

    /// <summary>
    /// In phiếu nhập viện
    /// </summary>
    [HttpGet("{examinationId}/print-admission")]
    public async Task<ActionResult> PrintAdmissionForm(Guid examinationId)
    {
        var result = await _examinationService.PrintAdmissionFormAsync(examinationId);
        return File(result, "application/pdf", $"PhieuNhapVien_{examinationId}.pdf");
    }

    /// <summary>
    /// In giấy chuyển viện
    /// </summary>
    [HttpGet("{examinationId}/print-transfer")]
    public async Task<ActionResult> PrintTransferForm(Guid examinationId)
    {
        var result = await _examinationService.PrintTransferFormAsync(examinationId);
        return File(result, "application/pdf", $"GiayChuyenVien_{examinationId}.pdf");
    }
}
