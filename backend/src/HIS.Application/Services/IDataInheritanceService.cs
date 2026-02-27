using HIS.Application.DTOs.DataInheritance;

namespace HIS.Application.Services;

/// <summary>
/// Service interface for cross-module data inheritance.
/// Provides context data that flows between modules:
/// Reception → OPD → Prescription → Billing → Pharmacy → Inpatient → Discharge
/// </summary>
public interface IDataInheritanceService
{
    /// <summary>
    /// Get OPD context: patient demographics, insurance, queue ticket, registration data
    /// Used when doctor selects a patient in OPD (inherited from Reception).
    /// </summary>
    Task<OpdContextDto?> GetOpdContextAsync(Guid examinationId);

    /// <summary>
    /// Get Prescription context: examination diagnosis, allergies, vital signs, patient info
    /// Used when doctor prescribes medicines (inherited from OPD examination).
    /// </summary>
    Task<PrescriptionContextDto?> GetPrescriptionContextAsync(Guid examinationId);

    /// <summary>
    /// Get Billing context: all services, prescriptions, patient info, existing payments
    /// Used when cashier processes billing (inherited from OPD + Prescription).
    /// </summary>
    Task<BillingContextDto?> GetBillingContextAsync(Guid medicalRecordId);

    /// <summary>
    /// Get Pharmacy context: prescription details, medicines, dosages, payment status
    /// Used when pharmacist dispenses medicines (inherited from Prescription + Billing).
    /// </summary>
    Task<PharmacyContextDto?> GetPharmacyContextAsync(Guid prescriptionId);

    /// <summary>
    /// Get Admission context: OPD examination data, diagnosis, vitals, treatment history
    /// Used when IPD nurse admits a patient (inherited from OPD).
    /// </summary>
    Task<AdmissionContextDto?> GetAdmissionContextAsync(Guid examinationId);
}
