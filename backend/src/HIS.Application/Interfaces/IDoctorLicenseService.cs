using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic kiểm tra CCHN (Chứng chỉ hành nghề) — tách khỏi DoctorLicenseController (#202 thin-controller).
/// roles + userId truyền từ controller (thay cho GetUserId() + User.FindAll(ClaimTypes.Role) cũ đọc claim).
/// </summary>
public interface IDoctorLicenseService
{
    Task<ServiceOutcome> GetMyLicenseStatusAsync(List<string> roles, Guid userId);

    /// <summary>
    /// Licence gate for creating/issuing prescriptions and service orders: blocks only when the user's licence
    /// IS expired/suspended/revoked (HR profile or PracticeLicenses registry); missing data → Warning.
    /// </summary>
    Task<DTOs.DoctorLicense.PracticeLicenseGateDto> EvaluatePrescribingGateAsync(Guid userId);
}
