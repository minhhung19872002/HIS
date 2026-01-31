namespace HIS.Core.Entities;

/// <summary>
/// Yêu cầu phẫu thuật - Surgery Request
/// </summary>
public class SurgeryRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty; // Mã yêu cầu PT (PT + ngày + STT)

    // Thông tin bệnh nhân và lượt khám
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? ExaminationId { get; set; } // Lượt khám ngoại trú
    public virtual Examination? Examination { get; set; }

    public Guid? MedicalRecordId { get; set; } // Hồ sơ bệnh án (nội trú)
    public virtual MedicalRecord? MedicalRecord { get; set; }

    // Thông tin yêu cầu
    public DateTime RequestDate { get; set; } // Ngày yêu cầu
    public string SurgeryType { get; set; } = string.Empty; // Loại phẫu thuật: Phẫu thuật lớn, nhỏ, thăm dò, cấp cứu, v.v.

    public Guid RequestingDoctorId { get; set; } // Bác sĩ chỉ định
    public virtual User RequestingDoctor { get; set; } = null!;

    // Độ ưu tiên: 1-Bình thường, 2-Khẩn, 3-Cấp cứu
    public int Priority { get; set; } = 1;

    // Trạng thái: 0-Chờ lên lịch, 1-Đã lên lịch, 2-Đang thực hiện, 3-Hoàn thành, 4-Hủy
    public int Status { get; set; }

    // Chẩn đoán trước mổ
    public string? PreOpDiagnosis { get; set; }
    public string? PreOpIcdCode { get; set; }

    // Kế hoạch phẫu thuật
    public string? PlannedProcedure { get; set; } // Phương pháp PT dự kiến
    public int? EstimatedDuration { get; set; } // Thời gian dự kiến (phút)

    // Gây mê: 1-Gây mê toàn thân, 2-Gây tê tủy sống, 3-Gây têموضعی, 4-Khác
    public int? AnesthesiaType { get; set; }

    // Ghi chú
    public string? Notes { get; set; }
    public string? SpecialRequirements { get; set; } // Yêu cầu đặc biệt

    // Navigation
    public virtual ICollection<SurgerySchedule> Schedules { get; set; } = new List<SurgerySchedule>();
}

/// <summary>
/// Lịch phẫu thuật - Surgery Schedule
/// </summary>
public class SurgerySchedule : BaseEntity
{
    public Guid SurgeryRequestId { get; set; }
    public virtual SurgeryRequest SurgeryRequest { get; set; } = null!;

    // Phòng mổ
    public Guid OperatingRoomId { get; set; }
    public virtual OperatingRoom OperatingRoom { get; set; } = null!;

    // Thời gian
    public DateTime ScheduledDate { get; set; } // Ngày mổ
    public TimeSpan ScheduledTime { get; set; } // Giờ mổ
    public DateTime ScheduledDateTime { get; set; } // Ngày giờ mổ đầy đủ
    public int? EstimatedDuration { get; set; } // Thời gian dự kiến (phút)

    // Ekip phẫu thuật
    public Guid SurgeonId { get; set; } // Phẫu thuật viên chính
    public virtual User Surgeon { get; set; } = null!;

    public string? AssistantIds { get; set; } // JSON array - Phẫu thuật viên phụ

    public Guid? AnesthesiologistId { get; set; } // Bác sĩ gây mê
    public virtual User? Anesthesiologist { get; set; }

    public string? NurseIds { get; set; } // JSON array - Điều dưỡng

    // Trạng thái: 0-Đã lên lịch, 1-Đã xác nhận, 2-Đang chuẩn bị, 3-Đang mổ, 4-Hoàn thành, 5-Hủy, 6-Hoãn
    public int Status { get; set; }

    // Ghi chú
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual SurgeryRecord? SurgeryRecord { get; set; }
}

/// <summary>
/// Hồ sơ phẫu thuật - Surgery Record
/// </summary>
public class SurgeryRecord : BaseEntity
{
    public Guid SurgeryScheduleId { get; set; }
    public virtual SurgerySchedule SurgerySchedule { get; set; } = null!;

    // Thời gian thực tế
    public DateTime? ActualStartTime { get; set; } // Thời gian bắt đầu
    public DateTime? ActualEndTime { get; set; } // Thời gian kết thúc
    public int? ActualDuration { get; set; } // Thời gian thực tế (phút)

    // Thông tin phẫu thuật
    public string? ProcedurePerformed { get; set; } // Phương pháp PT đã thực hiện
    public string? ProcedureCode { get; set; } // Mã phương pháp PT

    // Kết quả phẫu thuật
    public string? Findings { get; set; } // Mô tả quá trình
    public string? Complications { get; set; } // Biến chứng
    public decimal? BloodLoss { get; set; } // Mất máu (ml)
    public string? Specimens { get; set; } // Mẫu bệnh phẩm gửi xét nghiệm

    // Chẩn đoán sau mổ
    public string? PostOpDiagnosis { get; set; }
    public string? PostOpIcdCode { get; set; }

    // Hướng dẫn sau mổ
    public string? PostOpInstructions { get; set; }
    public string? PostOpCare { get; set; } // Chăm sóc sau mổ

    // Kết quả: 1-Thành công, 2-Có biến chứng, 3-Tử vong
    public int? Result { get; set; }

    // Ghi chú
    public string? Notes { get; set; }

    // Phê duyệt
    public bool IsApproved { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Navigation
    public virtual ICollection<SurgeryTeamMember> TeamMembers { get; set; } = new List<SurgeryTeamMember>();
}

/// <summary>
/// Phòng mổ - Operating Room
/// </summary>
public class OperatingRoom : BaseEntity
{
    public string RoomCode { get; set; } = string.Empty; // Mã phòng mổ
    public string RoomName { get; set; } = string.Empty; // Tên phòng mổ

    // Loại phòng mổ: 1-Phòng mổ lớn, 2-Phòng mổ nhỏ, 3-Phòng mổ cấp cứu, 4-Phòng mổ chuyên khoa
    public int RoomType { get; set; }

    // Trạng thái: 1-Sẵn sàng, 2-Đang sử dụng, 3-Đang bảo trì, 4-Ngừng hoạt động
    public int Status { get; set; } = 1;

    // Thiết bị
    public string? Equipment { get; set; } // JSON - Danh sách thiết bị

    // Thông tin khác
    public int? Capacity { get; set; } // Sức chứa (số người)
    public string? Location { get; set; } // Vị trí
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual ICollection<SurgerySchedule> Schedules { get; set; } = new List<SurgerySchedule>();
}

/// <summary>
/// Thành viên ekip phẫu thuật - Surgery Team Member
/// </summary>
public class SurgeryTeamMember : BaseEntity
{
    public Guid SurgeryRecordId { get; set; }
    public virtual SurgeryRecord SurgeryRecord { get; set; } = null!;

    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    // Vai trò: 1-Phẫu thuật viên chính, 2-Phẫu thuật viên phụ, 3-Bác sĩ gây mê, 4-Điều dưỡng, 5-Kỹ thuật viên
    public int Role { get; set; }
    public string? RoleName { get; set; }

    // Thời gian tham gia
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }

    public string? Notes { get; set; }
}
