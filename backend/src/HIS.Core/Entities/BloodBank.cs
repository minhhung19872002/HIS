namespace HIS.Core.Entities;

/// <summary>
/// Đơn vị máu - BloodUnit
/// </summary>
public class BloodUnit : BaseEntity
{
    public string UnitCode { get; set; } = string.Empty; // Mã đơn vị máu
    public string BloodType { get; set; } = string.Empty; // Nhóm máu: A, B, AB, O
    public string RhFactor { get; set; } = string.Empty; // Rh: +, -
    public Guid? DonorId { get; set; } // Người hiến
    public virtual BloodDonor? Donor { get; set; }

    public DateTime CollectionDate { get; set; } // Ngày lấy máu
    public DateTime ExpiryDate { get; set; } // Ngày hết hạn
    public decimal Volume { get; set; } // Thể tích (ml)
    public int Status { get; set; } // 0-Chờ xét nghiệm, 1-Đủ điều kiện, 2-Không đủ điều kiện, 3-Đã sử dụng, 4-Hủy
    public string? StorageLocation { get; set; } // Vị trí lưu trữ

    public string? BatchNumber { get; set; } // Số lô
    public string? TestResults { get; set; } // Kết quả xét nghiệm
    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<BloodTransfusion> Transfusions { get; set; } = new List<BloodTransfusion>();
}

/// <summary>
/// Người hiến máu - BloodDonor
/// </summary>
public class BloodDonor : BaseEntity
{
    public string DonorCode { get; set; } = string.Empty; // Mã người hiến
    public string FullName { get; set; } = string.Empty; // Họ tên
    public DateTime? DateOfBirth { get; set; } // Ngày sinh
    public int Gender { get; set; } // 1-Nam, 2-Nữ
    public string? IdentityNumber { get; set; } // CCCD/CMND
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }

    public string BloodType { get; set; } = string.Empty; // Nhóm máu
    public string RhFactor { get; set; } = string.Empty; // Rh
    public DateTime? LastDonationDate { get; set; } // Lần hiến cuối
    public int TotalDonations { get; set; } // Số lần hiến

    public int Status { get; set; } // 0-Chưa kích hoạt, 1-Đang hoạt động, 2-Tạm dừng, 3-Ngừng hoạt động
    public string? MedicalHistory { get; set; } // Tiền sử bệnh
    public string? AllergyHistory { get; set; } // Dị ứng
    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<BloodUnit> BloodUnits { get; set; } = new List<BloodUnit>();
}

/// <summary>
/// Yêu cầu máu - BloodRequest
/// </summary>
public class BloodRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty; // Mã yêu cầu

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public DateTime RequestDate { get; set; } // Ngày yêu cầu
    public string BloodType { get; set; } = string.Empty; // Nhóm máu cần
    public string? RhFactor { get; set; } // Rh
    public int Quantity { get; set; } // Số lượng (đơn vị)
    public decimal Volume { get; set; } // Thể tích (ml)

    public int Priority { get; set; } // 0-Thường, 1-Ưu tiên, 2-Cấp cứu
    public string? Purpose { get; set; } // Mục đích sử dụng
    public string? ClinicalDiagnosis { get; set; } // Chẩn đoán lâm sàng

    public Guid RequestingDoctorId { get; set; }
    public virtual User RequestingDoctor { get; set; } = null!;

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đang chuẩn bị, 3-Đã cấp phát, 4-Từ chối, 5-Hủy
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<BloodTransfusion> Transfusions { get; set; } = new List<BloodTransfusion>();
}

/// <summary>
/// Truyền máu - BloodTransfusion
/// </summary>
public class BloodTransfusion : BaseEntity
{
    public string TransfusionCode { get; set; } = string.Empty; // Mã lần truyền

    public Guid BloodRequestId { get; set; }
    public virtual BloodRequest BloodRequest { get; set; } = null!;

    public Guid BloodUnitId { get; set; }
    public virtual BloodUnit BloodUnit { get; set; } = null!;

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public DateTime TransfusionDate { get; set; } // Ngày truyền
    public TimeSpan? StartTime { get; set; } // Giờ bắt đầu
    public TimeSpan? EndTime { get; set; } // Giờ kết thúc
    public decimal Volume { get; set; } // Thể tích đã truyền (ml)

    public Guid NurseId { get; set; } // Y tá thực hiện
    public virtual User Nurse { get; set; } = null!;

    public Guid? DoctorId { get; set; } // Bác sĩ giám sát
    public virtual User? Doctor { get; set; }

    // Theo dõi phản ứng
    public bool HasReaction { get; set; } // Có phản ứng
    public string? ReactionType { get; set; } // Loại phản ứng
    public string? ReactionDescription { get; set; } // Mô tả phản ứng
    public string? TreatmentForReaction { get; set; } // Xử lý phản ứng

    // Sinh hiệu trước và sau
    public string? VitalSignsBefore { get; set; } // Sinh hiệu trước
    public string? VitalSignsAfter { get; set; } // Sinh hiệu sau

    public int Status { get; set; } // 0-Đang chuẩn bị, 1-Đang truyền, 2-Hoàn thành, 3-Dừng do phản ứng, 4-Hủy
    public string? Note { get; set; }
}
