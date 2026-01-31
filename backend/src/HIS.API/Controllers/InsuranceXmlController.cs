using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;

namespace HIS.API.Controllers;

/// <summary>
/// Controller đầy đủ cho Phân hệ 12: Giám định BHYT - XML Export
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>
[Authorize]
[ApiController]
[Route("api/insurance")]
public class InsuranceXmlController : ControllerBase
{
    private readonly IInsuranceXmlService _insuranceService;

    public InsuranceXmlController(IInsuranceXmlService insuranceService)
    {
        _insuranceService = insuranceService;
    }

    #region 12.1 Tra cứu và xác minh thẻ BHYT

    /// <summary>
    /// Tra cứu thẻ BHYT từ cổng BHXH
    /// </summary>
    [HttpPost("verify-card")]
    public async Task<ActionResult<InsuranceCardVerificationDto>> VerifyInsuranceCard([FromBody] VerifyCardRequest request)
    {
        var result = await _insuranceService.VerifyInsuranceCardAsync(
            request.InsuranceNumber,
            request.PatientName,
            request.DateOfBirth);
        return Ok(result);
    }

    /// <summary>
    /// Tra cứu lịch sử KCB từ cổng BHXH
    /// </summary>
    [HttpGet("history/{insuranceNumber}")]
    public async Task<ActionResult<InsuranceHistoryDto>> GetInsuranceHistory(string insuranceNumber)
    {
        var result = await _insuranceService.GetInsuranceHistoryAsync(insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ thẻ BHYT
    /// </summary>
    [HttpGet("check-validity")]
    public async Task<ActionResult<bool>> CheckInsuranceValidity(
        [FromQuery] string insuranceNumber,
        [FromQuery] DateTime? serviceDate = null)
    {
        var result = await _insuranceService.CheckInsuranceValidityAsync(
            insuranceNumber,
            serviceDate ?? DateTime.Today);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin quyền lợi BHYT
    /// </summary>
    [HttpGet("benefits/{insuranceNumber}")]
    public async Task<ActionResult<InsuranceBenefitDto>> GetInsuranceBenefits(string insuranceNumber)
    {
        var result = await _insuranceService.GetInsuranceBenefitsAsync(insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra đăng ký KCB ban đầu
    /// </summary>
    [HttpGet("check-primary-registration")]
    public async Task<ActionResult<bool>> CheckPrimaryRegistration(
        [FromQuery] string insuranceNumber,
        [FromQuery] string facilityCode)
    {
        var result = await _insuranceService.CheckPrimaryRegistrationAsync(insuranceNumber, facilityCode);
        return Ok(result);
    }

    #endregion

    #region 12.2 Tạo và quản lý hồ sơ BHYT

    /// <summary>
    /// Tạo hồ sơ BHYT từ lượt khám
    /// </summary>
    [HttpPost("claims/create/{examinationId}")]
    public async Task<ActionResult<InsuranceClaimSummaryDto>> CreateInsuranceClaim(Guid examinationId)
    {
        var result = await _insuranceService.CreateInsuranceClaimAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết hồ sơ BHYT
    /// </summary>
    [HttpGet("claims/{maLk}")]
    public async Task<ActionResult<InsuranceClaimSummaryDto>> GetInsuranceClaimByMaLk(string maLk)
    {
        var result = await _insuranceService.GetInsuranceClaimByMaLkAsync(maLk);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm hồ sơ BHYT
    /// </summary>
    [HttpPost("claims/search")]
    public async Task<ActionResult<PagedResultDto<InsuranceClaimSummaryDto>>> SearchInsuranceClaims([FromBody] InsuranceClaimSearchDto dto)
    {
        var result = await _insuranceService.SearchInsuranceClaimsAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật hồ sơ BHYT
    /// </summary>
    [HttpPut("claims/{maLk}")]
    public async Task<ActionResult<InsuranceClaimSummaryDto>> UpdateInsuranceClaim(string maLk, [FromBody] UpdateInsuranceClaimDto dto)
    {
        var result = await _insuranceService.UpdateInsuranceClaimAsync(maLk, dto);
        return Ok(result);
    }

    /// <summary>
    /// Xóa hồ sơ BHYT
    /// </summary>
    [HttpDelete("claims/{maLk}")]
    public async Task<ActionResult<bool>> DeleteInsuranceClaim(string maLk)
    {
        var result = await _insuranceService.DeleteInsuranceClaimAsync(maLk);
        return Ok(result);
    }

    /// <summary>
    /// Khóa hồ sơ BHYT
    /// </summary>
    [HttpPost("claims/{maLk}/lock")]
    public async Task<ActionResult<bool>> LockInsuranceClaim(string maLk)
    {
        var result = await _insuranceService.LockInsuranceClaimAsync(maLk);
        return Ok(result);
    }

    /// <summary>
    /// Mở khóa hồ sơ BHYT
    /// </summary>
    [HttpPost("claims/{maLk}/unlock")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<bool>> UnlockInsuranceClaim(string maLk, [FromBody] UnlockRequest request)
    {
        var result = await _insuranceService.UnlockInsuranceClaimAsync(maLk, request.Reason);
        return Ok(result);
    }

    #endregion

    #region 12.3 Xuất XML theo chuẩn BHXH

    /// <summary>
    /// Tạo dữ liệu XML1 - Thông tin chung hồ sơ KCB
    /// </summary>
    [HttpPost("xml/generate/xml1")]
    public async Task<ActionResult<List<Xml1MedicalRecordDto>>> GenerateXml1Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml1DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML2 - Thuốc điều trị
    /// </summary>
    [HttpPost("xml/generate/xml2")]
    public async Task<ActionResult<List<Xml2MedicineDto>>> GenerateXml2Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml2DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML3 - Dịch vụ kỹ thuật
    /// </summary>
    [HttpPost("xml/generate/xml3")]
    public async Task<ActionResult<List<Xml3ServiceDto>>> GenerateXml3Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml3DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML4 - Chi phí ngoài danh mục
    /// </summary>
    [HttpPost("xml/generate/xml4")]
    public async Task<ActionResult<List<Xml4OtherMedicineDto>>> GenerateXml4Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml4DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML5 - Chỉ định thuốc
    /// </summary>
    [HttpPost("xml/generate/xml5")]
    public async Task<ActionResult<List<Xml5PrescriptionDto>>> GenerateXml5Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml5DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML7 - Giấy chuyển tuyến
    /// </summary>
    [HttpPost("xml/generate/xml7")]
    public async Task<ActionResult<List<Xml7ReferralDto>>> GenerateXml7Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml7DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Xuất file XML tổng hợp
    /// </summary>
    [HttpPost("xml/export")]
    public async Task<ActionResult<XmlExportResultDto>> ExportXml([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.ExportXmlAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Xuất file Excel dữ liệu BHYT
    /// </summary>
    [HttpPost("xml/export-excel")]
    public async Task<ActionResult> ExportExcel([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.ExportExcelAsync(config);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"BHYT_{config.Month:D2}_{config.Year}.xlsx");
    }

    /// <summary>
    /// Tải file XML đã xuất
    /// </summary>
    [HttpGet("xml/download/{batchId}")]
    public async Task<ActionResult> DownloadXmlFile(Guid batchId)
    {
        var result = await _insuranceService.DownloadXmlFileAsync(batchId);
        return File(result, "application/zip", $"XML_BHYT_{batchId}.zip");
    }

    #endregion

    #region 12.4 Kiểm tra và validate

    /// <summary>
    /// Kiểm tra hồ sơ BHYT đơn lẻ
    /// </summary>
    [HttpGet("validate/{maLk}")]
    public async Task<ActionResult<InsuranceValidationResultDto>> ValidateClaim(string maLk)
    {
        var result = await _insuranceService.ValidateClaimAsync(maLk);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra hàng loạt hồ sơ BHYT
    /// </summary>
    [HttpPost("validate/batch")]
    public async Task<ActionResult<List<InsuranceValidationResultDto>>> ValidateClaimsBatch([FromBody] List<string> maLkList)
    {
        var result = await _insuranceService.ValidateClaimsBatchAsync(maLkList);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trước khi xuất XML
    /// </summary>
    [HttpPost("validate/before-export")]
    public async Task<ActionResult<List<InsuranceValidationResultDto>>> ValidateBeforeExport([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.ValidateBeforeExportAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc kê đơn BHYT
    /// </summary>
    [HttpGet("validate/prescription/{prescriptionId}")]
    public async Task<ActionResult<List<PrescriptionValidationError>>> ValidateBhytPrescription(Guid prescriptionId)
    {
        var result = await _insuranceService.ValidateBhytPrescriptionAsync(prescriptionId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra quy tắc chỉ định CLS BHYT
    /// </summary>
    [HttpGet("validate/service-order/{serviceOrderId}")]
    public async Task<ActionResult<List<ServiceValidationError>>> ValidateBhytServiceOrder(Guid serviceOrderId)
    {
        var result = await _insuranceService.ValidateBhytServiceOrderAsync(serviceOrderId);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra chi phí vượt trần BHYT
    /// </summary>
    [HttpGet("check-cost-ceiling/{maLk}")]
    public async Task<ActionResult<CostCeilingCheckResult>> CheckCostCeiling(string maLk)
    {
        var result = await _insuranceService.CheckCostCeilingAsync(maLk);
        return Ok(result);
    }

    #endregion

    #region 12.5 Gửi dữ liệu lên cổng BHXH

    /// <summary>
    /// Gửi XML lên cổng BHXH
    /// </summary>
    [HttpPost("submit")]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<ActionResult<SubmitResultDto>> SubmitToInsurancePortal([FromBody] SubmitToInsurancePortalDto dto)
    {
        var result = await _insuranceService.SubmitToInsurancePortalAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trạng thái gửi
    /// </summary>
    [HttpGet("submit-status/{transactionId}")]
    public async Task<ActionResult<SubmitStatusDto>> CheckSubmitStatus(string transactionId)
    {
        var result = await _insuranceService.CheckSubmitStatusAsync(transactionId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy kết quả phản hồi từ BHXH
    /// </summary>
    [HttpGet("feedback/{transactionId}")]
    public async Task<ActionResult<InsuranceFeedbackDto>> GetInsuranceFeedback(string transactionId)
    {
        var result = await _insuranceService.GetInsuranceFeedbackAsync(transactionId);
        return Ok(result);
    }

    /// <summary>
    /// Tái gửi hồ sơ bị từ chối
    /// </summary>
    [HttpPost("resubmit")]
    [Authorize(Roles = "Admin,InsuranceManager")]
    public async Task<ActionResult<SubmitResultDto>> ResubmitRejectedClaims([FromBody] List<string> maLkList)
    {
        var result = await _insuranceService.ResubmitRejectedClaimsAsync(maLkList);
        return Ok(result);
    }

    #endregion

    #region 12.6 Đối soát và quyết toán

    /// <summary>
    /// Tạo đợt quyết toán
    /// </summary>
    [HttpPost("settlement/create")]
    public async Task<ActionResult<InsuranceSettlementBatchDto>> CreateSettlementBatch([FromBody] CreateSettlementBatchRequest request)
    {
        var result = await _insuranceService.CreateSettlementBatchAsync(request.Month, request.Year);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin đợt quyết toán
    /// </summary>
    [HttpGet("settlement/{batchId}")]
    public async Task<ActionResult<InsuranceSettlementBatchDto>> GetSettlementBatch(Guid batchId)
    {
        var result = await _insuranceService.GetSettlementBatchAsync(batchId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đợt quyết toán
    /// </summary>
    [HttpGet("settlement/list/{year}")]
    public async Task<ActionResult<List<InsuranceSettlementBatchDto>>> GetSettlementBatches(int year)
    {
        var result = await _insuranceService.GetSettlementBatchesAsync(year);
        return Ok(result);
    }

    /// <summary>
    /// Import kết quả đối soát từ BHXH
    /// </summary>
    [HttpPost("reconciliation/import/{batchId}")]
    public async Task<ActionResult<InsuranceReconciliationDto>> ImportReconciliationResult(Guid batchId, IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportReconciliationResultAsync(batchId, stream.ToArray());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách hồ sơ bị từ chối
    /// </summary>
    [HttpGet("rejected-claims/{batchId}")]
    public async Task<ActionResult<List<RejectedClaimDto>>> GetRejectedClaims(Guid batchId)
    {
        var result = await _insuranceService.GetRejectedClaimsAsync(batchId);
        return Ok(result);
    }

    /// <summary>
    /// Xử lý hồ sơ bị từ chối
    /// </summary>
    [HttpPost("rejected-claims/{maLk}/process")]
    public async Task<ActionResult<bool>> ProcessRejectedClaim(string maLk, [FromBody] RejectedClaimProcessDto dto)
    {
        var result = await _insuranceService.ProcessRejectedClaimAsync(maLk, dto);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chênh lệch đối soát
    /// </summary>
    [HttpGet("reconciliation/difference/{batchId}")]
    public async Task<ActionResult<ReconciliationDifferenceDto>> CalculateReconciliationDifference(Guid batchId)
    {
        var result = await _insuranceService.CalculateReconciliationDifferenceAsync(batchId);
        return Ok(result);
    }

    #endregion

    #region 12.7 Báo cáo BHYT

    /// <summary>
    /// Báo cáo tổng hợp BHYT theo tháng
    /// </summary>
    [HttpGet("reports/monthly")]
    public async Task<ActionResult<MonthlyInsuranceReportDto>> GetMonthlyInsuranceReport(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetMonthlyInsuranceReportAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo theo mẫu C79a-HD
    /// </summary>
    [HttpGet("reports/c79a")]
    public async Task<ActionResult<ReportC79aDto>> GetReportC79a(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReportC79aAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo theo mẫu 80a-HD
    /// </summary>
    [HttpGet("reports/80a")]
    public async Task<ActionResult<Report80aDto>> GetReport80a(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport80aAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất báo cáo C79a ra Excel
    /// </summary>
    [HttpGet("reports/c79a/export")]
    public async Task<ActionResult> ExportReportC79aToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReportC79aToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"C79a_{month:D2}_{year}.xlsx");
    }

    /// <summary>
    /// Xuất báo cáo 80a ra Excel
    /// </summary>
    [HttpGet("reports/80a/export")]
    public async Task<ActionResult> ExportReport80aToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport80aToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"80a_{month:D2}_{year}.xlsx");
    }

    /// <summary>
    /// Báo cáo chi tiết theo loại KCB
    /// </summary>
    [HttpGet("reports/by-treatment-type")]
    public async Task<ActionResult<List<TreatmentTypeReportDto>>> GetTreatmentTypeReport(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetTreatmentTypeReportAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo top bệnh thường gặp
    /// </summary>
    [HttpGet("reports/top-diseases")]
    public async Task<ActionResult<List<DiseaseStatDto>>> GetTopDiseasesReport(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] int top = 20)
    {
        var result = await _insuranceService.GetTopDiseasesReportAsync(month, year, top);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo top thuốc sử dụng
    /// </summary>
    [HttpGet("reports/top-medicines")]
    public async Task<ActionResult<List<MedicineStatDto>>> GetTopMedicinesReport(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] int top = 20)
    {
        var result = await _insuranceService.GetTopMedicinesReportAsync(month, year, top);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo theo khoa/phòng
    /// </summary>
    [HttpGet("reports/by-department")]
    public async Task<ActionResult<List<DepartmentInsuranceReportDto>>> GetDepartmentReport(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetDepartmentReportAsync(month, year);
        return Ok(result);
    }

    #endregion

    #region 12.8 Quản lý danh mục BHYT

    /// <summary>
    /// Lấy danh sách mapping dịch vụ - mã BHYT
    /// </summary>
    [HttpGet("catalog/service-mappings")]
    public async Task<ActionResult<List<ServiceInsuranceMapDto>>> GetServiceMappings([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetServiceMappingsAsync(keyword);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mapping dịch vụ - mã BHYT
    /// </summary>
    [HttpPut("catalog/service-mappings/{id}")]
    public async Task<ActionResult<ServiceInsuranceMapDto>> UpdateServiceMapping(Guid id, [FromBody] ServiceInsuranceMapDto dto)
    {
        var result = await _insuranceService.UpdateServiceMappingAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mapping thuốc - mã BHYT
    /// </summary>
    [HttpGet("catalog/medicine-mappings")]
    public async Task<ActionResult<List<MedicineInsuranceMapDto>>> GetMedicineMappings([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetMedicineMappingsAsync(keyword);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mapping thuốc - mã BHYT
    /// </summary>
    [HttpPut("catalog/medicine-mappings/{id}")]
    public async Task<ActionResult<MedicineInsuranceMapDto>> UpdateMedicineMapping(Guid id, [FromBody] MedicineInsuranceMapDto dto)
    {
        var result = await _insuranceService.UpdateMedicineMappingAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Import danh mục thuốc BHYT từ file
    /// </summary>
    [HttpPost("catalog/import-medicines")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ImportResultDto>> ImportMedicineCatalog(IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportMedicineCatalogAsync(stream.ToArray());
        return Ok(result);
    }

    /// <summary>
    /// Import danh mục dịch vụ BHYT từ file
    /// </summary>
    [HttpPost("catalog/import-services")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ImportResultDto>> ImportServiceCatalog(IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportServiceCatalogAsync(stream.ToArray());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật giá BHYT theo đợt
    /// </summary>
    [HttpPost("catalog/update-prices")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InsurancePriceUpdateBatchDto>> UpdateInsurancePrices([FromBody] InsurancePriceUpdateBatchDto dto)
    {
        var result = await _insuranceService.UpdateInsurancePricesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mã ICD hợp lệ BHYT
    /// </summary>
    [HttpGet("catalog/valid-icd-codes")]
    public async Task<ActionResult<List<IcdInsuranceMapDto>>> GetValidIcdCodes([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetValidIcdCodesAsync(keyword);
        return Ok(result);
    }

    #endregion

    #region 12.9 Cấu hình và thiết lập

    /// <summary>
    /// Lấy cấu hình kết nối cổng BHXH
    /// </summary>
    [HttpGet("config/portal")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InsurancePortalConfigDto>> GetPortalConfig()
    {
        var result = await _insuranceService.GetPortalConfigAsync();
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình kết nối cổng BHXH
    /// </summary>
    [HttpPut("config/portal")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InsurancePortalConfigDto>> UpdatePortalConfig([FromBody] InsurancePortalConfigDto config)
    {
        var result = await _insuranceService.UpdatePortalConfigAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra kết nối cổng BHXH
    /// </summary>
    [HttpGet("config/test-connection")]
    public async Task<ActionResult<PortalConnectionTestResult>> TestPortalConnection()
    {
        var result = await _insuranceService.TestPortalConnectionAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin cơ sở KCB
    /// </summary>
    [HttpGet("config/facility")]
    public async Task<ActionResult<FacilityInfoDto>> GetFacilityInfo()
    {
        var result = await _insuranceService.GetFacilityInfoAsync();
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin cơ sở KCB
    /// </summary>
    [HttpPut("config/facility")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<FacilityInfoDto>> UpdateFacilityInfo([FromBody] FacilityInfoDto dto)
    {
        var result = await _insuranceService.UpdateFacilityInfoAsync(dto);
        return Ok(result);
    }

    #endregion

    #region 12.10 Tiện ích

    /// <summary>
    /// Tạo mã liên thông mới
    /// </summary>
    [HttpPost("generate-malk/{examinationId}")]
    public async Task<ActionResult<string>> GenerateMaLk(Guid examinationId)
    {
        var result = await _insuranceService.GenerateMaLkAsync(examinationId);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chi phí BHYT cho dịch vụ
    /// </summary>
    [HttpGet("calculate/service-cost")]
    public async Task<ActionResult<InsuranceCostCalculationDto>> CalculateServiceInsuranceCost(
        [FromQuery] Guid serviceId,
        [FromQuery] string insuranceNumber)
    {
        var result = await _insuranceService.CalculateServiceInsuranceCostAsync(serviceId, insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán chi phí BHYT cho thuốc
    /// </summary>
    [HttpGet("calculate/medicine-cost")]
    public async Task<ActionResult<InsuranceCostCalculationDto>> CalculateMedicineInsuranceCost(
        [FromQuery] Guid medicineId,
        [FromQuery] decimal quantity,
        [FromQuery] string insuranceNumber)
    {
        var result = await _insuranceService.CalculateMedicineInsuranceCostAsync(medicineId, quantity, insuranceNumber);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tỷ lệ thanh toán BHYT
    /// </summary>
    [HttpGet("payment-ratio")]
    public async Task<ActionResult<int>> GetInsurancePaymentRatio(
        [FromQuery] string insuranceNumber,
        [FromQuery] int treatmentType)
    {
        var result = await _insuranceService.GetInsurancePaymentRatioAsync(insuranceNumber, treatmentType);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra đúng tuyến/trái tuyến
    /// </summary>
    [HttpGet("check-referral")]
    public async Task<ActionResult<ReferralCheckResult>> CheckReferralStatus(
        [FromQuery] string insuranceNumber,
        [FromQuery] string facilityCode)
    {
        var result = await _insuranceService.CheckReferralStatusAsync(insuranceNumber, facilityCode);
        return Ok(result);
    }

    /// <summary>
    /// Lấy log hoạt động BHYT
    /// </summary>
    [HttpGet("logs")]
    public async Task<ActionResult<List<InsuranceActivityLogDto>>> GetInsuranceLogs(
        [FromQuery] string? maLk = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _insuranceService.GetInsuranceLogsAsync(maLk, fromDate, toDate);
        return Ok(result);
    }

    #endregion
}

#region Request DTOs

public class VerifyCardRequest
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
}

public class UnlockRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CreateSettlementBatchRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
}

#endregion
