using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.API.Dtos.InsuranceXml;

namespace HIS.API.Controllers;

public partial class InsuranceXmlController
{
    // 12.7 Báo cáo BHYT

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

    // -----------------------------------------------------------------------
    // Mẫu 16/BHYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 16/BHYT - Danh sách chế phẩm YHCT được BHYT thanh toán
    /// </summary>
    [HttpGet("reports/bhyt-16")]
    public async Task<ActionResult<Report16BhytDto>> GetReport16Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport16BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 16/BHYT ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-16/export")]
    public async Task<ActionResult> ExportReport16BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport16BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau16_BHYT_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // Mẫu 17/BHYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 17/BHYT - Danh sách vị thuốc YHCT được BHYT thanh toán
    /// </summary>
    [HttpGet("reports/bhyt-17")]
    public async Task<ActionResult<Report17BhytDto>> GetReport17Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport17BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 17/BHYT ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-17/export")]
    public async Task<ActionResult> ExportReport17BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport17BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau17_BHYT_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // Mẫu 19/BHYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 19/BHYT - Thống kê tổng hợp VTYT được BHYT thanh toán
    /// </summary>
    [HttpGet("reports/bhyt-19")]
    public async Task<ActionResult<Report19BhytDto>> GetReport19Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport19BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 19/BHYT ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-19/export")]
    public async Task<ActionResult> ExportReport19BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport19BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau19_BHYT_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // Mẫu 20/BHYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 20/BHYT - Thống kê tổng hợp thuốc sử dụng cho bệnh nhân BHYT
    /// </summary>
    [HttpGet("reports/bhyt-20")]
    public async Task<ActionResult<Report20BhytDto>> GetReport20Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport20BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 20/BHYT ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-20/export")]
    public async Task<ActionResult> ExportReport20BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport20BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau20_BHYT_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // Mẫu 21/BHYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 21/BHYT - Thống kê tổng hợp DVKT sử dụng cho bệnh nhân BHYT
    /// </summary>
    [HttpGet("reports/bhyt-21")]
    public async Task<ActionResult<Report21BhytDto>> GetReport21Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport21BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 21/BHYT ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-21/export")]
    public async Task<ActionResult> ExportReport21BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport21BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau21_BHYT_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // Mẫu 21/BHYT theo CV 285/BHXH-CSYT
    // -----------------------------------------------------------------------

    /// <summary>
    /// Mẫu 21/BHYT theo CV 285/BHXH-CSYT - DVKT kèm nhóm dịch vụ
    /// </summary>
    [HttpGet("reports/bhyt-285")]
    public async Task<ActionResult<Report285BhytDto>> GetReport285Bhyt(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReport285BhytAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất mẫu 285/BHXH ra Excel
    /// </summary>
    [HttpGet("reports/bhyt-285/export")]
    public async Task<ActionResult> ExportReport285BhytToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReport285BhytToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Mau285_BHXH_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // C79B-HD
    // -----------------------------------------------------------------------

    /// <summary>
    /// Báo cáo C79B-HD - Tổng hợp chi phí KCB BHYT ngoại trú (bản B)
    /// </summary>
    [HttpGet("reports/c79b")]
    public async Task<ActionResult<ReportC79bDto>> GetReportC79b(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReportC79bAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất C79B-HD ra Excel
    /// </summary>
    [HttpGet("reports/c79b/export")]
    public async Task<ActionResult> ExportReportC79bToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReportC79bToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"C79B_{month:D2}_{year}.xlsx");
    }

    // -----------------------------------------------------------------------
    // C80B-HD
    // -----------------------------------------------------------------------

    /// <summary>
    /// Báo cáo C80B-HD - Tổng hợp chi phí KCB BHYT nội trú (bản B)
    /// </summary>
    [HttpGet("reports/c80b")]
    public async Task<ActionResult<ReportC80bDto>> GetReportC80b(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.GetReportC80bAsync(month, year);
        return Ok(result);
    }

    /// <summary>
    /// Xuất C80B-HD ra Excel
    /// </summary>
    [HttpGet("reports/c80b/export")]
    public async Task<ActionResult> ExportReportC80bToExcel(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _insuranceService.ExportReportC80bToExcelAsync(month, year);
        return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"C80B_{month:D2}_{year}.xlsx");
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
}
