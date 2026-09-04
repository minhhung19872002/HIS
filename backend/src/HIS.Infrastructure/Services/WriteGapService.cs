using HIS.Application.Common;
using HIS.Application.DTOs.WriteGap;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using ApiResponse = HIS.Application.DTOs.Common.ApiResponse<object>;

namespace HIS.Infrastructure.Services;

/// <summary>
/// WriteGap — 9 tiểu module (sample storage/tracking, epidemiology, infection control, archive,
/// inter-hospital, record planning, booking, BHXH audit), tách khỏi WriteGapController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/business math/Vietnamese strings giữ nguyên;
/// userId truyền từ controller (thay cho Uid() cũ đọc claim).
/// </summary>
public class WriteGapService : IWriteGapService
{
    private readonly HISDbContext _db;
    public WriteGapService(HISDbContext db) => _db = db;

    // ========== 1. Sample Storage (store/retrieve) ==========

    public async Task<ServiceOutcome> StoreSampleAsync(StoreSampleDto dto, Guid userId)
    {
        var item = await _db.ServiceRequestDetails.FirstOrDefaultAsync(i => i.Id == dto.SampleId && !i.IsDeleted);
        if (item == null) return ServiceOutcome.Status(404, ApiResponse.Fail("Mẫu không tồn tại"));
        item.SampleLocation = dto.Location;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { message = $"Đã lưu trữ mẫu tại {dto.Location}" });
    }

    public async Task<ServiceOutcome> RetrieveSampleAsync(RetrieveSampleDto dto, Guid userId)
    {
        var item = await _db.ServiceRequestDetails.FirstOrDefaultAsync(i => i.Id == dto.SampleId && !i.IsDeleted);
        if (item == null) return ServiceOutcome.Status(404, ApiResponse.Fail("Mẫu không tồn tại"));
        item.SampleLocation = null;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { message = "Đã lấy mẫu ra khỏi kho" });
    }

    // ========== 2. Sample Tracking (reject/undo) ==========

    public async Task<ServiceOutcome> RejectSampleAsync(RejectSampleDto dto, Guid userId)
    {
        var item = await _db.ServiceRequestDetails.FirstOrDefaultAsync(i => i.Id == dto.SampleId && !i.IsDeleted);
        if (item == null) return ServiceOutcome.NotFound();
        // Cùng ngữ nghĩa SampleReceiveController.Reject: ReceiveStatus=2 + lý do
        item.ReceiveStatus = 2;
        item.RejectReason = dto.Reason;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> UndoRejectSampleAsync(UndoRejectDto dto, Guid userId)
    {
        var item = await _db.ServiceRequestDetails.FirstOrDefaultAsync(i => i.Id == dto.SampleId && !i.IsDeleted);
        if (item == null) return ServiceOutcome.NotFound();
        item.ReceiveStatus = 1; // về trạng thái đã nhận mẫu
        item.RejectReason = null;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== 3. Epidemiology (create disease report) ==========

    public async Task<ServiceOutcome> CreateDiseaseReportAsync(DiseaseReport dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.IsDeleted = false;
        dto.ReportDate = DateTime.Now;
        dto.CreatedAt = DateTime.Now;
        dto.CreatedBy = userId.ToString();
        _db.DiseaseReports.Add(dto);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { dto.Id });
    }

    // ========== 4. Infection Control (update/close HAI case) ==========

    public async Task<ServiceOutcome> InvestigateHAIAsync(Guid id, InvestigateHaiDto dto, Guid userId)
    {
        var hai = await _db.HAICases.FirstOrDefaultAsync(h => h.Id == id);
        if (hai == null) return ServiceOutcome.NotFound();
        hai.IsInvestigated = true;
        hai.RootCause = dto.RootCause;
        hai.ContributingFactors = dto.ContributingFactors;
        hai.PreventiveMeasures = dto.PreventiveMeasures;
        hai.UpdatedAt = DateTime.Now;
        hai.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> CloseHAIAsync(Guid id, CloseHaiDto dto, Guid userId)
    {
        var hai = await _db.HAICases.FirstOrDefaultAsync(h => h.Id == id);
        if (hai == null) return ServiceOutcome.NotFound();
        hai.Status = "Closed";
        hai.Outcome = dto.Outcome;
        hai.ResolvedDate = DateTime.Now;
        hai.Notes = dto.Notes;
        hai.UpdatedAt = DateTime.Now;
        hai.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== 5. Medical Record Archive (save) ==========

    public async Task<ServiceOutcome> SaveArchiveAsync(SaveArchiveDto dto, Guid userId)
    {
        if (dto.Id.HasValue)
        {
            var existing = await _db.MedicalRecordArchives.FindAsync(dto.Id.Value);
            if (existing == null) return ServiceOutcome.NotFound();
            existing.StorageLocation = dto.StorageLocation;
            existing.ShelfNumber = dto.ShelfNumber;
            existing.BoxNumber = dto.BoxNumber;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = userId.ToString();
        }
        else
        {
            var archive = new MedicalRecordArchive
            {
                Id = Guid.NewGuid(),
                ArchiveCode = $"HS{DateTime.Now:yyyyMMddHHmmss}",
                MedicalRecordId = dto.MedicalRecordId,
                PatientId = dto.PatientId,
                StorageLocation = dto.StorageLocation,
                ShelfNumber = dto.ShelfNumber,
                BoxNumber = dto.BoxNumber,
                Status = 1,
                ArchivedDate = DateTime.Now,
                ArchivedById = userId,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
            };
            _db.MedicalRecordArchives.Add(archive);
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== 6. Inter-Hospital Sharing (create) ==========

    public async Task<ServiceOutcome> CreateInterHospitalRequestAsync(CreateInterHospitalDto dto, Guid userId)
    {
        var entity = new InterHospitalRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"LV{DateTime.Now:yyyyMMddHHmmss}",
            RequestType = dto.RequestType ?? "Consultation",
            RequestingFacility = dto.RequestingFacility ?? "",
            ReceivingFacility = dto.ReceivingFacility ?? "",
            Urgency = dto.Urgency.ToString(),
            RequestDetails = dto.RequestDetails,
            Status = 0,
            RequestDate = DateTime.Now,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        };
        _db.InterHospitalRequests.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { entity.Id });
    }

    // ========== 7. Medical Record Planning (borrow/return) ==========

    public async Task<ServiceOutcome> BorrowRecordAsync(BorrowRecordDto dto, Guid userId)
    {
        var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
        if (archive == null) return ServiceOutcome.NotFound();

        // #218/T3: đây là cửa THỨ HAI cho mượn cùng một tập hồ sơ. Cửa kia
        // (`MedicalRecordPlanningService.CreateBorrowAsync`) đã chặn "hồ sơ đang có người mượn";
        // cửa này trước đó không kiểm gì, nên người thứ hai vẫn mượn được và `BorrowedByUserId` bị
        // ghi đè — hệ thống quên mất ai đang thật sự cầm tập hồ sơ giấy trong tay.
        if (archive.IsOnLoan || archive.Status == 2)
            return ServiceOutcome.Bad(
                "Hồ sơ đang có người mượn, chưa trả về kho. Phải trả trước rồi mới cho mượn tiếp.");

        archive.IsOnLoan = true;
        archive.BorrowedByUserId = userId;
        archive.BorrowedAt = DateTime.Now;
        archive.BorrowReason = dto.Reason;
        archive.Status = 2; // Đang mượn
        archive.UpdatedAt = DateTime.Now;
        archive.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> ReturnRecordAsync(ReturnArchiveDto dto, Guid userId)
    {
        var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
        if (archive == null) return ServiceOutcome.NotFound();

        // #218/T3: không "trả" một tập hồ sơ chưa hề rời kho. Trước đây hàm này gán thẳng
        // `ReturnedAt = DateTime.Now` cho cả hồ sơ đang nằm yên trong kho, tức dựng ra một lượt trả
        // cho một lượt mượn không tồn tại.
        if (!archive.IsOnLoan && archive.Status != 2)
            return ServiceOutcome.Bad("Hồ sơ đang ở trong kho, không có lượt mượn nào để trả.");

        archive.IsOnLoan = false;
        archive.ReturnedAt = DateTime.Now;
        archive.Status = 1; // Đã lưu
        archive.UpdatedAt = DateTime.Now;
        archive.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== 8. Booking Management (doctor schedule) ==========

    public async Task<ServiceOutcome> SaveDoctorScheduleAsync(DoctorScheduleDto dto, Guid userId)
    {
        var existing = await _db.DutySchedules
            .FirstOrDefaultAsync(d => d.DoctorId == dto.DoctorId && d.Date.Date == dto.Date.Date);
        if (existing != null)
        {
            existing.ShiftType = dto.ShiftType;
            existing.RoomId = dto.RoomId;
            existing.Notes = dto.Notes;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = userId.ToString();
        }
        else
        {
            _db.DutySchedules.Add(new DutySchedule
            {
                Id = Guid.NewGuid(),
                DoctorId = dto.DoctorId,
                DepartmentId = dto.DepartmentId,
                Date = dto.Date,
                ShiftType = dto.ShiftType,
                RoomId = dto.RoomId,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
            });
        }
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> GetDoctorSchedulesAsync(Guid? doctorId, Guid? departmentId, DateTime? fromDate, DateTime? toDate)
    {
        var q = _db.DutySchedules.Where(d => !d.IsDeleted);
        if (doctorId.HasValue) q = q.Where(d => d.DoctorId == doctorId);
        if (departmentId.HasValue) q = q.Where(d => d.DepartmentId == departmentId);
        if (fromDate.HasValue) q = q.Where(d => d.Date >= fromDate.Value);
        if (toDate.HasValue) q = q.Where(d => d.Date <= toDate.Value);
        var items = await q.OrderBy(d => d.Date).Take(200)
            .Select(d => new { d.Id, d.DoctorId, DoctorName = d.Doctor != null ? d.Doctor.FullName : "", d.DepartmentId, d.Date, d.ShiftType, d.RoomId, d.Notes })
            .ToListAsync();
        return ServiceOutcome.Ok(items);
    }

    // ========== 9. BHXH Audit (run audit session) ==========

    public async Task<ServiceOutcome> CreateAuditSessionAsync(CreateBhxhAuditDto dto, Guid userId)
    {
        var session = new BhxhAuditSession
        {
            Id = Guid.NewGuid(),
            SessionCode = $"GD{DateTime.Now:yyyyMMddHHmmss}",
            PeriodMonth = dto.PeriodMonth,
            PeriodYear = dto.PeriodYear,
            Status = 0,
            AuditorId = userId,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        };
        _db.BhxhAuditSessions.Add(session);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { session.Id, session.SessionCode });
    }
}
