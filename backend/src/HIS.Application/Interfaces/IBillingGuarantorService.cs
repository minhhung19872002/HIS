using HIS.Application.DTOs.Billing;

namespace HIS.Application.Interfaces;

public interface IBillingGuarantorService
{
    // ─── SponsorOrg ──────────────────────────────────────────────────────────

    Task<List<SponsorOrgDto>> GetSponsorOrgsAsync(string? keyword);
    Task<SponsorOrgDto> SaveSponsorOrgAsync(SponsorOrgDto dto, string? userId);
    Task<bool> DeleteSponsorOrgAsync(Guid id);

    // ─── BillingGuarantor ────────────────────────────────────────────────────

    /// <summary>Lấy danh sách bảo lãnh theo bệnh nhân / hồ sơ / từ khóa.</summary>
    Task<List<BillingGuarantorDto>> GetGuarantorsAsync(Guid? patientId, Guid? medicalRecordId, string? keyword);
    Task<BillingGuarantorDto> SaveGuarantorAsync(BillingGuarantorDto dto, string? userId);
    Task<bool> DeleteGuarantorAsync(Guid id);

    // ─── Reports ─────────────────────────────────────────────────────────────

    /// <summary>Báo cáo công nợ nhóm theo đơn vị bảo lãnh trong khoảng [from, to].</summary>
    Task<List<GuarantorDebtReportDto>> GetDebtByOrgAsync(DateTime? from, DateTime? to);
}
