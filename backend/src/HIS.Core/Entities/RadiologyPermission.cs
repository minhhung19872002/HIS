namespace HIS.Core.Entities;

/// <summary>
/// Phân quyền RIS/PACS per user × machine — Sprint 4 Item 2.16.
/// Mirror MQ Solutions + VRPACS: mỗi user có thể có quyền khác nhau trên mỗi máy chụp.
///
/// 11 quyền (bit flags):
/// 0x0001 = ChiXem (Read-only)
/// 0x0002 = XoaCa (Delete study)
/// 0x0004 = DocKQ (Read + return result)
/// 0x0008 = CapNhatHIS (Update from HIS)
/// 0x0010 = DuyetKQ (Approve result)
/// 0x0020 = ChiaSe (Share study)
/// 0x0040 = HoiChan (Consultation)
/// 0x0080 = ThongKe (Statistics/reports)
/// 0x0100 = HuyHoiChan (Cancel consultation)
/// 0x0200 = HuyDuyet (Revoke approval)
/// 0x0400 = ChinhSuaKQ (Edit approved result)
/// </summary>
public class RadiologyPermission : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    /// <summary>Null = áp dụng cho TẤT CẢ máy chụp. Có giá trị = chỉ máy cụ thể.</summary>
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public string? ModalityType { get; set; }

    /// <summary>Bit flags 11 quyền</summary>
    public int Permissions { get; set; }

    /// <summary>Role mặc định: "chup" = KTV chỉ chụp; "doc" = BS chỉ đọc/duyệt</summary>
    public string? RoleTemplate { get; set; }

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Điều phối CĐHA — Sprint 4 Item 2.16.
/// Dispatcher xếp BN vào phòng/máy chụp cụ thể.
/// </summary>
public class RadiologyDispatch : BaseEntity
{
    public Guid ServiceRequestDetailId { get; set; }
    public virtual ServiceRequestDetail? ServiceRequestDetail { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public Guid RoomId { get; set; }
    public virtual Room? Room { get; set; }

    public string? ModalityType { get; set; }

    public Guid DispatchedByUserId { get; set; }
    public virtual User? DispatchedByUser { get; set; }

    public DateTime DispatchedAt { get; set; }
    public int Priority { get; set; }

    public bool IsArrived { get; set; }
    public DateTime? ArrivedAt { get; set; }
    public bool IsPerformed { get; set; }
    public DateTime? PerformedAt { get; set; }

    public string? Note { get; set; }
}
