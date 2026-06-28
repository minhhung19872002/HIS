using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;
using WaitingPhaseAnalysisDto = HIS.Application.DTOs.Reception.WaitingPhaseAnalysisDto;
using HIS.API.Controllers;

namespace HIS.API.Dtos.ReceptionComplete;

    public class SaveFingerprintRequest
    {
        public string? FingerprintData { get; set; }
        public bool NotCollected { get; set; }
    }

public class CallNextRequestDto
{
    public Guid RoomId { get; set; }
    public int QueueType { get; set; }
}

public class SkipReasonDto
{
    public string? Reason { get; set; }
}

public class QRCodeDto
{
    public string QRData { get; set; } = string.Empty;
}

public class BlockInsuranceRequestDto
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public int Reason { get; set; }
    public string? Notes { get; set; }
}

public class QuickRegisterByCodeDto
{
    public string PatientCode { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class QuickRegisterByAppointmentDto
{
    public string AppointmentCode { get; set; } = string.Empty;
}

public class QuickRegisterByIdentityDto
{
    public string IdentityNumber { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class QuickRegisterByPhoneDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
    public int ServiceType { get; set; }
}

public class SmartCardRegistrationDto
{
    public string CardData { get; set; } = string.Empty;
    public Guid RoomId { get; set; }
}

public class SmartCardReadDto
{
    public string CardData { get; set; } = string.Empty;
}

public class ChangeRoomRequestDto
{
    public Guid NewRoomId { get; set; }
    public Guid? NewDoctorId { get; set; }
    public string? Reason { get; set; }
}

public class EmergencyDepositDto
{
    public decimal Amount { get; set; }
}

