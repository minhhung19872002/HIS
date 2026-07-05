using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.ReceiptBook;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Sổ biên lai khai báo — N1.13.
/// </summary>
[ApiController]
[Route("api/receipt-book")]
[Authorize]
public class ReceiptBookController : ControllerBase
{
    private readonly IReceiptBookService _svc;
    public ReceiptBookController(IReceiptBookService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? keyword,
        [FromQuery] int? receiptType,
        [FromQuery] int? status,
        [FromQuery] int? fiscalYear)
        => (await _svc.SearchAsync(keyword, receiptType, status, fiscalYear)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => (await _svc.GetByIdAsync(id)).ToActionResult();

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> Save([FromBody] ReceiptBook dto)
        => (await _svc.SaveAsync(dto, GetUserId())).ToActionResult();

    [HttpPost("{id:guid}/close")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> Close(Guid id, [FromBody] CloseDto dto)
        => (await _svc.CloseAsync(id, dto, GetUserId())).ToActionResult();

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<IActionResult> Activate(Guid id)
        => (await _svc.ActivateAsync(id, GetUserId())).ToActionResult();

    [HttpPost("{id:guid}/next-number")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant + "," + RoleNames.Cashier)]
    public async Task<IActionResult> NextNumber(Guid id)
        => (await _svc.NextNumberAsync(id, GetUserId())).ToActionResult();

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> Delete(Guid id)
        => (await _svc.DeleteAsync(id)).ToActionResult();
}
