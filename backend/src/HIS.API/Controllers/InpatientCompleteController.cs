using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 3: Quản lý Điều trị Nội trú
/// </summary>
[Authorize]
[ApiController]
[Route("api/inpatient")]
public class InpatientCompleteController : ControllerBase
{
    private readonly IInpatientCompleteService _inpatientService;
    private readonly ILogger<InpatientCompleteController> _logger;

    public InpatientCompleteController(
        IInpatientCompleteService inpatientService,
        ILogger<InpatientCompleteController> logger)
    {
        _inpatientService = inpatientService;
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
    [Authorize(Roles = "Admin,DepartmentHead")]
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
    /// Tiếp nhận bệnh nhân từ phòng khám
    /// </summary>
    [HttpPost("admit-from-opd")]
    public async Task<ActionResult<AdmissionDto>> AdmitFromOpd([FromBody] AdmitFromOpdDto dto)
    {
        var result = await _inpatientService.AdmitFromOpdAsync(dto, GetCurrentUserId());
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

    #region 3.3 Chỉ định dịch vụ nội trú

    /// <summary>
    /// Lấy chẩn đoán từ hồ sơ
    /// </summary>
    [HttpGet("diagnosis/{admissionId}")]
    public async Task<ActionResult<object>> GetDiagnosisFromRecord(Guid admissionId)
    {
        var (code, diagnosis) = await _inpatientService.GetDiagnosisFromRecordAsync(admissionId);
        return Ok(new { DiagnosisCode = code, Diagnosis = diagnosis });
    }

    /// <summary>
    /// Lấy cây dịch vụ
    /// </summary>
    [HttpGet("service-tree")]
    public async Task<ActionResult<List<object>>> GetServiceTree([FromQuery] Guid? parentId)
    {
        var result = await _inpatientService.GetServiceTreeAsync(parentId);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm dịch vụ
    /// </summary>
    [HttpGet("search-services")]
    public async Task<ActionResult<List<object>>> SearchServices([FromQuery] string keyword, [FromQuery] string? serviceType)
    {
        var result = await _inpatientService.SearchServicesAsync(keyword, serviceType);
        return Ok(result);
    }

    /// <summary>
    /// Tạo chỉ định dịch vụ
    /// </summary>
    [HttpPost("service-orders")]
    public async Task<ActionResult<InpatientServiceOrderDto>> CreateServiceOrder([FromBody] CreateInpatientServiceOrderDto dto)
    {
        var result = await _inpatientService.CreateServiceOrderAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định dịch vụ
    /// </summary>
    [HttpPut("service-orders/{id}")]
    public async Task<ActionResult<InpatientServiceOrderDto>> UpdateServiceOrder(Guid id, [FromBody] CreateInpatientServiceOrderDto dto)
    {
        var result = await _inpatientService.UpdateServiceOrderAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa chỉ định dịch vụ
    /// </summary>
    [HttpDelete("service-orders/{id}")]
    public async Task<ActionResult> DeleteServiceOrder(Guid id)
    {
        await _inpatientService.DeleteServiceOrderAsync(id, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Lấy danh sách chỉ định dịch vụ
    /// </summary>
    [HttpGet("service-orders/{admissionId}")]
    public async Task<ActionResult<List<InpatientServiceOrderDto>>> GetServiceOrders(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetServiceOrdersAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết chỉ định
    /// </summary>
    [HttpGet("service-order/{id}")]
    public async Task<ActionResult<InpatientServiceOrderDto>> GetServiceOrderById(Guid id)
    {
        var result = await _inpatientService.GetServiceOrderByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Tạo nhóm dịch vụ mẫu
    /// </summary>
    [HttpPost("service-group-templates")]
    public async Task<ActionResult<ServiceGroupTemplateDto>> CreateServiceGroupTemplate([FromBody] ServiceGroupTemplateDto dto)
    {
        var result = await _inpatientService.CreateServiceGroupTemplateAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách nhóm dịch vụ mẫu
    /// </summary>
    [HttpGet("service-group-templates")]
    public async Task<ActionResult<List<ServiceGroupTemplateDto>>> GetServiceGroupTemplates([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetServiceGroupTemplatesAsync(departmentId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo nhóm mẫu
    /// </summary>
    [HttpPost("order-by-template")]
    public async Task<ActionResult<InpatientServiceOrderDto>> OrderByTemplate([FromBody] OrderByTemplateRequest request)
    {
        var result = await _inpatientService.OrderByTemplateAsync(request.AdmissionId, request.TemplateId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Chỉ định theo gói
    /// </summary>
    [HttpPost("order-by-package")]
    public async Task<ActionResult<InpatientServiceOrderDto>> OrderByPackage([FromBody] OrderByPackageRequest request)
    {
        var result = await _inpatientService.OrderByPackageAsync(request.AdmissionId, request.PackageId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu ưu tiên
    /// </summary>
    [HttpPost("service-item/{itemId}/urgent")]
    public async Task<ActionResult> MarkServiceAsUrgent(Guid itemId, [FromBody] bool isUrgent)
    {
        await _inpatientService.MarkServiceAsUrgentAsync(itemId, isUrgent, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Kiểm tra cảnh báo chỉ định
    /// </summary>
    [HttpPost("service-order-warnings")]
    public async Task<ActionResult<ServiceOrderWarningDto>> CheckServiceOrderWarnings([FromBody] CheckServiceWarningsRequest request)
    {
        var result = await _inpatientService.CheckServiceOrderWarningsAsync(request.AdmissionId, request.Items);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu chỉ định
    /// </summary>
    [HttpGet("print-service-order/{orderId}")]
    public async Task<ActionResult> PrintServiceOrder(Guid orderId)
    {
        var pdfBytes = await _inpatientService.PrintServiceOrderAsync(orderId);
        return File(pdfBytes, "application/pdf", "service-order.pdf");
    }

    #endregion

    #region 3.4 Kê đơn thuốc nội trú

    /// <summary>
    /// Tìm kiếm thuốc
    /// </summary>
    [HttpGet("search-medicines")]
    public async Task<ActionResult<List<object>>> SearchMedicines([FromQuery] string keyword, [FromQuery] Guid warehouseId)
    {
        var result = await _inpatientService.SearchMedicinesAsync(keyword, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chống chỉ định
    /// </summary>
    [HttpGet("medicine-contraindications/{medicineId}")]
    public async Task<ActionResult<object>> GetMedicineContraindications(Guid medicineId, [FromQuery] Guid admissionId)
    {
        var result = await _inpatientService.GetMedicineContraindicationsAsync(medicineId, admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tồn kho thuốc
    /// </summary>
    [HttpGet("medicine-stock/{medicineId}")]
    public async Task<ActionResult<decimal>> GetMedicineStock(Guid medicineId, [FromQuery] Guid warehouseId)
    {
        var result = await _inpatientService.GetMedicineStockAsync(medicineId, warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Tạo đơn thuốc
    /// </summary>
    [HttpPost("prescriptions")]
    public async Task<ActionResult<InpatientPrescriptionDto>> CreatePrescription([FromBody] CreateInpatientPrescriptionDto dto)
    {
        var result = await _inpatientService.CreatePrescriptionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật đơn thuốc
    /// </summary>
    [HttpPut("prescriptions/{id}")]
    public async Task<ActionResult<InpatientPrescriptionDto>> UpdatePrescription(Guid id, [FromBody] CreateInpatientPrescriptionDto dto)
    {
        var result = await _inpatientService.UpdatePrescriptionAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa đơn thuốc
    /// </summary>
    [HttpDelete("prescriptions/{id}")]
    public async Task<ActionResult> DeletePrescription(Guid id)
    {
        await _inpatientService.DeletePrescriptionAsync(id, GetCurrentUserId());
        return Ok();
    }

    /// <summary>
    /// Lấy danh sách đơn thuốc
    /// </summary>
    [HttpGet("prescriptions/{admissionId}")]
    public async Task<ActionResult<List<InpatientPrescriptionDto>>> GetPrescriptions(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetPrescriptionsAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết đơn thuốc
    /// </summary>
    [HttpGet("prescription/{id}")]
    public async Task<ActionResult<InpatientPrescriptionDto>> GetPrescriptionById(Guid id)
    {
        var result = await _inpatientService.GetPrescriptionByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Kê đơn từ tủ trực
    /// </summary>
    [HttpPost("emergency-cabinet-prescription")]
    public async Task<ActionResult<EmergencyCabinetPrescriptionDto>> CreateEmergencyCabinetPrescription([FromBody] EmergencyCabinetPrescriptionRequest request)
    {
        var result = await _inpatientService.CreateEmergencyCabinetPrescriptionAsync(request.AdmissionId, request.CabinetId, request.Items, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tủ trực
    /// </summary>
    [HttpGet("emergency-cabinets/{departmentId}")]
    public async Task<ActionResult<List<object>>> GetEmergencyCabinets(Guid departmentId)
    {
        var result = await _inpatientService.GetEmergencyCabinetsAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo kê đơn
    /// </summary>
    [HttpPost("prescription-warnings")]
    public async Task<ActionResult<PrescriptionWarningDto>> CheckPrescriptionWarnings([FromBody] CheckPrescriptionWarningsRequest request)
    {
        var result = await _inpatientService.CheckPrescriptionWarningsAsync(request.AdmissionId, request.Items);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đơn thuốc mẫu
    /// </summary>
    [HttpGet("prescription-templates")]
    public async Task<ActionResult<List<PrescriptionTemplateDto>>> GetPrescriptionTemplates([FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetPrescriptionTemplatesAsync(departmentId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo đơn thuốc mẫu
    /// </summary>
    [HttpPost("prescription-templates")]
    public async Task<ActionResult<PrescriptionTemplateDto>> CreatePrescriptionTemplate([FromBody] PrescriptionTemplateDto dto)
    {
        var result = await _inpatientService.CreatePrescriptionTemplateAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kê theo mẫu
    /// </summary>
    [HttpPost("prescribe-by-template")]
    public async Task<ActionResult<InpatientPrescriptionDto>> PrescribeByTemplate([FromBody] PrescribeByTemplateRequest request)
    {
        var result = await _inpatientService.PrescribeByTemplateAsync(request.AdmissionId, request.TemplateId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tổng hợp phiếu lĩnh thuốc
    /// </summary>
    [HttpPost("medicine-order-summary")]
    public async Task<ActionResult<MedicineOrderSummaryDto>> CreateMedicineOrderSummary([FromBody] CreateMedicineOrderSummaryRequest request)
    {
        var result = await _inpatientService.CreateMedicineOrderSummaryAsync(request.DepartmentId, request.Date, request.RoomId, request.WarehouseId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu tổng hợp
    /// </summary>
    [HttpGet("medicine-order-summaries/{departmentId}")]
    public async Task<ActionResult<List<MedicineOrderSummaryDto>>> GetMedicineOrderSummaries(Guid departmentId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _inpatientService.GetMedicineOrderSummariesAsync(departmentId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu tổng hợp thuốc
    /// </summary>
    [HttpGet("print-medicine-summary/{summaryId}")]
    public async Task<ActionResult> PrintMedicineOrderSummary(Guid summaryId)
    {
        var pdfBytes = await _inpatientService.PrintMedicineOrderSummaryAsync(summaryId);
        return File(pdfBytes, "application/pdf", "medicine-summary.pdf");
    }

    #endregion

    #region 3.5 Chỉ định dinh dưỡng

    /// <summary>
    /// Tạo chỉ định suất ăn
    /// </summary>
    [HttpPost("nutrition-orders")]
    public async Task<ActionResult<NutritionOrderDto>> CreateNutritionOrder([FromBody] CreateNutritionOrderDto dto)
    {
        var result = await _inpatientService.CreateNutritionOrderAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chỉ định suất ăn
    /// </summary>
    [HttpPut("nutrition-orders/{id}")]
    public async Task<ActionResult<NutritionOrderDto>> UpdateNutritionOrder(Guid id, [FromBody] CreateNutritionOrderDto dto)
    {
        var result = await _inpatientService.UpdateNutritionOrderAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách chỉ định suất ăn
    /// </summary>
    [HttpGet("nutrition-orders")]
    public async Task<ActionResult<List<NutritionOrderDto>>> GetNutritionOrders([FromQuery] Guid? admissionId, [FromQuery] Guid? departmentId, [FromQuery] DateTime date)
    {
        var result = await _inpatientService.GetNutritionOrdersAsync(admissionId, departmentId, date);
        return Ok(result);
    }

    /// <summary>
    /// Tổng hợp suất ăn
    /// </summary>
    [HttpGet("nutrition-summary/{departmentId}")]
    public async Task<ActionResult<NutritionSummaryDto>> GetNutritionSummary(Guid departmentId, [FromQuery] DateTime date)
    {
        var result = await _inpatientService.GetNutritionSummaryAsync(departmentId, date);
        return Ok(result);
    }

    /// <summary>
    /// In phiếu tổng hợp suất ăn
    /// </summary>
    [HttpGet("print-nutrition-summary/{departmentId}")]
    public async Task<ActionResult> PrintNutritionSummary(Guid departmentId, [FromQuery] DateTime date)
    {
        var pdfBytes = await _inpatientService.PrintNutritionSummaryAsync(departmentId, date);
        return File(pdfBytes, "application/pdf", "nutrition-summary.pdf");
    }

    #endregion

    #region 3.6 Thông tin điều trị

    /// <summary>
    /// Tạo tờ điều trị
    /// </summary>
    [HttpPost("treatment-sheets")]
    public async Task<ActionResult<TreatmentSheetDto>> CreateTreatmentSheet([FromBody] CreateTreatmentSheetDto dto)
    {
        var result = await _inpatientService.CreateTreatmentSheetAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật tờ điều trị
    /// </summary>
    [HttpPut("treatment-sheets/{id}")]
    public async Task<ActionResult<TreatmentSheetDto>> UpdateTreatmentSheet(Guid id, [FromBody] CreateTreatmentSheetDto dto)
    {
        var result = await _inpatientService.UpdateTreatmentSheetAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tờ điều trị
    /// </summary>
    [HttpGet("treatment-sheets")]
    public async Task<ActionResult<List<TreatmentSheetDto>>> GetTreatmentSheets([FromQuery] TreatmentSheetSearchDto searchDto)
    {
        var result = await _inpatientService.GetTreatmentSheetsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// In tờ điều trị
    /// </summary>
    [HttpGet("print-treatment-sheet/{id}")]
    public async Task<ActionResult> PrintTreatmentSheet(Guid id)
    {
        var pdfBytes = await _inpatientService.PrintTreatmentSheetAsync(id);
        return File(pdfBytes, "application/pdf", "treatment-sheet.pdf");
    }

    /// <summary>
    /// Khai báo sinh tồn
    /// </summary>
    [HttpPost("vital-signs")]
    public async Task<ActionResult<VitalSignsRecordDto>> CreateVitalSigns([FromBody] CreateVitalSignsDto dto)
    {
        var result = await _inpatientService.CreateVitalSignsAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách sinh tồn
    /// </summary>
    [HttpGet("vital-signs/{admissionId}")]
    public async Task<ActionResult<List<VitalSignsRecordDto>>> GetVitalSignsList(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetVitalSignsListAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Lấy biểu đồ sinh tồn
    /// </summary>
    [HttpGet("vital-signs-chart/{admissionId}")]
    public async Task<ActionResult<VitalSignsChartDto>> GetVitalSignsChart(Guid admissionId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _inpatientService.GetVitalSignsChartAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Mời hội chẩn
    /// </summary>
    [HttpPost("consultations")]
    public async Task<ActionResult<ConsultationDto>> CreateConsultation([FromBody] CreateConsultationDto dto)
    {
        var result = await _inpatientService.CreateConsultationAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hội chẩn
    /// </summary>
    [HttpGet("consultations")]
    public async Task<ActionResult<List<ConsultationDto>>> GetConsultations([FromQuery] Guid? admissionId, [FromQuery] Guid? departmentId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetConsultationsAsync(admissionId, departmentId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành hội chẩn
    /// </summary>
    [HttpPost("consultations/{id}/complete")]
    public async Task<ActionResult<ConsultationDto>> CompleteConsultation(Guid id, [FromBody] CompleteConsultationRequest request)
    {
        var result = await _inpatientService.CompleteConsultationAsync(id, request.Conclusion, request.Treatment, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In biên bản hội chẩn
    /// </summary>
    [HttpGet("print-consultation/{id}")]
    public async Task<ActionResult> PrintConsultation(Guid id)
    {
        var pdfBytes = await _inpatientService.PrintConsultationAsync(id);
        return File(pdfBytes, "application/pdf", "consultation.pdf");
    }

    /// <summary>
    /// Tạo phiếu chăm sóc
    /// </summary>
    [HttpPost("nursing-care-sheets")]
    public async Task<ActionResult<NursingCareSheetDto>> CreateNursingCareSheet([FromBody] CreateNursingCareSheetDto dto)
    {
        var result = await _inpatientService.CreateNursingCareSheetAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu chăm sóc
    /// </summary>
    [HttpGet("nursing-care-sheets/{admissionId}")]
    public async Task<ActionResult<List<NursingCareSheetDto>>> GetNursingCareSheets(Guid admissionId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _inpatientService.GetNursingCareSheetsAsync(admissionId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu truyền dịch
    /// </summary>
    [HttpPost("infusion-records")]
    public async Task<ActionResult<InfusionRecordDto>> CreateInfusionRecord([FromBody] CreateInfusionRecordDto dto)
    {
        var result = await _inpatientService.CreateInfusionRecordAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành truyền dịch
    /// </summary>
    [HttpPost("infusion-records/{id}/complete")]
    public async Task<ActionResult<InfusionRecordDto>> CompleteInfusion(Guid id, [FromBody] DateTime endTime)
    {
        var result = await _inpatientService.CompleteInfusionAsync(id, endTime, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tính thời gian kết thúc truyền dịch
    /// </summary>
    [HttpGet("calculate-infusion-end")]
    public async Task<ActionResult<DateTime>> CalculateInfusionEndTime([FromQuery] int volumeMl, [FromQuery] int dropRate)
    {
        var result = await _inpatientService.CalculateInfusionEndTimeAsync(volumeMl, dropRate);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu truyền máu
    /// </summary>
    [HttpPost("blood-transfusions")]
    public async Task<ActionResult<BloodTransfusionDto>> CreateBloodTransfusion([FromBody] CreateBloodTransfusionDto dto)
    {
        var result = await _inpatientService.CreateBloodTransfusionAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận phản ứng truyền máu
    /// </summary>
    [HttpPost("blood-transfusions/{id}/reaction")]
    public async Task<ActionResult<BloodTransfusionDto>> RecordTransfusionReaction(Guid id, [FromBody] string reactionDetails)
    {
        var result = await _inpatientService.RecordTransfusionReactionAsync(id, reactionDetails, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận phản ứng thuốc
    /// </summary>
    [HttpPost("drug-reactions")]
    public async Task<ActionResult<DrugReactionRecordDto>> CreateDrugReactionRecord([FromBody] CreateDrugReactionRequest request)
    {
        var result = await _inpatientService.CreateDrugReactionRecordAsync(request.AdmissionId, request.MedicineId, request.MedicineName, request.Severity, request.Symptoms, request.Treatment, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phản ứng thuốc
    /// </summary>
    [HttpGet("drug-reactions/{admissionId}")]
    public async Task<ActionResult<List<DrugReactionRecordDto>>> GetDrugReactionRecords(Guid admissionId)
    {
        var result = await _inpatientService.GetDrugReactionRecordsAsync(admissionId);
        return Ok(result);
    }

    #endregion

    #region 3.7 Kết thúc điều trị

    /// <summary>
    /// Kiểm tra trước xuất viện
    /// </summary>
    [HttpGet("pre-discharge-check/{admissionId}")]
    public async Task<ActionResult<PreDischargeCheckDto>> CheckPreDischarge(Guid admissionId)
    {
        var result = await _inpatientService.CheckPreDischargeAsync(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// Xuất viện
    /// </summary>
    [HttpPost("discharge")]
    public async Task<ActionResult<DischargeDto>> DischargePatient([FromBody] CompleteDischargeDto dto)
    {
        var result = await _inpatientService.DischargePatientAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy xuất viện
    /// </summary>
    [HttpPost("cancel-discharge/{admissionId}")]
    public async Task<ActionResult<bool>> CancelDischarge(Guid admissionId, [FromBody] string reason)
    {
        var result = await _inpatientService.CancelDischargeAsync(admissionId, reason, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In giấy ra viện
    /// </summary>
    [HttpGet("print-discharge-certificate/{admissionId}")]
    public async Task<ActionResult> PrintDischargeCertificate(Guid admissionId)
    {
        var pdfBytes = await _inpatientService.PrintDischargeCertificateAsync(admissionId);
        return File(pdfBytes, "application/pdf", "discharge-certificate.pdf");
    }

    /// <summary>
    /// In giấy chuyển tuyến
    /// </summary>
    [HttpPost("print-referral-certificate/{admissionId}")]
    public async Task<ActionResult> PrintReferralCertificate(Guid admissionId, [FromBody] ReferralCertificateDto data)
    {
        var pdfBytes = await _inpatientService.PrintReferralCertificateAsync(admissionId, data);
        return File(pdfBytes, "application/pdf", "referral-certificate.pdf");
    }

    /// <summary>
    /// In phiếu công khai dịch vụ
    /// </summary>
    [HttpGet("print-service-disclosure/{admissionId}")]
    public async Task<ActionResult> PrintServiceDisclosure(Guid admissionId)
    {
        var pdfBytes = await _inpatientService.PrintServiceDisclosureAsync(admissionId);
        return File(pdfBytes, "application/pdf", "service-disclosure.pdf");
    }

    /// <summary>
    /// In phiếu công khai thuốc
    /// </summary>
    [HttpGet("print-medicine-disclosure/{admissionId}")]
    public async Task<ActionResult> PrintMedicineDisclosure(Guid admissionId)
    {
        var pdfBytes = await _inpatientService.PrintMedicineDisclosureAsync(admissionId);
        return File(pdfBytes, "application/pdf", "medicine-disclosure.pdf");
    }

    /// <summary>
    /// Lấy bảng kê 6556
    /// </summary>
    [HttpGet("billing-statement/{admissionId}")]
    public async Task<ActionResult<BillingStatement6556Dto>> GetBillingStatement6556(Guid admissionId)
    {
        var result = await _inpatientService.GetBillingStatement6556Async(admissionId);
        return Ok(result);
    }

    /// <summary>
    /// In bảng kê 6556
    /// </summary>
    [HttpGet("print-billing-statement/{admissionId}")]
    public async Task<ActionResult> PrintBillingStatement6556(Guid admissionId)
    {
        var pdfBytes = await _inpatientService.PrintBillingStatement6556Async(admissionId);
        return File(pdfBytes, "application/pdf", "billing-statement.pdf");
    }

    #endregion

    #region 3.8 Quản lý báo cáo

    /// <summary>
    /// Báo cáo doanh thu khoa
    /// </summary>
    [HttpGet("reports/department-revenue")]
    [Authorize(Roles = "Admin,DepartmentHead,Accountant")]
    public async Task<ActionResult<DepartmentRevenueReportDto>> GetDepartmentRevenueReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetDepartmentRevenueReportAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo hoạt động điều trị
    /// </summary>
    [HttpGet("reports/treatment-activity")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<ActionResult<TreatmentActivityReportDto>> GetTreatmentActivityReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetTreatmentActivityReportAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Sổ theo QĐ 4069
    /// </summary>
    [HttpGet("reports/register-4069")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<ActionResult<Register4069Dto>> GetRegister4069([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetRegister4069Async(fromDate, toDate, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// In sổ 4069
    /// </summary>
    [HttpGet("reports/print-register-4069")]
    [Authorize(Roles = "Admin,DepartmentHead")]
    public async Task<ActionResult> PrintRegister4069([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] Guid? departmentId)
    {
        var pdfBytes = await _inpatientService.PrintRegister4069Async(fromDate, toDate, departmentId);
        return File(pdfBytes, "application/pdf", "register-4069.pdf");
    }

    /// <summary>
    /// Báo cáo thuốc vật tư sử dụng
    /// </summary>
    [HttpGet("reports/medicine-supply-usage")]
    [Authorize(Roles = "Admin,DepartmentHead,Pharmacist")]
    public async Task<ActionResult<MedicineSupplyUsageReportDto>> GetMedicineSupplyUsageReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetMedicineSupplyUsageReportAsync(searchDto);
        return Ok(result);
    }

    #endregion
}

#region Request DTOs

public class CompleteSpecialtyConsultRequest
{
    public string Result { get; set; } = string.Empty;
    public string? Recommendations { get; set; }
}

public class RegisterSharedBedRequest
{
    public Guid AdmissionId { get; set; }
    public Guid BedId { get; set; }
}

public class OrderByTemplateRequest
{
    public Guid AdmissionId { get; set; }
    public Guid TemplateId { get; set; }
}

public class OrderByPackageRequest
{
    public Guid AdmissionId { get; set; }
    public Guid PackageId { get; set; }
}

public class CheckServiceWarningsRequest
{
    public Guid AdmissionId { get; set; }
    public List<CreateInpatientServiceItemDto> Items { get; set; } = new();
}

public class CheckPrescriptionWarningsRequest
{
    public Guid AdmissionId { get; set; }
    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();
}

public class EmergencyCabinetPrescriptionRequest
{
    public Guid AdmissionId { get; set; }
    public Guid CabinetId { get; set; }
    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();
}

public class PrescribeByTemplateRequest
{
    public Guid AdmissionId { get; set; }
    public Guid TemplateId { get; set; }
}

public class CreateMedicineOrderSummaryRequest
{
    public Guid DepartmentId { get; set; }
    public DateTime Date { get; set; }
    public Guid? RoomId { get; set; }
    public Guid WarehouseId { get; set; }
}

public class CompleteConsultationRequest
{
    public string Conclusion { get; set; } = string.Empty;
    public string? Treatment { get; set; }
}

public class CreateDrugReactionRequest
{
    public Guid AdmissionId { get; set; }
    public Guid? MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string Symptoms { get; set; } = string.Empty;
    public string? Treatment { get; set; }
}

#endregion
