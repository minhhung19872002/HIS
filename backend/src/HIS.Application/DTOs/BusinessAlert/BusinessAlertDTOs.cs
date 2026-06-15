namespace HIS.Application.DTOs.BusinessAlert;

// ===== Response DTOs =====

public class BusinessAlertDto
{
    public Guid Id { get; set; }
    public string AlertCode { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string SeverityLabel { get; set; } = string.Empty; // Critical, Warning, Info
    public string SeverityColor { get; set; } = string.Empty; // red, orange, blue
    public string Module { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? AdmissionId { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public int Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty; // New, Acknowledged, Resolved, Ignored
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
    public string? ActionTaken { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ===== Search/Filter DTOs =====

public class BusinessAlertSearchDto
{
    public Guid? PatientId { get; set; }
    public string? Module { get; set; }
    public string? Category { get; set; }
    public int? Severity { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class BusinessAlertPagedResult
{
    public List<BusinessAlertDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}

// ===== Action DTOs =====

public class BusinessAlertAcknowledgeDto
{
    public string? ActionTaken { get; set; }
}

// ===== Alert Check Result =====

public class AlertCheckResultDto
{
    public List<BusinessAlertDto> NewAlerts { get; set; } = new();
    public int TotalNewAlerts { get; set; }
    public int CriticalCount { get; set; }
    public int WarningCount { get; set; }
    public int InfoCount { get; set; }
}

// ===== Cost Estimation =====

public class CostEstimationResultDto
{
    public Guid PatientId { get; set; }
    public int PatientType { get; set; }
    public string PatientTypeName { get; set; } = string.Empty;
    public int? InsuranceCoverageRate { get; set; }
    public List<CostEstimationItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

public class CostEstimationItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroupName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }
    public int? CoverageRate { get; set; }
}

// ===== Rule Definition =====

public class BusinessAlertRuleDto
{
    public string AlertCode { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DefaultSeverity { get; set; }
    public string Module { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

// ===== Special Test Rule (F2.13) =====

public class SpecialTestRuleDto
{
    public Guid Id { get; set; }
    public Guid TestId { get; set; }
    public string TestName { get; set; } = string.Empty;
    /// <summary>0 = per-episode, 1 = N-ngày</summary>
    public int WindowType { get; set; }
    public int? WindowDays { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class SpecialTestRuleSaveDto
{
    public Guid? Id { get; set; }
    public Guid TestId { get; set; }
    /// <summary>0 = per-episode, 1 = N-ngày</summary>
    public int WindowType { get; set; }
    public int? WindowDays { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SpecialTestRuleSearchDto
{
    public string? Keyword { get; set; }
    public bool? IsActive { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class SpecialTestRulePagedResult
{
    public List<SpecialTestRuleDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
}
