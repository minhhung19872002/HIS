namespace HIS.Core.Entities;

/// <summary>
/// Phòng hội chẩn video conference — Sprint 5 Item 1.4.
/// Tích hợp Jitsi Meet (meet.jit.si public hoặc self-host).
/// BS tạo phòng → invite link → các điểm cầu join bằng browser/mobile.
/// </summary>
public class ConsultationRoom : BaseEntity
{
    /// <summary>Jitsi room name — unique, dùng trong URL meet.jit.si/{roomName}</summary>
    public string RoomName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>
    /// Loại hội chẩn:
    /// 1 = CĐHA (DICOM study review)
    /// 2 = Nội trú (patient case)
    /// 3 = Tử vong (kiểm điểm)
    /// 4 = Tuyến trên (tele-consult với BV tuyến trên)
    /// 5 = Giảng dạy / đào tạo
    /// </summary>
    public int RoomType { get; set; }

    /// <summary>Nếu hội chẩn ca chụp cụ thể</summary>
    public string? StudyInstanceUID { get; set; }
    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public Guid HostUserId { get; set; }
    public virtual User? HostUser { get; set; }

    public DateTime ScheduledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    /// <summary>0=Scheduled, 1=Live, 2=Ended, 3=Cancelled</summary>
    public int Status { get; set; }

    /// <summary>Danh sách BS mời tham gia — JSON: [{userId, email, role, joined}]</summary>
    public string? ParticipantsJson { get; set; }

    /// <summary>Có ghi hình không</summary>
    public bool IsRecorded { get; set; }
    public string? RecordingUrl { get; set; }

    /// <summary>Password tùy chọn cho phòng</summary>
    public string? Password { get; set; }

    /// <summary>Ghi chú kết luận hội chẩn sau khi kết thúc</summary>
    public string? ConclusionNote { get; set; }
}

/// <summary>Người tham gia phòng hội chẩn + log join/leave</summary>
public class ConsultationParticipant : BaseEntity
{
    public Guid ConsultationRoomId { get; set; }
    public virtual ConsultationRoom? ConsultationRoom { get; set; }

    public Guid? UserId { get; set; }
    public virtual User? User { get; set; }

    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Role { get; set; }

    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
    public string? JoinIp { get; set; }
}
