using HIS.Application.DTOs.Procurement;

namespace HIS.Application.Interfaces;

/// <summary>
/// Workflow de xuat - du tru - to trinh - duyet mua sam tai san / vat tu (#108)
/// Entity: AssetProcurementRequest (khac ProcurementRequest cua warehouse module)
/// </summary>
public interface IAssetProcurementService
{
    // ── CRUD ─────────────────────────────────────────────────────────────────
    Task<AssetProcurementPagedResult> GetListAsync(AssetProcurementSearchDto filter);
    Task<AssetProcurementRequestDto?> GetByIdAsync(Guid id);
    Task<AssetProcurementRequestDto> SaveAsync(SaveAssetProcurementRequestDto dto, string? userId);
    Task<bool> DeleteAsync(Guid id);

    // ── Workflow actions ──────────────────────────────────────────────────────

    /// <summary>Trình duyệt: Status 0 (DuThao) → 1 (ChoXetDuyet)</summary>
    Task<AssetProcurementRequestDto> SubmitAsync(Guid id, string? userId);

    /// <summary>Duyệt: Status 1 → 2 (DaDuyet). Ghi ApproverId + ApprovedAt.</summary>
    Task<AssetProcurementRequestDto> ApproveAsync(ApproveRejectAssetProcurementDto dto, string? userId);

    /// <summary>Từ chối: Status 1 → 3 (TuChoi). Ghi Note lý do.</summary>
    Task<AssetProcurementRequestDto> RejectAsync(ApproveRejectAssetProcurementDto dto, string? userId);

    /// <summary>Hoàn tất: Status 2 → 4 (HoanTat).</summary>
    Task<AssetProcurementRequestDto> CompleteAsync(Guid id, string? userId);
}
