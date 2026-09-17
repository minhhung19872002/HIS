using System.Globalization;
using System.Text;

namespace HIS.Infrastructure.Services.Export;

/// <summary>
/// QA-R10: one place for CSV writing AND reading. Every exporter/importer used to hand-roll its own
/// quoting and <c>line.Split(',')</c>, so a patient name with a comma shifted columns, a quote broke the
/// file, a leading <c>=</c> became a live formula in Excel, and an Excel "CSV UTF-8" file (BOM) lost its
/// first header.
/// </summary>
public static class CsvUtil
{
    /// <summary>Upper bound on data rows a single import accepts (protects the request from a runaway file).</summary>
    public const int MaxImportRows = 20_000;

    /// <summary>Upper bound on the uploaded import file size (bytes).</summary>
    public const long MaxImportBytes = 10 * 1024 * 1024;

    // ─── Writing ─────────────────────────────────────────────────────────────

    /// <summary>
    /// One CSV cell: always quoted, inner quotes doubled, and text that a spreadsheet would evaluate
    /// (= + - @ tab CR at the start) prefixed with an apostrophe (CSV/formula injection).
    /// Numbers are written as-is so a negative amount stays a number.
    /// </summary>
    public static string Cell(object? value)
    {
        string text = value switch
        {
            null => string.Empty,
            string s => NeutralizeFormula(s),
            DateTime d => d.ToString(d.TimeOfDay == TimeSpan.Zero ? "dd/MM/yyyy" : "dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
            IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
            _ => NeutralizeFormula(value.ToString() ?? string.Empty),
        };
        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }

    /// <summary>Joins the cells of one row.</summary>
    public static string Line(params object?[] cells) => string.Join(",", cells.Select(Cell));

    /// <summary>UTF-8 bytes WITH BOM — without it Excel opens a CSV as ANSI and Vietnamese turns to mojibake.</summary>
    public static byte[] ToBytes(string csv) => Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();

    public static string NeutralizeFormula(string s)
    {
        if (s.Length == 0) return s;
        var c = s[0];
        if (c is '=' or '+' or '-' or '@' or '\t' or '\r' or '\n')
        {
            // A signed number ("-5", "-1.500.000", "+84 912 345 678") is data, not a formula: only digits and
            // . , space after the sign can never be evaluated by Excel.
            if ((c is '-' or '+') && s.Length > 1 && char.IsAsciiDigit(s[1]) && char.IsAsciiDigit(s[^1])
                && s.Skip(1).All(ch => char.IsAsciiDigit(ch) || ch is '.' or ',' or ' '))
                return s;
            return "'" + s;
        }
        return s;
    }

    // ─── Reading ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Decodes an uploaded text file as UTF-8 (BOM optional, BOM stripped); invalid UTF-8 falls back to
    /// Windows-1258 (Vietnamese ANSI CSV from Excel), anything else throws a clear message.
    /// Binary spreadsheets (.xlsx = ZIP, .xls = OLE) are rejected up-front: parsed as text they produced junk rows.
    /// </summary>
    public static string DecodeText(byte[] content)
    {
        if (content == null || content.Length == 0)
            throw new InvalidOperationException("Tệp rỗng.");
        if (content.Length > MaxImportBytes)
            throw new InvalidOperationException($"Tệp quá lớn (tối đa {MaxImportBytes / 1024 / 1024} MB).");
        if (content.Length >= 4 && ((content[0] == 0x50 && content[1] == 0x4B) || (content[0] == 0xD0 && content[1] == 0xCF)))
            throw new InvalidOperationException("Tệp Excel (.xlsx/.xls) chưa được hỗ trợ — hãy lưu dưới dạng \"CSV UTF-8 (Comma delimited)\" rồi nhập lại.");
        try
        {
            return new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(content).TrimStart('﻿');
        }
        catch (DecoderFallbackException)
        {
            // Not UTF-8: Excel "CSV (Comma delimited)" on a Vietnamese Windows saves Windows-1258, whose
            // diacritics are combining marks -> normalise to NFC so names match what users type.
            try
            {
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
                var cp1258 = Encoding.GetEncoding(1258, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback);
                return cp1258.GetString(content).Normalize(NormalizationForm.FormC);
            }
            catch (Exception ex) when (ex is DecoderFallbackException or ArgumentException or NotSupportedException)
            {
                throw new InvalidOperationException("Tệp không đọc được bảng mã — hãy lưu dưới dạng \"CSV UTF-8 (Comma delimited)\" rồi nhập lại.");
            }
        }
    }

    /// <summary>Reads a whole stream (bounded by <see cref="MaxImportBytes"/>) and decodes it.</summary>
    public static async Task<string> ReadTextAsync(Stream stream)
    {
        using var ms = new MemoryStream();
        var buffer = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(buffer)) > 0)
        {
            if (ms.Length + read > MaxImportBytes)
                throw new InvalidOperationException($"Tệp quá lớn (tối đa {MaxImportBytes / 1024 / 1024} MB).");
            ms.Write(buffer, 0, read);
        }
        return DecodeText(ms.ToArray());
    }

    /// <summary>
    /// RFC 4180 parser: quoted cells may hold the delimiter, doubled quotes and line breaks. Blank lines
    /// are dropped. The delimiter (, ; or tab) is detected from the first line when not given.
    /// Each record carries its 1-based starting line number so row errors point at the right line.
    /// Throws when the file has more than <see cref="MaxImportRows"/> data rows.
    /// </summary>
    public static List<(int LineNumber, List<string> Cells)> ReadRecords(string text, char? delimiter = null)
    {
        var records = new List<(int, List<string>)>();
        if (string.IsNullOrEmpty(text)) return records;
        var delim = delimiter ?? DetectDelimiter(text);

        var cells = new List<string>();
        var sb = new StringBuilder();
        bool inQuote = false, anyContent = false;
        int line = 1, recordLine = 1;

        void EndRecord()
        {
            cells.Add(sb.ToString().Trim());
            sb.Clear();
            if (anyContent || cells.Any(c => c.Length > 0))
            {
                if (records.Count > MaxImportRows) // header + MaxImportRows data rows
                    throw new InvalidOperationException($"Tệp có quá nhiều dòng (tối đa {MaxImportRows:N0} dòng mỗi lần nhập).");
                records.Add((recordLine, cells));
            }
            cells = new List<string>();
            anyContent = false;
        }

        for (int i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (inQuote)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"') { sb.Append('"'); i++; }
                else if (c == '"') inQuote = false;
                else
                {
                    if (c == '\n') line++;
                    sb.Append(c);
                }
            }
            else if (c == '"') { inQuote = true; anyContent = true; }
            else if (c == delim) { cells.Add(sb.ToString().Trim()); sb.Clear(); anyContent = true; }
            else if (c == '\r') { /* CRLF handled on \n; lone CR ignored */ }
            else if (c == '\n')
            {
                EndRecord();
                line++;
                recordLine = line;
            }
            else sb.Append(c);
        }
        if (sb.Length > 0 || cells.Count > 0 || anyContent) EndRecord();
        return records;
    }

    private static char DetectDelimiter(string text)
    {
        var end = text.IndexOf('\n');
        var first = end < 0 ? text : text[..end];
        int commas = 0, semis = 0, tabs = 0;
        bool q = false;
        foreach (var ch in first)
        {
            if (ch == '"') q = !q;
            else if (!q && ch == ',') commas++;
            else if (!q && ch == ';') semis++;
            else if (!q && ch == '\t') tabs++;
        }
        if (tabs > commas && tabs >= semis) return '\t';
        if (semis > commas) return ';';
        return ',';
    }

    /// <summary>Case/space-insensitive column lookup in a header row; -1 when absent.</summary>
    public static int IndexOf(IReadOnlyList<string> header, params string[] names)
    {
        for (int i = 0; i < header.Count; i++)
        {
            var h = header[i].Replace(" ", "").Replace("_", "");
            if (names.Any(n => string.Equals(h, n.Replace(" ", "").Replace("_", ""), StringComparison.OrdinalIgnoreCase)))
                return i;
        }
        return -1;
    }

    public static string Get(IReadOnlyList<string> cells, int index) =>
        index >= 0 && index < cells.Count ? cells[index] : string.Empty;

    /// <summary>
    /// Money in either VN ("1.500.000", "1.500.000,50") or EN ("1,500,000.50") notation. A separator
    /// followed by exactly 1-2 trailing digits is the decimal mark (thousand groups always have 3 digits);
    /// every other '.'/',' is a thousand separator. Returns null when the text is not a number.
    /// </summary>
    public static decimal? ParseMoney(string? s)
    {
        s = (s ?? string.Empty).Trim().Trim('"').Replace(" ", "").Replace(" ", "");
        if (s.Length == 0) return null;
        var lastSep = s.LastIndexOfAny(new[] { '.', ',' });
        string intPart = s, fracPart = string.Empty;
        if (lastSep >= 0 && s.Length - lastSep - 1 is 1 or 2)
        {
            intPart = s[..lastSep];
            fracPart = s[(lastSep + 1)..];
        }
        var normalized = intPart.Replace(".", "").Replace(",", "") + (fracPart.Length > 0 ? "." + fracPart : "");
        return decimal.TryParse(normalized, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    private static readonly string[] DateFormats =
    {
        "dd/MM/yyyy", "d/M/yyyy", "dd/MM/yyyy HH:mm", "dd/MM/yyyy HH:mm:ss", "d/M/yyyy H:mm",
        "dd-MM-yyyy", "yyyy-MM-dd", "yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss",
        "yyyyMMdd", "yyyyMMddHHmm",
    };

    /// <summary>Vietnamese files use dd/MM/yyyy; culture-dependent parsing read 05/03/2026 as 3 May.</summary>
    public static DateTime? ParseDate(string? s)
    {
        s = (s ?? string.Empty).Trim().Trim('"');
        if (s.Length == 0) return null;
        return DateTime.TryParseExact(s, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
    }
}
