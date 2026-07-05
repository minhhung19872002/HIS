using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Kiểm tra dược lâm sàng — N1.04 — tách khỏi ClinicalPharmacyController (#202 thin-controller).
/// Chỉ PatientSummary được tách; ImportDrugInteractionsCsv giữ nguyên trong controller (IFormFile).
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IClinicalPharmacyService
{
    Task<ServiceOutcome> PatientSummaryAsync(Guid patientId);
}
