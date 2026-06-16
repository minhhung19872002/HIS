namespace HIS.Application.DTOs.Billing;

// ─── SponsorOrg ──────────────────────────────────────────────────────────────

public class SponsorOrgDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
}

// ─── BillingGuarantor ────────────────────────────────────────────────────────

public class BillingGuarantorDto
{
    public Guid Id { get; set; }
    public Guid SponsorOrgId { get; set; }

    /// <summary>Tên đơn vị bảo lãnh — join từ SponsorOrg.</summary>
    public string? SponsorOrgName { get; set; }

    public Guid? PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public string? GuaranteeNo { get; set; }
    public decimal GuaranteeRate { get; set; }
    public decimal? GuaranteeAmount { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    /// <summary>0=Hiệu lực, 1=Hết hạn, 2=Hủy.</summary>
    public int Status { get; set; } = 0;
    public string? Notes { get; set; }
}

// ─── Debt report ─────────────────────────────────────────────────────────────

/// <summary>
/// Báo cáo công nợ group theo đơn vị bảo lãnh trong khoảng thời gian.
/// </summary>
public class GuarantorDebtReportDto
{
    public Guid SponsorOrgId { get; set; }
    public string SponsorOrgName { get; set; } = string.Empty;

    /// <summary>Tổng hạn mức bảo lãnh (GuaranteeAmount) trong kỳ.</summary>
    public decimal TotalGuaranteed { get; set; }

    /// <summary>Số lượt bảo lãnh (BillingGuarantor records) trong kỳ.</summary>
    public int Count { get; set; }
}
