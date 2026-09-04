using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

public partial class SurgeryOperationServiceImpl
{
    public async Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId)
    {
        // F1-refine (2026-06-09): KHÔNG nuốt lỗi rồi trả SurgeryDto rỗng như-thể-thành-công.
        // Bảng spine PTTT (SurgerySchedule/Record/Request) đã ổn định → schema-missing không còn xảy ra.
        // Nuốt lỗi cũ khiến Status=2 (gate viện phí/xuất viện) ngầm fail mà caller tưởng đã bắt đầu mổ.
        var schedule = await _context.Set<SurgerySchedule>()
            .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

        // #218/T3 (2026-09-04): hàm anh em `CompleteSurgeryAsync` đã được đợt 2026-06-12 sửa để
        // không trả "success giả" khi id không tồn tại — nhưng hàm này thì bỏ sót, vẫn trả 200 kèm
        // một DTO rỗng. Cùng một sửa, làm ở một hàm và quên hàm ngay bên cạnh.
        if (schedule == null)
            throw new InvalidOperationException(
                "Khong tim thay lich mo cua ca nay (surgeryId khong hop le hoac chua len lich)");

        var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);

        // #218/T3: trước đây không kiểm trạng thái gì cả. Hệ quả đo được: bắt đầu được một ca ĐÃ HỦY
        // (trạng thái nhảy từ 4 về 2), và bắt đầu lần thứ hai thì **đẻ thêm một biên bản mổ nữa**
        // cho cùng một ca — hai tường trình cho một lần mổ.
        SurgeryStatus.EnsureCanStart(request?.Status ?? SurgeryStatus.RequestScheduled, schedule.Status);

        schedule.Status = SurgeryStatus.ScheduleInProgress;
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

        if (request != null) request.Status = SurgeryStatus.RequestInProgress;

        await _context.SaveChangesAsync();

        return await _scheduling.GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> CompleteSurgeryAsync(CompleteSurgeryDto dto, Guid userId)
    {
        // F1-refine (2026-06-09): bỏ nuốt lỗi (xem ghi chú StartSurgeryAsync). Status=3 gate hậu-phẫu/viện phí
        // không được phép ngầm fail.
        var schedule = await _context.Set<SurgerySchedule>()
            .Include(s => s.SurgeryRecord)
            .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

        // Sweep 2026-06-12: id không tồn tại từng trả 200 + DTO rỗng (success giả) → 400 rõ ràng.
        if (schedule == null)
            throw new InvalidOperationException("Khong tim thay lich mo cua ca nay (surgeryId khong hop le hoac chua len lich)");

        // #218/T3 (2026-09-04): phần ghi tường trình nằm trong `if (SurgeryRecord != null)`, mà biên
        // bản mổ CHỈ được tạo ở bước bắt đầu. Nên kết thúc một ca chưa từng bắt đầu thì chẩn đoán
        // sau mổ, mô tả và tai biến rơi hết — API vẫn trả 200 và bác sĩ tin là đã lưu. Chặn ở đây
        // thay vì lặng lẽ tạo biên bản mới: một biên bản không có giờ bắt đầu là hồ sơ mổ sai.
        SurgeryStatus.EnsureCanComplete(schedule.Status, schedule.SurgeryRecord != null);

        schedule.Status = SurgeryStatus.ScheduleCompleted;
        schedule.UpdatedAt = DateTime.Now;
        schedule.UpdatedBy = userId.ToString();

        var rec = schedule.SurgeryRecord!;
        rec.ActualEndTime = dto.EndTime;
        rec.PostOpDiagnosis = dto.PostOperativeDiagnosis;
        rec.PostOpIcdCode = dto.PostOperativeIcdCode;
        rec.Findings = dto.Description;
        rec.Complications = dto.Complications;
        // #218/T3: `Conclusion` vốn có trong DTO và giao diện vẫn gửi lên, nhưng bảng không có cột
        // nào nhận nên nó rơi mất trên chính đường thuận. Cột thêm ở migration 170.
        rec.Conclusion = dto.Conclusion;
        if (rec.ActualStartTime.HasValue)
            rec.ActualDuration = (int)(dto.EndTime - rec.ActualStartTime.Value).TotalMinutes;
        rec.UpdatedAt = DateTime.Now;
        rec.UpdatedBy = userId.ToString();

        var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
        if (request != null) request.Status = SurgeryStatus.RequestCompleted;

        await _context.SaveChangesAsync();

        return await _scheduling.GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
    }

    /// <summary>
    /// Biên bản mổ mới nhất của một ca. Dùng chung cho các đường cập nhật tường trình bên dưới —
    /// tất cả đều cần đúng một thứ: biên bản để ghi vào, và một câu trả lời rõ ràng khi chưa có.
    /// </summary>
    private async Task<SurgeryRecord> RequireSurgeryRecordAsync(Guid surgeryId)
    {
        var rec = await _context.Set<SurgeryRecord>()
            .Include(r => r.SurgerySchedule)
            .Where(r => r.SurgerySchedule.SurgeryRequestId == surgeryId)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        if (rec == null)
            throw new InvalidOperationException(
                "Ca mổ chưa được bắt đầu nên chưa có biên bản mổ để ghi. Bấm \"Bắt đầu ca mổ\" trước.");
        return rec;
    }

    // ── #218/T3 (2026-09-04) ────────────────────────────────────────────────
    // Tám hàm dưới đây trước là hàm RỖNG: chỉ đọc lại ca mổ rồi trả về, không ghi gì, và controller
    // trả 200 kèm một DTO hợp lệ. Bác sĩ sửa tường trình, thấy màn hình báo xong, mà không có chữ
    // nào được lưu. Đo được ở evidence/cross/t3/t3_surgery_transitions.json.
    // Nay ghi thật. Riêng khai báo TT50 thì ném lỗi rõ ràng thay vì tiếp tục nói dối — xem ghi chú
    // ở hàm đó.

    public async Task<SurgeryDto> UpdateExecutionInfoAsync(SurgeryExecutionDto dto, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(dto.SurgeryId);

        if (dto.PostOperativeDiagnosis != null) rec.PostOpDiagnosis = dto.PostOperativeDiagnosis;
        if (dto.PostOperativeIcdCode != null) rec.PostOpIcdCode = dto.PostOperativeIcdCode;
        if (dto.SecondaryIcdCodes != null) rec.SecondaryIcdCodes = dto.SecondaryIcdCodes;
        if (dto.Description != null) rec.Findings = dto.Description;
        if (dto.Conclusion != null) rec.Conclusion = dto.Conclusion;
        if (dto.Complications != null) rec.Complications = dto.Complications;
        if (dto.SurgeryMethod != null) rec.ProcedurePerformed = dto.SurgeryMethod;
        if (dto.StartTime != default) rec.ActualStartTime = dto.StartTime;
        if (dto.EndTime.HasValue) rec.ActualEndTime = dto.EndTime;
        if (dto.DurationMinutes.HasValue) rec.ActualDuration = dto.DurationMinutes;
        rec.UpdatedAt = DateTime.Now;
        rec.UpdatedBy = userId.ToString();

        var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
        if (request != null)
        {
            if (dto.PreOperativeDiagnosis != null) request.PreOpDiagnosis = dto.PreOperativeDiagnosis;
            if (dto.PreOperativeIcdCode != null) request.PreOpIcdCode = dto.PreOperativeIcdCode;
            if (dto.AnesthesiaType != 0) request.AnesthesiaType = dto.AnesthesiaType;
            request.UpdatedAt = DateTime.Now;
            request.UpdatedBy = userId.ToString();
        }

        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> UpdatePreOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId)
            ?? throw new InvalidOperationException("Không tìm thấy yêu cầu phẫu thuật.");
        request.PreOpDiagnosis = diagnosis;
        request.PreOpIcdCode = icdCode;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> UpdatePostOperativeDiagnosisAsync(Guid surgeryId, string diagnosis, string icdCode, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(surgeryId);
        rec.PostOpDiagnosis = diagnosis;
        rec.PostOpIcdCode = icdCode;
        rec.UpdatedAt = DateTime.Now;
        rec.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    /// <summary>
    /// Khai báo thông tin theo TT50 — CHƯA cài đặt, và cố ý báo lỗi thay vì im lặng trả 200.
    ///
    /// <para>Không tự cài vì hai chỗ phải người dùng chốt, đoán là hỏng hồ sơ pháp lý:
    /// (a) <c>SurgeryTeamMember.Role</c> dùng bộ số nào cho phẫu thuật viên chính / phụ 1 / phụ 2 /
    /// gây mê / phụ mê / dụng cụ / chạy ngoài — DTO đang có bộ số RIÊNG cho điều dưỡng (1 dụng cụ,
    /// 2 chạy ngoài, 3 phụ mê) không khớp với cột chung; (b) chứng chỉ hành nghề của phẫu thuật viên
    /// (<c>MainSurgeonCertificate</c>, <c>AssistantSurgeonDto.Certificate</c>) và
    /// <c>AnesthesiaNotes</c> chưa có cột nào để lưu.</para>
    ///
    /// <para>Trả lỗi rõ còn hơn nhận rồi vứt: với một biểu mẫu có giá trị pháp lý, để bác sĩ tin là
    /// đã khai trong khi không có gì được lưu là tệ hơn hẳn một thông báo lỗi.</para>
    /// </summary>
    public Task<SurgeryDto> UpdateTT50InfoAsync(Guid surgeryId, SurgeryTT50InfoDto dto, Guid userId)
        => throw new InvalidOperationException(
            "Khai báo TT50 chưa được cài đặt trên máy chủ nên chưa lưu được. "
            + "Vui lòng nhập ekip mổ qua chức năng cập nhật ekip, và báo quản trị để bổ sung phần TT50.");

    public async Task<SurgeryDto> UpdateDescriptionAsync(Guid surgeryId, string description, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(surgeryId);
        rec.Findings = description;
        rec.UpdatedAt = DateTime.Now;
        rec.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> UpdateConclusionAsync(Guid surgeryId, string conclusion, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(surgeryId);
        rec.Conclusion = conclusion;
        rec.UpdatedAt = DateTime.Now;
        rec.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    /// <summary>
    /// Đặt lại toàn bộ ekip mổ. `FeePercent` trong DTO KHÔNG lưu ở đây — phần trăm chia tiền công
    /// đi qua đường riêng (<c>{id}/team-fees</c>), bảng `SurgeryTeamMembers` không có cột đó.
    /// </summary>
    public async Task<SurgeryDto> UpdateTeamMembersAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> members, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(surgeryId);

        var current = await _context.Set<SurgeryTeamMember>()
            .Where(m => m.SurgeryRecordId == rec.Id && !m.IsDeleted)
            .ToListAsync();
        _context.Set<SurgeryTeamMember>().RemoveRange(current);

        foreach (var m in members ?? new List<SurgeryTeamMemberRequestDto>())
        {
            _context.Set<SurgeryTeamMember>().Add(new SurgeryTeamMember
            {
                Id = Guid.NewGuid(),
                SurgeryRecordId = rec.Id,
                UserId = m.StaffId,
                Role = m.Role,
                JoinedAt = rec.ActualStartTime ?? DateTime.Now,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
            });
        }

        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    /// <summary>
    /// Thay một người trong ekip giữa chừng: người cũ được đóng mốc `LeftAt`, người mới mở mốc
    /// `JoinedAt` — giữ lại dấu vết ai có mặt trong khoảng nào, thay vì xoá người cũ đi.
    /// </summary>
    public async Task<SurgeryDto> ChangeTeamMemberAsync(Guid surgeryId, Guid oldMemberId, SurgeryTeamMemberRequestDto newMember, DateTime changeTime, Guid userId)
    {
        var rec = await RequireSurgeryRecordAsync(surgeryId);

        var old = await _context.Set<SurgeryTeamMember>()
            .FirstOrDefaultAsync(m => m.SurgeryRecordId == rec.Id && m.UserId == oldMemberId && !m.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy thành viên cần thay trong ekip mổ này.");

        old.LeftAt = changeTime;
        old.UpdatedAt = DateTime.Now;
        old.UpdatedBy = userId.ToString();

        _context.Set<SurgeryTeamMember>().Add(new SurgeryTeamMember
        {
            Id = Guid.NewGuid(),
            SurgeryRecordId = rec.Id,
            UserId = newMember.StaffId,
            Role = newMember.Role != 0 ? newMember.Role : old.Role,
            RoleName = old.RoleName,
            JoinedAt = changeTime,
            Notes = $"Thay cho thành viên {oldMemberId} lúc {changeTime:dd/MM/yyyy HH:mm}",
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        });

        await _context.SaveChangesAsync();
        return await _scheduling.GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

}
