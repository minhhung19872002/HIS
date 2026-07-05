namespace HIS.Application.DTOs.StudyShare;

public record CreateShareDto(
    string StudyInstanceUID,
    string? OrthancStudyId,
    Guid? PatientId,
    string? Password,
    bool HideDemographics,
    int? ExpiresInMinutes,
    int? MaxViews);

public record ShareLinkDto(
    Guid Id,
    string Token,
    string Url,
    string StudyInstanceUID,
    bool HasPassword,
    bool HideDemographics,
    DateTime? ExpiresAt,
    int? MaxViews,
    int ViewCount,
    DateTime CreatedAt,
    bool IsRevoked);

public record RevokeDto(string? Reason);

public record AccessDto(string? Password);

public record AccessResultDto(
    string StudyInstanceUID,
    string? OrthancStudyId,
    bool HideDemographics,
    string? PatientName,
    string? PatientCode,
    DateTime? ExpiresAt,
    bool RequiresPassword);
