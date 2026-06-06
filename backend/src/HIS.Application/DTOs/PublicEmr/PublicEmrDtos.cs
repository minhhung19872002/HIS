namespace HIS.Application.DTOs.PublicEmr;

/// <summary>
/// Yêu cầu tra cứu công khai hồ sơ bệnh án đã ký số.
/// BẮT BUỘC 2 yếu tố: CCCD + ngày sinh (chống dò quét).
/// </summary>
public class PublicEmrLookupRequest
{
    /// <summary>Số CCCD/CMND của bệnh nhân.</summary>
    public string IdentityNumber { get; set; } = string.Empty;

    /// <summary>Ngày sinh (chuỗi yyyy-MM-dd hoặc ISO). Dùng để xác thực 2 yếu tố.</summary>
    public string DateOfBirth { get; set; } = string.Empty;
}

/// <summary>Một tài liệu HSBA đã ký số trả về cho bệnh nhân (chỉ metadata cần thiết).</summary>
public class PublicEmrDocumentDto
{
    public Guid DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentTypeName { get; set; } = string.Empty;
    public string DocumentCode { get; set; } = string.Empty;
    public string SignedAt { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? SignerName { get; set; }
    public string? CaProvider { get; set; }
}

/// <summary>Kết quả tra cứu công khai.</summary>
public class PublicEmrLookupResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }

    /// <summary>Token ngắn hạn cấp cho phiên tra cứu, dùng để tải PDF (không cho đoán documentId tự do).</summary>
    public string? Token { get; set; }

    /// <summary>Tên bệnh nhân đã che bớt (để người tra cứu xác nhận đúng người).</summary>
    public string? PatientNameMasked { get; set; }

    public List<PublicEmrDocumentDto> Documents { get; set; } = new();
}

/// <summary>Nội dung file PDF đã ký trả về (dùng nội bộ service → controller).</summary>
public class PublicEmrDocumentFileDto
{
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/pdf";
}
