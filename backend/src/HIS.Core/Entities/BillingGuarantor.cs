namespace HIS.Core.Entities;

/// <summary>
/// Đơn vị bảo lãnh viện phí (công ty, tổ chức thanh toán thay bệnh nhân).
/// </summary>
public class SponsorOrg : BaseEntity
{
    /// <summary>Mã đơn vị bảo lãnh (duy nhất trong hệ thống).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Tên đơn vị bảo lãnh.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Mã số thuế.</summary>
    public string? TaxCode { get; set; }

    /// <summary>Địa chỉ.</summary>
    public string? Address { get; set; }

    /// <summary>Người liên hệ.</summary>
    public string? ContactPerson { get; set; }

    /// <summary>Số điện thoại liên hệ.</summary>
    public string? Phone { get; set; }

    /// <summary>Còn hoạt động hay không.</summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Gán bảo lãnh viện phí cho một lượt khám/nội trú.
/// Không dùng FK navigation để tránh cascade phức tạp — chỉ lưu Guid.
/// </summary>
public class BillingGuarantor : BaseEntity
{
    /// <summary>Id đơn vị bảo lãnh (SponsorOrg.Id — không FK).</summary>
    public Guid SponsorOrgId { get; set; }

    /// <summary>Id bệnh nhân (tùy chọn — không FK).</summary>
    public Guid? PatientId { get; set; }

    /// <summary>Id hồ sơ bệnh án / lượt nội trú (tùy chọn — không FK).</summary>
    public Guid? MedicalRecordId { get; set; }

    /// <summary>Số công văn / giấy bảo lãnh.</summary>
    public string? GuaranteeNo { get; set; }

    /// <summary>Tỷ lệ bảo lãnh (0-100%).</summary>
    public decimal GuaranteeRate { get; set; }

    /// <summary>Hạn mức tiền bảo lãnh (null = không giới hạn).</summary>
    public decimal? GuaranteeAmount { get; set; }

    /// <summary>Ngày bắt đầu hiệu lực.</summary>
    public DateTime? FromDate { get; set; }

    /// <summary>Ngày hết hiệu lực.</summary>
    public DateTime? ToDate { get; set; }

    /// <summary>Trạng thái: 0=Hiệu lực, 1=Hết hạn, 2=Hủy.</summary>
    public int Status { get; set; } = 0;

    /// <summary>Ghi chú.</summary>
    public string? Notes { get; set; }
}
