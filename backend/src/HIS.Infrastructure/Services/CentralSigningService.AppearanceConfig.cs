using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Xml;
using System.Text;
using System.Xml;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class CentralSigningService
{
    // ============ Signature Appearance Config ============

    public async Task<SignatureAppearanceDto> GetAppearanceConfigAsync()
    {
        var config = await _db.Set<SystemConfig>()
            .FirstOrDefaultAsync(c => c.ConfigKey == "SignatureAppearance");

        if (config?.ConfigValue != null)
        {
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<SignatureAppearanceDto>(config.ConfigValue)
                    ?? new SignatureAppearanceDto();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "#190 SignatureAppearance config JSON hỏng → dùng cấu hình mặc định");
            }
        }
        return new SignatureAppearanceDto();
    }

    public async Task<bool> SaveAppearanceConfigAsync(SignatureAppearanceDto dto)
    {
        var config = await _db.Set<SystemConfig>()
            .FirstOrDefaultAsync(c => c.ConfigKey == "SignatureAppearance");

        var json = System.Text.Json.JsonSerializer.Serialize(dto);

        if (config == null)
        {
            _db.Set<SystemConfig>().Add(new SystemConfig
            {
                ConfigKey = "SignatureAppearance",
                ConfigValue = json,
                Description = "Cấu hình hiển thị chữ ký số trên PDF"
            });
        }
        else
        {
            config.ConfigValue = json;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    // ============ Private Helpers ============

    private static Oid GetHashOid(string algorithm) => algorithm.ToUpper() switch
    {
        "SHA1" => new Oid("1.3.14.3.2.26"),
        "SHA256" or "SHA-256" => new Oid("2.16.840.1.101.3.4.2.1"),
        "SHA384" or "SHA-384" => new Oid("2.16.840.1.101.3.4.2.2"),
        "SHA512" or "SHA-512" => new Oid("2.16.840.1.101.3.4.2.3"),
        _ => new Oid("2.16.840.1.101.3.4.2.1") // default SHA-256
    };

    private static string GetCN(string dn)
    {
        foreach (var part in dn.Split(','))
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
                return trimmed[3..].Trim();
        }
        return dn;
    }

    private static string GenerateSignatureSvg(string signerName, bool animated)
    {
        var animAttr = animated ? @" opacity=""0""><animate attributeName=""opacity"" from=""0"" to=""1"" dur=""1s"" fill=""freeze""/>" : ">";
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" width=""200"" height=""80"" viewBox=""0 0 200 80"">
  <rect width=""200"" height=""80"" fill=""none"" stroke=""#ccc"" stroke-width=""1""/>
  <text x=""100"" y=""25"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""12"" fill=""#000080""{animAttr}Đã ký số</text>
  <text x=""100"" y=""45"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""11"" fill=""#000080"">{System.Security.SecurityElement.Escape(signerName)}</text>
  <text x=""100"" y=""65"" text-anchor=""middle"" font-family=""Times New Roman"" font-size=""9"" fill=""#666"">{DateTime.UtcNow:dd/MM/yyyy HH:mm}</text>
</svg>";
    }

    // TOTP Helpers
    private static string GenerateTotpCode(byte[] secret, long timeStep)
    {
        var timeBytes = BitConverter.GetBytes(timeStep);
        if (BitConverter.IsLittleEndian) Array.Reverse(timeBytes);
        using var hmac = new HMACSHA1(secret);
        var hash = hmac.ComputeHash(timeBytes);
        var offset = hash[^1] & 0x0F;
        var code = ((hash[offset] & 0x7F) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
        return (code % 1000000).ToString("D6");
    }

    private static string Base32Encode(byte[] data)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5) { bitsLeft -= 5; sb.Append(chars[(buffer >> bitsLeft) & 0x1F]); }
        }
        if (bitsLeft > 0) sb.Append(chars[(buffer << (5 - bitsLeft)) & 0x1F]);
        return sb.ToString();
    }

    private static byte[] Base32Decode(string encoded)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var output = new List<byte>();
        int buffer = 0, bitsLeft = 0;
        foreach (var c in encoded.ToUpper())
        {
            var val = chars.IndexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) { bitsLeft -= 8; output.Add((byte)(buffer >> bitsLeft)); }
        }
        return output.ToArray();
    }
}
