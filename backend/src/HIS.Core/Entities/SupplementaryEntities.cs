using HIS.Core.Entities;

namespace HIS.Core.Entities;

// ======= Module 1: FollowUp (Tái khám) =======

public class FollowUpAppointment : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid? ExaminationId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public int Status { get; set; } // 0=Scheduled, 1=Completed, 2=Missed, 3=Cancelled
    public bool ReminderSent { get; set; }
    public string? Notes { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Reason { get; set; }
    public string? Diagnosis { get; set; }
    public int? ReminderDaysBefore { get; set; } // Số ngày trước khi nhắc

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual Department? Department { get; set; }
    public virtual Examination? Examination { get; set; }
}

// ======= Module 2: Procurement (Dự trù mua sắm) =======

public class ProcurementRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RequestedById { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Pending, 2=Approved, 3=Rejected, 4=Completed
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? RejectReason { get; set; }

    // Navigation
    public virtual Department? Department { get; set; }
    public virtual User? RequestedBy { get; set; }
    public virtual User? ApprovedBy { get; set; }
    public virtual ICollection<ProcurementRequestItem> Items { get; set; } = new List<ProcurementRequestItem>();
}

public class ProcurementRequestItem : BaseEntity
{
    public Guid ProcurementRequestId { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Unit { get; set; }
    public int RequestedQuantity { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; }
    public decimal EstimatedPrice { get; set; }
    public string? Notes { get; set; }
    public string? Specification { get; set; }

    // Navigation
    public virtual ProcurementRequest? ProcurementRequest { get; set; }
}

// ======= Module 3: Immunization (Tiêm chủng - mở rộng) =======
// Note: VaccinationRecord entity already exists in PublicHealth.cs
// This module adds ImmunizationBatch for batch/lot tracking

public class ImmunizationBatch : BaseEntity
{
    public string BatchCode { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public string? VaccineCode { get; set; }
    public string? Manufacturer { get; set; }
    public string? LotNumber { get; set; }
    public DateTime ManufactureDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int InitialQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    public string? StorageCondition { get; set; } // 2-8°C, -20°C, etc.
    public int Status { get; set; } // 0=InStock, 1=InUse, 2=Expired, 3=Recalled
    public Guid? WarehouseId { get; set; }
    public string? Notes { get; set; }

    public virtual Warehouse? Warehouse { get; set; }
}

// ======= Module 4: HealthCheckup (Khám sức khỏe định kỳ) =======

public class HealthCheckupCampaign : BaseEntity
{
    public string CampaignCode { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int Status { get; set; } // 0=Planning, 1=Active, 2=Completed, 3=Cancelled
    public int TotalRegistered { get; set; }
    public int TotalCompleted { get; set; }
    public string? Notes { get; set; }
    public string? PackageDescription { get; set; }
    public decimal? ContractAmount { get; set; }

    public virtual ICollection<HealthCheckupRecord> Records { get; set; } = new List<HealthCheckupRecord>();
}

public class HealthCheckupRecord : BaseEntity
{
    public Guid CampaignId { get; set; }
    public Guid? PatientId { get; set; }
    public string? EmployeeName { get; set; }
    public string? EmployeeCode { get; set; }
    public string? Department { get; set; } // Phòng/ban của tổ chức
    public DateTime? CheckupDate { get; set; }
    public string? ResultSummary { get; set; }
    public bool CertificateIssued { get; set; }
    public string? CertificateNumber { get; set; }
    public string? Classification { get; set; } // A, B, C, D, E
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
    public string? BloodPressure { get; set; }
    public float? Height { get; set; }
    public float? Weight { get; set; }
    public float? BMI { get; set; }
    public string? VisionLeft { get; set; }
    public string? VisionRight { get; set; }
    public string? HearingResult { get; set; }
    public string? LabResultSummary { get; set; }
    public string? ImagingResultSummary { get; set; }

    // Navigation
    public virtual HealthCheckupCampaign? Campaign { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual User? Doctor { get; set; }
}

public class CheckupCampaignGroup : BaseEntity
{
    public Guid CampaignId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? RoomAssignment { get; set; }
    public int TotalMembers { get; set; }
    public int CompletedMembers { get; set; }

    public virtual HealthCheckupCampaign? Campaign { get; set; }
}

// ======= Module 5: Epidemiology (Giám sát dịch tễ) =======

public class DiseaseCase : BaseEntity
{
    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int? PatientAge { get; set; }
    public int? PatientGender { get; set; }
    public string DiseaseName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public DateTime? OnsetDate { get; set; }
    public DateTime ReportDate { get; set; }
    public int Classification { get; set; } // 0=Suspected, 1=Probable, 2=Confirmed
    public int Outcome { get; set; } // 0=Recovering, 1=Recovered, 2=Died, 3=Unknown
    public Guid? InvestigatorId { get; set; }
    public string? Location { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsOutbreak { get; set; }
    public string? OutbreakId { get; set; }
    public string? LabTestResult { get; set; }
    public DateTime? LabTestDate { get; set; }
    public string? TreatmentSummary { get; set; }
    public string? Hospitalized { get; set; } // Tên BV nếu nhập viện

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Investigator { get; set; }
    public virtual ICollection<ContactTrace> ContactTraces { get; set; } = new List<ContactTrace>();
}

public class ContactTrace : BaseEntity
{
    public Guid DiseaseCaseId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? Relationship { get; set; }
    public DateTime? ExposureDate { get; set; }
    public string? ExposureType { get; set; } // Close, Casual, Household
    public int QuarantineStatus { get; set; } // 0=None, 1=HomeQuarantine, 2=FacilityQuarantine, 3=Completed
    public string? TestResult { get; set; }
    public DateTime? TestDate { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsSymptomDeveloped { get; set; }
    public DateTime? SymptomOnsetDate { get; set; }

    // Navigation
    public virtual DiseaseCase? DiseaseCase { get; set; }
}
