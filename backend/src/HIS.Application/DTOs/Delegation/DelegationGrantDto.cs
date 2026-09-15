namespace HIS.Application.DTOs.Delegation;

// AUTHZ-4 (#370) — admin CRUD for DelegationGrant (additive, kill-switch OFF).

public record DelegationGrantDto(
    Guid Id,
    Guid GrantorId,
    string GrantorName,
    Guid GranteeId,
    string GranteeName,
    Guid RoleId,
    string RoleName,
    DateTime ValidFrom,
    DateTime ValidTo,
    string? Reason,
    int Status,
    string StatusText,
    DateTime? RevokedAt,
    string? RevokedBy,
    DateTime CreatedAt
);

// ValidFrom/ValidTo are UTC (DelegationService compares with DateTime.UtcNow) → opt out of the global VN-local converter.
public record CreateDelegationGrantDto(
    Guid GranteeId,
    Guid RoleId,
    [property: global::System.Text.Json.Serialization.JsonConverter(typeof(global::HIS.Application.Common.UtcDateTimeJsonConverter))]
    DateTime ValidFrom,
    [property: global::System.Text.Json.Serialization.JsonConverter(typeof(global::HIS.Application.Common.UtcDateTimeJsonConverter))]
    DateTime ValidTo,
    string? Reason
);
