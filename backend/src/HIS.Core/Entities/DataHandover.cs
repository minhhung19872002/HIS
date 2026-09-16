namespace HIS.Core.Entities;

/// <summary>
/// Biên bản bàn giao dữ liệu cho một đơn vị tiếp nhận (chuyển nhà cung cấp, bàn giao chi nhánh,
/// trích xuất theo yêu cầu cơ quan quản lý).
///
/// QA round 4 (2026-09-16): màn hình bàn giao trước đây gọi một hàm stub trả DTO giả — người dùng
/// thấy "đã tạo bàn giao" rồi mất trắng khi tải lại trang, và không có vết nào cho việc dữ liệu
/// bệnh nhân đã được giao cho ai. Đây là bảng lưu thật cho vết đó.
/// </summary>
public class DataHandover : BaseEntity
{
    /// <summary>Mã biên bản hiển thị cho người dùng, ví dụ BG-20260916-A1B2.</summary>
    public string HandoverCode { get; set; } = string.Empty;

    /// <summary>Thời điểm lập biên bản (giờ VN).</summary>
    public DateTime HandoverDate { get; set; }

    public string RecipientName { get; set; } = string.Empty;
    public string? RecipientOrganization { get; set; }
    public string? RecipientEmail { get; set; }

    /// <summary>Danh sách phân hệ được bàn giao, lưu dạng JSON mảng chuỗi.</summary>
    public string? ModulesJson { get; set; }

    public int TotalRecords { get; set; }
    public long TotalFileSize { get; set; }

    /// <summary>0=Đang chuẩn bị, 1=Sẵn sàng, 2=Đã bàn giao, 3=Đã xác nhận.</summary>
    public int Status { get; set; }

    public DateTime? DeliveredAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    /// <summary>Người bấm xác nhận đã nhận bàn giao.</summary>
    public Guid? ConfirmedByUserId { get; set; }

    public string? Remarks { get; set; }
}
