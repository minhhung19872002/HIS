namespace HIS.Application.DTOs.RadiologyDispatch;

public record CreateDispatchDto(
    Guid ServiceRequestDetailId,
    Guid RoomId,
    int? Priority,
    string? Note);

public record SavePermissionDto(
    Guid UserId,
    Guid? RoomId,
    /// <summary>G-36: FK sang RadiologyModalities.Id — null = áp dụng mọi loại máy</summary>
    Guid? ModalityId,
    string? ModalityType,
    int Permissions,
    string? RoleTemplate);
