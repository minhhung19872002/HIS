using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IHospitalPharmacyService
{
    Task<List<RetailSaleListDto>> SearchSalesAsync(RetailSaleSearchDto filter);
    Task<RetailSaleDetailDto?> GetSaleByIdAsync(Guid id);
    Task<RetailSaleDetailDto> CreateSaleAsync(CreateRetailSaleDto dto);
    Task<bool> CancelSaleAsync(Guid id, string reason);
    Task<RetailSaleStatsDto> GetSalesStatisticsAsync();
    Task<List<MedicineForSaleDto>> SearchMedicineForSaleAsync(string? keyword);
}
