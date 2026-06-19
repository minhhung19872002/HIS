using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// #185/#186 — chốt an toàn kê đơn (dị-ứng + tương-tác) dùng CHUNG cho outpatient (ExaminationCompleteService)
/// và inpatient (InpatientCompleteService) → single-source, tránh trùng logic (DRY).
///
/// Chặn LƯU đơn khi có cảnh báo NGHIÊM TRỌNG mà bác sĩ KHÔNG nêu lý do bỏ qua (OverrideReason):
///   • Dị ứng thuốc  : Severity >= 2 (2-Trung bình, 3-Nặng)         [#185]
///   • Tương tác thuốc: Severity >= 3 (3-Nặng, 4-CCĐ tuyệt đối)      [#186]
/// KB tương tác (DrugInteractions) rỗng → không chặn tới khi seed (migration).
/// Có OverrideReason → cho qua; caller chịu trách nhiệm ghi reason vào Instructions để audit.
/// Ném <see cref="InvalidOperationException"/> → DomainExceptionFilter trả 400 + message rõ.
/// </summary>
public static class PrescriptionSafetyGuard
{
    public static async Task EnsureSafeAsync(
        HISDbContext db, Guid patientId, List<Guid> medicineIds, string? overrideReason)
    {
        if (medicineIds == null || medicineIds.Count == 0) return;
        if (!string.IsNullOrWhiteSpace(overrideReason)) return; // BS cố tình bỏ qua → cho qua (audit ở caller)

        var medicines = await db.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.ActiveIngredient })
            .ToListAsync();

        var blocks = new List<string>();

        // #185 — dị ứng thuốc (Severity >= 2). Khớp theo AllergenCode (exact) hoặc AllergenName (substring tên/hoạt chất).
        var allergies = await db.Allergies
            .Where(a => a.PatientId == patientId && a.IsActive && a.AllergyType == 1 && a.Severity >= 2)
            .ToListAsync();
        foreach (var med in medicines)
        {
            foreach (var al in allergies)
            {
                var hit =
                    (!string.IsNullOrEmpty(al.AllergenCode) && med.MedicineCode == al.AllergenCode) ||
                    (!string.IsNullOrEmpty(al.AllergenName) &&
                       (med.MedicineName.Contains(al.AllergenName, StringComparison.OrdinalIgnoreCase) ||
                        (med.ActiveIngredient != null &&
                         med.ActiveIngredient.Contains(al.AllergenName, StringComparison.OrdinalIgnoreCase))));
                if (hit)
                    blocks.Add($"[Dị ứng] {med.MedicineName} ~ {al.AllergenName} (phản ứng: {al.Reaction})");
            }
        }

        // #186 — tương tác thuốc nghiêm trọng (Severity >= 3). Cặp lưu (A,B) đối xứng — yêu cầu CẢ hai thuốc có trong đơn.
        if (medicineIds.Count >= 2)
        {
            var severe = await db.DrugInteractions
                .Where(d => !d.IsDeleted && d.IsActive && d.Severity >= 3 &&
                            medicineIds.Contains(d.Medicine1Id) && medicineIds.Contains(d.Medicine2Id))
                .ToListAsync();
            foreach (var it in severe)
            {
                var m1 = medicines.FirstOrDefault(m => m.Id == it.Medicine1Id)?.MedicineName ?? "";
                var m2 = medicines.FirstOrDefault(m => m.Id == it.Medicine2Id)?.MedicineName ?? "";
                blocks.Add($"[Tương tác] {m1} + {m2}: {it.Description}");
            }
        }

        if (blocks.Count == 0) return;

        var sb = new StringBuilder("Đơn thuốc bị chặn vì lý do an toàn:");
        foreach (var b in blocks) sb.Append(' ').Append(b).Append(';');
        sb.Append(" Cần nhập lý do bỏ qua (OverrideReason) nếu bác sĩ vẫn quyết định kê.");
        throw new InvalidOperationException(sb.ToString());
    }
}
