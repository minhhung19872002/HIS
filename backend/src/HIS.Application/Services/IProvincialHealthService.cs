using HIS.Application.DTOs.ProvincialHealth;

namespace HIS.Application.Services;

public interface IProvincialHealthService
{
    Task<ProvincialReportPagedResult> SearchReportsAsync(ProvincialReportSearchDto search);
    Task<ProvincialReportDto?> GetReportByIdAsync(Guid id);
    Task<ProvincialReportDto> GenerateReportAsync(int reportType, string period, string userId);
    Task<object> SubmitReportAsync(Guid id, string userId);
    Task<ProvincialStatsDto> GetStatsAsync();
    Task<object> TestConnectionAsync();
    Task<ProvincialConnectionDto> GetConnectionInfoAsync();
    Task<List<InfectiousDiseaseReportDto>> GetInfectiousDiseaseReportsAsync(string? dateFrom, string? dateTo);
    Task<object> SubmitInfectiousReportAsync(Guid id, string userId);
}
