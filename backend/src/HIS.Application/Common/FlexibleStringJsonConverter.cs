using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HIS.Application.Common;

/// <summary>
/// Nhận cả JSON string LẪN number cho property string — System.Text.Json strict từng làm
/// caller gửi số (vd paymentMethod: 1 thay vì "1") vỡ deserialize → dto null →
/// 400 "The dto field is required" (bug thu tiền prod 2026-06-12).
/// Gắn per-property: [JsonConverter(typeof(FlexibleStringJsonConverter))].
/// </summary>
public sealed class FlexibleStringJsonConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.TryGetInt64(out var l)
                ? l.ToString(CultureInfo.InvariantCulture)
                : reader.GetDouble().ToString(CultureInfo.InvariantCulture),
            JsonTokenType.True => "true",
            JsonTokenType.False => "false",
            JsonTokenType.Null => null,
            _ => throw new JsonException($"Không đọc được string từ token {reader.TokenType}"),
        };

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteStringValue(value);
    }
}
