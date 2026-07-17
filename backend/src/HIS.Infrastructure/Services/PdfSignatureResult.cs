namespace HIS.Infrastructure.Services;

public class PdfSignatureResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public byte[]? SignedPdfBytes { get; set; }
    public string? SignedFilePath { get; set; }
    public string? SignerName { get; set; }
    public string? SignedAt { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CertificateThumbprint { get; set; }
}
