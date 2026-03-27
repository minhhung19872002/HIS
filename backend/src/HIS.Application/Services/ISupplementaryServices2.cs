using HIS.Core.Entities;

namespace HIS.Application.Services;

// ============================================================
// Module 6: ISchoolHealthService
// ============================================================

public interface ISchoolHealthService
{
    Task<SchoolHealthPagedResult> GetRecordsAsync(SchoolHealthSearchDto2 filter);
    Task<SchoolHealthListDto> CreateAsync(CreateSchoolHealthDto2 dto);
    Task<SchoolHealthListDto> UpdateAsync(Guid id, CreateSchoolHealthDto2 dto);
    Task<SchoolHealthStatisticsDto2> GetStatisticsBySchoolAsync(string? schoolName = null);
    Task<SchoolHealthPagedResult> GetReferralsAsync(int pageIndex = 0, int pageSize = 20);
}

// ============================================================
// Module 7: IOccupationalHealthService
// ============================================================

public interface IOccupationalHealthService
{
    Task<OccHealthPagedResult> GetRecordsAsync(OccHealthSearchDto2 filter);
    Task<OccHealthListDto> CreateAsync(CreateOccHealthDto2 dto);
    Task<OccHealthListDto> UpdateAsync(Guid id, CreateOccHealthDto2 dto);
    Task<OccHealthStatisticsDto2> GetStatisticsAsync();
    Task<List<OccHealthDiseaseReportDto>> GetDiseaseReportAsync();
}

// ============================================================
// Module 8: IMethadoneTreatmentService
// ============================================================

public interface IMethadoneTreatmentService
{
    Task<MethadonePagedResult> GetPatientsAsync(MethadoneSearchDto2 filter);
    Task<MethadoneDetailDto2> EnrollAsync(CreateMethadoneDto2 dto);
    Task<DoseRecordDto2> RecordDoseAsync(CreateDoseRecordDto dto);
    Task<ScreeningDto2> RecordUrineScreeningAsync(CreateScreeningDto dto);
    Task<List<DoseRecordDto2>> GetDoseHistoryAsync(Guid methadonePatientId);
    Task<List<ScreeningDto2>> GetScreeningsAsync(Guid methadonePatientId);
    Task<MethadoneDetailDto2> UpdateStatusAsync(Guid methadonePatientId, UpdateMethadoneStatusDto dto);
    Task<MethadoneDashboardDto2> GetDashboardAsync();
}

// ============================================================
// Module 9: IBhxhAuditService
// ============================================================

public interface IBhxhAuditService
{
    Task<BhxhAuditPagedResult> GetSessionsAsync(BhxhAuditSearchDto filter);
    Task<BhxhAuditDetailDto> CreateSessionAsync(CreateAuditSessionDto dto);
    Task<BhxhAuditDetailDto> RunAuditAsync(Guid sessionId);
    Task<List<AuditErrorDto>> GetErrorsAsync(Guid sessionId);
    Task<AuditErrorDto> FixErrorAsync(Guid errorId, FixAuditErrorDto dto);
    Task<AuditDashboardDto> GetDashboardAsync();
    Task<byte[]> ExportSessionAsync(Guid sessionId);
    Task<BhxhAuditStatisticsDto> GetStatisticsAsync();
}
