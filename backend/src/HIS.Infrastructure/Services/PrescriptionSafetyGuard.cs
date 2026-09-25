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

        var blocks = await FindBlockingIssuesAsync(db, patientId, medicineIds);
        if (blocks.Count == 0) return;

        var sb = new StringBuilder("Đơn thuốc bị chặn vì lý do an toàn:");
        foreach (var b in blocks) sb.Append(' ').Append(b).Append(';');
        sb.Append(" Cần nhập lý do bỏ qua (OverrideReason) nếu bác sĩ vẫn quyết định kê.");
        throw new InvalidOperationException(sb.ToString());
    }

    /// <summary>
    /// The findings <see cref="EnsureSafeAsync"/> blocks on ("[Dị ứng] …" / "[Tương tác] …"), without throwing —
    /// QA-R12: also used by the advisory check endpoints so a pre-save check and the save agree.
    /// </summary>
    public static async Task<List<string>> FindBlockingIssuesAsync(HISDbContext db, Guid patientId, List<Guid> medicineIds)
    {
        if (medicineIds == null || medicineIds.Count == 0) return new List<string>();

        var medicines = await db.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.MedicineCode, m.MedicineName, m.ActiveIngredient })
            .ToListAsync();

        var blocks = new List<string>();

        // #185 — dị ứng thuốc (Severity >= 2). Khớp theo AllergenCode (exact) hoặc AllergenName (tên/hoạt chất,
        // so sau khi chuẩn hoá: bỏ dấu + gộp phụ âm đôi — "Amoxicillin" phải khớp hoạt chất "Amoxicilin").
        var allergies = await db.Allergies
            .Where(a => a.PatientId == patientId && a.IsActive && a.AllergyType == 1 && a.Severity >= 2)
            .ToListAsync();
        foreach (var med in medicines)
        {
            foreach (var al in allergies)
            {
                var hit =
                    (!string.IsNullOrEmpty(al.AllergenCode) && med.MedicineCode == al.AllergenCode) ||
                    (!string.IsNullOrEmpty(al.AllergenName) && MentionsAllergen(med.MedicineName, med.ActiveIngredient, al.AllergenName));
                if (hit)
                    blocks.Add($"[Dị ứng] {med.MedicineName} ~ {al.AllergenName} (phản ứng: {al.Reaction})");
            }
        }

        // Allergies the doctor typed as free text in the exam ("Dị ứng Amoxicillin") live in
        // Patient.AllergyHistory and were never checked: an infant with a documented amoxicillin allergy
        // was issued amoxicillin with "0 dị ứng" shown. No severity is recorded there, so treat a hit as
        // blocking (override reason still allowed).
        var allergyText = await db.Patients.Where(p => p.Id == patientId).Select(p => p.AllergyHistory).FirstOrDefaultAsync();
        if (!string.IsNullOrWhiteSpace(allergyText))
        {
            foreach (var med in medicines)
            {
                var hitName = FreeTextAllergyHit(allergyText, med.MedicineName, med.ActiveIngredient);
                if (hitName != null && !blocks.Any(x => x.StartsWith($"[Dị ứng] {med.MedicineName} ", StringComparison.Ordinal)))
                    blocks.Add($"[Dị ứng] {med.MedicineName} ~ tiền sử dị ứng ghi trong hồ sơ: \"{allergyText.Trim()}\"");
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

        return blocks;
    }

    /// <summary>Allergen name matches the drug's trade name or any of its active ingredients (normalized).</summary>
    public static bool MentionsAllergen(string medicineName, string? activeIngredient, string allergenName)
    {
        var allergen = NormalizeDrugText(allergenName);
        if (allergen.Length < 3) return false;
        return NormalizeDrugText(medicineName).Contains(allergen, StringComparison.Ordinal)
            || (activeIngredient != null && NormalizeDrugText(activeIngredient).Contains(allergen, StringComparison.Ordinal));
    }

    private static readonly HashSet<string> NonSpecificWords = new(StringComparer.Ordinal)
    {
        "acid", "natri", "kali", "calci", "canxi", "magnesi", "vitamin", "duoi", "dang", "hydroclorid",
        "hydrochlorid", "hydrochloride", "sulfat", "phosphat", "clorid", "chloride", "thuoc", "khang", "sinh",
    };

    /// <summary>Distinctive keywords of a drug: first specific word of each ";"/"+"/","-separated
    /// active-ingredient component (text cut at the first "(" or digit, so strengths like "500mg" are ignored)
    /// plus the first specific word of the trade name. "Metformin Hydrochloride 500mg" → "metformin";
    /// "Amoxicilin (dưới dạng …); Acid Clavulanic" → "amoxicilin", "clavulanic"; trade name "Fabamox 1000" → "fabamox".</summary>
    public static IEnumerable<string> DrugKeywords(string medicineName, string? activeIngredient)
    {
        var keys = new List<string>();
        void AddFirstSpecific(string raw)
        {
            var cut = raw.Split('(')[0];
            var digit = cut.IndexOfAny("0123456789".ToCharArray());
            if (digit >= 0) cut = cut[..digit];
            var word = NormalizeDrugText(cut).Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault(w => w.Length >= 5 && !NonSpecificWords.Contains(w));
            if (word != null) keys.Add(word);
        }
        foreach (var part in (activeIngredient ?? string.Empty).Split(new[] { ';', '+', ',' }, StringSplitOptions.RemoveEmptyEntries))
            AddFirstSpecific(part);
        AddFirstSpecific(medicineName ?? string.Empty);
        return keys.Distinct();
    }

    /// <summary>
    /// Drug keyword found in a free-text allergy note, or null. Words are compared by prefix in both
    /// directions (≥5 letters) so spelling variants match: "Ceftriaxon" ~ "Ceftriaxone", "amoxi" ~ "amoxicilin".
    /// A negated mention ("không dị ứng Paracetamol") still matches — the doctor then states an override reason.
    /// </summary>
    public static string? FreeTextAllergyHit(string? allergyText, string medicineName, string? activeIngredient)
    {
        if (string.IsNullOrWhiteSpace(allergyText)) return null;
        var words = NormalizeDrugText(allergyText).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 5 && !NonSpecificWords.Contains(w)).ToList();
        if (words.Count == 0) return null;
        return DrugKeywords(medicineName, activeIngredient)
            .FirstOrDefault(k => words.Any(w => w.StartsWith(k, StringComparison.Ordinal) || k.StartsWith(w, StringComparison.Ordinal)));
    }

    /// <summary>Lower-case, strip Vietnamese diacritics (đ→d), non-letters → space, collapse doubled letters
    /// (so "Penicillin"/"Penicilin", "Amoxicillin"/"Amoxicilin" compare equal).</summary>
    public static string NormalizeDrugText(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        var d = s.Replace('Đ', 'D').Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(d.Length);
        char prev = ' ';
        foreach (var ch in d)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            var c = char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : ' ';
            if (c == ' ' && prev == ' ') continue;
            if (c != ' ' && c == prev) continue;
            sb.Append(c);
            prev = c;
        }
        return sb.ToString().Trim();
    }
}
