using HIS.Application.DTOs.Asset;

namespace HIS.Application.Services;

public interface IAssetManagementService
{
    // Tenders
    Task<AssetPagedResult<TenderDto>> GetTendersAsync(TenderSearchDto filter);
    Task<TenderDto> SaveTenderAsync(SaveTenderDto dto, string userId);
    Task<TenderDto?> GetTenderByIdAsync(Guid id);
    Task<List<TenderItemDto>> GetTenderItemsAsync(Guid tenderId);
    Task<TenderItemDto> SaveTenderItemAsync(SaveTenderItemDto dto, string userId);
    Task<TenderDto> AwardTenderAsync(AwardTenderDto dto, string userId);

    // Fixed Assets
    Task<AssetPagedResult<FixedAssetDto>> GetAssetsAsync(AssetSearchDto filter);
    Task<FixedAssetDto> SaveAssetAsync(SaveFixedAssetDto dto, string userId);
    Task<FixedAssetDto?> GetAssetByIdAsync(Guid id);
    Task<string> GenerateQrCodeAsync(Guid assetId);
    Task<List<AssetHistoryDto>> GetAssetHistoryAsync(Guid assetId);

    // Handover
    Task<AssetPagedResult<AssetHandoverDto>> GetHandoversAsync(AssetHandoverSearchDto filter);
    Task<AssetHandoverDto> SaveHandoverAsync(SaveHandoverDto dto, string userId);
    Task<AssetHandoverDto> ConfirmHandoverAsync(Guid handoverId, string userId);

    // Disposal
    Task<AssetPagedResult<AssetDisposalDto>> GetDisposalsAsync(DisposalSearchDto filter);
    Task<AssetDisposalDto> ProposeDisposalAsync(ProposeDisposalDto dto, string userId);
    Task<AssetDisposalDto> ApproveDisposalAsync(Guid disposalId, string userId);
    Task<AssetDisposalDto> CompleteDisposalAsync(Guid disposalId, string userId);

    // Depreciation
    Task<int> CalculateMonthlyDepreciationAsync(int month, int year, string userId);
    Task<AssetPagedResult<DepreciationReportDto>> GetDepreciationReportAsync(DepreciationFilterDto filter);

    // Dashboard
    Task<AssetDashboardDto> GetAssetDashboardAsync();
}
