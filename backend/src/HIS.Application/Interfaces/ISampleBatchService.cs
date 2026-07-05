using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// M3.13 — Lịch sử lấy mẫu phân theo đợt (morning/afternoon/evening/emergency).
/// Tách khỏi SampleBatchController (#202 thin-controller). Trả ServiceOutcome để controller
/// map về IActionResult giữ nguyên status code + body (behavior-preserving).
/// </summary>
public interface ISampleBatchService
{
    Task<ServiceOutcome> GetBatchesAsync(DateTime? date);
}
