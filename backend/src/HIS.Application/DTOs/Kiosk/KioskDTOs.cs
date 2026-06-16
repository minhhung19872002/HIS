namespace HIS.Application.DTOs.Kiosk;

// ── Request DTOs ──────────────────────────────────────────────────────────────

/// <summary>
/// Yêu cầu tự cấp số không cần thẻ (BN điền tay).
/// </summary>
public class IssueTicketDto
{
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    /// <summary>OPD / LAB / IMAGING / PHARMACY</summary>
    public string? ServiceType { get; set; }
    public string? PatientName { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Checkin bằng CCCD hoặc thẻ BHYT — kiosk quét hoặc BN nhập số thẻ.
/// Phải cung cấp ít nhất một trong hai.
/// </summary>
public class CheckinByCardDto
{
    public string? CitizenId { get; set; }
    public string? InsuranceCard { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    public string? ServiceType { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Gọi số tiếp theo (dùng bởi nhân viên lễ tân).
/// </summary>
public class CallNextDto
{
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

/// <summary>
/// Thông tin phiếu số trả về cho kiosk (hiển thị + in).
/// KHÔNG chứa PII nhạy cảm (CMND/BHYT đầy đủ) để an toàn khi AllowAnonymous.
/// </summary>
public class KioskTicketDto
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
    /// <summary>Tên BN (nếu có), để hiển thị trên màn hình kiosk.</summary>
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
    public string? RoomName { get; set; }
    public string? ServiceType { get; set; }
    /// <summary>0=Chờ 1=Đã gọi 2=Hoàn tất 3=Hủy</summary>
    public int Status { get; set; }
    public string StatusLabel => Status switch
    {
        0 => "Đang chờ",
        1 => "Đang được gọi",
        2 => "Hoàn tất",
        3 => "Đã hủy",
        _ => "Không xác định"
    };
    public DateTime IssuedAt { get; set; }
    public DateTime? CalledAt { get; set; }
    public string? Note { get; set; }

    /// <summary>
    /// Gợi ý số người chờ trước phiếu này (thông tin phi nhạy cảm).
    /// </summary>
    public int? PeopleAheadInQueue { get; set; }
}

/// <summary>
/// Kết quả checkin bằng thẻ — trả về ticket + thông tin BN nếu tìm thấy.
/// </summary>
public class CheckinResultDto
{
    public KioskTicketDto Ticket { get; set; } = null!;
    /// <summary>true nếu tìm thấy BN trong hệ thống.</summary>
    public bool PatientFound { get; set; }
    /// <summary>Tên hiển thị (che bớt, VD: "Nguyễn V** A").</summary>
    public string? MaskedPatientName { get; set; }
    /// <summary>Cảnh báo nếu thẻ BHYT sắp hết hạn.</summary>
    public string? InsuranceWarning { get; set; }
}

/// <summary>
/// Danh sách hàng chờ (cho màn hình queue display tại phòng chờ).
/// </summary>
public class QueueStatusDto
{
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int WaitingCount { get; set; }
    public string? CurrentCalledTicket { get; set; }
    public List<KioskTicketDto> WaitingTickets { get; set; } = new();
}
