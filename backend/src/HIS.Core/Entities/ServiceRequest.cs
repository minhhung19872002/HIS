namespace HIS.Core.Entities;

/// <summary>
/// Phiếu chỉ định - ServiceRequest
/// </summary>
public class ServiceRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty; // Mã phiếu
    public DateTime RequestDate { get; set; }

    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public Guid? ExaminationId { get; set; }
    public virtual Examination? Examination { get; set; }

    // Bác sĩ chỉ định
    public Guid DoctorId { get; set; }
    public virtual User Doctor { get; set; } = null!;

    // Khoa/Phòng chỉ định
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    // Khoa/Phòng thực hiện
    public Guid? ExecuteDepartmentId { get; set; }
    public virtual Department? ExecuteDepartment { get; set; }
    public Guid? ExecuteRoomId { get; set; }
    public virtual Room? ExecuteRoom { get; set; }

    // Chẩn đoán
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }

    // Loại chỉ định
    public int RequestType { get; set; } // 1-XN, 2-CĐHA, 3-TDCN, 4-PTTT, 5-Khác
    public bool IsEmergency { get; set; } // Cấp cứu
    public bool IsPriority { get; set; } // Ưu tiên

    public string? Note { get; set; }
    public int Status { get; set; } // 0-Chờ TT, 1-Đã TT, 2-Đang thực hiện, 3-Có kết quả, 4-Đã hủy

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsPaid { get; set; }

    // Navigation
    public virtual ICollection<ServiceRequestDetail> Details { get; set; } = new List<ServiceRequestDetail>();
}

/// <summary>
/// Chi tiết phiếu chỉ định - ServiceRequestDetail
/// </summary>
public class ServiceRequestDetail : BaseEntity
{
    public Guid ServiceRequestId { get; set; }
    public virtual ServiceRequest ServiceRequest { get; set; } = null!;

    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public int InsurancePaymentRate { get; set; } // Tỷ lệ BHYT

    // Kết quả
    public string? Result { get; set; }
    public string? ResultDescription { get; set; }
    public string? Conclusion { get; set; }
    public DateTime? ResultDate { get; set; }
    public Guid? ResultUserId { get; set; } // Người trả KQ
    public virtual User? ResultUser { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ, 1-Đang TH, 2-Có KQ, 3-Hủy
    public bool IsSampleCollected { get; set; } // Đã lấy mẫu (XN)
    public DateTime? SampleCollectedAt { get; set; }
    public string? SampleBarcode { get; set; }

    public string? Note { get; set; }
}
