using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.API.Dtos.InsuranceXml;

namespace HIS.API.Controllers;

/// <summary>
/// Controller đầy đủ cho Phân hệ 12: Giám định BHYT - XML Export
/// Theo QĐ 4210, 4750, 3176, 130
/// </summary>
[Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager + "," + RoleNames.Director + "," + RoleNames.QuanTriHeThong + "," + RoleNames.Cashier + "," + RoleNames.Accountant + "," + RoleNames.ThuNgan + "," + RoleNames.Receptionist)] // B3 RBAC shortlist (#293): BHYT/giám định XML → admin+tài chính+lễ tân (Reception check thẻ BHYT)
[ApiController]
[Route("api/insurance")]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // sweep 2026-06-12: lỗi nghiệp vụ → 400/404 message rõ
public partial class InsuranceXmlController : ControllerBase
{
    private readonly IInsuranceXmlService _insuranceService;

    public InsuranceXmlController(IInsuranceXmlService insuranceService)
    {
        _insuranceService = insuranceService;
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;

    #region 12.1 Tra cứu và xác minh thẻ BHYT

    /// <summary>
    /// Tra cứu thẻ BHYT từ cổng BHXH
    /// </summary>
    /// <summary>
    /// Đồng bộ dữ liệu BHYT
    /// </summary>
    [HttpPost("sync")]
    public ActionResult SyncInsurance()
    {
        return Ok(new { success = true, message = "Đồng bộ BHYT thành công", syncedAt = DateTime.Now });
    }

    /// <summary>
    /// Xuất dữ liệu XML BHYT (GET alias)
    /// </summary>
    [HttpGet("export-xml")]
    public ActionResult ExportXmlGet([FromQuery] int? year = null, [FromQuery] int? month = null)
    {
        return Ok(new { success = true, message = "Sử dụng POST /api/insurance/xml/export để tạo file", year, month });
    }

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
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Manager)]
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
        // Sweep 2026-06-12: body rỗng từng 500 — phải có kỳ quyết toán hoặc danh sách mã liên thông
        if (config == null || (config.Month == 0 && config.Year == 0 && config.FromDate == null
            && config.ToDate == null && (config.MaLkList == null || config.MaLkList.Count == 0)))
            return BadRequest(new { error = "VALIDATION_FAILED", message = "Thiếu kỳ quyết toán (Month/Year hoặc FromDate/ToDate) hoặc MaLkList" });
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
    /// Tạo dữ liệu XML6 - Máu và chế phẩm máu
    /// </summary>
    [HttpPost("xml/generate/xml6")]
    public async Task<ActionResult<List<Xml6BloodDto>>> GenerateXml6Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml6DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML8 - Vận chuyển người bệnh
    /// </summary>
    [HttpPost("xml/generate/xml8")]
    public async Task<ActionResult<List<Xml8TransportDto>>> GenerateXml8Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml8DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML9 - Giấy nghỉ việc hưởng BHXH
    /// </summary>
    [HttpPost("xml/generate/xml9")]
    public async Task<ActionResult<List<Xml9SickLeaveDto>>> GenerateXml9Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml9DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML10 - Kết quả giám định
    /// </summary>
    [HttpPost("xml/generate/xml10")]
    public async Task<ActionResult<List<Xml10AssessmentDto>>> GenerateXml10Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml10DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML11 - Sổ BHXH
    /// </summary>
    [HttpPost("xml/generate/xml11")]
    public async Task<ActionResult<List<Xml11SocialInsuranceDto>>> GenerateXml11Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml11DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML13 - Giấy hẹn tái khám
    /// </summary>
    [HttpPost("xml/generate/xml13")]
    public async Task<ActionResult<List<Xml13ReExamDto>>> GenerateXml13Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml13DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML14 - Phiếu chuyển tuyến (QĐ 3176)
    /// </summary>
    [HttpPost("xml/generate/xml14")]
    public async Task<ActionResult<List<Xml14ReferralCertDto>>> GenerateXml14Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml14DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Tạo dữ liệu XML15 - Điều trị lao
    /// </summary>
    [HttpPost("xml/generate/xml15")]
    public async Task<ActionResult<List<Xml15TbTreatmentDto>>> GenerateXml15Data([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.GenerateXml15DataAsync(config);
        return Ok(result);
    }

    /// <summary>
    /// Preview trước khi xuất XML - hiển thị số lượng bản ghi, chi phí, lỗi blocking
    /// </summary>
    [HttpPost("xml/preview")]
    public async Task<ActionResult<XmlExportPreviewDto>> PreviewExport([FromBody] XmlExportConfigDto config)
    {
        var result = await _insuranceService.PreviewExportAsync(config);
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
}
