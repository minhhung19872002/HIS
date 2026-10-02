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

    /// <summary>
    /// QA-R14: duplicate ACTIVE INGREDIENT (TT 52/2017/TT-BYT — không kê trùng hoạt chất) was never checked on save:
    /// "Paracetamol 500mg" + "Efferalgan" on one prescription, or a second prescription of the same patient within
    /// 24 h repeating an ingredient, went through silently (paracetamol overdose risk). WARNING only — never blocks.
    /// Ingredients are compared by their distinctive keyword (see <see cref="DrugKeywords"/>, trade name excluded);
    /// a line without an ingredient falls back to the medicine id. Also reports severe interactions (Severity ≥ 3)
    /// with drugs on those other prescriptions.
    /// </summary>
    public static async Task<List<string>> FindDuplicateIngredientWarningsAsync(HISDbContext db, Guid patientId,
        Guid prescriptionId, Guid? replacesPrescriptionId,
        IReadOnlyCollection<(Guid MedicineId, string MedicineName, string? ActiveIngredient)> lines)
    {
        var warnings = new List<string>();
        if (lines == null || lines.Count == 0) return warnings;
        static IEnumerable<string> Keys((Guid MedicineId, string MedicineName, string? ActiveIngredient) l)
        {
            var k = DrugKeywords(string.Empty, l.ActiveIngredient).ToList();
            return k.Count > 0 ? k : new List<string> { "id:" + l.MedicineId };
        }

        foreach (var g in lines.SelectMany(l => Keys(l).Select(k => (Key: k, Line: l))).GroupBy(x => x.Key))
        {
            if (g.Count() < 2) continue;
            var label = g.Key.StartsWith("id:", StringComparison.Ordinal) ? g.First().Line.MedicineName : g.Key;
            warnings.Add($"Trùng hoạt chất {label} trong cùng đơn: {string.Join(" + ", g.Select(x => x.Line.MedicineName))}"
                         + " — kiểm tra tổng liều/ngày (TT 52/2017/TT-BYT).");
        }

        if (patientId == Guid.Empty) return warnings;
        var since = DateTime.Now.AddHours(-24); // PrescriptionDate is written with DateTime.Now
        var others = await db.Prescriptions.AsNoTracking()
            .Where(p => !p.IsDeleted && p.Id != prescriptionId && p.Id != replacesPrescriptionId
                        && p.MedicalRecord.PatientId == patientId && p.PrescriptionDate >= since
                        && (p.Status == HIS.Core.Constants.PrescriptionStatus.PendingApproval
                            || p.Status == HIS.Core.Constants.PrescriptionStatus.Approved
                            || p.Status == HIS.Core.Constants.PrescriptionStatus.Dispensed
                            || p.Status == HIS.Core.Constants.PrescriptionStatus.PartialDispensed))
            .SelectMany(p => p.Details.Where(d => !d.IsDeleted).Select(d => new
            {
                p.PrescriptionCode, d.MedicineId, d.Medicine.MedicineName, d.Medicine.ActiveIngredient
            }))
            .Take(500)
            .ToListAsync();
        foreach (var l in lines)
        {
            var keys = Keys(l).ToHashSet(StringComparer.Ordinal);
            var hit = others.FirstOrDefault(o => Keys((o.MedicineId, o.MedicineName, o.ActiveIngredient)).Any(keys.Contains));
            if (hit != null)
                warnings.Add($"{l.MedicineName}: trùng hoạt chất với {hit.MedicineName} trong đơn {hit.PrescriptionCode} đã kê"
                             + " trong 24 giờ qua — tránh dùng trùng/quá liều.");
        }

        // A severe interaction split over two prescriptions (clarithromycin today, colchicine on a second
        // prescription of the same visit) passed the per-prescription guard — surface it as a warning.
        var newIds = lines.Select(l => l.MedicineId).Distinct().ToList();
        var otherIds = others.Select(o => o.MedicineId).Distinct().ToList();
        if (otherIds.Count > 0)
        {
            var severe = await db.DrugInteractions.AsNoTracking()
                .Where(d => !d.IsDeleted && d.IsActive && d.Severity >= 3
                            && ((newIds.Contains(d.Medicine1Id) && otherIds.Contains(d.Medicine2Id))
                                || (newIds.Contains(d.Medicine2Id) && otherIds.Contains(d.Medicine1Id))))
                .ToListAsync();
            foreach (var it in severe)
            {
                var mine = lines.FirstOrDefault(l => l.MedicineId == it.Medicine1Id || l.MedicineId == it.Medicine2Id);
                var other = others.FirstOrDefault(o => (o.MedicineId == it.Medicine1Id || o.MedicineId == it.Medicine2Id) && o.MedicineId != mine.MedicineId);
                if (other == null) continue;
                warnings.Add($"[Tương tác] {mine.MedicineName} + {other.MedicineName} (đơn {other.PrescriptionCode} trong 24 giờ qua): {it.Description}");
            }
        }
        return warnings.Distinct().ToList();
    }

    /// <summary>Allergen name matches the drug's trade name or any of its active ingredients (normalized).</summary>
    public static bool MentionsAllergen(string medicineName, string? activeIngredient, string allergenName)
    {
        var allergen = NormalizeDrugText(allergenName);
        if (allergen.Length < 3) return false;
        return NormalizeDrugText(medicineName).Contains(allergen, StringComparison.Ordinal)
            || (activeIngredient != null && NormalizeDrugText(activeIngredient).Contains(allergen, StringComparison.Ordinal))
            || DrugClassAllergyHit(allergenName, medicineName, activeIngredient) != null;
    }

    /// <summary>
    /// QA-R14: allergy recorded as a DRUG CLASS ("Dị ứng nhóm Penicillin", "beta-lactam", "Cephalosporin", "sulfa")
    /// never matched a member drug — amoxicillin was issued to a patient with a documented penicillin allergy.
    /// Returns the class label when a keyword of the drug belongs to a class named in the allergy text, else null.
    /// Classes are recognised by the INN stem (normalized, doubled letters collapsed): penicillins "…cilin",
    /// cephalosporins "cef…/ceph…", carbapenems "…penem", sulfonamides "sulfameth…/sulfadiaz…/cotrimox…".
    /// </summary>
    public static string? DrugClassAllergyHit(string? allergyText, string medicineName, string? activeIngredient)
    {
        if (string.IsNullOrWhiteSpace(allergyText)) return null;
        var text = NormalizeDrugText(allergyText);
        var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var betaLactam = text.Contains("beta lactam", StringComparison.Ordinal) || words.Any(w => w.StartsWith("betalactam", StringComparison.Ordinal));
        var penicillin = betaLactam || words.Any(w => w.StartsWith("penicil", StringComparison.Ordinal));
        var cephalosporin = betaLactam || words.Any(w => w.StartsWith("cephalospor", StringComparison.Ordinal) || w.StartsWith("cefalospor", StringComparison.Ordinal));
        var carbapenem = betaLactam || words.Any(w => w.StartsWith("carbapenem", StringComparison.Ordinal));
        var sulfonamide = words.Any(w => w == "sulfa" || w.StartsWith("sulfonamid", StringComparison.Ordinal) || w.StartsWith("sulfamid", StringComparison.Ordinal));
        if (!(penicillin || cephalosporin || carbapenem || sulfonamide)) return null;

        foreach (var k in DrugKeywords(medicineName, activeIngredient))
        {
            if (penicillin && k.Contains("cilin", StringComparison.Ordinal)) return $"{k} (nhóm penicilin)";
            if (cephalosporin && (k.StartsWith("cef", StringComparison.Ordinal) || k.StartsWith("ceph", StringComparison.Ordinal))) return $"{k} (nhóm cephalosporin)";
            if (carbapenem && k.EndsWith("penem", StringComparison.Ordinal)) return $"{k} (nhóm carbapenem)";
            if (sulfonamide && (k.StartsWith("sulfameth", StringComparison.Ordinal) || k.StartsWith("sulfadiaz", StringComparison.Ordinal)
                                || k.StartsWith("sulfasalaz", StringComparison.Ordinal) || k.StartsWith("sulfadox", StringComparison.Ordinal)
                                || k.StartsWith("cotrimox", StringComparison.Ordinal)))
                return $"{k} (nhóm sulfonamid)";
        }
        return null;
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
            .FirstOrDefault(k => words.Any(w => w.StartsWith(k, StringComparison.Ordinal) || k.StartsWith(w, StringComparison.Ordinal)))
            ?? DrugClassAllergyHit(allergyText, medicineName, activeIngredient); // QA-R14: "dị ứng nhóm penicillin"
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
