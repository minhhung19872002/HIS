using HIS.Application.DTOs.Integration;

namespace HIS.Application.Services;

/// <summary>Dữ liệu kho cho cổng BlueContract (controller /api/integration/bluecontract + bộ đẩy phiếu).</summary>
public interface IBlueContractIntegrationService
{
    /// <summary>XNT của kho <paramref name="warehouseCode"/>; <paramref name="hisKeys"/> rỗng = mọi mặt hàng.</summary>
    Task<List<BlueContractStockMovementDto>> GetStockMovementsAsync(string warehouseCode, DateTime fromDate, DateTime toDate, IReadOnlyCollection<string> hisKeys);

    /// <summary>Phiếu nhập NCC được DUYỆT trong khoảng ngày (theo ngày duyệt, để phiếu duyệt muộn vẫn được kéo về).</summary>
    Task<List<BlueContractReceiptPayload>> GetApprovedReceiptsAsync(DateTime fromDate, DateTime toDate);

    /// <summary>Payload của một phiếu NCC đã duyệt; null nếu phiếu không phải NCC / chưa duyệt / NCC thiếu MST.</summary>
    Task<BlueContractReceiptPayload?> BuildReceiptPayloadAsync(Guid receiptId);
}

/// <summary>Hàng đợi đẩy phiếu sang BlueContract ngay khi duyệt (best-effort; cổng còn tự kéo định kỳ).</summary>
public interface IBlueContractReceiptPushQueue
{
    void Enqueue(Guid receiptId);
}
