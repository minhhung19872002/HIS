namespace HIS.Infrastructure.Services;

public class PdfGenerationResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public byte[]? PdfBytes { get; set; }
    public string? FilePath { get; set; }
}
