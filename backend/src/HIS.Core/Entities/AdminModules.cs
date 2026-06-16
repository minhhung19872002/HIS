// Entities for admin modules: G-41 Payroll, G-42 HR Decisions, G-44 Official Documents

namespace HIS.Core.Entities;

// ─── G-41: Payroll ───────────────────────────────────────────────────────────

/// <summary>Kỳ lương (tháng/năm).</summary>
public class PayrollPeriod
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PeriodCode { get; set; } = string.Empty; // e.g. "2026-06"
    public int Year { get; set; }
    public int Month { get; set; }
    /// <summary>0=Draft, 1=Approved</summary>
    public int Status { get; set; } = 0;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<PayrollItem> Items { get; set; } = new List<PayrollItem>();
}

/// <summary>Dòng lương per nhân viên trong một kỳ.</summary>
public class PayrollItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PeriodId { get; set; }
    public virtual PayrollPeriod? Period { get; set; }

    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public string? DepartmentName { get; set; }

    public decimal WorkDays { get; set; } = 0;
    public decimal BaseSalary { get; set; } = 0;
    public decimal Allowance { get; set; } = 0;
    public decimal OtherIncome { get; set; } = 0;
    /// <summary>Khấu trừ BHXH/BHYT/BHTN — mặc định 10.5% BaseSalary.</summary>
    public decimal BhxhDeduction { get; set; } = 0;
    public decimal OtherDeduction { get; set; } = 0;
    public decimal NetSalary { get; set; } = 0;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

// ─── G-42: HR Decisions ──────────────────────────────────────────────────────

/// <summary>Quyết định nhân sự.</summary>
public class HrDecision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DecisionNumber { get; set; } = string.Empty; // Số QĐ
    /// <summary>0=Bổ nhiệm, 1=Điều động, 2=Nâng lương, 3=Khen thưởng, 4=Kỷ luật, 5=Thôi việc, 6=Đi học</summary>
    public int DecisionType { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? StaffName { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Summary { get; set; } = string.Empty; // Trích yếu
    public string? Content { get; set; }               // Nội dung đầy đủ
    /// <summary>0=Dự thảo, 1=Hiệu lực, 2=Hủy</summary>
    public int Status { get; set; } = 0;
    /// <summary>Đơn vị/phòng ban liên quan đến quyết định.</summary>
    public string? Department { get; set; }
    /// <summary>Chức vụ bổ nhiệm/điều động (nếu có).</summary>
    public string? Position { get; set; }
    /// <summary>Người ký quyết định.</summary>
    public string? SignerName { get; set; }
    /// <summary>Ghi chú bổ sung.</summary>
    public string? Notes { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

// ─── G-44: Official Documents ────────────────────────────────────────────────

/// <summary>Công văn đến/đi.</summary>
public class OfficialDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DocumentNumber { get; set; } = string.Empty; // Số công văn
    /// <summary>0=Đến, 1=Đi</summary>
    public int DocumentType { get; set; }
    public DateTime DocumentDate { get; set; }
    public string? Sender { get; set; }    // Nơi gửi (loại Đến)
    public string? Receiver { get; set; }  // Nơi nhận (loại Đi)
    public string Summary { get; set; } = string.Empty; // Trích yếu
    public string? Handler { get; set; }   // Người xử lý
    public DateTime? Deadline { get; set; }
    /// <summary>0=Mới, 1=Đang xử lý, 2=Hoàn thành, 3=Lưu</summary>
    public int Status { get; set; } = 0;
    public string? AttachmentPath { get; set; } // path string
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
