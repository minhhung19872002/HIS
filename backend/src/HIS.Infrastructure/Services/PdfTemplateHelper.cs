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
            1 => "Khỏi",
            2 => "Đỡ, giảm",
            3 => "Không thay đổi",
            4 => "Nặng hơn",
            5 => "Tử vong",
            _ => ""
        };

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">TÓM TẬT BỆNH ÁN</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 01/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        // Thoi gian dieu tri
        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Vào viện:</span>
    <span class=""field-value"">{admissionDate?.ToString("dd/MM/yyyy HH:mm")}</span>
    <span style=""margin-left:20px""><b>Ra viện:</b> {dischargeDate?.ToString("dd/MM/yyyy HH:mm")}</span>
</div>");

        // Ly do kham
        if (!string.IsNullOrEmpty(chiefComplaint))
        {
            body.AppendLine($@"
<div class=""section-title"">I. LÝ DO KHÁM BỆNH</div>
<p>{EscapeHtml(chiefComplaint)}</p>");
        }

        // Benh su
        if (!string.IsNullOrEmpty(presentIllness))
        {
            body.AppendLine($@"
<div class=""section-title"">II. BỆNH SỬ</div>
<p>{EscapeHtml(presentIllness)}</p>");
        }

        // Tien su
        body.AppendLine(@"<div class=""section-title"">III. TIỀN SỬ</div>");
        if (!string.IsNullOrEmpty(pastMedicalHistory))
            body.AppendLine($"<p><b>Bản thân:</b> {EscapeHtml(pastMedicalHistory)}</p>");
        if (!string.IsNullOrEmpty(familyHistory))
            body.AppendLine($"<p><b>Gia đình:</b> {EscapeHtml(familyHistory)}</p>");

        // Kham lam sang
        body.AppendLine(@"<div class=""section-title"">IV. KHÁM LÂM SÀNG</div>");
        if (!string.IsNullOrEmpty(physicalExamination))
            body.AppendLine($"<p><b>Toàn thân:</b> {EscapeHtml(physicalExamination)}</p>");
        if (!string.IsNullOrEmpty(systemsReview))
            body.AppendLine($"<p><b>Bộ phận:</b> {EscapeHtml(systemsReview)}</p>");

        // Chan doan
        body.AppendLine(@"<div class=""section-title"">V. CHẨN ĐOÁN</div>");
        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán chính:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)} {(string.IsNullOrEmpty(mainIcdCode) ? "" : $"({EscapeHtml(mainIcdCode)})")}</span>
</div>");
        if (!string.IsNullOrEmpty(subDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán phụ:</span>
    <span class=""field-value"">{EscapeHtml(subDiagnosis)}</span>
</div>");
        }

        // Phuong phap dieu tri
        if (!string.IsNullOrEmpty(treatmentPlan))
        {
            body.AppendLine($@"
<div class=""section-title"">VI. PHƯƠNG PHÁP ĐIỀU TRỊ</div>
<p>{EscapeHtml(treatmentPlan)}</p>");
        }

        // Ket qua dieu tri
        body.AppendLine($@"
<div class=""section-title"">VII. KẾT QUẢ ĐIỀU TRỊ</div>
<p>{treatmentResultText}</p>");
        if (!string.IsNullOrEmpty(conclusionNote))
            body.AppendLine($"<p>{EscapeHtml(conclusionNote)}</p>");

        body.AppendLine(GetSignatureBlock(doctorName, departmentHeadName));

        return WrapHtmlPage("Tóm tắt bệnh án - MS.01/BV", body.ToString());
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
        body.AppendLine(@"<div class=""form-title"">TỌ ĐIỀU TRỊ</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 02/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)} {(string.IsNullOrEmpty(mainIcdCode) ? "" : $"({EscapeHtml(mainIcdCode)})")}</span>
</div>");

        // Bang to dieu tri
        body.AppendLine(@"
<table class=""bordered"">
    <thead>
        <tr>
            <th style=""width:80px"">Ngày</th>
            <th style=""width:50px"">Ngày thứ</th>
            <th>Diễn biến bệnh</th>
            <th>Y lệnh</th>
            <th style=""width:100px"">Bác sĩ</th>
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

        return WrapHtmlPage("Tờ điều trị - MS.02/BV", body.ToString());
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
        body.AppendLine(@"<div class=""form-title"">BIÊN BẢN HỘI CHẨN</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 03/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Thời gian:</span>
    <span class=""field-value"">{consultationDate?.ToString("HH:mm 'ngày' dd/MM/yyyy")}</span>
</div>");

        if (!string.IsNullOrEmpty(reason))
        {
            body.AppendLine($@"
<div class=""section-title"">1. Lý DO HỘI CHẨN</div>
<p>{EscapeHtml(reason)}</p>");
        }

        if (!string.IsNullOrEmpty(summary))
        {
            body.AppendLine($@"
<div class=""section-title"">2. TÓM TẬT BỆNH ÁN</div>
<p>{EscapeHtml(summary)}</p>");
        }

        if (!string.IsNullOrEmpty(conclusion))
        {
            body.AppendLine($@"
<div class=""section-title"">3. KẾT LUẬN HỘI CHẨN</div>
<p>{EscapeHtml(conclusion)}</p>");
        }

        if (!string.IsNullOrEmpty(treatmentPlan))
        {
            body.AppendLine($@"
<div class=""section-title"">4. HƯỚNG XỬ TRÍ</div>
<p>{EscapeHtml(treatmentPlan)}</p>");
        }

        if (!string.IsNullOrEmpty(participants))
        {
            body.AppendLine($@"
<div class=""section-title"">5. THÀNH PHẦN THAM DỰ</div>
<p>{EscapeHtml(participants)}</p>");
        }

        // Chu ky
        body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Thư ký</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(secretaryName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Chủ tọa</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(chairmanName)}</div>
    </div>
</div>");

        return WrapHtmlPage("Biên bản hội chẩn - MS.03/BV", body.ToString());
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
            1 => "Khỏi",
            2 => "Đỡ, giảm",
            3 => "Không thay đổi",
            4 => "Nặng hơn",
            5 => "Tử vong",
            _ => ""
        };

        var daysOfStay = admissionDate.HasValue && dischargeDate.HasValue
            ? (dischargeDate.Value - admissionDate.Value).Days
            : 0;

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">GIẤY RA VIỆN</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 04/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Vào viện:</span>
    <span class=""field-value"">{admissionDate?.ToString("HH:mm 'ngày' dd/MM/yyyy")}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Ra viện:</span>
    <span class=""field-value"">{dischargeDate?.ToString("HH:mm 'ngày' dd/MM/yyyy")}</span>
    <span style=""margin-left:20px""><b>Số ngày điều trị:</b> {daysOfStay} ngày</span>
</div>");

        if (!string.IsNullOrEmpty(admissionDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán vào viện:</span>
    <span class=""field-value"">{EscapeHtml(admissionDiagnosis)}</span>
</div>");
        }

        if (!string.IsNullOrEmpty(dischargeDiagnosis))
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán ra viện:</span>
    <span class=""field-value"">{EscapeHtml(dischargeDiagnosis)}</span>
</div>");
        }

        if (!string.IsNullOrEmpty(treatmentSummary))
        {
            body.AppendLine($@"
<div class=""section-title"">ĐIỀU TRỊ</div>
<p>{EscapeHtml(treatmentSummary)}</p>");
        }

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Tình trạng ra viện:</span>
    <span class=""field-value"">{conditionText}</span>
</div>");

        if (!string.IsNullOrEmpty(instructions))
        {
            body.AppendLine($@"
<div class=""section-title"">HƯỚNG ĐIỀU TRỊ TIẮP</div>
<p>{EscapeHtml(instructions)}</p>");
        }

        if (followUpDate.HasValue)
        {
            body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Hẹn tái khám:</span>
    <span class=""field-value"">{followUpDate.Value:dd/MM/yyyy}</span>
</div>");
        }

        body.AppendLine(GetSignatureBlock(doctorName, departmentHeadName, null, true));

        return WrapHtmlPage("Giấy ra viện - MS.04/BV", body.ToString());
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
        body.AppendLine(@"<div class=""form-title"">PHIẾU CHĂM SÓC ĐIỀU DƯỠNG</div>");
        body.AppendLine(@"<div class=""form-number"">MS. 05/BV</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber, medicalRecordCode, departmentName));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán:</span>
    <span class=""field-value"">{EscapeHtml(mainDiagnosis)}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"">
    <thead>
        <tr>
            <th style=""width:80px"">Ngày</th>
            <th style=""width:40px"">Ca</th>
            <th>Tình trạng BN</th>
            <th>Nhận định ĐD</th>
            <th>Can thiệp</th>
            <th>Đáp ứng</th>
            <th style=""width:80px"">Điều dưỡng</th>
        </tr>
    </thead>
    <tbody>");

        if (rows.Count > 0)
        {
            foreach (var row in rows)
            {
                var shiftText = row.Shift switch { 1 => "S", 2 => "C", 3 => "Đ", _ => "" };
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
        <div class=""signature-title"">Điều dưỡng trưởng</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Trưởng khoa</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
</div>");

        return WrapHtmlPage("Phiếu chăm sóc điều dưỡng - MS.05/BV", body.ToString());
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
        body.AppendLine(@"<div class=""form-title"">ĐƠN THUỐC</div>");
        body.AppendLine(@"<div class=""form-number"">(Dùng cho người lớn / trẻ em)</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán:</span>
    <span class=""field-value"">{EscapeHtml(diagnosis)} {(string.IsNullOrEmpty(icdCode) ? "" : $"({EscapeHtml(icdCode)})")}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Khoa/Phòng:</span>
    <span class=""field-value"">{EscapeHtml(departmentName)}</span>
    <span style=""margin-left:20px""><b>Ngày:</b> {prescriptionDate:dd/MM/yyyy}</span>
    <span style=""margin-left:20px""><b>Số ngày:</b> {totalDays}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
    <thead>
        <tr>
            <th style=""width:30px"">STT</th>
            <th>Tên thuốc</th>
            <th style=""width:60px"">ĐVT</th>
            <th style=""width:60px"">Số lượng</th>
            <th>Cách dùng</th>
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
    <b>Lời dặn:</b> {EscapeHtml(note)}
</div>");
        }

        body.AppendLine(GetSignatureBlock(doctorName, null, null, false));

        return WrapHtmlPage("Đơn thuốc", body.ToString());
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
        body.AppendLine(@"<div class=""form-title"">PHIẾU KẾT QUẢ XÉT NGHIỆM</div>");
        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth, address, phone, insuranceNumber));

        body.AppendLine($@"
<div class=""field"">
    <span class=""field-label"">Chẩn đoán:</span>
    <span class=""field-value"">{EscapeHtml(diagnosis)}</span>
</div>
<div class=""field"">
    <span class=""field-label"">BS chỉ định:</span>
    <span class=""field-value"">{EscapeHtml(doctorName)}</span>
    <span style=""margin-left:20px""><b>Khoa:</b> {EscapeHtml(departmentName)}</span>
</div>
<div class=""field"">
    <span class=""field-label"">Ngày yêu cầu:</span>
    <span class=""field-value"">{requestDate:dd/MM/yyyy HH:mm}</span>
    <span style=""margin-left:20px""><b>Ngày trả KQ:</b> {approvedDate?.ToString("dd/MM/yyyy HH:mm")}</span>
</div>");

        body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
    <thead>
        <tr>
            <th style=""width:30px"">STT</th>
            <th>Tên xét nghiệm</th>
            <th style=""width:100px"">Kết quả</th>
            <th style=""width:60px"">ĐVT</th>
            <th style=""width:120px"">Tham chiếu</th>
            <th style=""width:50px"">Cờ</th>
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
        <div class=""signature-title"">Kỹ thuật viên</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Trưởng khoa Xét nghiệm</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(approvedByName)}</div>
    </div>
</div>");

        return WrapHtmlPage("Phiếu kết quả xét nghiệm", body.ToString());
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

    public static string Esc(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return System.Net.WebUtility.HtmlEncode(text);
    }

    private static string EscapeHtml(string? text) => Esc(text);

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
