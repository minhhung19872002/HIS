namespace HIS.Application.DTOs.DoctorLicense;

    public record LicenseStatusDto(
        bool HasProfile,
        bool IsValid,
        string Status, // Valid | NoLicense | Inactive | Expired | NoStaffProfile
        string? LicenseNumber,
        DateTime? IssueDate,
        DateTime? ExpiryDate,
        int? DaysUntilExpiry,
        string? Specialty,
        string Message);
