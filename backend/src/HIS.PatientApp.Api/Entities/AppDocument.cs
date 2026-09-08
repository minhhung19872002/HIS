namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Một giấy tờ trong ví của người bệnh (HSMT I.2 #8).
///
/// <para>Bảng này chỉ giữ <b>siêu dữ liệu</b>. Nội dung tệp nằm ngoài CSDL, đã mã hoá, tại
/// <see cref="StoragePath"/> — đọc thẳng tệp trên đĩa không ra nội dung. Khoá nằm trong cấu hình
/// máy chủ, không nằm cạnh dữ liệu.</para>
/// </summary>
public class AppDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    /// <summary>Xem <see cref="AppDocumentCategory"/>.</summary>
    public string Category { get; set; } = AppDocumentCategory.Other;

    /// <summary>Tên người dùng đặt. Mặc định lấy tên tệp.</summary>
    public string Title { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }

    /// <summary>Đường dẫn tương đối tới tệp đã mã hoá, tính từ thư mục gốc của ví.</summary>
    public string StoragePath { get; set; } = string.Empty;

    /// <summary>Nonce của AES-GCM, mỗi tệp một giá trị ngẫu nhiên riêng.</summary>
    public byte[] Nonce { get; set; } = Array.Empty<byte>();

    /// <summary>Thẻ xác thực của AES-GCM — sửa một byte trong tệp là giải mã hỏng ngay.</summary>
    public byte[] Tag { get; set; } = Array.Empty<byte>();

    /// <summary>SHA-256 của nội dung gốc, để phát hiện tệp trùng và kiểm tra toàn vẹn.</summary>
    public string Sha256 { get; set; } = string.Empty;

    /// <summary>manual = người dùng tự thêm · his = giấy tờ do bệnh viện xuất ra.</summary>
    public string Source { get; set; } = "manual";

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Nhóm giấy tờ theo đúng những thứ người bệnh thật sự cầm theo khi đi khám.
/// </summary>
public static class AppDocumentCategory
{
    public const string IdentityCard = "IdentityCard";      // CCCD/CMND
    public const string InsuranceCard = "InsuranceCard";    // thẻ BHYT
    public const string Referral = "Referral";              // giấy chuyển tuyến
    public const string Appointment = "Appointment";        // giấy hẹn khám
    public const string DischargePaper = "DischargePaper";  // giấy ra viện
    public const string Prescription = "Prescription";      // toa thuốc
    public const string Invoice = "Invoice";                // hoá đơn, biên lai
    public const string Other = "Other";

    public static readonly string[] All =
    {
        IdentityCard, InsuranceCard, Referral, Appointment,
        DischargePaper, Prescription, Invoice, Other,
    };

    public static bool IsValid(string? value) => value is not null && All.Contains(value);
}
