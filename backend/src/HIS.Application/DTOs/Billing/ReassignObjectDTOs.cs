namespace HIS.Application.DTOs.Billing;

public class ReassignObjectRequestDto
{
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }

    /// <summary>"service" (dịch vụ CLS/PTTT) hoặc "medicine" (thuốc)</summary>
    public string Scope { get; set; } = "service";

    /// <summary>"all" = toàn bộ các dòng, "detail" = chỉ các ItemIds</summary>
    public string Mode { get; set; } = "all";

    /// <summary>Đối tượng cũ, chỉ dùng khi mode=all để filter</summary>
    public int? FromPatientType { get; set; }

    public int ToPatientType { get; set; }

    /// <summary>Dùng khi mode=detail: danh sách ServiceRequestDetail.Id hoặc PrescriptionDetail.Id</summary>
    public List<Guid> ItemIds { get; set; } = new();

    public string Reason { get; set; } = string.Empty;
}

public class ReassignObjectResultDto
{
    public int UpdatedCount { get; set; }
    public decimal OldTotal { get; set; }
    public decimal NewTotal { get; set; }
    public List<string> Warnings { get; set; } = new();
}
