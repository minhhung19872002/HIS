using iText.Kernel.Font;
using iText.IO.Font;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Kernel.Colors;
using iText.IO.Image;
using iText.Signatures;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class PdfSignatureService
{
    #region Helper Methods

    /// <summary>
    /// Parse organization name (O= field) from X.509 certificate subject
    /// </summary>
    private static string? ParseOrganizationName(string? subject)
    {
        if (string.IsNullOrEmpty(subject)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(subject, @"O\s*=\s*([^,]+)");
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    /// <summary>
    /// Parse tax code (MST) from X.509 certificate subject
    /// </summary>
    private static string? ParseTaxCode(string? subject)
    {
        if (string.IsNullOrEmpty(subject)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(subject, @"(?:OID[\d.]*|SERIALNUMBER)\s*=\s*(?:MST:?\s*)?(\d{10,13})");
        if (match.Success) return match.Groups[1].Value.Trim();
        match = System.Text.RegularExpressions.Regex.Match(subject, @"MST:?\s*(\d{10,13})");
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    /// <summary>
    /// Build digital signature stamp text with green-bordered format.
    /// Format:
    ///   Signature Valid
    ///   Ký bởi: ...
    ///   Ký ngày: dd-MM-yyyy HH:mm:ss
    /// </summary>
    private static string BuildStampText(string certSubject, string signerName)
    {
        var orgName = ParseOrganizationName(certSubject) ?? signerName;
        var signedAt = DateTime.Now.ToString("dd-MM-yyyy HH:mm:ss");

        var lines = new System.Text.StringBuilder();
        lines.AppendLine("Signature Valid");
        lines.AppendLine($"Ký bởi: {orgName}");
        lines.Append($"Ký ngày: {signedAt}");
        return lines.ToString();
    }

    /// <summary>
    /// Configure visible signature appearance with Vietnamese stamp format + green checkmark PNG.
    /// Stamp size: 250x80 at bottom-right of last page.
    /// Matches Vietnamese CKS/USB Token stamp: text + green check mark image overlay.
    /// </summary>
    private void ConfigureStampAppearance(
        PdfSigner signer,
        string certSubject,
        string signerName,
        string reason,
        string location,
        int? targetPage = null)
    {
        var document = signer.GetDocument();
        var lastPage = document.GetNumberOfPages();
        var page = targetPage ?? lastPage;
        if (page <= 0 || page > lastPage) page = lastPage;

        // Stamp rectangle: bottom-right, A4 = 595x842 points
        float stampWidth = 250;
        float stampHeight = 80;
        float x = 595 - 36 - stampWidth; // right margin 36pt
        float y = 36; // bottom margin 36pt
        var rect = new iText.Kernel.Geom.Rectangle(x, y, stampWidth, stampHeight);

        signer.SetPageNumber(page);
        signer.SetPageRect(rect);

        var appearance = signer.GetSignatureAppearance();

        PdfFont? vietFont = null;
        try
        {
            vietFont = PdfFontFactory.CreateFont(_fontPath, PdfEncodings.IDENTITY_H, PdfFontFactory.EmbeddingStrategy.FORCE_EMBEDDED);
            appearance.SetLayer2Font(vietFont);
            appearance.SetLayer2FontSize(8);
        }
        catch { /* fallback to default font */ }

        appearance
            .SetReason(reason)
            .SetLocation(location)
            .SetContact(signerName)
            .SetSignatureCreator("HIS Digital Signature");

        // Set Vietnamese stamp text on Layer 2
        appearance.SetLayer2Text(BuildStampText(certSubject, signerName));

        // Draw green border + checkmark PNG image on Layer 0 (background - renders behind text)
        try
        {
            var layer0 = appearance.GetLayer0();
            var canvas = new iText.Kernel.Pdf.Canvas.PdfCanvas(layer0, document);

            // Draw green border rectangle
            canvas.SetStrokeColor(new iText.Kernel.Colors.DeviceRgb(0x52, 0xC4, 0x1A))
                  .SetLineWidth(2f)
                  .Rectangle(1, 1, stampWidth - 2, stampHeight - 2)
                  .Stroke();

            if (_checkmarkImageBytes != null && _checkmarkImageBytes.Length > 0)
            {
                var imageData = ImageDataFactory.Create(_checkmarkImageBytes);
                float imgSize = stampHeight * 0.85f;
                float imgX = stampWidth * 0.02f;
                float imgY = (stampHeight - imgSize) / 2;
                canvas.AddImageFittedIntoRectangle(imageData,
                    new iText.Kernel.Geom.Rectangle(imgX, imgY, imgSize, imgSize), false);
            }

            canvas.Release();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Could not draw checkmark on signature stamp");
        }
    }

    private void AddInfoRow(Table table, PdfFont font, PdfFont fontBold, string label, string value)
    {
        table.AddCell(new Cell()
            .Add(new Paragraph(label).SetFont(fontBold).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPaddingRight(5));
        table.AddCell(new Cell()
            .Add(new Paragraph(value).SetFont(font).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER));
    }

    private void AddInfoRowFullWidth(Table table, PdfFont font, PdfFont fontBold, string label, string value)
    {
        table.AddCell(new Cell()
            .Add(new Paragraph(label).SetFont(fontBold).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPaddingRight(5));
        table.AddCell(new Cell(1, 3)
            .Add(new Paragraph(value).SetFont(font).SetFontSize(10))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER));
    }

    #endregion
}
