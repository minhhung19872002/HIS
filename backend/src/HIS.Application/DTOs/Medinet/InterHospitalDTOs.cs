using System.ComponentModel.DataAnnotations;

namespace HIS.Application.DTOs;

// ========================
// Module 10: Chia sẻ dữ liệu liên viện (Inter-Hospital Sharing)
// ========================

public class InterHospitalRequestSearchDto
{
    public string? Keyword { get; set; }
    public string? RequestType { get; set; }
    public int? Status { get; set; }
    public string? Urgency { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public string? Direction { get; set; }
}

public class InterHospitalRequestDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    /// <summary>"outgoing" | "incoming"</summary>
    public string Direction { get; set; } = "outgoing";
    public string? RequestingFacility { get; set; }
    public string? ReceivingFacility { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string Urgency { get; set; } = "routine";
    public string? RequestDate { get; set; }
    public string? ResponseDate { get; set; }
    public int Status { get; set; }
    public string? RequestDetails { get; set; }
    public string? ResponseDetails { get; set; }
    public string? RequestedBy { get; set; }
    public string? RespondedBy { get; set; }
    public string? Notes { get; set; }
}

public class CreateInterHospitalRequestDto
{
    [Required]
    public string? RequestType { get; set; }
    /// <summary>"outgoing" (default) | "incoming" — an incoming request received from another facility.</summary>
    public string? Direction { get; set; }
    public string? RequestingFacility { get; set; }
    public string? ReceivingFacility { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? Urgency { get; set; }
    public string? RequestDetails { get; set; }
    public string? RequestedBy { get; set; }
    public string? Notes { get; set; }
}

public class RespondInterHospitalRequestDto
{
    public int? Status { get; set; } // 1=accepted, 2=in progress, 3=completed, 4=rejected
    public string? ResponseDetails { get; set; }
    public string? RespondedBy { get; set; }
    public string? Notes { get; set; }
}

public class InterHospitalStatsDto
{
    public int TotalRequests { get; set; }
    public int PendingCount { get; set; }
    public int AcceptedCount { get; set; }
    public int CompletedCount { get; set; }
    public int RejectedCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedToday { get; set; }
    public double AvgResponseTimeMinutes { get; set; }
    public List<InterHospitalRequestTypeBreakdownDto> RequestTypeBreakdown { get; set; } = new();
    public List<InterHospitalUrgencyBreakdownDto> UrgencyBreakdown { get; set; } = new();
}

public class InterHospitalRequestTypeBreakdownDto
{
    public string RequestType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class InterHospitalUrgencyBreakdownDto
{
    public string Urgency { get; set; } = string.Empty;
    public int Count { get; set; }
}
