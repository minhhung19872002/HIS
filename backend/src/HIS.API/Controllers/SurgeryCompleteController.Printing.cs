using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.SurgeryComplete;

namespace HIS.API.Controllers;

public partial class SurgeryCompleteController
{
    /// <summary>
    /// In phiếu chứng nhận PTTT
    /// </summary>
    [HttpGet("{id}/print/certificate")]
    public async Task<IActionResult> PrintSurgeryCertificate(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryCertificateAsync(id);
        return File(result, "application/pdf", "chungnhan_pttt.pdf");
    }

    /// <summary>
    /// In giải trình/tường trình PT
    /// </summary>
    [HttpGet("{id}/print/report")]
    public async Task<IActionResult> PrintSurgeryReport(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryReportAsync(id);
        return File(result, "application/pdf", "tuongtrinh_pt.pdf");
    }

    /// <summary>
    /// In bảng kiểm an toàn
    /// </summary>
    [HttpGet("{id}/print/safety-checklist")]
    public async Task<IActionResult> PrintSafetyChecklist(Guid id)
    {
        var result = await _surgeryService.PrintSafetyChecklistAsync(id);
        return File(result, "application/pdf", "bangkiem_antoan.pdf");
    }

    /// <summary>
    /// In phiếu PTTT
    /// </summary>
    [HttpGet("{id}/print/form")]
    public async Task<IActionResult> PrintSurgeryForm(Guid id)
    {
        var result = await _surgeryService.PrintSurgeryFormAsync(id);
        return File(result, "application/pdf", "phieu_pttt.pdf");
    }

    /// <summary>
    /// In phiếu GMHS
    /// </summary>
    [HttpGet("{id}/print/anesthesia")]
    public async Task<IActionResult> PrintAnesthesiaForm(Guid id)
    {
        var result = await _surgeryService.PrintAnesthesiaFormAsync(id);
        return File(result, "application/pdf", "phieu_gmhs.pdf");
    }

    /// <summary>
    /// In phiếu theo dõi sau PT
    /// </summary>
    [HttpGet("{id}/print/post-op-care")]
    public async Task<IActionResult> PrintPostOpCareForm(Guid id)
    {
        var result = await _surgeryService.PrintPostOpCareFormAsync(id);
        return File(result, "application/pdf", "theodoi_saupt.pdf");
    }

    /// <summary>
    /// In phiếu thuốc/VT
    /// </summary>
    [HttpGet("{id}/print/medicine-disclosure")]
    public async Task<IActionResult> PrintMedicineDisclosure(Guid id)
    {
        var result = await _surgeryService.PrintMedicineDisclosureAsync(id);
        return File(result, "application/pdf", "congkhai_thuoc.pdf");
    }

    /// <summary>
    /// Xuất XML 4210 bảng 5
    /// </summary>
    [HttpGet("{id}/export/xml-4210")]
    public async Task<IActionResult> ExportXml4210(Guid id)
    {
        var result = await _surgeryService.ExportXml4210Async(id);
        return File(result, "application/xml", "xml4210_pttt.xml");
    }
}
