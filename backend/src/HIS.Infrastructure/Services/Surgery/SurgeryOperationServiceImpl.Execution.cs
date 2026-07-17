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
    public async Task<SurgeryDto> StartSurgeryAsync(StartSurgeryDto dto, Guid userId)
    {
        // F1-refine (2026-06-09): KHÔNG nuốt lỗi rồi trả SurgeryDto rỗng như-thể-thành-công.
        // Bảng spine PTTT (SurgerySchedule/Record/Request) đã ổn định → schema-missing không còn xảy ra.
        // Nuốt lỗi cũ khiến Status=2 (gate viện phí/xuất viện) ngầm fail mà caller tưởng đã bắt đầu mổ.
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

}
