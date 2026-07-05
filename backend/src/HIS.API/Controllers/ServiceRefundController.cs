using System.Security.Claims;
using HIS.API.Extensions;
using HIS.Application.DTOs.ServiceRefund;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

/// <summary>
/// Cho lại chỉ định CLS sau hoàn hóa đơn — N1.09.
/// Sau khi hoàn tiền một hoặc nhiều dịch vụ CLS, cho phép "cho lại" chỉ định
/// để BN có thể thực hiện lại mà không cần làm đơn mới.
/// </summary>
[ApiController]
[Route("api/service-refund")]
[Authorize]
public class ServiceRefundController : ControllerBase
{
    private readonly IServiceRefundService _svc;
    public ServiceRefundController(IServiceRefundService svc) { _svc = svc; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Lấy danh sách DV CLS đã hủy/hoàn của 1 hồ sơ để chọn "cho lại".</summary>
    [HttpGet("cancelled-services/{medicalRecordId:guid}")]
    public async Task<IActionResult> CancelledServices(Guid medicalRecordId)
        => (await _svc.CancelledServicesAsync(medicalRecordId)).ToActionResult();

    /// <summary>Cho lại các chỉ định — chuyển status về Chờ, log lý do.</summary>
    [HttpPost("requeue")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Cashier + "," + RoleNames.Accountant)]
    public async Task<IActionResult> Requeue([FromBody] RequeueDto dto)
        => (await _svc.RequeueAsync(dto, GetUserId())).ToActionResult();
}
