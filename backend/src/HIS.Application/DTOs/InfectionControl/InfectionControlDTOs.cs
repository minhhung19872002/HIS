using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.InfectionControl
{
    #region Surveillance DTOs

    /// <summary>
    /// Ca nhiễm khuẩn bệnh viện
    /// </summary>
    public class HAIDto
    {
        public Guid Id { get; set; }
        public string CaseCode { get; set; }
        public Guid AdmissionId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public string DepartmentName { get; set; }
        public string BedNumber { get; set; }

        // Infection Details
        public string InfectionType { get; set; } // SSI, VAP, CAUTI, CLABSI, CDI, Other
        public string InfectionSite { get; set; }
        public DateTime OnsetDate { get; set; }
        public DateTime? DiagnosisDate { get; set; }
        public string CriteriaUsed { get; set; } // CDC, NHSN

        // Risk Factors
        public int DaysSinceAdmission { get; set; }
        public bool HasSurgery { get; set; }
        public DateTime? SurgeryDate { get; set; }
        public string SurgeryType { get; set; }
        public bool HasCentralLine { get; set; }
        public int? CentralLineDays { get; set; }
        public bool HasUrinaryCatheter { get; set; }
        public int? CatheterDays { get; set; }
        public bool OnVentilator { get; set; }
        public int? VentilatorDays { get; set; }

        // Microbiology
        public string Organism { get; set; }
        public bool IsMDRO { get; set; } // Multi-drug resistant organism
        public string ResistancePattern { get; set; }
        public List<string> Antibiotics { get; set; }

        // Investigation
        public string ProbableSource { get; set; }
        public string TransmissionMode { get; set; }
        public string InvestigationNotes { get; set; }
        public bool IsOutbreakRelated { get; set; }
        public Guid? OutbreakId { get; set; }

        // Status
        public string Status { get; set; } // Suspected, Confirmed, Resolved, Deceased
        public string Severity { get; set; } // Mild, Moderate, Severe
        public DateTime? ResolvedDate { get; set; }
        public string Outcome { get; set; }

        public string ReportedBy { get; set; }
        public DateTime ReportedAt { get; set; }
    }

    /// <summary>
    /// Báo cáo ca nhiễm khuẩn mới
    /// </summary>
    public class ReportHAIDto
    {
        public Guid AdmissionId { get; set; }
        public string InfectionType { get; set; }
        public string InfectionSite { get; set; }
        public DateTime OnsetDate { get; set; }
        public string CriteriaUsed { get; set; }
        public string Organism { get; set; }
        public bool IsMDRO { get; set; }
        public string InitialNotes { get; set; }
    }

    #endregion

    #region Isolation DTOs

    /// <summary>
    /// Y lệnh cách ly
    /// </summary>
    public class IsolationOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public Guid AdmissionId { get; set; }
        public string DepartmentName { get; set; }
        public string RoomNumber { get; set; }
        public string BedNumber { get; set; }

        // Isolation Type
        public string IsolationType { get; set; } // Contact, Droplet, Airborne, Protective
        public List<string> Precautions { get; set; }
        public string Reason { get; set; }
        public Guid? RelatedHAIId { get; set; }

        // PPE Requirements
        public bool RequiresGloves { get; set; }
        public bool RequiresGown { get; set; }
        public bool RequiresMask { get; set; }
        public bool RequiresN95 { get; set; }
        public bool RequiresEyeProtection { get; set; }
        public bool RequiresNegativePressure { get; set; }

        // Status
        public string Status { get; set; } // Active, Discontinued
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string OrderedBy { get; set; }
        public string DiscontinuedBy { get; set; }
        public string DiscontinuedReason { get; set; }
    }

    /// <summary>
    /// Tạo y lệnh cách ly
    /// </summary>
    public class CreateIsolationOrderDto
    {
        public Guid AdmissionId { get; set; }
        public string IsolationType { get; set; }
        public List<string> Precautions { get; set; }
        public string Reason { get; set; }
        public Guid? RelatedHAIId { get; set; }
        public bool RequiresNegativePressure { get; set; }
        public DateTime StartDate { get; set; }
    }

    #endregion

    #region Hand Hygiene DTOs

    /// <summary>
    /// Giám sát rửa tay
    /// </summary>
    public class HandHygieneObservationDto
    {
        public Guid Id { get; set; }
        public DateTime ObservationDate { get; set; }
        public TimeSpan ObservationTime { get; set; }
        public string DepartmentName { get; set; }
        public string UnitName { get; set; }
        public string ObserverName { get; set; }

        // Session Summary
        public int TotalOpportunities { get; set; }
        public int CompliantActions { get; set; }
        public decimal ComplianceRate { get; set; }

        // By Moment (5 Moments)
        public int BeforePatientContact { get; set; }
        public int BeforePatientContactCompliant { get; set; }
        public int BeforeAsepticTask { get; set; }
        public int BeforeAsepticTaskCompliant { get; set; }
        public int AfterBodyFluidExposure { get; set; }
        public int AfterBodyFluidExposureCompliant { get; set; }
        public int AfterPatientContact { get; set; }
        public int AfterPatientContactCompliant { get; set; }
        public int AfterEnvironmentContact { get; set; }
        public int AfterEnvironmentContactCompliant { get; set; }

        // By Professional Category
        public List<HHByProfessionDto> ByProfession { get; set; }

        public string Notes { get; set; }
    }

    public class HHByProfessionDto
    {
        public string Profession { get; set; } // Doctor, Nurse, Allied, Other
        public int Opportunities { get; set; }
        public int Compliant { get; set; }
        public decimal Rate { get; set; }
    }

    /// <summary>
    /// Ghi nhận quan sát rửa tay
    /// </summary>
    public class RecordHandHygieneDto
    {
        public string DepartmentId { get; set; }
        public string UnitName { get; set; }
        public DateTime ObservationDate { get; set; }
        public TimeSpan ObservationTime { get; set; }
        public List<HandHygieneEventDto> Events { get; set; }
    }

    public class HandHygieneEventDto
    {
        public string Profession { get; set; }
        public string Moment { get; set; }
        public bool IsCompliant { get; set; }
        public string Method { get; set; } // HandRub, HandWash, None
    }

    #endregion

    #region Outbreak Management DTOs

    /// <summary>
    /// Dịch bùng phát
    /// </summary>
    public class OutbreakDto
    {
        public Guid Id { get; set; }
        public string OutbreakCode { get; set; }
        public string Name { get; set; }
        public string Organism { get; set; }
        public string InfectionType { get; set; }

        // Timeline
        public DateTime IdentifiedDate { get; set; }
        public DateTime? DeclaredDate { get; set; }
        public DateTime? ContainedDate { get; set; }
        public DateTime? EndDate { get; set; }

        // Scope
        public List<string> AffectedDepartments { get; set; }
        public int TotalCases { get; set; }
        public int ConfirmedCases { get; set; }
        public int SuspectedCases { get; set; }
        public int Deaths { get; set; }

        // Investigation
        public string ProbableSource { get; set; }
        public string TransmissionMode { get; set; }
        public string InvestigationFindings { get; set; }
        public List<Guid> RelatedCases { get; set; }

        // Control Measures
        public List<string> ControlMeasures { get; set; }
        public string CommunicationPlan { get; set; }
        public bool ReportedToAuthority { get; set; }
        public DateTime? ReportedDate { get; set; }

        // Status
        public string Status { get; set; } // Investigating, Active, Contained, Closed
        public string Severity { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Khai báo dịch bùng phát
    /// </summary>
    public class DeclareOutbreakDto
    {
        public string Name { get; set; }
        public string Organism { get; set; }
        public string InfectionType { get; set; }
        public DateTime IdentifiedDate { get; set; }
        public List<string> AffectedDepartments { get; set; }
        public List<Guid> InitialCases { get; set; }
        public string InitialFindings { get; set; }
    }

    #endregion

    #region Environmental Surveillance DTOs

    /// <summary>
    /// Giám sát môi trường
    /// </summary>
    public class EnvironmentSurveillanceDto
    {
        public Guid Id { get; set; }
        public DateTime SurveillanceDate { get; set; }
        public string Location { get; set; }
        public string LocationType { get; set; } // OR, ICU, Ward, Kitchen, CSSD
        public string SurveillanceType { get; set; } // Surface, Air, Water

        // Surface Sampling
        public List<SurfaceSampleDto> SurfaceSamples { get; set; }

        // Air Sampling
        public decimal? CFUPerCubicMeter { get; set; }
        public string AirQualityResult { get; set; }

        // Water Sampling
        public decimal? LegionellaLevel { get; set; }
        public decimal? PseudomonasLevel { get; set; }
        public string WaterQualityResult { get; set; }

        // Overall
        public string OverallResult { get; set; } // Pass, Fail, Conditional
        public string CorrectiveAction { get; set; }
        public DateTime? ReTestDate { get; set; }

        public string PerformedBy { get; set; }
    }

    public class SurfaceSampleDto
    {
        public string SampleSite { get; set; }
        public decimal? CFUCount { get; set; }
        public bool OrganismDetected { get; set; }
        public string OrganismIdentified { get; set; }
        public string Result { get; set; }
    }

    #endregion

    #region Antibiotic Stewardship DTOs

    /// <summary>
    /// Giám sát kháng sinh
    /// </summary>
    public class AntibioticStewardshipDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public string PatientName { get; set; }
        public string DepartmentName { get; set; }

        // Antibiotic Info
        public string AntibioticName { get; set; }
        public string Route { get; set; }
        public string Dose { get; set; }
        public string Frequency { get; set; }
        public DateTime StartDate { get; set; }
        public int DurationDays { get; set; }
        public string Indication { get; set; }
        public bool IsEmpiric { get; set; }
        public bool IsProphylactic { get; set; }

        // Review
        public bool RequiresReview { get; set; }
        public DateTime? ReviewDueDate { get; set; }
        public bool IsReviewed { get; set; }
        public string ReviewOutcome { get; set; } // Continue, DeEscalate, Discontinue, Switch
        public string ReviewNotes { get; set; }
        public string ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Alerts
        public bool HasDurationAlert { get; set; }
        public bool HasBroadSpectrumAlert { get; set; }
        public bool HasRestrictedAlert { get; set; }
    }

    /// <summary>
    /// Báo cáo kháng sinh theo khoa
    /// </summary>
    public class AntibioticUsageReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string DepartmentName { get; set; }

        // Usage Metrics
        public decimal DOTPerThousandPatientDays { get; set; } // Days of Therapy
        public decimal DDDPerHundredBedDays { get; set; } // Defined Daily Dose
        public decimal LOTPerThousandPatientDays { get; set; } // Length of Therapy

        // By Antibiotic
        public List<AntibioticUsageItemDto> ByAntibiotic { get; set; }

        // By Indication
        public int EmpiricalCount { get; set; }
        public int TargetedCount { get; set; }
        public int ProphylacticCount { get; set; }

        // Review Compliance
        public int TotalRequiringReview { get; set; }
        public int ReviewedCount { get; set; }
        public decimal ReviewComplianceRate { get; set; }
    }

    public class AntibioticUsageItemDto
    {
        public string AntibioticName { get; set; }
        public string Category { get; set; } // AWaRe: Access, Watch, Reserve
        public int Prescriptions { get; set; }
        public decimal DDDTotal { get; set; }
        public decimal PercentageOfTotal { get; set; }
    }

    #endregion

    #region Dashboard & Reports DTOs

    /// <summary>
    /// Dashboard Kiểm soát Nhiễm khuẩn
    /// </summary>
    public class ICDashboardDto
    {
        public DateTime Date { get; set; }

        // HAI Summary
        public int ActiveHAICases { get; set; }
        public int NewCasesThisMonth { get; set; }
        public int SSICount { get; set; }
        public int VAPCount { get; set; }
        public int CAUTICount { get; set; }
        public int CLABSICount { get; set; }
        public decimal HAIRatePerThousandPatientDays { get; set; }

        // Isolation
        public int ActiveIsolations { get; set; }
        public int ContactPrecautions { get; set; }
        public int DropletPrecautions { get; set; }
        public int AirbornePrecautions { get; set; }

        // Hand Hygiene
        public decimal CurrentHHComplianceRate { get; set; }
        public decimal TargetHHRate { get; set; }
        public List<HHDepartmentRateDto> HHByDepartment { get; set; }

        // MDRO
        public int MDROCasesThisMonth { get; set; }
        public List<MDROSummaryDto> MDROByOrganism { get; set; }

        // Outbreaks
        public int ActiveOutbreaks { get; set; }
        public List<OutbreakSummaryDto> CurrentOutbreaks { get; set; }

        // Trends
        public List<HAITrendDto> HAITrend { get; set; }

        // Alerts
        public List<ICAlertDto> Alerts { get; set; }
    }

    public class HHDepartmentRateDto
    {
        public string DepartmentName { get; set; }
        public decimal ComplianceRate { get; set; }
        public string Trend { get; set; }
    }

    public class MDROSummaryDto
    {
        public string Organism { get; set; }
        public int Count { get; set; }
        public string Trend { get; set; }
    }

    public class OutbreakSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public int CaseCount { get; set; }
    }

    public class HAITrendDto
    {
        public string Month { get; set; }
        public int TotalCases { get; set; }
        public decimal RatePerThousand { get; set; }
    }

    public class ICAlertDto
    {
        public string AlertType { get; set; }
        public string Severity { get; set; }
        public string Message { get; set; }
        public string ActionRequired { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
