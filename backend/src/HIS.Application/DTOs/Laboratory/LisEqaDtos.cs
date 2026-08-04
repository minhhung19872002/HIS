namespace HIS.Application.DTOs.Laboratory;

// ─── NangCap26 LIS #29: Ngoại kiểm (EQA) ────────────────────────────────────

public class LabEqaTestDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? ServiceId { get; set; }
    public string? ServiceName { get; set; }
    public string? ProviderName { get; set; }
    public string? Cycle { get; set; }
    public string? Unit { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

public class LabEqaBatchDto
{
    public Guid Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public string? ProviderName { get; set; }
    public string? Period { get; set; }
    public DateTime ReceivedDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? HandoverBy { get; set; }
    public Guid? ReceivedBy { get; set; }
    public string? ReceivedByName { get; set; }
    /// <summary>Received · Running · Reported · Closed</summary>
    public string Status { get; set; } = "Received";
    public string StatusName => Status switch
    {
        "Running" => "Đang chạy mẫu",
        "Reported" => "Đã báo cáo",
        "Closed" => "Đã có đánh giá",
        _ => "Đã nhận mẫu"
    };
    public string? Notes { get; set; }
    public int ResultCount { get; set; }
    public List<LabEqaResultDto> Results { get; set; } = new();
}

public class SaveLabEqaBatchDto
{
    public Guid? Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public string? ProviderName { get; set; }
    public string? Period { get; set; }
    public DateTime ReceivedDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? HandoverBy { get; set; }
    public string? Notes { get; set; }
}

public class LabEqaResultDto
{
    public Guid Id { get; set; }
    public Guid BatchId { get; set; }
    public Guid EqaTestId { get; set; }
    public string? EqaTestName { get; set; }
    public string? SampleCode { get; set; }
    public decimal? ResultValue { get; set; }
    public string? ResultText { get; set; }
    public DateTime? RunAt { get; set; }
    public Guid? RunBy { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? ZScore { get; set; }
    public string? Evaluation { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? Notes { get; set; }
}

public class SaveLabEqaResultDto
{
    public Guid? Id { get; set; }
    public Guid BatchId { get; set; }
    public Guid EqaTestId { get; set; }
    public string? SampleCode { get; set; }
    public decimal? ResultValue { get; set; }
    public string? ResultText { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? ZScore { get; set; }
    public string? Evaluation { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? Notes { get; set; }
}

// ─── NangCap26 LIS #15: Đơn vị gửi mẫu ──────────────────────────────────────

public class LabSendingUnitDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? FacilityCode { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
