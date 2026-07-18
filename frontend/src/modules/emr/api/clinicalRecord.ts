import apiClient from '../../../services/apiClient';

// ── Partograph ──────────────────────────────────────────────────────────────

export interface PartographRecordDto {
  id: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  recordTime: string;
  cervicalDilation?: number;
  contractionFrequency?: number;
  contractionDuration?: number;
  fetalHeartRate?: number;
  amnioticFluid?: string;
  mouldingDegree?: string;
  fetalPosition?: string;
  systolicBP?: number;
  diastolicBP?: number;
  maternalPulse?: number;
  temperature?: number;
  oxytocinDose?: string;
  drugGiven?: string;
  alertLine?: string;
  alertLineLabel?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface PartographSaveDto {
  id?: string;
  admissionId: string;
  patientId: string;
  patientName?: string;
  recordTime: string;
  cervicalDilation?: number;
  contractionFrequency?: number;
  contractionDuration?: number;
  fetalHeartRate?: number;
  amnioticFluid?: string;
  mouldingDegree?: string;
  fetalPosition?: string;
  systolicBP?: number;
  diastolicBP?: number;
  maternalPulse?: number;
  temperature?: number;
  oxytocinDose?: string;
  drugGiven?: string;
  alertLine?: string;
  notes?: string;
}

export const getPartographRecords = (admissionId: string) =>
  apiClient.get<PartographRecordDto[]>('/clinical-records/partograph', { params: { admissionId, pageSize: 200 } });

export const savePartographRecord = (dto: PartographSaveDto) =>
  apiClient.post<PartographRecordDto>('/clinical-records/partograph', dto);

export const deletePartographRecord = (id: string) =>
  apiClient.delete(`/clinical-records/partograph/${id}`);

// ── Anesthesia ──────────────────────────────────────────────────────────────

export interface AnesthesiaMonitorDto {
  id?: string;
  monitorTime: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  spO2?: number;
  etCO2?: number;
  temperature?: number;
  notes?: string;
}

export interface AnesthesiaDrugDto {
  id?: string;
  givenTime: string;
  drugName: string;
  dose?: string;
  route?: string;
}

export interface AnesthesiaFluidDto {
  id?: string;
  fluidType: string;
  volume?: number;
  startTime?: string;
  endTime?: string;
}

export interface AnesthesiaRecordDto {
  id: string;
  surgeryId: string;
  patientId: string;
  patientName: string;
  asaClass: number;
  mallampatiScore: number;
  allergies?: string;
  npoStatus?: string;
  anesthesiaType: string;
  airwayPlan?: string;
  preOpAssessment?: string;
  psychologicalAssessment?: string;
  recoveryNotes?: string;
  status: number;
  statusLabel?: string;
  asaLabel?: string;
  mallampatiLabel?: string;
  createdBy?: string;
  createdAt?: string;
  monitors: AnesthesiaMonitorDto[];
  drugs: AnesthesiaDrugDto[];
  fluids: AnesthesiaFluidDto[];
}

export interface AnesthesiaSaveDto {
  id?: string;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  asaClass: number;
  mallampatiScore: number;
  allergies?: string;
  npoStatus?: string;
  anesthesiaType: string;
  airwayPlan?: string;
  preOpAssessment?: string;
  psychologicalAssessment?: string;
  recoveryNotes?: string;
  status: number;
  monitors: AnesthesiaMonitorDto[];
  drugs: AnesthesiaDrugDto[];
  fluids: AnesthesiaFluidDto[];
}

export const getAnesthesiaRecords = (patientId: string) =>
  apiClient.get<AnesthesiaRecordDto[]>('/clinical-records/anesthesia', { params: { patientId } });

export const saveAnesthesiaRecord = (dto: AnesthesiaSaveDto) =>
  apiClient.post<AnesthesiaRecordDto>('/clinical-records/anesthesia', dto);

export const deleteAnesthesiaRecord = (id: string) =>
  apiClient.delete(`/clinical-records/anesthesia/${id}`);
