namespace HIS.Core.Entities;

/// <summary>
/// Yêu cầu giải phẫu bệnh / tế bào học
/// </summary>
public class PathologyRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid RequestingDoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime RequestDate { get; set; }

    // Specimen info
    public string SpecimenType { get; set; } = string.Empty; // biopsy, cytology, pap, frozenSection
    public string? SpecimenSite { get; set; } // Vị trí lấy mẫu
    public string? SpecimenDescription { get; set; } // Mô tả mẫu bệnh phẩm
    public int SpecimenCount { get; set; } = 1;
    public DateTime? SpecimenCollectedAt { get; set; }
    public Guid? SpecimenCollectedBy { get; set; }

    // Clinical
    public string? ClinicalDiagnosis { get; set; } // Chẩn đoán lâm sàng
    public string? ClinicalHistory { get; set; } // Bệnh sử tóm tắt
    public string Priority { get; set; } = "normal"; // normal, urgent

    // Status: 0=Pending, 1=Grossing, 2=Processing, 3=Completed, 4=Verified
    public int Status { get; set; }

    // Billing
    public int PatientType { get; set; } // 1=BHYT, 2=Viện phí, 3=Dịch vụ
    public string? InsuranceNumber { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public string? Notes { get; set; }

    // Cancellation
    public string? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
    public virtual Examination? Examination { get; set; }
    public virtual User? RequestingDoctor { get; set; }
    public virtual Department? Department { get; set; }
    public virtual ICollection<PathologyResult> Results { get; set; } = new List<PathologyResult>();
}

/// <summary>
/// Kết quả giải phẫu bệnh
/// </summary>
public class PathologyResult : BaseEntity
{
    public Guid RequestId { get; set; }

    // Đại thể
    public string? GrossDescription { get; set; } // Mô tả đại thể
    public int BlockCount { get; set; } // Số block
    public int SlideCount { get; set; } // Số lam kính

    // Vi thể
    public string? MicroscopicDescription { get; set; } // Mô tả vi thể

    // Nhuộm
    public string? StainingMethods { get; set; } // JSON array: ["HE","PAS","Giemsa"]
    public string? SpecialStains { get; set; } // Kết quả nhuộm đặc biệt

    // IHC / Molecular
    public string? Immunohistochemistry { get; set; } // Hóa mô miễn dịch
    public string? MolecularTests { get; set; } // Xét nghiệm phân tử

    // Kết luận
    public string? Diagnosis { get; set; } // Chẩn đoán giải phẫu bệnh
    public string? IcdCode { get; set; } // Mã ICD cho chẩn đoán
    public string? Comments { get; set; } // Ghi chú thêm

    // Pathologist
    public string? Pathologist { get; set; } // Tên BS giải phẫu bệnh
    public Guid? PathologistId { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Verification
    public Guid? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedByName { get; set; }

    // Images
    public string? Images { get; set; } // JSON array of image URLs

    // Navigation
    public virtual PathologyRequest? Request { get; set; }
    public virtual User? PathologistUser { get; set; }
    public virtual User? VerifiedByUser { get; set; }
}
