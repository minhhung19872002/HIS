namespace HIS.Core.Entities;

/// <summary>
/// Hệ thống xếp hàng - Queue System
/// </summary>
public class QueueTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty; // Số thứ tự
    public int QueueNumber { get; set; } // Số thứ tự (số)
    public DateTime IssueDate { get; set; } // Ngày phát số
    public DateTime? CalledTime { get; set; } // Thời gian gọi
    public DateTime? CompletedTime { get; set; } // Thời gian hoàn thành

    public int QueueType { get; set; } // 1-Tiếp đón, 2-Khám bệnh, 3-Xét nghiệm, 4-CĐHA, 5-Nhà thuốc, 6-Thanh toán
    public int Priority { get; set; } // 0-Bình thường, 1-Ưu tiên, 2-Cấp cứu
    public int Status { get; set; } // 0-Chờ, 1-Đang gọi, 2-Đang phục vụ, 3-Hoàn thành, 4-Bỏ qua

    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public Guid? RoomId { get; set; } // Phòng đang xếp hàng
    public virtual Room? Room { get; set; }

    public Guid? CounterId { get; set; } // Quầy/cửa phục vụ

    public Guid? CalledByUserId { get; set; } // Người gọi số
    public virtual User? CalledByUser { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// Cấu hình xếp hàng theo phòng - Queue Configuration
/// </summary>
public class QueueConfiguration : BaseEntity
{
    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    public int QueueType { get; set; } // Loại hàng chờ
    public string Prefix { get; set; } = string.Empty; // Tiền tố số (VD: A, B, C)
    public int StartNumber { get; set; } = 1; // Số bắt đầu
    public int CurrentNumber { get; set; } = 0; // Số hiện tại
    public bool ResetDaily { get; set; } = true; // Reset mỗi ngày
    public DateTime LastResetDate { get; set; } // Ngày reset cuối

    public int MaxPatients { get; set; } // Số BN tối đa/ngày
    public int MaxInsurancePatients { get; set; } // Số BN BHYT tối đa
    public TimeSpan? StartTime { get; set; } // Giờ bắt đầu
    public TimeSpan? EndTime { get; set; } // Giờ kết thúc

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Thẻ bảo hiểm y tế - InsuranceCard
/// </summary>
public class InsuranceCard : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public string CardNumber { get; set; } = string.Empty; // Số thẻ BHYT
    public DateTime? StartDate { get; set; } // Ngày bắt đầu
    public DateTime? EndDate { get; set; } // Ngày hết hạn
    public string? FacilityCode { get; set; } // Mã CSKCB ban đầu
    public string? FacilityName { get; set; } // Tên CSKCB

    public int CardType { get; set; } // Loại thẻ
    public int PaymentRate { get; set; } = 80; // Tỷ lệ thanh toán mặc định 80%

    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? VerifiedAt { get; set; } // Thời gian xác thực
    public string? VerificationStatus { get; set; } // Kết quả xác thực
}

/// <summary>
/// Màn hình chờ - Display Screen
/// </summary>
public class DisplayScreen : BaseEntity
{
    public string ScreenCode { get; set; } = string.Empty;
    public string ScreenName { get; set; } = string.Empty;
    public int ScreenType { get; set; } // 1-Tiếp đón, 2-Phòng khám, 3-CLS, 4-Nhà thuốc
    public string? Location { get; set; }
    public string? IpAddress { get; set; }

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public string? Configuration { get; set; } // JSON cấu hình màn hình
    public bool IsActive { get; set; } = true;
}
