using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace HIS.Application.Common;

/// <summary>
/// Time convention (QA round 3): business timestamps are stored VN local and serialized without an
/// offset (the browser reads them as local = correct). Audit columns CreatedAt / UpdatedAt /
/// AuditLogs.Timestamp are stored UTC — serialized without "Z" the browser also read them as local,
/// i.e. 7 hours early. This converter writes such a value as UTC with a trailing "Z".
/// Unspecified kind (EF-materialized) = UTC; Local kind (a DateTime.Now not yet round-tripped) is
/// converted. Attach per property: [JsonConverter(typeof(UtcDateTimeJsonConverter))], or via
/// <see cref="UtcAuditJson.Modifier"/> for every CreatedAt/UpdatedAt property.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => UtcAuditJson.ToUtc(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(UtcAuditJson.ToUtc(value));
}

/// <summary>Nullable twin of <see cref="UtcDateTimeJsonConverter"/>.</summary>
public sealed class NullableUtcDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? null : UtcAuditJson.ToUtc(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteStringValue(UtcAuditJson.ToUtc(value.Value));
    }
}

/// <summary>
/// Global request-side counterpart: the SPA sends many dates via <c>toISOString()</c> ("…T17:00:00.000Z" for a
/// date picked as 16/09 VN). Stored as-is those land 7 hours early (often on the previous day) in VN-local
/// business columns. Any incoming value that carries an offset/Z is converted to VN wall-clock time
/// (Kind = Unspecified); offset-less values are kept. Writing is unchanged (default ISO format).
/// Properties with their own converter (UTC audit columns via <see cref="UtcAuditJson.Modifier"/>) are unaffected.
/// </summary>
public sealed class VnLocalDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => ToVnLocal(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);

    internal static DateTime ToVnLocal(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => HIS.Core.Common.VnTime.UtcToVn(value),
        DateTimeKind.Local => HIS.Core.Common.VnTime.UtcToVn(value.ToUniversalTime()),
        _ => value,
    };
}

/// <summary>Nullable twin of <see cref="VnLocalDateTimeJsonConverter"/>.</summary>
public sealed class NullableVnLocalDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? null : VnLocalDateTimeJsonConverter.ToVnLocal(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteStringValue(value.Value);
    }
}

/// <summary>
/// JSON contract modifier: every DateTime/DateTime? property named CreatedAt or UpdatedAt (the UTC
/// audit columns set by HISDbContext.SaveChangesAsync) is written with "Z". Targeted by name on
/// purpose — business DateTimes keep the default (no offset, VN local).
/// </summary>
public static class UtcAuditJson
{
    private static readonly UtcDateTimeJsonConverter Utc = new();
    private static readonly NullableUtcDateTimeJsonConverter NullableUtc = new();

    public static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    public static bool IsAuditName(string name) =>
        string.Equals(name, "CreatedAt", StringComparison.OrdinalIgnoreCase)
        || string.Equals(name, "UpdatedAt", StringComparison.OrdinalIgnoreCase);

    public static void Modifier(JsonTypeInfo typeInfo)
    {
        if (typeInfo.Kind != JsonTypeInfoKind.Object) return;
        foreach (var p in typeInfo.Properties)
        {
            if (p.CustomConverter != null || !IsAuditName(p.Name)) continue;
            if (p.PropertyType == typeof(DateTime)) p.CustomConverter = Utc;
            else if (p.PropertyType == typeof(DateTime?)) p.CustomConverter = NullableUtc;
        }
    }
}
