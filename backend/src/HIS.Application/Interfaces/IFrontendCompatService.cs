using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Aliases cho các endpoint frontend gọi nhưng chưa có hoặc phân tán.
/// Logic tách khỏi FrontendCompatController (#202 thin-controller).
/// [AllowAnonymous] — không cần userId.
/// </summary>
public interface IFrontendCompatService
{
    // ---- Hospital Pharmacy ----
    Task<ServiceOutcome> HPDashboardAsync();
    Task<ServiceOutcome> HPStockAsync(int pageSize);
    Task<ServiceOutcome> HPRevenueAsync();

    // ---- Insurance XML ----
    Task<ServiceOutcome> InsuranceXmlClaimsAsync(int pageSize);

    // ---- Occupational Health ----
    Task<ServiceOutcome> OHExamsAsync(int pageSize);
    /// <summary>Dữ liệu tĩnh — đồng bộ, không cần DB.</summary>
    ServiceOutcome OHHazardTypes();

    // ---- School Health ----
    Task<ServiceOutcome> SHSchoolsAsync();
    Task<ServiceOutcome> SHExamsAsync(int pageSize);

    // ---- Epidemiology ----
    Task<ServiceOutcome> EpiReportsAsync(int pageSize);
    Task<ServiceOutcome> EpiStatisticsAsync();
    /// <summary>Dữ liệu tĩnh — đồng bộ, không cần DB.</summary>
    ServiceOutcome EpiNotifiable();
}
