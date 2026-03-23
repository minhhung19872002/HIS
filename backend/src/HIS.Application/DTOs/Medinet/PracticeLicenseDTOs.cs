namespace HIS.Application.DTOs;

// ========================
// Module 9: Quản lý hành nghề (Practice License Management)
// ========================

public class PracticeLicenseSearchDto
{
    public string? Keyword { get; set; }
    public string? LicenseType { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}

public class PracticeLicenseDto
{
    public Guid Id { get; set; }
    public string LicenseCode { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    public string HolderName { get; set; } = string.Empty;
    public string? DateOfBirth { get; set; }
    public string? Cccd { get; set; }
    public string? Specialty { get; set; }
    public string? IssuingAuthority { get; set; }
    public string? IssueDate { get; set; }
    public string? ExpiryDate { get; set; }
    public int Status { get; set; }
    public string? FacilityName { get; set; }
    public string? CertificateNumber { get; set; }
    public string? TrainingInstitution { get; set; }
    public int? GraduationYear { get; set; }
    public string? Notes { get; set; }
}

public class PracticeLicenseDetailDto : PracticeLicenseDto
{
    public Guid? FacilityId { get; set; }
    public int? DaysUntilExpiry { get; set; }
}

public class CreatePracticeLicenseDto
{
    public string? LicenseType { get; set; }
    public string? HolderName { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Cccd { get; set; }
    public string? Specialty { get; set; }
    public string? IssuingAuthority { get; set; }
    public string? IssueDate { get; set; }
    public string? ExpiryDate { get; set; }
    public Guid? FacilityId { get; set; }
    public string? FacilityName { get; set; }
    public string? CertificateNumber { get; set; }
    public string? TrainingInstitution { get; set; }
    public int? GraduationYear { get; set; }
    public string? Notes { get; set; }
}

public class PracticeLicenseStatsDto
{
    public int TotalLicenses { get; set; }
    public int ActiveCount { get; set; }
    public int ExpiredCount { get; set; }
    public int ExpiringSoon { get; set; } // within 90 days
    public int SuspendedCount { get; set; }
    public List<LicenseTypeBreakdownDto> LicenseTypeBreakdown { get; set; } = new();
}

public class LicenseTypeBreakdownDto
{
    public string LicenseType { get; set; } = string.Empty;
    public int Count { get; set; }
}
