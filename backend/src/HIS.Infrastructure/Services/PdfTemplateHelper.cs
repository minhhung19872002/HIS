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
        /* Khoi thong tin benh nhan xep theo LUOI 12 cot.
           Truoc day block nay dung .field (flex) voi .field-value co flex bang 1: o truong nao cung
           an het be ngang con lai, day cac o phu Gioi / Tuoi / So the BHYT dinh sat mep phai to
           giay va bo lai mot khoang trong menh mong o giua. Luoi thi moi o co be ngang co dinh. */
        .pinfo {{
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            column-gap: 12px;
            row-gap: 5px;
        }}
        .pinfo-item {{ display: flex; align-items: baseline; gap: 6px; min-width: 0; }}
        .pinfo-item > b {{ white-space: nowrap; }}
        .pinfo-val {{
            flex: 1;
            min-width: 0;
            border-bottom: 1px dotted #555;
            min-height: 17px;
            padding: 0 2px;
            overflow-wrap: anywhere;
        }}
        .c3 {{ grid-column: span 3; }}
        .c4 {{ grid-column: span 4; }}
        .c6 {{ grid-column: span 6; }}
        .c12 {{ grid-column: span 12; }}
        /* Dong ke de bac si viet tay — phieu thuong duoc in TRUOC khi kham nen phan lon muc con trong. */
        .fill-line {{ border-bottom: 1px dotted #555; height: 20px; margin-top: 7px; }}
        .meta-line {{
            display: flex;
            flex-wrap: wrap;
            gap: 6px 24px;
            margin-bottom: 10px;
            font-size: 13px;
        }}
        .meta-strong {{ font-size: 15px; font-weight: bold; }}
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
            /* Gioi han be ngang bang dung kho giay A4. Khong gioi han thi tren man hinh rong to
               phieu keo dai het man, chu be xiu va moi duong ke de dien tay dai menh mong — nhin
               khong ra to giay se in ra. */
            .page {{
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                width: 210mm;
                max-width: 100%;
                margin: 16px auto 24px;
                padding: 14mm 16mm;
            }}
            /* Thanh cong cu dinh tren cung thay vi nut noi de len header.
               Nut cu la position fixed goc phai tren — no nam DE len khoi quoc hieu CONG HOA XA
               HOI CHU NGHIA VIET NAM cua to phieu. */
            .print-bar {{
                position: sticky;
                top: 0;
                z-index: 1000;
                display: flex;
                justify-content: flex-end;
                padding: 8px 16px;
                background: #fff;
                border-bottom: 1px solid #d9d9d9;
            }}
            .print-btn {{
                padding: 8px 22px;
                background: #1677ff;
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }}
            .print-btn:hover {{ background: #0958d9; }}
        }}
    </style>
</head>
<body>
    <div class=""print-bar no-print"">
        <button class=""print-btn"" onclick=""window.print()"">In biểu mẫu</button>
    </div>
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
        string? medicalRecordCode = null, string? departmentName = null,
        int? yearOfBirth = null)
    {
        var genderText = gender switch { 1 => "Nam", 2 => "Nữ", 3 => "Khác", _ => "" };
        var dobText = dateOfBirth?.ToString("dd/MM/yyyy")
            ?? (yearOfBirth.HasValue ? yearOfBirth.Value.ToString() : "");

        return $@"
<div class=""patient-info"">
    <div class=""pinfo"">
        <div class=""pinfo-item c6""><b>Họ và tên:</b><span class=""pinfo-val text-bold"">{EscapeHtml(fullName)}</span></div>
        <div class=""pinfo-item c3""><b>Giới:</b><span class=""pinfo-val"">{genderText}</span></div>
        <div class=""pinfo-item c3""><b>Tuổi:</b><span class=""pinfo-val"">{FormatAge(dateOfBirth, yearOfBirth)}</span></div>

        <div class=""pinfo-item c4""><b>Ngày sinh:</b><span class=""pinfo-val"">{dobText}</span></div>
        <div class=""pinfo-item c4""><b>Mã BN:</b><span class=""pinfo-val"">{EscapeHtml(patientCode)}</span></div>
        <div class=""pinfo-item c4""><b>SĐT:</b><span class=""pinfo-val"">{EscapeHtml(phone)}</span></div>

        <div class=""pinfo-item c12""><b>Địa chỉ:</b><span class=""pinfo-val"">{EscapeHtml(address)}</span></div>

        <div class=""pinfo-item c4""><b>Số thẻ BHYT:</b><span class=""pinfo-val"">{EscapeHtml(insuranceNumber)}</span></div>
        <div class=""pinfo-item c4""><b>Khoa:</b><span class=""pinfo-val"">{EscapeHtml(departmentName)}</span></div>
        <div class=""pinfo-item c4""><b>Số hồ sơ:</b><span class=""pinfo-val"">{EscapeHtml(medicalRecordCode)}</span></div>
    </div>
</div>";
    }

    /// <summary>
    /// Tuổi tính theo ngày sinh (đã trừ sinh nhật chưa tới trong năm); hồ sơ chỉ có năm sinh thì
    /// lấy hiệu số năm. Không có gì để tính thì trả chuỗi rỗng — ô trống để điền tay còn hơn một
    /// con số bịa.
    /// </summary>
    private static string FormatAge(DateTime? dateOfBirth, int? yearOfBirth)
    {
        var today = DateTime.Now;

        if (dateOfBirth.HasValue)
        {
            var age = today.Year - dateOfBirth.Value.Year;
            if (dateOfBirth.Value.Date > today.Date.AddYears(-age)) age--;
            return age >= 0 ? age.ToString() : "";
        }

        if (yearOfBirth is > 1900 && yearOfBirth <= today.Year)
            return (today.Year - yearOfBirth.Value).ToString();

        return "";
    }

    /// <summary>
    /// Dòng kẻ chấm để viết tay. Phiếu khám thường được in TRƯỚC khi khám (bệnh nhân còn đang chờ
    /// gọi số), nên mục nào chưa có dữ liệu phải có chỗ cho bác sĩ ghi, không phải một khoảng trắng.
    /// </summary>
    public static string FillLines(int count)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < count; i++) sb.AppendLine(@"<div class=""fill-line""></div>");
        return sb.ToString();
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
