using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Security;

/// <summary>
/// Correct lookups for Patient fields protected by randomized Data Protection.
/// Randomized ciphertext cannot be compared in SQL; callers must materialize so
/// EF decrypts values first. Replace with indexed blind hashes when the patient
/// table grows beyond the current deployment size.
/// </summary>
public static class PatientPiiLookup
{
    public static Task<Patient?> FindByIdentityNumberDecryptedAsync(
        this IQueryable<Patient> query,
        string value,
        CancellationToken cancellationToken = default)
        => FindAsync(query, p => p.IdentityNumber, value, cancellationToken);

    public static Task<Patient?> FindByPhoneNumberDecryptedAsync(
        this IQueryable<Patient> query,
        string value,
        CancellationToken cancellationToken = default)
        => FindAsync(query, p => p.PhoneNumber, value, cancellationToken);

    public static Task<Patient?> FindByInsuranceNumberDecryptedAsync(
        this IQueryable<Patient> query,
        string value,
        CancellationToken cancellationToken = default)
        => FindAsync(query, p => p.InsuranceNumber, value, cancellationToken);

    private static async Task<Patient?> FindAsync(
        IQueryable<Patient> query,
        Func<Patient, string?> selector,
        string value,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var expected = value.Trim();
        var candidates = await query.ToListAsync(cancellationToken);
        return candidates.FirstOrDefault(p => string.Equals(
            selector(p)?.Trim(), expected, StringComparison.OrdinalIgnoreCase));
    }
}
