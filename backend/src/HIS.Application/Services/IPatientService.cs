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

    /// <summary>
    /// Với mỗi id đã bị GHÉP vào hồ sơ khác: hồ sơ còn lại cuối chuỗi ghép. Id chưa từng ghép thì
    /// không có trong kết quả. Dùng cho hệ thống ngoài giữ id bệnh nhân (app hỗ trợ người bệnh).
    /// </summary>
    Task<List<PatientMergeSuccessorDto>> GetMergeSuccessorsAsync(IReadOnlyCollection<Guid> patientIds);
}

public class PatientMergeSuccessorDto
{
    public Guid PatientId { get; set; }
    public Guid CurrentPatientId { get; set; }
    public string CurrentPatientCode { get; set; } = string.Empty;
    public string CurrentFullName { get; set; } = string.Empty;
}
