namespace HIS.Core.Entities;

/// <summary>
/// Phiếu số kiosk self-service — do BN tự cấp qua màn hình kiosk bằng CCCD/thẻ BHYT.
///
/// Khác với <see cref="QueueTicket"/> (do nhân viên lễ tân tạo), KioskTicket do chính BN
/// tự thao tác nên không yêu cầu login.
///
/// Số thứ tự (TicketNumber) reset theo ngày VN, định dạng: {DeptPrefix}{NNN} (VD: A001).
/// </summary>
public class KioskTicket : BaseEntity
{
    /// <summary>Số thứ tự hiển thị, VD: A001, B023. Reset 0h mỗi ngày (VnTime).</summary>
    public string TicketNumber { get; set; } = string.Empty;

    /// <summary>Số thứ tự nguyên để sắp xếp.</summary>
    public int SequenceNumber { get; set; }

    /// <summary>Ngày phát số (local VN, chỉ DATE, dùng để reset chuỗi mỗi ngày).</summary>
    public DateTime IssueDate { get; set; }

    /// <summary>CCCD/CMND nếu BN quét thẻ căn cước.</summary>
    public string? CitizenId { get; set; }

    /// <summary>Số thẻ BHYT nếu BN quét thẻ bảo hiểm.</summary>
    public string? InsuranceCard { get; set; }

    /// <summary>Tên BN (từ kết quả tra cứu hoặc BN tự nhập).</summary>
    public string? PatientName { get; set; }

    /// <summary>Khoa/Phòng khám BN chọn.</summary>
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    /// <summary>Phòng cụ thể (nếu kiosk cho phép chọn phòng).</summary>
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }

    /// <summary>Loại dịch vụ: "OPD"=Khám ngoại trú, "LAB"=Xét nghiệm, "IMAGING"=CĐHA, "PHARMACY"=Nhà thuốc.</summary>
    public string? ServiceType { get; set; }

    /// <summary>
    /// Trạng thái phiếu:
    /// 0 = Chờ, 1 = Đã gọi, 2 = Hoàn tất, 3 = Hủy.
    /// </summary>
    public int Status { get; set; } = 0;

    /// <summary>Thời điểm phát số (UTC — dùng VnTime.DayRangeUtc khi query "hôm nay").</summary>
    public DateTime IssuedAt { get; set; }

    /// <summary>Thời điểm gọi số (UTC).</summary>
    public DateTime? CalledAt { get; set; }

    /// <summary>Ghi chú tùy chọn (ví dụ: BN cần hỗ trợ đặc biệt).</summary>
    public string? Note { get; set; }

    /// <summary>PatientId nếu tra cứu thành công qua CCCD/BHYT.</summary>
    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }
}
