/**
 * Reassign object bulk + per-line — Sprint 2 Item 2.7 / #104 #126 #127 #137
 */
import apiClient from '../services/apiClient';

// ────────────────────────────────────────────────────────────────────────────────
// BULK (endpoint cũ, backward compatible)
// ────────────────────────────────────────────────────────────────────────────────

export interface ReassignObjectRequest {
  patientId: string;
  medicalRecordId?: string;
  scope: 'service' | 'medicine';
  mode: 'all' | 'detail';
  fromPatientType?: number;
  toPatientType: number;
  itemIds?: string[];
  reason: string;
}

export interface ReassignObjectResult {
  updatedCount: number;
  oldTotal: number;
  newTotal: number;
  warnings: string[];
}

export async function reassignObject(req: ReassignObjectRequest) {
  const { data } = await apiClient.post<ReassignObjectResult>('/billing/reassign-object', req);
  return data;
}

// ────────────────────────────────────────────────────────────────────────────────
// PER-LINE / PER-RECORD — với audit PayerChangeLog
// ────────────────────────────────────────────────────────────────────────────────

/** Kết quả đổi đối tượng per-line hoặc per-record */
export interface ChangeObjectResult {
  logId: string;
  fromObjectType: number;
  toObjectType: number;
  oldPatientAmount: number;
  newPatientAmount: number;
  deltaPatientAmount: number;
  affectedLineCount: number;
  warnings: string[];
}

/** Lịch sử đổi đối tượng */
export interface PayerChangeLogDto {
  id: string;
  changeScope: 'record' | 'service_line' | 'drug_line';
  fromObjectType: number;
  toObjectType: number;
  reason?: string;
  changedBy: string;
  changedByName?: string;
  oldPatientAmount?: number;
  newPatientAmount?: number;
  affectedLineCount: number;
  changedAt: string;
  serviceRequestDetailId?: string;
  prescriptionDetailId?: string;
}

/** Đổi đối tượng toàn bộ hồ sơ bệnh án */
export async function changeObjectForRecord(dto: {
  medicalRecordId: string;
  toObjectType: number;
  reason: string;
}): Promise<ChangeObjectResult> {
  const { data } = await apiClient.post<ChangeObjectResult>('/billing/reassign-object/change-record', dto);
  return data;
}

/** Đổi đối tượng 1 dòng dịch vụ CLS/PTTT */
export async function changeObjectForServiceLine(dto: {
  serviceRequestDetailId: string;
  toObjectType: number;
  reason: string;
}): Promise<ChangeObjectResult> {
  const { data } = await apiClient.post<ChangeObjectResult>('/billing/reassign-object/change-service-line', dto);
  return data;
}

/** Đổi đối tượng 1 dòng thuốc/VTYT tại CĐHA (#137) */
export async function changeObjectForDrugLine(dto: {
  prescriptionDetailId: string;
  toObjectType: number;
  reason: string;
}): Promise<ChangeObjectResult> {
  const { data } = await apiClient.post<ChangeObjectResult>('/billing/reassign-object/change-drug-line', dto);
  return data;
}

/** Lấy lịch sử đổi đối tượng theo hồ sơ bệnh án */
export async function getPayerChangeHistory(medicalRecordId: string): Promise<PayerChangeLogDto[]> {
  const { data } = await apiClient.get<PayerChangeLogDto[]>(`/billing/reassign-object/history/${medicalRecordId}`);
  return data;
}

/** Label hiển thị tên đối tượng */
export const OBJECT_TYPE_LABELS: Record<number, string> = {
  0: 'Hỗn hợp',
  1: 'BHYT',
  2: 'Viện phí',
  3: 'Dịch vụ',
  4: 'Khám sức khỏe',
};
