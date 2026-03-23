using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IMentalHealthService
{
    Task<List<MentalHealthCaseDto>> SearchCasesAsync(MentalHealthCaseSearchDto? filter = null);
    Task<MentalHealthCaseDetailDto?> GetByIdAsync(Guid id);
    Task<MentalHealthCaseDto> CreateCaseAsync(CreateMentalHealthCaseDto dto);
    Task<MentalHealthCaseDto> UpdateCaseAsync(Guid id, CreateMentalHealthCaseDto dto);
    Task<PsychiatricAssessmentDto> AddAssessmentAsync(CreatePsychiatricAssessmentDto dto);
    Task<List<PsychiatricAssessmentDto>> GetAssessmentsAsync(Guid caseId);
    Task<MentalHealthStatsDto> GetStatsAsync();
    Task<List<MentalHealthCaseDto>> GetOverdueFollowUpsAsync();
    Task<ScreeningResultDto> ScreenDepressionAsync(Guid caseId, int phq9Score);
}
