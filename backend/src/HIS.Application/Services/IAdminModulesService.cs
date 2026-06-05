using HIS.Application.DTOs;

namespace HIS.Application.Services;

/// <summary>
/// Service cho 3 admin modules MVP: G-41 Payroll, G-42 HR Decisions, G-44 Official Documents.
/// G-43 VPP/TTB dùng trực tiếp WarehouseComplete endpoints — không cần service mới.
/// </summary>
public interface IAdminModulesService
{
    // ── G-41: Payroll ──────────────────────────────────────────────────────

    Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(int? year = null);
    Task<PayrollPeriodDto?> GetPayrollPeriodAsync(Guid id);
    Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto, Guid createdBy);
    Task<List<PayrollItemDto>> GetPayrollItemsAsync(Guid periodId);
    Task<PayrollItemDto> SavePayrollItemAsync(SavePayrollItemDto dto);
    Task DeletePayrollItemAsync(Guid id);
    Task<PayrollPeriodDto> ApprovePayrollPeriodAsync(Guid id, string approvedBy);
    Task<List<PayrollItemDto>> GeneratePayrollItemsAsync(Guid periodId, Guid createdBy);

    // ── G-42: HR Decisions ─────────────────────────────────────────────────

    Task<List<HrDecisionDto>> GetHrDecisionsAsync(int? decisionType = null, int? status = null, string? staffId = null);
    Task<HrDecisionDto?> GetHrDecisionAsync(Guid id);
    Task<HrDecisionDto> SaveHrDecisionAsync(SaveHrDecisionDto dto, Guid userId);
    Task DeleteHrDecisionAsync(Guid id);

    // ── G-44: Official Documents ───────────────────────────────────────────

    Task<List<OfficialDocumentDto>> GetOfficialDocumentsAsync(int? documentType = null, int? status = null, string? keyword = null);
    Task<OfficialDocumentDto?> GetOfficialDocumentAsync(Guid id);
    Task<OfficialDocumentDto> SaveOfficialDocumentAsync(SaveOfficialDocumentDto dto, Guid userId);
    Task DeleteOfficialDocumentAsync(Guid id);
    Task<int> GetOverdueCountAsync();
}
