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
    public async Task<byte[]> PrintConsultationMinutesAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">BIÊN BẢN HỘI CHẨN PHẪU THUẬT</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-05</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Thời gian hội chẩn:</span><span class=""field-value"">......giờ......phút, ngày......tháng......năm......</span></div>
<div class=""field""><span class=""field-label"">Địa điểm:</span><span class=""field-value dotted-line"">&nbsp;</span></div>

<div class=""section-title"">1. TÓM TẮT BỆNH ÁN</div>
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)} {(string.IsNullOrEmpty(req.PreOpIcdCode) ? "" : $"({Esc(req.PreOpIcdCode)})")}</span></div>
<p class=""mt-10"">Tóm tắt diễn biến bệnh: ............................................................................</p>
<p>.............................................................................................................</p>

<div class=""section-title"">2. Ý KIẾN HỘI CHẨN</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">3. KẾT LUẬN</div>
<div class=""field""><span class=""field-label"">Chỉ định phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>
<p class=""mt-10""><b>Dự kiến ekip mổ:</b></p>
<div class=""field""><span class=""field-label"">Phẫu thuật viên:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Bác sĩ gây mê:</span><span class=""field-value"">{Esc(anesthesiologist?.FullName)}</span></div>

<div class=""section-title"">4. THÀNH PHẦN THAM DỰ</div>
<table class=""bordered"">
<thead><tr><th>STT</th><th>Họ và tên</th><th>Chức danh</th><th>Khoa/Phòng</th><th>Ký tên</th></tr></thead>
<tbody>
<tr><td class=""text-center"">1</td><td>{Esc(surgeon?.FullName)}</td><td>Phẫu thuật viên</td><td></td><td></td></tr>
<tr><td class=""text-center"">2</td><td>{Esc(anesthesiologist?.FullName)}</td><td>BS gây mê</td><td></td><td></td></tr>
<tr><td class=""text-center"">3</td><td></td><td></td><td></td><td></td></tr>
<tr><td class=""text-center"">4</td><td></td><td></td><td></td><td></td></tr>
</tbody>
</table>");

            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Thư ký</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Chủ tọa</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
</div>");

            var html = WrapHtmlPage("Biên bản hội chẩn phẫu thuật - MS.PT-05", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintPreOpChecklistAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, _, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">BẢNG KIỂM TRƯỚC MỔ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-06</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật dự kiến:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Ngày mổ dự kiến:</span><span class=""field-value"">{sched?.ScheduledDateTime.ToString("dd/MM/yyyy HH:mm") ?? ""}</span></div>

<div class=""section-title"">A. HỒ SƠ</div>
<table class=""bordered"">
<tr><td><span class=""checkbox""></span> Phiếu đồng ý phẫu thuật đã ký</td><td><span class=""checkbox""></span> Giấy cam kết gây mê đã ký</td></tr>
<tr><td><span class=""checkbox""></span> Xét nghiệm máu (công thức, đông máu, nhóm máu)</td><td><span class=""checkbox""></span> Kết quả X-quang ngực</td></tr>
<tr><td><span class=""checkbox""></span> Kết quả ECG</td><td><span class=""checkbox""></span> Kết quả siêu âm (nếu cần)</td></tr>
<tr><td><span class=""checkbox""></span> Hồ sơ bệnh án đầy đủ</td><td><span class=""checkbox""></span> Phiếu khám tiền mê</td></tr>
</table>

<div class=""section-title"">B. BỆNH NHÂN</div>
<table class=""bordered"">
<tr><td><span class=""checkbox""></span> Nhịn ăn uống ≥ 6 giờ</td><td><span class=""checkbox""></span> Tháo trang sức, răng giả</td></tr>
<tr><td><span class=""checkbox""></span> Vệ sinh vùng mổ</td><td><span class=""checkbox""></span> Thay quần áo phẫu thuật</td></tr>
<tr><td><span class=""checkbox""></span> Xác nhận vị trí mổ bằng bút đánh dấu</td><td><span class=""checkbox""></span> Đặt sonde tiểu (nếu cần)</td></tr>
<tr><td><span class=""checkbox""></span> Đường truyền tĩnh mạch</td><td><span class=""checkbox""></span> Tiền mê đã cho (nếu có y lệnh)</td></tr>
</table>

<div class=""section-title"">C. THUỐC VÀ DỊ ỨNG</div>
<div class=""field""><span class=""field-label"">Tiền sử dị ứng:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Thuốc đang dùng:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Kháng sinh dự phòng:</span><span class=""field-value dotted-line"">&nbsp;</span></div>");

            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">ĐD phòng bệnh</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">ĐD phòng mổ nhận</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">BS gây mê</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(anesthesiologist?.FullName)}</div>
    </div>
</div>");

            var html = WrapHtmlPage("Bảng kiểm trước mổ - MS.PT-06", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintPreOpQuestionnaireAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, _, pat, _, anesthesiologist, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU KHÁM TIỀN MÊ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-07</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật dự kiến:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Ngày khám tiền mê:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy}</span></div>

<div class=""section-title"">1. TIỀN SỬ</div>
<div class=""field""><span class=""field-label"">Tiền sử nội khoa:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Tiền sử ngoại khoa:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Tiền sử gây mê:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Dị ứng thuốc:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Thuốc đang dùng:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Răng giả / răng lung lay:</span><span class=""field-value dotted-line"">&nbsp;</span></div>

<div class=""section-title"">2. KHÁM HIỆN TẠI</div>
<div class=""field""><span class=""field-label"">Cân nặng:</span><span class=""field-value dotted-line"" style=""width:80px"">&nbsp;</span><span style=""margin-left:10px""><b>kg</b></span>
    <span style=""margin-left:20px""><b>Chiều cao:</b></span><span class=""field-value dotted-line"" style=""width:80px"">&nbsp;</span><span style=""margin-left:10px""><b>cm</b></span>
    <span style=""margin-left:20px""><b>BMI:</b></span><span class=""field-value dotted-line"" style=""width:60px"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Mạch:</span><span class=""field-value dotted-line"" style=""width:60px"">&nbsp;</span><span style=""margin-left:10px""><b>l/p</b></span>
    <span style=""margin-left:20px""><b>HA:</b></span><span class=""field-value dotted-line"" style=""width:80px"">&nbsp;</span><span style=""margin-left:10px""><b>mmHg</b></span>
    <span style=""margin-left:20px""><b>SpO2:</b></span><span class=""field-value dotted-line"" style=""width:60px"">&nbsp;</span><span style=""margin-left:10px""><b>%</b></span></div>
<div class=""field""><span class=""field-label"">Tim mạch:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Hô hấp:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Đường thở:</span><span class=""field-value dotted-line"">&nbsp;</span></div>

<div class=""section-title"">3. PHÂN LOẠI</div>
<p><b>ASA:</b>
    <span class=""checkbox""></span> I &nbsp;
    <span class=""checkbox""></span> II &nbsp;
    <span class=""checkbox""></span> III &nbsp;
    <span class=""checkbox""></span> IV &nbsp;
    <span class=""checkbox""></span> V &nbsp;
    <span class=""checkbox""></span> VI
</p>
<p><b>Mallampati:</b>
    <span class=""checkbox""></span> I &nbsp;
    <span class=""checkbox""></span> II &nbsp;
    <span class=""checkbox""></span> III &nbsp;
    <span class=""checkbox""></span> IV
</p>

<div class=""section-title"">4. KẾ HOẠCH GÂY MÊ</div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>
<div class=""field""><span class=""field-label"">Chỉ dẫn trước mổ:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Tiền mê:</span><span class=""field-value dotted-line"">&nbsp;</span></div>");

            body.AppendLine(GetSignatureBlock(anesthesiologist?.FullName, null, null, true));

            var html = WrapHtmlPage("Phiếu khám tiền mê - MS.PT-07", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintAnesthesiaFormAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU GÂY MÊ HỒI SỨC</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-08</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật viên:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">BS gây mê:</span><span class=""field-value"">{Esc(anesthesiologist?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Phòng mổ:</span><span class=""field-value"">{Esc(room?.RoomName)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>

<div class=""section-title"">THEO DÕI GÂY MÊ</div>
<table class=""bordered"">
<thead>
<tr>
    <th style=""width:60px"">Giờ</th>
    <th>Mạch</th>
    <th>HA</th>
    <th>SpO2</th>
    <th>EtCO2</th>
    <th>Thuốc mê</th>
    <th>Dịch truyền</th>
    <th>Ghi chú</th>
</tr>
</thead>
<tbody>");

            // 10 empty rows for manual recording
            for (int i = 0; i < 10; i++)
                body.AppendLine("<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");

            body.AppendLine(@"</tbody></table>");

            body.AppendLine($@"
<div class=""section-title"">TỔNG KẾT GÂY MÊ</div>
<div class=""field""><span class=""field-label"">Bắt đầu gây mê:</span><span class=""field-value"">{rec?.ActualStartTime?.ToString("HH:mm") ?? "........"}</span></div>
<div class=""field""><span class=""field-label"">Kết thúc gây mê:</span><span class=""field-value"">{rec?.ActualEndTime?.ToString("HH:mm") ?? "........"}</span></div>
<div class=""field""><span class=""field-label"">Tổng dịch truyền:</span><span class=""field-value dotted-line"">&nbsp;</span><span style=""margin-left:10px""><b>ml</b></span></div>
<div class=""field""><span class=""field-label"">Mất máu ước tính:</span><span class=""field-value"">{rec?.BloodLoss?.ToString("N0") ?? "........"} ml</span></div>
<div class=""field""><span class=""field-label"">Nước tiểu:</span><span class=""field-value dotted-line"">&nbsp;</span><span style=""margin-left:10px""><b>ml</b></span></div>
<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{Esc(rec?.Complications) ?? "Không"}</span></div>");

            body.AppendLine(GetSignatureBlock(anesthesiologist?.FullName, null, null, false));

            var html = WrapHtmlPage("Phiếu gây mê hồi sức - MS.PT-08", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintPostOpCareFormAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU CHĂM SÓC SAU MỔ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-09</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Phẫu thuật đã thực hiện:</span><span class=""field-value"">{Esc(rec?.ProcedurePerformed ?? req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{GetAnesthesiaTypeName(req.AnesthesiaType ?? 0)}</span></div>
<div class=""field""><span class=""field-label"">Ngày mổ:</span><span class=""field-value"">{rec?.ActualStartTime?.ToString("dd/MM/yyyy") ?? sched?.ScheduledDateTime.ToString("dd/MM/yyyy") ?? ""}</span></div>

<div class=""section-title"">Y LỆNH SAU MỔ</div>
<p>{Esc(rec?.PostOpInstructions)}</p>
<p class=""mt-10""><b>Chăm sóc:</b> {Esc(rec?.PostOpCare)}</p>

<div class=""section-title"">THEO DÕI SAU MỔ</div>
<table class=""bordered"">
<thead>
<tr>
    <th style=""width:60px"">Giờ</th>
    <th>Tri giác</th>
    <th>Mạch</th>
    <th>HA</th>
    <th>SpO2</th>
    <th>Nhiệt độ</th>
    <th>Đau (VAS)</th>
    <th>Dịch dẫn lưu</th>
    <th>Nước tiểu</th>
    <th>ĐD ký</th>
</tr>
</thead>
<tbody>");

            for (int i = 0; i < 12; i++)
                body.AppendLine("<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");

            body.AppendLine(@"</tbody></table>");

            body.AppendLine($@"
<div class=""section-title"">ĐÁNH GIÁ KHI CHUYỂN KHOA</div>
<div class=""field""><span class=""field-label"">Tri giác:</span><span class=""field-value dotted-line"">&nbsp;</span></div>
<div class=""field""><span class=""field-label"">Sinh hiệu ổn định:</span><span class=""field-value""><span class=""checkbox""></span> Có &nbsp; <span class=""checkbox""></span> Không</span></div>
<div class=""field""><span class=""field-label"">Aldrete Score:</span><span class=""field-value dotted-line"">&nbsp;</span><span style=""margin-left:10px"">/10</span></div>");

            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">ĐD hồi tỉnh</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">BS gây mê</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(anesthesiologist?.FullName)}</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Phẫu thuật viên</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(surgeon?.FullName)}</div>
    </div>
</div>");

            var html = WrapHtmlPage("Phiếu chăm sóc sau mổ - MS.PT-09", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintMedicineDisclosureAsync(Guid surgeryId)
    {
        try
        {
            var (req, sched, _, pat, surgeon, _, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU CÔNG KHAI THUỐC, VẬT TƯ PHẪU THUẬT</div>");
            body.AppendLine(@"<div class=""form-number"">MS. PT-10</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Ngày mổ:</span><span class=""field-value"">{sched?.ScheduledDateTime.ToString("dd/MM/yyyy") ?? ""}</span></div>

<div class=""section-title"">THUỐC SỬ DỤNG TRONG MỔ</div>
<table class=""bordered"">
<thead>
<tr><th>STT</th><th>Tên thuốc</th><th>Hàm lượng</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>BHYT</th></tr>
</thead>
<tbody>
<tr><td colspan=""8"" class=""text-center"" style=""font-style:italic"">(Danh sách thuốc sẽ được điền sau khi hoàn thành phẫu thuật)</td></tr>
</tbody>
</table>

<div class=""section-title mt-20"">VẬT TƯ TIÊU HAO</div>
<table class=""bordered"">
<thead>
<tr><th>STT</th><th>Tên vật tư</th><th>Quy cách</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>BHYT</th></tr>
</thead>
<tbody>
<tr><td colspan=""8"" class=""text-center"" style=""font-style:italic"">(Danh sách vật tư sẽ được điền sau khi hoàn thành phẫu thuật)</td></tr>
</tbody>
</table>

<p class=""mt-20""><b>Tổng chi phí thuốc:</b> ...................................... đồng</p>
<p><b>Tổng chi phí vật tư:</b> ...................................... đồng</p>
<p><b>Tổng cộng:</b> ...................................... đồng</p>
<p class=""mt-10 text-italic"">Bệnh nhân (hoặc người nhà) đã được thông báo về danh mục thuốc và vật tư sử dụng trong quá trình phẫu thuật.</p>");

            body.AppendLine($@"
<div class=""signature-block"">
    <div class=""signature-item"">
        <div class=""signature-title"">Người bệnh / Người nhà</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">&nbsp;</div>
    </div>
    <div class=""signature-item"">
        <div class=""signature-title"">Phẫu thuật viên</div>
        <div class=""signature-date"">(Ký, ghi rõ họ tên)</div>
        <div class=""signature-name"">{Esc(surgeon?.FullName)}</div>
    </div>
</div>");

            var html = WrapHtmlPage("Phiếu công khai thuốc, vật tư PT - MS.PT-10", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> ExportXml4210Async(Guid surgeryId)
    {
        try
        {
            var (req, sched, rec, pat, surgeon, anesthesiologist, room) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var sb = new StringBuilder();
            sb.AppendLine(@"<?xml version=""1.0"" encoding=""utf-8""?>");
            sb.AppendLine(@"<HOSO_PTTT xmlns=""http://bhxh.gov.vn/xml/4210"">");
            sb.AppendLine($"  <MA_LK>{Guid.NewGuid()}</MA_LK>");
            sb.AppendLine($"  <MA_BN>{Esc(pat.PatientCode)}</MA_BN>");
            sb.AppendLine($"  <HO_TEN>{Esc(pat.FullName)}</HO_TEN>");
            sb.AppendLine($"  <NGAY_SINH>{pat.DateOfBirth?.ToString("yyyyMMdd")}</NGAY_SINH>");
            sb.AppendLine($"  <GIOI_TINH>{pat.Gender}</GIOI_TINH>");
            sb.AppendLine($"  <MA_YC_PT>{Esc(req.RequestCode)}</MA_YC_PT>");
            sb.AppendLine($"  <CHAN_DOAN_TRUOC>{Esc(req.PreOpDiagnosis)}</CHAN_DOAN_TRUOC>");
            sb.AppendLine($"  <MA_ICD_TRUOC>{Esc(req.PreOpIcdCode)}</MA_ICD_TRUOC>");
            sb.AppendLine($"  <PP_PT>{Esc(rec?.ProcedurePerformed ?? req.PlannedProcedure)}</PP_PT>");
            sb.AppendLine($"  <MA_PP_PT>{Esc(rec?.ProcedureCode)}</MA_PP_PT>");
            sb.AppendLine($"  <PP_VO_CAM>{req.AnesthesiaType}</PP_VO_CAM>");
            sb.AppendLine($"  <NGAY_PT>{sched?.ScheduledDateTime.ToString("yyyyMMddHHmm")}</NGAY_PT>");
            sb.AppendLine($"  <PHONG_MO>{Esc(room?.RoomCode)}</PHONG_MO>");
            sb.AppendLine($"  <PTV_CHINH>{Esc(surgeon?.FullName)}</PTV_CHINH>");
            sb.AppendLine($"  <BS_GAY_ME>{Esc(anesthesiologist?.FullName)}</BS_GAY_ME>");

            if (rec != null)
            {
                sb.AppendLine($"  <GIO_BAT_DAU>{rec.ActualStartTime?.ToString("yyyyMMddHHmm")}</GIO_BAT_DAU>");
                sb.AppendLine($"  <GIO_KET_THUC>{rec.ActualEndTime?.ToString("yyyyMMddHHmm")}</GIO_KET_THUC>");
                sb.AppendLine($"  <CHAN_DOAN_SAU>{Esc(rec.PostOpDiagnosis)}</CHAN_DOAN_SAU>");
                sb.AppendLine($"  <MA_ICD_SAU>{Esc(rec.PostOpIcdCode)}</MA_ICD_SAU>");
                sb.AppendLine($"  <KET_QUA>{rec.Result}</KET_QUA>");
                sb.AppendLine($"  <BIEN_CHUNG>{Esc(rec.Complications)}</BIEN_CHUNG>");
                sb.AppendLine($"  <MAT_MAU>{rec.BloodLoss}</MAT_MAU>");
            }

            sb.AppendLine("</HOSO_PTTT>");

            return Encoding.UTF8.GetBytes(sb.ToString());
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

}
