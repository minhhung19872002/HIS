import request from '@/utils/request';

// ============================================
// Data Inheritance API Client
// Cross-module data flow:
// Reception → OPD → Prescription → Billing → Pharmacy → Inpatient
// ============================================

// #region Types

// OPD Context (Reception → OPD)
export interface OpdContextDto {
  patientId: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  gender: number;
  genderName?: string;
  identityNumber?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  occupation?: string;
  ethnicName?: string;

  // Guardian
  guardianName?: string;
  guardianPhone?: string;
  guardianRelationship?: string;

  // Insurance
  insuranceNumber?: string;
  insuranceExpireDate?: string;
  insuranceFacilityCode?: string;
  insuranceFacilityName?: string;
  insuranceRightRoute: number;
  insuranceRightRouteName?: string;

  // Medical record
  medicalRecordId: string;
  medicalRecordCode: string;
  patientType: number;
  patientTypeName: string;
  treatmentType: number;
  admissionDate: string;

  // Queue ticket
  queueNumber: number;
  ticketNumber?: string;
  queuePriority: number;
  queuePriorityName?: string;
  queueNotes?: string;

  // Room
  roomId: string;
  roomName?: string;
  departmentId?: string;
  departmentName?: string;

  // Medical history
  medicalHistory?: string;
  allergyHistory?: string;
  familyHistory?: string;
}

// Prescription Context (OPD → Prescription)
export interface PrescriptionContextDto {
  patientId: string;
  patientCode: string;
  fullName: string;
  gender: number;
  dateOfBirth?: string;
  age: number;
  phoneNumber?: string;
  insuranceNumber?: string;

  // Examination
  examinationId: string;
  examinationDate: string;
  doctorName?: string;
  roomName?: string;
  departmentName?: string;

  // Diagnosis
  mainDiagnosis?: string;
  mainIcdCode?: string;
  subDiagnosis?: string;
  initialDiagnosis?: string;

  // Vital signs
  weight?: number;
  height?: number;
  temperature?: number;
  pulse?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  spO2?: number;

  // Chief complaint
  chiefComplaint?: string;
  presentIllness?: string;

  // Allergies
  allergyHistory?: string;
  allergies: AllergyInfoDto[];

  // Existing prescriptions
  existingPrescriptions: ExistingPrescriptionSummaryDto[];
}

export interface AllergyInfoDto {
  allergenName: string;
  severity: number;
  severityName: string;
  reaction?: string;
}

export interface ExistingPrescriptionSummaryDto {
  prescriptionId: string;
  prescriptionCode: string;
  prescriptionDate: string;
  itemCount: number;
  totalAmount: number;
  status: number;
  statusName: string;
}

// Billing Context (OPD + Prescription → Billing)
export interface BillingContextDto {
  patientId: string;
  patientCode: string;
  fullName: string;
  gender: number;
  dateOfBirth?: string;
  insuranceNumber?: string;

  medicalRecordId: string;
  medicalRecordCode: string;
  patientType: number;
  patientTypeName: string;

  mainDiagnosis?: string;
  mainIcdCode?: string;

  serviceItems: BillingServiceItemDto[];
  totalServiceAmount: number;
  serviceInsuranceAmount: number;
  servicePatientAmount: number;

  prescriptionItems: BillingPrescriptionItemDto[];
  totalPrescriptionAmount: number;
  prescriptionInsuranceAmount: number;
  prescriptionPatientAmount: number;

  grandTotal: number;
  totalInsuranceAmount: number;
  totalPatientAmount: number;

  existingPayments: ExistingPaymentDto[];
  totalPaid: number;
  totalDeposit: number;
  remainingAmount: number;
}

export interface BillingServiceItemDto {
  serviceRequestId: string;
  serviceCode: string;
  serviceName: string;
  requestType: number;
  requestTypeName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  isPaid: boolean;
  status: number;
}

export interface BillingPrescriptionItemDto {
  prescriptionId: string;
  prescriptionCode: string;
  medicineName: string;
  activeIngredient?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  insuranceAmount: number;
  patientAmount: number;
  isDispensed: boolean;
}

export interface ExistingPaymentDto {
  receiptId: string;
  receiptCode: string;
  receiptDate: string;
  receiptType: number;
  receiptTypeName: string;
  amount: number;
  paymentMethod: number;
  paymentMethodName: string;
  status: number;
}

// Pharmacy Context (Prescription + Billing → Pharmacy)
export interface PharmacyContextDto {
  patientId: string;
  patientCode: string;
  fullName: string;
  gender: number;
  dateOfBirth?: string;
  age: number;
  insuranceNumber?: string;

  prescriptionId: string;
  prescriptionCode: string;
  prescriptionDate: string;
  prescriptionType: number;
  prescriptionTypeName: string;
  totalDays: number;
  instructions?: string;
  note?: string;

  doctorName?: string;
  departmentName?: string;

  diagnosis?: string;
  diagnosisCode?: string;

  items: PharmacyPrescriptionItemDto[];

  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;

  isPaid: boolean;
  paidAmount: number;
  paymentStatusName: string;

  isDispensed: boolean;
  dispensedAt?: string;
  prescriptionStatus: number;
}

export interface PharmacyPrescriptionItemDto {
  detailId: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  concentration?: string;
  manufacturer?: string;

  quantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  unit?: string;

  dosage?: string;
  frequency?: string;
  route?: string;
  usageInstructions?: string;
  days: number;
  morningDose?: number;
  noonDose?: number;
  eveningDose?: number;
  nightDose?: number;

  unitPrice: number;
  amount: number;
  insuranceAmount: number;
  patientAmount: number;

  batchNumber?: string;
  expiryDate?: string;

  isNarcotic: boolean;
  isPsychotropic: boolean;
  isAntibiotic: boolean;

  status: number;
}

// Admission Context (OPD → Inpatient)
export interface AdmissionContextDto {
  patientId: string;
  patientCode: string;
  fullName: string;
  gender: number;
  genderName?: string;
  dateOfBirth?: string;
  age: number;
  phoneNumber?: string;
  address?: string;
  insuranceNumber?: string;

  medicalRecordId: string;
  medicalRecordCode: string;
  patientType: number;

  examinationId: string;
  examinationDate: string;
  examDoctorName?: string;
  examRoomName?: string;
  examDepartmentName?: string;

  mainDiagnosis?: string;
  mainIcdCode?: string;
  subDiagnosis?: string;
  initialDiagnosis?: string;

  conclusionType?: number;
  conclusionNote?: string;
  treatmentPlan?: string;

  temperature?: number;
  pulse?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  height?: number;
  weight?: number;
  spO2?: number;

  chiefComplaint?: string;
  presentIllness?: string;
  physicalExamination?: string;

  medicalHistory?: string;
  allergyHistory?: string;
  familyHistory?: string;

  serviceOrders: AdmissionServiceSummaryDto[];
  prescriptions: AdmissionPrescriptionSummaryDto[];
}

export interface AdmissionServiceSummaryDto {
  serviceCode: string;
  serviceName: string;
  requestType: number;
  status: number;
  statusName: string;
  result?: string;
}

export interface AdmissionPrescriptionSummaryDto {
  prescriptionCode: string;
  prescriptionDate: string;
  itemCount: number;
  totalDays: number;
  diagnosis?: string;
  status: number;
}

// #endregion

// #region API Functions

/**
 * Get OPD context: patient demographics, insurance, queue ticket, registration data
 * Used when doctor selects a patient in OPD (inherited from Reception)
 */
export function getOpdContext(examinationId: string) {
  return request.get<OpdContextDto>(`/data-inheritance/opd-context/${examinationId}`);
}

/**
 * Get Prescription context: diagnosis, allergies, vital signs, patient info
 * Used when doctor prescribes medicines (inherited from OPD examination)
 */
export function getPrescriptionContext(examinationId: string) {
  return request.get<PrescriptionContextDto>(`/data-inheritance/prescription-context/${examinationId}`);
}

/**
 * Get Billing context: services, prescriptions, patient info, existing payments
 * Used when cashier processes billing (inherited from OPD + Prescription)
 */
export function getBillingContext(medicalRecordId: string) {
  return request.get<BillingContextDto>(`/data-inheritance/billing-context/${medicalRecordId}`);
}

/**
 * Get Pharmacy context: prescription details, medicines, dosages, payment status
 * Used when pharmacist dispenses medicines (inherited from Prescription + Billing)
 */
export function getPharmacyContext(prescriptionId: string) {
  return request.get<PharmacyContextDto>(`/data-inheritance/pharmacy-context/${prescriptionId}`);
}

/**
 * Get Admission context: OPD examination data, diagnosis, vitals, treatment history
 * Used when IPD nurse admits a patient (inherited from OPD examination)
 */
export function getAdmissionContext(examinationId: string) {
  return request.get<AdmissionContextDto>(`/data-inheritance/admission-context/${examinationId}`);
}

// #endregion
