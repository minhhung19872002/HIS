using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Rehabilitation
{
    #region Referral & Admission DTOs

    /// <summary>
    /// Chỉ định PHCN
    /// </summary>
    public class RehabReferralDto
    {
        public Guid Id { get; set; }
        public string ReferralCode { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }

        // Source
        public Guid? AdmissionId { get; set; }
        public Guid? VisitId { get; set; }
        public string SourceDepartment { get; set; }
        public string ReferringDoctor { get; set; }

        // Clinical Info
        public string PrimaryDiagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public List<string> SecondaryDiagnoses { get; set; }
        public DateTime OnsetDate { get; set; }
        public string MedicalHistory { get; set; }
        public string CurrentMedications { get; set; }
        public string Precautions { get; set; }

        // Rehab Request
        public string RehabType { get; set; } // PT, OT, ST, Combined
        public string RehabGoals { get; set; }
        public string SpecificRequests { get; set; }
        public string Urgency { get; set; } // Routine, Urgent

        // Status
        public string Status { get; set; } // Pending, Accepted, InProgress, Completed, Cancelled
        public DateTime ReferralDate { get; set; }
        public DateTime? AcceptedDate { get; set; }
        public string AcceptedBy { get; set; }
    }

    /// <summary>
    /// Tạo chỉ định PHCN
    /// </summary>
    public class CreateRehabReferralDto
    {
        public Guid PatientId { get; set; }
        public Guid? AdmissionId { get; set; }
        public Guid? VisitId { get; set; }
        public string PrimaryDiagnosis { get; set; }
        public string DiagnosisICD { get; set; }
        public DateTime OnsetDate { get; set; }
        public string MedicalHistory { get; set; }
        public string CurrentMedications { get; set; }
        public string Precautions { get; set; }
        public string RehabType { get; set; }
        public string RehabGoals { get; set; }
        public string SpecificRequests { get; set; }
        public string Urgency { get; set; }
    }

    #endregion

    #region Functional Assessment DTOs

    /// <summary>
    /// Đánh giá chức năng
    /// </summary>
    public class FunctionalAssessmentDto
    {
        public Guid Id { get; set; }
        public Guid ReferralId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime AssessmentDate { get; set; }
        public string AssessmentType { get; set; } // Initial, Progress, Discharge

        // Standardized Scales
        public int? BarthelIndex { get; set; } // 0-100
        public int? FIMScore { get; set; } // 18-126
        public int? MoCAScore { get; set; } // 0-30
        public int? MMSEScore { get; set; } // 0-30
        public int? BergBalanceScore { get; set; } // 0-56
        public string TinettiFalls { get; set; }
        public decimal? SixMinuteWalkDistance { get; set; }
        public int? TimedUpAndGo { get; set; }

        // Motor Function
        public string MuscleTone { get; set; }
        public Dictionary<string, int> ManualMuscleTest { get; set; } // Muscle group -> Grade (0-5)
        public Dictionary<string, string> RangeOfMotion { get; set; } // Joint -> ROM
        public string Coordination { get; set; }
        public string Balance { get; set; }
        public string Gait { get; set; }
        public string Transfers { get; set; }

        // Sensory Function
        public string LightTouch { get; set; }
        public string Proprioception { get; set; }
        public string Pain { get; set; }

        // ADL Assessment
        public string Feeding { get; set; }
        public string Grooming { get; set; }
        public string Bathing { get; set; }
        public string Dressing { get; set; }
        public string Toileting { get; set; }
        public string Mobility { get; set; }

        // Speech & Swallowing (for ST)
        public string SpeechAssessment { get; set; }
        public string LanguageAssessment { get; set; }
        public string SwallowingAssessment { get; set; }
        public string DysphagiaGrade { get; set; }

        // Cognitive (for OT)
        public string Attention { get; set; }
        public string Memory { get; set; }
        public string ExecutiveFunction { get; set; }
        public string Perception { get; set; }

        // Summary
        public string ProblemList { get; set; }
        public string Prognosis { get; set; }
        public string RecommendedInterventions { get; set; }

        public string AssessedBy { get; set; }
        public string AssessorTitle { get; set; }
    }

    /// <summary>
    /// Lưu đánh giá chức năng
    /// </summary>
    public class SaveFunctionalAssessmentDto
    {
        public Guid? Id { get; set; }
        public Guid ReferralId { get; set; }
        public string AssessmentType { get; set; }
        public int? BarthelIndex { get; set; }
        public int? FIMScore { get; set; }
        public int? MoCAScore { get; set; }
        public int? BergBalanceScore { get; set; }
        public Dictionary<string, int> ManualMuscleTest { get; set; }
        public Dictionary<string, string> RangeOfMotion { get; set; }
        public string Gait { get; set; }
        public string Transfers { get; set; }
        public string ADLNotes { get; set; }
        public string ProblemList { get; set; }
        public string Prognosis { get; set; }
        public string RecommendedInterventions { get; set; }
    }

    #endregion

    #region Treatment Plan DTOs

    /// <summary>
    /// Kế hoạch điều trị PHCN
    /// </summary>
    public class RehabTreatmentPlanDto
    {
        public Guid Id { get; set; }
        public string PlanCode { get; set; }
        public Guid ReferralId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public Guid AssessmentId { get; set; }

        // Goals (SMART)
        public List<RehabGoalDto> ShortTermGoals { get; set; }
        public List<RehabGoalDto> LongTermGoals { get; set; }

        // Interventions
        public List<RehabInterventionDto> Interventions { get; set; }

        // Schedule
        public int SessionsPerWeek { get; set; }
        public int MinutesPerSession { get; set; }
        public int PlannedTotalSessions { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? ExpectedEndDate { get; set; }

        // Precautions
        public List<string> Precautions { get; set; }
        public List<string> Contraindications { get; set; }

        // Status
        public string Status { get; set; } // Active, OnHold, Completed, Discontinued
        public int CompletedSessions { get; set; }

        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastReviewDate { get; set; }
    }

    public class RehabGoalDto
    {
        public int GoalNumber { get; set; }
        public string GoalType { get; set; } // ShortTerm, LongTerm
        public string GoalDescription { get; set; }
        public string Measurable { get; set; }
        public DateTime TargetDate { get; set; }
        public string Status { get; set; } // NotStarted, InProgress, Achieved, NotAchieved
        public decimal? ProgressPercent { get; set; }
    }

    public class RehabInterventionDto
    {
        public string InterventionType { get; set; } // PT, OT, ST
        public string Category { get; set; } // Therapeutic Exercise, Modality, Manual, etc.
        public string InterventionName { get; set; }
        public string Description { get; set; }
        public string Parameters { get; set; } // Sets, reps, duration, intensity
        public string Frequency { get; set; }
    }

    /// <summary>
    /// Tạo kế hoạch điều trị
    /// </summary>
    public class CreateTreatmentPlanDto
    {
        public Guid ReferralId { get; set; }
        public Guid AssessmentId { get; set; }
        public List<RehabGoalDto> ShortTermGoals { get; set; }
        public List<RehabGoalDto> LongTermGoals { get; set; }
        public List<RehabInterventionDto> Interventions { get; set; }
        public int SessionsPerWeek { get; set; }
        public int MinutesPerSession { get; set; }
        public int PlannedTotalSessions { get; set; }
        public DateTime StartDate { get; set; }
        public List<string> Precautions { get; set; }
    }

    #endregion

    #region Treatment Session DTOs

    /// <summary>
    /// Buổi tập PHCN
    /// </summary>
    public class RehabSessionDto
    {
        public Guid Id { get; set; }
        public string SessionCode { get; set; }
        public Guid TreatmentPlanId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public int SessionNumber { get; set; }

        // Schedule
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public int ScheduledDuration { get; set; }
        public string TherapistName { get; set; }
        public string Location { get; set; }

        // Actual
        public DateTime? ActualStartTime { get; set; }
        public DateTime? ActualEndTime { get; set; }
        public int? ActualDuration { get; set; }

        // Treatment Record
        public List<SessionActivityDto> Activities { get; set; }
        public string PatientResponse { get; set; }
        public string ToleranceLevel { get; set; } // Good, Fair, Poor
        public string PainLevel { get; set; } // 0-10
        public string VitalSigns { get; set; }
        public string ClinicalObservations { get; set; }
        public string ProgressNotes { get; set; }
        public string HomeExercises { get; set; }

        // Status
        public string Status { get; set; } // Scheduled, InProgress, Completed, Cancelled, NoShow
        public string CancellationReason { get; set; }

        public string DocumentedBy { get; set; }
        public DateTime? DocumentedAt { get; set; }
    }

    public class SessionActivityDto
    {
        public string ActivityType { get; set; }
        public string ActivityName { get; set; }
        public string Parameters { get; set; }
        public int DurationMinutes { get; set; }
        public string PatientPerformance { get; set; }
        public string Notes { get; set; }
    }

    /// <summary>
    /// Ghi nhận buổi tập
    /// </summary>
    public class DocumentSessionDto
    {
        public Guid SessionId { get; set; }
        public DateTime ActualStartTime { get; set; }
        public DateTime ActualEndTime { get; set; }
        public List<SessionActivityDto> Activities { get; set; }
        public string PatientResponse { get; set; }
        public string ToleranceLevel { get; set; }
        public string PainLevel { get; set; }
        public string VitalSigns { get; set; }
        public string ClinicalObservations { get; set; }
        public string ProgressNotes { get; set; }
        public string HomeExercises { get; set; }
    }

    #endregion

    #region Progress & Outcome DTOs

    /// <summary>
    /// Theo dõi tiến triển
    /// </summary>
    public class RehabProgressReportDto
    {
        public Guid TreatmentPlanId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime ReportDate { get; set; }

        // Sessions Summary
        public int TotalPlannedSessions { get; set; }
        public int CompletedSessions { get; set; }
        public int CancelledSessions { get; set; }
        public int NoShowSessions { get; set; }
        public decimal AttendanceRate { get; set; }

        // Goal Progress
        public List<GoalProgressDto> GoalProgress { get; set; }

        // Functional Score Trend
        public List<FunctionalScoreTrendDto> ScoreTrend { get; set; }

        // Overall Progress
        public string OverallProgress { get; set; } // Improving, Stable, Declining
        public string TherapistNotes { get; set; }
        public string Recommendations { get; set; }
        public bool RequiresPlanModification { get; set; }
    }

    public class GoalProgressDto
    {
        public int GoalNumber { get; set; }
        public string GoalDescription { get; set; }
        public string Status { get; set; }
        public decimal ProgressPercent { get; set; }
        public string Notes { get; set; }
    }

    public class FunctionalScoreTrendDto
    {
        public DateTime Date { get; set; }
        public string ScaleType { get; set; }
        public int Score { get; set; }
        public int MaxScore { get; set; }
    }

    /// <summary>
    /// Kết quả điều trị PHCN
    /// </summary>
    public class RehabOutcomeDto
    {
        public Guid Id { get; set; }
        public Guid TreatmentPlanId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }

        // Admission vs Discharge Scores
        public int? AdmissionBarthel { get; set; }
        public int? DischargeBarthel { get; set; }
        public int? BarthelChange { get; set; }

        public int? AdmissionFIM { get; set; }
        public int? DischargeFIM { get; set; }
        public int? FIMChange { get; set; }

        // Goals Achievement
        public int TotalGoals { get; set; }
        public int AchievedGoals { get; set; }
        public int PartiallyAchievedGoals { get; set; }
        public int NotAchievedGoals { get; set; }
        public decimal GoalAchievementRate { get; set; }

        // Discharge Status
        public string DischargeStatus { get; set; } // Completed, Discharged, Transferred, Discontinued
        public string DischargeDestination { get; set; } // Home, SNF, LTAC, Outpatient
        public string FunctionalStatus { get; set; }
        public string AssistanceLevel { get; set; }

        // Recommendations
        public bool ContinueOutpatient { get; set; }
        public string HomeProgram { get; set; }
        public string EquipmentNeeded { get; set; }
        public string FollowUpInstructions { get; set; }

        public DateTime DischargeDate { get; set; }
        public string DischargedBy { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard PHCN
    /// </summary>
    public class RehabDashboardDto
    {
        public DateTime Date { get; set; }

        // Today's Schedule
        public int TodaySessions { get; set; }
        public int CompletedToday { get; set; }
        public int InProgressNow { get; set; }
        public int UpcomingToday { get; set; }

        // Active Cases
        public int ActivePatients { get; set; }
        public int PTPatients { get; set; }
        public int OTPatients { get; set; }
        public int STPatients { get; set; }

        // Pending
        public int PendingReferrals { get; set; }
        public int PendingAssessments { get; set; }

        // This Month
        public int MonthTotalSessions { get; set; }
        public int MonthCompletedSessions { get; set; }
        public decimal MonthAttendanceRate { get; set; }
        public int MonthNewPatients { get; set; }
        public int MonthDischarges { get; set; }

        // Outcomes
        public decimal AverageGoalAchievementRate { get; set; }
        public decimal AverageFIMGain { get; set; }

        // By Therapist
        public List<TherapistWorkloadDto> ByTherapist { get; set; }

        // Alerts
        public List<RehabAlertDto> Alerts { get; set; }
    }

    public class TherapistWorkloadDto
    {
        public string TherapistName { get; set; }
        public string Specialty { get; set; }
        public int TodaySessions { get; set; }
        public int ActivePatients { get; set; }
    }

    public class RehabAlertDto
    {
        public string AlertType { get; set; }
        public string PatientName { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
