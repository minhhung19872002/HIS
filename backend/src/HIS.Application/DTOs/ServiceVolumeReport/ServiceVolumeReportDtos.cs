namespace HIS.Application.DTOs.ServiceVolumeReport;

    public record RoomServiceVolumeDto(
        Guid RoomId,
        string RoomCode,
        string RoomName,
        int RoomType,
        int ServiceCount);
