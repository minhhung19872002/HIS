namespace HIS.Application.DTOs.CDA;

/// <summary>
/// HL7 CDA R2 Document types supported by the system
/// </summary>
public enum CdaDocumentType
{
    DischargeSummary = 1,      // Tom tat benh an
    LabReport = 2,             // Ket qua xet nghiem
    RadiologyReport = 3,       // Ket qua CDHA
    ProgressNote = 4,          // Phieu dieu tri
    ConsultationNote = 5,      // Bien ban hoi chan
    OperativeNote = 6,         // Phieu phau thuat
    ReferralNote = 7,          // Giay chuyen vien
    PrescriptionDocument = 8   // Don thuoc
}

public class CdaDocumentDto
{
    public Guid Id { get; set; }
    public string DocumentId { get; set; } = string.Empty; // CDA unique ID (OID-based)
    public CdaDocumentType DocumentType { get; set; }
    public string DocumentTypeName { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public Guid? MedicalRecordId { get; set; }
    public Guid? SourceEntityId { get; set; } // Examination, LabRequest, RadiologyReport etc.
    public string? CdaXml { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Final, 2=Signed, 3=Sent, 4=Acknowledged
    public string StatusName => Status switch
    {
        0 => "Nhap",
        1 => "Hoan thanh",
        2 => "Da ky so",
        3 => "Da gui",
        4 => "Da xac nhan",
        _ => "Khong xac dinh"
    };
    public bool IsSigned { get; set; }
    public string? SignedByName { get; set; }
    public DateTime? SignedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedByName { get; set; }
    public string? ValidationErrors { get; set; }
}

public class GenerateCdaRequest
{
    public CdaDocumentType DocumentType { get; set; }
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? SourceEntityId { get; set; } // e.g. ExaminationId, LabRequestId
}

public class CdaDocumentSearchDto
{
    public Guid? PatientId { get; set; }
    public CdaDocumentType? DocumentType { get; set; }
    public int? Status { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? Keyword { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class CdaDocumentPagedResult
{
    public List<CdaDocumentDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class CdaValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class CdaSendRequest
{
    public Guid DocumentId { get; set; }
    public string? DestinationEndpoint { get; set; }
    public string? DestinationOid { get; set; }
}
