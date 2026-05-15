using HIS.Application.DTOs.NangCap23;

namespace HIS.Application.Services;

// ============================================================================
// Batch 1: National Pharmacy/Prescription Gateways
// ============================================================================

/// <summary>
/// Cổng Đơn thuốc Quốc Gia (donthuocquocgia.vn) — QĐ 808/QĐ-BYT 2022, TT 04/2022/TT-BYT
/// </summary>
public interface INationalPrescriptionGatewayService
{
    Task<List<NationalPrescriptionSubmissionDto>> SearchAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<NationalPrescriptionSubmissionDetailDto?> GetByIdAsync(Guid id);
    Task<NationalPrescriptionSubmissionDto> SubmitAsync(SubmitNationalPrescriptionDto dto, string? userId);
    Task<NationalPrescriptionSubmissionDto?> RetryAsync(Guid id, string? userId);
    Task<NationalPrescriptionSubmissionDto?> CancelAsync(Guid id, string? userId);
    Task<NationalGatewayConfigDto> GetConfigAsync();
    Task<bool> SaveConfigAsync(NationalGatewayConfigDto config, string? userId);
    Task<bool> TestConnectionAsync();
}

/// <summary>
/// Cổng Dược Quốc Gia (duocquocgia.com.vn) — CV 2406/QLD-Ttra 2018 (báo cáo nhà thuốc)
/// </summary>
public interface INationalPharmacyGatewayService
{
    Task<List<NationalPharmacyOutboundReportDto>> SearchAsync(string? reportType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<NationalPharmacyOutboundReportDetailDto?> GetByIdAsync(Guid id);
    Task<NationalPharmacyOutboundReportDto> GenerateAndSubmitAsync(GeneratePharmacyReportDto dto, string? userId);
    Task<NationalPharmacyOutboundReportDto?> RetryAsync(Guid id, string? userId);
    Task<bool> TestConnectionAsync();
}

// ============================================================================
// Batch 2: Đề án 06 — Birth / Death / Driving License
// ============================================================================

public interface IDeAn06CertificateService
{
    // Birth certificates
    Task<List<BirthCertificateDto>> SearchBirthCertificatesAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<BirthCertificateDto?> GetBirthCertificateAsync(Guid id);
    Task<BirthCertificateDto> SaveBirthCertificateAsync(SaveBirthCertificateDto dto, string? userId);
    Task<BirthCertificateDto?> SubmitBirthCertificateToDa06Async(Guid id, string? userId);

    // Death certificates
    Task<List<DeathCertificateDto>> SearchDeathCertificatesAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<DeathCertificateDto?> GetDeathCertificateAsync(Guid id);
    Task<DeathCertificateDto> SaveDeathCertificateAsync(SaveDeathCertificateDto dto, string? userId);
    Task<DeathCertificateDto?> SubmitDeathCertificateToDa06Async(Guid id, string? userId);

    // Driving license health checks
    Task<List<DrivingLicenseHealthCheckDto>> SearchDrivingLicenseChecksAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<DrivingLicenseHealthCheckDto?> GetDrivingLicenseCheckAsync(Guid id);
    Task<DrivingLicenseHealthCheckDto> SaveDrivingLicenseCheckAsync(SaveDrivingLicenseHealthCheckDto dto, string? userId);
    Task<DrivingLicenseHealthCheckDto?> SubmitDrivingLicenseCheckToDa06Async(Guid id, string? userId);
}

// ============================================================================
// Batch 3: Linen + Sterilization + Functional Diagnostics
// ============================================================================

public interface ILinenManagementService
{
    Task<List<LinenItemDto>> ListLinenItemsAsync(string? keyword, string? category, bool? isActive);
    Task<LinenItemDto?> GetLinenItemAsync(Guid id);
    Task<LinenItemDto> SaveLinenItemAsync(LinenItemDto dto, string? userId);
    Task<bool> DeleteLinenItemAsync(Guid id, string? userId);

    Task<List<LinenTransactionDto>> SearchTransactionsAsync(string? transactionType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<LinenTransactionDto?> GetTransactionAsync(Guid id);
    Task<LinenTransactionDto> SaveTransactionAsync(SaveLinenTransactionDto dto, string? userId);
    Task<LinenTransactionDto?> UpdateTransactionStatusAsync(Guid id, int newStatus, string? userId);

    Task<List<SterilizationScheduleDto>> SearchSchedulesAsync(string? areaType, int? status, DateTime? from, DateTime? to);
    Task<SterilizationScheduleDto?> GetScheduleAsync(Guid id);
    Task<SterilizationScheduleDto> SaveScheduleAsync(SaveSterilizationScheduleDto dto, string? userId);
    Task<SterilizationScheduleDto?> UpdateScheduleStatusAsync(Guid id, int newStatus, string? cultureResult, string? userId);
}

public interface IFunctionalDiagnosticsService
{
    Task<List<FunctionalDiagnosticTestDto>> SearchAsync(string? keyword, string? testType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<FunctionalDiagnosticTestDto?> GetByIdAsync(Guid id);
    Task<FunctionalDiagnosticTestDto> SaveAsync(SaveFunctionalDiagnosticTestDto dto, string? userId);
    Task<FunctionalDiagnosticTestDto?> CompleteAsync(Guid id, string? userId);
    Task<FunctionalDiagnosticTestDto?> VerifyAsync(Guid id, string? userId);
    Task<bool> DeleteAsync(Guid id, string? userId);
}

// ============================================================================
// Batch 4: Zalo + Quality Dashboard
// ============================================================================

public interface IZaloNotificationService
{
    Task<List<ZaloNotificationLogDto>> SearchLogsAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50);
    Task<ZaloNotificationLogDto?> GetLogAsync(Guid id);
    Task<ZaloNotificationLogDto> SendAsync(SendZaloMessageDto dto, string? userId);
    Task<ZaloConfigDto> GetConfigAsync();
    Task<bool> SaveConfigAsync(ZaloConfigDto config, string? userId);
    Task<bool> TestConnectionAsync();
}

public interface IQualityDashboardService
{
    Task<QualityDashboardDto> GetFullDashboardAsync(DateTime? asOfDate = null);
    Task<List<ClinicQueueViewDto>> GetClinicQueuesAsync(DateTime? asOfDate = null);
    Task<List<InpatientDepartmentViewDto>> GetInpatientByDepartmentAsync(DateTime? asOfDate = null);
    Task<ParaclinicalStatusViewDto> GetParaclinicalStatusAsync(DateTime? asOfDate = null);
    Task<LabStatusViewDto> GetLabStatusAsync(DateTime? asOfDate = null);
    Task<DailyRevenueViewDto> GetDailyRevenueAsync(DateTime? asOfDate = null);
}
