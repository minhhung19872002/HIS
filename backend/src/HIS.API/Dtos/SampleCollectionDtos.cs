using System.Security.Claims;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.SampleCollection;

    public record AssignSequenceDto(Guid ServiceRequestDetailId, string? PreferredPrefix);

    public record AssignSequenceResultDto(string SampleBarcode, int SequenceNumber);

    public record AddTestsToSampleDto(string ExistingBarcode, List<Guid> AdditionalDetailIds);

    public record AddTestsResultDto(int Added, string Barcode);

    public record UpdateSequenceDto(Guid ServiceRequestDetailId, int NewSequenceNumber, string? Prefix);

    public record CreateAppointmentDto(
        Guid PatientId,
        DateTime AppointmentAt,
        string RecurrenceType,   // None / Daily / Weekly / Monthly
        int RecurrenceCount,
        string? ServiceName,
        string? Note,
        Guid? ServiceRequestDetailId);

    public record UpdateAppointmentDto(string Status, string? Note);

