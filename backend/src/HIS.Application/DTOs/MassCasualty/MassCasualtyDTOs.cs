using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.MassCasualty
{
    #region MCI Event DTOs

    /// <summary>
    /// Sự kiện thảm họa/tai nạn hàng loạt
    /// </summary>
    public class MCIEventDto
    {
        public Guid Id { get; set; }
        public string EventCode { get; set; }
        public string EventName { get; set; }
        public string EventType { get; set; } // Accident, Natural, Industrial, Terrorism, Epidemic
        public string Description { get; set; }

        // Location
        public string Location { get; set; }
        public string Address { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? DistanceFromHospitalKm { get; set; }

        // Timeline
        public DateTime EventDateTime { get; set; }
        public DateTime NotifiedAt { get; set; }
        public DateTime ActivatedAt { get; set; }
        public DateTime? DeactivatedAt { get; set; }
        public int? DurationHours { get; set; }

        // Level
        public string AlertLevel { get; set; } // Yellow, Orange, Red
        public int EstimatedCasualties { get; set; }

        // Status
        public string Status { get; set; } // Active, Contained, Resolved
        public string Phase { get; set; } // Activation, Response, Recovery, Deactivation

        // Casualties Summary
        public int TotalVictims { get; set; }
        public int RedCategory { get; set; }
        public int YellowCategory { get; set; }
        public int GreenCategory { get; set; }
        public int BlackCategory { get; set; }
        public int Admitted { get; set; }
        public int Discharged { get; set; }
        public int Transferred { get; set; }
        public int Deceased { get; set; }

        // Resources
        public int StaffActivated { get; set; }
        public int BedsAllocated { get; set; }
        public int ORsActivated { get; set; }

        // Command
        public string IncidentCommander { get; set; }
        public string MedicalDirector { get; set; }
        public string TriageOfficer { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    /// <summary>
    /// Kích hoạt sự kiện MCI
    /// </summary>
    public class ActivateMCIEventDto
    {
        public string EventName { get; set; }
        public string EventType { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
        public string Address { get; set; }
        public DateTime EventDateTime { get; set; }
        public string AlertLevel { get; set; }
        public int EstimatedCasualties { get; set; }
    }

    /// <summary>
    /// Cập nhật trạng thái sự kiện
    /// </summary>
    public class UpdateMCIEventDto
    {
        public Guid EventId { get; set; }
        public string Status { get; set; }
        public string Phase { get; set; }
        public string AlertLevel { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region Triage DTOs

    /// <summary>
    /// Nạn nhân MCI
    /// </summary>
    public class MCIVictimDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public string TriageTag { get; set; } // Unique tag number
        public string VictimCode { get; set; }
        public int VictimNumber { get; set; }

        // Identity (may be unknown initially)
        public string IdentificationStatus { get; set; } // Identified, Unidentified, Partial
        public string Name { get; set; }
        public int? EstimatedAge { get; set; }
        public string Gender { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Description { get; set; } // Physical description if unidentified

        // Triage
        public string TriageCategory { get; set; } // Red, Yellow, Green, Black
        public string TriageMethod { get; set; } // START, JumpSTART, SALT
        public DateTime TriageTime { get; set; }
        public string TriageBy { get; set; }
        public string TriageLocation { get; set; } // Field, ER, Triage Area

        // Re-Triage History
        public List<TriageHistoryDto> TriageHistory { get; set; }

        // Injuries
        public string ChiefComplaint { get; set; }
        public List<InjuryDto> Injuries { get; set; }
        public string MechanismOfInjury { get; set; }

        // Vitals at Triage
        public string RespiratoryStatus { get; set; }
        public int? RespiratoryRate { get; set; }
        public string Pulse { get; set; }
        public string MentalStatus { get; set; }
        public bool? CanWalk { get; set; }

        // Treatment
        public string CurrentLocation { get; set; }
        public string CurrentArea { get; set; } // Red Zone, Yellow Zone, Green Zone
        public string AssignedTo { get; set; }
        public List<MCITreatmentDto> Treatments { get; set; }

        // Disposition
        public string Disposition { get; set; } // Admitted, Discharged, Transferred, Deceased, DAMA
        public Guid? AdmissionId { get; set; }
        public string WardAssigned { get; set; }
        public string TransferDestination { get; set; }
        public DateTime? DispositionTime { get; set; }

        // Family Contact
        public bool FamilyNotified { get; set; }
        public string FamilyContactName { get; set; }
        public string FamilyContactPhone { get; set; }
        public string Relationship { get; set; }

        // Status
        public string Status { get; set; } // Active, Treated, Disposed

        public DateTime ArrivedAt { get; set; }
        public DateTime RegisteredAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    public class TriageHistoryDto
    {
        public DateTime Time { get; set; }
        public string FromCategory { get; set; }
        public string ToCategory { get; set; }
        public string Reason { get; set; }
        public string By { get; set; }
    }

    public class InjuryDto
    {
        public string BodyPart { get; set; }
        public string InjuryType { get; set; }
        public string Severity { get; set; }
        public string Description { get; set; }
    }

    public class MCITreatmentDto
    {
        public DateTime Time { get; set; }
        public string Treatment { get; set; }
        public string PerformedBy { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Đăng ký nạn nhân mới
    /// </summary>
    public class RegisterMCIVictimDto
    {
        public Guid EventId { get; set; }
        public string Name { get; set; }
        public int? EstimatedAge { get; set; }
        public string Gender { get; set; }
        public string Description { get; set; }
        public string TriageCategory { get; set; }
        public string ChiefComplaint { get; set; }
        public string MechanismOfInjury { get; set; }
        public int? RespiratoryRate { get; set; }
        public string Pulse { get; set; }
        public string MentalStatus { get; set; }
        public bool? CanWalk { get; set; }
    }

    /// <summary>
    /// Re-Triage nạn nhân
    /// </summary>
    public class ReTriageDto
    {
        public Guid VictimId { get; set; }
        public string NewCategory { get; set; }
        public string Reason { get; set; }
        public string CurrentVitals { get; set; }
    }

    #endregion

    #region Resource Management DTOs

    /// <summary>
    /// Quản lý tài nguyên MCI
    /// </summary>
    public class MCIResourceStatusDto
    {
        public Guid EventId { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Beds
        public int TotalBeds { get; set; }
        public int AvailableBeds { get; set; }
        public int ICUBeds { get; set; }
        public int ICUAvailable { get; set; }
        public int SurgeryBeds { get; set; }
        public int SurgeryAvailable { get; set; }

        // Operating Rooms
        public int TotalORs { get; set; }
        public int ORsInUse { get; set; }
        public int ORsAvailable { get; set; }
        public int AvailableORs { get; set; }
        public int AvailableStaff { get; set; }

        // Blood
        public Dictionary<string, int> BloodInventory { get; set; } // Blood type -> units
        public bool BloodShortage { get; set; }

        // Staff
        public int DoctorsOnDuty { get; set; }
        public int NursesOnDuty { get; set; }
        public int SurgeonsOnDuty { get; set; }
        public int TechsOnDuty { get; set; }
        public int StaffCalled { get; set; }
        public int StaffResponded { get; set; }

        // Equipment
        public int VentilatorsTotal { get; set; }
        public int VentilatorsInUse { get; set; }
        public int MonitorsAvailable { get; set; }
        public int StretchersAvailable { get; set; }
        public int WheelchairsAvailable { get; set; }

        // Supplies
        public string MedicationStatus { get; set; } // Adequate, Low, Critical
        public string IVFluidsStatus { get; set; }
        public string SurgicalSuppliesStatus { get; set; }

        // Ambulances
        public int AmbulancesDispatched { get; set; }
        public int AmbulancesReturned { get; set; }
    }

    /// <summary>
    /// Huy động nhân sự
    /// </summary>
    public class StaffCalloutDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public DateTime CalloutTime { get; set; }
        public DateTime InitiatedAt { get; set; }
        public string CalloutType { get; set; } // SMS, Call, App
        public int TotalStaffCalled { get; set; }
        public int TotalNotified { get; set; }
        public int Responded { get; set; }
        public int Confirmed { get; set; }
        public int Declined { get; set; }
        public int NoResponse { get; set; }
        public List<StaffCalloutResponseDto> Responses { get; set; }
    }

    public class StaffCalloutResponseDto
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public string StaffType { get; set; }
        public string Department { get; set; }
        public string Response { get; set; } // Confirmed, Declined, NoResponse
        public DateTime? RespondedAt { get; set; }
        public int? ETAMinutes { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region Command & Communication DTOs

    /// <summary>
    /// Trung tâm chỉ huy
    /// </summary>
    public class MCICommandCenterDto
    {
        public Guid EventId { get; set; }
        public string EventName { get; set; }
        public string EventStatus { get; set; }
        public DateTime LastUpdated { get; set; }

        // Command Structure
        public string IncidentCommander { get; set; }
        public string MedicalDirector { get; set; }
        public string TriageOfficer { get; set; }
        public string NursingDirector { get; set; }
        public string LogisticsOfficer { get; set; }
        public string CommunicationsOfficer { get; set; }

        // Real-time Stats
        public MCIRealTimeStatsDto RealTimeStats { get; set; }

        // Resources
        public MCIResourceStatusDto Resources { get; set; }

        // Recent Updates
        public List<MCIUpdateDto> RecentUpdates { get; set; }

        // Active Tasks
        public List<MCITaskDto> ActiveTasks { get; set; }
    }

    public class MCIRealTimeStatsDto
    {
        public Guid EventId { get; set; }
        public DateTime Timestamp { get; set; }

        // Victims
        public int TotalVictims { get; set; }
        public int TotalArrived { get; set; }
        public int AwaitingTriage { get; set; }
        public int InTreatment { get; set; }
        public int Treated { get; set; }
        public int Stabilized { get; set; }
        public int Disposed { get; set; }

        // By Category
        public int RedCategory { get; set; }
        public int RedActive { get; set; }
        public int YellowCategory { get; set; }
        public int YellowActive { get; set; }
        public int GreenCategory { get; set; }
        public int GreenActive { get; set; }
        public int BlackCategory { get; set; }
        public int BlackTotal { get; set; }

        // Disposition
        public int Discharged { get; set; }
        public int Admitted { get; set; }
        public int Transferred { get; set; }
        public int Deceased { get; set; }

        // Flow
        public int ArrivalsLast30Min { get; set; }
        public int DispositionsLast30Min { get; set; }

        // Wait Times
        public int AvgTriageWaitMinutes { get; set; }
        public int AvgTreatmentWaitMinutes { get; set; }
    }

    public class MCIUpdateDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public DateTime Time { get; set; }
        public DateTime PostedAt { get; set; }
        public string Category { get; set; }
        public string Message { get; set; }
        public string Source { get; set; }
        public string Priority { get; set; }
        public string PostedBy { get; set; }
    }

    public class MCITaskDto
    {
        public Guid Id { get; set; }
        public string Task { get; set; }
        public string AssignedTo { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DueAt { get; set; }
    }

    /// <summary>
    /// Thông báo/Broadcast
    /// </summary>
    public class MCIBroadcastDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public DateTime SentAt { get; set; }
        public string MessageType { get; set; } // Alert, Update, Instruction, AllClear
        public string Priority { get; set; } // Critical, High, Normal
        public string Title { get; set; }
        public string Message { get; set; }
        public List<string> TargetGroups { get; set; } // All, Doctors, Nurses, Admin
        public string SentBy { get; set; }
        public int RecipientCount { get; set; }
        public int DeliveredCount { get; set; }
        public int ReadCount { get; set; }
    }

    #endregion

    #region Family Notification DTOs

    /// <summary>
    /// Thông tin liên lạc thân nhân
    /// </summary>
    public class FamilyNotificationDto
    {
        public Guid Id { get; set; }
        public Guid VictimId { get; set; }
        public string VictimName { get; set; }
        public string TriageTag { get; set; }

        // Contact
        public string ContactName { get; set; }
        public string ContactPhone { get; set; }
        public string Relationship { get; set; }

        // Notification
        public DateTime? NotifiedAt { get; set; }
        public string NotificationMethod { get; set; } // Phone, SMS, InPerson
        public string NotifiedBy { get; set; }
        public string NotificationStatus { get; set; } // Notified, Attempted, Unable

        // Visit
        public bool HasVisited { get; set; }
        public DateTime? VisitedAt { get; set; }
        public string VisitorPassNumber { get; set; }

        public string Notes { get; set; }
    }

    /// <summary>
    /// Đường dây nóng
    /// </summary>
    public class HotlineCallDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public DateTime CallTime { get; set; }
        public DateTime ReceivedAt { get; set; }
        public string CallerName { get; set; }
        public string CallerPhone { get; set; }
        public string InquiryType { get; set; } // VictimStatus, Information, Other
        public string VictimNameInquiry { get; set; }
        public string VictimDescription { get; set; }

        // Resolution
        public bool VictimFound { get; set; }
        public Guid? MatchedVictimId { get; set; }
        public string Response { get; set; }
        public string HandledBy { get; set; }
        public string Status { get; set; } // Open, Resolved
        public string Notes { get; set; }
    }

    #endregion

    #region Reporting DTOs

    /// <summary>
    /// Báo cáo sự kiện MCI
    /// </summary>
    public class MCIEventReportDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public string EventCode { get; set; }
        public string EventName { get; set; }
        public DateTime EventDateTime { get; set; }
        public DateTime ActivatedAt { get; set; }
        public DateTime? DeactivatedAt { get; set; }
        public DateTime GeneratedAt { get; set; }
        public int DurationHours { get; set; }

        // Summary
        public int TotalVictims { get; set; }
        public int RedTotal { get; set; }
        public int YellowTotal { get; set; }
        public int GreenTotal { get; set; }
        public int BlackTotal { get; set; }

        // Outcomes
        public int TreatedAndDischarged { get; set; }
        public int Admitted { get; set; }
        public int Transferred { get; set; }
        public int Deceased { get; set; }

        // Resources Used
        public int TotalStaffInvolved { get; set; }
        public int SurgeriesPerformed { get; set; }
        public int BloodUnitsUsed { get; set; }
        public decimal EstimatedCost { get; set; }

        // Performance Metrics
        public int AvgTriageTimeMinutes { get; set; }
        public int AvgTimeToTreatmentMinutes { get; set; }
        public decimal TriageAccuracyRate { get; set; }

        // Lessons Learned
        public string ExecutiveSummary { get; set; }
        public string ChallengesEncountered { get; set; }
        public string SuccessFactors { get; set; }
        public string Recommendations { get; set; }

        public DateTime ReportGeneratedAt { get; set; }
        public string GeneratedBy { get; set; }
    }

    /// <summary>
    /// Báo cáo Sở Y tế về sự kiện MCI
    /// </summary>
    public class MCIAuthorityReportDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public string FacilityCode { get; set; }
        public string FacilityName { get; set; }
        public string ReportType { get; set; } // Initial, Update, Final
        public DateTime ReportTime { get; set; }
        public string Status { get; set; }
        public DateTime? GeneratedAt { get; set; }

        // Event Info
        public string EventType { get; set; }
        public string EventLocation { get; set; }
        public DateTime EventDateTime { get; set; }

        // Current Status
        public string CurrentStatus { get; set; }
        public int VictimsReceived { get; set; }
        public int VictimsTreated { get; set; }
        public int VictimsAdmitted { get; set; }
        public int VictimsTransferred { get; set; }
        public int Deceased { get; set; }

        // Resource Status
        public string HospitalCapacity { get; set; } // Normal, Strained, Overwhelmed
        public bool RequestingAssistance { get; set; }
        public string AssistanceNeeded { get; set; }

        // Submitted
        public DateTime? SubmittedAt { get; set; }
        public string SubmittedBy { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard MCI
    /// </summary>
    public class MCIDashboardDto
    {
        public bool HasActiveEvent { get; set; }
        public MCIEventDto ActiveEvent { get; set; }
        public MCIRealTimeStatsDto RealTimeStats { get; set; }
        public MCIResourceStatusDto Resources { get; set; }

        // Statistics
        public int TotalEventsThisYear { get; set; }
        public DateTime? LastDrillDate { get; set; }
        public int TotalStaffTrained { get; set; }

        // Victim Board
        public List<MCIVictimSummaryDto> VictimBoard { get; set; }

        // Staff Status
        public int StaffOnDuty { get; set; }
        public int StaffCalledIn { get; set; }

        // Alerts
        public List<MCIAlertDto> Alerts { get; set; }

        // Recent Arrivals
        public List<MCIVictimSummaryDto> RecentArrivals { get; set; }
    }

    public class MCIVictimSummaryDto
    {
        public Guid Id { get; set; }
        public string TriageTag { get; set; }
        public string Name { get; set; }
        public string TriageCategory { get; set; }
        public string CurrentLocation { get; set; }
        public string Status { get; set; }
        public DateTime ArrivedAt { get; set; }
        public int MinutesSinceArrival { get; set; }
    }

    public class MCIAlertDto
    {
        public string AlertType { get; set; }
        public string Severity { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActionRequired { get; set; }
    }

    #endregion
}
