namespace HIS.Application.DTOs.NonDicom;

public record CreateStudyDto(
    Guid ServiceRequestDetailId,
    Guid PatientId,
    string DeviceType,
    string? DeviceName,
    Guid? RoomId,
    string? Description);

public record UpdateStudyDto(string? Description, string? Findings, string? Conclusion, int? Status);
