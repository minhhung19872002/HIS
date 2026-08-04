using System.Linq;
using System.Text.RegularExpressions;

namespace HIS.Core.Common;

/// <summary>
/// Rules for a Vietnamese health-insurance (BHYT) card number — Quyet dinh 1351/QD-BHXH.
/// Core card = 15 characters: 2 letters (subject group, e.g. DN/HS/TE) + 1 digit 1-5
/// (benefit level) + 2 digits (issuing province) + 10 digits (serial).
/// Reception may scan a 20-character string: the 15-character core plus a 5-digit
/// facility code (ma CSKCB) used to decide the referral route.
/// </summary>
public static class BhytCardNumber
{
    public const int CoreLength = 15;
    public const int ScannedLength = 20;

    /// <summary>Strip separators and upper-case. Returns an empty string for null/blank input.</summary>
    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var kept = raw.Where(c => !char.IsWhiteSpace(c) && c != '-' && c != '.' && c != '_').ToArray();
        return new string(kept).ToUpperInvariant();
    }

    /// <summary>
    /// Validate a card number. On failure <paramref name="error"/> carries a Vietnamese message
    /// meant for the reception clerk, so the caller can surface it as-is.
    /// </summary>
    public static bool TryValidate(string? raw, out string normalized, out string? error)
    {
        normalized = Normalize(raw);
        error = null;

        if (normalized.Length == 0)
        {
            error = "Số thẻ BHYT không được để trống";
            return false;
        }

        if (normalized.Length != CoreLength && normalized.Length != ScannedLength)
        {
            error = $"Số thẻ BHYT phải có {CoreLength} ký tự "
                  + $"(hoặc {ScannedLength} ký tự khi quét kèm mã CSKCB) — đang có {normalized.Length}";
            return false;
        }

        if (!char.IsLetter(normalized[0]) || !char.IsLetter(normalized[1]))
        {
            error = "2 ký tự đầu phải là chữ cái — mã đối tượng tham gia (VD: DN, HS, TE, HC)";
            return false;
        }

        if (normalized[2] < '1' || normalized[2] > '5')
        {
            error = "Ký tự thứ 3 phải là số từ 1 đến 5 — mức hưởng BHYT";
            return false;
        }

        if (!normalized.Skip(3).All(char.IsDigit))
        {
            error = "Từ ký tự thứ 4 trở đi phải là chữ số";
            return false;
        }

        if (normalized.Substring(3, 2) == "00")
        {
            error = "Mã tỉnh cấp thẻ (ký tự 4-5) không hợp lệ";
            return false;
        }

        return true;
    }

    private static readonly Regex CardPattern =
        new("[A-Z]{2}[1-5][0-9]{12}([0-9]{5})?", RegexOptions.Compiled);

    /// <summary>
    /// Pull the card block out of a scanned payload — a BHYT QR code, or a chip-ID QR that appends
    /// further fields. Filtering the payload down to digits would drop the two leading letters and
    /// leave a card number that can never be valid, so match the card shape instead.
    /// Falls back to the normalised payload when no card block is found, letting
    /// <see cref="TryValidate"/> produce the message.
    /// </summary>
    public static string ExtractFrom(string? raw)
    {
        var normalized = Normalize(raw);
        var match = CardPattern.Match(normalized);
        return match.Success ? match.Value : normalized;
    }

    /// <summary>The 15-character card itself, dropping any scanned facility-code suffix.</summary>
    public static string CoreOf(string normalized) =>
        normalized.Length >= CoreLength ? normalized.Substring(0, CoreLength) : normalized;

    /// <summary>The 5-digit ma CSKCB appended by a 20-character scan, or null for a plain card.</summary>
    public static string? FacilityCodeOf(string normalized) =>
        normalized.Length >= ScannedLength ? normalized.Substring(CoreLength, 5) : null;
}
