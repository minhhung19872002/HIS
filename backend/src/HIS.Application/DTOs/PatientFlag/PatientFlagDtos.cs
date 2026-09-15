namespace HIS.Application.DTOs.PatientFlag;

public record PatientFlagDto(
    Guid Id, Guid PatientId, int FlagType, string FlagTypeName,
    string Color, string Note, bool IsActive,
    [property: global::System.Text.Json.Serialization.JsonConverter(typeof(global::HIS.Application.Common.NullableUtcDateTimeJsonConverter))]
    DateTime? ExpiresAt,
    DateTime CreatedAt, string? CreatedByName);

public record SavePatientFlagDto(
    Guid? Id, Guid PatientId, int FlagType, string Color, string Note,
    // PatientFlags.ExpiresAt is UTC (compared with DateTime.UtcNow) → opt out of the global VN-local converter.
    [property: global::System.Text.Json.Serialization.JsonConverter(typeof(global::HIS.Application.Common.NullableUtcDateTimeJsonConverter))]
    DateTime? ExpiresAt);
