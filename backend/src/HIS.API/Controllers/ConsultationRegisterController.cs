using HIS.API.Extensions;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sổ hội chẩn + trích biên bản — N1.20.
/// </summary>
[ApiController]
[Route("api/consultation-register")]
[Authorize]
public class ConsultationRegisterController : ControllerBase
{
    private readonly IConsultationRegisterService _svc;
    public ConsultationRegisterController(IConsultationRegisterService svc) { _svc = svc; }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int? consultationType, [FromQuery] string? keyword, [FromQuery] Guid? departmentId)
        => (await _svc.SearchAsync(fromDate, toDate, consultationType, keyword, departmentId)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => (await _svc.GetByIdAsync(id)).ToActionResult();
}
