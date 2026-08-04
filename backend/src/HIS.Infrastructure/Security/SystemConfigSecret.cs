using Microsoft.AspNetCore.DataProtection;

namespace HIS.Infrastructure.Security;

/// <summary>
/// Encrypts secrets stored as SystemConfig rows (gateway passwords, tokens) so a database dump
/// or an admin with read access to the table does not hand over working credentials.
///
/// Same convention as <see cref="Services.NangCap23ConfigStore"/>: an "ENC:" prefix marks a
/// protected value, and Data Protection keys persist via PersistKeysToDbContext (Program.cs), so
/// values stay readable across container restarts and redeploys. A separate purpose is used so
/// this never depends on — or invalidates — the ciphertexts that store already wrote.
///
/// Values without the prefix are returned untouched: rows written before encryption keep working
/// and become encrypted the next time they are saved.
/// </summary>
public class SystemConfigSecret
{
    private const string Purpose = "HIS.SystemConfig.Secret.v1";
    private const string EncryptedPrefix = "ENC:";

    private readonly IDataProtector _protector;

    public SystemConfigSecret(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector(Purpose);
    }

    /// <summary>Value to persist. Already-protected input is returned as-is (no double wrapping).</summary>
    public string Protect(string? plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;
        if (plainText.StartsWith(EncryptedPrefix, StringComparison.Ordinal)) return plainText;
        return EncryptedPrefix + _protector.Protect(plainText);
    }

    /// <summary>
    /// Usable value. Legacy plaintext passes through; a value that cannot be decrypted (key lost)
    /// is returned empty rather than as ciphertext, so callers treat it as "not configured"
    /// instead of authenticating with garbage.
    /// </summary>
    public string Reveal(string? storedValue)
    {
        if (string.IsNullOrEmpty(storedValue)) return string.Empty;
        if (!storedValue.StartsWith(EncryptedPrefix, StringComparison.Ordinal)) return storedValue;

        try
        {
            return _protector.Unprotect(storedValue.Substring(EncryptedPrefix.Length));
        }
        catch (System.Security.Cryptography.CryptographicException)
        {
            return string.Empty;
        }
    }

    /// <summary>True when the stored value is already protected — used to avoid re-encrypting.</summary>
    public static bool IsProtected(string? storedValue) =>
        storedValue != null && storedValue.StartsWith(EncryptedPrefix, StringComparison.Ordinal);
}
