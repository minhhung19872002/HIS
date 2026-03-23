using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IPublicHealthService
{
    // ===== Health Checkup (Khám sức khỏe) =====
    Task<List<HealthCheckupDto>> GetHealthCheckupsAsync(HealthCheckupSearchDto? filter = null);
    Task<HealthCheckupDetailDto?> GetHealthCheckupByIdAsync(Guid id);
    Task<HealthCheckupDto> CreateHealthCheckupAsync(CreateHealthCheckupDto dto);
    Task<HealthCheckupDto> UpdateHealthCheckupAsync(Guid id, UpdateHealthCheckupDto dto);
    Task DeleteHealthCheckupAsync(Guid id);
    Task<HealthCheckupStatsDto> GetHealthCheckupStatsAsync();

    // ===== Vaccination (Tiêm chủng) =====
    Task<List<VaccinationRecordDto>> GetVaccinationRecordsAsync(VaccinationSearchDto? filter = null);
    Task<VaccinationRecordDto?> GetVaccinationRecordByIdAsync(Guid id);
    Task<VaccinationRecordDto> RecordVaccinationAsync(CreateVaccinationRecordDto dto);
    Task<VaccinationRecordDto> UpdateVaccinationRecordAsync(Guid id, UpdateVaccinationRecordDto dto);
    Task DeleteVaccinationRecordAsync(Guid id);
    Task<List<VaccinationScheduleDto>> GetVaccinationScheduleAsync(Guid patientId);
    Task<List<VaccinationCampaignDto>> GetVaccinationCampaignsAsync();
    Task<VaccinationCampaignDto> CreateVaccinationCampaignAsync(CreateVaccinationCampaignDto dto);
    Task<VaccinationStatsDto> GetVaccinationStatsAsync();

    // ===== Disease Surveillance (Giám sát dịch tễ) =====
    Task<List<DiseaseReportDto>> GetDiseaseReportsAsync(DiseaseReportSearchDto? filter = null);
    Task<DiseaseReportDetailDto?> GetDiseaseReportByIdAsync(Guid id);
    Task<DiseaseReportDto> ReportDiseaseAsync(CreateDiseaseReportDto dto);
    Task<DiseaseReportDto> UpdateDiseaseReportAsync(Guid id, UpdateDiseaseReportDto dto);
    Task DeleteDiseaseReportAsync(Guid id);
    Task<List<OutbreakEventDto>> GetOutbreakEventsAsync();
    Task<OutbreakEventDto> CreateOutbreakEventAsync(CreateOutbreakEventDto dto);
    Task<OutbreakEventDto> UpdateOutbreakEventAsync(Guid id, UpdateOutbreakEventDto dto);
    Task<DiseaseStatsDto> GetDiseaseStatsAsync();

    // ===== School Health (Y tế trường học) =====
    Task<List<SchoolHealthExamDto>> GetSchoolHealthExamsAsync(SchoolHealthSearchDto? filter = null);
    Task<SchoolHealthExamDto?> GetSchoolHealthExamByIdAsync(Guid id);
    Task<SchoolHealthExamDto> CreateSchoolHealthExamAsync(CreateSchoolHealthExamDto dto);
    Task<SchoolHealthExamDto> UpdateSchoolHealthExamAsync(Guid id, UpdateSchoolHealthExamDto dto);
    Task DeleteSchoolHealthExamAsync(Guid id);
    Task<SchoolHealthStatsDto> GetSchoolHealthStatsAsync();

    // ===== Occupational Health (Sức khỏe nghề nghiệp) =====
    Task<List<OccupationalHealthExamDto>> GetOccupationalHealthExamsAsync(OccupationalHealthSearchDto? filter = null);
    Task<OccupationalHealthExamDto?> GetOccupationalHealthExamByIdAsync(Guid id);
    Task<OccupationalHealthExamDto> CreateOccupationalHealthExamAsync(CreateOccupationalHealthExamDto dto);
    Task<OccupationalHealthExamDto> UpdateOccupationalHealthExamAsync(Guid id, UpdateOccupationalHealthExamDto dto);
    Task DeleteOccupationalHealthExamAsync(Guid id);
    Task<OccupationalHealthStatsDto> GetOccupationalHealthStatsAsync();

    // ===== Methadone Treatment (Điều trị Methadone) =====
    Task<List<MethadonePatientDto>> GetMethadonePatientsAsync(MethadonePatientSearchDto? filter = null);
    Task<MethadonePatientDto?> GetMethadonePatientByIdAsync(Guid id);
    Task<MethadonePatientDto> CreateMethadonePatientAsync(CreateMethadonePatientDto dto);
    Task<MethadonePatientDto> UpdateMethadonePatientAsync(Guid id, UpdateMethadonePatientDto dto);
    Task<List<MethadoneDosingRecordDto>> GetDosingHistoryAsync(Guid methadonePatientId);
    Task<MethadoneDosingRecordDto> RecordDoseAsync(CreateMethadoneDosingDto dto);
    Task<List<MethadoneUrineTestDto>> GetUrineTestsAsync(Guid methadonePatientId);
    Task<MethadoneUrineTestDto> RecordUrineTestAsync(CreateMethadoneUrineTestDto dto);
    Task<MethadoneStatsDto> GetMethadoneStatsAsync();
}
