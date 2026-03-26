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

    // NangCap17 Module C: Enhanced Pharmacy
    // Customers
    Task<List<PharmacyCustomerListDto>> GetCustomersAsync(PharmacyCustomerSearchDto filter);
    Task<PharmacyCustomerDetailDto?> GetCustomerByIdAsync(Guid id);
    Task<PharmacyCustomerDetailDto> SaveCustomerAsync(SavePharmacyCustomerDto dto);
    Task<PharmacyPointTransactionDto> AddPointsAsync(AddPointsDto dto);
    Task<PharmacyPointTransactionDto> RedeemPointsAsync(RedeemPointsDto dto);

    // Shifts
    Task<List<PharmacyShiftListDto>> GetShiftsAsync(PharmacyShiftSearchDto filter);
    Task<PharmacyShiftListDto> OpenShiftAsync(OpenShiftDto dto);
    Task<PharmacyShiftListDto> CloseShiftAsync(CloseShiftDto dto);
    Task<PharmacyShiftListDto?> GetCurrentShiftAsync();

    // GPP Records
    Task<List<PharmacyGppRecordListDto>> GetGppRecordsAsync(PharmacyGppRecordSearchDto filter);
    Task<PharmacyGppRecordListDto> SaveGppRecordAsync(SavePharmacyGppRecordDto dto);

    // Commissions
    Task<List<PharmacyCommissionListDto>> GetCommissionsAsync(PharmacyCommissionSearchDto filter);
    Task<PharmacyCommissionListDto> SaveCommissionAsync(SavePharmacyCommissionDto dto);
    Task<bool> PayCommissionsAsync(PayCommissionDto dto);

    // Enhanced Dashboard
    Task<PharmacyEnhancedDashboardDto> GetEnhancedDashboardAsync();
}
