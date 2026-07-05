using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Sổ hội chẩn + trích biên bản (N1.20) — tách khỏi ConsultationRegisterController (#202 thin-controller).
/// </summary>
public interface IConsultationRegisterService
{
    Task<ServiceOutcome> SearchAsync(
        DateTime? fromDate, DateTime? toDate,
        int? consultationType, string? keyword, Guid? departmentId);

    Task<ServiceOutcome> GetByIdAsync(Guid id);
}
