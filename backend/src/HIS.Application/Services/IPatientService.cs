using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IPatientService
{
    Task<PatientDto?> GetByIdAsync(Guid id);
    Task<PatientDto?> GetByCodeAsync(string patientCode);
    Task<PatientDto?> GetByIdentityNumberAsync(string identityNumber);
    Task<PatientDto?> GetByInsuranceNumberAsync(string insuranceNumber);
    Task<PagedResultDto<PatientDto>> SearchAsync(PatientSearchDto dto);
    Task<PatientDto> CreateAsync(CreatePatientDto dto);
    Task<PatientDto> UpdateAsync(UpdatePatientDto dto);
    Task DeleteAsync(Guid id);
    Task<string> GeneratePatientCodeAsync();
}
