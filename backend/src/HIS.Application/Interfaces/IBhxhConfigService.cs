using HIS.Application.Common;
using HIS.Application.DTOs.BhxhConfig;

namespace HIS.Application.Interfaces;

/// <summary>
/// Cấu hình BHXH Gateway + Test tools (N1.19) — tách khỏi BhxhConfigController (#202 thin-controller).
/// Persist trong SystemConfig với prefix "BHXH.". Trả ServiceOutcome để controller map về IActionResult
/// giữ nguyên status code + body (behavior-preserving).
/// </summary>
public interface IBhxhConfigService
{
    Task<ServiceOutcome> GetAsync();
    Task<ServiceOutcome> SaveAsync(BhxhConfigDto dto, Guid userId);
    Task<ServiceOutcome> TestConnectionAsync();
    Task<ServiceOutcome> TestAuthAsync();
    Task<ServiceOutcome> TestSubmitXmlAsync(TestSubmitXmlDto dto);
}
