using iText.IO.Font;
using iText.IO.Font.Constants;
using iText.Kernel.Font;

namespace HIS.Infrastructure.Common;

/// <summary>
/// Fonts for generated PDFs that must render Vietnamese.
///
/// The iText standard fonts (Helvetica and friends) are Type1 with WinAnsi/Latin-1 encoding.
/// Latin-1 covers single-mark letters (à á ê ô õ í) but NOT the stacked-mark Vietnamese letters
/// (ế ố ứ ự ạ ầ ị ọ ợ ườ) or đ/Đ — iText drops those glyphs silently, which is why printed slips
/// came out as "PHIU S TH T" instead of "PHIẾU SỐ THỨ TỰ".
///
/// Noto Sans is embedded with IDENTITY_H so every Vietnamese code point survives. The container
/// image has no system fonts, so the font file must ship with the app (wwwroot/fonts).
/// </summary>
public static class VietnamesePdfFonts
{
    private const string RegularFile = "NotoSans-Regular.ttf";
    private const string BoldFile = "NotoSans-Bold.ttf";

    private static readonly object Gate = new();
    private static byte[]? _regularBytes;
    private static byte[]? _boldBytes;
    private static bool _regularLoaded;
    private static bool _boldLoaded;

    /// <summary>Body font. Falls back to Helvetica if the font file is missing from the deployment.</summary>
    public static PdfFont Regular() =>
        Create(ref _regularBytes, ref _regularLoaded, RegularFile, StandardFonts.HELVETICA);

    /// <summary>Heading font. Falls back to Helvetica-Bold if the font file is missing.</summary>
    public static PdfFont Bold() =>
        Create(ref _boldBytes, ref _boldLoaded, BoldFile, StandardFonts.HELVETICA_BOLD);

    private static PdfFont Create(ref byte[]? cache, ref bool loaded, string fileName, string fallback)
    {
        // The font BYTES are cached, not the PdfFont: a PdfFont instance belongs to the document
        // it was created for and must not be shared across documents.
        byte[]? bytes;
        lock (Gate)
        {
            if (!loaded)
            {
                cache = ReadFontFile(fileName);
                loaded = true;
            }
            bytes = cache;
        }

        if (bytes == null)
        {
            // Degraded but still printable — never fail a whole document over a missing font file.
            return PdfFontFactory.CreateFont(fallback);
        }

        return PdfFontFactory.CreateFont(bytes, PdfEncodings.IDENTITY_H,
            PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
    }

    private static byte[]? ReadFontFile(string fileName)
    {
        try
        {
            // Next to the assembly for a published app; under the content root when running
            // from the project folder (dotnet run), where wwwroot is not copied to bin.
            var candidates = new[]
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "fonts", fileName),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "fonts", fileName),
            };
            var path = candidates.FirstOrDefault(File.Exists);
            return path == null ? null : File.ReadAllBytes(path);
        }
        catch (Exception)
        {
            return null;
        }
    }
}
