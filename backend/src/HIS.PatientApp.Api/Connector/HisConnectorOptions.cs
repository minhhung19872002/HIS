namespace HIS.PatientApp.Api.Connector;

/// <summary>
/// Cấu hình kết nối tới HIS Core. Đọc từ section "HisConnector".
/// </summary>
public class HisConnectorOptions
{
    public const string SectionName = "HisConnector";

    /// <summary>Gốc API của HIS Core, ví dụ http://his-api:8080. Trong DC nên là địa chỉ nội bộ.</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Tài khoản dịch vụ trên HIS mà BFF dùng để gọi các API cần đăng nhập.
    ///
    /// ⚠️ Đây là tài sản nhạy cảm nhất của hệ thống này: nó nhìn được hồ sơ của MỌI bệnh nhân.
    /// Bắt buộc: (a) cấp một vai trò HIS riêng, chỉ đủ quyền đọc những gì app cần, KHÔNG dùng lại
    /// tài khoản admin; (b) mật khẩu đặt qua biến môi trường/secret store, không nằm trong file cấu
    /// hình được commit; (c) BFF tự áp phạm vi từng bệnh nhân trước khi gọi HIS, vì bản thân HIS
    /// tin tài khoản dịch vụ này.
    /// </summary>
    public string ServiceUsername { get; set; } = string.Empty;

    public string ServicePassword { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 20;

    /// <summary>Thời gian nhớ danh mục ít đổi (khoa, bác sĩ, dịch vụ) để đỡ đập vào HIS.</summary>
    public int CatalogCacheMinutes { get; set; } = 10;
}
