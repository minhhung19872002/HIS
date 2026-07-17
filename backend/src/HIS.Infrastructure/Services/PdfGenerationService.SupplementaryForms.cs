using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class PdfGenerationService
{
    // ========== TT32/2023 supplementary PDF methods ==========

    /// <summary>
    /// MS. 18/BV — Giay chung nhan phau thuat / thu thuat
    /// Lay thong tin tu SurgeryRecord (bao gom SurgerySchedule -> SurgeryRequest -> Patient/MedicalRecord)
    /// </summary>
    public async Task<byte[]> GenerateSurgeryCertificateAsync(Guid surgeryRecordId)
    {
        var record = await _db.SurgeryRecords
            .AsNoTracking()
            .Include(r => r.SurgerySchedule)
                .ThenInclude(s => s.SurgeryRequest)
                    .ThenInclude(req => req.Patient)
            .Include(r => r.SurgerySchedule)
                .ThenInclude(s => s.SurgeryRequest)
                    .ThenInclude(req => req.MedicalRecord)
                        .ThenInclude(m => m.Department)
            .Include(r => r.SurgerySchedule)
                .ThenInclude(s => s.Surgeon)
            .Include(r => r.SurgerySchedule)
                .ThenInclude(s => s.OperatingRoom)
            .FirstOrDefaultAsync(r => r.Id == surgeryRecordId && !r.IsDeleted);

        if (record == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("Lỗi", "<p>Không tìm thấy phiếu phẫu thuật</p>"));

        var schedule = record.SurgerySchedule;
        var request = schedule?.SurgeryRequest;
        var patient = request?.Patient;
        var mr = request?.MedicalRecord;
        var surgeon = schedule?.Surgeon;

        var body = $@"
<div class=""section-title"">I. THÔNG TIN BỆNH NHÂN</div>
<p>Họ tên: <b>{System.Net.WebUtility.HtmlEncode(patient?.FullName ?? "")}</b> &nbsp;&nbsp;
   Tuổi: {(patient?.DateOfBirth.HasValue == true ? (DateTime.Now.Year - patient.DateOfBirth.Value.Year).ToString() : "........")} &nbsp;&nbsp;
   Giới: {(patient?.Gender == 1 ? "Nam" : patient?.Gender == 2 ? "Nữ" : "........")}</p>
<p>Mã BN: {System.Net.WebUtility.HtmlEncode(patient?.PatientCode ?? "........")} &nbsp;&nbsp;
   Số BA: {System.Net.WebUtility.HtmlEncode(mr?.MedicalRecordCode ?? "........")}</p>
<p>Khoa: {System.Net.WebUtility.HtmlEncode(mr?.Department?.DepartmentName ?? "........")}</p>

<div class=""section-title"">II. THÔNG TIN PHẪU THUẬT / THỦ THUẬT</div>
<p>Tên PT/TT: <b>{System.Net.WebUtility.HtmlEncode(record.ProcedurePerformed ?? request?.PlannedProcedure ?? "")}</b></p>
<p>Ngày thực hiện: {record.ActualStartTime?.ToString("dd/MM/yyyy HH:mm") ?? schedule?.ScheduledDateTime.ToString("dd/MM/yyyy HH:mm") ?? "........"}</p>
<p>Phòng mổ: {System.Net.WebUtility.HtmlEncode(schedule?.OperatingRoom?.RoomName ?? "........")}</p>
<p>Bác sĩ phẫu thuật chính: {System.Net.WebUtility.HtmlEncode(surgeon?.FullName ?? "........")}</p>

<div class=""section-title"">III. CHẨN ĐOÁN SAU PT/TT</div>
<p>{System.Net.WebUtility.HtmlEncode(record.PostOpDiagnosis ?? "............................................")}</p>

<div class=""section-title"">IV. MẪU BỆNH PHẨM / GIẢI PHẪU BỆNH</div>
<p>{System.Net.WebUtility.HtmlEncode(record.Specimens ?? "............................................")}</p>

<div class=""section-title"">V. TAI BIẾN / BIẾN CHỨNG</div>
<p>{(string.IsNullOrEmpty(record.Complications) ? "Không có" : System.Net.WebUtility.HtmlEncode(record.Complications))}</p>";

        var html = GetGenericForm(
            "GIẤY CHỨNG NHẬn PHẪU THUẬT / THỦ THUẬT",
            "MS. 18/BV",
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            body, surgeon?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// MS. 19/BV — Bien ban kiem thao tu vong
    /// Lay thong tin tu MedicalRecord (BN tu vong)
    /// </summary>
    public async Task<byte[]> GenerateDeathReviewAsync(Guid medicalRecordId)
    {
        var mr = await _db.MedicalRecords
            .AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId && !m.IsDeleted);

        if (mr == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("Lỗi", "<p>Không tìm thấy hồ sơ bệnh án</p>"));

        var patient = mr.Patient;

        var body = $@"
<div class=""section-title"">I. THÔNG TIN BỆNH NHÂN</div>
<p>Ngày vào viện: {mr.AdmissionDate.ToString("dd/MM/yyyy")} &nbsp;&nbsp;
   Ngày tử vong: {mr.DischargeDate?.ToString("dd/MM/yyyy HH:mm") ?? "........"}</p>
<p>Chẩn đoán vào viện: {System.Net.WebUtility.HtmlEncode(mr.InitialDiagnosis ?? "........")}</p>
<p>Chẩn đoán tử vong: {System.Net.WebUtility.HtmlEncode(mr.MainDiagnosis ?? "........")} ({System.Net.WebUtility.HtmlEncode(mr.MainIcdCode ?? "")})</p>

<div class=""section-title"">II. TÓM TẮT QUÁ TRÌNH BỆNH LÝ VÀ DIỄN BIẾN LÂM SÀNG</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">III. KẾT LUậN NGUYÊN NHÂN TỬ VONG</div>
<p>Nguyên nhân trực tiếp: ................................................................</p>
<p>Nguyên nhân gián tiếp: ................................................................</p>
<p>Phân loại: <span class=""checkbox""></span> Tất yếu &nbsp;&nbsp; <span class=""checkbox""></span> Có thể tránh</p>

<div class=""section-title"">IV. NHậN XÉT QUÁ TRÌNH CHẨN ĐOÁN VÀ ĐIỀU TRỊ</div>
<p>Chẩn đoán: <span class=""checkbox""></span> Đúng &nbsp;&nbsp; <span class=""checkbox""></span> Chưa đủ &nbsp;&nbsp;
   Điều trị: <span class=""checkbox""></span> Đúng phác đồ &nbsp;&nbsp; <span class=""checkbox""></span> Có sai sót</p>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">V. BÀI HỌC KINH NGHIỆM VÀ KIẮN NGHị</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">VI. THÀNH PHẦN THAM DỰ</div>
<p>Chủ toạ: ................................................................</p>
<p>Thư ký: ................................................................</p>
<p>Thành viên: ................................................................</p>";

        var html = GetGenericForm(
            "BIÊN BẢN KIỂM THẢO TỬ VONG",
            "MS. 19/BV",
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr.MedicalRecordCode, mr.Department?.DepartmentName,
            body, mr.Doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// MS. 20/BV — Phieu nhan dinh phan loai cap cuu
    /// Lay thong tin tu Examination (luot cap cuu)
    /// </summary>
    public async Task<byte[]> GenerateTriageAssessmentAsync(Guid examinationId)
    {
        var exam = await _db.Examinations
            .AsNoTracking()
            .Include(e => e.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Include(e => e.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(e => e.Doctor)
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);

        if (exam == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("Lỗi", "<p>Không tìm thấy lượt khám</p>"));

        var patient = exam.MedicalRecord?.Patient;
        var mr = exam.MedicalRecord;

        var body = $@"
<div class=""section-title"">I. PHÂN LOẠI MÀU CẤP CỨU</div>
<table style=""border-collapse:collapse;width:100%;font-size:12px"">
<thead><tr style=""background:#f5f5f5"">
  <th style=""border:1px solid #999;padding:4px;width:30px"">Chợn</th>
  <th style=""border:1px solid #999;padding:4px"">Màu</th>
  <th style=""border:1px solid #999;padding:4px"">Mức độ</th>
  <th style=""border:1px solid #999;padding:4px"">Thời gian</th>
</tr></thead>
<tbody>
<tr><td style=""border:1px solid #999;text-align:center""></td><td style=""border:1px solid #999;padding:4px""><b style=""color:red"">Đỏ</b></td><td style=""border:1px solid #999;padding:4px"">Nguy kịch — Cấp cứu ngay</td><td style=""border:1px solid #999;padding:4px"">0–10 phút</td></tr>
<tr><td style=""border:1px solid #999;text-align:center""></td><td style=""border:1px solid #999;padding:4px""><b style=""color:orange"">Cam</b></td><td style=""border:1px solid #999;padding:4px"">Rất nặng — Ưu tiên cao</td><td style=""border:1px solid #999;padding:4px"">10–30 phút</td></tr>
<tr><td style=""border:1px solid #999;text-align:center""></td><td style=""border:1px solid #999;padding:4px""><b style=""color:#d48806"">Vàng</b></td><td style=""border:1px solid #999;padding:4px"">Nặng — Theo dõi sát</td><td style=""border:1px solid #999;padding:4px"">30–60 phút</td></tr>
<tr><td style=""border:1px solid #999;text-align:center""></td><td style=""border:1px solid #999;padding:4px""><b style=""color:green"">Xanh lá</b></td><td style=""border:1px solid #999;padding:4px"">Nhỹ — Theo hàng đợi thông thường</td><td style=""border:1px solid #999;padding:4px"">60–120 phút</td></tr>
<tr><td style=""border:1px solid #999;text-align:center""></td><td style=""border:1px solid #999;padding:4px""><b>Đen/Xám</b></td><td style=""border:1px solid #999;padding:4px"">Phổ thác / Không cần cấp cứu</td><td style=""border:1px solid #999;padding:4px"">—</td></tr>
</tbody></table>

<div class=""section-title"">II. ĐÁNH GIÁ LÂM SÀNG BAN ĐẦU</div>
<p>Mạch: {exam.Pulse?.ToString() ?? "........"} l/p &nbsp;&nbsp;
   HA: {exam.BloodPressureSystolic?.ToString() ?? "..."}/{exam.BloodPressureDiastolic?.ToString() ?? "..."} mmHg &nbsp;&nbsp;
   Nhiệt độ: {exam.Temperature?.ToString("0.0") ?? "........"} °C &nbsp;&nbsp;
   SpO2: {exam.SpO2?.ToString("0.0") ?? "........"} %</p>
<p>Lý do đến cấp cứu: {System.Net.WebUtility.HtmlEncode(exam.ChiefComplaint ?? "............................................")}</p>

<div class=""section-title"">III. XỬ TRÍ BAN ĐẦU</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">IV. PHÂN LUỒNG</div>
<p><span class=""checkbox""></span> Phòng cấp cứu &nbsp;&nbsp;
   <span class=""checkbox""></span> Nhập viện &nbsp;&nbsp;
   <span class=""checkbox""></span> Chuyển viện &nbsp;&nbsp;
   <span class=""checkbox""></span> Về nhà</p>
<p>Khoa tiếp nhận: ................................................................ &nbsp;&nbsp;
   Bác sĩ nhận bệnh: ................................................................</p>";

        var html = GetGenericForm(
            "PHIẾU NHẬN ĐịNH PHÂN LOẠI CẤP CỨU",
            "MS. 20/BV",
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            body, exam.Doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// MS. 21/BV — Phieu ban giao chuyen khoa (bac si)
    /// Lay thong tin tu Admission khi chuyen khoa
    /// </summary>
    public async Task<byte[]> GenerateDeptTransferDocAsync(Guid admissionId)
    {
        var admission = await _db.Admissions
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Include(a => a.AdmittingDoctor)
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

        if (admission == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("Lỗi", "<p>Không tìm thấy lượt nhập viện</p>"));

        var patient = admission.Patient;
        var mr = admission.MedicalRecord;

        var body = $@"
<div class=""section-title"">I. THÔNG TIN CHUYỂN KHOA</div>
<p>Ngày giờ chuyển: {DateTime.Now:dd/MM/yyyy HH:mm}</p>
<p>Khoa giao: {System.Net.WebUtility.HtmlEncode(mr?.Department?.DepartmentName ?? "........")} &nbsp;&nbsp; Khoa nhận: ................................................................</p>
<p>Buồng/Giường hiện tại: ................................ &nbsp;&nbsp; Buồng/Giường tiếp nhận: ................................</p>

<div class=""section-title"">II. CHẨN ĐOÁN</div>
<p>Chẩn đoán: {System.Net.WebUtility.HtmlEncode(mr?.MainDiagnosis ?? admission.DiagnosisOnAdmission ?? "........")} ({System.Net.WebUtility.HtmlEncode(mr?.MainIcdCode ?? "")})</p>
<p>Bệnh phụ/bệnh kèm: ................................................................</p>

<div class=""section-title"">III. TÓM TẮT BỆNH Sử VÀ DIỄN BIẾN</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">IV. DẤU HIỆU SINH TỒN LÚC CHUYỂN</div>
<p>Mạch: ........ l/p &nbsp;&nbsp; HA: ........ mmHg &nbsp;&nbsp; Nhiệt độ: ........ °C &nbsp;&nbsp; SpO2: ........ % &nbsp;&nbsp; GCS: ........</p>
<p>Tình trạng lúc chuyển: ................................................................</p>

<div class=""section-title"">V. THUỐC ĐANG DÙNG / Y LỆNH ĐANG THI HÀNH</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">VI. LÝ DO CHUYỂN KHOA</div>
<p>............................................................................................................</p>

<div class=""section-title"">VII. DẶN DÒ / Y LỆNH TIẮP THEO</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>";

        var html = GetGenericForm(
            "PHIẾU BÀN GIAO CHUYỂN KHOA (BÁC SĨ)",
            "MS. 21/BV",
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            body, admission.AdmittingDoctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    /// <summary>
    /// DD. 22 — Phieu ban giao chuyen khoa (dieu duong)
    /// </summary>
    public async Task<byte[]> GenerateDeptTransferNurseAsync(Guid admissionId)
    {
        var admission = await _db.Admissions
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

        if (admission == null)
            return Encoding.UTF8.GetBytes(WrapHtmlPage("Lỗi", "<p>Không tìm thấy lượt nhập viện</p>"));

        var patient = admission.Patient;
        var mr = admission.MedicalRecord;

        var body = $@"
<div class=""section-title"">I. THÔNG TIN BAN GIAO</div>
<p>Ngày giờ: {DateTime.Now:dd/MM/yyyy HH:mm}</p>
<p>Khoa giao: {System.Net.WebUtility.HtmlEncode(mr?.Department?.DepartmentName ?? "........")} &nbsp;&nbsp; Khoa nhận: ................................................................</p>
<p>Chẩn đoán: {System.Net.WebUtility.HtmlEncode(mr?.MainDiagnosis ?? admission.DiagnosisOnAdmission ?? "........")}</p>

<div class=""section-title"">II. SINH HIỆU LÚC BÀN GIAO</div>
<p>Mạch: ........ l/p &nbsp;&nbsp; HA: ........ mmHg &nbsp;&nbsp; Nhiệt độ: ........ °C &nbsp;&nbsp; SpO2: ........ % &nbsp;&nbsp; GCS: ........ &nbsp;&nbsp; Cân nặng: ........ kg</p>

<div class=""section-title"">III. NHẬN ĐịNH ĐIỀU DƯỜNG</div>
<p>Ý thức: ........ &nbsp;&nbsp; Đau (VAS): ........ &nbsp;&nbsp; Tình trạng da: <span class=""checkbox""></span> Bình thường &nbsp;&nbsp; <span class=""checkbox""></span> Có vết loét</p>
<p>Đường truyền/Catheter: ................................................................</p>
<p>Dẫn lưu/Sonde: ................................................................</p>
<p>Vết thương/Vết mổ: ................................................................</p>

<div class=""section-title"">IV. THUỐC VÀ Y LỆNH ĐIỀU DƯỜNG ĐANG THỰC HIỆN</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">V. TÀI SẢN VÀ ĐỒ DÙNG CÁ NHÂN</div>
<p><span class=""checkbox""></span> Quần áo &nbsp;&nbsp; <span class=""checkbox""></span> Điện thoại &nbsp;&nbsp; <span class=""checkbox""></span> Tiền mặt &nbsp;&nbsp; <span class=""checkbox""></span> Tư trang &nbsp;&nbsp; <span class=""checkbox""></span> CCCD/BHYT</p>
<p>Ghi chú: ................................................................</p>

<div class=""section-title"">VI. DẶN DÒ ĐẶC BIỆT</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>";

        var html = GetGenericForm(
            "PHIẾU BÀN GIAO CHUYỂN KHOA (ĐIỀU DƯỜNG)",
            "DD. 22",
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            body, null);

        return Encoding.UTF8.GetBytes(html);
    }
}
