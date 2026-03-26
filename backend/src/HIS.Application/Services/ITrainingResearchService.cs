using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ITrainingResearchService
{
    // Classes
    Task<List<TrainingClassListDto>> GetClassesAsync(TrainingClassSearchDto filter);
    Task<TrainingClassDetailDto?> GetClassByIdAsync(Guid id);
    Task<TrainingClassDetailDto> SaveClassAsync(Guid? id, SaveTrainingClassDto dto);
    Task<List<TrainingStudentDto>> GetClassStudentsAsync(Guid classId);

    // Students
    Task<TrainingStudentDto> EnrollStudentAsync(EnrollStudentDto dto);
    Task<TrainingStudentDto> UpdateStudentStatusAsync(Guid studentId, UpdateStudentStatusDto dto);
    Task<TrainingStudentDto> IssueCertificateAsync(Guid studentId, IssueCertificateDto dto);

    // Clinical Direction
    Task<List<ClinicalDirectionListDto>> GetDirectionsAsync(ClinicalDirectionSearchDto filter);
    Task<ClinicalDirectionDetailDto?> GetDirectionByIdAsync(Guid id);
    Task<ClinicalDirectionDetailDto> SaveDirectionAsync(Guid? id, SaveClinicalDirectionDto dto);

    // Research
    Task<List<ResearchProjectListDto>> GetProjectsAsync(ResearchProjectSearchDto filter);
    Task<ResearchProjectDetailDto?> GetProjectByIdAsync(Guid id);
    Task<ResearchProjectDetailDto> SaveProjectAsync(Guid? id, SaveResearchProjectDto dto);

    // Dashboard & Stats
    Task<TrainingDashboardDto> GetDashboardAsync();
    Task<List<CreditSummaryDto>> GetCreditSummaryAsync();
}
