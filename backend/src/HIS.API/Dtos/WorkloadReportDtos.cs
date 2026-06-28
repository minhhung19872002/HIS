using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.WorkloadReport;

    public record DoctorWorkloadDto(
        Guid UserId,
        string FullName,
        int ExaminationCount,
        int PrescriptionCount,
        int ServiceRequestCount);

    public record RadiologistWorkloadDto(
        Guid UserId,
        string FullName,
        int StudiesRequested,
        int StudiesPerformedAsTech,
        int ReportsApproved);

    public record TechnicianWorkloadDto(
        Guid UserId,
        string FullName,
        int LabRequestsOrdered);

    public record WorkloadReportDto(
        DateTime FromDate,
        DateTime ToDate,
        IReadOnlyList<DoctorWorkloadDto> Doctors,
        IReadOnlyList<RadiologistWorkloadDto> Radiologists,
        IReadOnlyList<TechnicianWorkloadDto> Technicians);

