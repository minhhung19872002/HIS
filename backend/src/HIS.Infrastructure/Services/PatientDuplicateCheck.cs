using Microsoft.EntityFrameworkCore;
using HIS.Core.Common;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R15: creating a patient whose normalized full name + birth date (+ gender) match an existing active patient
/// silently produced a second record for the same person (split history, allergies on one record only). WARNING only —
/// never blocks: namesakes born the same day exist, and the counter decides (merge later if it is the same person).
/// Name/DOB/gender are plain columns, so the candidate query does not decrypt PII.
/// </summary>
public static class PatientDuplicateCheck
{
    /// <summary>Lower-case, no diacritics (đ→d), single spaces.</summary>
    public static string NormalizeName(string? name)
        => string.Join(' ', VnSearchText.Fold(name).Split(' ', StringSplitOptions.RemoveEmptyEntries));

    /// <summary>Same person by name + birth (full date when both sides have it, else year) + gender (when both known).</summary>
    public static bool IsMatch(string newName, DateTime? newDob, int? newYear, int? newGender,
        string existingName, DateTime? existingDob, int? existingYear, int existingGender)
    {
        var name = NormalizeName(newName);
        if (name.Length == 0 || name != NormalizeName(existingName)) return false;
        if (newGender is 1 or 2 && existingGender is 1 or 2 && newGender != existingGender) return false;
        if (newDob.HasValue && existingDob.HasValue) return newDob.Value.Date == existingDob.Value.Date;
        var y = newDob?.Year ?? newYear;
        var ey = existingDob?.Year ?? existingYear;
        return y.HasValue && ey.HasValue && y.Value == ey.Value;
    }

    /// <summary>Warnings for existing active patients matching the new one (empty when no birth date/year is known).</summary>
    public static async Task<List<string>> FindWarningsAsync(HISDbContext db, string? fullName, DateTime? dateOfBirth,
        int? yearOfBirth, int? gender, Guid? excludePatientId = null)
    {
        var warnings = new List<string>();
        var year = dateOfBirth?.Year ?? yearOfBirth;
        if (string.IsNullOrWhiteSpace(fullName) || year is null) return warnings;
        var y = year.Value;
        // Sargable range instead of YEAR(DateOfBirth) — keeps an index usable on a large Patients table.
        var yFrom = new DateTime(y, 1, 1);
        var yTo = yFrom.AddYears(1);

        var candidates = await db.Patients.AsNoTracking()
            .Where(p => !p.IsDeleted && p.MergedIntoPatientId == null
                        && (excludePatientId == null || p.Id != excludePatientId)
                        && ((p.DateOfBirth >= yFrom && p.DateOfBirth < yTo)
                            || (p.DateOfBirth == null && p.YearOfBirth == y)))
            .Select(p => new { p.PatientCode, p.FullName, p.DateOfBirth, p.YearOfBirth, p.Gender })
            .Take(5000)
            .ToListAsync();

        foreach (var c in candidates
                     .Where(c => IsMatch(fullName, dateOfBirth, yearOfBirth, gender, c.FullName, c.DateOfBirth, c.YearOfBirth, c.Gender))
                     .Take(3))
        {
            var born = c.DateOfBirth.HasValue ? c.DateOfBirth.Value.ToString("dd/MM/yyyy") : c.YearOfBirth?.ToString();
            warnings.Add($"Có thể trùng người bệnh đã có: {c.PatientCode} — {c.FullName} (sinh {born}). "
                         + "Kiểm tra lại; nếu là cùng một người thì dùng hồ sơ cũ / gộp hồ sơ.");
        }
        return warnings;
    }
}
