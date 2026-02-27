using HIS.Application.DTOs.DataInheritance;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Service implementation for cross-module data inheritance.
/// Provides aggregated context data that flows between HIS modules:
/// Reception → OPD → Prescription → Billing → Pharmacy → Inpatient
/// </summary>
public class DataInheritanceService : IDataInheritanceService
{
    private readonly HISDbContext _context;

    public DataInheritanceService(HISDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get OPD context: patient demographics, insurance, queue ticket, registration data.
    /// Reception → OPD inheritance.
    /// </summary>
    public async Task<OpdContextDto?> GetOpdContextAsync(Guid examinationId)
    {
        try
        {
            var exam = await _context.Examinations
                .Include(e => e.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Include(e => e.Room)
                .Include(e => e.Department)
                .Where(e => e.Id == examinationId && !e.IsDeleted)
                .FirstOrDefaultAsync();

            if (exam == null) return null;

            var patient = exam.MedicalRecord.Patient;
            var mr = exam.MedicalRecord;

            // Get queue ticket for this examination
            var queueTicket = await _context.QueueTickets
                .Where(qt => qt.PatientId == patient.Id
                    && qt.RoomId == exam.RoomId
                    && qt.IssueDate.Date == DateTime.Today
                    && !qt.IsDeleted)
                .OrderByDescending(qt => qt.CreatedAt)
                .FirstOrDefaultAsync();

            return new OpdContextDto
            {
                // Patient demographics
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                DateOfBirth = patient.DateOfBirth,
                YearOfBirth = patient.YearOfBirth,
                Gender = patient.Gender,
                IdentityNumber = patient.IdentityNumber,
                PhoneNumber = patient.PhoneNumber,
                Email = patient.Email,
                Address = patient.Address,
                Occupation = patient.Occupation,
                EthnicName = patient.EthnicName,

                // Guardian
                GuardianName = patient.GuardianName,
                GuardianPhone = patient.GuardianPhone,
                GuardianRelationship = patient.GuardianRelationship,

                // Insurance
                InsuranceNumber = mr.InsuranceNumber ?? patient.InsuranceNumber,
                InsuranceExpireDate = mr.InsuranceExpireDate ?? patient.InsuranceExpireDate,
                InsuranceFacilityCode = mr.InsuranceFacilityCode ?? patient.InsuranceFacilityCode,
                InsuranceFacilityName = patient.InsuranceFacilityName,
                InsuranceRightRoute = mr.InsuranceRightRoute,

                // Medical record
                MedicalRecordId = mr.Id,
                MedicalRecordCode = mr.MedicalRecordCode,
                PatientType = mr.PatientType,
                TreatmentType = mr.TreatmentType,
                AdmissionDate = mr.AdmissionDate,

                // Queue ticket
                QueueNumber = queueTicket?.QueueNumber ?? exam.QueueNumber,
                TicketNumber = queueTicket?.TicketNumber,
                QueuePriority = queueTicket?.Priority ?? 0,
                QueueNotes = queueTicket?.Notes,

                // Room
                RoomId = exam.RoomId,
                RoomName = exam.Room?.RoomName,
                DepartmentId = exam.DepartmentId,
                DepartmentName = exam.Department?.DepartmentName,

                // Medical history
                MedicalHistory = patient.MedicalHistory,
                AllergyHistory = patient.AllergyHistory,
                FamilyHistory = patient.FamilyHistory,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    /// <summary>
    /// Get Prescription context: diagnosis, allergies, vitals from OPD examination.
    /// OPD → Prescription inheritance.
    /// </summary>
    public async Task<PrescriptionContextDto?> GetPrescriptionContextAsync(Guid examinationId)
    {
        try
        {
            var exam = await _context.Examinations
                .Include(e => e.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Room)
                .Include(e => e.Department)
                .Where(e => e.Id == examinationId && !e.IsDeleted)
                .FirstOrDefaultAsync();

            if (exam == null) return null;

            var patient = exam.MedicalRecord.Patient;

            // Calculate age
            int age = 0;
            if (patient.DateOfBirth.HasValue)
                age = DateTime.Now.Year - patient.DateOfBirth.Value.Year;
            else if (patient.YearOfBirth.HasValue)
                age = DateTime.Now.Year - patient.YearOfBirth.Value;

            // Get allergies
            var allergies = await _context.Allergies
                .Where(a => a.PatientId == patient.Id && a.IsActive && !a.IsDeleted)
                .Select(a => new AllergyInfoDto
                {
                    AllergenName = a.AllergenName,
                    Severity = a.Severity,
                    Reaction = a.Reaction,
                })
                .ToListAsync();

            // Get existing prescriptions for this examination
            var existingPrescriptions = await _context.Prescriptions
                .Include(p => p.Details)
                .Where(p => p.ExaminationId == examinationId && !p.IsDeleted && p.Status != 4)
                .Select(p => new ExistingPrescriptionSummaryDto
                {
                    PrescriptionId = p.Id,
                    PrescriptionCode = p.PrescriptionCode,
                    PrescriptionDate = p.PrescriptionDate,
                    ItemCount = p.Details.Count(d => !d.IsDeleted),
                    TotalAmount = p.TotalAmount,
                    Status = p.Status,
                })
                .ToListAsync();

            return new PrescriptionContextDto
            {
                // Patient
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                Age = age,
                PhoneNumber = patient.PhoneNumber,
                InsuranceNumber = exam.MedicalRecord.InsuranceNumber ?? patient.InsuranceNumber,

                // Examination
                ExaminationId = exam.Id,
                ExaminationDate = exam.CreatedAt,
                DoctorName = exam.Doctor?.FullName,
                RoomName = exam.Room?.RoomName,
                DepartmentName = exam.Department?.DepartmentName,

                // Diagnosis
                MainDiagnosis = exam.MainDiagnosis,
                MainIcdCode = exam.MainIcdCode,
                SubDiagnosis = exam.SubDiagnosis,
                InitialDiagnosis = exam.InitialDiagnosis,

                // Vital signs
                Weight = exam.Weight,
                Height = exam.Height,
                Temperature = exam.Temperature,
                Pulse = exam.Pulse,
                BloodPressureSystolic = exam.BloodPressureSystolic,
                BloodPressureDiastolic = exam.BloodPressureDiastolic,
                RespiratoryRate = exam.RespiratoryRate,
                SpO2 = exam.SpO2,

                // Chief complaint
                ChiefComplaint = exam.ChiefComplaint,
                PresentIllness = exam.PresentIllness,

                // Allergies
                AllergyHistory = patient.AllergyHistory,
                Allergies = allergies,

                // Existing prescriptions
                ExistingPrescriptions = existingPrescriptions,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    /// <summary>
    /// Get Billing context: services ordered, prescriptions, patient info, payments.
    /// OPD + Prescription → Billing inheritance.
    /// </summary>
    public async Task<BillingContextDto?> GetBillingContextAsync(Guid medicalRecordId)
    {
        try
        {
            var mr = await _context.MedicalRecords
                .Include(m => m.Patient)
                .Where(m => m.Id == medicalRecordId && !m.IsDeleted)
                .FirstOrDefaultAsync();

            if (mr == null) return null;

            var patient = mr.Patient;

            // Get service requests for this medical record
            var serviceItems = await _context.ServiceRequests
                .Include(sr => sr.Service)
                .Where(sr => sr.MedicalRecordId == medicalRecordId && !sr.IsDeleted && sr.Status != 4)
                .Select(sr => new BillingServiceItemDto
                {
                    ServiceRequestId = sr.Id,
                    ServiceCode = sr.Service != null ? sr.Service.ServiceCode : "",
                    ServiceName = sr.Service != null ? sr.Service.ServiceName : "",
                    RequestType = sr.RequestType,
                    Quantity = sr.Quantity,
                    UnitPrice = sr.UnitPrice,
                    TotalAmount = sr.TotalAmount,
                    InsuranceAmount = sr.InsuranceAmount,
                    PatientAmount = sr.PatientAmount,
                    IsPaid = sr.IsPaid,
                    Status = sr.Status,
                })
                .ToListAsync();

            // Get prescriptions and their details for this medical record
            var prescriptionItems = await _context.PrescriptionDetails
                .Include(pd => pd.Medicine)
                .Include(pd => pd.Prescription)
                .Where(pd => pd.Prescription.MedicalRecordId == medicalRecordId
                    && !pd.IsDeleted && !pd.Prescription.IsDeleted
                    && pd.Prescription.Status != 4)
                .Select(pd => new BillingPrescriptionItemDto
                {
                    PrescriptionId = pd.PrescriptionId,
                    PrescriptionCode = pd.Prescription.PrescriptionCode,
                    MedicineName = pd.Medicine != null ? pd.Medicine.MedicineName : "",
                    ActiveIngredient = pd.Medicine != null ? pd.Medicine.ActiveIngredient : null,
                    Quantity = pd.Quantity,
                    Unit = pd.Unit,
                    UnitPrice = pd.UnitPrice,
                    Amount = pd.Amount,
                    InsuranceAmount = pd.InsuranceAmount,
                    PatientAmount = pd.PatientAmount,
                    IsDispensed = pd.Prescription.IsDispensed,
                })
                .ToListAsync();

            // Get existing payments (receipts) for this medical record
            var existingPayments = await _context.Receipts
                .Where(r => r.MedicalRecordId == medicalRecordId && !r.IsDeleted && r.Status != 2)
                .Select(r => new ExistingPaymentDto
                {
                    ReceiptId = r.Id,
                    ReceiptCode = r.ReceiptCode,
                    ReceiptDate = r.ReceiptDate,
                    ReceiptType = r.ReceiptType,
                    Amount = r.FinalAmount,
                    PaymentMethod = r.PaymentMethod,
                    Status = r.Status,
                })
                .ToListAsync();

            // Calculate totals
            var totalServiceAmount = serviceItems.Sum(s => s.TotalAmount);
            var serviceInsurance = serviceItems.Sum(s => s.InsuranceAmount);
            var servicePatient = serviceItems.Sum(s => s.PatientAmount);

            var totalPrescriptionAmount = prescriptionItems.Sum(p => p.Amount);
            var prescriptionInsurance = prescriptionItems.Sum(p => p.InsuranceAmount);
            var prescriptionPatient = prescriptionItems.Sum(p => p.PatientAmount);

            var totalPaid = existingPayments
                .Where(p => p.ReceiptType == 2 && p.Status == 1) // Payments that are confirmed
                .Sum(p => p.Amount);
            var totalDeposit = existingPayments
                .Where(p => p.ReceiptType == 1 && p.Status == 1) // Deposits that are confirmed
                .Sum(p => p.Amount);
            var totalRefund = existingPayments
                .Where(p => p.ReceiptType == 3 && p.Status == 1) // Refunds
                .Sum(p => p.Amount);

            var grandTotal = totalServiceAmount + totalPrescriptionAmount;
            var totalInsurance = serviceInsurance + prescriptionInsurance;
            var totalPatient = servicePatient + prescriptionPatient;

            return new BillingContextDto
            {
                // Patient
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                InsuranceNumber = mr.InsuranceNumber ?? patient.InsuranceNumber,

                // Medical record
                MedicalRecordId = mr.Id,
                MedicalRecordCode = mr.MedicalRecordCode,
                PatientType = mr.PatientType,

                // Diagnosis
                MainDiagnosis = mr.MainDiagnosis,
                MainIcdCode = mr.MainIcdCode,

                // Services
                ServiceItems = serviceItems,
                TotalServiceAmount = totalServiceAmount,
                ServiceInsuranceAmount = serviceInsurance,
                ServicePatientAmount = servicePatient,

                // Prescriptions
                PrescriptionItems = prescriptionItems,
                TotalPrescriptionAmount = totalPrescriptionAmount,
                PrescriptionInsuranceAmount = prescriptionInsurance,
                PrescriptionPatientAmount = prescriptionPatient,

                // Totals
                GrandTotal = grandTotal,
                TotalInsuranceAmount = totalInsurance,
                TotalPatientAmount = totalPatient,

                // Payments
                ExistingPayments = existingPayments,
                TotalPaid = totalPaid,
                TotalDeposit = totalDeposit,
                RemainingAmount = totalPatient - totalPaid - totalDeposit + totalRefund,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    /// <summary>
    /// Get Pharmacy context: prescription details, medicines, dosages, payment status.
    /// Prescription + Billing → Pharmacy inheritance.
    /// </summary>
    public async Task<PharmacyContextDto?> GetPharmacyContextAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .Include(p => p.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details)
                    .ThenInclude(d => d.Medicine)
                .Where(p => p.Id == prescriptionId && !p.IsDeleted)
                .FirstOrDefaultAsync();

            if (prescription == null) return null;

            var patient = prescription.MedicalRecord.Patient;
            var mr = prescription.MedicalRecord;

            // Calculate age
            int age = 0;
            if (patient.DateOfBirth.HasValue)
                age = DateTime.Now.Year - patient.DateOfBirth.Value.Year;
            else if (patient.YearOfBirth.HasValue)
                age = DateTime.Now.Year - patient.YearOfBirth.Value;

            // Check payment status - look for receipts linked to this prescription's medical record
            var isPaid = await _context.Receipts
                .Where(r => r.MedicalRecordId == mr.Id && !r.IsDeleted
                    && r.ReceiptType == 2 && r.Status == 1)
                .AnyAsync();

            var paidAmount = await _context.Receipts
                .Where(r => r.MedicalRecordId == mr.Id && !r.IsDeleted
                    && r.ReceiptType == 2 && r.Status == 1)
                .SumAsync(r => r.FinalAmount);

            // Map prescription items
            var items = prescription.Details
                .Where(d => !d.IsDeleted)
                .Select(d => new PharmacyPrescriptionItemDto
                {
                    DetailId = d.Id,
                    MedicineId = d.MedicineId,
                    MedicineCode = d.Medicine?.MedicineCode ?? "",
                    MedicineName = d.Medicine?.MedicineName ?? "",
                    ActiveIngredient = d.Medicine?.ActiveIngredient,
                    Concentration = d.Medicine?.Concentration,
                    Manufacturer = d.Medicine?.Manufacturer,

                    Quantity = d.Quantity,
                    DispensedQuantity = d.DispensedQuantity,
                    Unit = d.Unit,

                    Dosage = d.Dosage,
                    Frequency = d.Frequency,
                    Route = d.Route,
                    UsageInstructions = d.UsageInstructions,
                    Days = d.Days,
                    MorningDose = d.MorningDose,
                    NoonDose = d.NoonDose,
                    EveningDose = d.EveningDose,
                    NightDose = d.NightDose,

                    UnitPrice = d.UnitPrice,
                    Amount = d.Amount,
                    InsuranceAmount = d.InsuranceAmount,
                    PatientAmount = d.PatientAmount,

                    BatchNumber = d.BatchNumber,
                    ExpiryDate = d.ExpiryDate,

                    IsNarcotic = d.Medicine?.IsNarcotic ?? false,
                    IsPsychotropic = d.Medicine?.IsPsychotropic ?? false,
                    IsAntibiotic = d.Medicine?.IsAntibiotic ?? false,

                    Status = d.Status,
                })
                .ToList();

            return new PharmacyContextDto
            {
                // Patient
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                Age = age,
                InsuranceNumber = mr.InsuranceNumber ?? patient.InsuranceNumber,

                // Prescription
                PrescriptionId = prescription.Id,
                PrescriptionCode = prescription.PrescriptionCode,
                PrescriptionDate = prescription.PrescriptionDate,
                PrescriptionType = prescription.PrescriptionType,
                TotalDays = prescription.TotalDays,
                Instructions = prescription.Instructions,
                Note = prescription.Note,

                // Doctor
                DoctorName = prescription.Doctor?.FullName,
                DepartmentName = prescription.Department?.DepartmentName,

                // Diagnosis
                Diagnosis = prescription.Diagnosis ?? prescription.DiagnosisName,
                DiagnosisCode = prescription.DiagnosisCode ?? prescription.IcdCode,

                // Items
                Items = items,

                // Totals
                TotalAmount = prescription.TotalAmount,
                InsuranceAmount = prescription.InsuranceAmount,
                PatientAmount = prescription.PatientAmount,

                // Payment
                IsPaid = isPaid,
                PaidAmount = paidAmount,

                // Dispensing
                IsDispensed = prescription.IsDispensed,
                DispensedAt = prescription.DispensedAt,
                PrescriptionStatus = prescription.Status,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    /// <summary>
    /// Get Admission context: OPD examination data, diagnosis, vitals for IPD admission.
    /// OPD → Inpatient inheritance.
    /// </summary>
    public async Task<AdmissionContextDto?> GetAdmissionContextAsync(Guid examinationId)
    {
        try
        {
            var exam = await _context.Examinations
                .Include(e => e.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Room)
                .Include(e => e.Department)
                .Where(e => e.Id == examinationId && !e.IsDeleted)
                .FirstOrDefaultAsync();

            if (exam == null) return null;

            var patient = exam.MedicalRecord.Patient;
            var mr = exam.MedicalRecord;

            // Calculate age
            int age = 0;
            if (patient.DateOfBirth.HasValue)
                age = DateTime.Now.Year - patient.DateOfBirth.Value.Year;
            else if (patient.YearOfBirth.HasValue)
                age = DateTime.Now.Year - patient.YearOfBirth.Value;

            // Get service orders for this examination
            var serviceOrders = await _context.ServiceRequests
                .Include(sr => sr.Service)
                .Where(sr => sr.ExaminationId == examinationId && !sr.IsDeleted)
                .Select(sr => new AdmissionServiceSummaryDto
                {
                    ServiceCode = sr.Service != null ? sr.Service.ServiceCode : "",
                    ServiceName = sr.Service != null ? sr.Service.ServiceName : "",
                    RequestType = sr.RequestType,
                    Status = sr.Status,
                    Result = sr.Details
                        .Where(d => d.Result != null && !d.IsDeleted)
                        .Select(d => d.Result)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            // Get prescriptions for this examination
            var prescriptions = await _context.Prescriptions
                .Include(p => p.Details)
                .Where(p => p.ExaminationId == examinationId && !p.IsDeleted && p.Status != 4)
                .Select(p => new AdmissionPrescriptionSummaryDto
                {
                    PrescriptionCode = p.PrescriptionCode,
                    PrescriptionDate = p.PrescriptionDate,
                    ItemCount = p.Details.Count(d => !d.IsDeleted),
                    TotalDays = p.TotalDays,
                    Diagnosis = p.Diagnosis ?? p.DiagnosisName,
                    Status = p.Status,
                })
                .ToListAsync();

            return new AdmissionContextDto
            {
                // Patient
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                Gender = patient.Gender,
                DateOfBirth = patient.DateOfBirth,
                Age = age,
                PhoneNumber = patient.PhoneNumber,
                Address = patient.Address,
                InsuranceNumber = mr.InsuranceNumber ?? patient.InsuranceNumber,

                // Medical record
                MedicalRecordId = mr.Id,
                MedicalRecordCode = mr.MedicalRecordCode,
                PatientType = mr.PatientType,

                // Examination
                ExaminationId = exam.Id,
                ExaminationDate = exam.CreatedAt,
                ExamDoctorName = exam.Doctor?.FullName,
                ExamRoomName = exam.Room?.RoomName,
                ExamDepartmentName = exam.Department?.DepartmentName,

                // Diagnosis
                MainDiagnosis = exam.MainDiagnosis ?? mr.MainDiagnosis,
                MainIcdCode = exam.MainIcdCode ?? mr.MainIcdCode,
                SubDiagnosis = exam.SubDiagnosis ?? mr.SubDiagnosis,
                InitialDiagnosis = exam.InitialDiagnosis ?? mr.InitialDiagnosis,

                // Conclusion
                ConclusionType = exam.ConclusionType,
                ConclusionNote = exam.ConclusionNote,
                TreatmentPlan = exam.TreatmentPlan,

                // Vital signs
                Temperature = exam.Temperature,
                Pulse = exam.Pulse,
                BloodPressureSystolic = exam.BloodPressureSystolic,
                BloodPressureDiastolic = exam.BloodPressureDiastolic,
                RespiratoryRate = exam.RespiratoryRate,
                Height = exam.Height,
                Weight = exam.Weight,
                SpO2 = exam.SpO2,

                // Clinical
                ChiefComplaint = exam.ChiefComplaint,
                PresentIllness = exam.PresentIllness,
                PhysicalExamination = exam.PhysicalExamination,

                // Medical history
                MedicalHistory = patient.MedicalHistory,
                AllergyHistory = patient.AllergyHistory,
                FamilyHistory = patient.FamilyHistory,

                // Related data
                ServiceOrders = serviceOrders,
                Prescriptions = prescriptions,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }
}
