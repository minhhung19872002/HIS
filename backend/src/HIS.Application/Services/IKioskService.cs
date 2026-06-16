using HIS.Application.DTOs.Kiosk;

namespace HIS.Application.Services;

/// <summary>
/// Self-service kiosk — cấp số, checkin bằng CCCD/BHYT, quản lý hàng chờ.
/// Các method IssueTicket/CheckinByCard/GetQueueStatus KHÔNG yêu cầu auth
/// (gọi từ [AllowAnonymous] endpoint — kiosk công cộng).
/// CallNext/CompleteTicket/CancelTicket yêu cầu nhân viên đăng nhập.
/// </summary>
public interface IKioskService
{
    /// <summary>
    /// Tự cấp số không cần thẻ (BN bấm tay hoặc nhận viên hỗ trợ).
    /// Số thứ tự tăng dần trong ngày VN, reset 0h mỗi ngày theo khoa.
    /// </summary>
    Task<KioskTicketDto> IssueTicketAsync(IssueTicketDto dto);

    /// <summary>
    /// Checkin bằng CCCD hoặc thẻ BHYT.
    /// Tra cứu BN trong hệ thống, tạo ticket và trả về kết quả kèm thông tin BN (đã che).
    /// </summary>
    Task<CheckinResultDto> CheckinByCardAsync(CheckinByCardDto dto);

    /// <summary>
    /// Lấy danh sách hàng chờ theo khoa/phòng (dùng cho màn hình QueueDisplay và kiosk).
    /// </summary>
    Task<QueueStatusDto> GetQueueStatusAsync(Guid? departmentId, Guid? roomId);

    /// <summary>
    /// Gọi số tiếp theo (nhân viên lễ tân bấm nút gọi).
    /// Chuyển phiếu chờ → Đã gọi (Status=1).
    /// </summary>
    Task<KioskTicketDto?> CallNextAsync(CallNextDto dto);

    /// <summary>
    /// Hoàn tất phiếu (BN đã được phục vụ xong). Status → 2.
    /// </summary>
    Task<KioskTicketDto> CompleteTicketAsync(Guid ticketId);

    /// <summary>
    /// Hủy phiếu (BN rời đi hoặc nhân viên bỏ qua). Status → 3.
    /// </summary>
    Task<KioskTicketDto> CancelTicketAsync(Guid ticketId);

    /// <summary>
    /// Lấy chi tiết một phiếu theo Id.
    /// </summary>
    Task<KioskTicketDto?> GetByIdAsync(Guid id);
}
