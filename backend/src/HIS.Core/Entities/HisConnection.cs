namespace HIS.Core.Entities;

/// <summary>
/// Kết nối HIS bên thứ ba / đa cơ sở — lưu endpoint metadata, KHÔNG lưu secret thẳng.
/// AuthType: "ApiKey" | "Bearer" | "Basic" | "None".
/// LastStatus: "Online" | "Offline" | "Unknown".
/// ApiKeyRef: tên key trong bảng SystemConfig (VD: "HisConn_Hospital2_ApiKey") — giá trị
///   thực được lấy ở runtime qua SystemConfig, không bao giờ persist vào bảng này.
/// </summary>
public class HisConnection : BaseEntity
{
    /// <summary>Tên hiển thị, VD: "BV Huyện B - HIS VNPT"</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Nhà cung cấp / vendor: "VNPT", "Viettel", "Medlatec", "Custom", …</summary>
    public string? Provider { get; set; }

    /// <summary>Base URL của HIS đối tác, VD: "https://his.hospital-b.vn/api"</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Phương thức xác thực: "ApiKey" | "Bearer" | "Basic" | "None"</summary>
    public string? AuthType { get; set; }

    /// <summary>
    /// Tên key trong SystemConfig lưu giá trị secret tương ứng.
    /// VD: "HisConn_HospitalB_ApiKey". KHÔNG lưu secret thẳng vào field này.
    /// </summary>
    public string? ApiKeyRef { get; set; }

    /// <summary>Kết nối đang hoạt động hay bị vô hiệu hoá</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Lần kiểm tra ping cuối cùng (UTC)</summary>
    public DateTime? LastCheckedAt { get; set; }

    /// <summary>Trạng thái sau lần ping cuối: "Online" | "Offline" | "Unknown"</summary>
    public string? LastStatus { get; set; }

    /// <summary>Ghi chú tuỳ chọn (mô tả, lý do vô hiệu, …)</summary>
    public string? Notes { get; set; }
}
