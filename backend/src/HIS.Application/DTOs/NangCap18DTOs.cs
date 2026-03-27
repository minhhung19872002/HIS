namespace HIS.Application.DTOs.NangCap18;

// ========================
// 1. OPD - Transfer Patient Between Rooms
// ========================

public class TransferPatientRoomDto
{
    public Guid ExaminationId { get; set; }
    public Guid NewRoomId { get; set; }
    public string? Reason { get; set; }
}

public class TransferPatientRoomResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Guid ExaminationId { get; set; }
    public Guid OldRoomId { get; set; }
    public Guid NewRoomId { get; set; }
    public string? OldRoomName { get; set; }
    public string? NewRoomName { get; set; }
}

// ========================
// 2. OPD - Doctor Certification Check
// ========================

public class DoctorCertificationResultDto
{
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string? LicenseNumber { get; set; }
    public DateTime? LicenseExpiry { get; set; }
    public string? LicenseStatus { get; set; }
}

// ========================
// 3. IPD - Diagnosis Interruption
// ========================

public class CreateDiagnosisInterruptionDto
{
    public Guid AdmissionId { get; set; }
    public DateTime InterruptDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class DiagnosisInterruptionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime InterruptDate { get; set; }
    public DateTime? ResumeDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

// ========================
// 4. IPD - Medicine Order Rule Check
// ========================

public class MedicineOrderItemDto
{
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public string? Dosage { get; set; }
}

public class CheckMedicineOrderRulesDto
{
    public Guid AdmissionId { get; set; }
    public List<MedicineOrderItemDto> Items { get; set; } = new();
}

public class MedicineOrderWarningDto
{
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string WarningType { get; set; } = string.Empty; // NotInFormulary, ExceedsDailyLimit, DiagnosisMismatch
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning"; // Warning, Block
}

public class CheckMedicineOrderRulesResultDto
{
    public bool HasWarnings { get; set; }
    public bool HasBlocks { get; set; }
    public List<MedicineOrderWarningDto> Warnings { get; set; } = new();
}

// ========================
// 5. IPD - Service Order Compatibility Check
// ========================

public class CheckServiceCompatibilityDto
{
    public Guid AdmissionId { get; set; }
    public Guid ServiceId { get; set; }
}

public class ServiceCompatibilityResultDto
{
    public bool IsCompatible { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ServiceName { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public List<string> Warnings { get; set; } = new();
}

// ========================
// 6. Surgery - Anesthesia Chart
// ========================

public class AnesthesiaChartEntryDto
{
    public Guid? Id { get; set; }
    public int TimeMinutes { get; set; }
    public int? HeartRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? SpO2 { get; set; }
    public decimal? Temperature { get; set; }
    public int? EtCO2 { get; set; }
    public string? Drug { get; set; }
    public string? DoseGiven { get; set; }
    public string? Notes { get; set; }
}

public class SaveAnesthesiaChartDto
{
    public Guid SurgeryId { get; set; }
    public List<AnesthesiaChartEntryDto> Entries { get; set; } = new();
}

public class AnesthesiaChartDto
{
    public Guid SurgeryId { get; set; }
    public string? PatientName { get; set; }
    public string? ProcedureName { get; set; }
    public DateTime? SurgeryStart { get; set; }
    public DateTime? SurgeryEnd { get; set; }
    public int? AnesthesiaType { get; set; }
    public List<AnesthesiaChartEntryDto> Entries { get; set; } = new();
}

// ========================
// 7. Surgery - Profit Calculation
// ========================

public class SurgeryProfitDto
{
    public Guid SurgeryId { get; set; }
    public string? ProcedureName { get; set; }
    public decimal Revenue { get; set; }
    public decimal SupplyCost { get; set; }
    public decimal DrugCost { get; set; }
    public decimal StaffCost { get; set; }
    public decimal OverheadCost { get; set; }
    public decimal Profit { get; set; }
    public decimal ProfitMargin { get; set; } // percentage
}

// ========================
// 8. Pharmacy - Drug Equivalence
// ========================

public class DrugEquivalenceDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public Guid EquivalentMedicineId { get; set; }
    public string EquivalentMedicineName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveDrugEquivalenceDto
{
    public Guid MedicineId { get; set; }
    public Guid EquivalentMedicineId { get; set; }
    public string? Notes { get; set; }
}

// ========================
// 9. Pharmacy - Merge Dispensing Vouchers
// ========================

public class MergeVouchersDto
{
    public List<Guid> VoucherIds { get; set; } = new();
}

public class MergeVouchersResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Guid? MergedVoucherId { get; set; }
    public int MergedCount { get; set; }
    public decimal TotalAmount { get; set; }
}

// ========================
// 10. SMS - Lab Result Link
// ========================

public class SendLabResultLinkDto
{
    public Guid LabRequestId { get; set; }
    public string Phone { get; set; } = string.Empty;
}

public class LabResultLinkResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? AccessUrl { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
