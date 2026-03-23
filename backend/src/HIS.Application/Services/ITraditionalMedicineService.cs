using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ITraditionalMedicineService
{
    Task<List<TraditionalMedicineTreatmentDto>> SearchTreatmentsAsync(TraditionalMedicineSearchDto? filter = null);
    Task<TraditionalMedicineTreatmentDetailDto?> GetByIdAsync(Guid id);
    Task<TraditionalMedicineTreatmentDto> CreateTreatmentAsync(CreateTraditionalMedicineTreatmentDto dto);
    Task<TraditionalMedicineTreatmentDto> UpdateTreatmentAsync(Guid id, CreateTraditionalMedicineTreatmentDto dto);
    Task<HerbalPrescriptionDto> CreateHerbalPrescriptionAsync(CreateHerbalPrescriptionDto dto);
    Task<List<HerbalPrescriptionDto>> GetHerbalPrescriptionsAsync(Guid treatmentId);
    Task<TraditionalMedicineStatsDto> GetStatsAsync();
    Task<TraditionalMedicineTreatmentDto> CompleteTreatmentAsync(Guid id);
}
