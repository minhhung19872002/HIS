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

// ────────────────────────────────────────────────────────────────────────────────
// ĐỔI ĐỐI TƯỢNG PER-LINE (record-level, service-line, drug-line) + audit
// ────────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Đổi đối tượng cho toàn bộ hồ sơ bệnh án (record-level).
/// Gọi lại logic tính tiền sẵn có — không viết công thức mới.
/// </summary>
public class ChangeObjectForRecordRequestDto
{
    public Guid MedicalRecordId { get; set; }
    public int ToObjectType { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Đổi đối tượng cho 1 dòng dịch vụ CLS/PTTT (ServiceRequestDetail).
/// Dùng tại màn hình Reception / Billing.
/// </summary>
public class ChangeObjectForServiceLineRequestDto
{
    public Guid ServiceRequestDetailId { get; set; }
    public int ToObjectType { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Đổi đối tượng cho 1 dòng thuốc/VTYT (PrescriptionDetail).
/// Dùng tại màn hình CĐHA (#137).
/// </summary>
public class ChangeObjectForDrugLineRequestDto
{
    public Guid PrescriptionDetailId { get; set; }
    public int ToObjectType { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>Kết quả đổi đối tượng per-line</summary>
public class ChangeObjectResultDto
{
    public Guid LogId { get; set; }
    public int FromObjectType { get; set; }
    public int ToObjectType { get; set; }
    public decimal OldPatientAmount { get; set; }
    public decimal NewPatientAmount { get; set; }
    public decimal DeltaPatientAmount { get; set; } // NewPatientAmount - OldPatientAmount
    public int AffectedLineCount { get; set; }
    public List<string> Warnings { get; set; } = new();
}

/// <summary>Một bản ghi audit lịch sử đổi đối tượng</summary>
public class PayerChangeLogDto
{
    public Guid Id { get; set; }
    public string ChangeScope { get; set; } = string.Empty;
    public int FromObjectType { get; set; }
    public int ToObjectType { get; set; }
    public string? Reason { get; set; }
    public Guid ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public decimal? OldPatientAmount { get; set; }
    public decimal? NewPatientAmount { get; set; }
    public int AffectedLineCount { get; set; }
    public DateTime ChangedAt { get; set; }
    public Guid? ServiceRequestDetailId { get; set; }
    public Guid? PrescriptionDetailId { get; set; }
}
