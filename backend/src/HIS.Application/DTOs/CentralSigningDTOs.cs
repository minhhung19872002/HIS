namespace HIS.Application.DTOs;

// ============ Central Signing API DTOs (NangCap6 - BV Xanh Pon) ============

/// <summary>Request to sign hash data (API #2)</summary>
public class SignHashRequest
{
    /// <summary>Base64-encoded hash value to sign</summary>
    public string HashBase64 { get; set; } = string.Empty;
    /// <summary>Hash algorithm: SHA1, SHA256, SHA384, SHA512</summary>
    public string HashAlgorithm { get; set; } = "SHA256";
    /// <summary>Optional PIN (uses cached session if null)</summary>
    public string? Pin { get; set; }
}

/// <summary>Request to sign raw data (API #3)</summary>
public class SignRawRequest
{
    /// <summary>Base64-encoded raw data to sign</summary>
    public string DataBase64 { get; set; } = string.Empty;
    /// <summary>Hash algorithm: SHA1, SHA256</summary>
    public string HashAlgorithm { get; set; } = "SHA256";
    public string? Pin { get; set; }
}

/// <summary>Request to sign PDF invisibly (API #4)</summary>
public class SignPdfInvisibleRequest
{
    /// <summary>Base64-encoded PDF bytes</summary>
    public string PdfBase64 { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Pin { get; set; }
}

/// <summary>Request to sign PDF with visible signature at position (API #9)</summary>
public class SignPdfVisibleRequest
{
    public string PdfBase64 { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    /// <summary>Page number (1-based), 0 = last page</summary>
    public int Page { get; set; } = 0;
    /// <summary>X coordinate (pt from left)</summary>
    public float X { get; set; } = 36;
    /// <summary>Y coordinate (pt from bottom)</summary>
    public float Y { get; set; } = 36;
    /// <summary>Signature box width (pt)</summary>
    public float Width { get; set; } = 200;
    /// <summary>Signature box height (pt)</summary>
    public float Height { get; set; } = 80;
    /// <summary>Font size for text in signature</summary>
    public float FontSize { get; set; } = 10;
    /// <summary>Font color hex (e.g. #000080)</summary>
    public string FontColor { get; set; } = "#000080";
    /// <summary>Show signer name, date, certificate info</summary>
    public bool ShowDetails { get; set; } = true;
    /// <summary>Base64-encoded signature image (optional)</summary>
    public string? SignatureImageBase64 { get; set; }
    public string? Pin { get; set; }
}

/// <summary>Request to sign XML data (API #11)</summary>
public class SignXmlRequest
{
    /// <summary>XML content string</summary>
    public string XmlContent { get; set; } = string.Empty;
    /// <summary>XPath for signature node (optional)</summary>
    public string? SignatureNodeXPath { get; set; }
    public string? Pin { get; set; }
}

/// <summary>Request to verify raw data signature (API #5)</summary>
public class VerifyRawRequest
{
    /// <summary>Base64-encoded original data</summary>
    public string DataBase64 { get; set; } = string.Empty;
    /// <summary>Base64-encoded CMS/PKCS#7 signature</summary>
    public string SignatureBase64 { get; set; } = string.Empty;
}

/// <summary>Request to verify hash signature (API #6)</summary>
public class VerifyHashRequest
{
    /// <summary>Base64-encoded original hash</summary>
    public string HashBase64 { get; set; } = string.Empty;
    /// <summary>Base64-encoded signature</summary>
    public string SignatureBase64 { get; set; } = string.Empty;
    public string HashAlgorithm { get; set; } = "SHA256";
}

/// <summary>Request to verify a signed PDF (API #10, #12)</summary>
public class VerifyPdfRequest
{
    /// <summary>Base64-encoded signed PDF</summary>
    public string PdfBase64 { get; set; } = string.Empty;
}

/// <summary>Generic signing result</summary>
public class CentralSigningResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? SignatureBase64 { get; set; }
    public string? SignerName { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CaProvider { get; set; }
    public string? SignedAt { get; set; }
    public string? HashAlgorithm { get; set; }
    public string? TsaTimestamp { get; set; }
}

/// <summary>PDF signing result (includes signed PDF bytes)</summary>
public class PdfSigningResult : CentralSigningResult
{
    /// <summary>Base64-encoded signed PDF</summary>
    public string? SignedPdfBase64 { get; set; }
}

/// <summary>XML signing result</summary>
public class XmlSigningResult : CentralSigningResult
{
    /// <summary>Signed XML content</summary>
    public string? SignedXmlContent { get; set; }
}

/// <summary>PDF verification result</summary>
public class PdfVerificationResult
{
    public bool Valid { get; set; }
    public string? Message { get; set; }
    public int SignatureCount { get; set; }
    public List<PdfSignatureInfo> Signatures { get; set; } = new();
}

public class PdfSignatureInfo
{
    public string SignerName { get; set; } = string.Empty;
    public string CertificateSerial { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public DateTime SignedAt { get; set; }
    public bool IsValid { get; set; }
    public bool CertificateValid { get; set; }
    public string? TsaTimestamp { get; set; }
    public string? Reason { get; set; }
    public string? Location { get; set; }
}

/// <summary>Signature image result (API #7)</summary>
public class SignatureImageResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    /// <summary>Base64-encoded PNG image</summary>
    public string? ImageBase64 { get; set; }
    public string? SignerName { get; set; }
    public string? CertificateSerial { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

/// <summary>Data verification result (API #5, #6)</summary>
public class DataVerificationResult
{
    public bool Valid { get; set; }
    public string? Message { get; set; }
    public string? SignerName { get; set; }
    public string? CertificateSerial { get; set; }
    public string? Issuer { get; set; }
    public DateTime? SignedAt { get; set; }
    public bool CertificateValid { get; set; }
}

// ============ Admin Management DTOs ============

/// <summary>Signing certificate managed by admin</summary>
public class ManagedCertificateDto
{
    public Guid Id { get; set; }
    public string SerialNumber { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string IssuerName { get; set; } = string.Empty;
    public string CaProvider { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool IsActive { get; set; }
    public string? OwnerUserId { get; set; }
    public string? OwnerFullName { get; set; }
    public string? Cccd { get; set; }
    public string? SignatureImagePath { get; set; }
    public string StorageType { get; set; } = string.Empty; // Token, HSM, Server
    public DateTime CreatedAt { get; set; }
}

/// <summary>Create/update managed certificate</summary>
public class SaveManagedCertificateRequest
{
    public Guid? Id { get; set; }
    public string SerialNumber { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string IssuerName { get; set; } = string.Empty;
    public string CaProvider { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
    public string? OwnerUserId { get; set; }
    public string? Cccd { get; set; }
    public string StorageType { get; set; } = "Token";
}

/// <summary>Signing transaction record</summary>
public class SigningTransactionDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // SignHash, SignRaw, SignPdf, SignXml, Verify
    public string DataType { get; set; } = string.Empty; // hash, raw, pdf, xml
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CaProvider { get; set; }
    public string? HashAlgorithm { get; set; }
    public long DataSizeBytes { get; set; }
    public int DurationMs { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}

/// <summary>Search signing transactions</summary>
public class SigningTransactionSearchDto
{
    public string? UserId { get; set; }
    public string? Action { get; set; }
    public string? DataType { get; set; }
    public bool? Success { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? Keyword { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

/// <summary>Signing statistics</summary>
public class SigningStatisticsDto
{
    public int TotalTransactions { get; set; }
    public int TotalSuccess { get; set; }
    public int TotalFailed { get; set; }
    public int ActiveCertificates { get; set; }
    public int ExpiringSoon { get; set; } // within 30 days
    public int ExpiredCertificates { get; set; }
    public int ActiveUsers { get; set; }
    public int TodayTransactions { get; set; }
    public List<SigningDailyCount> DailyTrend { get; set; } = new();
    public List<SigningByTypeCount> ByType { get; set; } = new();
    public List<SigningByUserCount> TopUsers { get; set; } = new();
}

public class SigningDailyCount { public string Date { get; set; } = string.Empty; public int Count { get; set; } }
public class SigningByTypeCount { public string DataType { get; set; } = string.Empty; public int Count { get; set; } }
public class SigningByUserCount { public string UserFullName { get; set; } = string.Empty; public int Count { get; set; } }

/// <summary>Signature appearance configuration</summary>
public class SignatureAppearanceDto
{
    public string Position { get; set; } = "bottom-right"; // bottom-right, bottom-left, top-right, top-left, custom
    public int Page { get; set; } = 0; // 0 = last page
    public float X { get; set; } = 36;
    public float Y { get; set; } = 36;
    public float Width { get; set; } = 200;
    public float Height { get; set; } = 80;
    public string FontFamily { get; set; } = "Times New Roman";
    public float FontSize { get; set; } = 10;
    public string FontColor { get; set; } = "#000080";
    public bool ShowSignerName { get; set; } = true;
    public bool ShowDate { get; set; } = true;
    public bool ShowCertSerial { get; set; } = true;
    public bool ShowCaLogo { get; set; } = false;
    public string? BackgroundImageBase64 { get; set; }
}

/// <summary>HSM management DTO</summary>
public class HsmInfoDto
{
    public bool Connected { get; set; }
    public string? Model { get; set; }
    public string? FirmwareVersion { get; set; }
    public int TotalSlots { get; set; }
    public int UsedSlots { get; set; }
    public int AvailableSlots { get; set; }
    public List<HsmSlotDto> Slots { get; set; } = new();
}

public class HsmSlotDto
{
    public int SlotId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? CertificateSerial { get; set; }
    public string? SubjectName { get; set; }
    public bool IsOccupied { get; set; }
}

/// <summary>Create CSR request for HSM</summary>
public class CreateCsrRequest
{
    public string CommonName { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public string OrganizationUnit { get; set; } = string.Empty;
    public string Country { get; set; } = "VN";
    public string Province { get; set; } = string.Empty;
    public int KeySize { get; set; } = 2048;
}

public class CsrResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? CsrPem { get; set; }
}

/// <summary>Upload signature image by CCCD</summary>
public class UploadSignatureImageRequest
{
    public string Cccd { get; set; } = string.Empty;
    /// <summary>Base64-encoded PNG/JPEG image</summary>
    public string ImageBase64 { get; set; } = string.Empty;
}

/// <summary>TOTP setup for signing authentication</summary>
public class SigningTotpSetupDto
{
    public bool Enabled { get; set; }
    public string? SecretKey { get; set; }
    public string? QrCodeUri { get; set; }
    public string? ManualEntryKey { get; set; }
}

/// <summary>TOTP verification for signing</summary>
public class SigningTotpVerifyRequest
{
    public string OtpCode { get; set; } = string.Empty;
}
