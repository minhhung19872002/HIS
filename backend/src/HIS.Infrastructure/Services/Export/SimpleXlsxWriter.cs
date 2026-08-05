using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml;

namespace HIS.Infrastructure.Services.Export;

/// <summary>Một sheet: tiêu đề cột + các dòng dữ liệu.</summary>
public sealed record XlsxSheet(string Name, IReadOnlyList<string> Headers, IReadOnlyList<IReadOnlyList<object?>> Rows);

/// <summary>
/// Ghi file .xlsx (SpreadsheetML/OOXML) chỉ bằng thư viện chuẩn .NET — không thêm dependency.
/// Đủ cho báo cáo dạng bảng: nhiều sheet, tiêu đề in đậm, số/ngày đúng kiểu, chuỗi inline.
/// </summary>
public static class SimpleXlsxWriter
{
    public static byte[] Build(IReadOnlyList<XlsxSheet> sheets)
    {
        if (sheets == null || sheets.Count == 0)
            throw new ArgumentException("Cần ít nhất một sheet", nameof(sheets));

        using var buffer = new MemoryStream();
        using (var archive = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteEntry(archive, "[Content_Types].xml", BuildContentTypes(sheets.Count));
            WriteEntry(archive, "_rels/.rels", BuildRootRels());
            WriteEntry(archive, "xl/workbook.xml", BuildWorkbook(sheets));
            WriteEntry(archive, "xl/_rels/workbook.xml.rels", BuildWorkbookRels(sheets.Count));
            WriteEntry(archive, "xl/styles.xml", BuildStyles());
            for (var i = 0; i < sheets.Count; i++)
                WriteEntry(archive, $"xl/worksheets/sheet{i + 1}.xml", BuildSheet(sheets[i]));
        }
        return buffer.ToArray();
    }

    private static void WriteEntry(ZipArchive archive, string path, string content)
    {
        var entry = archive.CreateEntry(path, CompressionLevel.Optimal);
        using var stream = entry.Open();
        var bytes = Encoding.UTF8.GetBytes(content);
        stream.Write(bytes, 0, bytes.Length);
    }

    private static string BuildContentTypes(int sheetCount)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.Append("""<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">""");
        sb.Append("""<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>""");
        sb.Append("""<Default Extension="xml" ContentType="application/xml"/>""");
        sb.Append("""<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>""");
        sb.Append("""<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>""");
        for (var i = 1; i <= sheetCount; i++)
            sb.Append($"""<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>""");
        sb.Append("</Types>");
        return sb.ToString();
    }

    private static string BuildRootRels() =>
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""" +
        """<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">""" +
        """<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>""" +
        "</Relationships>";

    private static string BuildWorkbook(IReadOnlyList<XlsxSheet> sheets)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.Append("""<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>""");
        for (var i = 0; i < sheets.Count; i++)
            sb.Append($"""<sheet name="{XmlEscape(SafeSheetName(sheets[i].Name, i))}" sheetId="{i + 1}" r:id="rId{i + 1}"/>""");
        sb.Append("</sheets></workbook>");
        return sb.ToString();
    }

    private static string BuildWorkbookRels(int sheetCount)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.Append("""<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">""");
        for (var i = 1; i <= sheetCount; i++)
            sb.Append($"""<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>""");
        sb.Append($"""<Relationship Id="rId{sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>""");
        sb.Append("</Relationships>");
        return sb.ToString();
    }

    // style 0 = mặc định, 1 = đậm (tiêu đề), 2 = ngày dd/mm/yyyy
    private static string BuildStyles() =>
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""" +
        """<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">""" +
        """<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>""" +
        """<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>""" +
        """<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>""" +
        """<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>""" +
        """<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>""" +
        """<cellXfs count="3">""" +
        """<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>""" +
        """<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>""" +
        """<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>""" +
        """</cellXfs>""" +
        """<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>""" +
        "</styleSheet>";

    private static string BuildSheet(XlsxSheet sheet)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.Append("""<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>""");

        var rowIndex = 1;
        sb.Append($"""<row r="{rowIndex}">""");
        for (var c = 0; c < sheet.Headers.Count; c++)
            sb.Append(TextCell(CellRef(c, rowIndex), sheet.Headers[c], styleIndex: 1));
        sb.Append("</row>");

        foreach (var row in sheet.Rows)
        {
            rowIndex++;
            sb.Append($"""<row r="{rowIndex}">""");
            for (var c = 0; c < row.Count; c++)
                sb.Append(ValueCell(CellRef(c, rowIndex), row[c]));
            sb.Append("</row>");
        }

        sb.Append("</sheetData></worksheet>");
        return sb.ToString();
    }

    private static string ValueCell(string reference, object? value)
    {
        switch (value)
        {
            case null:
                return $"""<c r="{reference}"/>""";
            case DateTime date:
                // Serial number theo hệ ngày 1900 của Excel.
                var serial = (date - new DateTime(1899, 12, 30)).TotalDays;
                return $"""<c r="{reference}" s="2"><v>{serial.ToString("0.######", CultureInfo.InvariantCulture)}</v></c>""";
            case bool flag:
                return TextCell(reference, flag ? "true" : "false", 0);
            case byte or sbyte or short or ushort or int or uint or long or ulong or float or double or decimal:
                var number = Convert.ToDecimal(value, CultureInfo.InvariantCulture);
                return $"""<c r="{reference}"><v>{number.ToString(CultureInfo.InvariantCulture)}</v></c>""";
            default:
                return TextCell(reference, value.ToString() ?? string.Empty, 0);
        }
    }

    private static string TextCell(string reference, string text, int styleIndex)
    {
        var style = styleIndex == 0 ? string.Empty : $""" s="{styleIndex}" """.TrimEnd();
        return $"""<c r="{reference}"{style} t="inlineStr"><is><t xml:space="preserve">{XmlEscape(text)}</t></is></c>""";
    }

    private static string CellRef(int columnIndex, int rowIndex)
    {
        var column = string.Empty;
        var n = columnIndex;
        do
        {
            column = (char)('A' + n % 26) + column;
            n = n / 26 - 1;
        } while (n >= 0);
        return column + rowIndex;
    }

    /// <summary>Excel cấm : \ / ? * [ ] trong tên sheet và giới hạn 31 ký tự.</summary>
    private static string SafeSheetName(string name, int index)
    {
        if (string.IsNullOrWhiteSpace(name)) return $"Sheet{index + 1}";
        var cleaned = new string(name.Where(ch => !":\\/?*[]".Contains(ch)).ToArray()).Trim();
        if (cleaned.Length == 0) return $"Sheet{index + 1}";
        return cleaned.Length <= 31 ? cleaned : cleaned[..31];
    }

    private static string XmlEscape(string value)
    {
        var sb = new StringBuilder(value.Length);
        foreach (var ch in value)
        {
            // Ký tự điều khiển không hợp lệ trong XML 1.0 sẽ làm Excel từ chối mở file.
            if (ch is < ' ' and not '\t' and not '\n' and not '\r') continue;
            sb.Append(ch switch
            {
                '&' => "&amp;",
                '<' => "&lt;",
                '>' => "&gt;",
                '"' => "&quot;",
                '\'' => "&apos;",
                _ => ch.ToString()
            });
        }
        return sb.ToString();
    }
}
