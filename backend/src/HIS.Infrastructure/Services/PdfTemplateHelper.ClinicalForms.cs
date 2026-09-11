using System.Text;

namespace HIS.Infrastructure.Services;

public static partial class PdfTemplateHelper
{
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
    /// PHIEU KHAM BENH (ngoai tru).
    ///
    /// <para>Truoc day formType "kham" khong co nhanh nao xu ly nen roi vao bieu mau rong dung
    /// chung: tieu de "BIEU MAU EMR", phu de "KHAM" va than la 10 dong cham — in ra khong dung
    /// nghiep vu nao.</para>
    ///
    /// <para>Phieu nay thuong duoc in TRUOC khi kham (nguoi benh con dang cho goi so), nen moi muc
    /// chua co du lieu deu co dong ke san de bac si ghi tay, thay vi de trong.</para>
    /// </summary>
    public static string GetExamSlip(
        string? patientCode, string? fullName, int gender, DateTime? dateOfBirth, int? yearOfBirth,
        string? address, string? phone, string? insuranceNumber,
        string? medicalRecordCode, string? departmentName, string? roomName,
        string? queueCode, DateTime? examTime,
        string? chiefComplaint, string? presentIllness,
        decimal? temperature, int? pulse, int? bpSystolic, int? bpDiastolic, int? respiratoryRate,
        decimal? spO2, decimal? weight, decimal? height, decimal? bmi,
        string? physicalExamination, string? systemsReview,
        string? mainDiagnosis, string? mainIcdCode, string? subDiagnosis,
        int? conclusionType, string? conclusionNote, string? treatmentPlan, DateTime? followUpDate,
        string? doctorName)
    {
        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU KHÁM BỆNH</div>");
        body.AppendLine(@"<div class=""form-number"">Khám bệnh ngoại trú</div>");

        // Dong dau: so thu tu, phong kham, gio kham — ba thu nguoi benh va dieu duong tra cuu dau tien.
        body.AppendLine($@"
<div class=""meta-line"">
    <span class=""meta-strong"">Số thứ tự: {EscapeHtml(string.IsNullOrWhiteSpace(queueCode) ? "........" : queueCode)}</span>
    <span><b>Phòng khám:</b> {EscapeHtml(string.IsNullOrWhiteSpace(roomName) ? "........................" : roomName)}</span>
    <span><b>Ngày khám:</b> {(examTime?.ToString("dd/MM/yyyy HH:mm") ?? "......../......../............")}</span>
</div>");

        body.AppendLine(GetPatientInfoBlock(patientCode, fullName, gender, dateOfBirth,
            address, phone, insuranceNumber, medicalRecordCode, departmentName, yearOfBirth));

        // I. Ly do kham + benh su
        body.AppendLine(@"<div class=""section-title"">I. LÝ DO KHÁM BỆNH</div>");
        body.AppendLine(TextOrLines(chiefComplaint, 1));

        body.AppendLine(@"<div class=""section-title"">II. BỆNH SỬ</div>");
        body.AppendLine(TextOrLines(presentIllness, 3));

        // III. Sinh hieu — bang de doc nhanh, o trong van in de ghi tay.
        body.AppendLine(@"<div class=""section-title"">III. DẤU HIỆU SINH TỒN</div>");
        body.AppendLine($@"
<table class=""bordered"">
    <tr>
        <th style=""width:12.5%"">Mạch<br/><span style=""font-weight:normal"">(l/ph)</span></th>
        <th style=""width:12.5%"">Nhiệt độ<br/><span style=""font-weight:normal"">(°C)</span></th>
        <th style=""width:12.5%"">Huyết áp<br/><span style=""font-weight:normal"">(mmHg)</span></th>
        <th style=""width:12.5%"">Nhịp thở<br/><span style=""font-weight:normal"">(l/ph)</span></th>
        <th style=""width:12.5%"">SpO2<br/><span style=""font-weight:normal"">(%)</span></th>
        <th style=""width:12.5%"">Cân nặng<br/><span style=""font-weight:normal"">(kg)</span></th>
        <th style=""width:12.5%"">Chiều cao<br/><span style=""font-weight:normal"">(cm)</span></th>
        <th style=""width:12.5%"">BMI</th>
    </tr>
    <tr class=""text-center"" style=""height:28px"">
        <td>{pulse?.ToString() ?? ""}</td>
        <td>{temperature?.ToString("0.#") ?? ""}</td>
        <td>{(bpSystolic.HasValue || bpDiastolic.HasValue ? $"{bpSystolic}/{bpDiastolic}" : "")}</td>
        <td>{respiratoryRate?.ToString() ?? ""}</td>
        <td>{spO2?.ToString("0.#") ?? ""}</td>
        <td>{weight?.ToString("0.#") ?? ""}</td>
        <td>{height?.ToString("0.#") ?? ""}</td>
        <td>{bmi?.ToString("0.#") ?? ""}</td>
    </tr>
</table>");

        // IV. Kham lam sang
        body.AppendLine(@"<div class=""section-title"">IV. KHÁM LÂM SÀNG</div>");
        body.AppendLine(@"<p><b>Toàn thân:</b></p>");
        body.AppendLine(TextOrLines(physicalExamination, 3));
        body.AppendLine(@"<p style=""margin-top:8px""><b>Các bộ phận:</b></p>");
        body.AppendLine(TextOrLines(systemsReview, 4));

        // V. Chan doan
        body.AppendLine(@"<div class=""section-title"">V. CHẨN ĐOÁN</div>");
        var mainText = string.IsNullOrWhiteSpace(mainDiagnosis)
            ? ""
            : EscapeHtml(mainDiagnosis) + (string.IsNullOrWhiteSpace(mainIcdCode) ? "" : $" ({EscapeHtml(mainIcdCode)})");
        body.AppendLine($@"
<div class=""pinfo"" style=""row-gap:8px"">
    <div class=""pinfo-item c12""><b>Chẩn đoán chính:</b><span class=""pinfo-val"">{mainText}</span></div>
    <div class=""pinfo-item c12""><b>Chẩn đoán kèm theo:</b><span class=""pinfo-val"">{EscapeHtml(subDiagnosis)}</span></div>
</div>");

        // VI. Xu tri
        body.AppendLine(@"<div class=""section-title"">VI. XỬ TRÍ — KẾT LUẬN</div>");
        var conclusionText = conclusionType switch
        {
            1 => "Cho về",
            2 => "Kê đơn điều trị ngoại trú",
            3 => "Nhập viện",
            4 => "Chuyển viện",
            5 => "Hẹn khám lại",
            6 => "Tử vong",
            _ => ""
        };
        body.AppendLine($@"
<div class=""pinfo"" style=""row-gap:8px"">
    <div class=""pinfo-item c6""><b>Hướng xử trí:</b><span class=""pinfo-val"">{EscapeHtml(conclusionText)}</span></div>
    <div class=""pinfo-item c6""><b>Hẹn khám lại:</b><span class=""pinfo-val"">{followUpDate?.ToString("dd/MM/yyyy") ?? ""}</span></div>
</div>");
        var closingNote = string.Join(" — ", new[] { treatmentPlan, conclusionNote }
            .Where(x => !string.IsNullOrWhiteSpace(x)));
        body.AppendLine(TextOrLines(closingNote, 3));

        // Chu ky: phieu kham ngoai tru chi can chu ky bac si kham.
        body.AppendLine($@"
<div class=""text-right text-italic"" style=""margin-top:18px"">{DateTime.Now:'Ngày' dd 'tháng' MM 'năm' yyyy}</div>
<div class=""signature-block"" style=""justify-content:flex-end"">
    <div class=""signature-item"">
        <div class=""signature-title"">Bác sĩ khám bệnh</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{EscapeHtml(doctorName)}</div>
    </div>
</div>");

        return WrapHtmlPage("Phiếu khám bệnh", body.ToString());
    }

    /// <summary>
    /// Có dữ liệu thì in ra; chưa có thì in <paramref name="lines"/> dòng kẻ để viết tay.
    /// </summary>
    private static string TextOrLines(string? text, int lines)
    {
        if (string.IsNullOrWhiteSpace(text)) return FillLines(lines);

        // Xuống dòng của bác sĩ gõ trong bệnh án phải giữ nguyên khi in, nếu không cả đoạn khám
        // dồn thành một khối chữ liền.
        var html = EscapeHtml(text).Replace("\r\n", "\n").Replace("\n", "<br/>");
        return "<p>" + html + "</p>";
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

}
