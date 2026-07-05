using HIS.Application.Common;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// Logic mẫu tường trình lâm sàng — tách khỏi ClinicalNarrativeController (#202 thin-controller).
/// Surgery narrative templates / Outpatient record templates.
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IClinicalNarrativeService
{
    // Surgery Narrative Templates
    Task<ServiceOutcome> GetSurgeryNarrativesAsync(Guid? departmentId, Guid? surgeryServiceId, string? keyword);
    Task<ServiceOutcome> GetSurgeryNarrativeAsync(Guid id);
    Task<ServiceOutcome> SaveSurgeryNarrativeAsync(SurgeryNarrativeTemplate dto, Guid userId);
    Task<ServiceOutcome> DeleteSurgeryNarrativeAsync(Guid id, Guid userId);

    // Outpatient Record Templates
    Task<ServiceOutcome> GetOutpatientRecordsAsync(Guid? departmentId, string? diagnosisCode, string? keyword);
    Task<ServiceOutcome> GetOutpatientRecordAsync(Guid id);
    Task<ServiceOutcome> SaveOutpatientRecordAsync(OutpatientRecordTemplate dto, Guid userId);
    Task<ServiceOutcome> DeleteOutpatientRecordAsync(Guid id, Guid userId);
}
