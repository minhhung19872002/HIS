import apiClient from '../services/apiClient';

const BASE = '/obstetric-register';

// ─── DTO interfaces ─────────────────────────────────────────────────────────

export interface BirthRegisterDto {
  id: string;
  registerNo: number;
  deliveryDate: string;       // ISO
  motherName: string;
  motherAge: number;
  motherIdNumber?: string;
  motherAddress?: string;
  gestationalWeeks: number;
  paraInfo?: string;
  deliveryMethod?: string;
  babyCount: number;
  babyGender: number;         // 1=Nam, 2=Nữ
  babyWeight: number;         // gram
  babyCondition?: string;
  attendant?: string;
  notes?: string;
}

export interface AbortionRegisterDto {
  id: string;
  registerNo: number;
  procedureDate: string;      // ISO
  patientName: string;
  patientAge: number;
  patientIdNumber?: string;
  patientAddress?: string;
  gestationalWeeks: number;
  method?: string;
  reason?: string;
  performer?: string;
  complications?: string;
  notes?: string;
}

export interface ObstetricReportDto {
  from: string;
  to: string;
  totalDeliveries: number;
  totalBabies: number;
  babiesAlive: number;
  babiesDead: number;
  maleBabies: number;
  femaleBabies: number;
  deliveriesByMethod: Record<string, number>;
  totalAbortions: number;
  abortionsByMethod: Record<string, number>;
  abortionComplications: number;
}

// ─── Sổ sinh đẻ ───────────────────────────────────────────────────────────────

export const getBirths = (from?: string, to?: string, keyword?: string) =>
  apiClient.get<BirthRegisterDto[]>(`${BASE}/births`, { params: { from, to, keyword } }).then(r => r.data);

export const saveBirth = (dto: Partial<BirthRegisterDto>) =>
  apiClient.post<BirthRegisterDto>(`${BASE}/births`, dto).then(r => r.data);

export const deleteBirth = (id: string) =>
  apiClient.delete(`${BASE}/births/${id}`).then(r => r.data);

// ─── Sổ theo dõi nạo phá thai ───────────────────────────────────────────────

export const getAbortions = (from?: string, to?: string, keyword?: string) =>
  apiClient.get<AbortionRegisterDto[]>(`${BASE}/abortions`, { params: { from, to, keyword } }).then(r => r.data);

export const saveAbortion = (dto: Partial<AbortionRegisterDto>) =>
  apiClient.post<AbortionRegisterDto>(`${BASE}/abortions`, dto).then(r => r.data);

export const deleteAbortion = (id: string) =>
  apiClient.delete(`${BASE}/abortions/${id}`).then(r => r.data);

// ─── Báo cáo BYT ──────────────────────────────────────────────────────────────

export const getObstetricReport = (from: string, to: string) =>
  apiClient.get<ObstetricReportDto>(`${BASE}/report`, { params: { from, to } }).then(r => r.data);
