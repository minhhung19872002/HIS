namespace HIS.Application.DTOs.DataInheritance;

#region OPD Context - Reception → OPD

/// <summary>
/// Context data inherited from Reception when doctor selects a patient in OPD.
/// Includes patient demographics, insurance, queue ticket, and registration data.
/// </summary>
public class OpdContextDto
{
    // Patient demographics
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public int? YearOfBirth { get; set; }
    public int Gender { get; set; }
    public string? GenderName => Gender switch { 1 => "Nam", 2 => "Nữ", _ => "Khác" };
    public string? IdentityNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Occupation { get; set; }
    public string? EthnicName { get; set; }

    // Guardian (for children)
    public string? GuardianName { get; set; }
    public string? GuardianPhone { get; set; }
    public string? GuardianRelationship { get; set; }

    // Insurance info
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public string? InsuranceFacilityCode { get; set; }
    public string? InsuranceFacilityName { get; set; }
    public int InsuranceRightRoute { get; set; }
    public string? InsuranceRightRouteName => InsuranceRightRoute switch
    {
        1 => "Đúng tuyến",
        2 => "Trái tuyến",
        3 => "Thông tuyến",
        _ => null
    };

    // Registration / Medical record info
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public int PatientType { get; set; }
    public string PatientTypeName => PatientType switch
    {
        1 => "BHYT",
        2 => "Viện phí",
        3 => "Dịch vụ",
        4 => "Khám sức khỏe",
        _ => ""
    };
    public int TreatmentType { get; set; }
    public DateTime AdmissionDate { get; set; }

    // Queue ticket info
    public int QueueNumber { get; set; }
    public string? TicketNumber { get; set; }
    public int QueuePriority { get; set; }
    public string? QueuePriorityName => QueuePriority switch
    {
        0 => "Bình thường",
        1 => "Ưu tiên",
        2 => "Cấp cứu",
        _ => null
    };
    public string? QueueNotes { get; set; }

    // Assigned room info
    public Guid RoomId { get; set; }
    public string? RoomName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Medical history (from patient record)
    public string? MedicalHistory { get; set; }
    public string? AllergyHistory { get; set; }
    public string? FamilyHistory { get; set; }
}

#endregion

#region Prescription Context - OPD → Prescription

/// <summary>
/// Context data inherited from OPD examination when doctor prescribes medicines.
/// Includes diagnosis, allergies, vital signs, and patient info.
/// </summary>
public class PrescriptionContextDto
{
    // Patient info
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int Age { get; set; }
    public string? PhoneNumber { get; set; }
    public string? InsuranceNumber { get; set; }

    // Examination info
    public Guid ExaminationId { get; set; }
    public DateTime ExaminationDate { get; set; }
    public string? DoctorName { get; set; }
    public string? RoomName { get; set; }
    public string? DepartmentName { get; set; }

    // Diagnosis
    public string? MainDiagnosis { get; set; }
    public string? MainIcdCode { get; set; }
    public string? SubDiagnosis { get; set; }
    public string? InitialDiagnosis { get; set; }

    // Vital signs
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? SpO2 { get; set; }

    // Chief complaint and history
    public string? ChiefComplaint { get; set; }
    public string? PresentIllness { get; set; }

    // Allergies and contraindications
    public string? AllergyHistory { get; set; }
    public List<AllergyInfoDto> Allergies { get; set; } = new();

    // Existing prescriptions for this examination (to check duplicates)
    public List<ExistingPrescriptionSummaryDto> ExistingPrescriptions { get; set; } = new();
}

public class AllergyInfoDto
{
    public string AllergenName { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Trung bình",
        3 => "Nặng",
        _ => ""
    };
    public string? Reaction { get; set; }
}

public class ExistingPrescriptionSummaryDto
{
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalAmount { get; set; }
    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã cấp phát",
        3 => "Hoàn trả",
        4 => "Hủy",
        _ => ""
    };
}

#endregion

#region Billing Context - OPD + Prescription → Billing

/// <summary>
/// Context data inherited from OPD and Prescription when billing a visit.
/// Includes all services ordered, prescriptions, patient info, and existing payments.
/// </summary>
public class BillingContextDto
{
    // Patient info
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? InsuranceNumber { get; set; }

    // Medical record
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public int PatientType { get; set; }
    public string PatientTypeName => PatientType switch
    {
        1 => "BHYT",
        2 => "Viện phí",
        3 => "Dịch vụ",
        4 => "Khám sức khỏe",
        _ => ""
    };

    // Diagnosis
    public string? MainDiagnosis { get; set; }
    public string? MainIcdCode { get; set; }

    // Services ordered
    public List<BillingServiceItemDto> ServiceItems { get; set; } = new();
    public decimal TotalServiceAmount { get; set; }
    public decimal ServiceInsuranceAmount { get; set; }
    public decimal ServicePatientAmount { get; set; }

    // Prescriptions
    public List<BillingPrescriptionItemDto> PrescriptionItems { get; set; } = new();
    public decimal TotalPrescriptionAmount { get; set; }
    public decimal PrescriptionInsuranceAmount { get; set; }
    public decimal PrescriptionPatientAmount { get; set; }

    // Totals
    public decimal GrandTotal { get; set; }
    public decimal TotalInsuranceAmount { get; set; }
    public decimal TotalPatientAmount { get; set; }

    // Existing payments
    public List<ExistingPaymentDto> ExistingPayments { get; set; } = new();
    public decimal TotalPaid { get; set; }
    public decimal TotalDeposit { get; set; }
    public decimal RemainingAmount { get; set; }
}

public class BillingServiceItemDto
{
    public Guid ServiceRequestId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int RequestType { get; set; }
    public string RequestTypeName => RequestType switch
    {
        1 => "Xét nghiệm",
        2 => "CĐHA",
        3 => "TDCN",
        4 => "PTTT",
        5 => "Khác",
        _ => ""
    };
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsPaid { get; set; }
    public int Status { get; set; }
}

public class BillingPrescriptionItemDto
{
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsDispensed { get; set; }
}

public class ExistingPaymentDto
{
    public Guid ReceiptId { get; set; }
    public string ReceiptCode { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public int ReceiptType { get; set; }
    public string ReceiptTypeName => ReceiptType switch
    {
        1 => "Tạm ứng",
        2 => "Thanh toán",
        3 => "Hoàn trả",
        _ => ""
    };
    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; }
    public string PaymentMethodName => PaymentMethod switch
    {
        1 => "Tiền mặt",
        2 => "Chuyển khoản",
        3 => "Thẻ",
        4 => "Ví điện tử",
        _ => ""
    };
    public int Status { get; set; }
}

#endregion

#region Pharmacy Context - Prescription + Billing → Pharmacy

/// <summary>
/// Context data inherited from Prescription and Billing when dispensing medicines.
/// Includes prescription details, medicines, dosages, and payment status.
/// </summary>
public class PharmacyContextDto
{
    // Patient info
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int Age { get; set; }
    public string? InsuranceNumber { get; set; }

    // Prescription info
    public Guid PrescriptionId { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }
    public int PrescriptionType { get; set; }
    public string PrescriptionTypeName => PrescriptionType switch
    {
        1 => "Ngoại trú",
        2 => "Nội trú",
        3 => "Nhà thuốc",
        4 => "YHCT",
        _ => ""
    };
    public int TotalDays { get; set; }
    public string? Instructions { get; set; }
    public string? Note { get; set; }

    // Prescribing doctor
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }

    // Diagnosis
    public string? Diagnosis { get; set; }
    public string? DiagnosisCode { get; set; }

    // Prescription items with medicine details
    public List<PharmacyPrescriptionItemDto> Items { get; set; } = new();

    // Totals
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Payment status
    public bool IsPaid { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatusName => IsPaid ? "Đã thanh toán" : "Chưa thanh toán";

    // Dispensing status
    public bool IsDispensed { get; set; }
    public DateTime? DispensedAt { get; set; }
    public int PrescriptionStatus { get; set; }
}

public class PharmacyPrescriptionItemDto
{
    public Guid DetailId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Concentration { get; set; }
    public string? Manufacturer { get; set; }

    // Quantity and unit
    public decimal Quantity { get; set; }
    public decimal DispensedQuantity { get; set; }
    public decimal RemainingQuantity => Quantity - DispensedQuantity;
    public string? Unit { get; set; }

    // Dosage instructions
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Route { get; set; }
    public string? UsageInstructions { get; set; }
    public int Days { get; set; }
    public decimal? MorningDose { get; set; }
    public decimal? NoonDose { get; set; }
    public decimal? EveningDose { get; set; }
    public decimal? NightDose { get; set; }

    // Price
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Batch info
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Warnings
    public bool IsNarcotic { get; set; }
    public bool IsPsychotropic { get; set; }
    public bool IsAntibiotic { get; set; }

    public int Status { get; set; }
}

#endregion

#region Admission Context - OPD → Inpatient

/// <summary>
/// Context data inherited from OPD examination when admitting a patient.
/// Includes OPD examination data, diagnosis, vitals, and treatment history.
/// </summary>
public class AdmissionContextDto
{
    // Patient info
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public string? GenderName => Gender switch { 1 => "Nam", 2 => "Nữ", _ => "Khác" };
    public DateTime? DateOfBirth { get; set; }
    public int Age { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }

    // Medical record
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public int PatientType { get; set; }

    // OPD Examination
    public Guid ExaminationId { get; set; }
    public DateTime ExaminationDate { get; set; }
    public string? ExamDoctorName { get; set; }
    public string? ExamRoomName { get; set; }
    public string? ExamDepartmentName { get; set; }

    // Diagnosis from OPD
    public string? MainDiagnosis { get; set; }
    public string? MainIcdCode { get; set; }
    public string? SubDiagnosis { get; set; }
    public string? InitialDiagnosis { get; set; }

    // Conclusion from OPD
    public int? ConclusionType { get; set; }
    public string? ConclusionNote { get; set; }
    public string? TreatmentPlan { get; set; }

    // Vital signs from OPD
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? Height { get; set; }
    public decimal? Weight { get; set; }
    public decimal? SpO2 { get; set; }

    // Chief complaint and history
    public string? ChiefComplaint { get; set; }
    public string? PresentIllness { get; set; }
    public string? PhysicalExamination { get; set; }

    // Medical history from patient record
    public string? MedicalHistory { get; set; }
    public string? AllergyHistory { get; set; }
    public string? FamilyHistory { get; set; }

    // Services ordered during OPD visit
    public List<AdmissionServiceSummaryDto> ServiceOrders { get; set; } = new();

    // Active prescriptions from OPD
    public List<AdmissionPrescriptionSummaryDto> Prescriptions { get; set; } = new();
}

public class AdmissionServiceSummaryDto
{
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int RequestType { get; set; }
    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đã thanh toán",
        2 => "Đang thực hiện",
        3 => "Có kết quả",
        4 => "Đã hủy",
        _ => ""
    };
    public string? Result { get; set; }
}

public class AdmissionPrescriptionSummaryDto
{
    public string PrescriptionCode { get; set; } = string.Empty;
    public DateTime PrescriptionDate { get; set; }
    public int ItemCount { get; set; }
    public int TotalDays { get; set; }
    public string? Diagnosis { get; set; }
    public int Status { get; set; }
}

#endregion
