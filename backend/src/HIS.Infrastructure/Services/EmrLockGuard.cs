using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// TT46 (2026-06-12): chặn cứng sửa NỘI DUNG hồ sơ bệnh án đã kết thúc (MedicalRecords.EmrFinalizedAt != null).
/// Gọi 1 dòng ở đầu mọi mutation nội dung (tờ điều trị, chẩn đoán, kết luận, sinh hiệu, đơn thuốc,
/// bệnh án chuyên khoa, hồ sơ lâm sàng, đính kèm...). Mở lại qua POST emr-admin/records/{id}/reopen
/// (quyền hạn chế + bắt buộc lý do, lưu vết EmrAmendments).
/// Plan: docs/workspace-docs/20-backlog/items/plan-emr-tt46-immutability.md
/// </summary>
public static class EmrLockGuard
{
    public const string LockedMessage =
        "Hồ sơ bệnh án đã kết thúc và được khóa theo TT46/2018-TT-BYT — không thể sửa nội dung. "
        + "Dùng chức năng 'Mở lại hồ sơ' (quyền hạn chế, có lưu vết) nếu cần tu chỉnh.";

    public static async Task EnsureEditableByRecordAsync(HISDbContext db, Guid medicalRecordId)
    {
        if (medicalRecordId == Guid.Empty) return;
        var finalizedAt = await db.MedicalRecords.AsNoTracking()
            .Where(m => m.Id == medicalRecordId)
            .Select(m => m.EmrFinalizedAt)
            .FirstOrDefaultAsync();
        if (finalizedAt != null) throw new InvalidOperationException(LockedMessage);
    }

    public static async Task EnsureEditableByExaminationAsync(HISDbContext db, Guid examinationId)
    {
        if (examinationId == Guid.Empty) return;
        var finalizedAt = await db.Examinations.AsNoTracking()
            .Where(e => e.Id == examinationId)
            .Select(e => e.MedicalRecord.EmrFinalizedAt)
            .FirstOrDefaultAsync();
        if (finalizedAt != null) throw new InvalidOperationException(LockedMessage);
    }

    public static async Task EnsureEditableByAdmissionAsync(HISDbContext db, Guid admissionId)
    {
        if (admissionId == Guid.Empty) return;
        var finalizedAt = await db.Admissions.AsNoTracking()
            .Where(a => a.Id == admissionId)
            .Select(a => a.MedicalRecord.EmrFinalizedAt)
            .FirstOrDefaultAsync();
        if (finalizedAt != null) throw new InvalidOperationException(LockedMessage);
    }
}
