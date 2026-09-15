using HIS.Core.Common;
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
        => FindPhoneAsync(query, value, cancellationToken);

    public static Task<Patient?> FindByInsuranceNumberDecryptedAsync(
        this IQueryable<Patient> query,
        string value,
        CancellationToken cancellationToken = default)
        => FindAsync(query, p => p.InsuranceNumber, value, cancellationToken);

    /// <summary>
    /// #218/T3 (migration 179): tra bệnh nhân theo số giấy khai sinh — giấy tờ định danh duy nhất
    /// của trẻ sơ sinh khi cấp thẻ BHYT tạm. Cột mã hoá nên phải tra giải mã như ba hàm trên.
    /// </summary>
    public static Task<Patient?> FindByBirthCertificateNumberDecryptedAsync(
        this IQueryable<Patient> query,
        string value,
        CancellationToken cancellationToken = default)
        => FindAsync(query, p => p.BirthCertificateNumber, value, cancellationToken);

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

    /// <summary>
    /// Số điện thoại so theo <see cref="PhoneNumberKey"/>, không so chuỗi thô: quầy lưu "09…" còn
    /// app hỗ trợ người bệnh gửi "+84…". So chuỗi thô thì luồng đặt lịch từ app không nhận ra
    /// bệnh nhân cũ và tạo hồ sơ trùng.
    /// </summary>
    private static async Task<Patient?> FindPhoneAsync(
        IQueryable<Patient> query, string value, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var candidates = await query.ToListAsync(cancellationToken);
        return candidates.FirstOrDefault(p => PhoneNumberKey.Same(p.PhoneNumber, value));
    }
}
