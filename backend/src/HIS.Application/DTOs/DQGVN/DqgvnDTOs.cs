namespace HIS.Application.DTOs.DQGVN;

/// <summary>
/// Submission types per Vietnamese national health data standard (DQGVN)
/// </summary>
public enum DqgvnSubmissionType
{
    PatientDemographics = 1,   // Thong tin hanh chinh benh nhan
    EncounterReport = 2,       // Bao cao luot kham/dieu tri
    LabResult = 3,             // Ket qua xet nghiem
    RadiologyResult = 4,       // Ket qua CDHA
    PrescriptionReport = 5,    // Don thuoc
    DischargeReport = 6,       // Bao cao ra vien
    DeathReport = 7,           // Bao cao tu vong
    InfectiousDisease = 8,     // Benh truyen nhiem
    BirthReport = 9,           // Bao cao sinh
    VaccinationReport = 10     // Tiem chung
}

public class DqgvnConfigDto
{
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string FacilityCode { get; set; } = string.Empty;   // Ma co so KCB
    public string FacilityName { get; set; } = string.Empty;
    public string ProvinceCode { get; set; } = string.Empty;
    public string DistrictCode { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public bool AutoSubmit { get; set; }
    public int RetryCount { get; set; } = 3;
    public int TimeoutSeconds { get; set; } = 30;
}

public class DqgvnSubmissionDto
{
    public Guid Id { get; set; }
    public DqgvnSubmissionType SubmissionType { get; set; }
    public string SubmissionTypeName => SubmissionType switch
    {
        DqgvnSubmissionType.PatientDemographics => "Thong tin BN",
        DqgvnSubmissionType.EncounterReport => "Luot kham/dieu tri",
        DqgvnSubmissionType.LabResult => "Ket qua XN",
        DqgvnSubmissionType.RadiologyResult => "Ket qua CDHA",
        DqgvnSubmissionType.PrescriptionReport => "Don thuoc",
        DqgvnSubmissionType.DischargeReport => "Ra vien",
        DqgvnSubmissionType.DeathReport => "Tu vong",
        DqgvnSubmissionType.InfectiousDisease => "Benh truyen nhiem",
        DqgvnSubmissionType.BirthReport => "Sinh",
        DqgvnSubmissionType.VaccinationReport => "Tiem chung",
        _ => "Khac"
    };
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public Guid? SourceEntityId { get; set; }
    public string? RequestPayload { get; set; } // JSON sent
    public string? ResponsePayload { get; set; } // JSON received
    public int Status { get; set; } // 0=Pending, 1=Submitted, 2=Accepted, 3=Rejected, 4=Error
    public string StatusName => Status switch
    {
        0 => "Cho gui",
        1 => "Da gui",
        2 => "Da tiep nhan",
        3 => "Bi tu choi",
        4 => "Loi",
        _ => "Khong xac dinh"
    };
    public string? ErrorMessage { get; set; }
    public string? TransactionId { get; set; } // ID from DQGVN
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ResponseAt { get; set; }
}

public class DqgvnSubmissionSearchDto
{
    public DqgvnSubmissionType? SubmissionType { get; set; }
    public int? Status { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? Keyword { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class DqgvnSubmissionPagedResult
{
    public List<DqgvnSubmissionDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class DqgvnDashboardDto
{
    public int TotalSubmissions { get; set; }
    public int PendingCount { get; set; }
    public int SubmittedCount { get; set; }
    public int AcceptedCount { get; set; }
    public int RejectedCount { get; set; }
    public int ErrorCount { get; set; }
    public double AcceptanceRate { get; set; }
    public List<DqgvnSubmissionSummary> ByType { get; set; } = new();
    public List<DqgvnDailyCount> Last7Days { get; set; } = new();
}

public class DqgvnSubmissionSummary
{
    public DqgvnSubmissionType SubmissionType { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public int Count { get; set; }
    public int AcceptedCount { get; set; }
}

public class DqgvnDailyCount
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public int AcceptedCount { get; set; }
}

public class SubmitEncounterRequest
{
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? AdmissionId { get; set; }
}

public class SubmitLabResultRequest
{
    public Guid LabRequestId { get; set; }
}

public class DqgvnSubmitResult
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid SubmissionId { get; set; }
}
