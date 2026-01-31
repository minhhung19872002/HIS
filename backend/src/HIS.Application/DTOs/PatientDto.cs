namespace HIS.Application.DTOs;

public class PatientDto
{
    public Guid Id { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? YearOfBirth { get; set; }
    public int Gender { get; set; }
    public string? GenderName => Gender switch { 1 => "Nam", 2 => "Nữ", _ => "Khác" };
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public string? DistrictName { get; set; }
    public string? ProvinceName { get; set; }
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public string? InsuranceFacilityCode { get; set; }
    public string? PhotoPath { get; set; }
}

public class CreatePatientDto
{
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? YearOfBirth { get; set; }
    public int Gender { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? WardCode { get; set; }
    public string? WardName { get; set; }
    public string? DistrictCode { get; set; }
    public string? DistrictName { get; set; }
    public string? ProvinceCode { get; set; }
    public string? ProvinceName { get; set; }
    public string? EthnicCode { get; set; }
    public string? EthnicName { get; set; }
    public string? Occupation { get; set; }
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public string? InsuranceFacilityCode { get; set; }
    public string? InsuranceFacilityName { get; set; }
    public string? GuardianName { get; set; }
    public string? GuardianPhone { get; set; }
    public string? GuardianRelationship { get; set; }
}

public class UpdatePatientDto : CreatePatientDto
{
    public Guid Id { get; set; }
}

public class PatientSearchDto
{
    public string? Keyword { get; set; }
    public string? PatientCode { get; set; }
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? InsuranceNumber { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
