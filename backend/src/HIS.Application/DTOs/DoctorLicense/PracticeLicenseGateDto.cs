namespace HIS.Application.DTOs.DoctorLicense;

/// <summary>
/// Result of the prescribing/ordering licence gate for the current user.
/// Level: Ok | Warning (allowed, show banner) | Blocked (create/issue prescriptions and service orders refused).
/// </summary>
public record PracticeLicenseGateDto(
    string Level,
    bool Blocked,
    string Status, // Valid | ExpiringSoon | Mismatch | NoData | Expired | Suspended | Revoked
    string Message,
    string? LicenseNumber,
    DateTime? ExpiryDate);
