using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IPracticeLicenseService
{
    Task<List<PracticeLicenseDto>> SearchLicensesAsync(PracticeLicenseSearchDto? filter = null);
    Task<PracticeLicenseDetailDto?> GetByIdAsync(Guid id);
    Task<PracticeLicenseDto> CreateLicenseAsync(CreatePracticeLicenseDto dto);
    Task<PracticeLicenseDto> UpdateLicenseAsync(Guid id, CreatePracticeLicenseDto dto);
    Task<List<PracticeLicenseDto>> GetExpiringLicensesAsync(int withinDays = 90);
    Task<PracticeLicenseStatsDto> GetStatsAsync();
    Task<PracticeLicenseDto> RenewLicenseAsync(Guid id, string? newExpiryDate);
}
