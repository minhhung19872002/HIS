using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Đánh giá kết quả XN so với khoảng tham chiếu (N1.18) — tách khỏi
/// LabResultEvaluationController (#202 thin-controller).
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface ILabResultEvaluationService
{
    /// <summary>Re-evaluate tất cả chỉ số con (ServiceRequestDetailParameter) của 1 SRD — #14e: model 1.</summary>
    Task<ServiceOutcome> EvaluateRequestItemAsync(Guid requestItemId);

    /// <summary>Re-evaluate 1 chỉ số con cụ thể — #14e: model 1.</summary>
    Task<ServiceOutcome> EvaluateRowAsync(Guid labResultId);

    /// <summary>Evaluate 1 giá trị cụ thể — dùng cho preview trước khi lưu.</summary>
    Task<ServiceOutcome> PreviewAsync(decimal value, decimal? min, decimal? max);
}
