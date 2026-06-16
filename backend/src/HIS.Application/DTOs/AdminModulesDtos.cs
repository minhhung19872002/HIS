// DTOs for admin modules: G-41 Payroll, G-42 HR Decisions, G-43 VPP StockCard (reuse warehouse), G-44 Official Documents

namespace HIS.Application.DTOs;

// ─── G-41: Payroll ───────────────────────────────────────────────────────────

public class PayrollPeriodDto
{
    public Guid Id { get; set; }
    public string PeriodCode { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    /// <summary>0=Draft, 1=Approved</summary>
    public int Status { get; set; }
    public string StatusName => Status == 0 ? "Dự thảo" : "Đã duyệt";
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalNetSalary { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePayrollPeriodDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string? Notes { get; set; }
}

public class PayrollItemDto
{
    public Guid Id { get; set; }
    public Guid PeriodId { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public string? DepartmentName { get; set; }
    public decimal WorkDays { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Allowance { get; set; }
    public decimal OtherIncome { get; set; }
    public decimal BhxhDeduction { get; set; }
    public decimal OtherDeduction { get; set; }
    public decimal NetSalary { get; set; }
    public string? Notes { get; set; }
}

public class SavePayrollItemDto
{
    public Guid? Id { get; set; }
    public Guid PeriodId { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public string? DepartmentName { get; set; }
    public decimal WorkDays { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Allowance { get; set; }
    public decimal OtherIncome { get; set; }
    public decimal OtherDeduction { get; set; }
    public string? Notes { get; set; }
}

// ─── G-42: HR Decisions ──────────────────────────────────────────────────────

public class HrDecisionDto
{
    public Guid Id { get; set; }
    public string DecisionNumber { get; set; } = string.Empty;
    public int DecisionType { get; set; }
    public string DecisionTypeName => DecisionType switch
    {
        0 => "Bổ nhiệm",
        1 => "Điều động",
        2 => "Nâng lương",
        3 => "Khen thưởng",
        4 => "Kỷ luật",
        5 => "Thôi việc",
        6 => "Đi học",
        _ => "Khác"
    };
    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Content { get; set; }
    /// <summary>0=Dự thảo, 1=Hiệu lực, 2=Hủy</summary>
    public int Status { get; set; }
    public string StatusName => Status == 0 ? "Dự thảo" : Status == 1 ? "Hiệu lực" : "Hủy";
    public string? Department { get; set; }
    public string? Position { get; set; }
    public string? SignerName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveHrDecisionDto
{
    public Guid? Id { get; set; }
    public string DecisionNumber { get; set; } = string.Empty;
    public int DecisionType { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Content { get; set; }
    public int Status { get; set; } = 0;
    public string? Department { get; set; }
    public string? Position { get; set; }
    public string? SignerName { get; set; }
    public string? Notes { get; set; }
}

// ─── G-44: Official Documents ────────────────────────────────────────────────

public class OfficialDocumentDto
{
    public Guid Id { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    /// <summary>0=Đến, 1=Đi</summary>
    public int DocumentType { get; set; }
    public string DocumentTypeName => DocumentType == 0 ? "Đến" : "Đi";
    public DateTime DocumentDate { get; set; }
    public string? Sender { get; set; }
    public string? Receiver { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Handler { get; set; }
    public DateTime? Deadline { get; set; }
    public bool IsOverdue => Deadline.HasValue && Deadline < DateTime.Today && Status < 2;
    /// <summary>0=Mới, 1=Đang xử lý, 2=Hoàn thành, 3=Lưu</summary>
    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Mới",
        1 => "Đang xử lý",
        2 => "Hoàn thành",
        3 => "Lưu",
        _ => "Không rõ"
    };
    public string? AttachmentPath { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveOfficialDocumentDto
{
    public Guid? Id { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public int DocumentType { get; set; }
    public DateTime DocumentDate { get; set; }
    public string? Sender { get; set; }
    public string? Receiver { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Handler { get; set; }
    public DateTime? Deadline { get; set; }
    public int Status { get; set; } = 0;
    public string? AttachmentPath { get; set; }
}
