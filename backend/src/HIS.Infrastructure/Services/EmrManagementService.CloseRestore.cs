using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class EmrManagementService
{
    // ============================================================
    // Close EMR (B.2.5)
    // ============================================================

    public async Task<EmrCloseValidationResultDto> CloseEmrAsync(CloseEmrDto dto)
    {
        // Run auto-check first
        var checkResult = await RunAutoCheckAsync(dto.ExaminationId);
        var validationResult = new EmrCloseValidationResultDto
        {
            ExaminationId = dto.ExaminationId,
            CanClose = checkResult.ErrorCount == 0, // Only close if no Error-severity violations
            WarningCount = checkResult.WarningCount,
            ErrorCount = checkResult.ErrorCount,
            Violations = checkResult.Violations
        };

        if (!validationResult.CanClose)
            return validationResult;

        try
        {
            var userId = GetCurrentUserId() ?? "system";

            // Log the close action
            var closeLog = new EmrCloseLog
            {
                Id = Guid.NewGuid(),
                ExaminationId = dto.ExaminationId,
                ClosedByUserId = userId,
                ClosedAt = DateTime.UtcNow,
                Status = 1, // Closed
                ValidationErrors = checkResult.WarningCount > 0
                    ? System.Text.Json.JsonSerializer.Serialize(checkResult.Violations.Where(v => v.Severity == 1))
                    : null,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrCloseLog>().Add(closeLog);

            // #218/T3: KHÓA bằng cờ riêng TT46, KHÔNG ghi đè `Examinations.Status`.
            //
            // Chỗ này trước đây viết `examination.Status = 5; // Closed`. Nhưng trong
            // `ExaminationStatus` thì **5 = Cancelled (Hủy)** — nên đóng một hồ sơ đã khám xong lại
            // đánh dấu lượt khám đó là ĐÃ HỦY, ở đúng cái ô mà cả hệ thống đang đọc: hàng đợi tiếp
            // đón in nhãn "Hủy", kê đơn từ chối vì "Phiên khám đã hủy", sửa kết luận từ chối vì
            // "Phiếu khám đã hủy". Khóa thì có khóa, nhưng khóa bằng cách khai man.
            //
            // `EmrAdminService.FinalizeRecordAsync` đã gặp và sửa đúng lỗi này rồi — dòng cảnh báo
            // "⚠️ Trước đây set Status=5 — SAI semantics" nằm ngay đầu hàm đó. Bản sửa ấy chỉ áp ở
            // một cửa; cửa B.2.5 này vẫn làm đúng cái việc mà nó nói là sai. Nay dùng chung một cơ
            // chế: `MedicalRecords.EmrFinalizedAt/By`, cái mà `EmrLockGuard` đang chặn sửa nội dung
            // với đúng câu TT46. Đo được ở evidence/cross/t3/t3_emr_close_semantics.json.
            var examination = await _context.Examinations
                .FirstOrDefaultAsync(e => e.Id == dto.ExaminationId && !e.IsDeleted);
            if (examination?.MedicalRecordId != null)
            {
                var record = await _context.MedicalRecords
                    .FirstOrDefaultAsync(m => m.Id == examination.MedicalRecordId && !m.IsDeleted);
                if (record != null && record.EmrFinalizedAt == null)
                {
                    Guid.TryParse(userId, out var uid);
                    record.EmrFinalizedAt = DateTime.UtcNow;
                    record.EmrFinalizedBy = uid == Guid.Empty ? null : uid;
                    record.UpdatedAt = DateTime.UtcNow;
                    record.UpdatedBy = userId;
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            // Table doesn't exist yet, still return validation result
        }

        return validationResult;
    }

    public async Task<bool> ReopenEmrAsync(Guid examinationId, string? note = null)
    {
        try
        {
            var userId = GetCurrentUserId() ?? "system";

            // Log the reopen action
            var reopenLog = new EmrCloseLog
            {
                Id = Guid.NewGuid(),
                ExaminationId = examinationId,
                ClosedByUserId = userId,
                ClosedAt = DateTime.UtcNow,
                Status = 2, // Reopened
                Note = note,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<EmrCloseLog>().Add(reopenLog);

            // #218/T3: gỡ đúng cái cờ đã đặt lúc đóng, KHÔNG đụng vào `Examinations.Status`.
            //
            // Chỗ này trước đây viết `examination.Status = 3; // In progress` — sai hai lần. Một,
            // 3 là "Chờ kết luận" chứ không phải "Đang khám" (1). Hai, và tệ hơn: nó gán CỨNG,
            // bất kể lượt khám trước đó ở đâu. Một lượt khám Hoàn thành (4) đóng rồi mở lại thì
            // thành Chờ kết luận — mất luôn dữ kiện đã khám xong, không có gì khôi phục lại được.
            // Trạng thái lượt khám vốn không phải việc của thao tác đóng/mở hồ sơ.
            var examination = await _context.Examinations
                .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);
            if (examination?.MedicalRecordId != null)
            {
                var record = await _context.MedicalRecords
                    .FirstOrDefaultAsync(m => m.Id == examination.MedicalRecordId && !m.IsDeleted);
                if (record != null && record.EmrFinalizedAt != null)
                {
                    record.EmrFinalizedAt = null;
                    record.EmrFinalizedBy = null;
                    record.UpdatedAt = DateTime.UtcNow;
                    record.UpdatedBy = userId;
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    public async Task<List<EmrCloseLogDto>> GetCloseLogsAsync(Guid? examinationId = null)
    {
        try
        {
            var query = _context.Set<EmrCloseLog>().AsNoTracking()
                .Where(l => !l.IsDeleted);

            if (examinationId.HasValue)
                query = query.Where(l => l.ExaminationId == examinationId.Value);

            return await query.OrderByDescending(l => l.ClosedAt)
                .Select(l => new EmrCloseLogDto
                {
                    Id = l.Id,
                    ExaminationId = l.ExaminationId,
                    ClosedByUserId = l.ClosedByUserId,
                    ClosedAt = l.ClosedAt,
                    Status = l.Status,
                    ValidationErrors = l.ValidationErrors,
                    Note = l.Note
                }).ToBoundedListAsync("EmrManagement.GetCloseLogs");
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<EmrCloseLogDto>();
        }
    }

    // ============================================================
    // Data Recovery (B.2.4)
    // ============================================================

    public async Task<List<DeletedRecordDto>> GetDeletedRecordsAsync(string entityType)
    {
        try
        {
            return entityType.ToLowerInvariant() switch
            {
                "treatmentsheet" => await _context.Set<TreatmentSheet>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "TreatmentSheet",
                        DisplayName = $"Phieu dieu tri - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "consultationrecord" => await _context.Set<ConsultationRecord>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "ConsultationRecord",
                        DisplayName = $"Bien ban hoi chan - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "nursingcaresheet" => await _context.Set<NursingCareSheet>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "NursingCareSheet",
                        DisplayName = $"Phieu cham soc - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                "prescription" => await _context.Set<Prescription>().IgnoreQueryFilters()
                    .Where(x => x.IsDeleted).OrderByDescending(x => x.UpdatedAt).Take(50)
                    .Select(x => new DeletedRecordDto
                    {
                        Id = x.Id, EntityType = "Prescription",
                        DisplayName = $"Don thuoc - {x.CreatedAt:dd/MM/yyyy}",
                        DeletedAt = x.UpdatedAt, DeletedBy = x.UpdatedBy
                    }).ToListAsync(),
                _ => new List<DeletedRecordDto>()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<DeletedRecordDto>();
        }
    }

    public async Task<bool> RestoreRecordAsync(RestoreRecordDto dto)
    {
        try
        {
            return dto.EntityType.ToLowerInvariant() switch
            {
                "treatmentsheet" => await RestoreEntityAsync<TreatmentSheet>(dto.RecordId),
                "consultationrecord" => await RestoreEntityAsync<ConsultationRecord>(dto.RecordId),
                "nursingcaresheet" => await RestoreEntityAsync<NursingCareSheet>(dto.RecordId),
                "prescription" => await RestoreEntityAsync<Prescription>(dto.RecordId),
                _ => false
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return false;
        }
    }

    private async Task<bool> RestoreEntityAsync<T>(Guid id) where T : BaseEntity
    {
        var entity = await _context.Set<T>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsDeleted);
        if (entity == null) return false;
        entity.IsDeleted = false;
        entity.UpdatedBy = GetCurrentUserId();
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static string GenerateAccessCode(int length)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous: 0/O, 1/I
        var bytes = RandomNumberGenerator.GetBytes(length);
        var result = new char[length];
        for (int i = 0; i < length; i++)
            result[i] = chars[bytes[i] % chars.Length];
        return new string(result);
    }
}
