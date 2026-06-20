/**
 * Inpatient — Admission / Patient management (3.2)
 */
import apiClient from '../client';
import type { PagedResult } from './_shared';

const BASE_URL = '/inpatient';

// #region 3.2 Quản lý bệnh nhân

export interface InpatientListDto {
  admissionId: string;
  patientId: string;
  medicalRecordCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  age?: number;
  insuranceNumber?: string;
  isInsurance: boolean;
  insuranceExpiry?: string;
  departmentName: string;
  roomName: string;
  bedName?: string;
  admissionDate: string;
  daysOfStay: number;
  mainDiagnosis?: string;
  attendingDoctorName?: string;
  status: number;
  statusName: string;
  hasPendingOrders: boolean;
  hasPendingLabResults: boolean;
  hasUnclaimedMedicine: boolean;
  isDebtWarning: boolean;
  totalDebt?: number;
  isInsuranceExpiring: boolean;
}

export interface AdmissionDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  insuranceNumber?: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  admissionDate: string;
  admissionType: number;
  admissionTypeName: string;
  referralSource?: string;
  admittingDoctorId: string;
  admittingDoctorName?: string;
  departmentId: string;
  departmentName?: string;
  roomId: string;
  roomName?: string;
  bedId?: string;
  bedName?: string;
  status: number;
  statusName: string;
  diagnosisOnAdmission?: string;
  reasonForAdmission?: string;
  daysOfStay: number;
  dischargeDate?: string;
}

export interface AdmitFromOpdDto {
  medicalRecordId: string;
  departmentId: string;
  roomId: string;
  bedId?: string;
  admissionType: number;
  diagnosisOnAdmission?: string;
  reasonForAdmission?: string;
  attendingDoctorId: string;
}

export interface AdmitFromDepartmentDto {
  sourceAdmissionId: string;
  targetDepartmentId: string;
  targetRoomId: string;
  targetBedId?: string;
  transferReason?: string;
  diagnosisOnTransfer?: string;
  attendingDoctorId: string;
}

export interface DepartmentTransferDto {
  admissionId: string;
  targetDepartmentId: string;
  targetRoomId: string;
  targetBedId?: string;
  transferReason?: string;
  diagnosisOnTransfer?: string;
  treatmentSummary?: string;
  receivingDoctorId: string;
}

export interface CombinedTreatmentDto {
  id: string;
  admissionId: string;
  consultingDepartmentId: string;
  consultingDepartmentName: string;
  requestDate: string;
  requestReason?: string;
  consultingDiagnosis?: string;
  consultingDoctorId: string;
  consultingDoctorName?: string;
  status: number;
  statusName: string;
  completedDate?: string;
  treatmentResult?: string;
}

export interface CreateCombinedTreatmentDto {
  admissionId: string;
  consultingDepartmentId: string;
  requestReason?: string;
  consultingDiagnosis?: string;
}

export interface SpecialtyConsultRequestDto {
  id: string;
  admissionId: string;
  patientName: string;
  specialtyDepartmentId: string;
  specialtyDepartmentName: string;
  requestingDoctorId: string;
  requestingDoctorName: string;
  requestDate: string;
  requestReason?: string;
  clinicalInfo?: string;
  status: number;
  statusName: string;
  consultingDoctorId?: string;
  consultingDoctorName?: string;
  consultDate?: string;
  consultResult?: string;
  recommendations?: string;
}

export interface CreateSpecialtyConsultDto {
  admissionId: string;
  specialtyDepartmentId: string;
  requestReason?: string;
  clinicalInfo?: string;
}

export interface SurgeryTransferDto {
  admissionId: string;
  surgeryType: number;
  surgeryTypeName?: string;
  surgeryRoomId: string;
  scheduledDate: string;
  scheduledTime?: string;
  preopDiagnosis?: string;
  plannedProcedure?: string;
  surgeonId: string;
  assistantIds: string[];
  anesthesiologistId: string;
  specialNotes?: string;
}

export interface UpdateInsuranceDto {
  admissionId: string;
  insuranceNumber: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  initialFacilityCode?: string;
  initialFacilityName?: string;
  benefitLevel: number;
}

export interface InsuranceReferralCheckDto {
  admissionId: string;
  insuranceNumber: string;
  isValid: boolean;
  isCorrectRoute: boolean;
  requiresReferral: boolean;
  initialFacilityCode?: string;
  initialFacilityName?: string;
  benefitLevel: number;
  benefitLevelName: string;
  warnings: string[];
  message?: string;
}

export interface InpatientSearchDto {
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  roomId?: string;
  status?: number;
  isInsurance?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

// Worklist "chờ nhập viện": phiên khám OPD kết luận nhập viện nhưng chưa tạo hồ sơ nội trú.
export interface PendingAdmissionDto {
  examinationId: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  departmentId?: string | null;
  departmentName?: string | null;
  isEmergency: boolean;
  diagnosisCode?: string | null;
  diagnosisName?: string | null;
  reason?: string | null;
  requestedAt?: string | null;
}

export interface DailyOrderSummaryDto {
  orderDate: string;
  admissionId: string;
  medicineOrderCount: number;
  medicineIssuedCount: number;
  medicinePendingCount: number;
  serviceOrderCount: number;
  serviceCompletedCount: number;
  servicePendingCount: number;
  labOrderCount: number;
  labResultCount: number;
  labPendingCount: number;
  medicineOrders: MedicineOrderItemDto[];
  serviceOrders: ServiceOrderItemDto[];
  labResults: LabResultItemDto[];
}

export interface MedicineOrderItemDto {
  id: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  quantity: number;
  dosage?: string;
  usage?: string;
  status: number;
  warehouseName?: string;
}

export interface ServiceOrderItemDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  quantity: number;
  status: number;
  executingRoomName?: string;
  scheduledDate?: string;
}

export interface LabResultItemDto {
  id: string;
  testCode: string;
  testName: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  status: number;
  resultDate?: string;
}

export interface DepartmentFeeOverviewDto {
  departmentId: string;
  departmentName: string;
  totalPatients: number;
  insurancePatients: number;
  feePatients: number;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  depositAmount: number;
  debtAmount: number;
  patientFees: PatientFeeItemDto[];
}

export interface PatientFeeItemDto {
  admissionId: string;
  patientCode: string;
  patientName: string;
  bedName?: string;
  isInsurance: boolean;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  depositAmount: number;
  debtAmount: number;
  daysOfStay: number;
}

export interface DepositRequestDto {
  id: string;
  admissionId: string;
  patientName: string;
  patientCode: string;
  requestedAmount: number;
  reason?: string;
  requestedBy: string;
  requestedByName: string;
  requestDate: string;
  status: number;
  statusName: string;
  collectedDate?: string;
  collectedByName?: string;
}

export interface CreateDepositRequestDto {
  admissionId: string;
  requestedAmount: number;
  reason?: string;
}

export interface TransferWarningDto {
  admissionId: string;
  patientName: string;
  hasUnclaimedMedicine: boolean;
  unclaimedMedicineCount: number;
  unclaimedMedicineNames: string[];
  hasPendingLabResults: boolean;
  pendingLabCount: number;
  pendingLabNames: string[];
  hasPendingServices: boolean;
  pendingServiceCount: number;
  canTransfer: boolean;
  warnings: string[];
}

// #endregion

export const getInpatientList = (search: InpatientSearchDto) =>
  apiClient.get<PagedResult<InpatientListDto>>(`${BASE_URL}/patients`, { params: search });

export const admitFromOpd = (dto: AdmitFromOpdDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/admit-from-opd`, dto);

export const getPendingAdmissions = (departmentId?: string) =>
  apiClient.get<PendingAdmissionDto[]>(`${BASE_URL}/pending-admissions`, {
    params: departmentId ? { departmentId } : undefined,
  });

export const admitFromDepartment = (dto: AdmitFromDepartmentDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/admit-from-department`, dto);

export const createCombinedTreatment = (dto: CreateCombinedTreatmentDto) =>
  apiClient.post<CombinedTreatmentDto>(`${BASE_URL}/combined-treatment`, dto);

export const getCombinedTreatments = (admissionId: string) =>
  apiClient.get<CombinedTreatmentDto[]>(`${BASE_URL}/combined-treatments/${admissionId}`);

export const completeCombinedTreatment = (id: string, treatmentResult: string) =>
  apiClient.post<CombinedTreatmentDto>(`${BASE_URL}/combined-treatment/${id}/complete`, treatmentResult);

export const transferDepartment = (dto: DepartmentTransferDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/transfer-department`, dto);

export const requestSpecialtyConsult = (dto: CreateSpecialtyConsultDto) =>
  apiClient.post<SpecialtyConsultRequestDto>(`${BASE_URL}/specialty-consult`, dto);

export const getSpecialtyConsultRequests = (admissionId: string) =>
  apiClient.get<SpecialtyConsultRequestDto[]>(`${BASE_URL}/specialty-consults/${admissionId}`);

export const completeSpecialtyConsult = (id: string, result: string, recommendations?: string) =>
  apiClient.post<SpecialtyConsultRequestDto>(`${BASE_URL}/specialty-consult/${id}/complete`, { result, recommendations });

export const transferToScheduledSurgery = (dto: SurgeryTransferDto) =>
  apiClient.post<boolean>(`${BASE_URL}/transfer-scheduled-surgery`, dto);

export const transferToEmergencySurgery = (dto: SurgeryTransferDto) =>
  apiClient.post<boolean>(`${BASE_URL}/transfer-emergency-surgery`, dto);

export const updateInsurance = (dto: UpdateInsuranceDto) =>
  apiClient.post<AdmissionDto>(`${BASE_URL}/update-insurance`, dto);

export const checkInsuranceReferral = (admissionId: string) =>
  apiClient.get<InsuranceReferralCheckDto>(`${BASE_URL}/insurance-check/${admissionId}`);

export const convertToFeePaying = (admissionId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/convert-to-fee/${admissionId}`);

export const getDailyOrderSummary = (admissionId: string, date: string) =>
  apiClient.get<DailyOrderSummaryDto>(`${BASE_URL}/daily-orders/${admissionId}`, { params: { date } });

export const getLabResults = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<LabResultItemDto[]>(`${BASE_URL}/lab-results/${admissionId}`, { params: { fromDate, toDate } });

export const printLabResults = (admissionId: string, resultIds: string[]) =>
  apiClient.post(`${BASE_URL}/print-lab-results/${admissionId}`, resultIds, { responseType: 'blob' });

export const getDepartmentFeeOverview = (departmentId: string) =>
  apiClient.get<DepartmentFeeOverviewDto>(`${BASE_URL}/department-fee/${departmentId}`);

export const getPatientFee = (admissionId: string) =>
  apiClient.get<PatientFeeItemDto>(`${BASE_URL}/patient-fee/${admissionId}`);

export const createDepositRequest = (dto: CreateDepositRequestDto) =>
  apiClient.post<DepositRequestDto>(`${BASE_URL}/deposit-request`, dto);

export const getDepositRequests = (departmentId?: string, status?: number) =>
  apiClient.get<DepositRequestDto[]>(`${BASE_URL}/deposit-requests`, { params: { departmentId, status } });

export const checkTransferWarnings = (admissionId: string) =>
  apiClient.get<TransferWarningDto>(`${BASE_URL}/transfer-warnings/${admissionId}`);
