namespace HIS.Application.DTOs.Insurance;

/// <summary>
/// #441: payload đợt XML cần ký. Client (plugin USB-token) tải về, ký bằng khóa trong token,
/// rồi POST chữ ký lại. **Backend KHÔNG BAO GIỜ giữ khóa bí mật.**
/// </summary>
public class XmlSignPayloadDto
{
    public Guid BatchId { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    /// <summary>Tên file gợi ý khi client lưu tạm.</summary>
    public string FileName { get; set; } = string.Empty;
    /// <summary>Nội dung ZIP chứa toàn bộ file XML của đợt (base64) — chính là thứ được ký.</summary>
    public string ContentBase64 { get; set; } = string.Empty;
    /// <summary>SHA-256 của nội dung trên (base64) — client đối chiếu trước khi ký.</summary>
    public string DigestBase64 { get; set; } = string.Empty;
    public string HashAlgorithm { get; set; } = "SHA-256";
}

/// <summary>#441: chữ ký client gửi lên sau khi ký bằng USB-token.</summary>
public class SubmitXmlSignatureDto
{
    /// <summary>Giá trị chữ ký (base64) ký trên NỘI DUNG zip của đợt.</summary>
    public string SignatureValue { get; set; } = string.Empty;
    /// <summary>Chứng thư số công khai (base64 DER hoặc PEM) dùng để ký — BE verify bằng public key này.</summary>
    public string CertificateBase64 { get; set; } = string.Empty;
    public string? TokenSerial { get; set; }
    /// <summary>VNPT-CA · Viettel-CA · BKAV-CA · FPT-CA …</summary>
    public string? CaProvider { get; set; }
    public string HashAlgorithm { get; set; } = "SHA-256";
}

/// <summary>#441: kết quả ghi nhận chữ ký.</summary>
public class XmlSignatureResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Guid? SignatureId { get; set; }
    public string? CertificateSubject { get; set; }
    public DateTime? SignedAt { get; set; }
}
