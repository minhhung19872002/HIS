using System.Text;

namespace HIS.Infrastructure.Services;

public static partial class PdfTemplateHelper
{
    /// <summary>
    /// Generic tabular report HTML (receipts, stock forms, statistics, etc.)
    /// </summary>
    public static string BuildTableReport(string title, string? subtitle, DateTime? date,
        string[] headers, List<string[]> rows, string? signatureName = null, string? signatureTitle = null)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine($@"<div class=""form-title"">{Esc(title)}</div>");
        if (!string.IsNullOrEmpty(subtitle))
            body.AppendLine($@"<div class=""form-number"">{Esc(subtitle)}</div>");
        if (date.HasValue)
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngày {date.Value:dd} tháng {date.Value:MM} năm {date.Value:yyyy}</div>");

        body.AppendLine(@"<table class=""bordered""><thead><tr>");
        body.AppendLine(@"<th style=""width:30px"">STT</th>");
        foreach (var h in headers)
            body.AppendLine($@"<th>{Esc(h)}</th>");
        body.AppendLine("</tr></thead><tbody>");

        for (int i = 0; i < rows.Count; i++)
        {
            body.AppendLine("<tr>");
            body.AppendLine($@"<td class=""text-center"">{i + 1}</td>");
            foreach (var cell in rows[i])
                body.AppendLine($@"<td>{Esc(cell)}</td>");
            body.AppendLine("</tr>");
        }
        body.AppendLine("</tbody></table>");

        if (signatureName != null)
            body.AppendLine(GetSignatureBlock(signatureName, signatureTitle));

        return WrapHtmlPage(title, body.ToString());
    }

    /// <summary>
    /// Receipt/voucher report (phieu thu, phieu chi, phieu nhap/xuat)
    /// </summary>
    public static string BuildVoucherReport(string title, string voucherCode, DateTime date,
        string[] fieldLabels, string[] fieldValues, string? signatureName = null)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine($@"<div class=""form-title"">{Esc(title)}</div>");
        body.AppendLine($@"<div class=""form-number"">Số: {Esc(voucherCode)}</div>");
        body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngày {date:dd} tháng {date:MM} năm {date:yyyy}</div>");

        for (int i = 0; i < Math.Min(fieldLabels.Length, fieldValues.Length); i++)
        {
            body.AppendLine($@"<div class=""field""><span class=""field-label"">{Esc(fieldLabels[i])}:</span><span class=""field-value"">{Esc(fieldValues[i])}</span></div>");
        }

        if (signatureName != null)
            body.AppendLine(GetSignatureBlock(signatureName));

        return WrapHtmlPage(title, body.ToString());
    }

    public class ReportItemRow
    {
        public string Name { get; set; } = "";
        public string Unit { get; set; } = "";
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }

    /// <summary>
    /// Stock/warehouse report with items table (phieu nhap/xuat kho)
    /// </summary>
    public static string BuildItemizedReport(string title, string code, DateTime date,
        string[] metaLabels, string[] metaValues,
        List<ReportItemRow> items, string? signatureName = null)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine($@"<div class=""form-title"">{Esc(title)}</div>");
        body.AppendLine($@"<div class=""form-number"">Số: {Esc(code)}</div>");
        body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngày {date:dd} tháng {date:MM} năm {date:yyyy}</div>");

        for (int i = 0; i < Math.Min(metaLabels.Length, metaValues.Length); i++)
            body.AppendLine($@"<div class=""field""><span class=""field-label"">{Esc(metaLabels[i])}:</span><span class=""field-value"">{Esc(metaValues[i])}</span></div>");

        body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
            <th style=""width:30px"">STT</th><th>Tên</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th>
        </tr></thead><tbody>");

        decimal total = 0;
        for (int i = 0; i < items.Count; i++)
        {
            var it = items[i];
            total += it.Amount;
            body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(it.Name)}</td><td class=""text-center"">{Esc(it.Unit)}</td><td class=""text-center"">{it.Quantity:#,##0}</td><td class=""text-right"">{it.UnitPrice:#,##0}</td><td class=""text-right"">{it.Amount:#,##0}</td><td>{Esc(it.Note)}</td></tr>");
        }
        body.AppendLine($@"<tr><td colspan=""5"" class=""text-right""><b>Tổng cộng:</b></td><td class=""text-right""><b>{total:#,##0}</b></td><td></td></tr>");
        body.AppendLine("</tbody></table>");

        if (signatureName != null)
            body.AppendLine(GetSignatureBlock(signatureName));

        return WrapHtmlPage(title, body.ToString());
    }
}
