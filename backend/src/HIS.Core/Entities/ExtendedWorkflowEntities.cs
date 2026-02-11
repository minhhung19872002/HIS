namespace HIS.Core.Entities;

#region Luồng 11: Telemedicine Entities

/// <summary>
/// Lịch hẹn khám từ xa
/// </summary>
public class TeleAppointment : BaseEntity
{
    public string AppointmentCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? SpecialityId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int DurationMinutes { get; set; } = 15;
    public string Status { get; set; } = "Pending"; // Pending, Confirmed, InProgress, Completed, Cancelled
    public string? ChiefComplaint { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual Department? Speciality { get; set; }
    public virtual ICollection<TeleSession>? Sessions { get; set; }
}

/// <summary>
/// Phiên khám video
/// </summary>
public class TeleSession : BaseEntity
{
    public string SessionCode { get; set; } = string.Empty;
    public Guid AppointmentId { get; set; }
    public string RoomId { get; set; } = string.Empty;
    public string Status { get; set; } = "Waiting"; // Waiting, InProgress, Completed, Disconnected
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? RecordingUrl { get; set; }
    public bool IsRecorded { get; set; }
    public string? ConnectionQuality { get; set; }

    // Navigation
    public virtual TeleAppointment? Appointment { get; set; }
    public virtual TeleConsultation? Consultation { get; set; }
    public virtual TelePrescription? Prescription { get; set; }
}

/// <summary>
/// Bản ghi tư vấn khám từ xa
/// </summary>
public class TeleConsultation : BaseEntity
{
    public Guid SessionId { get; set; }
    public string? Symptoms { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Notes { get; set; }
    public bool RequiresFollowUp { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public bool RequiresInPerson { get; set; }
    public string? InPersonReason { get; set; }

    // Navigation
    public virtual TeleSession? Session { get; set; }
}

/// <summary>
/// Đơn thuốc điện tử từ xa
/// </summary>
public class TelePrescription : BaseEntity
{
    public string PrescriptionCode { get; set; } = string.Empty;
    public Guid SessionId { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Signed, SentToPharmacy, Dispensed
    public DateTime PrescriptionDate { get; set; }
    public string? Note { get; set; }
    public string? DigitalSignature { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? QRCode { get; set; }
    public Guid? SentToPharmacyId { get; set; }
    public DateTime? SentToPharmacyAt { get; set; }

    // Navigation
    public virtual TeleSession? Session { get; set; }
    public virtual ICollection<TelePrescriptionItem>? Items { get; set; }
}

public class TelePrescriptionItem : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public int? DurationDays { get; set; }
    public string? Instructions { get; set; }

    // Navigation
    public virtual TelePrescription? Prescription { get; set; }
    public virtual Medicine? Medicine { get; set; }
}

/// <summary>
/// Phản hồi từ bệnh nhân sau khám từ xa
/// </summary>
public class TeleFeedback : BaseEntity
{
    public Guid SessionId { get; set; }
    public Guid PatientId { get; set; }
    public int OverallRating { get; set; } // 1-5
    public int? VideoQualityRating { get; set; }
    public int? DoctorRating { get; set; }
    public int? EaseOfUseRating { get; set; }
    public string? Comments { get; set; }
    public bool WouldRecommend { get; set; }

    // Navigation
    public virtual TeleSession? Session { get; set; }
    public virtual Patient? Patient { get; set; }
}

#endregion

#region Luồng 12: Clinical Nutrition Entities

/// <summary>
/// Sàng lọc dinh dưỡng (NRS-2002, SGA)
/// </summary>
public class NutritionScreening : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public DateTime ScreeningDate { get; set; }
    public Guid ScreenedById { get; set; }

    // Anthropometric
    public decimal Weight { get; set; }
    public decimal Height { get; set; }
    public decimal BMI { get; set; }
    public decimal? WeightLossPercent { get; set; }
    public int? WeightLossPeriodWeeks { get; set; }

    // NRS-2002 Score
    public int NutritionScore { get; set; } // 0-3
    public int DiseaseScore { get; set; } // 0-3
    public int AgeScore { get; set; } // 0-1 (>70 years = 1)
    public int TotalScore { get; set; }

    // SGA Category
    public string? SGACategory { get; set; } // A (Well-nourished), B (Moderate), C (Severe)

    // Result
    public string RiskLevel { get; set; } = "Low"; // Low, Medium, High
    public bool RequiresIntervention { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? ScreenedBy { get; set; }
    public virtual NutritionAssessment? Assessment { get; set; }
}

/// <summary>
/// Đánh giá dinh dưỡng chi tiết
/// </summary>
public class NutritionAssessment : BaseEntity
{
    public Guid ScreeningId { get; set; }
    public DateTime AssessmentDate { get; set; }
    public Guid AssessedById { get; set; }

    // Lab Values
    public decimal? Albumin { get; set; }
    public decimal? Prealbumin { get; set; }
    public decimal? Transferrin { get; set; }
    public decimal? TotalProtein { get; set; }
    public int? TotalLymphocyteCount { get; set; }

    // Energy/Protein Requirements
    public decimal EnergyRequirement { get; set; } // kcal/day
    public decimal ProteinRequirement { get; set; } // g/day
    public decimal FluidRequirement { get; set; } // ml/day
    public string CalculationMethod { get; set; } = "Harris-Benedict"; // Harris-Benedict, Mifflin-St Jeor
    public decimal ActivityFactor { get; set; } = 1.2m;
    public decimal StressFactor { get; set; } = 1.0m;

    // Goals
    public string? NutritionGoals { get; set; }
    public string? InterventionPlan { get; set; }
    public DateTime? NextReviewDate { get; set; }

    // Navigation
    public virtual NutritionScreening? Screening { get; set; }
    public virtual User? AssessedBy { get; set; }
}

/// <summary>
/// Y lệnh chế độ ăn
/// </summary>
public class DietOrder : BaseEntity
{
    public string OrderCode { get; set; } = string.Empty;
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DietTypeId { get; set; }
    public Guid OrderedById { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Discontinued, Completed

    // Texture
    public string? TextureModification { get; set; } // Regular, Soft, Pureed, Liquid
    public string? FluidConsistency { get; set; } // Thin, Nectar, Honey, Pudding

    // Restrictions
    public string? Allergies { get; set; }
    public string? FoodPreferences { get; set; }
    public string? Restrictions { get; set; }

    // Calories target
    public decimal? TargetCalories { get; set; }
    public decimal? TargetProtein { get; set; }

    public string? SpecialInstructions { get; set; }
    public string? DiscontinuationReason { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual DietType? DietType { get; set; }
    public virtual User? OrderedBy { get; set; }
}

/// <summary>
/// Loại chế độ ăn
/// </summary>
public class DietType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NameEnglish { get; set; }
    public string Category { get; set; } = "Regular"; // Regular, Therapeutic, Special
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Nutritional info
    public decimal? BaseCalories { get; set; }
    public string? MacroDistribution { get; set; } // e.g., "Carb:50%, Protein:20%, Fat:30%"
    public string? Restrictions { get; set; }
}

/// <summary>
/// Kế hoạch bữa ăn
/// </summary>
public class MealPlan : BaseEntity
{
    public DateTime Date { get; set; }
    public string MealType { get; set; } = string.Empty; // Breakfast, Lunch, Dinner, Snack
    public Guid? DepartmentId { get; set; }
    public string Status { get; set; } = "Planned"; // Planned, Prepared, Distributed, Completed
    public int TotalPatients { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual ICollection<MealPlanItem>? Items { get; set; }
}

public class MealPlanItem : BaseEntity
{
    public Guid MealPlanId { get; set; }
    public Guid DietOrderId { get; set; }
    public Guid PatientId { get; set; }
    public string? RoomBed { get; set; }
    public bool IsDelivered { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public decimal? IntakePercent { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual MealPlan? MealPlan { get; set; }
    public virtual DietOrder? DietOrder { get; set; }
    public virtual Patient? Patient { get; set; }
}

/// <summary>
/// Theo dõi dinh dưỡng hàng ngày
/// </summary>
public class NutritionMonitoring : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public DateTime Date { get; set; }
    public Guid RecordedById { get; set; }

    // Intake monitoring
    public decimal? BreakfastIntakePercent { get; set; }
    public decimal? LunchIntakePercent { get; set; }
    public decimal? DinnerIntakePercent { get; set; }
    public decimal? SnackIntakePercent { get; set; }
    public decimal? TotalCaloriesConsumed { get; set; }
    public decimal? FluidIntakeMl { get; set; }

    // Weight tracking
    public decimal? CurrentWeight { get; set; }
    public decimal? WeightChange { get; set; }

    // Assessment
    public string? GISymptoms { get; set; } // Nausea, Vomiting, Diarrhea, Constipation
    public string? AppetiteLevel { get; set; } // Good, Fair, Poor
    public string? Notes { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? RecordedBy { get; set; }
}

/// <summary>
/// Y lệnh nuôi ăn tĩnh mạch (TPN)
/// </summary>
public class TPNOrder : BaseEntity
{
    public string OrderCode { get; set; } = string.Empty;
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid OrderedById { get; set; }
    public DateTime OrderDate { get; set; }

    // TPN Components
    public decimal Dextrose { get; set; } // grams
    public decimal AminoAcids { get; set; } // grams
    public decimal Lipids { get; set; } // grams
    public decimal TotalVolume { get; set; } // ml
    public decimal InfusionRate { get; set; } // ml/hour
    public int InfusionHours { get; set; }

    // Electrolytes
    public decimal? Sodium { get; set; }
    public decimal? Potassium { get; set; }
    public decimal? Calcium { get; set; }
    public decimal? Magnesium { get; set; }
    public decimal? Phosphate { get; set; }

    // Vitamins/Trace elements
    public bool AddMultivitamins { get; set; }
    public bool AddTraceElements { get; set; }

    public string Status { get; set; } = "Pending"; // Pending, Mixed, InProgress, Completed
    public string? Notes { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? OrderedBy { get; set; }
}

#endregion

#region Luồng 13: Infection Control Entities

/// <summary>
/// Ca nhiễm khuẩn bệnh viện (HAI)
/// </summary>
public class HAICase : BaseEntity
{
    public string CaseCode { get; set; } = string.Empty;
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public DateTime OnsetDate { get; set; }
    public Guid ReportedById { get; set; }

    // Classification
    public string InfectionType { get; set; } = string.Empty; // SSI, VAP, CAUTI, CLABSI, CDI, Other
    public string InfectionSite { get; set; } = string.Empty;
    public string? Organism { get; set; }
    public bool IsMDRO { get; set; } // Multi-drug resistant organism
    public string? ResistancePattern { get; set; }

    // Device-associated
    public bool IsDeviceAssociated { get; set; }
    public string? DeviceType { get; set; } // Ventilator, Central Line, Urinary Catheter
    public int? DeviceDays { get; set; }

    // Status
    public string Status { get; set; } = "Suspected"; // Suspected, Confirmed, Resolved, Excluded
    public DateTime? ConfirmedDate { get; set; }
    public DateTime? ResolvedDate { get; set; }
    public string? Outcome { get; set; }
    public string? Notes { get; set; }

    // Investigation
    public bool IsInvestigated { get; set; }
    public string? RootCause { get; set; }
    public string? ContributingFactors { get; set; }
    public string? PreventiveMeasures { get; set; }

    // Outbreak linkage
    public Guid? OutbreakId { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? ReportedBy { get; set; }
    public virtual IsolationOrder? IsolationOrder { get; set; }
    public virtual Outbreak? Outbreak { get; set; }
}

/// <summary>
/// Lệnh cách ly
/// </summary>
public class IsolationOrder : BaseEntity
{
    public string OrderCode { get; set; } = string.Empty;
    public Guid? HAICaseId { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid OrderedById { get; set; }

    public string IsolationType { get; set; } = string.Empty; // Contact, Droplet, Airborne, Protective
    public string? Precautions { get; set; } // JSON list of precautions
    public string Reason { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Discontinued

    // Precaution flags
    public bool RequiresGown { get; set; }
    public bool RequiresGloves { get; set; }
    public bool RequiresMask { get; set; }
    public bool RequiresN95 { get; set; }
    public bool RequiresEyeProtection { get; set; }
    public bool RequiresNegativePressure { get; set; }

    public string? SpecialInstructions { get; set; }
    public string? DiscontinuationReason { get; set; }

    // Navigation
    public virtual HAICase? HAICase { get; set; }
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? OrderedBy { get; set; }
}

/// <summary>
/// Giám sát vệ sinh tay
/// </summary>
public class HandHygieneObservation : BaseEntity
{
    public DateTime ObservationDate { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid ObservedById { get; set; }

    public int TotalOpportunities { get; set; }
    public int ComplianceCount { get; set; }
    public decimal ComplianceRate { get; set; }

    // By moment (WHO 5 moments)
    public int? BeforePatientContact { get; set; }
    public int? BeforeAseptic { get; set; }
    public int? AfterBodyFluid { get; set; }
    public int? AfterPatientContact { get; set; }
    public int? AfterEnvironment { get; set; }

    // By profession
    public int? DoctorOpportunities { get; set; }
    public int? DoctorCompliance { get; set; }
    public int? NurseOpportunities { get; set; }
    public int? NurseCompliance { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual User? ObservedBy { get; set; }
}

/// <summary>
/// Sự cố dịch (Outbreak)
/// </summary>
public class Outbreak : BaseEntity
{
    public string OutbreakCode { get; set; } = string.Empty;
    public DateTime DetectionDate { get; set; }
    public Guid DetectedById { get; set; }

    public string Organism { get; set; } = string.Empty;
    public string? SourceSuspected { get; set; }
    public string AffectedAreas { get; set; } = string.Empty;

    public int InitialCases { get; set; }
    public int TotalCases { get; set; }
    public int Deaths { get; set; }

    public string Status { get; set; } = "Active"; // Active, Contained, Resolved
    public DateTime? ContainedDate { get; set; }
    public DateTime? ResolvedDate { get; set; }

    public bool ReportedToAuthority { get; set; }
    public DateTime? ReportedDate { get; set; }

    public string? ControlMeasures { get; set; }
    public string? LessonsLearned { get; set; }

    // Navigation
    public virtual User? DetectedBy { get; set; }
    public virtual ICollection<OutbreakCase>? Cases { get; set; }
}

public class OutbreakCase : BaseEntity
{
    public Guid OutbreakId { get; set; }
    public Guid PatientId { get; set; }
    public Guid? AdmissionId { get; set; }
    public DateTime OnsetDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Recovered, Deceased
    public string? Notes { get; set; }

    // Navigation
    public virtual Outbreak? Outbreak { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual Admission? Admission { get; set; }
}

/// <summary>
/// Giám sát kháng sinh
/// </summary>
public class AntibioticStewardship : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid PrescriptionDetailId { get; set; }

    public string AntibioticName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public int DayOfTherapy { get; set; }

    public bool RequiresReview { get; set; }
    public string? ReviewReason { get; set; } // >7 days, Broad-spectrum, IV-to-PO, De-escalation
    public DateTime? ReviewDate { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewOutcome { get; set; } // Continue, Stop, Switch, De-escalate
    public string? ReviewNotes { get; set; }

    // Navigation
    public virtual Admission? Admission { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? ReviewedBy { get; set; }
}

#endregion

#region Luồng 14: Rehabilitation Entities

/// <summary>
/// Giấy chuyển khoa PHCN
/// </summary>
public class RehabReferral : BaseEntity
{
    public string ReferralCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? AdmissionId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid ReferredById { get; set; }
    public Guid? AcceptedById { get; set; }

    public string RehabType { get; set; } = string.Empty; // PT, OT, ST (Physical, Occupational, Speech)
    public string Diagnosis { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Goals { get; set; }
    public string? Precautions { get; set; }

    public string Status { get; set; } = "Pending"; // Pending, Accepted, Declined, Completed
    public DateTime? AcceptedDate { get; set; }
    public string? DeclineReason { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual Admission? Admission { get; set; }
    public virtual Examination? Examination { get; set; }
    public virtual User? ReferredBy { get; set; }
    public virtual User? AcceptedBy { get; set; }
    public virtual FunctionalAssessment? Assessment { get; set; }
    public virtual RehabTreatmentPlan? TreatmentPlan { get; set; }
}

/// <summary>
/// Đánh giá chức năng
/// </summary>
public class FunctionalAssessment : BaseEntity
{
    public Guid ReferralId { get; set; }
    public DateTime AssessmentDate { get; set; }
    public Guid AssessedById { get; set; }

    // Standard Scales
    public int? BarthelIndex { get; set; } // 0-100
    public int? FIMScore { get; set; } // 18-126
    public int? MoCAScore { get; set; } // 0-30
    public int? BergBalanceScale { get; set; } // 0-56
    public int? TinettiFallRisk { get; set; }

    // Mobility
    public string? MobilityStatus { get; set; } // Bed-bound, Chair, Walk with aid, Independent
    public string? GaitPattern { get; set; }
    public bool RequiresAssistiveDevice { get; set; }
    public string? AssistiveDeviceType { get; set; }

    // Range of Motion
    public string? ROMFindings { get; set; }
    public string? StrengthFindings { get; set; }
    public string? SensoryFindings { get; set; }

    // Communication (for ST)
    public string? SpeechStatus { get; set; }
    public string? SwallowingStatus { get; set; }
    public string? CognitiveStatus { get; set; }

    // ADL
    public string? ADLStatus { get; set; }
    public string? IADLStatus { get; set; }

    // Goals & Plan
    public string? ShortTermGoals { get; set; }
    public string? LongTermGoals { get; set; }
    public string? PlanSummary { get; set; }

    // Navigation
    public virtual RehabReferral? Referral { get; set; }
    public virtual User? AssessedBy { get; set; }
}

/// <summary>
/// Kế hoạch điều trị PHCN
/// </summary>
public class RehabTreatmentPlan : BaseEntity
{
    public string PlanCode { get; set; } = string.Empty;
    public Guid ReferralId { get; set; }
    public Guid CreatedById { get; set; }

    public string RehabType { get; set; } = string.Empty; // PT, OT, ST
    public int PlannedSessions { get; set; }
    public int CompletedSessions { get; set; }
    public string Frequency { get; set; } = string.Empty; // e.g., "3x/week"
    public int DurationMinutesPerSession { get; set; } = 45;

    public DateTime StartDate { get; set; }
    public DateTime? ExpectedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public string Status { get; set; } = "Active"; // Active, OnHold, Completed, Discontinued

    // Goals
    public string? ShortTermGoals { get; set; }
    public string? LongTermGoals { get; set; }
    public string? Interventions { get; set; }
    public string? Precautions { get; set; }

    public string? DiscontinuationReason { get; set; }
    public string? DischargeSummary { get; set; }

    // Navigation
    public virtual RehabReferral? Referral { get; set; }
    public virtual User? CreatedBy { get; set; }
    public virtual ICollection<RehabSession>? Sessions { get; set; }
}

/// <summary>
/// Buổi tập PHCN
/// </summary>
public class RehabSession : BaseEntity
{
    public Guid TreatmentPlanId { get; set; }
    public int SessionNumber { get; set; }
    public DateTime SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public Guid TherapistId { get; set; }

    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Cancelled, NoShow

    // Treatment provided
    public string? InterventionsProvided { get; set; }
    public string? ExercisesPerformed { get; set; }
    public string? ModalitiesUsed { get; set; } // e.g., "Heat, TENS, Ultrasound"

    // Progress
    public string? PatientResponse { get; set; }
    public string? ProgressNotes { get; set; }
    public string? GoalProgress { get; set; } // Making progress, Met, Not met

    public string? CancellationReason { get; set; }
    public string? HomeExercises { get; set; }

    // Navigation
    public virtual RehabTreatmentPlan? TreatmentPlan { get; set; }
    public virtual User? Therapist { get; set; }
}

#endregion

#region Luồng 15: Medical Equipment Entities

/// <summary>
/// Thiết bị y tế
/// </summary>
public class MedicalEquipment : BaseEntity
{
    public string EquipmentCode { get; set; } = string.Empty;
    public string EquipmentName { get; set; } = string.Empty;
    public string? NameEnglish { get; set; }
    public string Category { get; set; } = string.Empty; // Diagnostic, Therapeutic, Monitoring, Surgical
    public string? RiskClass { get; set; } // A, B, C, D (theo NĐ 36)

    // Identification
    public string? SerialNumber { get; set; }
    public string? Model { get; set; }
    public string? Manufacturer { get; set; }
    public string? CountryOfOrigin { get; set; }
    public int? YearOfManufacture { get; set; }

    // Location
    public Guid? DepartmentId { get; set; }
    public string? Location { get; set; }

    // Acquisition
    public DateTime? PurchaseDate { get; set; }
    public decimal? PurchasePrice { get; set; }
    public string? PurchaseSource { get; set; }
    public DateTime? WarrantyExpiry { get; set; }

    // Status
    public string Status { get; set; } = "Active"; // Active, InMaintenance, OutOfService, Decommissioned
    public string? StatusReason { get; set; }
    public DateTime? LastMaintenanceDate { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }
    public DateTime? LastCalibrationDate { get; set; }
    public DateTime? NextCalibrationDate { get; set; }

    // Runtime
    public int? TotalRuntimeHours { get; set; }
    public int? UsageCount { get; set; }

    // Lifecycle
    public int? ExpectedLifeYears { get; set; }
    public DateTime? DecommissionDate { get; set; }
    public string? DecommissionReason { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual ICollection<MaintenanceRecord>? MaintenanceRecords { get; set; }
    public virtual ICollection<CalibrationRecord>? CalibrationRecords { get; set; }
    public virtual ICollection<RepairRequest>? RepairRequests { get; set; }
}

/// <summary>
/// Bản ghi bảo trì
/// </summary>
public class MaintenanceRecord : BaseEntity
{
    public Guid EquipmentId { get; set; }
    public string MaintenanceType { get; set; } = string.Empty; // Preventive, Corrective
    public DateTime ScheduledDate { get; set; }
    public DateTime? PerformedDate { get; set; }
    public Guid? PerformedById { get; set; }

    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Overdue

    // Work done
    public string? WorkDescription { get; set; }
    public string? PartsReplaced { get; set; }
    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? TotalCost { get; set; }

    // Service provider
    public bool IsInternal { get; set; } // Internal or external vendor
    public string? VendorName { get; set; }
    public string? ServiceReportNumber { get; set; }

    // Result
    public string? Findings { get; set; }
    public string? Recommendations { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }

    // Navigation
    public virtual MedicalEquipment? Equipment { get; set; }
    public virtual User? PerformedBy { get; set; }
}

/// <summary>
/// Bản ghi kiểm định/hiệu chuẩn
/// </summary>
public class CalibrationRecord : BaseEntity
{
    public Guid EquipmentId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? PerformedDate { get; set; }
    public string? PerformedBy { get; set; } // External calibration service

    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Failed, Overdue

    // Calibration details
    public string? CertificateNumber { get; set; }
    public string? CalibrationStandard { get; set; }
    public bool PassedCalibration { get; set; }
    public string? DeviationFindings { get; set; }
    public string? AdjustmentsMade { get; set; }

    // Cost
    public decimal? CalibrationCost { get; set; }

    // Validity
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public DateTime? NextCalibrationDate { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public virtual MedicalEquipment? Equipment { get; set; }
}

/// <summary>
/// Yêu cầu sửa chữa
/// </summary>
public class RepairRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid EquipmentId { get; set; }
    public Guid RequestedById { get; set; }
    public Guid? DepartmentId { get; set; }

    public DateTime RequestDate { get; set; }
    public string ProblemDescription { get; set; } = string.Empty;
    public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent

    public string Status { get; set; } = "Pending"; // Pending, Assigned, InProgress, Completed, Cancelled

    // Assignment
    public Guid? AssignedToId { get; set; }
    public DateTime? AssignedDate { get; set; }

    // Repair work
    public DateTime? StartedDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string? DiagnosisFindings { get; set; }
    public string? RepairActions { get; set; }
    public string? PartsUsed { get; set; }

    // Cost
    public decimal? PartsCost { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? ExternalServiceCost { get; set; }
    public decimal? TotalCost { get; set; }

    // Result
    public bool IsRepaired { get; set; }
    public string? UnrepairableReason { get; set; }
    public bool RecommendReplacement { get; set; }

    // Navigation
    public virtual MedicalEquipment? Equipment { get; set; }
    public virtual Department? Department { get; set; }
    public virtual User? RequestedBy { get; set; }
    public virtual User? AssignedTo { get; set; }
}

#endregion

#region Luồng 16: Medical HR Entities

/// <summary>
/// Nhân viên y tế (mở rộng từ User)
/// </summary>
public class MedicalStaff : BaseEntity
{
    public Guid UserId { get; set; }
    public string StaffCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string StaffType { get; set; } = string.Empty; // Doctor, Nurse, Technician, Pharmacist, Other

    // Qualifications
    public string? HighestDegree { get; set; }
    public string? Specialty { get; set; }
    public string? SubSpecialty { get; set; }
    public int? YearsOfExperience { get; set; }

    // License
    public string? LicenseNumber { get; set; } // Số CCHN
    public DateTime? LicenseIssueDate { get; set; }
    public DateTime? LicenseExpiryDate { get; set; }
    public string? LicenseIssuedBy { get; set; }
    public bool LicenseActive { get; set; } = true;

    // Department assignment
    public Guid? PrimaryDepartmentId { get; set; }
    public Guid? SecondaryDepartmentId { get; set; }

    // Contact
    public string? PersonalPhone { get; set; }
    public string? WorkPhone { get; set; }
    public string? PersonalEmail { get; set; }

    // Status
    public string Status { get; set; } = "Active"; // Active, OnLeave, Suspended, Resigned
    public DateTime? JoinDate { get; set; }
    public DateTime? TerminationDate { get; set; }

    // Navigation
    public virtual User? User { get; set; }
    public virtual Department? PrimaryDepartment { get; set; }
    public virtual Department? SecondaryDepartment { get; set; }
    public virtual ICollection<StaffQualification>? Qualifications { get; set; }
    public virtual ICollection<CMERecord>? CMERecords { get; set; }
}

/// <summary>
/// Bằng cấp/Chứng chỉ của nhân viên
/// </summary>
public class StaffQualification : BaseEntity
{
    public Guid StaffId { get; set; }
    public string QualificationType { get; set; } = string.Empty; // Degree, Certificate, License, Training
    public string Name { get; set; } = string.Empty;
    public string? IssuedBy { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? DocumentPath { get; set; }
    public bool IsVerified { get; set; }

    // Navigation
    public virtual MedicalStaff? Staff { get; set; }
}

/// <summary>
/// Lịch trực
/// </summary>
public class DutyRoster : BaseEntity
{
    public Guid DepartmentId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Published, Locked
    public Guid CreatedById { get; set; }
    public DateTime? PublishedAt { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual User? CreatedBy { get; set; }
    public virtual ICollection<DutyShift>? Shifts { get; set; }
}

/// <summary>
/// Ca trực
/// </summary>
public class DutyShift : BaseEntity
{
    public Guid DutyRosterId { get; set; }
    public Guid StaffId { get; set; }
    public DateTime ShiftDate { get; set; }
    public string ShiftType { get; set; } = string.Empty; // Morning, Afternoon, Night, OnCall
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public string Status { get; set; } = "Scheduled"; // Scheduled, Confirmed, Completed, Swapped, Absent

    // Swap
    public Guid? SwappedWithId { get; set; }
    public string? SwapReason { get; set; }
    public bool SwapApproved { get; set; }

    // Attendance
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string? AttendanceNotes { get; set; }

    // Navigation
    public virtual DutyRoster? DutyRoster { get; set; }
    public virtual MedicalStaff? Staff { get; set; }
    public virtual MedicalStaff? SwappedWith { get; set; }
}

/// <summary>
/// Phân công phòng khám
/// </summary>
public class ClinicAssignment : BaseEntity
{
    public DateTime AssignmentDate { get; set; }
    public Guid RoomId { get; set; }
    public Guid StaffId { get; set; }
    public string ShiftType { get; set; } = string.Empty; // Morning, Afternoon, All-day
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public int? MaxPatients { get; set; }
    public string Status { get; set; } = "Active"; // Active, Cancelled
    public string? Notes { get; set; }

    // Navigation
    public virtual Room? Room { get; set; }
    public virtual MedicalStaff? Staff { get; set; }
}

/// <summary>
/// Đào tạo liên tục (CME)
/// </summary>
public class CMERecord : BaseEntity
{
    public Guid StaffId { get; set; }
    public string ActivityName { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty; // Conference, Workshop, Online, Self-study
    public DateTime ActivityDate { get; set; }
    public int CreditHours { get; set; }
    public string? Provider { get; set; }
    public string? CertificateNumber { get; set; }
    public string? DocumentPath { get; set; }
    public bool IsVerified { get; set; }

    // Navigation
    public virtual MedicalStaff? Staff { get; set; }
}

#endregion

#region Luồng 17: Quality Management Entities

/// <summary>
/// Chỉ số chất lượng
/// </summary>
public class QualityIndicator : BaseEntity
{
    public string IndicatorCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Clinical, Safety, Patient Experience, Operational
    public string? Description { get; set; }

    // Measurement
    public string MeasurementType { get; set; } = "Percentage"; // Percentage, Count, Rate, Average
    public string? NumeratorDefinition { get; set; }
    public string? DenominatorDefinition { get; set; }
    public string MeasurementFrequency { get; set; } = "Monthly"; // Daily, Weekly, Monthly, Quarterly

    // Targets
    public decimal? TargetValue { get; set; }
    public decimal? ThresholdLow { get; set; } // Below this = Critical
    public decimal? ThresholdHigh { get; set; } // Above this = Critical (for some indicators)
    public string ThresholdDirection { get; set; } = "HigherIsBetter"; // HigherIsBetter, LowerIsBetter

    // Standard reference
    public string? StandardReference { get; set; } // JCI, ISO, BYT 83 criteria

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Giá trị chỉ số theo kỳ
/// </summary>
public class QualityIndicatorValue : BaseEntity
{
    public Guid IndicatorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    public decimal? Numerator { get; set; }
    public decimal? Denominator { get; set; }
    public decimal Value { get; set; }

    public string Status { get; set; } = "Normal"; // Critical, Warning, Normal, Excellent
    public decimal? Trend { get; set; } // % change from previous period

    public Guid? RecordedById { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual QualityIndicator? Indicator { get; set; }
    public virtual Department? Department { get; set; }
    public virtual User? RecordedBy { get; set; }
}

/// <summary>
/// Báo cáo sự cố
/// </summary>
public class IncidentReport : BaseEntity
{
    public string ReportCode { get; set; } = string.Empty;
    public DateTime IncidentDate { get; set; }
    public DateTime ReportDate { get; set; }
    public Guid ReportedById { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? PatientId { get; set; }

    // Classification
    public string IncidentType { get; set; } = string.Empty; // Medication, Fall, Infection, Equipment, Process, Other
    public string Severity { get; set; } = "Minor"; // Near-miss, Minor, Moderate, Major, Catastrophic
    public string HarmLevel { get; set; } = "None"; // None, Temporary, Permanent, Death

    // Description
    public string Description { get; set; } = string.Empty;
    public string? ImmediateActions { get; set; }
    public string? ContributingFactors { get; set; }

    // Investigation
    public string Status { get; set; } = "Reported"; // Reported, UnderInvestigation, RCAComplete, ActionPlan, Closed
    public Guid? InvestigatorId { get; set; }
    public DateTime? InvestigationStartDate { get; set; }
    public DateTime? InvestigationEndDate { get; set; }

    // RCA
    public string? RootCause { get; set; }
    public string? RCAMethod { get; set; } // 5 Whys, Fishbone, FMEA

    public bool IsAnonymous { get; set; }
    public bool ReportedToAuthority { get; set; }

    // Navigation
    public virtual User? ReportedBy { get; set; }
    public virtual Department? Department { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? Investigator { get; set; }
    public virtual ICollection<CAPA>? CAPAs { get; set; }
}

/// <summary>
/// Hành động khắc phục/phòng ngừa (CAPA)
/// </summary>
public class CAPA : BaseEntity
{
    public string CAPACode { get; set; } = string.Empty;
    public Guid? IncidentReportId { get; set; }
    public Guid? AuditFindingId { get; set; }
    public string Source { get; set; } = string.Empty; // Incident, Audit, Complaint, Proactive

    public string Type { get; set; } = "Corrective"; // Corrective, Preventive
    public string ActionDescription { get; set; } = string.Empty;
    public string? ExpectedOutcome { get; set; }

    public Guid AssignedToId { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }

    public string Status { get; set; } = "Open"; // Open, InProgress, PendingVerification, Closed, Overdue
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical

    // Verification
    public bool IsEffective { get; set; }
    public Guid? VerifiedById { get; set; }
    public DateTime? VerifiedDate { get; set; }
    public string? VerificationNotes { get; set; }

    // Navigation
    public virtual IncidentReport? IncidentReport { get; set; }
    public virtual User? AssignedTo { get; set; }
    public virtual User? VerifiedBy { get; set; }
}

/// <summary>
/// Kế hoạch audit
/// </summary>
public class AuditPlan : BaseEntity
{
    public string AuditCode { get; set; } = string.Empty;
    public string AuditName { get; set; } = string.Empty;
    public string AuditType { get; set; } = string.Empty; // Internal, External, Surveillance
    public string Standard { get; set; } = string.Empty; // ISO 9001, JCI, BYT 83

    public int Year { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public string Status { get; set; } = "Planned"; // Planned, InProgress, Completed, Cancelled

    public Guid LeadAuditorId { get; set; }
    public string? AuditTeam { get; set; }
    public string? ScopeDescription { get; set; }
    public string? DepartmentsAudited { get; set; }

    // Results
    public int? TotalFindings { get; set; }
    public int? MajorNonconformities { get; set; }
    public int? MinorNonconformities { get; set; }
    public int? Observations { get; set; }
    public string? SummaryReport { get; set; }

    // Navigation
    public virtual User? LeadAuditor { get; set; }
}

/// <summary>
/// Khảo sát hài lòng
/// </summary>
public class SatisfactionSurvey : BaseEntity
{
    public Guid? PatientId { get; set; }
    public Guid? VisitId { get; set; }
    public string SurveyType { get; set; } = string.Empty; // Outpatient, Inpatient, Emergency
    public Guid? DepartmentId { get; set; }
    public DateTime SurveyDate { get; set; }

    // Ratings (1-5 scale)
    public int? OverallRating { get; set; }
    public int? WaitTimeRating { get; set; }
    public int? StaffCourtesyRating { get; set; }
    public int? CommunicationRating { get; set; }
    public int? CleanlinessRating { get; set; }
    public int? FacilitiesRating { get; set; }

    public bool WouldRecommend { get; set; }
    public string? PositiveFeedback { get; set; }
    public string? NegativeFeedback { get; set; }
    public string? Suggestions { get; set; }

    public bool IsAnonymous { get; set; }
    public bool RequiresFollowUp { get; set; }
    public bool FollowedUp { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual Department? Department { get; set; }
}

#endregion

#region Luồng 18: Patient Portal Entities

/// <summary>
/// Tài khoản bệnh nhân trên portal
/// </summary>
public class PortalAccount : BaseEntity
{
    public Guid PatientId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    // Verification
    public bool IsEmailVerified { get; set; }
    public bool IsPhoneVerified { get; set; }
    public bool IsKYCVerified { get; set; }
    public string? KYCDocumentType { get; set; }
    public string? KYCDocumentNumber { get; set; }

    // Status
    public string Status { get; set; } = "Active"; // Active, Suspended, Locked
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }

    // Preferences
    public bool ReceiveEmailNotifications { get; set; } = true;
    public bool ReceiveSMSNotifications { get; set; } = true;
    public string? PreferredLanguage { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

/// <summary>
/// Lịch hẹn đặt qua portal
/// </summary>
public class PortalAppointment : BaseEntity
{
    public string BookingCode { get; set; } = string.Empty;
    public Guid PortalAccountId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }

    public DateTime AppointmentDate { get; set; }
    public TimeSpan SlotTime { get; set; }

    public string Status { get; set; } = "Pending"; // Pending, Confirmed, CheckedIn, Completed, Cancelled, NoShow
    public string? ChiefComplaint { get; set; }

    // Payment
    public bool IsPaid { get; set; }
    public decimal? BookingFee { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentReference { get; set; }
    public DateTime? PaidAt { get; set; }

    // Cancellation
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public bool IsRefunded { get; set; }

    // Check-in
    public DateTime? CheckedInAt { get; set; }
    public string? QueueNumber { get; set; }

    // Reminder
    public bool ReminderSent { get; set; }
    public DateTime? ReminderSentAt { get; set; }

    // Navigation
    public virtual PortalAccount? PortalAccount { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual Department? Department { get; set; }
    public virtual User? Doctor { get; set; }
}

/// <summary>
/// Thanh toán online
/// </summary>
public class OnlinePayment : BaseEntity
{
    public string TransactionCode { get; set; } = string.Empty;
    public Guid PortalAccountId { get; set; }
    public Guid PatientId { get; set; }

    public string PaymentType { get; set; } = string.Empty; // Booking, Invoice, Deposit
    public Guid? ReferenceId { get; set; } // Appointment ID or Invoice ID

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string PaymentMethod { get; set; } = string.Empty; // VNPay, Momo, ZaloPay, BankTransfer

    public string Status { get; set; } = "Pending"; // Pending, Processing, Completed, Failed, Refunded

    // Gateway response
    public string? GatewayTransactionId { get; set; }
    public string? GatewayResponse { get; set; }
    public DateTime? PaidAt { get; set; }

    // Refund
    public bool IsRefunded { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime? RefundedAt { get; set; }
    public string? RefundReason { get; set; }

    // Navigation
    public virtual PortalAccount? PortalAccount { get; set; }
    public virtual Patient? Patient { get; set; }
}

#endregion

#region Luồng 19: Health Information Exchange Entities

/// <summary>
/// Kết nối liên thông
/// </summary>
public class HIEConnection : BaseEntity
{
    public string ConnectionName { get; set; } = string.Empty;
    public string ConnectionType { get; set; } = string.Empty; // BHXH, BYT, SYT, Hospital
    public string EndpointUrl { get; set; } = string.Empty;

    // Authentication
    public string AuthType { get; set; } = "OAuth2"; // OAuth2, APIKey, Certificate
    public string? ClientId { get; set; }
    public string? ClientSecretEncrypted { get; set; }
    public string? CertificatePath { get; set; }

    public string Status { get; set; } = "Active"; // Active, Inactive, Error
    public DateTime? LastSuccessfulConnection { get; set; }
    public DateTime? LastFailedConnection { get; set; }
    public string? LastErrorMessage { get; set; }

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Gửi XML BHXH
/// </summary>
public class InsuranceXMLSubmission : BaseEntity
{
    public string SubmissionCode { get; set; } = string.Empty;
    public string XMLType { get; set; } = string.Empty; // 4210, 130, 4750, 3176
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
    public Guid? DepartmentId { get; set; }

    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Generated"; // Generated, Validated, Submitted, Accepted, Rejected
    public DateTime GeneratedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ResponseAt { get; set; }

    public string? FilePath { get; set; }
    public string? Checksum { get; set; }

    public Guid? SubmittedById { get; set; }
    public string? PortalTransactionId { get; set; }
    public string? PortalResponse { get; set; }

    public int? AcceptedRecords { get; set; }
    public int? RejectedRecords { get; set; }
    public string? RejectionReasons { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual User? SubmittedBy { get; set; }
}

/// <summary>
/// Chuyển viện điện tử
/// </summary>
public class ElectronicReferral : BaseEntity
{
    public string ReferralCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public Guid? AdmissionId { get; set; }

    // From
    public string FromFacilityCode { get; set; } = string.Empty;
    public string FromFacilityName { get; set; } = string.Empty;
    public Guid ReferredById { get; set; }

    // To
    public string ToFacilityCode { get; set; } = string.Empty;
    public string ToFacilityName { get; set; } = string.Empty;
    public string? ToDepartment { get; set; }

    // Clinical info
    public string Diagnosis { get; set; } = string.Empty;
    public string? IcdCodes { get; set; }
    public string ReferralReason { get; set; } = string.Empty;
    public string? ClinicalSummary { get; set; }
    public string? TreatmentGiven { get; set; }
    public string? AttachedDocuments { get; set; }

    public string Status { get; set; } = "Sent"; // Sent, Received, Accepted, Declined
    public DateTime SentAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime? ResponseAt { get; set; }
    public string? ResponseMessage { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? ReferredBy { get; set; }
}

/// <summary>
/// Hội chẩn từ xa
/// </summary>
public class TeleconsultationRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? AdmissionId { get; set; }

    // Requesting facility
    public string RequestingFacilityCode { get; set; } = string.Empty;
    public string RequestingFacilityName { get; set; } = string.Empty;
    public Guid RequestedById { get; set; }

    // Consulting facility
    public string ConsultingFacilityCode { get; set; } = string.Empty;
    public string ConsultingFacilityName { get; set; } = string.Empty;
    public string? ConsultingSpecialty { get; set; }

    // Case info
    public string CaseDescription { get; set; } = string.Empty;
    public string? Diagnosis { get; set; }
    public string ConsultationQuestion { get; set; } = string.Empty;
    public string? AttachedFiles { get; set; }
    public string Urgency { get; set; } = "Routine"; // Routine, Urgent, Emergency

    public string Status { get; set; } = "Requested"; // Requested, Scheduled, InProgress, Completed, Cancelled

    // Session
    public DateTime? ScheduledDateTime { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? SessionUrl { get; set; }

    // Response
    public string? ConsultantName { get; set; }
    public string? ConsultationOpinion { get; set; }
    public string? Recommendations { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? RequestedBy { get; set; }
}

#endregion

#region Luồng 20: Mass Casualty Incident Entities

/// <summary>
/// Sự kiện thảm họa
/// </summary>
public class MCIEvent : BaseEntity
{
    public string EventCode { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty; // Accident, NaturalDisaster, Fire, Chemical, Violence, Other
    public string EventLocation { get; set; } = string.Empty;

    public DateTime AlertReceivedAt { get; set; }
    public DateTime ActivatedAt { get; set; }
    public DateTime? DeactivatedAt { get; set; }

    public string AlertLevel { get; set; } = "Yellow"; // Yellow (5-10), Orange (10-50), Red (>50)
    public int EstimatedVictims { get; set; }
    public int ActualVictims { get; set; }

    public string Status { get; set; } = "Active"; // Active, Standby, Deactivated
    public Guid IncidentCommanderId { get; set; }

    // Resources
    public int BedsActivated { get; set; }
    public int StaffMobilized { get; set; }
    public bool BloodBankAlerted { get; set; }
    public bool ORsCleared { get; set; }

    // Reporting
    public bool ReportedToAuthority { get; set; }
    public DateTime? ReportedAt { get; set; }
    public string? AfterActionReport { get; set; }

    // Navigation
    public virtual User? IncidentCommander { get; set; }
    public virtual ICollection<MCIVictim>? Victims { get; set; }
    public virtual ICollection<MCISituationReport>? SituationReports { get; set; }
}

/// <summary>
/// Nạn nhân trong thảm họa
/// </summary>
public class MCIVictim : BaseEntity
{
    public Guid MCIEventId { get; set; }
    public string TagNumber { get; set; } = string.Empty; // Unique tag in this event

    // Identity
    public Guid? PatientId { get; set; } // May be null initially (unidentified)
    public string? Name { get; set; }
    public int? EstimatedAge { get; set; }
    public string? Gender { get; set; }
    public string? IdentifyingFeatures { get; set; }

    // Triage
    public DateTime ArrivalTime { get; set; }
    public string TriageCategory { get; set; } = string.Empty; // Red, Yellow, Green, Black
    public DateTime? TriageTime { get; set; }
    public Guid? TriagedById { get; set; }
    public string? TriageNotes { get; set; }

    // Triage assessment (START)
    public bool? CanWalk { get; set; }
    public int? RespiratoryRate { get; set; }
    public bool? HasRadialPulse { get; set; }
    public bool? FollowsCommands { get; set; }

    // Injuries
    public string? InjuryDescription { get; set; }
    public string? BodyAreasAffected { get; set; }

    // Status tracking
    public string CurrentLocation { get; set; } = string.Empty; // Triage, ED, OR, ICU, Ward, Morgue
    public string Status { get; set; } = "Active"; // Active, Admitted, Discharged, Transferred, Deceased

    // Treatment
    public string? InitialTreatment { get; set; }
    public Guid? AdmissionId { get; set; }

    // Family contact
    public bool FamilyNotified { get; set; }
    public string? FamilyContactName { get; set; }
    public string? FamilyContactPhone { get; set; }
    public DateTime? FamilyNotifiedAt { get; set; }

    // Navigation
    public virtual MCIEvent? MCIEvent { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? TriagedBy { get; set; }
    public virtual Admission? Admission { get; set; }
}

/// <summary>
/// Báo cáo tình hình
/// </summary>
public class MCISituationReport : BaseEntity
{
    public Guid MCIEventId { get; set; }
    public int ReportNumber { get; set; }
    public DateTime ReportTime { get; set; }
    public Guid ReportedById { get; set; }

    // Victim counts
    public int TotalArrived { get; set; }
    public int RedCount { get; set; }
    public int YellowCount { get; set; }
    public int GreenCount { get; set; }
    public int BlackCount { get; set; }

    // Status counts
    public int InED { get; set; }
    public int InOR { get; set; }
    public int InICU { get; set; }
    public int Admitted { get; set; }
    public int Discharged { get; set; }
    public int Transferred { get; set; }
    public int Deceased { get; set; }

    // Resources
    public int BedsAvailable { get; set; }
    public int ORsInUse { get; set; }
    public int VentilatorsInUse { get; set; }
    public string? BloodSupplyStatus { get; set; }
    public string? CriticalSupplyIssues { get; set; }

    // Staffing
    public int DoctorsOnDuty { get; set; }
    public int NursesOnDuty { get; set; }

    public string? Comments { get; set; }
    public string? ImmediateNeeds { get; set; }

    // Navigation
    public virtual MCIEvent? MCIEvent { get; set; }
    public virtual User? ReportedBy { get; set; }
}

#endregion
