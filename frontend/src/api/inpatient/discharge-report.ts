/**
 * Inpatient — Discharge / Reports (3.7 + 3.8 + 3.6.x Newborn + 3.6.y Hemodialysis)
 */
import apiClient from '../client';

const BASE_URL = '/inpatient';

// #region 3.7 Kết thúc điều trị

export interface CompleteDischargeDto {
  admissionId: string;
  dischargeDate: string;
  dischargeType: number;
  dischargeCondition: number;
  dischargeDiagnosisCode?: string;
  dischargeDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  treatmentSummary?: string;
  proceduresSummary?: string;
  dischargeInstructions?: string;
  medicationInstructions?: string;
  dietInstructions?: string;
  activityInstructions?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  sickLeaveDays?: number;
  sickLeaveStartDate?: string;
  transferToHospital?: string;
  transferReason?: string;
}

export interface DischargeDto {
  id: string;
  admissionId: string;
  dischargeDate: string;
  dischargeType: number;
  dischargeTypeName: string;
  dischargeCondition: number;
  dischargeConditionName: string;
  dischargeDiagnosis?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  dischargedBy: string;
  dischargedByName?: string;
  createdAt: string;
}

export interface PreDischargeCheckDto {
  admissionId: string;
  patientName: string;
  isInsuranceValid: boolean;
  insuranceCheckMessage?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  hasUnpaidBalance: boolean;
  hasUnclaimedMedicine: boolean;
  unclaimedPrescriptionCount: number;
  hasPendingResults: boolean;
  pendingResultCount: number;
  isMedicalRecordComplete: boolean;
  missingDocuments: string[];
  canDischarge: boolean;
  warnings: string[];
}

export interface BillingStatement6556Dto {
  admissionId: string;
  patientName: string;
  patientCode: string;
  insuranceNumber?: string;
  gender: number;
  dateOfBirth?: string;
  address?: string;
  admissionDate: string;
  dischargeDate: string;
  daysOfStay: number;
  diagnosis?: string;
  diagnosisCode?: string;
  items: BillingItemDto[];
  totalAmount: number;
  insuranceAmount: number;
  patientCoPayAmount: number;
  outOfPocketAmount: number;
  depositAmount: number;
  refundAmount: number;
  amountDue: number;
}

export interface BillingItemDto {
  orderNo: number;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insuranceRatio: number;
  insuranceAmount: number;
  patientAmount: number;
  itemType: string;
}

export interface ReferralCertificateDto {
  admissionId: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  address?: string;
  insuranceNumber?: string;
  fromHospitalName: string;
  fromHospitalCode: string;
  toHospitalName: string;
  toHospitalCode: string;
  transferReason?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  currentCondition?: string;
  requestedServices?: string;
  transferDate: string;
  doctorName?: string;
}

// #endregion

// #region 3.8 Báo cáo

export interface TreatmentActivityReportDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  departmentName?: string;
  totalAdmissions: number;
  emergencyAdmissions: number;
  electiveAdmissions: number;
  transferInAdmissions: number;
  totalDischarges: number;
  recoveredCount: number;
  improvedCount: number;
  unchangedCount: number;
  worsenedCount: number;
  deathCount: number;
  transferOutCount: number;
  totalBeds: number;
  averageOccupancyRate: number;
  averageLengthOfStay: number;
  totalRevenue: number;
  insuranceRevenue: number;
  feeRevenue: number;
}

export interface DepartmentRevenueReportDto {
  fromDate: string;
  toDate: string;
  departments: DepartmentRevenueItemDto[];
  totalRevenue: number;
  totalInsuranceRevenue: number;
  totalFeeRevenue: number;
}

export interface DepartmentRevenueItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  totalBedDays: number;
  medicineRevenue: number;
  supplyRevenue: number;
  serviceRevenue: number;
  bedRevenue: number;
  totalRevenue: number;
  insuranceRevenue: number;
  feeRevenue: number;
}

export interface MedicineSupplyUsageReportDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  departmentName?: string;
  medicines: MedicineUsageItemDto[];
  supplies: SupplyUsageItemDto[];
  totalMedicineAmount: number;
  totalSupplyAmount: number;
}

export interface MedicineUsageItemDto {
  medicineCode: string;
  medicineName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  patientCount: number;
}

export interface SupplyUsageItemDto {
  supplyCode: string;
  supplyName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  patientCount: number;
}

export interface ReportSearchDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  doctorId?: string;
  paymentSource?: number;
  groupBy?: string;
}

// Sổ 4069 (TT 4069/QĐ-BYT) — backend trả raw report object, FE chỉ in trực tiếp.
export interface Register4069ReportDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  rows?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

// #endregion

// ============================================================================
// #region 3.6.x So sinh noi tru (#50-54)
// ============================================================================

export interface NewbornRecordDto {
  id: string;
  motherAdmissionId: string;
  birthDate: string;       // ISO date
  birthTime: string;       // "HH:MM:SS" TimeSpan
  gender: number;          // 1=Nam, 2=Nu
  birthWeight: number;     // gram
  birthLength: number;     // cm
  headCircumference: number; // cm
  apgarScore1Min: number;
  apgarScore5Min: number;
  apgarScore10Min?: number;
  deliveryMethod?: string;
  complications?: string;
  initialExamFindings?: string;
  vitaminKGiven?: string;
  hepBVaccine?: string;
  newbornAdmissionId?: string;
  status: number;          // 0=Dang theo doi, 2=Da xuat
  dischargeDate?: string;
}

// ============================================================================
// #region 3.6.y Chay than nhan tao (#148)
// ============================================================================

export interface HemodialysisSessionDto {
  id: string;
  admissionId: string;
  sessionDate: string;     // ISO date
  startTime: string;       // "HH:MM:SS" TimeSpan
  endTime?: string;        // "HH:MM:SS"
  sessionNumber: number;
  weightPre: number;       // kg
  weightPost: number;      // kg
  pulse: number;
  bloodPressureLying?: string;
  bloodPressureStanding?: string;
  temperature: number;     // do C
  respiratoryRate: number;
  bloodFlowRate: number;   // ml/phut
  arterialPressure?: number; // mmHg
  venousPressure?: number;   // mmHg
  tmp: number;             // PTM mmHg
  replacementFluid: number; // tai dich lit
  dialyzerType?: string;
  medications?: string;
  complications?: string;
  notes?: string;
}

// #endregion

export const checkPreDischarge = (admissionId: string) =>
  apiClient.get<PreDischargeCheckDto>(`${BASE_URL}/pre-discharge-check/${admissionId}`);

export const dischargePatient = (dto: CompleteDischargeDto) =>
  apiClient.post<DischargeDto>(`${BASE_URL}/discharge`, dto);

export const cancelDischarge = (admissionId: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/cancel-discharge/${admissionId}`, reason);

export const printDischargeCertificate = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-discharge-certificate/${admissionId}`, { responseType: 'blob' });

export const printReferralCertificate = (admissionId: string, data: ReferralCertificateDto) =>
  apiClient.post(`${BASE_URL}/print-referral-certificate/${admissionId}`, data, { responseType: 'blob' });

export const printServiceDisclosure = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-service-disclosure/${admissionId}`, { responseType: 'blob' });

export const printMedicineDisclosure = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-medicine-disclosure/${admissionId}`, { responseType: 'blob' });

export const getBillingStatement6556 = (admissionId: string) =>
  apiClient.get<BillingStatement6556Dto>(`${BASE_URL}/billing-statement/${admissionId}`);

export const printBillingStatement6556 = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/print-billing-statement/${admissionId}`, { responseType: 'blob' });

export const getDepartmentRevenueReport = (search: ReportSearchDto) =>
  apiClient.get<DepartmentRevenueReportDto>(`${BASE_URL}/reports/department-revenue`, { params: search });

export const getTreatmentActivityReport = (search: ReportSearchDto) =>
  apiClient.get<TreatmentActivityReportDto>(`${BASE_URL}/reports/treatment-activity`, { params: search });

export const getRegister4069 = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<Register4069ReportDto>(`${BASE_URL}/reports/register-4069`, { params: { fromDate, toDate, departmentId } });

export const printRegister4069 = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/reports/print-register-4069`, { params: { fromDate, toDate, departmentId }, responseType: 'blob' });

export const getMedicineSupplyUsageReport = (search: ReportSearchDto) =>
  apiClient.get<MedicineSupplyUsageReportDto>(`${BASE_URL}/reports/medicine-supply-usage`, { params: search });

export const createNewborn = (motherAdmissionId: string, dto: Omit<NewbornRecordDto, 'id' | 'motherAdmissionId' | 'status' | 'dischargeDate'>) =>
  apiClient.post<NewbornRecordDto>(`${BASE_URL}/${motherAdmissionId}/newborns`, dto);

export const getNewborns = (motherAdmissionId: string) =>
  apiClient.get<NewbornRecordDto[]>(`${BASE_URL}/${motherAdmissionId}/newborns`);

export const updateNewborn = (id: string, dto: NewbornRecordDto) =>
  apiClient.put<NewbornRecordDto>(`${BASE_URL}/newborns/${id}`, dto);

export const dischargeNewborn = (id: string, dischargeDate: string) =>
  apiClient.put<NewbornRecordDto>(`${BASE_URL}/newborns/${id}/discharge`, { dischargeDate });

export const createHemodialysis = (admissionId: string, dto: Omit<HemodialysisSessionDto, 'id' | 'admissionId'>) =>
  apiClient.post<HemodialysisSessionDto>(`${BASE_URL}/${admissionId}/hemodialysis`, dto);

export const getHemodialysisSessions = (admissionId: string) =>
  apiClient.get<HemodialysisSessionDto[]>(`${BASE_URL}/${admissionId}/hemodialysis`);

export const updateHemodialysis = (id: string, dto: HemodialysisSessionDto) =>
  apiClient.put<HemodialysisSessionDto>(`${BASE_URL}/hemodialysis/${id}`, dto);

export const deleteHemodialysis = (id: string) =>
  apiClient.delete(`${BASE_URL}/hemodialysis/${id}`);
