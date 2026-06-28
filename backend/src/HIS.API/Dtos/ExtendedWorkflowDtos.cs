using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Telemedicine;
using HIS.Application.DTOs.Nutrition;
using HIS.Application.DTOs.InfectionControl;
using HIS.Application.DTOs.Rehabilitation;
using HIS.Application.DTOs.Equipment;
using HIS.Application.DTOs.MedicalHR;
using HIS.Application.DTOs.QualityManagement;
using HIS.Application.DTOs.PatientPortal;
using HIS.Application.DTOs.HealthExchange;
using HIS.Application.DTOs.MassCasualty;
using HIS.API.Controllers;

namespace HIS.API.Dtos.ExtendedWorkflow;

    public class CreateTelePrescriptionRequest
    {
        public Guid SessionId { get; set; }
        public List<TelePrescriptionItemDto>? Items { get; set; }
        public string? Note { get; set; }
    }

    public class GenerateMealPlanRequest { public DateTime Date { get; set; } public string? MealType { get; set; } public Guid? DepartmentId { get; set; } }

    public class MarkMealDeliveredRequest { public Guid DietOrderId { get; set; } public DateTime Date { get; set; } public string? MealType { get; set; } }

    public class ReviewAntibioticRequest { public string? Outcome { get; set; } public string? Notes { get; set; } }

    // NangCap12 request DTOs for Rehabilitation
    public class RejectReferralRequest { public string Reason { get; set; } = string.Empty; }

    public class GoalProgressRequest { public decimal ProgressPercent { get; set; } public string Notes { get; set; } = string.Empty; }

    public class ScheduleSessionRequest { public Guid PlanId { get; set; } public DateTime Date { get; set; } public TimeSpan Time { get; set; } public string Location { get; set; } = string.Empty; }

    public class CancelSessionRequest { public string Reason { get; set; } = string.Empty; }

    public class UpdateCorrectiveActionRequest { public string? Status { get; set; } public string? Notes { get; set; } }

        public class LinkPatientRecordRequestDto
        {
            public Guid AccountId { get; set; }
            public string? PatientCode { get; set; }
            public string? VerificationData { get; set; }
        }

