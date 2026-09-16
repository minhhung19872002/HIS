namespace HIS.Infrastructure.Services;

/// <summary>
/// QA round 4 (2026-09-16): every catalog "save" accepted an empty body and either wrote a blank row
/// (Code = '' / Name = '') or hit a unique index / FK and surfaced as a bare 500. The guards below throw
/// ArgumentException / InvalidOperationException / KeyNotFoundException, which the global
/// DomainGuardExceptionFilter maps to 400 / 400 / 404 with the Vietnamese reason.
/// </summary>
internal static class CatalogGuard
{
    /// <summary>Trimmed (code, name); throws when either is blank.</summary>
    public static (string Code, string Name) RequireCodeName(string? code, string? name, string what = "danh mục")
    {
        var c = code?.Trim();
        var n = name?.Trim();
        if (string.IsNullOrEmpty(c)) throw new ArgumentException($"Mã {what} là bắt buộc.");
        if (string.IsNullOrEmpty(n)) throw new ArgumentException($"Tên {what} là bắt buộc.");
        return (c, n);
    }

    public static string RequireText(string? value, string label)
    {
        var v = value?.Trim();
        if (string.IsNullOrEmpty(v)) throw new ArgumentException($"{label} là bắt buộc.");
        return v;
    }

    public static Guid RequireId(Guid? id, string label)
    {
        if (id is null || id == Guid.Empty) throw new ArgumentException($"{label} là bắt buộc.");
        return id.Value;
    }

    public static InvalidOperationException Duplicate(string code, string what = "danh mục")
        => new($"Mã {code} đã tồn tại trong {what}.");

    public static KeyNotFoundException NotFound(string what)
        => new($"Không tìm thấy {what}.");
}
