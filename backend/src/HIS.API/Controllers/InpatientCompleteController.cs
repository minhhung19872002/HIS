using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Dtos.InpatientComplete;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 3: Quản lý Điều trị Nội trú
/// </summary>
[Authorize]
[ApiController]
[Route("api/inpatient")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // TT46: InvalidOperationException (EmrLockGuard) → 400 + message rõ
public partial class InpatientCompleteController : ControllerBase
{
    private readonly IInpatientCompleteService _inpatientService;
    private readonly ISystemCompleteService _systemService;
    private readonly ILogger<InpatientCompleteController> _logger;

    public InpatientCompleteController(
        IInpatientCompleteService inpatientService,
        ISystemCompleteService systemService,
        ILogger<InpatientCompleteController> logger)
    {
        _inpatientService = inpatientService;
        _systemService = systemService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    #region 3.1 Màn hình chờ buồng bệnh

    /// <summary>
    /// Lấy sơ đồ buồng bệnh theo khoa
    /// </summary>
    [HttpGet("ward-layout/{departmentId}")]
    public async Task<ActionResult<WardLayoutDto>> GetWardLayout(Guid departmentId)
    {
        var result = await _inpatientService.GetWardLayoutAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng với trạng thái giường
    /// </summary>
    [HttpGet("room-layouts/{departmentId}")]
    public async Task<ActionResult<List<RoomLayoutDto>>> GetRoomLayouts(Guid departmentId)
    {
        var result = await _inpatientService.GetRoomLayoutsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết layout giường trong phòng
    /// </summary>
    [HttpGet("bed-layouts/{roomId}")]
    public async Task<ActionResult<List<BedLayoutDto>>> GetBedLayouts(Guid roomId)
    {
        var result = await _inpatientService.GetBedLayoutsAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin nằm ghép
    /// </summary>
    [HttpGet("shared-bed/{bedId}")]
    public async Task<ActionResult<List<SharedBedPatientDto>>> GetSharedBedPatients(Guid bedId)
    {
        var result = await _inpatientService.GetSharedBedPatientsAsync(bedId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy cấu hình màu hiển thị
    /// </summary>
    [HttpGet("ward-color-config")]
    public async Task<ActionResult<WardColorConfigDto>> GetWardColorConfig([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetWardColorConfigAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình màu hiển thị
    /// </summary>
    [HttpPut("ward-color-config")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<ActionResult> UpdateWardColorConfig([FromQuery] Guid? departmentId, [FromBody] WardColorConfigDto config)
    {
        await _inpatientService.UpdateWardColorConfigAsync(departmentId, config);
        return Ok();
    }

    #endregion

    #region 3.2 Quản lý bệnh nhân

    /// <summary>
    /// Lấy danh sách bệnh nhân nội trú
    /// </summary>
    [HttpGet("patients")]
    public async Task<ActionResult<PagedResultDto<InpatientListDto>>> GetInpatientList([FromQuery] InpatientSearchDto searchDto)
    {
        var result = await _inpatientService.GetInpatientListAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Láº¥y danh má»¥c khoa/phoÌ€ng cho cÃ¡c mÃ n hÃ¬nh ná»™i trÃº.
    /// </summary>
    [HttpGet("departments")]
    public async Task<ActionResult<IEnumerable<object>>> GetDepartments()
    {
        var departments = await _systemService.GetDepartmentsAsync(isActive: true);
        return Ok(departments.Select(d => new
        {
            id = d.Id,
            code = d.Code,
            name = d.Name,
            departmentType = d.DepartmentType,
            isActive = d.IsActive,
        }));
    }

    /// <summary>
    /// Lấy chi tiết một bệnh nhân nội trú
    /// </summary>
    [HttpGet("{admissionId}/detail")]
    public async Task<ActionResult<AdmissionDto>> GetAdmissionDetail(Guid admissionId)
    {
        var result = await _inpatientService.GetAdmissionDetailAsync(admissionId);
        if (result == null)
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận bệnh nhân từ phòng khám
    /// </summary>
    [HttpPost("admit-from-opd")]
    public async Task<ActionResult<AdmissionDto>> AdmitFromOpd([FromBody] AdmitFromOpdDto dto)
    {
        // Sweep 2026-06-12: body rỗng từng 500 — validate khóa bắt buộc
        if (dto == null || dto.MedicalRecordId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu medicalRecordId" });
        if (dto.DepartmentId == Guid.Empty || dto.RoomId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu departmentId/roomId" });
        var result = await _inpatientService.AdmitFromOpdAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// NangCap26 XIX.2 #20 — tách điều trị nội trú tại khoa cấp cứu: chốt đợt cấp cứu
    /// tại mốc tách, chuyển chỉ định/đơn thuốc phát sinh sau mốc sang hồ sơ nội trú mới.
    /// </summary>
    [HttpPost("split-emergency-to-inpatient")]
    public async Task<ActionResult<SplitEmergencyResultDto>> SplitEmergencyToInpatient([FromBody] SplitEmergencyToInpatientDto dto)
    {
        if (dto == null || dto.SourceMedicalRecordId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu sourceMedicalRecordId" });
        if (dto.DepartmentId == Guid.Empty || dto.RoomId == Guid.Empty)
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu departmentId/roomId" });
        return Ok(await _inpatientService.SplitEmergencyToInpatientAsync(dto, GetCurrentUserId()));
    }

    /// <summary>
    /// Worklist "chờ nhập viện": phiên khám OPD kết luận nhập viện nhưng chưa tạo hồ sơ nội trú.
    /// </summary>
    [HttpGet("pending-admissions")]
    public async Task<ActionResult<List<PendingAdmissionDto>>> GetPendingAdmissions([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetPendingAdmissionsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>#15: tự tổng hợp tóm tắt quá trình điều trị (prefill bệnh án ra viện).</summary>
    [HttpGet("{admissionId}/auto-summary")]
    public async Task<ActionResult<object>> GetAutoTreatmentSummary(Guid admissionId)
    {
        var summary = await _inpatientService.GenerateTreatmentSummaryAsync(admissionId);
        return Ok(new { summary });
    }

    /// <summary>F8.13: aggregate thong ke qua trinh dieu tri — so luong tung thuoc + tan suat tung ma chan doan.</summary>
    [HttpGet("{admissionId}/treatment-stat-aggregate")]
    public async Task<ActionResult<TreatmentStatAggregateDto>> GetTreatmentStatAggregate(Guid admissionId)
    {
        var result = await _inpatientService.GetTreatmentStatAggregateAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận bệnh nhân từ khoa khác
    /// </summary>
    [HttpPost("admit-from-department")]
    public async Task<ActionResult<AdmissionDto>> AdmitFromDepartment([FromBody] AdmitFromDepartmentDto dto)
    {
        var result = await _inpatientService.AdmitFromDepartmentAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận điều trị kết hợp
    /// </summary>
    [HttpPost("combined-treatment")]
    public async Task<ActionResult<CombinedTreatmentDto>> CreateCombinedTreatment([FromBody] CreateCombinedTreatmentDto dto)
    {
        var result = await _inpatientService.CreateCombinedTreatmentAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách điều trị kết hợp
    /// </summary>
    [HttpGet("combined-treatments/{admissionId}")]
    public async Task<ActionResult<List<CombinedTreatmentDto>>> GetCombinedTreatments(Guid admissionId)
    {
        var result = await _inpatientService.GetCombinedTreatmentsAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành điều trị kết hợp
    /// </summary>
    [HttpPost("combined-treatment/{id}/complete")]
    public async Task<ActionResult<CombinedTreatmentDto>> CompleteCombinedTreatment(Guid id, [FromBody] string treatmentResult)
    {
        var result = await _inpatientService.CompleteCombinedTreatmentAsync(id, treatmentResult, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chuyển khoa
    /// </summary>
    [HttpPost("transfer-department")]
    public async Task<ActionResult<AdmissionDto>> TransferDepartment([FromBody] DepartmentTransferDto dto)
    {
        var result = await _inpatientService.TransferDepartmentAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lịch sử chuyển khoa của một lượt nội trú, kèm bàn giao lâm sàng (#218)
    /// </summary>
    [HttpGet("department-transfers/{admissionId}")]
    public async Task<ActionResult<List<DepartmentTransferHistoryDto>>> GetDepartmentTransfers(Guid admissionId)
    {
        var result = await _inpatientService.GetDepartmentTransfersAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Gửi khám chuyên khoa
    /// </summary>
    [HttpPost("specialty-consult")]
    public async Task<ActionResult<SpecialtyConsultRequestDto>> RequestSpecialtyConsult([FromBody] CreateSpecialtyConsultDto dto)
    {
        var result = await _inpatientService.RequestSpecialtyConsultAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách yêu cầu khám chuyên khoa
    /// </summary>
    [HttpGet("specialty-consults/{admissionId}")]
    public async Task<ActionResult<List<SpecialtyConsultRequestDto>>> GetSpecialtyConsultRequests(Guid admissionId)
    {
        var result = await _inpatientService.GetSpecialtyConsultRequestsAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành khám chuyên khoa
    /// </summary>
    [HttpPost("specialty-consult/{id}/complete")]
    public async Task<ActionResult<SpecialtyConsultRequestDto>> CompleteSpecialtyConsult(
        Guid id,
        [FromBody] CompleteSpecialtyConsultRequest request)
    {
        var result = await _inpatientService.CompleteSpecialtyConsultAsync(id, request.Result, request.Recommendations, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chuyển mổ phiên
    /// </summary>
    [HttpPost("transfer-scheduled-surgery")]
    public async Task<ActionResult<bool>> TransferToScheduledSurgery([FromBody] SurgeryTransferDto dto)
    {
        var result = await _inpatientService.TransferToScheduledSurgeryAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chuyển mổ cấp cứu
    /// </summary>
    [HttpPost("transfer-emergency-surgery")]
    public async Task<ActionResult<bool>> TransferToEmergencySurgery([FromBody] SurgeryTransferDto dto)
    {
        var result = await _inpatientService.TransferToEmergencySurgeryAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Bổ sung thẻ BHYT
    /// </summary>
    [HttpPost("update-insurance")]
    public async Task<ActionResult<AdmissionDto>> UpdateInsurance([FromBody] UpdateInsuranceDto dto)
    {
        var result = await _inpatientService.UpdateInsuranceAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra thông tuyến BHYT
    /// </summary>
    [HttpGet("insurance-check/{admissionId}")]
    public async Task<ActionResult<InsuranceReferralCheckDto>> CheckInsuranceReferral(Guid admissionId)
    {
        var result = await _inpatientService.CheckInsuranceReferralAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Chuyển sang viện phí
    /// </summary>
    [HttpPost("convert-to-fee/{admissionId}")]
    public async Task<ActionResult<bool>> ConvertToFeePaying(Guid admissionId)
    {
        var result = await _inpatientService.ConvertToFeePayingAsync(admissionId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Phân giường
    /// </summary>
    [HttpPost("assign-bed")]
    public async Task<ActionResult<BedAssignmentDto>> AssignBed([FromBody] CreateBedAssignmentDto dto)
    {
        var result = await _inpatientService.AssignBedAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chuyển giường
    /// </summary>
    [HttpPost("transfer-bed")]
    public async Task<ActionResult<BedAssignmentDto>> TransferBed([FromBody] TransferBedDto dto)
    {
        var result = await _inpatientService.TransferBedAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Đăng ký nằm ghép
    /// </summary>
    [HttpPost("shared-bed")]
    public async Task<ActionResult<bool>> RegisterSharedBed([FromBody] RegisterSharedBedRequest request)
    {
        var result = await _inpatientService.RegisterSharedBedAsync(request.AdmissionId, request.BedId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Trả giường
    /// </summary>
    [HttpPost("release-bed/{admissionId}")]
    public async Task<ActionResult> ReleaseBed(Guid admissionId)
    {
        await _inpatientService.ReleaseBedAsync(admissionId, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Lấy trạng thái giường
    /// </summary>
    [HttpGet("bed-status")]
    public async Task<ActionResult<List<BedStatusDto>>> GetBedStatus([FromQuery] Guid? departmentId, [FromQuery] Guid? roomId)
    {
        var result = await _inpatientService.GetBedStatusAsync(departmentId, roomId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tổng hợp y lệnh theo ngày
    /// </summary>
    [HttpGet("daily-orders/{admissionId}")]
    public async Task<ActionResult<DailyOrderSummaryDto>> GetDailyOrderSummary(Guid admissionId, [FromQuery] DateTime date)
    {
        var result = await _inpatientService.GetDailyOrderSummaryAsync(admissionId, date);
        return Ok(result);
    }

    /// <summary>
    /// Lấy kết quả xét nghiệm
    /// </summary>
    [HttpGet("lab-results/{admissionId}")]
    public async Task<ActionResult<List<LabResultItemDto>>> GetLabResults(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetLabResultsAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In kết quả xét nghiệm
    /// </summary>
    [HttpPost("print-lab-results/{admissionId}")]
    public async Task<ActionResult> PrintLabResults(Guid admissionId, [FromBody] List<Guid> resultIds)
    {
        var pdfBytes = await _inpatientService.PrintLabResultsAsync(admissionId, resultIds);
        return File(pdfBytes, "application/pdf", "lab-results.pdf");
    }

    /// <summary>
    /// Lấy tình hình viện phí khoa
    /// </summary>
    [HttpGet("department-fee/{departmentId}")]
    public async Task<ActionResult<DepartmentFeeOverviewDto>> GetDepartmentFeeOverview(Guid departmentId)
    {
        var result = await _inpatientService.GetDepartmentFeeOverviewAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy viện phí bệnh nhân
    /// </summary>
    [HttpGet("patient-fee/{admissionId}")]
    public async Task<ActionResult<PatientFeeItemDto>> GetPatientFee(Guid admissionId)
    {
        var result = await _inpatientService.GetPatientFeeAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo yêu cầu tạm ứng
    /// </summary>
    [HttpPost("deposit-request")]
    public async Task<ActionResult<DepositRequestDto>> CreateDepositRequest([FromBody] CreateDepositRequestDto dto)
    {
        var result = await _inpatientService.CreateDepositRequestAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách yêu cầu tạm ứng
    /// </summary>
    [HttpGet("deposit-requests")]
    public async Task<ActionResult<List<DepositRequestDto>>> GetDepositRequests([FromQuery] Guid? departmentId, [FromQuery] int? status)
    {
        var result = await _inpatientService.GetDepositRequestsAsync(departmentId, status);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo chuyển khoa
    /// </summary>
    [HttpGet("transfer-warnings/{admissionId}")]
    public async Task<ActionResult<TransferWarningDto>> CheckTransferWarnings(Guid admissionId)
    {
        var result = await _inpatientService.CheckTransferWarningsAsync(admissionId);
        return Ok(result);
    }

    #endregion
}
