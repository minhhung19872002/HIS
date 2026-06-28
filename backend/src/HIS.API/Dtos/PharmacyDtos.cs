using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Data;
using HIS.API.Controllers;

namespace HIS.API.Dtos.Pharmacy;

    public class RejectRequest
    {
        public string? Reason { get; set; }
    }

    public class DispenseUpdateRequest
    {
        public decimal Quantity { get; set; }
        public string? BatchNumber { get; set; }
    }

    public class CreateTransferRequest
    {
        public string FromWarehouse { get; set; } = string.Empty;
        public string ToWarehouse { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class CancelDispenseRequest
    {
        public string? Reason { get; set; }
    }

    public class CreateAdrReportRequest
    {
        public string? PatientName { get; set; }
        public string? PatientCode { get; set; }
        public string? MedicationName { get; set; }
        public string? ReactionType { get; set; }
        public string? Severity { get; set; }
        public string? OnsetDate { get; set; }
        public string? Description { get; set; }
        public string? Outcome { get; set; }
    }

