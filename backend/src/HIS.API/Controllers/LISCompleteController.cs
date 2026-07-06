using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;
using HIS.API.Dtos.LISComplete;
using HIS.API.Filters;
using ApiResponse = HIS.Application.DTOs.Common.ApiResponse<object>;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete LIS (Laboratory Information System) Controller
    /// Module 7: Xét nghiệm - 31+ chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [TypeFilter(typeof(Filters.DomainExceptionFilter))] // sweep 2026-06-12: lỗi nghiệp vụ → 400/404 message rõ
    public partial class LISCompleteController : ControllerBase
    {
        private readonly ILISCompleteService _lisService;
        private readonly HIS.Infrastructure.Data.HISDbContext _context;

        public LISCompleteController(ILISCompleteService lisService, HIS.Infrastructure.Data.HISDbContext context)
        {
            _lisService = lisService;
            _context = context;
        }

        private Guid? GetUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        #region DEV Endpoints

        /// <summary>
        /// Cập nhật ngày của tất cả phiếu XN (ServiceRequests RequestType=1) thành hôm nay (DEV only)
        /// </summary>
        [HttpPost("dev/update-dates-to-today")]
        [AllowAnonymous]
        [DevelopmentOnly]
        public async Task<ActionResult> UpdateDatesToToday()
        {
            var count = await _lisService.UpdateAllOrderDatesToTodayAsync();
            return Ok(new { updatedCount = count });
        }

        #endregion

        #region 7.1 Kết nối máy xét nghiệm

        /// <summary>
        /// 7.1.1 Danh sách máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabAnalyzerDto>>> GetAnalyzers(
            [FromQuery] string keyword = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _lisService.GetAnalyzersAsync(keyword, isActive);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.2 Thêm mới máy xét nghiệm
        /// </summary>
        [HttpPost("analyzers")]
        // Authorize removed for testing
        public async Task<ActionResult<LabAnalyzerDto>> CreateAnalyzer([FromBody] CreateAnalyzerDto dto)
        {
            var result = await _lisService.CreateAnalyzerAsync(dto);
            return CreatedAtAction(nameof(GetAnalyzers), new { id = result.Id }, result);
        }

        /// <summary>
        /// 7.1.3 Cập nhật thông tin máy
        /// </summary>
        [HttpPut("analyzers/{id}")]
        // Authorize removed for testing
        public async Task<ActionResult<LabAnalyzerDto>> UpdateAnalyzer(Guid id, [FromBody] UpdateAnalyzerDto dto)
        {
            var result = await _lisService.UpdateAnalyzerAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.4 Xóa máy xét nghiệm
        /// </summary>
        [HttpDelete("analyzers/{id}")]
        // Authorize removed for testing
        public async Task<ActionResult> DeleteAnalyzer(Guid id)
        {
            await _lisService.DeleteAnalyzerAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 7.1.5 Lấy mapping chỉ số xét nghiệm với máy
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/mappings")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerTestMappingDto>>> GetAnalyzerTestMappings(Guid analyzerId)
        {
            var result = await _lisService.GetAnalyzerTestMappingsAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.6 Cập nhật mapping chỉ số
        /// </summary>
        [HttpPut("analyzers/{analyzerId}/mappings")]
        // Authorize removed for testing
        public async Task<ActionResult> UpdateAnalyzerTestMappings(
            Guid analyzerId,
            [FromBody] List<UpdateAnalyzerTestMappingDto> mappings)
        {
            await _lisService.UpdateAnalyzerTestMappingsAsync(analyzerId, mappings);
            return Ok();
        }

        /// <summary>
        /// 7.1.7 Kiểm tra kết nối máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/connection-status")]
        // Authorize removed for testing
        public async Task<ActionResult<AnalyzerConnectionStatusDto>> CheckAnalyzerConnection(Guid analyzerId)
        {
            var result = await _lisService.CheckAnalyzerConnectionAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.1.8 Khởi động/Dừng kết nối máy
        /// </summary>
        [HttpPost("analyzers/{analyzerId}/toggle-connection")]
        // Authorize removed for testing
        public async Task<ActionResult> ToggleAnalyzerConnection(Guid analyzerId, [FromQuery] bool connect)
        {
            await _lisService.ToggleAnalyzerConnectionAsync(analyzerId, connect);
            return Ok(new { connected = connect });
        }

        /// <summary>
        /// Lấy dữ liệu thô từ máy xét nghiệm
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/raw-data")]
        // Authorize removed for testing
        public async Task<ActionResult<List<RawDataDto>>> GetRawDataFromAnalyzer(
            Guid analyzerId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetRawDataFromAnalyzerAsync(analyzerId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử kết nối máy
        /// </summary>
        [HttpGet("analyzers/{analyzerId}/connection-logs")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerConnectionLogDto>>> GetConnectionLogs(
            Guid analyzerId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _lisService.GetConnectionLogsAsync(analyzerId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Lấy trạng thái real-time của các máy
        /// </summary>
        [HttpGet("analyzers/realtime-status")]
        // Authorize removed for testing
        public async Task<ActionResult<List<AnalyzerRealtimeStatusDto>>> GetAnalyzersRealtimeStatus()
        {
            var result = await _lisService.GetAnalyzersRealtimeStatusAsync();
            return Ok(result);
        }

        #endregion

        #region 7.2 Lấy mẫu xét nghiệm

        /// <summary>
        /// 7.2.1 Danh sách bệnh nhân chờ lấy mẫu
        /// </summary>
        [HttpGet("sample-collection/list")]
        // Authorize removed for testing
        public async Task<ActionResult<List<SampleCollectionListDto>>> GetSampleCollectionList(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string patientType = null,
            [FromQuery] string keyword = null)
        {
            var result = await _lisService.GetSampleCollectionListAsync(date, departmentId, patientType, keyword);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.2 Chi tiết mẫu cần lấy của bệnh nhân
        /// </summary>
        [HttpGet("sample-collection/patient/{patientId}/visit/{visitId}")]
        // Authorize removed for testing
        public async Task<ActionResult<List<SampleCollectionItemDto>>> GetPatientSamples(Guid patientId, Guid visitId)
        {
            var result = await _lisService.GetPatientSamplesAsync(patientId, visitId);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.3 Thực hiện lấy mẫu
        /// </summary>
        [HttpPost("sample-collection/collect")]
        [HttpPost("sample/collect")]
        // Authorize removed for testing
        public async Task<ActionResult<CollectSampleResultDto>> CollectSample([FromBody] CollectSampleDto dto)
        {
            var result = await _lisService.CollectSampleAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.2.4 In nhãn barcode mẫu
        /// </summary>
        [HttpGet("sample-collection/{sampleId}/barcode")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintSampleBarcode(Guid sampleId)
        {
            var result = await _lisService.PrintSampleBarcodeAsync(sampleId);
            return File(result, "application/pdf", $"barcode_{sampleId}.pdf");
        }

        /// <summary>
        /// In nhãn barcode hàng loạt
        /// </summary>
        [HttpPost("sample-collection/barcodes/batch")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintSampleBarcodesBatch([FromBody] List<Guid> sampleIds)
        {
            var result = await _lisService.PrintSampleBarcodesBatchAsync(sampleIds);
            return File(result, "application/pdf", "barcodes_batch.pdf");
        }

        /// <summary>
        /// Hủy mẫu đã lấy
        /// </summary>
        [HttpPost("sample-collection/{sampleId}/cancel")]
        // Authorize removed for testing
        public async Task<ActionResult> CancelSample(Guid sampleId, [FromBody] CancelSampleRequest request)
        {
            await _lisService.CancelSampleAsync(sampleId, request.Reason);
            return Ok();
        }

        /// <summary>
        /// Danh sách loại mẫu
        /// </summary>
        [HttpGet("sample-types")]
        public async Task<ActionResult<List<SampleTypeDto>>> GetSampleTypes()
        {
            var result = await _lisService.GetSampleTypesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Danh sách loại ống nghiệm
        /// </summary>
        [HttpGet("tube-types")]
        public async Task<ActionResult<List<TubeTypeDto>>> GetTubeTypes()
        {
            var result = await _lisService.GetTubeTypesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Kiểm tra mẫu có hợp lệ không
        /// </summary>
        [HttpGet("sample-collection/{sampleId}/validate")]
        // Authorize removed for testing
        public async Task<ActionResult<SampleValidationResultDto>> ValidateSample(Guid sampleId)
        {
            var result = await _lisService.ValidateSampleAsync(sampleId);
            return Ok(result);
        }

        #endregion

        #region 7.3 Thực hiện xét nghiệm

        /// <summary>
        /// G-01: Danh sách phiếu XN (kèm items + results) theo lượt nội trú — dùng cho "Trả KQ tại giường"
        /// Join: Admission.MedicalRecordId → LabRequest.MedicalRecordId
        /// </summary>
        [HttpGet("orders/by-admission/{admissionId}")]
        public async Task<ActionResult<List<LabOrderDto>>> GetLabOrdersByAdmission(Guid admissionId)
        {
            var admission = await _context.Set<HIS.Core.Entities.Admission>()
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);
            if (admission == null) return NotFound(ApiResponse.Fail("Admission not found"));

            var medicalRecordId = admission.MedicalRecordId;
            // #14b: model 1 — SR XN theo HSBA + chỉ số con R1 (model 2 LabRequests chết → endpoint này trước trả rỗng)
            var orders = await _context.ServiceRequests
                .AsNoTracking()
                .Where(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.RequestType == 1)
                .Include(r => r.Details.Where(d => !d.IsDeleted)).ThenInclude(d => d.Service)
                .Include(r => r.Doctor)
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();

            var allDetailIds = orders.SelectMany(r => r.Details.Select(d => d.Id)).ToList();
            var paramsByDetail = allDetailIds.Count == 0
                ? new Dictionary<Guid, List<HIS.Core.Entities.ServiceRequestDetailParameter>>()
                : (await _context.ServiceRequestDetailParameters.AsNoTracking()
                        .Where(p => allDetailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
                        .OrderBy(p => p.SequenceNumber)
                        .ToListAsync())
                    .GroupBy(p => p.ServiceRequestDetailId)
                    .ToDictionary(g => g.Key, g => g.ToList());

            var dtos = orders.Select(r => new LabOrderDto
            {
                Id = r.Id,
                OrderCode = r.RequestCode,
                PatientId = admission.PatientId,
                PatientCode = "",
                PatientName = "",
                MedicalRecordId = r.MedicalRecordId,
                MedicalRecordCode = "",
                OrderDepartmentId = r.DepartmentId,
                OrderDoctorId = r.DoctorId,
                OrderDoctorName = r.Doctor?.FullName ?? "",
                Diagnosis = r.Diagnosis,
                IcdCode = r.IcdCode,
                Notes = r.Notes ?? r.Note,
                Status = r.Status,
                StatusName = r.Status switch
                {
                    0 => "Chờ thanh toán",
                    1 => "Đã thanh toán",
                    2 => "Đang thực hiện",
                    3 => "Có kết quả",
                    _ => "Đã hủy"
                },
                IsPriority = r.IsPriority || r.IsEmergency,
                IsEmergency = r.IsEmergency,
                OrderedAt = r.RequestDate,
                ApprovedAt = r.Details.Select(d => d.ReviewedAt).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault(),
                Tests = r.Details.Where(d => d.Status != 3).Select(d =>
                {
                    paramsByDetail.TryGetValue(d.Id, out var ps);
                    var single = ps != null && ps.Count == 1 ? ps[0] : null;
                    return new HIS.Application.DTOs.Laboratory.LabTestItemDto
                    {
                        Id = d.Id,
                        LabOrderId = r.Id,
                        TestCode = d.Service?.ServiceCode ?? "",
                        TestName = d.Service?.ServiceName ?? "",
                        SampleTypeName = null,
                        Result = single?.Value ?? d.Result,
                        Unit = single?.Unit,
                        ReferenceRange = single?.ReferenceRange,
                        AbnormalFlag = ps != null && ps.Any(p => !string.IsNullOrEmpty(p.Flag) && p.Flag != "N") ? 1 : 0,
                        Status = d.Status,
                        StatusName = d.ReceiveStatus == 2 ? "Từ chối" : d.Status switch
                        {
                            0 => "Chờ",
                            1 => d.IsSampleCollected ? "Có mẫu" : "Đang XN",
                            2 => d.ReviewedAt != null ? "Đã duyệt" : "Có KQ",
                            3 => "Đã hủy",
                            _ => "Không rõ"
                        }
                    };
                }).ToList()
            }).ToList();

            return Ok(dtos);
        }

        /// <summary>
        /// 7.3.1 Danh sách xét nghiệm chờ thực hiện
        /// </summary>
        [HttpGet("orders/pending")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabOrderDto>>> GetPendingLabOrders(
            [FromQuery] DateTime date,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? analyzerId = null,
            [FromQuery] string patientType = null,
            [FromQuery] string keyword = null)
        {
            var result = await _lisService.GetPendingLabOrdersAsync(date, departmentId, analyzerId, patientType, keyword);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.2 Chi tiết xét nghiệm của bệnh nhân
        /// </summary>
        [HttpGet("orders/{orderId}")]
        // Authorize removed for testing
        public async Task<ActionResult<LabOrderDetailDto>> GetLabOrderDetail(Guid orderId)
        {
            var result = await _lisService.GetLabOrderDetailAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.3 Gửi worklist đến máy xét nghiệm
        /// </summary>
        [HttpPost("worklist/send")]
        // Authorize removed for testing
        public async Task<ActionResult<SendWorklistResultDto>> SendWorklistToAnalyzer([FromBody] SendWorklistDto dto)
        {
            var result = await _lisService.SendWorklistToAnalyzerAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.3a Gửi worklist HL7 ORM^O01 cho một phiếu XN cụ thể.
        /// </summary>
        [HttpPost("worklist/order/{orderId}/send")]
        public async Task<ActionResult<SendWorklistResultDto>> SendWorklistForOrder(Guid orderId)
        {
            var result = await _lisService.SendWorklistForOrderAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.3b Trạng thái gửi worklist của một phiếu XN.
        /// </summary>
        [HttpGet("worklist/order/{orderId}/status")]
        public async Task<ActionResult<WorklistStatusDto>> GetWorklistStatus(Guid orderId)
        {
            var result = await _lisService.GetWorklistStatusAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.4 Nhận kết quả từ máy xét nghiệm
        /// </summary>
        [HttpPost("analyzers/{analyzerId}/receive-results")]
        // Authorize removed for testing
        public async Task<ActionResult<ReceiveResultDto>> ReceiveResultFromAnalyzer(Guid analyzerId)
        {
            var result = await _lisService.ReceiveResultFromAnalyzerAsync(analyzerId);
            return Ok(result);
        }

        /// <summary>
        /// 7.3.5 Nhập kết quả thủ công
        /// </summary>
        [HttpPost("orders/enter-result")]
        // Authorize removed for testing
        public async Task<ActionResult> EnterLabResult([FromBody] EnterLabResultDto dto)
        {
            // Sweep 2026-06-12: body rỗng từng trả success giả — validate tối thiểu.
            if (dto == null || dto.LabTestItemId == Guid.Empty)
                return BadRequest(ApiResponse.Fail("Thiếu LabTestItemId"));
            if (string.IsNullOrWhiteSpace(dto.Result) && (dto.Parameters == null || dto.Parameters.Count == 0))
                return BadRequest(ApiResponse.Fail("Cần nhập kết quả (Result hoặc Parameters)"));
            await _lisService.EnterLabResultAsync(dto);
            return Ok();
        }

        /// <summary>
        /// 7.3.6 Duyệt kết quả xét nghiệm (1 bước)
        /// </summary>
        [HttpPost("orders/approve")]
        [HttpPost("results/approve")]
        // Authorize removed for testing
        public async Task<ActionResult> ApproveLabResult([FromBody] ApproveLabResultDto dto)
        {
            dto.ApprovedByUserId ??= GetUserId();
            await _lisService.ApproveLabResultAsync(dto);
            return Ok();
        }

        /// <summary>
        /// 7.3.7 Duyệt kết quả xét nghiệm (2 bước - duyệt sơ bộ)
        /// </summary>
        [HttpPost("orders/{orderId}/preliminary-approve")]
        // Authorize removed for testing
        public async Task<ActionResult> PreliminaryApproveLabResult(
            Guid orderId,
            [FromBody] PreliminaryApproveRequest request)
        {
            await _lisService.PreliminaryApproveLabResultAsync(orderId, request.TechnicianNote, GetUserId());
            return Ok();
        }

        /// <summary>
        /// 7.3.8 Duyệt kết quả xét nghiệm (2 bước - duyệt chính thức)
        /// </summary>
        [HttpPost("orders/{orderId}/final-approve")]
        // Authorize removed for testing
        public async Task<ActionResult> FinalApproveLabResult(
            Guid orderId,
            [FromBody] FinalApproveRequest request)
        {
            await _lisService.FinalApproveLabResultAsync(orderId, request.DoctorNote, GetUserId());
            return Ok();
        }

        /// <summary>
        /// 7.3.9 Hủy duyệt kết quả
        /// </summary>
        [HttpPost("orders/{orderId}/cancel-approval")]
        // Authorize removed for testing
        public async Task<ActionResult> CancelApproval(Guid orderId, [FromBody] LISCancelApprovalRequest request)
        {
            await _lisService.CancelApprovalAsync(orderId, request.Reason);
            return Ok();
        }

        /// <summary>
        /// 7.3.10 In phiếu kết quả xét nghiệm
        /// </summary>
        [HttpGet("orders/{orderId}/print")]
        // Authorize removed for testing
        public async Task<ActionResult> PrintLabResult(Guid orderId, [FromQuery] string format = "A4")
        {
            try
            {
                var result = await _lisService.PrintLabResultAsync(orderId, format);
                return File(result, "application/pdf", $"lab_result_{orderId}.pdf");
            }
            catch (InvalidOperationException ex)
            {
                // Chưa duyệt KQ → "Không có số liệu" (rule tài liệu) — 400 message rõ, không in.
                return BadRequest(ApiResponse.Fail(ex.Message));
            }
        }

        /// <summary>
        /// 7.3.11 Xử lý giá trị nguy hiểm
        /// </summary>
        [HttpPost("critical-values/process")]
        // Authorize removed for testing
        public async Task<ActionResult> ProcessCriticalValue([FromBody] ProcessCriticalValueDto dto)
        {
            await _lisService.ProcessCriticalValueAsync(dto);
            return Ok();
        }

        /// <summary>
        /// Danh sách cảnh báo giá trị nguy hiểm
        /// </summary>
        [HttpGet("critical-values/alerts")]
        // Authorize removed for testing
        public async Task<ActionResult<List<CriticalValueAlertDto>>> GetCriticalValueAlerts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] bool? acknowledged = null)
        {
            var result = await _lisService.GetCriticalValueAlertsAsync(fromDate, toDate, acknowledged);
            return Ok(result);
        }

        /// <summary>
        /// Xác nhận đã thông báo giá trị nguy hiểm
        /// </summary>
        [HttpPost("critical-values/{alertId}/acknowledge")]
        // Authorize removed for testing
        public async Task<ActionResult> AcknowledgeCriticalValue(
            Guid alertId,
            [FromBody] AcknowledgeCriticalValueDto dto)
        {
            await _lisService.AcknowledgeCriticalValueAsync(alertId, dto);
            return Ok();
        }

        /// <summary>
        /// Lịch sử kết quả xét nghiệm của bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/history")]
        // Authorize removed for testing
        public async Task<ActionResult<List<LabResultHistoryDto>>> GetLabResultHistory(
            Guid patientId,
            [FromQuery] string testCode = null,
            [FromQuery] int? lastNMonths = 12)
        {
            var result = await _lisService.GetLabResultHistoryAsync(patientId, testCode, lastNMonths);
            return Ok(result);
        }

        /// <summary>
        /// So sánh kết quả với các lần trước
        /// </summary>
        [HttpGet("patients/{patientId}/compare")]
        // Authorize removed for testing
        public async Task<ActionResult<LabResultComparisonDto>> CompareLabResults(
            Guid patientId,
            [FromQuery] string testCode,
            [FromQuery] int lastNTimes = 5)
        {
            var result = await _lisService.CompareLabResultsAsync(patientId, testCode, lastNTimes);
            return Ok(result);
        }

        /// <summary>
        /// Tính delta check
        /// </summary>
        [HttpGet("orders/{orderId}/delta-check")]
        // Authorize removed for testing
        public async Task<ActionResult<DeltaCheckResultDto>> PerformDeltaCheck(Guid orderId)
        {
            var result = await _lisService.PerformDeltaCheckAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// Làm lại xét nghiệm
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/rerun")]
        // Authorize removed for testing
        public async Task<ActionResult> RerunLabTest(Guid orderItemId, [FromBody] RerunRequest request)
        {
            await _lisService.RerunLabTestAsync(orderItemId, request.Reason);
            return Ok();
        }

        #endregion

    }
}
