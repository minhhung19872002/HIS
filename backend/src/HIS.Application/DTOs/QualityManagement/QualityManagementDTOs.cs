using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.QualityManagement
{
    #region Incident Reporting DTOs

    /// <summary>
    /// Sự cố y khoa
    /// </summary>
    public class IncidentReportDto
    {
        public Guid Id { get; set; }
        public string IncidentCode { get; set; }
        public DateTime IncidentDate { get; set; }
        public TimeSpan IncidentTime { get; set; }
        public string DepartmentName { get; set; }
        public string Location { get; set; }

        // Involved Parties
        public Guid? PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public List<string> InvolvedStaff { get; set; }
        public List<string> Witnesses { get; set; }

        // Incident Details
        public string IncidentType { get; set; } // MedicationError, Fall, Infection, Equipment, Other
        public string IncidentCategory { get; set; }
        public string SeverityLevel { get; set; } // NearMiss, NoHarm, Mild, Moderate, Severe, Death
        public string Description { get; set; }
        public string ImmediateAction { get; set; }
        public string PatientOutcome { get; set; }

        // Classification
        public bool IsNearMiss { get; set; }
        public bool IsSentinelEvent { get; set; }
        public bool IsNeverEvent { get; set; }
        public bool RequiresRCA { get; set; }

        // Reporter (Anonymous option)
        public bool IsAnonymous { get; set; }
        public string ReporterName { get; set; }
        public string ReporterRole { get; set; }
        public DateTime ReportedAt { get; set; }

        // Investigation
        public string InvestigationStatus { get; set; } // Reported, UnderReview, Investigating, Closed
        public string AssignedTo { get; set; }
        public DateTime? InvestigationStartDate { get; set; }
        public DateTime? InvestigationEndDate { get; set; }

        // Root Cause Analysis
        public string RCAFindings { get; set; }
        public List<string> ContributingFactors { get; set; }
        public string RootCause { get; set; }

        // Corrective Actions
        public List<CorrectiveActionDto> CorrectiveActions { get; set; }

        // Status
        public string Status { get; set; } // Open, InProgress, Closed
        public DateTime? ClosedAt { get; set; }
        public string ClosedBy { get; set; }
    }

    public class CorrectiveActionDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; }
        public string ActionType { get; set; } // Immediate, ShortTerm, LongTerm, Systemic
        public string AssignedTo { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } // Pending, InProgress, Completed, Overdue
        public DateTime? CompletedDate { get; set; }
        public string VerifiedBy { get; set; }
        public bool IsEffective { get; set; }
    }

    /// <summary>
    /// Báo cáo sự cố mới
    /// </summary>
    public class CreateIncidentReportDto
    {
        public DateTime IncidentDate { get; set; }
        public TimeSpan IncidentTime { get; set; }
        public string DepartmentId { get; set; }
        public string Location { get; set; }
        public Guid? PatientId { get; set; }
        public List<string> InvolvedStaff { get; set; }
        public string IncidentType { get; set; }
        public string IncidentCategory { get; set; }
        public string SeverityLevel { get; set; }
        public string Description { get; set; }
        public string ImmediateAction { get; set; }
        public string PatientOutcome { get; set; }
        public bool IsAnonymous { get; set; }
    }

    #endregion

    #region Quality Indicator DTOs

    /// <summary>
    /// Chỉ số chất lượng
    /// </summary>
    public class QualityIndicatorDto
    {
        public Guid Id { get; set; }
        public string IndicatorCode { get; set; }
        public string IndicatorName { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; } // Clinical, Safety, PatientExperience, Operational
        public string Department { get; set; } // All, Specific department

        // Calculation
        public string NumeratorDefinition { get; set; }
        public string DenominatorDefinition { get; set; }
        public string Unit { get; set; }
        public string Direction { get; set; } // HigherIsBetter, LowerIsBetter

        // Targets
        public decimal TargetValue { get; set; }
        public decimal ThresholdWarning { get; set; }
        public decimal ThresholdCritical { get; set; }

        // Source
        public string DataSource { get; set; }
        public string CalculationFrequency { get; set; } // Daily, Weekly, Monthly

        // Standard Reference
        public string StandardReference { get; set; } // JCI, HA, BYT, Internal
        public bool IsMandatory { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Giá trị chỉ số chất lượng
    /// </summary>
    public class QualityIndicatorValueDto
    {
        public Guid Id { get; set; }
        public Guid IndicatorId { get; set; }
        public string IndicatorCode { get; set; }
        public string IndicatorName { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public string DepartmentName { get; set; }

        // Values
        public decimal Numerator { get; set; }
        public decimal Denominator { get; set; }
        public decimal Value { get; set; }
        public decimal TargetValue { get; set; }
        public decimal? PreviousPeriodValue { get; set; }

        // Status
        public string Status { get; set; } // Met, Warning, Critical
        public decimal VarianceFromTarget { get; set; }
        public string Trend { get; set; } // Improving, Stable, Declining

        // Analysis
        public string Analysis { get; set; }
        public string ActionPlan { get; set; }

        public DateTime CalculatedAt { get; set; }
        public bool IsVerified { get; set; }
    }

    #endregion

    #region Internal Audit DTOs

    /// <summary>
    /// Kế hoạch audit nội bộ
    /// </summary>
    public class AuditPlanDto
    {
        public Guid Id { get; set; }
        public string PlanCode { get; set; }
        public int Year { get; set; }
        public string AuditType { get; set; } // Scheduled, Surprise, Follow-up
        public string Standard { get; set; } // JCI, ISO9001, HA, 83Criteria
        public List<AuditScheduleDto> Schedules { get; set; }
        public string Status { get; set; } // Draft, Approved, InProgress, Completed
        public string ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }

    public class AuditScheduleDto
    {
        public Guid Id { get; set; }
        public string Department { get; set; }
        public string Process { get; set; }
        public List<string> Criteria { get; set; }
        public DateTime PlannedDate { get; set; }
        public DateTime? ActualDate { get; set; }
        public List<string> AuditTeam { get; set; }
        public string LeadAuditor { get; set; }
        public string Status { get; set; }
    }

    /// <summary>
    /// Kết quả audit
    /// </summary>
    public class AuditResultDto
    {
        public Guid Id { get; set; }
        public string AuditCode { get; set; }
        public Guid ScheduleId { get; set; }
        public DateTime AuditDate { get; set; }
        public string Department { get; set; }
        public string Process { get; set; }
        public string LeadAuditor { get; set; }
        public List<string> AuditTeam { get; set; }

        // Findings
        public List<AuditFindingDto> Findings { get; set; }
        public int TotalFindings { get; set; }
        public int MajorNonConformities { get; set; }
        public int MinorNonConformities { get; set; }
        public int Observations { get; set; }
        public int Opportunities { get; set; }

        // Summary
        public string ExecutiveSummary { get; set; }
        public string Strengths { get; set; }
        public string AreasForImprovement { get; set; }
        public string OverallRating { get; set; } // Conforming, PartiallyConforming, NonConforming

        // Follow-up
        public DateTime? FollowUpDueDate { get; set; }
        public bool AllActionsCompleted { get; set; }

        public string Status { get; set; } // Draft, Submitted, Approved
        public DateTime? SubmittedAt { get; set; }
    }

    public class AuditFindingDto
    {
        public Guid Id { get; set; }
        public string FindingCode { get; set; }
        public string CriteriaReference { get; set; }
        public string FindingType { get; set; } // MajorNC, MinorNC, Observation, OFI
        public string Description { get; set; }
        public string Evidence { get; set; }
        public string Impact { get; set; }
        public string RootCause { get; set; }
        public List<CorrectiveActionDto> CorrectiveActions { get; set; }
        public string Status { get; set; } // Open, InProgress, Closed
    }

    #endregion

    #region Patient Satisfaction DTOs

    /// <summary>
    /// Khảo sát hài lòng bệnh nhân
    /// </summary>
    public class PatientSatisfactionSurveyDto
    {
        public Guid Id { get; set; }
        public string SurveyCode { get; set; }
        public string SurveyType { get; set; } // Inpatient, Outpatient, Emergency
        public Guid? PatientId { get; set; }
        public Guid? VisitId { get; set; }
        public Guid? AdmissionId { get; set; }
        public DateTime SurveyDate { get; set; }
        public string Department { get; set; }

        // Scores (1-5)
        public int OverallSatisfaction { get; set; }
        public int DoctorCare { get; set; }
        public int NursingCare { get; set; }
        public int WaitTime { get; set; }
        public int Communication { get; set; }
        public int Cleanliness { get; set; }
        public int FoodService { get; set; }
        public int Facilities { get; set; }
        public int DischargeProcess { get; set; }

        // NPS
        public int LikelihoodToRecommend { get; set; } // 0-10
        public string NPSCategory { get; set; } // Promoter, Passive, Detractor

        // Open Feedback
        public string PositiveFeedback { get; set; }
        public string NegativeFeedback { get; set; }
        public string Suggestions { get; set; }

        // Follow-up
        public bool RequiresFollowUp { get; set; }
        public string FollowUpReason { get; set; }
        public bool IsFollowedUp { get; set; }
        public string FollowUpNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime SubmittedAt { get; set; }
    }

    /// <summary>
    /// Tổng hợp khảo sát hài lòng
    /// </summary>
    public class SatisfactionReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string SurveyType { get; set; }
        public string Department { get; set; }

        // Response
        public int TotalSurveys { get; set; }
        public int TotalResponses { get; set; }
        public decimal ResponseRate { get; set; }
        public decimal OverallSatisfactionScore { get; set; }

        // Scores
        public decimal AverageOverall { get; set; }
        public decimal AverageDoctorCare { get; set; }
        public decimal AverageNursingCare { get; set; }
        public decimal AverageWaitTime { get; set; }
        public decimal AverageCommunication { get; set; }
        public decimal AverageCleanliness { get; set; }
        public decimal AverageFoodService { get; set; }
        public decimal AverageFacilities { get; set; }

        // NPS
        public decimal NetPromoterScore { get; set; }
        public int Promoters { get; set; }
        public int Passives { get; set; }
        public int Detractors { get; set; }

        // Trends
        public List<SatisfactionTrendDto> MonthlyTrend { get; set; }

        // By Department
        public List<DepartmentSatisfactionDto> ByDepartment { get; set; }

        // Top Issues
        public List<string> TopPositives { get; set; }
        public List<string> TopNegatives { get; set; }
    }

    public class SatisfactionTrendDto
    {
        public string Month { get; set; }
        public decimal OverallScore { get; set; }
        public decimal NPS { get; set; }
        public int SurveyCount { get; set; }
    }

    public class DepartmentSatisfactionDto
    {
        public string DepartmentName { get; set; }
        public decimal OverallScore { get; set; }
        public decimal NPS { get; set; }
        public int SurveyCount { get; set; }
        public string Trend { get; set; }
    }

    #endregion

    #region CAPA (Corrective and Preventive Action) DTOs

    /// <summary>
    /// CAPA Record
    /// </summary>
    public class CAPADto
    {
        public Guid Id { get; set; }
        public string CAPACode { get; set; }
        public string Title { get; set; }
        public string Type { get; set; } // Corrective, Preventive, Both
        public string Source { get; set; } // Incident, Audit, Complaint, Surveillance

        // Source Reference
        public Guid? SourceIncidentId { get; set; }
        public Guid? SourceAuditId { get; set; }
        public string SourceReference { get; set; }

        // Problem Statement
        public string ProblemDescription { get; set; }
        public string Department { get; set; }
        public string ProcessAffected { get; set; }
        public string ImpactAssessment { get; set; }
        public string Priority { get; set; } // High, Medium, Low

        // Root Cause Analysis
        public string RCAMethod { get; set; } // 5Whys, Fishbone, FMEA
        public string RootCause { get; set; }
        public List<string> ContributingFactors { get; set; }

        // Action Plan
        public List<CAPAActionDto> Actions { get; set; }
        public string Owner { get; set; }
        public DateTime TargetCompletionDate { get; set; }
        public DateTime? ActualCompletionDate { get; set; }

        // Verification
        public bool EffectivenessVerified { get; set; }
        public string VerificationMethod { get; set; }
        public string VerificationResults { get; set; }
        public DateTime? VerificationDate { get; set; }
        public string VerifiedBy { get; set; }

        // Status
        public string Status { get; set; } // Open, InProgress, PendingVerification, Closed
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? ClosedAt { get; set; }
        public string ClosedBy { get; set; }
    }

    public class CAPAActionDto
    {
        public int ActionNumber { get; set; }
        public string Description { get; set; }
        public string ActionType { get; set; } // Corrective, Preventive, Containment
        public string ResponsiblePerson { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } // NotStarted, InProgress, Completed, Overdue
        public DateTime? CompletedDate { get; set; }
        public string Evidence { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard Quản lý Chất lượng
    /// </summary>
    public class QMDashboardDto
    {
        public DateTime Date { get; set; }

        // Incidents
        public int OpenIncidents { get; set; }
        public int IncidentsThisMonth { get; set; }
        public int SentinelEvents { get; set; }
        public int NearMisses { get; set; }
        public Dictionary<string, int> IncidentsBySeverity { get; set; }
        public Dictionary<string, int> IncidentsByType { get; set; }

        // Quality Indicators
        public int TotalIndicators { get; set; }
        public int MetTarget { get; set; }
        public int IndicatorsMeetingTarget { get; set; }
        public int IndicatorsBelowTarget { get; set; }
        public int WarningLevel { get; set; }
        public int CriticalLevel { get; set; }
        public List<QualityIndicatorValueDto> CriticalIndicators { get; set; }

        // Audits
        public int PlannedAuditsThisYear { get; set; }
        public int CompletedAudits { get; set; }
        public int OpenFindings { get; set; }
        public int OverdueActions { get; set; }

        // Patient Satisfaction
        public decimal CurrentNPS { get; set; }
        public decimal CurrentOverallSatisfaction { get; set; }
        public decimal SatisfactionScore { get; set; }
        public int PendingSurveyFollowUps { get; set; }

        // CAPA
        public int OpenCAPAs { get; set; }
        public int OverdueCAPAs { get; set; }
        public int PendingVerification { get; set; }

        // Trends
        public List<IncidentTrendDto> IncidentTrend { get; set; }

        // Alerts
        public List<QMAlertDto> Alerts { get; set; }
    }

    public class IncidentTrendDto
    {
        public string Month { get; set; }
        public int TotalIncidents { get; set; }
        public int SevereIncidents { get; set; }
        public int NearMisses { get; set; }
    }

    public class QMAlertDto
    {
        public string AlertType { get; set; }
        public string Severity { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActionUrl { get; set; }
    }

    #endregion
}
