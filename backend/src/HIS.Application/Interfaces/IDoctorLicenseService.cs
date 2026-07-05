using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic kiểm tra CCHN (Chứng chỉ hành nghề) — tách khỏi DoctorLicenseController (#202 thin-controller).
/// roles + userId truyền từ controller (thay cho GetUserId() + User.FindAll(ClaimTypes.Role) cũ đọc claim).
/// </summary>
public interface IDoctorLicenseService
{
    Task<ServiceOutcome> GetMyLicenseStatusAsync(List<string> roles, Guid userId);
}
