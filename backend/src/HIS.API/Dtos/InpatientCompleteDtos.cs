using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Controllers;

namespace HIS.API.Dtos.InpatientComplete;

public class CompleteSpecialtyConsultRequest
{
    public string Result { get; set; } = string.Empty;
    public string? Recommendations { get; set; }
}

public class RegisterSharedBedRequest
{
    public Guid AdmissionId { get; set; }
    public Guid BedId { get; set; }
}

public class OrderByTemplateRequest
{
    public Guid AdmissionId { get; set; }
    public Guid TemplateId { get; set; }
}

public class OrderByPackageRequest
{
    public Guid AdmissionId { get; set; }
    public Guid PackageId { get; set; }
}

public class CheckServiceWarningsRequest
{
    public Guid AdmissionId { get; set; }
    public List<CreateInpatientServiceItemDto> Items { get; set; } = new();
}

public class CheckPrescriptionWarningsRequest
{
    public Guid AdmissionId { get; set; }
    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();
}

public class EmergencyCabinetPrescriptionRequest
{
    public Guid AdmissionId { get; set; }
    public Guid CabinetId { get; set; }
    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();
}

public class PrescribeByTemplateRequest
{
    public Guid AdmissionId { get; set; }
    public Guid TemplateId { get; set; }
}

public class CreateMedicineOrderSummaryRequest
{
    public Guid DepartmentId { get; set; }
    public DateTime Date { get; set; }
    public Guid? RoomId { get; set; }
    public Guid WarehouseId { get; set; }
}

public class CompleteConsultationRequest
{
    public string Conclusion { get; set; } = string.Empty;
    public string? Treatment { get; set; }
}

public class CreateDrugReactionRequest
{
    public Guid AdmissionId { get; set; }
    public Guid? MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string Symptoms { get; set; } = string.Empty;
    public string? Treatment { get; set; }
}

public class DischargeNewbornRequest
{
    public DateTime DischargeDate { get; set; }
}

