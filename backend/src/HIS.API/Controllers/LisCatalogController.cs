using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// LIS admin — 6 danh mục CRUD (N1.10).
/// LabBook / LabBookGroup / LabMeasurementUnit / LabOrganism / LabAntibiotic / LabChemical.
/// </summary>
[ApiController]
[Route("api/lis-catalog")]
[Authorize]
public class LisCatalogController : ControllerBase
{
    private readonly ILisCatalogService _svc;
    public LisCatalogController(ILisCatalogService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // =====================
    // 1. LabBook (Sổ XN)
    // =====================

    [HttpGet("books")]
    public async Task<IActionResult> GetBooks([FromQuery] string? keyword, [FromQuery] bool? isActive)
        => (await _svc.GetBooksAsync(keyword, isActive)).ToActionResult();

    [HttpPost("books")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveBook([FromBody] LabBook dto)
        => (await _svc.SaveBookAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("books/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteBook(Guid id)
        => (await _svc.DeleteBookAsync(id)).ToActionResult();

    // =====================
    // 2. LabBookGroup (Nhóm XN / Loại XN)
    // =====================

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups([FromQuery] Guid? labBookId, [FromQuery] string? keyword)
        => (await _svc.GetGroupsAsync(labBookId, keyword)).ToActionResult();

    [HttpPost("groups")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveGroup([FromBody] LabBookGroup dto)
        => (await _svc.SaveGroupAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("groups/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteGroup(Guid id)
        => (await _svc.DeleteGroupAsync(id)).ToActionResult();

    // =====================
    // 3. LabMeasurementUnit (Đơn vị đo)
    // =====================

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits([FromQuery] string? keyword, [FromQuery] bool? isActive)
        => (await _svc.GetUnitsAsync(keyword, isActive)).ToActionResult();

    [HttpPost("units")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveUnit([FromBody] LabMeasurementUnit dto)
        => (await _svc.SaveUnitAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("units/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteUnit(Guid id)
        => (await _svc.DeleteUnitAsync(id)).ToActionResult();

    // =====================
    // 4. LabOrganism (Vi khuẩn)
    // =====================

    [HttpGet("organisms")]
    public async Task<IActionResult> GetOrganisms([FromQuery] string? keyword, [FromQuery] string? category)
        => (await _svc.GetOrganismsAsync(keyword, category)).ToActionResult();

    [HttpPost("organisms")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveOrganism([FromBody] LabOrganism dto)
        => (await _svc.SaveOrganismAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("organisms/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteOrganism(Guid id)
        => (await _svc.DeleteOrganismAsync(id)).ToActionResult();

    // =====================
    // 5. LabAntibiotic (Kháng sinh)
    // =====================

    [HttpGet("antibiotics")]
    public async Task<IActionResult> GetAntibiotics([FromQuery] string? keyword, [FromQuery] string? drugClass)
        => (await _svc.GetAntibioticsAsync(keyword, drugClass)).ToActionResult();

    [HttpPost("antibiotics")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveAntibiotic([FromBody] LabAntibiotic dto)
        => (await _svc.SaveAntibioticAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("antibiotics/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteAntibiotic(Guid id)
        => (await _svc.DeleteAntibioticAsync(id)).ToActionResult();

    // =====================
    // 6. LabChemical (Hóa chất tiêu hao theo XN)
    // =====================

    [HttpGet("chemicals")]
    public async Task<IActionResult> GetChemicals([FromQuery] Guid? serviceId, [FromQuery] Guid? supplyId)
        => (await _svc.GetChemicalsAsync(serviceId, supplyId)).ToActionResult();

    [HttpPost("chemicals")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveChemical([FromBody] LabChemical dto)
        => (await _svc.SaveChemicalAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("chemicals/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteChemical(Guid id)
        => (await _svc.DeleteChemicalAsync(id)).ToActionResult();

    // =====================
    // 7. LisTestParameter (Chỉ số XN) — G-22 / G-23
    // =====================

    [HttpGet("tests")]
    public async Task<IActionResult> GetTests(
        [FromQuery] string? keyword,
        [FromQuery] Guid? groupId,
        [FromQuery] bool? isActive)
        => (await _svc.GetTestsAsync(keyword, groupId, isActive)).ToActionResult();

    [HttpPost("tests")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> SaveTest([FromBody] LisTestParameter dto)
        => (await _svc.SaveTestAsync(dto, GetUserId())).ToActionResult();

    [HttpDelete("tests/{id:guid}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.LabManager)]
    public async Task<IActionResult> DeleteTest(Guid id)
        => (await _svc.DeleteTestAsync(id)).ToActionResult();

    // =====================
    // 8. LabSampleType (Loại bệnh phẩm) — read-only catalog endpoint cho form tests
    // =====================

    [HttpGet("sample-types")]
    public async Task<IActionResult> GetSampleTypes([FromQuery] string? keyword, [FromQuery] bool? isActive)
        => (await _svc.GetSampleTypesAsync(keyword, isActive)).ToActionResult();
}
