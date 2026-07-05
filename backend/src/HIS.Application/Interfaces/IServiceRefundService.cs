using HIS.Application.Common;
using HIS.Application.DTOs.ServiceRefund;

namespace HIS.Application.Interfaces;

/// <summary>
/// Cho lại chỉ định CLS sau hoàn hóa đơn — N1.09 — tách khỏi ServiceRefundController (#202 thin-controller).
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IServiceRefundService
{
    Task<ServiceOutcome> CancelledServicesAsync(Guid medicalRecordId);
    Task<ServiceOutcome> RequeueAsync(RequeueDto dto, Guid userId);
}
