namespace HIS.Application.Services;

// ============================================================
// Module 1: IFollowUpService
// ============================================================

public interface IFollowUpService
{
    Task<FollowUpPagedResult> GetFollowUpsAsync(FollowUpSearchDto filter);
    Task<List<FollowUpListDto>> GetTodayFollowUpsAsync();
    Task<List<FollowUpListDto>> GetOverdueFollowUpsAsync();
    Task<FollowUpListDto> CreateFollowUpAsync(CreateFollowUpDto dto);
    Task<FollowUpListDto> UpdateStatusAsync(Guid id, UpdateFollowUpDto dto);
    Task SendReminderAsync(Guid id);
}

// ============================================================
// Module 2: IProcurementService
// ============================================================

public interface IProcurementService
{
    Task<ProcurementPagedResult> GetRequestsAsync(ProcurementSearchDto filter);
    Task<ProcurementDetailDto?> GetByIdAsync(Guid id);
    Task<ProcurementDetailDto> CreateAsync(CreateProcurementDto dto);
    Task<ProcurementListDto> ApproveAsync(Guid id);
    Task<ProcurementListDto> RejectAsync(Guid id, string? reason);
    Task<List<AutoSuggestionDto>> GetAutoSuggestionsAsync();
    Task<ProcurementStatisticsDto> GetStatisticsAsync();
}

// ============================================================
// Module 3: IImmunizationService
// ============================================================

public interface IImmunizationService
{
    Task<ImmunizationPagedResult> GetRecordsAsync(ImmunizationSearchDto filter);
    Task<ImmunizationScheduleDto> GetPatientScheduleAsync(Guid patientId);
    Task<ImmunizationListDto> AdministerAsync(CreateImmunizationDto dto);
    Task<ImmunizationListDto> RecordReactionAsync(Guid id, RecordReactionDto dto);
    Task<ImmunizationStatisticsDto> GetStatisticsAsync();
    Task<List<ImmunizationListDto>> GetOverdueAsync();
}

// ============================================================
// Module 4: IHealthCheckupService
// ============================================================

public interface IHealthCheckupService
{
    Task<CampaignPagedResult> GetCampaignsAsync(CampaignSearchDto filter);
    Task<CampaignListDto> CreateCampaignAsync(CreateCampaignDto dto);
    Task<List<CheckupRecordDto>> GetRecordsByCampaignAsync(Guid campaignId);
    Task<CheckupRecordDto> CreateRecordAsync(CreateCheckupRecordDto dto);
    Task<CheckupRecordDto> IssueCertificateAsync(Guid recordId);
    Task<CheckupStatisticsDto> GetStatisticsAsync();
    Task<CheckupDashboardDto> GetDashboardAsync();
}

// ============================================================
// Module 5: IEpidemiologyService
// ============================================================

public interface IEpidemiologyService
{
    Task<DiseaseCasePagedResult> GetCasesAsync(DiseaseCaseSearchDto filter);
    Task<DiseaseCaseListDto> CreateCaseAsync(CreateDiseaseCaseDto dto);
    Task<DiseaseCaseListDto> UpdateCaseAsync(Guid id, UpdateDiseaseCaseDto dto);
    Task<List<ContactTraceDto>> AddContactTraceAsync(Guid caseId, CreateContactTraceDto dto);
    Task<List<ContactTraceDto>> GetContactsByCaseIdAsync(Guid caseId);
    Task<EpidemiologyDashboardDto> GetDashboardAsync();
    Task<List<OutbreakSummaryDto>> GetOutbreaksAsync();
}
