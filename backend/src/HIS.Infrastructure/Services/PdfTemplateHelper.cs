using System.Text;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Helper sinh HTML templates cho bieu mau y te Viet Nam
/// Tat ca template dung inline CSS, A4 page, Times New Roman, UTF-8
/// Tuan thu quy dinh TT 54/2017, TT 32/2023 BYT
/// </summary>
public static class PdfTemplateHelper
{
    private const string HospitalName = "BENH VIEN DA KHOA ABC";
    private const string HospitalNameVn = "B\u1EC6NH VI\u1EC6N \u0110A KHOA ABC";
    private const string HospitalAddress = "123 \u0110\u01B0\u1EDDng ABC, Qu\u1EADn XYZ, TP. H\u1ED3 Ch\u00ED Minh";
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
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm 15mm 25mm;
            margin: 0 auto;
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
    <button class=""print-btn no-print"" onclick=""window.print()"">In bi\u1EC3u m\u1EABu</button>
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
        <div class=""header-ministry"">B\u1ED8 Y T\u1EBES</div>
        <div class=""header-hospital"">{EscapeHtml(HospitalNameVn)}</div>
        <div style=""font-size:11px"">{EscapeHtml(HospitalAddress)}</div>
        <div style=""font-size:11px"">Tel: {EscapeHtml(HospitalPhone)}</div>
    </div>
    <div class=""header-right"">
        <div class=""header-country"">C\u1ED8NG H\u00D2A X\u00C3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM</div>
        <div class=""header-motto"" style=""text-decoration:underline"">
            \u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\u00FAc
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
        var genderText = gender switch { 1 => "Nam", 2 => "N\u1EEF", _ => "Kh\u00E1c" };
        var age = dateOfBirth.HasValue ? (DateTime.Now.Year - dateOfBirth.Value.Year).ToString() : "";
        var dobText = dateOfBirth?.ToString("dd/MM/yyyy") ?? "";

        return $@"
<div class=""patient-info"">
    <div class=""field"">
        <span class=""field-label"">H\u1ECD v\u00E0 t\u00EAn:</span>
        <span class=""field-value text-bold"">{EscapeHtml(fullName)}</span>
        <span style=""margin-left:20px""><b>Gi\u1EDBi:</b> {genderText}</span>
        <span style=""margin-left:20px""><b>Tu\u1ED5i:</b> {age}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">Ng\u00E0y sinh:</span>
        <span class=""field-value"">{dobText}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">\u0110\u1ECBa ch\u1EC9:</span>
        <span class=""field-value"">{EscapeHtml(address)}</span>
    </div>
    <div class=""field"">
        <span class=""field-label"">S\u0110T:</span>
        <span class=""field-value"">{EscapeHtml(phone)}</span>
        <span style=""margin-left:20px""><b>S\u1ED1 th\u1EBB BHYT:</b> {EscapeHtml(insuranceNumber)}</span>
    </div>
    {(medicalRecordCode != null ? $@"
    <div class=""field"">
        <span class=""field-label"">S\u1ED1 h\u1ED3 s\u01A1:</span>
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
        var dateText = date ?? DateTime.Now.ToString("'Ng\u00E0y' dd 'th\u00E1ng' MM 'n\u0103m' yyyy");

        var sb = new StringBuilder();
        sb.AppendLine($@"<div class=""text-right text-italic"" style=""margin-top:20px"">{dateText}</div>");
        sb.AppendLine(@"<div class=""signature-block"">");

        if (includePatient)
        {
            sb.AppendLine(@"
    <div class=""signature-item"">
        <div class=""signature-title"">Ng\u01B0\u1EDDi b\u1EC7nh</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>");
        }

        sb.AppendLine($@"
    <div class=""signature-item"">
        <div class=""signature-title"">B\u00E1c s\u0129 \u0111i\u1EC1u tr\u1ECB</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">{EscapeHtml(doctorName)}</div>
    </div>");

        sb.AppendLine($@"
    <div class=""signature-item"">
        <div class=""signature-title"">Tr\u01B0\u1EDFng khoa</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">{EscapeHtml(departmentHeadName)}</div>
    </div>");

        sb.AppendLine("</div>");
        return sb.ToString();
    }

    /// <summary>
    /// MS. 01/BV - Tom tat benh an ngoai tru / noi tru
    /// </summary>
    public static string GetMedicalRecordSummary(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        DateTime? admissionDate, DateTime? dischargeDate,
        string? chiefComplaint, string? presentIllness,
        string? pastMedicalHistory, string? familyHistory,
        string? physicalExamination, string? systemsReview,
        string? mainDiagnosis, string? mainIcdCode,
        string? subDiagnosis, string? treatmentPlan,
        int? treatmentResult, string? conclusionNote,
        string? doctorName, string? departmentHeadName)
    {
        var treatmentResultText = treatmentResult switch
        {
            1 => "Kh\u1ECFi",
            2 => "\u0110\u1EE1, gi\u1EA3m",
            3 => "Kh\u00F4ng thay \u0111\u1ED5i",
            4 => "N\u1EB7ng h\u01A1n",
            5 => "T\u1EED vong",
            _ => ""
        };

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">T\u00D3M T\u1EACT B\u1EC6NH \u00C1N</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 01/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        // Thoi gian dieu tri
        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">V\u00E0o vi\u1EC7n:</span>
    <span class=""field-value"">{admissionDate?.ToString("dd/MM/yyyy HH:mm")}</span>
    <span style=""margin-left:20px""><b>Ra vi\u1EC7n:</b> {dischargeDate?.ToString("dd/MM/yyyy HH:mm")}</span>
</div>");

        // Ly do kham
        if (!string.IsNullOrEmpty(chiefComplaint))
        {
            body.AppendLine($@"
<div class=""section-title"">I. L\u00DD DO KH\u00C1M B\u1EC6NH</div>
<p>{EscapeHtml(chiefComplaint)}</p>");
        }

        // Benh su
        if (!string.IsNullOrEmpty(presentIllness))
        {
            body.AppendLine($@"
<div class=""section-title"">II. B\u1EC6NH S\u1EEC</div>
<p>{EscapeHtml(presentIllness)}</p>");
        }

        // Tien su
        body.AppendLine(@"<div class=""section-title"">III. TI\u1EC0N S\u1EEC</div>");
        if (!string.IsNullOrEmpty(pastMedicalHistory))
            body.AppendLine($"<p><b>B\u1EA3n th\u00E2n:</b> {EscapeHtml(pastMedicalHistory)}</p>");
        if (!string.IsNullOrEmpty(familyHistory))
            body.AppendLine($"<p><b>Gia \u0111\u00ECnh:</b> {EscapeHtml(familyHistory)}</p>");

        // Kham lam sang
        body.AppendLine(@"<div class=""section-title"">IV. KH\u00C1M L\u00C2M S\u00C0NG</div>");
        if (!string.IsNullOrEmpty(physicalExamination))
            body.AppendLine($"<p><b>To\u00E0n th\u00E2n:</b> {EscapeHtml(physicalExamination)}</p>");
        if (!string.IsNullOrEmpty(systemsReview))
            body.AppendLine($"<p><b>B\u1ED9 ph\u1EADn:</b> {EscapeHtml(systemsReview)}</p>");

        // Chan doan
        body.AppendLine(@"<div class=""section-title"">V. CH\u1EA8N \u0110O\u00C1N</div>");
        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n ch\u00EDnh:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)} {(string.IsNullOrEmpty(mainIcdCode) ? "" : $"({EscapeHtml(mainIcdCode)})")}</span>
</div>");
        if (!string.IsNullOrEmpty(subDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n ph\u1EE5:</span>
    <span class=""field-value"">{EscapeHtml(subDiagnosis)}</span>
</div>");
        }

        // Phuong phap dieu tri
        if (!string.IsNullOrEmpty(treatmentPlan))
        {
            body.AppendLine($@"
<div class=""section-title"">VI. PH\u01AF\u01A0NG PH\u00C1P \u0110I\u1EC0U TR\u1ECA</div>
<p>{EscapeHtml(treatmentPlan)}</p>");
        }

        // Ket qua dieu tri
        body.AppendLine($@"
<div class=""section-title"">VII. K\u1EBET QU\u1EA2 \u0110I\u1EC0U TR\u1ECA</div>
<p>{treatmentResultText}</p>");
        if (!string.IsNullOrEmpty(conclusionNote))
            body.AppendLine($"<p>{EscapeHtml(conclusionNote)}</p>");

        body.AppendLine(GetSignatureBlock(doctorName, departmentHeadName));

        return WrapHtmlPage("T\u00F3m t\u1EAFt b\u1EC7nh \u00E1n - MS.01/BV", body.ToString());
    }

    /// <summary>
    /// MS. 02/BV - To dieu tri
    /// </summary>
    public static string GetTreatmentSheet(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        string? mainDiagnosis, string? mainIcdCode,
        List<TreatmentSheetRow> rows, string? doctorName)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">T\u1ECC \u0110I\u1EC0U TR\u1ECA</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 02/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)} {(string.IsNullOrEmpty(mainIcdCode) ? "" : $"({EscapeHtml(mainIcdCode)})")}</span>
</div>");

        // Bang to dieu tri
        body.AppendLine(@"
<table class=""bordered"">
    <thead>
        <tr>
            <th style=""width:80px"">Ng\u00E0y</th>
            <th style=""width:50px"">Ng\u00E0y th\u1EE9</th>
            <th>Di\u1EC5n bi\u1EBFn b\u1EC7nh</th>
            <th>Y l\u1EC7nh</th>
            <th style=""width:100px"">B\u00E1c s\u0129</th>
        </tr>
    </thead>
    <tbody>");

        if (rows.Count > 0)
        {
            foreach (var row in rows)
            {
                body.AppendLine($@"
        <tr>
            <td class=""text-center"">{row.Date:dd/MM/yyyy}</td>
            <td class=""text-center"">{row.DayNumber}</td>
            <td>{EscapeHtml(row.Progress)}</td>
            <td>{EscapeHtml(row.Orders)}</td>
            <td class=""text-center"">{EscapeHtml(row.DoctorName)}</td>
        </tr>");
            }
        }
        else
        {
            // In ra 10 dong trong
            for (int i = 0; i < 10; i++)
            {
                body.AppendLine(@"<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
            }
        }

        body.AppendLine(@"
    </tbody>
</table>");

        body.AppendLine(GetSignatureBlock(doctorName, null, null, false));

        return WrapHtmlPage("T\u1EDD \u0111i\u1EC1u tr\u1ECB - MS.02/BV", body.ToString());
    }

    /// <summary>
    /// MS. 03/BV - Bien ban hoi chan
    /// </summary>
    public static string GetConsultationMinutes(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        DateTime? consultationDate, string? reason, string? summary,
        string? conclusion, string? treatmentPlan, string? participants,
        string? chairmanName, string? secretaryName)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">BI\u00CAN B\u1EA2N H\u1ED8I CH\u1EA8N</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 03/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Th\u1EDDi gian:</span>
    <span class=""field-value"">{consultationDate?.ToString("HH:mm 'ng\u00E0y' dd/MM/yyyy")}</span>
</div>");

        if (!string.IsNullOrEmpty(reason))
        {
            body.AppendLine($@"
<div class=""section-title"">1. L\u00FD DO H\u1ED8I CH\u1EA8N</div>
<p>{EscapeHtml(reason)}</p>");
        }

        if (!string.IsNullOrEmpty(summary))
        {
            body.AppendLine($@"
<div class=""section-title"">2. T\u00D3M T\u1EACT B\u1EC6NH \u00C1N</div>
<p>{EscapeHtml(summary)}</p>");
        }

        if (!string.IsNullOrEmpty(conclusion))
        {
            body.AppendLine($@"
<div class=""section-title"">3. K\u1EBET LU\u1EACN H\u1ED8I CH\u1EA8N</div>
<p>{EscapeHtml(conclusion)}</p>");
        }

        if (!string.IsNullOrEmpty(treatmentPlan))
        {
            body.AppendLine($@"
<div class=""section-title"">4. H\u01AF\u1EDANG X\u1EEC TR\u00CD</div>
<p>{EscapeHtml(treatmentPlan)}</p>");
        }

        if (!string.IsNullOrEmpty(participants))
        {
            body.AppendLine($@"
<div class=""section-title"">5. TH\u00C0NH PH\u1EA6N THAM D\u1EF0</div>
<p>{EscapeHtml(participants)}</p>");
        }

        // Chu ky
        body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Th\u01B0 k\u00FD</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">{EscapeHtml(secretaryName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Ch\u1EE7 t\u1ECDa</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">{EscapeHtml(chairmanName)}</div>
    </div>
</div>");

        return WrapHtmlPage("Bi\u00EAn b\u1EA3n h\u1ED9i ch\u1EA9n - MS.03/BV", body.ToString());
    }

    /// <summary>
    /// MS. 04/BV - Giay ra vien
    /// </summary>
    public static string GetDischargeLetter(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        DateTime? admissionDate, DateTime? dischargeDate,
        string? admissionDiagnosis, string? dischargeDiagnosis,
        string? treatmentSummary, int dischargeCondition,
        string? instructions, DateTime? followUpDate,
        string? doctorName, string? departmentHeadName)
    {
        var conditionText = dischargeCondition switch
        {
            1 => "Kh\u1ECFi",
            2 => "\u0110\u1EE1, gi\u1EA3m",
            3 => "Kh\u00F4ng thay \u0111\u1ED5i",
            4 => "N\u1EB7ng h\u01A1n",
            5 => "T\u1EED vong",
            _ => ""
        };

        var daysOfStay = admissionDate.HasValue && dischargeDate.HasValue
            ? (dischargeDate.Value - admissionDate.Value).Days
            : 0;

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">GI\u1EA4Y RA VI\u1EC6N</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 04/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">V\u00E0o vi\u1EC7n:</span>
    <span class=""field-value"">{admissionDate?.ToString("HH:mm 'ng\u00E0y' dd/MM/yyyy")}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Ra vi\u1EC7n:</span>
    <span class=""field-value"">{dischargeDate?.ToString("HH:mm 'ng\u00E0y' dd/MM/yyyy")}</span>
    <span style=""margin-left:20px""><b>S\u1ED1 ng\u00E0y \u0111i\u1EC1u tr\u1ECB:</b> {daysOfStay} ng\u00E0y</span>
</div>");

        if (!string.IsNullOrEmpty(admissionDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n v\u00E0o vi\u1EC7n:</span>
    <span class=""field-value"">{EscapeHtml(admissionDiagnosis)}</span>
</div>");
        }

        if (!string.IsNullOrEmpty(dischargeDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n ra vi\u1EC7n:</span>
    <span class=""field-value"">{EscapeHtml(dischargeDiagnosis)}</span>
</div>");
        }

        if (!string.IsNullOrEmpty(treatmentSummary))
        {
            body.AppendLine($@"
<div class=""section-title"">\u0110I\u1EC0U TR\u1ECA</div>
<p>{EscapeHtml(treatmentSummary)}</p>");
        }

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">T\u00ECnh tr\u1EA1ng ra vi\u1EC7n:</span>
    <span class=""field-value"">{conditionText}</span>
</div>");

        if (!string.IsNullOrEmpty(instructions))
        {
            body.AppendLine($@"
<div class=""section-title"">H\u01AF\u1EDANG \u0110I\u1EC0U TR\u1ECA TI\u1EAEP</div>
<p>{EscapeHtml(instructions)}</p>");
        }

        if (followUpDate.HasValue)
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">H\u1EB9n t\u00E1i kh\u00E1m:</span>
    <span class=""field-value"">{followUpDate.Value:dd/MM/yyyy}</span>
</div>");
        }

        body.AppendLine(GetSignatureBlock(doctorName, departmentHeadName, null, true));

        return WrapHtmlPage("Gi\u1EA5y ra vi\u1EC7n - MS.04/BV", body.ToString());
    }

    /// <summary>
    /// MS. 05/BV - Phieu cham soc dieu duong
    /// </summary>
    public static string GetNursingCareSheet(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        string? mainDiagnosis,
        List<NursingCareRow> rows)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHI\u1EBEU CH\u0102M S\u00D3C \u0110I\u1EC0U D\u01AF\u1EE0NG</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 05/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"">
    <thead>
        <tr>
            <th style=""width:80px"">Ng\u00E0y</th>
            <th style=""width:40px"">Ca</th>
            <th>T\u00ECnh tr\u1EA1ng BN</th>
            <th>Nh\u1EADn \u0111\u1ECBnh \u0110D</th>
            <th>Can thi\u1EC7p</th>
            <th>\u0110\u00E1p \u1EE9ng</th>
            <th style=""width:80px"">\u0110i\u1EC1u d\u01B0\u1EE1ng</th>
        </tr>
    </thead>
    <tbody>");

        if (rows.Count > 0)
        {
            foreach (var row in rows)
            {
                var shiftText = row.Shift switch { 1 => "S", 2 => "C", 3 => "\u0110", _ => "" };
                body.AppendLine($@"
        <tr>
            <td class=""text-center"">{row.Date:dd/MM/yyyy}</td>
            <td class=""text-center"">{shiftText}</td>
            <td>{EscapeHtml(row.PatientCondition)}</td>
            <td>{EscapeHtml(row.NursingDiagnosis)}</td>
            <td>{EscapeHtml(row.Interventions)}</td>
            <td>{EscapeHtml(row.PatientResponse)}</td>
            <td class=""text-center"">{EscapeHtml(row.NurseName)}</td>
        </tr>");
            }
        }
        else
        {
            for (int i = 0; i < 10; i++)
            {
                body.AppendLine(@"<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
            }
        }

        body.AppendLine(@"
    </tbody>
</table>");

        // Chu ky dieu duong
        body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">\u0110i\u1EC1u d\u01B0\u1EE1ng tr\u01B0\u1EDFng</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Tr\u01B0\u1EDFng khoa</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
</div>");

        return WrapHtmlPage("Phi\u1EBFu ch\u0103m s\u00F3c \u0111i\u1EC1u d\u01B0\u1EE1ng - MS.05/BV", body.ToString());
    }

    /// <summary>
    /// Don thuoc - Prescription
    /// </summary>
    public static string GetPrescription(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? diagnosis, string? icdCode,
        DateTime prescriptionDate, int totalDays,
        List<PrescriptionRow> items, string? note,
        string? doctorName, string? departmentName)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">\u0110\u01A0N THU\u1ED0C</div>");
        body.AppendLine(@"<div class=""form-number"">(D\u00F9ng cho ng\u01B0\u1EDDi l\u1EDBn / tr\u1EBB em)</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n:</span>
    <span class=""field-value"">{EscapeHtml(diagnosis)} {(string.IsNullOrEmpty(icdCode) ? "" : $"({EscapeHtml(icdCode)})")}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Khoa/Ph\u00F2ng:</span>
    <span class=""field-value"">{EscapeHtml(departmentName)}</span>
    <span style=""margin-left:20px""><b>Ng\u00E0y:</b> {prescriptionDate:dd/MM/yyyy}</span>
    <span style=""margin-left:20px""><b>S\u1ED1 ng\u00E0y:</b> {totalDays}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
    <thead>
        <tr>
            <th style=""width:30px"">STT</th>
            <th>T\u00EAn thu\u1ED1c</th>
            <th style=""width:60px"">\u0110VT</th>
            <th style=""width:60px"">S\u1ED1 l\u01B0\u1EE3ng</th>
            <th>C\u00E1ch d\u00F9ng</th>
        </tr>
    </thead>
    <tbody>");

        for (int i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var usageText = new StringBuilder();
            if (!string.IsNullOrEmpty(item.Dosage)) usageText.Append(item.Dosage);
            if (!string.IsNullOrEmpty(item.Frequency)) usageText.Append($" - {item.Frequency}");
            if (!string.IsNullOrEmpty(item.Route)) usageText.Append($" ({item.Route})");
            if (!string.IsNullOrEmpty(item.Usage)) usageText.Append($". {item.Usage}");

            body.AppendLine($@"
        <tr>
            <td class=""text-center"">{i + 1}</td>
            <td><b>{EscapeHtml(item.MedicineName)}</b></td>
            <td class=""text-center"">{EscapeHtml(item.Unit)}</td>
            <td class=""text-center"">{item.Quantity}</td>
            <td>{EscapeHtml(usageText.ToString())}</td>
        </tr>");
        }

        body.AppendLine(@"
    </tbody>
</table>");

        if (!string.IsNullOrEmpty(note))
        {
            body.AppendLine($@"
<div class=""mt-10"">
    <b>L\u1EDDi d\u1EB7n:</b> {EscapeHtml(note)}
</div>");
        }

        body.AppendLine(GetSignatureBlock(doctorName, null, null, false));

        return WrapHtmlPage("\u0110\u01A1n thu\u1ED1c", body.ToString());
    }

    /// <summary>
    /// Phieu ket qua xet nghiem
    /// </summary>
    public static string GetLabResult(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? diagnosis, string? doctorName, string? departmentName,
        DateTime requestDate, DateTime? approvedDate,
        List<LabResultRow> results, string? approvedByName)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHI\u1EBEU K\u1EBET QU\u1EA2 X\u00C9T NGHI\u1EC6M</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Ch\u1EA9n \u0111o\u00E1n:</span>
    <span class=""field-value"">{EscapeHtml(diagnosis)}</span>
</div>
<div class=""field"">
    <span class=""field-label"">BS ch\u1EC9 \u0111\u1ECBnh:</span>
    <span class=""field-value"">{EscapeHtml(doctorName)}</span>
    <span style=""margin-left:20px""><b>Khoa:</b> {EscapeHtml(departmentName)}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Ng\u00E0y y\u00EAu c\u1EA7u:</span>
    <span class=""field-value"">{requestDate:dd/MM/yyyy HH:mm}</span>
    <span style=""margin-left:20px""><b>Ng\u00E0y tr\u1EA3 KQ:</b> {approvedDate?.ToString("dd/MM/yyyy HH:mm")}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
    <thead>
        <tr>
            <th style=""width:30px"">STT</th>
            <th>T\u00EAn x\u00E9t nghi\u1EC7m</th>
            <th style=""width:100px"">K\u1EBFt qu\u1EA3</th>
            <th style=""width:60px"">\u0110VT</th>
            <th style=""width:120px"">Tham chi\u1EBFu</th>
            <th style=""width:50px"">C\u1EDD</th>
        </tr>
    </thead>
    <tbody>");

        for (int i = 0; i < results.Count; i++)
        {
            var r = results[i];
            var flagHtml = r.IsAbnormal ? @"<span style=""color:red;font-weight:bold"">*</span>" : "";
            var resultStyle = r.IsAbnormal ? @" style=""color:red;font-weight:bold""" : "";

            body.AppendLine($@"
        <tr>
            <td class=""text-center"">{i + 1}</td>
            <td>{EscapeHtml(r.TestName)}</td>
            <td class=""text-center""{resultStyle}>{EscapeHtml(r.Result)}</td>
            <td class=""text-center"">{EscapeHtml(r.Unit)}</td>
            <td class=""text-center"">{EscapeHtml(r.ReferenceRange)}</td>
            <td class=""text-center"">{flagHtml}</td>
        </tr>");
        }

        body.AppendLine(@"
    </tbody>
</table>");

        body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">K\u1EF9 thu\u1EADt vi\u00EAn</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Tr\u01B0\u1EDFng khoa X\u00E9t nghi\u1EC7m</div>
        <div class=""signature-date"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>
        <div class=""signature-name"">{EscapeHtml(approvedByName)}</div>
    </div>
</div>");

        return WrapHtmlPage("Phi\u1EBFu k\u1EBFt qu\u1EA3 x\u00E9t nghi\u1EC7m", body.ToString());
    }

    /// <summary>
    /// Bieu mau don gian - chi header + title + patient info + noi dung tuy y
    /// Dung cho cac form MS. 06-17 va DD. 01-21 khi chi can output thong tin co ban
    /// </summary>
    public static string GetGenericForm(
        string formTitle, string formNumber,
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName,
        string bodyContent, string? doctorName = null)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine($@"<div class=""form-title"">{EscapeHtml(formTitle)}</div>");
        body.AppendLine($@"<div class=""form-number"">{EscapeHtml(formNumber)}</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));
        body.AppendLine(bodyContent);
        if (doctorName != null)
            body.AppendLine(GetSignatureBlock(doctorName));
        return WrapHtmlPage($"{formTitle} - {formNumber}", body.ToString());
    }

    // ========== Helper types ==========

    public class TreatmentSheetRow
    {
        public DateTime Date { get; set; }
        public int DayNumber { get; set; }
        public string? Progress { get; set; }
        public string? Orders { get; set; }
        public string? DoctorName { get; set; }
    }

    public class NursingCareRow
    {
        public DateTime Date { get; set; }
        public int Shift { get; set; } // 1=Sang, 2=Chieu, 3=Dem
        public string? PatientCondition { get; set; }
        public string? NursingDiagnosis { get; set; }
        public string? Interventions { get; set; }
        public string? PatientResponse { get; set; }
        public string? NurseName { get; set; }
    }

    public class PrescriptionRow
    {
        public string MedicineName { get; set; } = string.Empty;
        public string? Unit { get; set; }
        public decimal Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public string? Route { get; set; }
        public string? Usage { get; set; }
    }

    public class LabResultRow
    {
        public string TestName { get; set; } = string.Empty;
        public string? Result { get; set; }
        public string? Unit { get; set; }
        public string? ReferenceRange { get; set; }
        public bool IsAbnormal { get; set; }
    }

    // ========== Utility ==========

    private static string EscapeHtml(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return System.Net.WebUtility.HtmlEncode(text);
    }
}
