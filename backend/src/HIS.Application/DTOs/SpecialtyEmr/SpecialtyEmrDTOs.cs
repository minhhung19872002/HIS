namespace HIS.Application.DTOs.SpecialtyEmr;

public class SpecialtyEmrSearchDto
{
    public string? Keyword { get; set; }
    public string? SpecialtyType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class SpecialtyEmrDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string SpecialtyType { get; set; } = string.Empty;
    public string SpecialtyTypeName { get; set; } = string.Empty;
    public DateTime RecordDate { get; set; }
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public string FieldData { get; set; } = "{}";
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class SpecialtyEmrSaveDto
{
    public Guid? Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string SpecialtyType { get; set; } = string.Empty;
    public DateTime RecordDate { get; set; }
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public string FieldData { get; set; } = "{}";
    public int Status { get; set; }
}

public class SpecialtyEmrPagedResult
{
    public List<SpecialtyEmrDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
}
