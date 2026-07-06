/**
 * Inpatient — Treatment information (3.6)
 */
import apiClient from '../../services/apiClient';

const BASE_URL = '/inpatient';

// #region 3.6 Thông tin điều trị

export interface TreatmentSheetDto {
  id: string;
  admissionId: string;
  treatmentDate: string;
  doctorId: string;
  doctorName: string;
  progressNotes?: string;
  treatmentOrders?: string;
  nursingOrders?: string;
  dietOrders?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTreatmentSheetDto {
  admissionId: string;
  treatmentDate: string;
  progressNotes?: string;
  treatmentOrders?: string;
  nursingOrders?: string;
  dietOrders?: string;
}

export interface TreatmentSheetTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  templateContent?: string;
  departmentId?: string;
  createdBy?: string;
  isShared: boolean;
}

export interface VitalSignsRecordDto {
  id: string;
  admissionId: string;
  recordTime: string;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  spO2?: number;
  weight?: number;
  height?: number;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
}

export interface CreateVitalSignsDto {
  admissionId: string;
  recordTime: string;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  spO2?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

export interface VitalSignsChartDto {
  admissionId: string;
  fromDate: string;
  toDate: string;
  temperatureData: VitalSignsPointDto[];
  pulseData: VitalSignsPointDto[];
  bpData: VitalSignsPointDto[];
  spO2Data: VitalSignsPointDto[];
}

export interface VitalSignsPointDto {
  time: string;
  value?: number;
  value2?: number;
}

// F8.13 — aggregate thong ke qua trinh dieu tri
export interface DrugCountItemDto {
  medicineId: string;
  medicineName: string;
  totalQuantity: number;
}

export interface DiagnosisFrequencyItemDto {
  diagnosisCode: string;
  diagnosisName: string;
  count: number;
}

export interface TreatmentStatAggregateDto {
  drugCounts: DrugCountItemDto[];
  diagnosisFrequency: DiagnosisFrequencyItemDto[];
}

export interface ConsultationDto {
  id: string;
  admissionId: string;
  consultationType: number;
  consultationTypeName: string;
  consultationDate: string;
  consultationTime?: string;
  location?: string;
  chairmanId: string;
  chairmanName: string;
  secretaryId: string;
  secretaryName: string;
  members: ConsultationMemberDto[];
  reason?: string;
  clinicalFindings?: string;
  labResults?: string;
  imageResults?: string;
  conclusion?: string;
  treatment?: string;
  status: number;
  // F1.4: approval fields (only relevant when consultationType === 3)
  approvalStatus: number;
  approvalStatusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNote?: string;
}

export interface ConsultationMemberDto {
  doctorId: string;
  doctorName: string;
  title?: string;
  department?: string;
  opinion?: string;
}

export interface CreateConsultationDto {
  admissionId: string;
  consultationType: number;
  consultationDate: string;
  consultationTime?: string;
  location?: string;
  chairmanId: string;
  secretaryId: string;
  memberIds: string[];
  reason?: string;
  clinicalFindings?: string;
}

export interface NursingCareSheetDto {
  id: string;
  admissionId: string;
  careDate: string;
  nurseId: string;
  nurseName: string;
  shift: number;
  shiftName: string;
  patientCondition?: string;
  consciousness?: string;
  hygieneActivities?: string;
  medicationActivities?: string;
  nutritionActivities?: string;
  movementActivities?: string;
  specialMonitoring?: string;
  issuesAndActions?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateNursingCareSheetDto {
  admissionId: string;
  careDate: string;
  shift: number;
  patientCondition?: string;
  consciousness?: string;
  hygieneActivities?: string;
  medicationActivities?: string;
  nutritionActivities?: string;
  movementActivities?: string;
  specialMonitoring?: string;
  issuesAndActions?: string;
  notes?: string;
}

export interface InfusionRecordDto {
  id: string;
  admissionId: string;
  fluidName: string;
  volume: number;
  dropRate: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  route?: string;
  additionalMedication?: string;
  startedBy: string;
  startedByName: string;
  observations?: string;
  complications?: string;
  status: number;
}

export interface CreateInfusionRecordDto {
  admissionId: string;
  fluidName: string;
  volume: number;
  dropRate: number;
  startTime: string;
  route?: string;
  additionalMedication?: string;
}

export interface BloodTransfusionDto {
  id: string;
  admissionId: string;
  bloodType: string;
  rhFactor: string;
  bloodProductType: string;
  bagNumber: string;
  volume: number;
  transfusionStart: string;
  transfusionEnd?: string;
  doctorOrderId: string;
  doctorOrderName: string;
  executedBy?: string;
  executedByName?: string;
  preTransfusionVitals?: string;
  duringTransfusionVitals?: string;
  postTransfusionVitals?: string;
  hasReaction: boolean;
  reactionDetails?: string;
  status: number;
}

export interface CreateBloodTransfusionDto {
  admissionId: string;
  bloodType: string;
  rhFactor: string;
  bloodProductType: string;
  bagNumber: string;
  volume: number;
  transfusionStart: string;
}

export interface DrugReactionRecordDto {
  id: string;
  admissionId: string;
  medicineId?: string;
  medicineName: string;
  reactionTime: string;
  severity: number;
  severityName: string;
  symptoms: string;
  treatment?: string;
  outcome?: string;
  reportedBy: string;
  reportedByName: string;
}

export interface TreatmentSheetSearchDto {
  admissionId?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

/** #15: BE tự tổng hợp tóm tắt quá trình điều trị (SOAP + đơn + CLS + PTTT) — prefill bệnh án ra viện. */
export const getAutoTreatmentSummary = (admissionId: string) =>
  apiClient.get<{ summary?: string }>(`${BASE_URL}/${admissionId}/auto-summary`);

/** F8.13: aggregate thong ke qua trinh dieu tri — so luong tung thuoc + tan suat tung ma chan doan. */
export const getTreatmentStatAggregate = (admissionId: string) =>
  apiClient.get<TreatmentStatAggregateDto>(`${BASE_URL}/${admissionId}/treatment-stat-aggregate`);

export const createTreatmentSheet = (dto: CreateTreatmentSheetDto) =>
  apiClient.post<TreatmentSheetDto>(`${BASE_URL}/treatment-sheets`, dto);

export const updateTreatmentSheet = (id: string, dto: CreateTreatmentSheetDto) =>
  apiClient.put<TreatmentSheetDto>(`${BASE_URL}/treatment-sheets/${id}`, dto);

export const getTreatmentSheets = (search: TreatmentSheetSearchDto) =>
  apiClient.get<TreatmentSheetDto[]>(`${BASE_URL}/treatment-sheets`, { params: search });

export const printTreatmentSheet = (id: string) =>
  apiClient.get(`${BASE_URL}/print-treatment-sheet/${id}`, { responseType: 'blob' });

export const createVitalSigns = (dto: CreateVitalSignsDto) =>
  apiClient.post<VitalSignsRecordDto>(`${BASE_URL}/vital-signs`, dto);

export const getVitalSignsList = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<VitalSignsRecordDto[]>(`${BASE_URL}/vital-signs/${admissionId}`, { params: { fromDate, toDate } });

export const getVitalSignsChart = (admissionId: string, fromDate: string, toDate: string) =>
  apiClient.get<VitalSignsChartDto>(`${BASE_URL}/vital-signs-chart/${admissionId}`, { params: { fromDate, toDate } });

export const createConsultation = (dto: CreateConsultationDto) =>
  apiClient.post<ConsultationDto>(`${BASE_URL}/consultations`, dto);

export const getConsultations = (admissionId?: string, departmentId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<ConsultationDto[]>(`${BASE_URL}/consultations`, { params: { admissionId, departmentId, fromDate, toDate } });

export const completeConsultation = (id: string, conclusion: string, treatment?: string) =>
  apiClient.post<ConsultationDto>(`${BASE_URL}/consultations/${id}/complete`, { conclusion, treatment });

export const printConsultation = (id: string) =>
  apiClient.get(`${BASE_URL}/print-consultation/${id}`, { responseType: 'blob' });

// F1.4: Lãnh đạo duyệt / từ chối hội chẩn thuốc dấu * — decision: 2=Duyệt, 3=Từ chối
export const approveConsultation = (id: string, decision: number, note?: string) =>
  apiClient.post<ConsultationDto>(`${BASE_URL}/consultations/${id}/approve`, { decision, note });

export const createNursingCareSheet = (dto: CreateNursingCareSheetDto) =>
  apiClient.post<NursingCareSheetDto>(`${BASE_URL}/nursing-care-sheets`, dto);

export const getNursingCareSheets = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<NursingCareSheetDto[]>(`${BASE_URL}/nursing-care-sheets/${admissionId}`, { params: { fromDate, toDate } });

export const createInfusionRecord = (dto: CreateInfusionRecordDto) =>
  apiClient.post<InfusionRecordDto>(`${BASE_URL}/infusion-records`, dto);

export const completeInfusion = (id: string, endTime: string) =>
  apiClient.post<InfusionRecordDto>(`${BASE_URL}/infusion-records/${id}/complete`, endTime);

export const calculateInfusionEndTime = (volumeMl: number, dropRate: number) =>
  apiClient.get<string>(`${BASE_URL}/calculate-infusion-end`, { params: { volumeMl, dropRate } });

export const createBloodTransfusion = (dto: CreateBloodTransfusionDto) =>
  apiClient.post<BloodTransfusionDto>(`${BASE_URL}/blood-transfusions`, dto);

export const recordTransfusionReaction = (id: string, reactionDetails: string) =>
  apiClient.post<BloodTransfusionDto>(`${BASE_URL}/blood-transfusions/${id}/reaction`, reactionDetails);

export const createDrugReactionRecord = (admissionId: string, medicineId: string | undefined, medicineName: string, severity: number, symptoms: string, treatment?: string) =>
  apiClient.post<DrugReactionRecordDto>(`${BASE_URL}/drug-reactions`, { admissionId, medicineId, medicineName, severity, symptoms, treatment });

export const getDrugReactionRecords = (admissionId: string) =>
  apiClient.get<DrugReactionRecordDto[]>(`${BASE_URL}/drug-reactions/${admissionId}`);
