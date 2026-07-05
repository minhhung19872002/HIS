using HIS.Application.DTOs.Examination;
using HIS.Core.Constants;
using HIS.Application.Services;
using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Kiểm tra dược lâm sàng — N1.04.
/// Page review đầy đủ thuốc + CLS + dị ứng + tương tác BN trước cấp phát.
/// </summary>
[ApiController]
[Route("api/clinical-pharmacy")]
[Authorize]
public class ClinicalPharmacyController : ControllerBase
{
    private readonly IClinicalPharmacyService _svc;
    private readonly IExaminationCompleteService _examinationService;

    public ClinicalPharmacyController(IClinicalPharmacyService svc, IExaminationCompleteService examinationService)
    {
        _svc = svc;
        _examinationService = examinationService;
    }

    [HttpGet("patient-summary/{patientId:guid}")]
    public async Task<IActionResult> PatientSummary(Guid patientId)
        => (await _svc.PatientSummaryAsync(patientId)).ToActionResult();

    /// <summary>
    /// Import danh sach cap tuong tac thuoc tu file CSV.
    /// CSV format (header bat buoc): ActiveIngredient1,ActiveIngredient2,Severity,InteractionType,Description,Recommendation
    /// Severity: 1=Nhe 2=TrungBinh 3=Nang 4=ChongChiDinhTuyetDoi
    /// Upsert theo cap hoat chat (doi xung A-B == B-A).
    /// NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
    /// </summary>
    [HttpPost("drug-interactions/import-csv")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<DrugInteractionImportResultDto>> ImportDrugInteractionsCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chua chon file CSV" });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chi ho tro file CSV. Excel can them thu vien ClosedXML/EPPlus." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var result = await _examinationService.ImportDrugInteractionsAsync(ms.ToArray());
        return Ok(result);
    }
}
