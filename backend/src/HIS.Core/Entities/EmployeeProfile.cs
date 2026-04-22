namespace HIS.Core.Entities;

/// <summary>
/// HR quản lý nhân sự 9 tab — Sprint 6 Item 2.13.
/// Mirror MQ Human module: tài sản cá nhân, phụ cấp, quá trình công tác,
/// đào tạo, gia đình, khen thưởng/kỷ luật, lương + NH, hợp đồng, BHXH-BHYT.
/// </summary>
public class EmployeeAsset : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    /// <summary>BatDongSan / HienKim / HienVat / TaiSanCoDinh</summary>
    public string AssetType { get; set; } = "HienKim";

    public string AssetName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Value { get; set; }
    public string? Location { get; set; }
    public DateTime? AcquiredAt { get; set; }
    public string? DocumentUrl { get; set; }
}

public class EmployeeAllowance : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string AllowanceType { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Monthly";
    public decimal Amount { get; set; }
    public decimal? Rate { get; set; }

    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public string? Note { get; set; }
}

public class EmployeeCareerHistory : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public Guid? FromDepartmentId { get; set; }
    public string? FromDepartmentName { get; set; }
    public string? FromPosition { get; set; }

    public Guid? ToDepartmentId { get; set; }
    public string? ToDepartmentName { get; set; }
    public string? ToPosition { get; set; }

    public DateTime TransferDate { get; set; }
    public string? DecisionNumber { get; set; }
    public string? Reason { get; set; }
}

public class EmployeeEducation : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string Degree { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string? School { get; set; }
    public DateTime? GraduatedAt { get; set; }
    public string? CertificateNumber { get; set; }
    public string? DocumentUrl { get; set; }
}

public class EmployeeFamily : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string Relation { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Occupation { get; set; }
    public string? PhoneNumber { get; set; }
    public string? IdentityNumber { get; set; }
    public bool IsDependent { get; set; }
}

public class EmployeeRewardDiscipline : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    /// <summary>reward | discipline</summary>
    public string Type { get; set; } = "reward";

    public string Title { get; set; } = string.Empty;
    public string? DecisionNumber { get; set; }
    public DateTime DecisionDate { get; set; }
    public decimal? Amount { get; set; }
    public string? Reason { get; set; }
    public string? DecidedBy { get; set; }
}

public class EmployeeBankAccount : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public bool IsPrimary { get; set; }
}

public class EmployeeContract : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>Probation / FixedTerm / Indefinite / Seasonal</summary>
    public string ContractType { get; set; } = "FixedTerm";

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public string? Position { get; set; }
    public decimal? BaseSalary { get; set; }
    public decimal? SalaryGrade { get; set; }
    public decimal? SalaryCoefficient { get; set; }

    public string? DocumentUrl { get; set; }
    public string? Note { get; set; }
}

public class EmployeeInsuranceInfo : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public string? SocialInsuranceNumber { get; set; }
    public DateTime? SocialInsuranceStartDate { get; set; }
    public string? HealthInsuranceNumber { get; set; }
    public DateTime? HealthInsuranceStartDate { get; set; }
    public DateTime? HealthInsuranceEndDate { get; set; }
    public string? HealthInsuranceFacilityCode { get; set; }
    public decimal MonthlyEmployeeContribution { get; set; }
    public decimal MonthlyEmployerContribution { get; set; }
    public string? Note { get; set; }
}
