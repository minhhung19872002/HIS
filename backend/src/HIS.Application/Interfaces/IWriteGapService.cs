using HIS.Application.Common;
using HIS.Application.DTOs.WriteGap;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// WriteGap — 9 tiểu module (sample storage/tracking, epidemiology, infection control, archive,
/// inter-hospital, record planning, booking, BHXH audit), tách khỏi WriteGapController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/business math/Vietnamese strings giữ nguyên;
/// userId truyền từ controller (thay cho Uid() cũ đọc claim).
/// </summary>
public interface IWriteGapService
{
    Task<ServiceOutcome> StoreSampleAsync(StoreSampleDto dto, Guid userId);
    Task<ServiceOutcome> RetrieveSampleAsync(RetrieveSampleDto dto, Guid userId);
    Task<ServiceOutcome> RejectSampleAsync(RejectSampleDto dto, Guid userId);
    Task<ServiceOutcome> UndoRejectSampleAsync(UndoRejectDto dto, Guid userId);
    Task<ServiceOutcome> CreateDiseaseReportAsync(DiseaseReport dto, Guid userId);
    Task<ServiceOutcome> InvestigateHAIAsync(Guid id, InvestigateHaiDto dto, Guid userId);
    Task<ServiceOutcome> CloseHAIAsync(Guid id, CloseHaiDto dto, Guid userId);
    Task<ServiceOutcome> SaveArchiveAsync(SaveArchiveDto dto, Guid userId);
    Task<ServiceOutcome> CreateInterHospitalRequestAsync(CreateInterHospitalDto dto, Guid userId);
    Task<ServiceOutcome> BorrowRecordAsync(BorrowRecordDto dto, Guid userId);
    Task<ServiceOutcome> ReturnRecordAsync(ReturnArchiveDto dto, Guid userId);
    Task<ServiceOutcome> SaveDoctorScheduleAsync(DoctorScheduleDto dto, Guid userId);
    Task<ServiceOutcome> GetDoctorSchedulesAsync(Guid? doctorId, Guid? departmentId, DateTime? fromDate, DateTime? toDate);
    Task<ServiceOutcome> CreateAuditSessionAsync(CreateBhxhAuditDto dto, Guid userId);
}
