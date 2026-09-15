using HIS.Core.Common;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA round 3: server-side enforcement of the dose-range check (the UI already asks for a reason, but a direct API
/// call or an older client saved a severe overdose silently). Same evaluation as POST /medicine-dose-range/check:
/// active thresholds, patient age from date of birth, latest recorded weight.
///
/// Blocks ONLY severity 3 (QUÁ LIỀU NẶNG) lines without an override reason. Out-of-range (2) and "not checked"
/// (1: no weight, no applicable threshold, unreadable dose text) never block. The message carries the same
/// "bị chặn vì lý do an toàn" marker as <see cref="PrescriptionSafetyGuard"/>, so the v2 editors open their
/// override-reason prompt. The caller stores the reason in the prescription notes.
/// </summary>
public static class PrescriptionDoseGuard
{
    public static async Task EnsureNoUnjustifiedSevereOverdoseAsync(
        HISDbContext db, Guid patientId, IEnumerable<DoseRangeChecker.Item?> lines, string? overrideReason)
    {
        if (!string.IsNullOrWhiteSpace(overrideReason)) return;
        var items = lines.Where(l => l != null).Select(l => l!).ToList();
        if (items.Count == 0) return;

        var medIds = items.Select(i => i.MedicineId).Distinct().ToList();
        var ranges = await db.MedicineDoseRanges.AsNoTracking()
            .Include(r => r.Medicine)
            .Where(r => r.IsActive && medIds.Contains(r.MedicineId))
            .ToListAsync();
        if (ranges.Count == 0) return;

        int? age = null;
        decimal? weight = null;
        if (patientId != Guid.Empty)
        {
            age = await MedicineDoseRangeService.ResolvePatientAgeAsync(db, patientId);
            if (ranges.Any(r => r.MaxDosePerKg is > 0 || r.MinDosePerKg is > 0))
                weight = await MedicineDoseRangeService.ResolveLatestWeightAsync(db, patientId);
        }

        var severe = DoseRangeChecker.Check(ranges, items, age, isRenalImpaired: false, weight)
            .Where(w => w.Severity >= DoseRangeChecker.SeveritySevere)
            .ToList();
        if (severe.Count == 0) return;

        throw new InvalidOperationException(
            "Đơn thuốc bị chặn vì lý do an toàn — QUÁ LIỀU NẶNG:\n"
            + string.Join("\n", severe.Select(w => $"• {w.MedicineName}: {w.Message}"))
            + "\nGiảm liều, hoặc nhập lý do vẫn kê liều cao (được lưu vào đơn) rồi lưu lại.");
    }
}
