namespace HIS.Core.Entities;

// ========================
// Module 1: Giám định Y khoa (Medical Forensics)
// ========================

public class ForensicCase : BaseEntity
{
    public string CaseCode { get; set; } = string.Empty;
    public string CaseType { get; set; } = string.Empty; // disability/driver/employment/insurance/court
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Cccd { get; set; }
    public string? RequestingOrganization { get; set; }
    public DateTime? RequestDate { get; set; }
    public DateTime? ExaminationDate { get; set; }
    public int Status { get; set; } // 0=pending, 1=examining, 2=completed, 3=approved
    public string? CouncilMembers { get; set; } // JSON
    public decimal? DisabilityPercentage { get; set; }
    public string? Conclusion { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual ICollection<ForensicExamination> Examinations { get; set; } = new List<ForensicExamination>();
}

public class ForensicExamination : BaseEntity
{
    public Guid ForensicCaseId { get; set; }
    public string ExamCategory { get; set; } = string.Empty; // general/musculoskeletal/neuro/eye/ent/mental/cardio/respiratory
    public string? Findings { get; set; }
    public int? FunctionScore { get; set; }
    public int? DisabilityScore { get; set; }
    public string? ExaminerName { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual ForensicCase? ForensicCase { get; set; }
}

// ========================
// Module 2: Y học cổ truyền (Traditional Medicine)
// ========================

public class TraditionalMedicineTreatment : BaseEntity
{
    public string TreatmentCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string TreatmentType { get; set; } = string.Empty; // acupuncture/herbal/massage/cupping/moxibustion/combined
    public string? DiagnosisTCM { get; set; }
    public string? DiagnosisWestern { get; set; }
    public int SessionNumber { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Practitioner { get; set; }
    public int Status { get; set; } // 0=active, 1=completed, 2=cancelled
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual ICollection<HerbalPrescription> HerbalPrescriptions { get; set; } = new List<HerbalPrescription>();
}

public class HerbalPrescription : BaseEntity
{
    public Guid TreatmentId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public string? HerbalFormula { get; set; }
    public string? Ingredients { get; set; } // JSON array
    public string? Dosage { get; set; }
    public string? Instructions { get; set; }
    public int Duration { get; set; } // days
    public int Quantity { get; set; } // doses
    public string? Notes { get; set; }

    // Navigation
    public virtual TraditionalMedicineTreatment? Treatment { get; set; }
}

// ========================
// Module 3: Sức khỏe sinh sản (Reproductive Health)
// ========================

public class PrenatalRecord : BaseEntity
{
    public string RecordCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int Gravida { get; set; }
    public int Para { get; set; }
    public int GestationalAge { get; set; } // weeks
    public DateTime? ExpectedDeliveryDate { get; set; }
    public DateTime? LastMenstrualPeriod { get; set; }
    public string? BloodType { get; set; }
    public string? RhFactor { get; set; }
    public decimal? CurrentWeight { get; set; }
    public decimal? PrePregnancyWeight { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? FetalHeartRate { get; set; }
    public decimal? FundalHeight { get; set; }
    public string RiskLevel { get; set; } = "low"; // low/medium/high
    public string? RiskFactors { get; set; }
    public string? ScreeningResults { get; set; } // JSON
    public DateTime? NextAppointment { get; set; }
    public int Status { get; set; } // 0=active, 1=delivered, 2=postpartum, 3=closed
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

public class FamilyPlanningRecord : BaseEntity
{
    public string RecordCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string Method { get; set; } = string.Empty; // iud/implant/pill/injection/condom/sterilization/natural/none
    public DateTime? StartDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public string? SideEffects { get; set; }
    public int Status { get; set; } // 0=active, 1=discontinued, 2=switched
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

// ========================
// Module 4: Sức khỏe tâm thần (Mental Health)
// ========================

public class MentalHealthCase : BaseEntity
{
    public string CaseCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? DiagnosisCode { get; set; } // ICD
    public string? DiagnosisName { get; set; }
    public string Severity { get; set; } = "moderate"; // mild/moderate/severe
    public string CaseType { get; set; } = string.Empty; // schizophrenia/depression/anxiety/bipolar/ptsd/substance/other
    public string? TreatingDoctor { get; set; }
    public string? CommunityWorker { get; set; }
    public string? MedicationRegimen { get; set; }
    public string AdherenceLevel { get; set; } = "fair"; // good/fair/poor
    public DateTime? LastVisitDate { get; set; }
    public DateTime? NextVisitDate { get; set; }
    public int Status { get; set; } // 0=active, 1=stable, 2=remission, 3=discharged
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual ICollection<PsychiatricAssessment> Assessments { get; set; } = new List<PsychiatricAssessment>();
}

public class PsychiatricAssessment : BaseEntity
{
    public Guid CaseId { get; set; }
    public DateTime AssessmentDate { get; set; }
    public string AssessmentType { get; set; } = string.Empty; // phq9/gad7/bdi/mmse/panss/custom
    public int TotalScore { get; set; }
    public string? Interpretation { get; set; }
    public string? Findings { get; set; }
    public string? Recommendations { get; set; }
    public string? AssessorName { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual MentalHealthCase? Case { get; set; }
}

// ========================
// Module 5: Quản lý môi trường y tế (Environmental Health)
// ========================

public class WasteRecord : BaseEntity
{
    public string RecordCode { get; set; } = string.Empty;
    public DateTime RecordDate { get; set; }
    public string WasteType { get; set; } = string.Empty; // infectious/sharp/chemical/pharmaceutical/radioactive/general
    public decimal Quantity { get; set; } // kg
    public string? DisposalMethod { get; set; } // autoclave/incineration/chemical/landfill/return
    public DateTime? DisposalDate { get; set; }
    public string? DisposedBy { get; set; }
    public string? CollectorName { get; set; }
    public string? CollectorLicense { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; } // 0=pending, 1=collected, 2=disposed, 3=verified

    // Navigation
    public virtual Department? Department { get; set; }
}

public class EnvironmentalMonitoring : BaseEntity
{
    public string MonitoringCode { get; set; } = string.Empty;
    public DateTime MonitoringDate { get; set; }
    public string MonitoringType { get; set; } = string.Empty; // air/water/noise/radiation/temperature/humidity
    public string? Location { get; set; }
    public decimal MeasuredValue { get; set; }
    public string? Unit { get; set; }
    public decimal? StandardLimit { get; set; }
    public bool IsCompliant { get; set; }
    public string? InstrumentUsed { get; set; }
    public string? MeasuredBy { get; set; }
    public string? Notes { get; set; }
}

// ========================
// Module 6: Sổ chấn thương (Trauma Registry)
// ========================

public class TraumaCase : BaseEntity
{
    public string CaseCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public DateTime? InjuryDate { get; set; }
    public string InjuryType { get; set; } = string.Empty; // road_traffic/fall/assault/burn/drowning/workplace/sport/other
    public string? InjuryMechanism { get; set; }
    public string? InjuryLocation { get; set; } // body part
    public int? InjurySeverityScore { get; set; } // ISS
    public decimal? RevisedTraumaScore { get; set; } // RTS
    public int? GlasgowComaScale { get; set; } // GCS
    public string? TriageCategory { get; set; } // red/yellow/green/black
    public string? Intentionality { get; set; } // unintentional/self_harm/assault/undetermined
    public bool AlcoholInvolved { get; set; }
    public string? TransportMode { get; set; } // ambulance/private/walk_in/police/helicopter
    public int? PreHospitalTime { get; set; } // minutes
    public bool SurgeryRequired { get; set; }
    public bool IcuAdmission { get; set; }
    public int? VentilatorDays { get; set; }
    public int? LengthOfStay { get; set; } // days
    public string? Outcome { get; set; } // discharged/transferred/died/absconded
    public DateTime? DischargeDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

// ========================
// Module 7: Dân số - KHHGĐ (Population Health)
// ========================

public class PopulationRecord : BaseEntity
{
    public string RecordCode { get; set; } = string.Empty;
    public string RecordType { get; set; } = string.Empty; // family_planning/elderly_care/birth_report/population_survey
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Gender { get; set; }
    public string? Ward { get; set; }
    public string? District { get; set; }
    public DateTime? ServiceDate { get; set; }
    public string? ServiceType { get; set; }
    public string? Provider { get; set; }
    public string? FacilityName { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public int Status { get; set; } // 0=active, 1=completed, 2=cancelled
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

// ========================
// Module 8: Truyền thông GDSK (Health Education)
// ========================

public class HealthCampaign : BaseEntity
{
    public string CampaignCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CampaignType { get; set; } = string.Empty; // disease_prevention/ncd/maternal/child/nutrition/mental_health/other
    public string? TargetAudience { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Location { get; set; }
    public string? Organizer { get; set; }
    public int? ParticipantCount { get; set; }
    public decimal? Budget { get; set; }
    public int Status { get; set; } // 0=planned, 1=ongoing, 2=completed, 3=cancelled
    public string? Outcomes { get; set; }
    public string? Notes { get; set; }
}

public class HealthEducationMaterial : BaseEntity
{
    public string MaterialCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string MaterialType { get; set; } = string.Empty; // poster/leaflet/video/presentation/manual
    public string? Topic { get; set; }
    public string Language { get; set; } = "vi";
    public string? FilePath { get; set; }
    public long? FileSize { get; set; }
    public int Downloads { get; set; }
    public bool IsActive { get; set; } = true;
}

// ========================
// Module 9: Quản lý hành nghề (Practice License Management)
// ========================

public class PracticeLicense : BaseEntity
{
    public string LicenseCode { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty; // doctor/nurse/pharmacist/technician/midwife/traditional_medicine
    public string HolderName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Cccd { get; set; }
    public string? Specialty { get; set; }
    public string? IssuingAuthority { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int Status { get; set; } // 0=active, 1=expired, 2=suspended, 3=revoked
    public Guid? FacilityId { get; set; }
    public string? FacilityName { get; set; }
    public string? CertificateNumber { get; set; }
    public string? TrainingInstitution { get; set; }
    public int? GraduationYear { get; set; }
    public string? Notes { get; set; }
}

// ========================
// Module 10: Chia sẻ dữ liệu liên viện (Inter-Hospital Sharing)
// ========================

public class InterHospitalRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty; // drug_lookup/ecpr/patient_transfer/consultation/record_sharing
    public string? RequestingFacility { get; set; }
    public string? ReceivingFacility { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string Urgency { get; set; } = "routine"; // routine/urgent/emergency
    public DateTime? RequestDate { get; set; }
    public DateTime? ResponseDate { get; set; }
    public int Status { get; set; } // 0=pending, 1=accepted, 2=rejected, 3=completed, 4=expired
    public string? RequestDetails { get; set; } // JSON
    public string? ResponseDetails { get; set; } // JSON
    public string? RequestedBy { get; set; }
    public string? RespondedBy { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}
