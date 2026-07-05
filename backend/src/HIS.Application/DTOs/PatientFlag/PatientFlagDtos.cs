namespace HIS.Application.DTOs.PatientFlag;

public record PatientFlagDto(
    Guid Id, Guid PatientId, int FlagType, string FlagTypeName,
    string Color, string Note, bool IsActive, DateTime? ExpiresAt,
    DateTime CreatedAt, string? CreatedByName);

public record SavePatientFlagDto(
    Guid? Id, Guid PatientId, int FlagType, string Color, string Note, DateTime? ExpiresAt);
