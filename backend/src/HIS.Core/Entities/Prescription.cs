namespace HIS.Core.Entities;

/// <summary>
/// Đơn thuốc - Prescription
/// </summary>
public class Prescription : BaseEntity
{
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }

    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public Guid? ExaminationId { get; set; }
    public virtual Examination? Examination { get; set; }

    // Bác sĩ kê đơn
    public Guid DoctorId { get; set; }
    public virtual User Doctor { get; set; } = null!;

    // Khoa/Phòng kê
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;

    // Kho xuất
    public Guid? WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }

    // Chẩn đoán
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public string? DiagnosisCode { get; set; } // Mã chẩn đoán (ICD-10)
    public string? DiagnosisName { get; set; } // Tên chẩn đoán

    // Loại đơn
    public int PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Nhà thuốc, 4-YHCT
    public int TotalDays { get; set; } // Số ngày đơn thuốc
    public int TotalTangs { get; set; } // Số thang (YHCT)

    // Chi phí
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã cấp phát, 3-Hoàn trả, 4-Hủy
    public bool IsDispensed { get; set; } // Đã cấp phát
    public DateTime? DispensedAt { get; set; }
    public Guid? DispensedBy { get; set; }

    public string? Note { get; set; } // Lời dặn
    public string? Instructions { get; set; } // Hướng dẫn sử dụng chi tiết

    // Navigation
    public virtual ICollection<PrescriptionDetail> Details { get; set; } = new List<PrescriptionDetail>();
}

/// <summary>
/// Chi tiết đơn thuốc - PrescriptionDetail
/// </summary>
public class PrescriptionDetail : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public virtual Prescription Prescription { get; set; } = null!;

    public Guid MedicineId { get; set; }
    public virtual Medicine Medicine { get; set; } = null!;

    public Guid? WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }

    // Số lượng
    public decimal Quantity { get; set; }
    public decimal DispensedQuantity { get; set; } // Số lượng đã cấp
    public string? Unit { get; set; } // Đơn vị

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public int InsurancePaymentRate { get; set; }

    // Hướng dẫn sử dụng
    public string? Dosage { get; set; } // Liều dùng
    public string? Frequency { get; set; } // Tần suất (3 lần/ngày)
    public string? Route { get; set; } // Đường dùng (Uống, Tiêm...)
    public string? Usage { get; set; } // Cách dùng chi tiết
    public string? UsageInstructions { get; set; } // Hướng dẫn sử dụng
    public int Days { get; set; } // Số ngày dùng
    public decimal TotalPrice { get; set; } // Tổng giá
    public decimal? MorningDose { get; set; } // Sáng
    public decimal? NoonDose { get; set; } // Trưa
    public decimal? EveningDose { get; set; } // Chiều
    public decimal? NightDose { get; set; } // Tối

    // Lô thuốc
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public string? Note { get; set; }
    public int Status { get; set; } // 0-Chờ, 1-Đã cấp, 2-Hoàn trả
}
