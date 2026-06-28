using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Infrastructure.Data;
using RoomDto = HIS.Application.DTOs.RoomDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Controllers;

namespace HIS.API.Dtos.ExaminationComplete;

public class UpdatePhotoRequest
{
    public string PhotoBase64 { get; set; } = string.Empty;
}

public class SaveAsTemplateRequest
{
    public string TemplateName { get; set; } = string.Empty;
}

public class CancelReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class UnlockReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class RevertReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SignatureRequest
{
    public string Signature { get; set; } = string.Empty;
}

public class SendNotificationRequest
{
    public string Channel { get; set; } = string.Empty; // sms, zalo, email
}

/// <summary>EMR record-centric row (per patient) — bệnh nền + dị ứng.</summary>
public class EmrRecordDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public int? Age { get; set; }
    public string? InsuranceNumber { get; set; }
    /// <summary>MedicalRecordId của lượt khám mới nhất — dùng để gọi pdf/medical-record/{id}.</summary>
    public Guid? MedicalRecordId { get; set; }
    public int VisitCount { get; set; }
    public DateTime LastVisit { get; set; }
    public string? LastDiagnosisName { get; set; }
    public string? LastDiagnosisCode { get; set; }
    public string? LastRoomName { get; set; }
    public List<string> ChronicDiseases { get; set; } = new();
    public List<string> Allergies { get; set; } = new();
}

