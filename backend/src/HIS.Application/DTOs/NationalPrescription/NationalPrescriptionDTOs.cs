namespace HIS.Application.DTOs.NationalPrescription;

public class NationalPrescriptionDto
{
    public Guid Id { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string? PatientIdNumber { get; set; }
    public string? InsuranceNumber { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? DoctorLicenseNumber { get; set; }
    public string FacilityCode { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Submitted, 2=Accepted, 3=Rejected, 4=Cancelled
    public string StatusName => Status switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Chấp nhận",
        3 => "Từ chối",
        4 => "Đã hủy",
        _ => "Không xác định"
    };
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ResponseAt { get; set; }
    public string? ResponseCode { get; set; }
    public string? ResponseMessage { get; set; }
    public string? TransactionId { get; set; }
    public List<NationalPrescriptionItemDto> Items { get; set; } = new();
}

public class NationalPrescriptionItemDto
{
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string ActiveIngredient { get; set; } = string.Empty;
    public string DosageForm { get; set; } = string.Empty;
    public string Strength { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int Duration { get; set; }
    public string Route { get; set; } = string.Empty;
    public bool InsuranceCovered { get; set; }
}

public class NationalPrescriptionSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class NationalPrescriptionPagedResult
{
    public List<NationalPrescriptionDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

public class NationalPrescriptionStatsDto
{
    public int TotalSubmitted { get; set; }
    public int TotalAccepted { get; set; }
    public int TotalRejected { get; set; }
    public int TotalPending { get; set; }
    public decimal TotalAmountSubmitted { get; set; }
    public DateTime? LastSubmittedAt { get; set; }
    public string ConnectionStatus { get; set; } = "Connected";
}

public class SubmitBatchRequest
{
    public List<string> PrescriptionIds { get; set; } = new();
}

public class SubmitBatchResult
{
    public int SuccessCount { get; set; }
    public int FailCount { get; set; }
    public List<BatchItemResult> Results { get; set; } = new();
}

public class BatchItemResult
{
    public string Id { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
