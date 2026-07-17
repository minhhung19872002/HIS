using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

public partial class SurgeryOperationServiceImpl
{
    public async Task<byte[]> PrintSurgeryCertificateAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">GIẤY CHỨNG NHẬN PHẪU THUẬT / THỦ THUẬT</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-01</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">THÔNG TIN PHẪU THUẬT</div>
<div class=""field""><span class=""field-label"">Mã yêu cầu:</span><span class=""field-value"">{Esc(req.RequestCode)}</span></div>
<div class=""field""><span class=""field-label"">Loại phẫu thuật:</span><span class=""field-value"">{Esc(req.SurgeryType)}</span></div>
<div class=""field""><span class=""field-label"">Chẩn đoán trước mổ:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)} {(string.IsNullOrEmpty(req.PreOpIcdCode) ? "" : $"({Esc(req.PreOpIcdCode)})")}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp PT:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>");

            if (sched != null)
            {
                body.AppendLine($@"
<div class=""field""><span class=""field-label"">Ngày mổ:</span><span class=""field-value"">{sched.ScheduledDateTime:dd/MM/yyyy HH:mm}</span></div>
<div class=""field""><span class=""field-label"">Phòng mổ:</span><span class=""field-value"">{Esc(room?.RoomName)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật viên:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>");
            }

            if (rec != null)
            {
                var resultText = rec.Result switch { 1 => "Thành công", 2 => "Có biến chứng", 3 => "Tử vong", _ => "" };
                body.AppendLine($@"
<div class=""section-title"">KẾT QUẢ PHẪU THUẬT</div>
<div class=""field""><span class=""field-label"">Chẩn đoán sau mổ:</span><span class=""field-value"">{Esc(rec.PostOpDiagnosis)} {(string.IsNullOrEmpty(rec.PostOpIcdCode) ? "" : $"({Esc(rec.PostOpIcdCode)})")}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp đã thực hiện:</span><span class=""field-value"">{Esc(rec.ProcedurePerformed)}</span></div>
<div class=""field""><span class=""field-label"">Kết quả:</span><span class=""field-value"">{resultText}</span></div>
<div class=""field""><span class=""field-label"">Thời gian thực tế:</span><span class=""field-value"">{rec.ActualStartTime?.ToString("HH:mm")} - {rec.ActualEndTime?.ToString("HH:mm")} ({rec.ActualDuration} phút)</span></div>");
            }

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, true));

            var html = WrapHtmlPage("Giấy chứng nhận phẫu thuật - MS.PT-01", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintSurgeryReportAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU PHẪU THUẬT</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-02</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">I. TRƯỚC MỔ</div>
<div class=""field""><span class=""field-label"">Chẩn đoán trước mổ:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)} {(string.IsNullOrEmpty(req.PreOpIcdCode) ? "" : $"({Esc(req.PreOpIcdCode)})")}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp PT dự kiến:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>
<div class=""field""><span class=""field-label"">Loại phẫu thuật:</span><span class=""field-value"">{Esc(req.SurgeryType)}</span></div>
<div class=""field""><span class=""field-label"">Yêu cầu đặc biệt:</span><span class=""field-value"">{Esc(req.SpecialRequirements)}</span></div>");

            // Tường trình PTTT (OPD-inline, MS.PT-02): ưu tiên cột riêng (migration 78),
            // fallback parse sentinel trong Notes cho row legacy chưa backfill.
            var surgeryReport = !string.IsNullOrWhiteSpace(req.SurgeryReport)
                ? req.SurgeryReport : ExtractNoteTag(req.Notes, "[TUONGTRINH]");
            var surgeryConclusion = !string.IsNullOrWhiteSpace(req.Conclusion)
                ? req.Conclusion : ExtractNoteTag(req.Notes, "[KETLUAN]");
            if (!string.IsNullOrWhiteSpace(surgeryReport) || !string.IsNullOrWhiteSpace(surgeryConclusion))
            {
                body.AppendLine($@"
<div class=""section-title"">TƯỜNG TRÌNH PHẪU THUẬT / THỦ THUẬT</div>
<p>{Esc(surgeryReport).Replace("\n", "<br/>")}</p>");
                if (!string.IsNullOrWhiteSpace(surgeryConclusion))
                    body.AppendLine($@"<p class=""mt-10""><b>Kết luận:</b> {Esc(surgeryConclusion).Replace("\n", "<br/>")}</p>");
            }

            if (sched != null)
            {
                body.AppendLine($@"
<div class=""section-title"">II. EKIP PHẪU THUẬT</div>
<div class=""field""><span class=""field-label"">Phẫu thuật viên chính:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Bác sĩ gây mê:</span><span class=""field-value"">{Esc(anesthesiologist?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Phòng mổ:</span><span class=""field-value"">{Esc(room?.RoomName)}</span></div>
<div class=""field""><span class=""field-label"">Ngày giờ mổ:</span><span class=""field-value"">{sched.ScheduledDateTime:HH:mm 'ngày' dd/MM/yyyy}</span></div>
<div class=""field""><span class=""field-label"">Thời gian dự kiến:</span><span class=""field-value"">{sched.EstimatedDuration ?? req.EstimatedDuration ?? 0} phút</span></div>");
            }

            if (rec != null)
            {
                var resultText = rec.Result switch { 1 => "Thành công", 2 => "Có biến chứng", 3 => "Tử vong", _ => "" };
                body.AppendLine($@"
<div class=""section-title"">III. DIỄN BIẾN PHẪU THUẬT</div>
<div class=""field""><span class=""field-label"">Bắt đầu:</span><span class=""field-value"">{rec.ActualStartTime?.ToString("HH:mm dd/MM/yyyy")}</span></div>
<div class=""field""><span class=""field-label"">Kết thúc:</span><span class=""field-value"">{rec.ActualEndTime?.ToString("HH:mm dd/MM/yyyy")}</span></div>
<div class=""field""><span class=""field-label"">Thời gian thực tế:</span><span class=""field-value"">{rec.ActualDuration} phút</span></div>
<div class=""field""><span class=""field-label"">Phương pháp đã thực hiện:</span><span class=""field-value"">{Esc(rec.ProcedurePerformed)}</span></div>
<p class=""mt-10""><b>Mô tả quá trình:</b></p>
<p>{Esc(rec.Findings)}</p>

<div class=""section-title"">IV. KẾT QUẢ</div>
<div class=""field""><span class=""field-label"">Chẩn đoán sau mổ:</span><span class=""field-value"">{Esc(rec.PostOpDiagnosis)} {(string.IsNullOrEmpty(rec.PostOpIcdCode) ? "" : $"({Esc(rec.PostOpIcdCode)})")}</span></div>
<div class=""field""><span class=""field-label"">Kết quả:</span><span class=""field-value"">{resultText}</span></div>
<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{Esc(rec.Complications)}</span></div>
<div class=""field""><span class=""field-label"">Mất máu:</span><span class=""field-value"">{rec.BloodLoss?.ToString("N0")} ml</span></div>
<div class=""field""><span class=""field-label"">Mẫu bệnh phẩm:</span><span class=""field-value"">{Esc(rec.Specimens)}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage("Phiếu phẫu thuật - MS.PT-02", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintSafetyChecklistAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">BẢNG KIỂM AN TOÀN PHẪU THUẬT</div>");
            body.AppendLine(@"<div class=""form-number"">Theo WHO Surgical Safety Checklist</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phòng mổ:</span><span class=""field-value"">{Esc(room?.RoomName)}</span></div>
<div class=""field""><span class=""field-label"">Ngày:</span><span class=""field-value"">{sched?.ScheduledDateTime.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy")}</span></div>

<div class=""section-title"">I. SIGN IN (TRƯỚC KHI GÂY MÊ)</div>
<table class=""bordered"">
<tr><td style=""width:30px""><span class=""checkbox""></span></td><td>Xác nhận danh tính bệnh nhân, vị trí mổ, phương pháp PT, cam kết</td><td style=""width:80px""></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Đánh dấu vị trí mổ (nếu cần)</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Kiểm tra máy gây mê, thuốc gây mê</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Đo SpO2 đã gắn và hoạt động</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Tiền sử dị ứng: ..................................</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Nguy cơ đường thở khó / hít sặc</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Nguy cơ mất máu > 500ml (trẻ em: 7ml/kg)</td><td></td></tr>
</table>

<div class=""section-title"">II. TIME OUT (TRƯỚC KHI RẠCH DA)</div>
<table class=""bordered"">
<tr><td style=""width:30px""><span class=""checkbox""></span></td><td>Xác nhận tất cả thành viên ekip đã giới thiệu tên và vai trò</td><td style=""width:80px""></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Xác nhận tên bệnh nhân, phương pháp PT, vị trí mổ</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Kháng sinh dự phòng đã cho trong 60 phút trước</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Dự kiến biến cố quan trọng</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>PTV: thời gian PT, mất máu dự kiến, vấn đề đặc biệt</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>BS gây mê: vấn đề cụ thể với BN</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>ĐD: dụng cụ đã tiệt khuẩn, vấn đề thiết bị</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Hình ảnh cần thiết đã treo</td><td></td></tr>
</table>

<div class=""section-title"">III. SIGN OUT (TRƯỚC KHI BN RỜI PHÒNG MỔ)</div>
<table class=""bordered"">
<tr><td style=""width:30px""><span class=""checkbox""></span></td><td>ĐD xác nhận: Tên phẫu thuật đã ghi</td><td style=""width:80px""></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Đếm dụng cụ, gạc, kim đầy đủ</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Mẫu bệnh phẩm đã dán nhãn</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>Vấn đề thiết bị cần xử lý</td><td></td></tr>
<tr><td><span class=""checkbox""></span></td><td>PTV, BS gây mê, ĐD xem xét kế hoạch hồi phục và xử trí chính</td><td></td></tr>
</table>");

            // Signature: PTV + BS gây mê + ĐD dụng cụ
            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Phẫu thuật viên</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(surgeon?.FullName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">BS gây mê</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(anesthesiologist?.FullName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">ĐD dụng cụ</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
</div>");

            var html = WrapHtmlPage("Bảng kiểm an toàn phẫu thuật - WHO", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU MỔ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-03</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">THÔNG TIN CA MỔ</div>
<div class=""field""><span class=""field-label"">Chẩn đoán trước mổ:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Loại phẫu thuật:</span><span class=""field-value"">{Esc(req.SurgeryType)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>
<div class=""field""><span class=""field-label"">Phòng mổ:</span><span class=""field-value"">{Esc(room?.RoomName)}</span></div>
<div class=""field""><span class=""field-label"">Ngày mổ:</span><span class=""field-value"">{sched?.ScheduledDateTime.ToString("dd/MM/yyyy HH:mm") ?? ""}</span></div>");

            if (sched != null)
            {
                body.AppendLine($@"
<div class=""section-title"">EKIP MỔ</div>
<div class=""field""><span class=""field-label"">Phẫu thuật viên chính:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Bác sĩ gây mê:</span><span class=""field-value"">{Esc(anesthesiologist?.FullName)}</span></div>");
            }

            if (rec != null)
            {
                body.AppendLine($@"
<div class=""section-title"">DIỄN BIẾN MỔ</div>
<div class=""field""><span class=""field-label"">Bắt đầu:</span><span class=""field-value"">{rec.ActualStartTime?.ToString("HH:mm dd/MM/yyyy")}</span></div>
<div class=""field""><span class=""field-label"">Kết thúc:</span><span class=""field-value"">{rec.ActualEndTime?.ToString("HH:mm dd/MM/yyyy")}</span></div>
<div class=""field""><span class=""field-label"">Thời gian mổ:</span><span class=""field-value"">{rec.ActualDuration} phút</span></div>
<p class=""mt-10""><b>Mô tả:</b></p>
<p>{Esc(rec.Findings)}</p>
<div class=""field mt-10""><span class=""field-label"">Chẩn đoán sau mổ:</span><span class=""field-value"">{Esc(rec.PostOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{Esc(rec.Complications) ?? "Không"}</span></div>
<div class=""field""><span class=""field-label"">Mất máu:</span><span class=""field-value"">{rec.BloodLoss?.ToString("N0") ?? "0"} ml</span></div>
<div class=""field""><span class=""field-label"">Mẫu bệnh phẩm:</span><span class=""field-value"">{Esc(rec.Specimens)}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage("Phiếu mổ - MS.PT-03", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintPathologyFormAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, _, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU GỬI MẪU GIẢI PHẪU BỆNH</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-04</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">THÔNG TIN LÂM SÀNG</div>
<div class=""field""><span class=""field-label"">Chẩn đoán lâm sàng:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp PT:</span><span class=""field-value"">{Esc(rec?.ProcedurePerformed ?? req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Ngày PT:</span><span class=""field-value"">{sched?.ScheduledDateTime.ToString("dd/MM/yyyy") ?? ""}</span></div>

<div class=""section-title"">MẪU BỆNH PHẨM</div>
<div class=""field""><span class=""field-label"">Loại bệnh phẩm:</span><span class=""field-value"">{Esc(rec?.Specimens)}</span></div>
<div class=""field""><span class=""field-label"">Số lượng mẫu:</span><span class=""field-value dotted-line"" style=""min-width:200px"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Cố định trong:</span><span class=""field-value"">Formol 10%</span></div>
<div class=""field""><span class=""field-label"">Thời gian lấy mẫu:</span><span class=""field-value"">{rec?.ActualEndTime?.ToString("HH:mm dd/MM/yyyy") ?? ""}</span></div>

<div class=""section-title"">YÊU CẦU XÉT NGHIỆM</div>
<table class=""bordered"">
<tr><td><span class=""checkbox""></span> Giải phẫu bệnh thường quy</td><td><span class=""checkbox""></span> Sinh thiết tức thì (cắt lạnh)</td></tr>
<tr><td><span class=""checkbox""></span> Nhuộm hóa mô miễn dịch</td><td><span class=""checkbox""></span> Tế bào học</td></tr>
</table>

<p class=""mt-10""><b>Yêu cầu khác:</b> ........................................................</p>
<p class=""mt-10""><b>Ghi chú:</b> {Esc(rec?.Notes)}</p>");

            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Phẫu thuật viên gửi</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(surgeon?.FullName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Người nhận mẫu</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
</div>");

            var html = WrapHtmlPage("Phiếu gửi mẫu giải phẫu bệnh - MS.PT-04", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

}
