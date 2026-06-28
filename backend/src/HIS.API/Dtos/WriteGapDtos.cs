using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using HIS.API.Controllers;

namespace HIS.API.Dtos.WriteGap;

public record StoreSampleDto(Guid SampleId, string Location);

public record RetrieveSampleDto(Guid SampleId);

public record RejectSampleDto(Guid SampleId, string Reason);

public record UndoRejectDto(Guid SampleId);

public record InvestigateHaiDto(string? RootCause, string? ContributingFactors, string? PreventiveMeasures);

public record CloseHaiDto(string? Outcome, string? Notes);

public record SaveArchiveDto(Guid? Id, Guid MedicalRecordId, Guid PatientId, string? StorageLocation, string? ShelfNumber, string? BoxNumber);

public record CreateInterHospitalDto(string? RequestType, string? RequestingFacility, string? ReceivingFacility, int Urgency, string? RequestDetails);

public record BorrowRecordDto(Guid ArchiveId, string? Reason);

public record ReturnArchiveDto(Guid ArchiveId);

public record DoctorScheduleDto(Guid DoctorId, Guid? DepartmentId, DateTime Date, int ShiftType, Guid? RoomId, string? Notes);

public record CreateBhxhAuditDto(int PeriodMonth, int PeriodYear, string? Notes);

