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

public record CreateDelegationGrantDto(
    Guid GranteeId,
    Guid RoleId,
    DateTime ValidFrom,
    DateTime ValidTo,
    string? Reason
);
