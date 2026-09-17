using System.Globalization;
using System.Reflection;
using System.Text;
using HIS.Application.DTOs.Reporting;

namespace HIS.Infrastructure.Services.Export;

/// <summary>A rendered report file: bytes + MIME type + file extension (without dot).</summary>
public sealed record ReportFile(byte[] Content, string ContentType, string Extension);

/// <summary>A report as a plain table (header row + value rows) — the common shape every renderer takes.</summary>
public sealed record ReportTable(string Title, string? Subtitle, IReadOnlyList<string> Headers, IReadOnlyList<IReadOnlyList<object?>> Rows);

/// <summary>
/// QA-R3: one place that turns report data into a real file. Print/export endpoints used to return HTML
/// bytes under application/pdf or .xlsx names (Excel refused to open them, PDF viewers showed garbage) and
/// every report type printed the same table. Callers now fetch the report's own data and render it here.
/// </summary>
public static class ReportFileRenderer
{
    public const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    public const string PdfMime = "application/pdf";
    public const string HtmlMime = "text/html; charset=utf-8";

    /// <summary>"excel"/"xlsx" → xlsx, "pdf" → pdf, anything else (html/print/null) → printable HTML.</summary>
    public static string NormalizeFormat(string? format) => (format ?? "").Trim().ToLowerInvariant() switch
    {
        "excel" or "xlsx" or "xls" => "xlsx",
        "pdf" => "pdf",
        _ => "html",
    };

    public static ReportFile Render(ReportTable table, string? format) => NormalizeFormat(format) switch
    {
        "xlsx" => new ReportFile(ToXlsx(table), XlsxMime, "xlsx"),
        "pdf" => new ReportFile(HtmlToPdf(ToHtml(table)), PdfMime, "pdf"),
        _ => new ReportFile(Encoding.UTF8.GetBytes(ToHtml(table)), HtmlMime, "html"),
    };

    public static string ToHtml(ReportTable table)
    {
        var rows = table.Rows.Select(r => r.Select(FormatCell).ToArray()).ToList();
        if (rows.Count == 0)
            rows.Add(new[] { "Không có dòng dữ liệu trong kỳ báo cáo" }.Concat(Enumerable.Repeat("", Math.Max(0, table.Headers.Count - 1))).ToArray());
        return PdfTemplateHelper.BuildTableReport(table.Title, table.Subtitle, DateTime.Now, table.Headers.ToArray(), rows);
    }

    public static byte[] ToXlsx(ReportTable table)
    {
        var rows = table.Rows.Select((r, i) => (IReadOnlyList<object?>)new object?[] { i + 1 }.Concat(r.Select(XlsxCell)).ToArray()).ToList();
        return SimpleXlsxWriter.Build(new[]
        {
            new XlsxSheet(table.Title, new[] { "STT" }.Concat(table.Headers).ToArray(), rows)
        });
    }

    /// <summary>
    /// QA-R10: list exports that still built the printable HTML and served it as ".xlsx" (Excel refuses to
    /// open an .xlsx that is not a ZIP). Same headers/rows, real workbook. A leading "STT" header means the
    /// rows already carry their own row number.
    /// </summary>
    public static byte[] TableToXlsx(string title, IReadOnlyList<string> headers, IEnumerable<string[]> rows)
    {
        var hasStt = headers.Count > 0 && string.Equals(headers[0], "STT", StringComparison.OrdinalIgnoreCase);
        var list = rows.Select((r, i) => (IReadOnlyList<object?>)(hasStt
            ? r.Cast<object?>().ToArray()
            : new object?[] { i + 1 }.Concat(r).ToArray())).ToList();
        var cols = hasStt ? headers : new[] { "STT" }.Concat(headers).ToArray();
        return SimpleXlsxWriter.Build(new[] { new XlsxSheet(title, cols, list) });
    }

    /// <summary>Render report HTML to a real PDF with Vietnamese-capable fonts (Windows + Linux container).</summary>
    public static byte[] HtmlToPdf(string html)
    {
        using var htmlStream = new MemoryStream(Encoding.UTF8.GetBytes(html));
        using var outputStream = new MemoryStream();
        var fontProvider = new iText.Layout.Font.FontProvider();
        fontProvider.AddStandardPdfFonts();
        foreach (var font in new[]
        {
            @"C:\Windows\Fonts\times.ttf", @"C:\Windows\Fonts\timesbd.ttf", @"C:\Windows\Fonts\timesi.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        })
        {
            if (File.Exists(font)) fontProvider.AddFont(font);
        }
        var properties = new iText.Html2pdf.ConverterProperties();
        properties.SetFontProvider(fontProvider);
        iText.Html2pdf.HtmlConverter.ConvertToPdf(htmlStream, outputStream, properties);
        return outputStream.ToArray(); // ToArray works on the stream ConvertToPdf has closed
    }

    /// <summary>HospitalReportService result (list of dictionaries) → table; columns = union of keys in first-seen order.</summary>
    public static ReportTable FromHospitalReport(HospitalReportResult result, string? subtitle)
    {
        var headers = new List<string>();
        foreach (var row in result.Data)
            foreach (var key in row.Keys)
                if (!headers.Contains(key)) headers.Add(key);
        var rows = result.Data
            .Select(r => (IReadOnlyList<object?>)headers.Select(h => r.TryGetValue(h, out var v) ? v : null).ToArray())
            .ToList();
        var title = string.IsNullOrWhiteSpace(result.ReportName) ? result.ReportCode : result.ReportName;
        if (result.Summary.TryGetValue("error", out var err))
            subtitle = $"{subtitle} — {err}";
        return new ReportTable(title.ToUpperInvariant(), subtitle, headers, rows);
    }

    /// <summary>
    /// A report DTO with an <c>Items</c> list (reconciliation / pharmacy registers) → table of the item's public
    /// scalar properties. Id-like Guid columns are skipped (not meaningful on paper).
    /// </summary>
    public static ReportTable FromItems(string title, string? subtitle, System.Collections.IEnumerable items)
    {
        var list = items.Cast<object>().ToList();
        var type = list.FirstOrDefault()?.GetType();
        var props = type == null
            ? Array.Empty<PropertyInfo>()
            : type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => IsScalar(p.PropertyType) && !(Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType).Equals(typeof(Guid)))
                .ToArray();
        // A null NUMBER means the value has no data source ("chưa có dữ liệu"); a null text is just blank.
        var rows = list.Select(o => (IReadOnlyList<object?>)props.Select(p =>
            p.GetValue(o) ?? (Nullable.GetUnderlyingType(p.PropertyType) is { } u && u != typeof(Guid) && u != typeof(DateTime) ? NoData : "")).ToArray()).ToList();
        return new ReportTable(title, subtitle, props.Select(p => p.Name).ToArray(), rows);
    }

    private static bool IsScalar(Type t)
    {
        t = Nullable.GetUnderlyingType(t) ?? t;
        return t.IsPrimitive || t == typeof(string) || t == typeof(decimal) || t == typeof(DateTime) || t == typeof(Guid) || t.IsEnum;
    }

    public const string NoData = "chưa có dữ liệu";

    private static string FormatCell(object? v) => v switch
    {
        null => "",
        DateTime d => d.TimeOfDay == TimeSpan.Zero ? d.ToString("dd/MM/yyyy") : d.ToString("dd/MM/yyyy HH:mm"),
        decimal m => m.ToString("#,##0.##", CultureInfo.GetCultureInfo("vi-VN")),
        double m => m.ToString("#,##0.##", CultureInfo.GetCultureInfo("vi-VN")),
        float m => m.ToString("#,##0.##", CultureInfo.GetCultureInfo("vi-VN")),
        bool b => b ? "Có" : "Không",
        _ => v.ToString() ?? "",
    };

    private static object? XlsxCell(object? v) => v switch
    {
        null => "",
        Guid g => g.ToString(),
        Enum e => e.ToString(),
        _ => v,
    };
}
