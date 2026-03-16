namespace HIS.Application.DTOs.ProvincialHealth;

public class ProvincialReportDto
{
    public Guid Id { get; set; }
    public string ReportCode { get; set; } = string.Empty;
    public int ReportType { get; set; } // 1=Daily, 2=Weekly, 3=Monthly, 4=Quarterly, 5=Annual, 6=Adhoc
    public string ReportTypeName => ReportType switch
    {
        1 => "Hàng ngày",
        2 => "Hàng tuần",
        3 => "Hàng tháng",
        4 => "Hàng quý",
        5 => "Hàng năm",
        6 => "Đột xuất",
        _ => "Khác"
    };
    public string ReportPeriod { get; set; } = string.Empty;
    public string FacilityCode { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public int TotalOutpatients { get; set; }
    public int TotalInpatients { get; set; }
    public int TotalEmergencies { get; set; }
    public int TotalSurgeries { get; set; }
    public int TotalDeaths { get; set; }
    public int TotalBirths { get; set; }
    public int TotalLabTests { get; set; }
    public int TotalRadiologyExams { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalInsuranceClaims { get; set; }
    public decimal BedOccupancyRate { get; set; }
    public decimal AvgLengthOfStay { get; set; }
    public int InfectiousDiseaseCount { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Submitted, 2=Acknowledged, 3=Rejected
    public string StatusName => Status switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Đã xác nhận",
        3 => "Từ chối",
        _ => "Không xác định"
    };
    public DateTime? SubmittedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProvincialReportSearchDto
{
    public int? ReportType { get; set; }
    public int? Status { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public string? Keyword { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class ProvincialReportPagedResult
{
    public List<ProvincialReportDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class InfectiousDiseaseReportDto
{
    public Guid Id { get; set; }
    public string DiseaseCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int PatientAge { get; set; }
    public string PatientGender { get; set; } = string.Empty;
    public string PatientAddress { get; set; } = string.Empty;
    public DateTime OnsetDate { get; set; }
    public DateTime DiagnosisDate { get; set; }
    public DateTime ReportDate { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Outcome { get; set; } = string.Empty;
    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Chờ gửi",
        1 => "Đã gửi",
        2 => "Đã xác nhận",
        _ => "Không xác định"
    };
}

public class ProvincialStatsDto
{
    public int TotalReportsThisMonth { get; set; }
    public int TotalSubmitted { get; set; }
    public int TotalAcknowledged { get; set; }
    public int TotalPending { get; set; }
    public DateTime? LastReportDate { get; set; }
    public string ConnectionStatus { get; set; } = "Connected";
    public int InfectiousDiseaseAlerts { get; set; }
}

public class ProvincialConnectionDto
{
    public string Endpoint { get; set; } = string.Empty;
    public string Status { get; set; } = "Connected";
    public string LastSync { get; set; } = string.Empty;
    public string Protocol { get; set; } = "HL7 FHIR R4";
    public string? CertificateExpiry { get; set; }
}

public class GenerateReportRequest
{
    public int ReportType { get; set; }
    public string Period { get; set; } = string.Empty;
}
