using HIS.Application.DTOs.AdministrativeUnit;

namespace HIS.Application.Interfaces;

public interface IAdministrativeUnitService
{
    // Province
    Task<List<ProvinceDto>> GetProvincesAsync(string? keyword);
    Task<ProvinceDto> SaveProvinceAsync(ProvinceDto dto, string? userId);
    Task<bool> DeleteProvinceAsync(Guid id);

    // District
    Task<List<DistrictDto>> GetDistrictsAsync(Guid? provinceId, string? keyword);
    Task<DistrictDto> SaveDistrictAsync(DistrictDto dto, string? userId);
    Task<bool> DeleteDistrictAsync(Guid id);

    // Ward
    Task<List<WardDto>> GetWardsAsync(Guid? districtId, string? keyword);
    Task<WardDto> SaveWardAsync(WardDto dto, string? userId);
    Task<bool> DeleteWardAsync(Guid id);
}
