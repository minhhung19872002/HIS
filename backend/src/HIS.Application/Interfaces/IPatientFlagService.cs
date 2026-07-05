using HIS.Application.Common;
using HIS.Application.DTOs.PatientFlag;

namespace HIS.Application.Interfaces;

/// <summary>
/// Cờ cảnh báo bệnh nhân — tách khỏi PatientFlagController (#202 thin-controller).
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IPatientFlagService
{
    Task<ServiceOutcome> ByPatientAsync(Guid patientId);
    Task<ServiceOutcome> SaveAsync(SavePatientFlagDto dto, Guid userId);
    Task<ServiceOutcome> DeleteAsync(Guid id, Guid userId);
}
