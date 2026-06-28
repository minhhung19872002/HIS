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

public partial class InpatientCompleteController
{
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
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead + "," + RoleNames.Accountant)]
    public async Task<ActionResult<DepartmentRevenueReportDto>> GetDepartmentRevenueReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetDepartmentRevenueReportAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo hoạt động điều trị
    /// </summary>
    [HttpGet("reports/treatment-activity")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<ActionResult<TreatmentActivityReportDto>> GetTreatmentActivityReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetTreatmentActivityReportAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Sổ theo QĐ 4069
    /// </summary>
    [HttpGet("reports/register-4069")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<ActionResult<Register4069Dto>> GetRegister4069([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] Guid? departmentId)
    {
        var result = await _inpatientService.GetRegister4069Async(fromDate, toDate, departmentId);
        return Ok(result);
    }

    /// <summary>
    /// In sổ 4069
    /// </summary>
    [HttpGet("reports/print-register-4069")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead)]
    public async Task<ActionResult> PrintRegister4069([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] Guid? departmentId)
    {
        var pdfBytes = await _inpatientService.PrintRegister4069Async(fromDate, toDate, departmentId);
        return File(pdfBytes, "application/pdf", "register-4069.pdf");
    }

    /// <summary>
    /// Báo cáo thuốc vật tư sử dụng
    /// </summary>
    [HttpGet("reports/medicine-supply-usage")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.DepartmentHead + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<MedicineSupplyUsageReportDto>> GetMedicineSupplyUsageReport([FromQuery] ReportSearchDto searchDto)
    {
        var result = await _inpatientService.GetMedicineSupplyUsageReportAsync(searchDto);
        return Ok(result);
    }

    #endregion
}
