using HIS.Application.Common;
using HIS.Application.DTOs.ReceiptBook;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// Sổ biên lai khai báo — N1.13.
/// Logic tách khỏi ReceiptBookController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/NextNumber transaction giữ nguyên.
/// </summary>
public interface IReceiptBookService
{
    Task<ServiceOutcome> SearchAsync(string? keyword, int? receiptType, int? status, int? fiscalYear);
    Task<ServiceOutcome> GetByIdAsync(Guid id);
    /// <summary>ReceiptBook là Core entity — Application có thể reference Core.</summary>
    Task<ServiceOutcome> SaveAsync(ReceiptBook dto, Guid userId);
    Task<ServiceOutcome> CloseAsync(Guid id, CloseDto dto, Guid userId);
    Task<ServiceOutcome> ActivateAsync(Guid id, Guid userId);
    /// <summary>Dùng UPDLOCK/ROWLOCK transaction để tránh race condition số biên lai.</summary>
    Task<ServiceOutcome> NextNumberAsync(Guid id, Guid userId);
    Task<ServiceOutcome> DeleteAsync(Guid id);
}
