using System.Text;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Helper sinh HTML templates cho bieu mau y te Viet Nam
/// Tat ca template dung inline CSS, A4 page, Times New Roman, UTF-8
/// Tuan thu quy dinh TT 54/2017, TT 32/2023 BYT
/// </summary>
public static partial class PdfTemplateHelper
{
    private const string HospitalName = "BENH VIEN DA KHOA ABC";
    private const string HospitalNameVn = "BỆNH VIỆN ĐA KHOA ABC";
    private const string HospitalAddress = "123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh";
    private const string HospitalPhone = "(028) 1234 5678";

    /// <summary>
    /// Wrap noi dung trong HTML page voi print CSS
    /// </summary>
    public static string WrapHtmlPage(string title, string bodyContent)
    {
        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
    <style>
        @page {{
            size: A4;
            margin: 15mm 20mm 15mm 25mm;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Times New Roman', Times, serif;
            font-size: 13px;
            line-height: 1.5;
            color: #000;
            background: #fff;
        }}
        .page {{
            width: 100%;
            min-height: auto;
            padding: 0;
            margin: 0;
            background: #fff;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }}
        .header-left {{
            text-align: center;
            width: 40%;
        }}
        .header-right {{
            text-align: center;
            width: 55%;
        }}
        .header-ministry {{
            font-size: 12px;
            font-weight: bold;
        }}
        .header-hospital {{
            font-size: 14px;
            font-weight: bold;
        }}
        .header-country {{
            font-size: 12px;
            font-weight: bold;
        }}
        .header-motto {{
            font-size: 11px;
            font-style: italic;
        }}
        .form-title {{
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 15px 0 5px 0;
        }}
        .form-number {{
            text-align: center;
            font-size: 11px;
            font-style: italic;
            margin-bottom: 15px;
        }}
        .section-title {{
            font-size: 14px;
            font-weight: bold;
            margin: 12px 0 6px 0;
            text-transform: uppercase;
        }}
        .field {{
            margin-bottom: 6px;
            display: flex;
        }}
        .field-label {{
            font-weight: bold;
            min-width: 150px;
            flex-shrink: 0;
        }}
        .field-value {{
            flex: 1;
            border-bottom: 1px dotted #000;
            min-height: 18px;
            padding-left: 4px;
        }}
        .field-inline {{
            display: inline-block;
            margin-right: 20px;
        }}
        .patient-info {{
            border: 1px solid #000;
            padding: 8px 12px;
            margin-bottom: 12px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
        }}
        table.bordered td, table.bordered th {{
            border: 1px solid #000;
            padding: 4px 6px;
            font-size: 12px;
            vertical-align: top;
        }}
        table.bordered th {{
            background: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }}
        .signature-block {{
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
        }}
        .signature-item {{
            text-align: center;
            width: 30%;
        }}
        .signature-title {{
            font-weight: bold;
            font-size: 13px;
        }}
        .signature-name {{
            margin-top: 60px;
            font-weight: bold;
        }}
        .signature-date {{
            font-style: italic;
            font-size: 11px;
        }}
        .text-center {{ text-align: center; }}
        .text-right {{ text-align: right; }}
        .text-bold {{ font-weight: bold; }}
        .text-italic {{ font-style: italic; }}
        .mt-10 {{ margin-top: 10px; }}
        .mt-20 {{ margin-top: 20px; }}
        .mb-10 {{ margin-bottom: 10px; }}
        .underline {{ text-decoration: underline; }}
        .dotted-line {{ border-bottom: 1px dotted #000; }}
        .checkbox {{ display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 4px; vertical-align: middle; text-align: center; font-size: 11px; line-height: 14px; }}
        .checkbox.checked::after {{ content: ""\2713""; }}
        .no-break {{ page-break-inside: avoid; }}
        .page-break {{ page-break-after: always; }}
        .footer {{
            position: fixed;
            bottom: 10mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #666;
        }}
        @media print {{
            body {{ background: #fff; }}
            .page {{ padding: 0; width: 100%; min-height: auto; }}
            .no-print {{ display: none !important; }}
        }}
        @media screen {{
            body {{ background: #eee; }}
            .page {{ box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin: 20px auto; }}
            .print-btn {{
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 24px;
                background: #1677ff;
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                z-index: 1000;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }}
            .print-btn:hover {{ background: #0958d9; }}
        }}
    </style>
</head>
<body>
    <button class=""print-btn no-print"" onclick=""window.print()"">In biểu mẫu</button>
    <div class=""page"">
        {bodyContent}
    </div>
</body>
</html>";
    }

    /// <summary>
    /// Header chuan cua bieu mau y te Viet Nam: BO Y TE / Benh vien / Quoc gia
    /// </summary>
    public static string GetHospitalHeader()
    {
        return $@"
<div class=""header"">
    <div class=""header-left"">
        <div class=""header-ministry"">BỘ Y TẾ</div>
        <div class=""header-hospital"">{EscapeHtml(HospitalNameVn)}</div>
        <div style=""font-size:11px"">{EscapeHtml(HospitalAddress)}</div>
        <div style=""font-size:11px"">Tel: {EscapeHtml(HospitalPhone)}</div>
    </div>
    <div class=""header-right"">
        <div class=""header-country"">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class=""header-motto"" style=""text-decoration:underline"">
            Độc lập - Tự do - Hạnh phúc
        </div>
    </div>
</div>";
    }

    /// <summary>
    /// Block thong tin benh nhan chuan
    /// </summary>
    public static string GetPatientInfoBlock(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode = null, string? departmentName = null)
    {
        var genderText = gender switch { 1 => "Nam", 2 => "Nữ", _ => "Khác" };
        var age = dateOfBirth.HasValue ? (DateTime.Now.Year - dateOfBirth.Value.Year).ToString() : "";
        var dobText = dateOfBirth?.ToString("dd/MM/yyyy") ?? "";

        return $@"
<div class=""patient-info"">
    <div class=""field"">
        <span class=""field-label"">Họ và tên:</span>
        <span class=""field-value text-bold"">{EscapeHtml(fullName)}</span>
        <span style=""margin-left:20px""><b>Giới:</b> {genderText}</span>
        <span style=""margin-left:20px""><b>Tuổi:</b> {age}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">Ngày sinh:</span>
        <span class=""field-value"">{dobText}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">Địa chỉ:</span>
        <span class=""field-value"">{EscapeHtml(address)}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">SĐT:</span>
        <span class=""field-value"">{EscapeHtml(phone)}</span>
        <span style=""margin-left:20px""><b>Số thẻ BHYT:</b> {EscapeHtml(insuranceNumber)}</span>
    </div>
    {(medicalRecordCode != null ? $@"
    <div class=""field"">
        <span class=""field-label"">Số hồ sơ:</span>
        <span class=""field-value"">{EscapeHtml(medicalRecordCode)}</span>
        {(departmentName != null ? $@"<span style=""margin-left:20px""><b>Khoa:</b> {EscapeHtml(departmentName)}</span>" : "")}
    </div>" : "")}
</div>";
    }

    /// <summary>
    /// Block chu ky cuoi bieu mau (3 cot: Truong khoa, BS dieu tri, Nguoi benh)
    /// </summary>
    public static string GetSignatureBlock(
        string? doctorName = null, string? departmentHeadName = null,
        string? date = null, bool includePatient = true)
    {
        var dateText = date ?? DateTime.Now.ToString("'Ngày' dd 'tháng' MM 'năm' yyyy");

        var sb = new StringBuilder();
        sb.AppendLine($@"<div class=""text-right text-italic"" style=""margin-top:20px"">{dateText}</div>");
        sb.AppendLine(@"<div class=""signature-block"">");

        if (includePatient)
        {
            sb.AppendLine(@"
    <div class=""signature-item"">
        <div class=""signature-title"">Người bệnh</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>");
        }

        sb.AppendLine($@"
    <div class=""signature-item"">
        <div class=""signature-title"">Bác sĩ điều trị</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(doctorName)}</div>
    </div>");

        sb.AppendLine($@"
    <div class=""signature-item"">
        <div class=""signature-title"">Trưởng khoa</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(departmentHeadName)}</div>
    </div>");

        sb.AppendLine("</div>");
        return sb.ToString();
    }

    // ========== Utility ==========

    public static string Esc(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return System.Net.WebUtility.HtmlEncode(text);
    }

    private static string EscapeHtml(string? text) => Esc(text);

}
