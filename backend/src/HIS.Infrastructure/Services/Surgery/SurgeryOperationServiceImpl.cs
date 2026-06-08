using System.Text;
using Microsoft.Data.SqlClient;
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

/// <summary>
/// K12 Step 3 (2026-05-30, Plan B): Implementation ISurgeryOperationService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.3 + 6.3.1 + 6.4 + 6.4.1 + 6.4.2
/// (45 method, ~1349 dong). Inject ISurgerySchedulingService để dùng GetSurgeryByIdAsync.
/// </summary>
public class SurgeryOperationServiceImpl : ISurgeryOperationService
{
    private readonly HISDbContext _context;
    private readonly ISurgerySchedulingService _scheduling;

    public SurgeryOperationServiceImpl(HISDbContext context, ISurgerySchedulingService scheduling)
    {
        _context = context;
        _scheduling = scheduling;
    }

    #region 6.3 Thực hiện PTTT

    public async Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId)
    {
        try
        {
            var schedule = await _context.Set<SurgerySchedule>()
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

            if (schedule != null)
            {
                schedule.Status = 3; // Đang mổ
                schedule.UpdatedAt = DateTime.Now;
                schedule.UpdatedBy = userId.ToString();

                var record = new SurgeryRecord
                {
                    Id = Guid.NewGuid(),
                    SurgeryScheduleId = schedule.Id,
                    ActualStartTime = dto.StartTime,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.Set<SurgeryRecord>().Add(record);

                var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
                if (request != null) request.Status = 2;

                await _context.SaveChangesAsync();
            }

            return await _scheduling.GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"StartSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"StartSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<SurgeryDto> CompleteSurgeryAsync(CompleteSurgeryDto dto, Guid userId)
    {
        try
        {
            var schedule = await _context.Set<SurgerySchedule>()
                .Include(s => s.SurgeryRecord)
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

            if (schedule != null)
            {
                schedule.Status = 4; // Hoàn thành
                schedule.UpdatedAt = DateTime.Now;
                schedule.UpdatedBy = userId.ToString();

                if (schedule.SurgeryRecord != null)
                {
                    schedule.SurgeryRecord.ActualEndTime = dto.EndTime;
                    schedule.SurgeryRecord.PostOpDiagnosis = dto.PostOperativeDiagnosis;
                    schedule.SurgeryRecord.PostOpIcdCode = dto.PostOperativeIcdCode;
                    schedule.SurgeryRecord.Findings = dto.Description;
                    schedule.SurgeryRecord.Complications = dto.Complications;
                }

                var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
                if (request != null) request.Status = 3;

                await _context.SaveChangesAsync();
            }

            return await _scheduling.GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"CompleteSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"CompleteSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public Task<SurgeryDto> UpdateExecutionInfoAsync(SurgeryExecutionDto dto, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(dto.SurgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdatePreOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdatePostOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdateTT50InfoAsync(Guid surgeryId, SurgeryTT50InfoDto dto, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdateDescriptionAsync(Guid surgeryId, string description, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdateConclusionAsync(Guid surgeryId, string conclusion, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> UpdateTeamMembersAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> members, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryDto> ChangeTeamMemberAsync(Guid surgeryId, Guid oldMemberId, SurgeryTeamMemberRequestDto newMember, DateTime changeTime, Guid userId)
    {
        return _scheduling.GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    #endregion

    #region 6.3.1 In ấn PTTT

    /// <summary>
    /// Load full surgery context from DB for print templates
    /// </summary>
    private async Task<(SurgeryRequest? req, SurgerySchedule? sched, SurgeryRecord? rec, Patient? pat, User? surgeon, User? anesthesiologist, OperatingRoom? room)> LoadSurgeryPrintDataAsync(Guid surgeryId)
    {
        try
        {
            var req = await _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .Include(r => r.RequestingDoctor)
                .Include(r => r.Schedules)
                .FirstOrDefaultAsync(r => r.Id == surgeryId);

            if (req == null) return (null, null, null, null, null, null, null);

            var sched = await _context.Set<SurgerySchedule>()
                .Include(s => s.OperatingRoom)
                .Include(s => s.Surgeon)
                .Include(s => s.Anesthesiologist)
                .Include(s => s.SurgeryRecord)
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == surgeryId);

            var rec = sched?.SurgeryRecord;
            var pat = req.Patient;
            var surgeon = sched?.Surgeon ?? req.RequestingDoctor;
            var anesthesiologist = sched?.Anesthesiologist;
            var room = sched?.OperatingRoom;

            return (req, sched, rec, pat, surgeon, anesthesiologist, room);
        }
        catch
        {
            return (null, null, null, null, null, null, null);
        }
    }

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

    // Lấy nội dung dòng có sentinel tag (vd "[TUONGTRINH]") trong Notes pack kiểu cũ. Null nếu không có.
    private static string? ExtractNoteTag(string? notes, string tag)
    {
        if (string.IsNullOrWhiteSpace(notes)) return null;
        foreach (var raw in notes.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimStart();
            if (line.StartsWith(tag, StringComparison.Ordinal))
                return line.Substring(tag.Length).Trim();
        }
        return null;
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

    #endregion

    #region 6.4 Chỉ định dịch vụ trong PTTT

    public async Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId)
    {
        // F1 (audit FLOW-FINAL 2026-06-06): đọc chẩn đoán THẬT từ HSBA thay hardcode "Viêm ruột thừa cấp".
        var mr = await _context.MedicalRecords
            .Where(m => m.Id == medicalRecordId)
            .Select(m => new { m.InitialDiagnosis, m.MainIcdCode })
            .FirstOrDefaultAsync();
        if (mr == null) return null;
        return !string.IsNullOrWhiteSpace(mr.InitialDiagnosis) ? mr.InitialDiagnosis : mr.MainIcdCode;
    }

    public Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode)
    {
        var codes = new List<IcdCodeDto>
        {
            new() { Code = "K35.9", Name = "Viêm ruột thừa cấp" },
            new() { Code = "K80.0", Name = "Sỏi túi mật có viêm túi mật cấp" },
            new() { Code = "I21.0", Name = "Nhồi máu cơ tim cấp thành trước" },
            new() { Code = "J18.9", Name = "Viêm phổi không xác định" }
        };

        if (!string.IsNullOrEmpty(keyword))
        {
            codes = codes.Where(c =>
                c.Code.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                c.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Task.FromResult(codes);
    }

    public Task<List<SurgeryServiceDto>> SearchServicesAsync(string keyword, int? serviceType)
    {
        var services = new List<SurgeryServiceDto>
        {
            new() { Id = Guid.NewGuid(), Code = "PT001", Name = "Cắt ruột thừa nội soi", ServiceType = 1, UnitPrice = 5000000 },
            new() { Id = Guid.NewGuid(), Code = "PT002", Name = "Mổ sỏi thận qua da", ServiceType = 1, UnitPrice = 15000000 },
            new() { Id = Guid.NewGuid(), Code = "TT001", Name = "Nội soi dạ dày", ServiceType = 2, UnitPrice = 800000 },
            new() { Id = Guid.NewGuid(), Code = "TT002", Name = "Nội soi đại tràng", ServiceType = 2, UnitPrice = 1200000 }
        };

        if (!string.IsNullOrEmpty(keyword))
        {
            services = services.Where(s =>
                s.Code.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                s.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (serviceType.HasValue)
        {
            services = services.Where(s => s.ServiceType == serviceType.Value).ToList();
        }

        return Task.FromResult(services);
    }

    public Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto
        {
            Id = Guid.NewGuid(),
            SurgeryId = dto.SurgeryId,
            ServiceId = dto.ServiceId,
            Quantity = dto.Quantity,
            Status = 0,
            OrderedAt = DateTime.Now
        });
    }

    public Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
    {
        return Task.FromResult(dtos.Select(dto => new SurgeryServiceOrderDto
        {
            Id = Guid.NewGuid(),
            SurgeryId = surgeryId,
            ServiceId = dto.ServiceId,
            Quantity = dto.Quantity,
            Status = 0,
            OrderedAt = DateTime.Now
        }).ToList());
    }

    public Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
    {
        return Task.FromResult(new SurgeryPackageOrderDto
        {
            SurgeryId = surgeryId,
            PackageId = packageId,
            PackageName = "Gói phẫu thuật"
        });
    }

    public Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId)
    {
        return Task.FromResult(new ServiceCostInfoDto
        {
            TotalServiceCost = 8500000,
            InsuranceCoverage = 6800000,
            PatientPayment = 1700000,
            DepositBalance = 5000000,
            RemainingDeposit = 3300000,
            HasSufficientDeposit = true
        });
    }

    public Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId)
    {
        return Task.FromResult(new List<ServiceOrderWarningDto>());
    }

    #endregion

    #region 6.4.1 Nhóm dịch vụ nhanh

    public Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceGroupDto>
        {
            new() { Id = Guid.NewGuid(), Code = "GRP001", Name = "Nhóm XN tiền phẫu", IsShared = true },
            new() { Id = Guid.NewGuid(), Code = "GRP002", Name = "Nhóm CĐHA ngực bụng", IsShared = true }
        });
    }

    public Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId)
    {
        return Task.FromResult(dto);
    }

    public Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    #endregion

    #region 6.4.2 In chỉ định

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        try
        {
            // Try to find the service request by orderId
            var serviceReq = await _context.Set<ServiceRequest>()
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr!.Patient)
                .Include(sr => sr.Doctor)
                .Include(sr => sr.Department)
                .FirstOrDefaultAsync(sr => sr.Id == orderId);

            if (serviceReq == null)
            {
                // Fallback: generate a generic single order form
                var html = BuildVoucherReport(
                    "PHIẾU CHỈ ĐỊNH DỊCH VỤ",
                    orderId.ToString("N")[..10].ToUpper(),
                    DateTime.Now,
                    new[] { "Mã phiếu", "Ngày chỉ định", "Ghi chú" },
                    new[] { orderId.ToString("N")[..10].ToUpper(), DateTime.Now.ToString("dd/MM/yyyy"), "Chỉ định dịch vụ phẫu thuật" },
                    null);
                return Encoding.UTF8.GetBytes(html);
            }

            var pat = serviceReq.MedicalRecord?.Patient;
            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH DỊCH VỤ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-01</div>");

            if (pat != null)
                body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{Esc(serviceReq.RequestCode)}</span></div>
<div class=""field""><span class=""field-label"">Ngày chỉ định:</span><span class=""field-value"">{serviceReq.RequestDate:dd/MM/yyyy HH:mm}</span></div>
<div class=""field""><span class=""field-label"">BS chỉ định:</span><span class=""field-value"">{Esc(serviceReq.Doctor?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Khoa:</span><span class=""field-value"">{Esc(serviceReq.Department?.DepartmentName)}</span></div>
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(serviceReq.Diagnosis)}</span></div>");

            // Load details
            var details = await _context.Set<ServiceRequestDetail>()
                .Include(d => d.Service)
                .Where(d => d.ServiceRequestId == orderId)
                .ToListAsync();

            body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Ghi chú</th></tr></thead>
<tbody>");
            for (int i = 0; i < details.Count; i++)
            {
                var d = details[i];
                body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td>{Esc(d.Note)}</td></tr>");
            }
            if (details.Count == 0)
                body.AppendLine(@"<tr><td colspan=""4"" class=""text-center"" style=""font-style:italic"">Không có chi tiết</td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(serviceReq.Doctor?.FullName, null, null, false));

            var htmlResult = WrapHtmlPage("Phiếu chỉ định dịch vụ - MS.CĐ-01", body.ToString());
            return Encoding.UTF8.GetBytes(htmlResult);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOrdersByPaymentObjectAsync(Guid surgeryId, int paymentObject)
    {
        try
        {
            var (req, sched, _, pat, surgeon, _, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var paymentObjectName = paymentObject switch
            {
                1 => "BHYT",
                2 => "Viện phí",
                3 => "Dịch vụ",
                4 => "Bên thứ ba",
                _ => "Tất cả"
            };

            // Load service requests linked to the surgery's medical record
            var serviceReqs = await _context.Set<ServiceRequest>()
                .Include(sr => sr.Doctor)
                .Where(sr => sr.MedicalRecordId == (req.MedicalRecordId ?? Guid.Empty))
                .ToListAsync();

            var allDetails = new List<ServiceRequestDetail>();
            foreach (var sr in serviceReqs)
            {
                var details = await _context.Set<ServiceRequestDetail>()
                    .Include(d => d.Service)
                    .Where(d => d.ServiceRequestId == sr.Id)
                    .ToListAsync();
                allDetails.AddRange(details);
            }

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH DỊCH VỤ - {Esc(paymentObjectName.ToUpper())}</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-02</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Đối tượng thanh toán:</span><span class=""field-value"">{Esc(paymentObjectName)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>

<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
<tbody>");
            for (int i = 0; i < allDetails.Count; i++)
            {
                var d = allDetails[i];
                var amount = d.Quantity * d.UnitPrice;
                body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td class=""text-right"">{d.UnitPrice:#,##0}</td><td class=""text-right"">{amount:#,##0}</td></tr>");
            }
            if (allDetails.Count == 0)
                body.AppendLine(@"<tr><td colspan=""5"" class=""text-center"" style=""font-style:italic"">Không có chỉ định</td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage($"Phiếu chỉ định - {paymentObjectName} - MS.CĐ-02", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOrdersByGroupAsync(Guid surgeryId, string serviceGroup)
    {
        try
        {
            var (req, sched, _, pat, surgeon, _, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH - NHÓM {Esc(serviceGroup.ToUpper())}</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-03</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Nhóm dịch vụ:</span><span class=""field-value"">{Esc(serviceGroup)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>

<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Ghi chú</th></tr></thead>
<tbody>
<tr><td colspan=""4"" class=""text-center"" style=""font-style:italic"">(Các dịch vụ trong nhóm {Esc(serviceGroup)})</td></tr>
</tbody></table>");

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage($"Phiếu chỉ định nhóm {serviceGroup} - MS.CĐ-03", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintMultipleOrdersAsync(List<Guid> orderIds)
    {
        try
        {
            var serviceReqs = await _context.Set<ServiceRequest>()
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr!.Patient)
                .Include(sr => sr.Doctor)
                .Include(sr => sr.Department)
                .Where(sr => orderIds.Contains(sr.Id))
                .ToListAsync();

            if (serviceReqs.Count == 0)
            {
                // Fallback: generate a summary with order IDs
                var headers = new[] { "Mã phiếu", "Ngày", "Trạng thái" };
                var rows = orderIds.Select(id => new[] { id.ToString("N")[..10].ToUpper(), DateTime.Now.ToString("dd/MM/yyyy"), "Đã chỉ định" }).ToList();
                var html = BuildTableReport("TỔNG HỢP PHIẾU CHỈ ĐỊNH", "MS. CĐ-04", DateTime.Now, headers, rows);
                return Encoding.UTF8.GetBytes(html);
            }

            var firstPat = serviceReqs.FirstOrDefault()?.MedicalRecord?.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">TỔNG HỢP PHIẾU CHỈ ĐỊNH DỊCH VỤ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-04</div>");

            if (firstPat != null)
                body.AppendLine(GetPatientInfoBlock(firstPat.PatientCode, firstPat.FullName, firstPat.Gender, firstPat.DateOfBirth, firstPat.Address, firstPat.PhoneNumber, null));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Số phiếu:</span><span class=""field-value"">{serviceReqs.Count} phiếu</span></div>");

            int rowNum = 1;
            foreach (var sr in serviceReqs)
            {
                body.AppendLine($@"<div class=""section-title"">Phiếu {rowNum}: {Esc(sr.RequestCode)}</div>");
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày chỉ định:</span><span class=""field-value"">{sr.RequestDate:dd/MM/yyyy HH:mm}</span></div>");
                body.AppendLine($@"<div class=""field""><span class=""field-label"">BS chỉ định:</span><span class=""field-value"">{Esc(sr.Doctor?.FullName)}</span></div>");

                var details = await _context.Set<ServiceRequestDetail>()
                    .Include(d => d.Service)
                    .Where(d => d.ServiceRequestId == sr.Id)
                    .ToListAsync();

                body.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>");
                for (int i = 0; i < details.Count; i++)
                {
                    var d = details[i];
                    var amount = d.Quantity * d.UnitPrice;
                    body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td class=""text-right"">{d.UnitPrice:#,##0}</td><td class=""text-right"">{amount:#,##0}</td></tr>");
                }
                if (details.Count == 0)
                    body.AppendLine(@"<tr><td colspan=""5"" class=""text-center"" style=""font-style:italic"">Không có chi tiết</td></tr>");
                body.AppendLine("</tbody></table>");

                rowNum++;
            }

            body.AppendLine(GetSignatureBlock(serviceReqs.FirstOrDefault()?.Doctor?.FullName, null, null, false));

            var htmlResult = WrapHtmlPage("Tổng hợp phiếu chỉ định - MS.CĐ-04", body.ToString());
            return Encoding.UTF8.GetBytes(htmlResult);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    #endregion

    private static string GetAnesthesiaTypeName(int anesthesiaType) => anesthesiaType switch
    {
        1 => "Gây tê",
        2 => "Gây mê toàn thân",
        3 => "Gây mê nội khí quản",
        4 => "Gây tê tủy sống",
        5 => "Gây tê ngoài màng cứng",
        _ => "Không xác định"
    };
}
