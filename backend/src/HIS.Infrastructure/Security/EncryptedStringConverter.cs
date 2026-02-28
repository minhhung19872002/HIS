using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HIS.Infrastructure.Security;

/// <summary>
/// EF Core ValueConverter that encrypts/decrypts string values using ASP.NET Core Data Protection API.
/// Applied to Patient PII columns (IdentityNumber, PhoneNumber, Email, InsuranceNumber).
/// Gracefully handles pre-existing plaintext data by catching decryption failures.
/// </summary>
public class EncryptedStringConverter : ValueConverter<string?, string?>
{
    private const string Purpose = "HIS.PatientPII";

    public EncryptedStringConverter(IDataProtectionProvider provider)
        : base(
            v => Encrypt(provider, v),
            v => Decrypt(provider, v))
    {
    }

    private static string? Encrypt(IDataProtectionProvider provider, string? value)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        var protector = provider.CreateProtector(Purpose);
        return protector.Protect(value);
    }

    private static string? Decrypt(IDataProtectionProvider provider, string? value)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        var protector = provider.CreateProtector(Purpose);
        try
        {
            return protector.Unprotect(value);
        }
        catch (System.Security.Cryptography.CryptographicException)
        {
            // Graceful fallback: existing plaintext data that was stored before encryption
            // was enabled will fail to decrypt. Return as-is so the application continues
            // to work. The value will be encrypted on next save via the Encrypt path.
            return value;
        }
    }
}
