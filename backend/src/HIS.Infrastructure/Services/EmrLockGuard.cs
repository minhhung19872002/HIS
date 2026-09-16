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

    /// <summary>
    /// QA-R4 (2026-09-16): the whole surgery module (request → schedule → start → narrative → team →
    /// medicines/supplies → consents) wrote into finalized records — none of the writers called this guard.
    /// A surgery request links the record either by MedicalRecordId (IPD) or ExaminationId (OPD).
    /// Unknown surgeryId → no-op: the caller reports not-found with its own message.
    /// </summary>
    public static async Task EnsureEditableBySurgeryRequestAsync(HISDbContext db, Guid surgeryRequestId)
    {
        if (surgeryRequestId == Guid.Empty) return;
        var link = await db.SurgeryRequests.AsNoTracking()
            .Where(r => r.Id == surgeryRequestId)
            .Select(r => new { r.MedicalRecordId, r.ExaminationId })
            .FirstOrDefaultAsync();
        if (link == null) return;
        if (link.MedicalRecordId.HasValue) await EnsureEditableByRecordAsync(db, link.MedicalRecordId.Value);
        else if (link.ExaminationId.HasValue) await EnsureEditableByExaminationAsync(db, link.ExaminationId.Value);
    }

    public const string SurgeryCertificateDocumentType = "ls-surgery-cert"; // EmrSigningChainDrawer / mig 97 seed

    /// <summary>
    /// QA-R4: once the surgery certificate (MS.18, TT32) of the record has an approved signing step
    /// (SigningRequests.Status = 1, DocumentId = MedicalRecordId as EmrSigningChainDrawer submits it),
    /// the narrative / team / post-op diagnosis it certifies must not change underneath the signature.
    /// </summary>
    public static async Task EnsureSurgeryCertificateUnsignedAsync(HISDbContext db, Guid surgeryRequestId)
    {
        if (surgeryRequestId == Guid.Empty) return;
        var medicalRecordId = await db.SurgeryRequests.AsNoTracking()
            .Where(r => r.Id == surgeryRequestId)
            .Select(r => r.MedicalRecordId)
            .FirstOrDefaultAsync();
        if (medicalRecordId == null || medicalRecordId == Guid.Empty) return;
        var signed = await db.SigningRequests.AsNoTracking().AnyAsync(s =>
            s.DocumentType == SurgeryCertificateDocumentType && s.DocumentId == medicalRecordId.Value
            && s.Status == 1 && !s.IsDeleted);
        if (signed)
            throw new InvalidOperationException(
                "Giấy chứng nhận phẫu thuật của hồ sơ này đã được ký số — không sửa được tường trình, chẩn đoán sau mổ hay ekip mổ. "
                + "Cần huỷ chữ ký hoặc mở lại hồ sơ (có lưu vết) trước khi tu chỉnh.");
    }
}
